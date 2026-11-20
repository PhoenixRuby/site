(() => {
  'use strict';

  const clientId = '1062340533807-b30ifcpd1eav04e7od54qkg16h9i983e.apps.googleusercontent.com';
  const scope = 'https://www.googleapis.com/auth/drive.appdata';
  const keyFile = 'site-encryption-key-v1';
  const backupFile = 'site-data-backup-v1';
  const backupIndexFile = 'site-data-backup-index-v2';
  const signedOutIcon = 'cloudOutline';
  const authorizationStorageKey = 'site-google-drive-authorization-v1';
  const localAccountStorageKey = 'site-google-drive-local-account-v1';
  const keyPreferencePrefix = 'site-google-drive-key-preference:';
  let tokenClient;
  let session;
  let pending = false;
  let loadError = false;
  let ready = false;
  let syncTimer;
  let syncing = false;
  let reconnectAccount;

  const plugin = {
    icon: signedOutIcon,
    label: '登入 Google Drive',
    toolbarPosition: 'top',
    showCount() {
      if (!session) return 0;
      return window.plugins[window.viewMode]?.getGuestCount?.() ?? 0;
    },
    open() { requestLogin(); },
    uploadGuestCards,
    uploadGuestBookmarks(entries) { return uploadGuestCards(entries, 'bookmark'); },
    uploadGuestItems(entries, category) { return uploadGuestCards(entries, category); },
    load() {
      window.addEventListener('site-data-ready', () => {
        ready = true;
        if (session?.authorization && !session.autoSyncDisabled) void syncBackup('startup');
      });
      window.addEventListener('site-data-saved', event => {
        if (event.detail?.deferDriveSync) {
          clearTimeout(syncTimer);
          return;
        }
        if (!ready || !session || session.syncPaused || session.autoSyncDisabled) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => void syncBackup('save'), 700);
      });
      return loadGoogleClient();
    }
  };

  function requestLogin(account, action) {
      if (pending || syncing) return;
      if (!tokenClient) {
        showToast(loadError ? '無法載入 Google 登入，請重新整理頁面。' : 'Google 登入載入中，請稍後再試。');
        return;
      }
      pending = true;
      reconnectAccount = account && { account, action };
      try {
        tokenClient.requestAccessToken(account?.emailAddress
          ? { prompt: '', login_hint: account.emailAddress }
          : { prompt: 'select_account' });
      } catch {
        pending = false;
        reconnectAccount = undefined;
        showToast('無法開啟 Google 登入視窗。');
      }
  }

  function loadGoogleClient() {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onerror = () => { loadError = true; };
      script.onload = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope,
          include_granted_scopes: false,
          callback: connect,
          error_callback: ({ type } = {}) => {
            pending = false;
            reconnectAccount = undefined;
            console.warn('[Google Drive] 登入彈窗事件', type);
            if (type === 'popup_failed_to_open') {
              showToast('無法開啟 Google 登入視窗，請檢查瀏覽器的彈出式視窗設定。');
            } else if (type === 'popup_closed') {
              showToast('站台未收到 Google 登入結果。');
            } else {
              showToast('Google 登入視窗發生錯誤。');
            }
          }
        });
      };
      document.head.append(script);
      window.addEventListener('storage', event => {
        if (event.storageArea === localStorage && event.key === 'site-google-drive-sign-out' &&
            event.newValue && event.newValue.split(':')[0] === session?.user.permissionId) {
          clearSession();
          location.reload();
        }
      });
      return restoreSession();
  }

  function accountIcon(user, name) {
    const avatar = document.createElement('span');
    avatar.className = 'google-drive-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = (Array.from(name.trim())[0] || 'G').toLocaleUpperCase();

    if (user.photoLink) {
      const photo = document.createElement('img');
      photo.width = 24;
      photo.height = 24;
      photo.alt = '';
      photo.referrerPolicy = 'no-referrer';
      photo.addEventListener('load', () => avatar.replaceChildren(photo), { once: true });
      photo.src = user.photoLink;
    }
    return avatar;
  }

  async function driveRequest(token, path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set('Authorization', 'Bearer ' + token);
    const result = await fetch('https://www.googleapis.com/' + path, {
      ...options,
      headers,
      cache: 'no-store'
    });
    if (!result.ok) {
      const error = new Error('Google Drive HTTP ' + result.status);
      error.status = result.status;
      throw error;
    }
    return result.json();
  }

  function transferRequest(token, path, progress, options = {}) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(options.method || 'GET', 'https://www.googleapis.com/' + path);
      request.responseType = 'json';
      request.setRequestHeader('Authorization', 'Bearer ' + token);
      if (options.contentType) request.setRequestHeader('Content-Type', options.contentType);
      const sender = options.body ? request.upload : request;
      sender.addEventListener('progress', event => {
        if (event.lengthComputable && event.total > 0) progress.update(event.loaded / event.total);
      });
      if (options.body) sender.addEventListener('load', () => progress.phase('等待 Google Drive 確認寫入…'));
      request.addEventListener('load', () => {
        if (request.status >= 200 && request.status < 300 && request.response !== null) {
          resolve(request.response);
        } else {
          const error = new Error('Google Drive HTTP ' + request.status);
          error.status = request.status;
          reject(error);
        }
      });
      request.addEventListener('error', () => reject(new Error('與 Google Drive 的連線中斷。')));
      request.addEventListener('abort', () => reject(new Error('Google Drive 傳輸已中止。')));
      request.send(options.body ?? null);
    });
  }

  function showTransferProgress(initialPhase) {
    const panel = document.createElement('aside');
    panel.className = 'google-drive-transfer';
    panel.innerHTML = `
      <strong role="status"></strong>
      <progress max="1" aria-label="Google Drive 傳輸進度"></progress>
      <small>請勿關閉視窗或重新整理，直到處理完成。</small>`;
    const status = panel.querySelector('strong');
    const bar = panel.querySelector('progress');
    const phase = text => {
      status.textContent = text;
      bar.removeAttribute('value');
    };
    phase(initialPhase);
    document.body.append(panel);
    return { phase, update: value => { bar.value = value; }, close: () => panel.remove() };
  }

  async function latestBackup(token) {
    return await latestNamedBackup(token, backupIndexFile) ?? await latestNamedBackup(token, backupFile);
  }

  async function latestNamedBackup(token, name) {
    const query = new URLSearchParams({
      spaces: 'appDataFolder',
      q: "trashed = false and name = '" + name + "'",
      orderBy: 'createdTime desc',
      fields: 'nextPageToken,files(id,name,createdTime,appProperties)',
      pageSize: '1'
    });
    for (;;) {
      const { files, nextPageToken } = await driveRequest(token, 'drive/v3/files?' + query);
      if (files.length || !nextPageToken) return files[0];
      query.set('pageToken', nextPageToken);
    }
  }

  async function fingerprint(envelope) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(envelope));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function uploadBackupObject(token, name, envelope, appProperties, progress) {
    const boundary = crypto.randomUUID();
    const metadata = { name, parents: ['appDataFolder'], mimeType: 'application/json', appProperties };
    const body = '--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
      '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify({ envelope }) +
      '\r\n--' + boundary + '--\r\n';
    return transferRequest(token, 'upload/drive/v3/files?uploadType=multipart&fields=id', progress, {
      method: 'POST',
      contentType: 'multipart/related; boundary=' + boundary,
      body
    });
  }

  async function readBackupObject(token, ref, progress) {
    const { envelope } = await transferRequest(token,
      'drive/v3/files/' + encodeURIComponent(ref.id) + '?alt=media', progress);
    if (typeof envelope !== 'string' || await fingerprint(envelope) !== ref.digest) {
      throw new Error('雲端備份驗證失敗。');
    }
    return envelope;
  }

  function readBackupIndex(token, remote, progress) {
    return readBackupObject(token, { id: remote.id, digest: remote.appProperties?.digest }, progress)
      .then(envelope => AccountStorage.readBackupIndex(envelope));
  }

  async function readBackupEnvelope(token, remote, progress) {
    if (remote.name !== backupIndexFile) {
      return readBackupObject(token, { id: remote.id, digest: remote.appProperties?.digest }, progress);
    }
    const { packages } = await readBackupIndex(token, remote, progress);
    const envelopes = {};
    for (const category of AccountStorage.backupCategories) {
      envelopes[category] = await readBackupObject(token, packages[category], progress);
    }
    return AccountStorage.joinBackup(envelopes);
  }

  function backupDeviceId() {
    const key = 'site-drive-backup-device-id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  async function publishCategoryBackup(token, snapshot, remote, progress, options = {}) {
    const { index, cardOnly = false, categoryOnly = cardOnly ? 'card' : null, snapshotDigest } = options;
    const previous = index ?? (remote?.name === backupIndexFile ? await readBackupIndex(token, remote, progress) : null);
    const packages = { ...previous?.packages };
    const deviceId = backupDeviceId();
    const categories = categoryOnly && previous ? [categoryOnly] : AccountStorage.backupCategories;
    const migrateScopedUpload = categoryOnly && !previous && options.preserveLegacyModules;
    const parts = await AccountStorage.splitBackup(snapshot.envelope, migrateScopedUpload ? [categoryOnly] : categories, packages);
    if (migrateScopedUpload) {
      const others = categories.filter(category => category !== categoryOnly);
      const oldEnvelope = remote ? await readBackupEnvelope(token, remote, progress) : null;
      Object.assign(parts, await AccountStorage.splitBackup(oldEnvelope, others, packages));
    }
    for (const category of categories) {
      const part = parts[category];
      if (packages[category]?.contentDigest === part.digest) continue;
      const digest = await fingerprint(part.envelope);
      const basePackageId = packages[category]?.id ?? null;
      const uploaded = await uploadBackupObject(token, backupIndexFile + '-' + category, part.envelope,
        { digest }, progress);
      if (!uploaded.id) throw new Error('Google Drive 未回傳分類備份識別碼。');
      packages[category] = {
        id: uploaded.id, digest, contentDigest: part.digest, count: part.count,
        deviceId, basePackageId, uploadedAt: new Date().toISOString()
      };
    }
    const envelope = await AccountStorage.sealBackupIndex({
      version: 2, packages, deviceId, baseBackupId: remote?.id ?? null
    });
    const properties = {
      digest: await fingerprint(envelope),
      count: String(Object.values(packages).reduce((total, ref) => total + ref.count, 0)),
      updatedAt: JSON.parse(envelope).updatedAt,
      ...(snapshotDigest ? { snapshotDigest } : {})
    };
    if ((await latestBackup(token))?.id !== remote?.id) throw new Error('雲端版本已更新，請重新比較。');
    return uploadBackupObject(token, backupIndexFile, envelope, properties, progress);
  }

  function chooseGuestCardUpload(plan, local, remote, category = 'card') {
    const config = { card: ['卡片', '張', 'card', 0], bookmark: ['書籤', '筆', 'bookmark', 1],
      image: ['圖片母片', '筆', 'img', 2], qr: ['QR Code', '筆', 'qr', 3], network: ['請求', '筆', 'network', 4], viewer: ['資料夾快照', '筆', 'folder', 5] }[category];
    const [noun, unit, icon, countIndex] = config;
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';
      dialog.setAttribute('aria-labelledby', 'guestDriveUploadTitle');
      dialog.innerHTML = `
        <section class="app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('import')}</span>
            <div class="app-modal-header-info">
              <h2 id="guestDriveUploadTitle" class="app-modal-header-title">上傳已釘選的訪客${noun}</h2>
            </div>
            <button type="button" class="app-modal-header-close" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body">
            <div class="card-guest-upload-flow">
              <div class="card-guest-upload-sources">
                <div class="card-guest-upload-source">
                  <span class="google-drive-backup-icon" aria-hidden="true">${resolveIcon('computer')}</span>
                  <div class="google-drive-backup-info">
                    <strong>本機帳號（供比對）</strong>
                    <div class="card-guest-upload-summary">
                      <div><strong class="card-guest-upload-count" data-local-count></strong> ${unit}${noun}</div>
                      <div data-local-date></div>
                    </div>
                  </div>
                </div>
                <div class="card-guest-upload-source">
                  <span class="google-drive-backup-icon" aria-hidden="true">${resolveIcon(icon)}</span>
                  <div class="google-drive-backup-info">
                    <strong>本次訪客${noun}</strong>
                    <div class="card-guest-upload-summary"><strong class="card-guest-upload-count" data-guest-count></strong> ${unit}${noun}</div>
                  </div>
                </div>
              </div>
              <span class="card-guest-upload-connector" aria-hidden="true"><span></span></span>
              <div class="card-guest-upload-source card-guest-upload-destination">
                <span class="google-drive-backup-icon" aria-hidden="true">${resolveIcon('cloudOutline')}</span>
                <div class="google-drive-backup-info">
                  <strong>Google Drive</strong>
                  <div class="card-guest-upload-summary">
                    <div class="card-guest-upload-cloud-counts">
                      <span>目前 <strong class="card-guest-upload-count" data-cloud-current></strong> ${unit}</span>
                      <span aria-hidden="true">→</span>
                      <span>預計 <strong class="card-guest-upload-count" data-cloud-projected></strong> ${unit}</span>
                    </div>
                    <div data-summary-cloud-date></div>
                  </div>
                </div>
              </div>
            </div>
            <details class="card-guest-upload-details">
              <summary class="card-guest-upload-heading">
                <span class="google-drive-backup-icon" aria-hidden="true">${resolveIcon(icon)}</span>
                <span data-guest-upload-heading></span>
              </summary>
              <div data-guest-card-choices></div>
            </details>
          </div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" autofocus>取消</button>
            <button type="button" class="btn-confirm">確認上傳選定${noun}</button>
          </footer>
        </section>`;
      dialog.querySelector('[data-local-count]').textContent = local?.items?.[countIndex] ?? 0;
      const localDate = new Date(local?.updatedAt ?? NaN);
      const localDateLabel = dialog.querySelector('[data-local-date]');
      if (Number.isFinite(localDate.getTime())) localDateLabel.textContent = localDate.toLocaleString();
      else localDateLabel.hidden = true;
      const guestCount = dialog.querySelector('[data-guest-count]');
      const uploadFlow = dialog.querySelector('.card-guest-upload-flow');
      const cloudCurrent = dialog.querySelector('[data-cloud-current]');
      const cloudProjected = dialog.querySelector('[data-cloud-projected]');
      cloudCurrent.textContent = plan.cloudCardCount;
      const cloudDate = new Date(remote?.appProperties?.updatedAt || remote?.createdTime || NaN);
      const cloudTime = Number.isFinite(cloudDate.getTime()) ? cloudDate.toLocaleString() : '';
      const cloudDateLabel = dialog.querySelector('[data-summary-cloud-date]');
      cloudDateLabel.textContent = remote ? cloudTime : '尚無備份';
      cloudDateLabel.hidden = !cloudDateLabel.textContent;
      const confirm = dialog.querySelector('.btn-confirm');
      const container = dialog.querySelector('[data-guest-card-choices]');
      dialog.querySelector('[data-guest-upload-heading]').textContent =
        `本次釘選的訪客${noun}（` + plan.rows.length + '）';
      const choices = plan.rows.map(({ cloud, identical }) => cloud || identical ? 'skip' : 'add');
      const updateConfirm = () => {
        const uploadCount = choices.filter(choice => choice !== 'skip').length;
        confirm.disabled = uploadCount === 0;
        guestCount.textContent = uploadCount;
        uploadFlow.classList.toggle('is-inactive', uploadCount === 0);
        const additions = choices.filter(choice => choice === 'add' || choice === 'copy').length;
        cloudProjected.textContent = plan.cloudCardCount + additions;
      };
      plan.rows.forEach(({ card, cloud, identical, canReplace }, index) => {
        const row = document.createElement('div');
        row.className = 'google-drive-merge-row card-guest-upload-row';
        const label = document.createElement('span');
        const name = card.title || `未命名${noun}`;
        label.textContent = name + (identical ? '（雲端已有相同內容）' :
          cloud ? '（同 ID，雲端：' + (cloud.title || `未命名${noun}`) + '）' : '');
        row.append(label);
        if (identical) {
          const status = document.createElement('span');
          status.textContent = '略過';
          row.append(status);
        } else {
          const group = document.createElement('div');
          group.className = 'card-guest-upload-options';
          group.setAttribute('role', 'group');
          group.setAttribute('aria-label', name + '的上傳方式');
          const options = cloud
            ? [...(canReplace ? [['覆蓋雲端', 'replace']] : []), ['保留兩筆', 'copy']]
            : [['新增', 'add']];
          options.push(['略過', 'skip']);
          const buttons = options.map(([text, value]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = text;
            button.setAttribute('aria-pressed', String(value === choices[index]));
            button.addEventListener('click', () => {
              choices[index] = value;
              buttons.forEach((option, position) => {
                option.setAttribute('aria-pressed', String(options[position][1] === value));
              });
              updateConfirm();
            });
            return button;
          });
          group.append(...buttons);
          row.append(group);
        }
        container.append(row);
      });
      updateConfirm();
      let result;
      const close = () => ModalManager.closeDialog(dialog);
      dialog.querySelector('.app-modal-header-close').onclick = close;
      dialog.querySelector('.btn-reset').onclick = close;
      confirm.onclick = () => {
        result = [...choices];
        close();
      };
      dialog.addEventListener('close', () => { dialog.remove(); resolve(result); }, { once: true });
      document.body.append(dialog);
      ModalManager.showDialog(dialog, close);
    });
  }

  async function uploadGuestCards(cards, category = 'card') {
    const noun = { card: '卡片', bookmark: '書籤', image: '圖片母片', qr: 'QR Code', network: '請求', viewer: '資料夾快照' }[category];
    if (!noun) throw new Error('訪客資料類型不正確。');
    if (!cards.length || !session) return;
    if (pending || syncing) {
      showToast('Google Drive 正在處理其他操作，請稍後再試。');
      return;
    }
    const account = session;
    const auth = account.authorization;
    if (!auth || auth.expiresAt <= Date.now()) {
      requestLogin(account.user, () => uploadGuestCards(cards, category));
      return;
    }
    syncing = true;
    try {
      const { token } = auth;
      const local = await AccountStorage.snapshot();
      const remote = await latestBackup(token);
      let envelope;
      let index;
      if (remote) {
        const progress = showTransferProgress('正在讀取雲端備份…');
        try {
          if (remote.name === backupIndexFile) {
            index = await readBackupIndex(token, remote, progress);
            envelope = await readBackupObject(token, index.packages[category], progress);
          } else {
            envelope = await readBackupEnvelope(token, remote, progress);
          }
        } finally {
          progress.close();
        }
      }
      const plan = category === 'bookmark'
        ? await AccountStorage.prepareGuestBookmarkUpload(envelope, cards)
        : category === 'card' ? await AccountStorage.prepareGuestCardUpload(envelope, cards)
        : await AccountStorage.prepareGuestListUpload(envelope, cards, category);
      if (session !== account) return;
      const choices = await chooseGuestCardUpload(plan, local, remote, category);
      if (!choices || session !== account) return;
      const upload = async () => {
        if (session !== account) return;
        if ((await latestBackup(token))?.id !== remote?.id) {
          throw new Error('雲端版本已更新，請重新比較。');
        }
        const next = await plan.build(choices);
        if (!next || session !== account) return;
        const progress = showTransferProgress(`正在上傳選定的訪客${noun}…`);
        try {
          const uploaded = await publishCategoryBackup(token, next, remote, progress, { index, categoryOnly: category });
          if (!uploaded.id) throw new Error('Google Drive 未回傳備份識別碼。');
          if (session === account) showToast(`已上傳選定的訪客${noun}。`);
        } finally {
          progress.close();
        }
      };
      if (navigator.locks) await navigator.locks.request(syncMarker(account), upload);
      else await upload();
    } catch (error) {
      if (error.status === 401 && session === account) {
        clearAuthorization();
        delete account.authorization;
      }
      showToast(`訪客${noun}上傳未完成：` + error.message);
    } finally {
      syncing = false;
    }
  }

  function chooseBackupAction(local, remote, direction, remoteItems, category) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';
      dialog.setAttribute('aria-labelledby', 'googleDriveBackupTitle');
      const upload = direction === 'upload';
      const title = upload ? (category ? '上傳目前模組至 Google Drive' : '整站備份至 Google Drive')
        : '從 Google Drive 下載目前模組';
      const categoryIndex = AccountStorage.backupCategories.indexOf(category);
      const canReview = !direction && remote && (local || categoryIndex >= 0);
      const detail = direction === 'restore'
        ? '本機尚無卡片。確認後，會將雲端卡片還原到此裝置。'
        : upload && category ? (remote
          ? '確認後，會用本機目前模組的資料覆蓋雲端同一模組。'
          : '確認後，會備份本機目前模組的資料。')
        : category ? '逐筆比對目前模組，選擇要套用至此裝置的雲端資料。'
        : remote ? '上傳會以此裝置的帳號資料覆蓋 Google Drive 的現有備份。請確認是否覆蓋。'
          : '確認後，會把本機資料上傳到 Google Drive，建立第一份備份。';
      const renderVersion = (target, data, timeLabel) => {
        target.closest('.google-drive-backup-info').parentElement.classList.toggle('is-empty', !data);
        const date = new Date(data?.updatedAt);
        const time = document.createElement('span');
        time.textContent = data
          ? timeLabel + ' ' + (Number.isFinite(date.getTime()) ? date.toLocaleString() : '未知')
          : '尚無資料';
        target.append(time);
        const counts = document.createElement('ul');
        counts.className = 'google-drive-backup-counts';
        const categories = [
          ['card', '卡片'], ['bookmark', '書籤'], ['img', '圖片'],
          ['qr', 'QR'], ['ext-terminal', '網路工具'], ['folder', 'Viewer 資料夾']
        ];
        categories.forEach(([icon, label], index) => {
          if (categoryIndex >= 0 && index !== categoryIndex) return;
          const item = document.createElement('li');
          const count = data ? data.items?.[index] : 0;
          item.classList.toggle('has-items', count > 0);
          item.title = label + ' ' + (count ?? '未知');
          item.setAttribute('aria-label', item.title);
          const glyph = document.createElement('span');
          glyph.setAttribute('aria-hidden', 'true');
          glyph.innerHTML = resolveIcon(icon);
          const value = document.createElement('span');
          value.textContent = count ?? '–';
          item.append(glyph, value);
          counts.append(item);
        });
        target.append(counts);
      };
      dialog.innerHTML = `
        <section class="app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon(upload ? 'import' : direction ? 'export' : 'cloudOutline')}</span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title" id="googleDriveBackupTitle">${title}</h2>
            </div>
            <button type="button" class="app-modal-header-close" aria-label="關閉" autofocus>✕</button>
          </header>
          <div class="app-dialog-body">
            <p class="google-drive-backup-summary">${detail}</p>
            <div class="google-drive-backup-versions${direction ? ' has-direction' : ''}">
              <div>
                <span class="google-drive-backup-icon" aria-hidden="true">${resolveIcon('computer')}</span>
                <div class="google-drive-backup-info">
                  <strong>本機</strong>
                  <div class="google-drive-backup-version" data-backup-local></div>
                </div>
              </div>
              ${direction ? `<span class="google-drive-backup-arrow" aria-hidden="true">${upload ? '→' : '←'}</span>` : ''}
              <div>
                <span class="google-drive-backup-icon" aria-hidden="true">${resolveIcon('cloudOutline')}</span>
                <div class="google-drive-backup-info">
                  <strong>Google Drive</strong>
                  <div class="google-drive-backup-version" data-backup-remote></div>
                </div>
              </div>
            </div>
          </div>
          <footer class="app-dialog-footer">
            ${direction ? `<button type="button" class="btn-reset" data-backup-action="cancel">取消</button>
            <button type="button" class="btn-confirm" data-backup-action="${direction}">${upload ? (remote ? '確認覆蓋' : '確認上傳') : '確認還原'}</button>` :
              `<button type="button" class="btn-reset" data-backup-action="cancel">關閉</button>
              ${canReview ? '<button type="button" class="btn-confirm" data-backup-action="review">逐筆比對</button>' : ''}`}
          </footer>
        </section>`;
      renderVersion(dialog.querySelector('[data-backup-local]'), local, '本機備份時間');
      renderVersion(dialog.querySelector('[data-backup-remote]'), remote && {
        updatedAt: remote.appProperties?.updatedAt === 'unknown' ? remote.createdTime : remote.appProperties?.updatedAt || remote.createdTime,
        items: remoteItems
      }, '雲端備份時間');
      let action;
      const close = () => ModalManager.closeDialog(dialog);
      dialog.querySelector('.app-modal-header-close').onclick = close;
      dialog.querySelectorAll('[data-backup-action]').forEach(button => {
        button.onclick = () => { action = button.dataset.backupAction; close(); };
      });
      dialog.addEventListener('close', () => { dialog.remove(); resolve(action); }, { once: true });
      document.body.append(dialog);
      ModalManager.showDialog(dialog, close);
    });
  }

  function renderMergePreview(target, category, value) {
    const add = (label, text) => {
      if (text === undefined || text === null || text === '') return;
      const line = document.createElement('div');
      if (label) {
        const caption = document.createElement('strong');
        caption.textContent = label + ' ';
        line.append(caption);
      }
      line.append(String(text));
      target.append(line);
    };
    if (value === undefined) {
      add('', '無此項目');
    } else if (typeof value === 'string' || typeof value === 'number') {
      add('', value);
    } else if (category === '卡片') {
      const preview = window.plugins.card?.renderPreview?.(value);
      if (preview) {
        preview.classList.add('google-drive-card-preview');
        target.append(preview);
      } else {
        add('', value.title);
        add('類型', value.type);
      }
      for (const group of value.itemlist ?? []) {
        add('群組', group.name || '未命名');
        for (const item of group.item ?? []) {
          const content = item.modal || Object.values(item).find(field => typeof field === 'string');
          add(item._hidden ? '隱藏項目' : '', content);
        }
      }
    } else if (category === '書籤') {
      add('', value.title);
      add('網址', value.url);
      add('筆記', value.content);
    } else if (category === '書籤主題') {
      add('', value.name);
    } else if (category === 'QR') {
      add('', value.name);
      add('內容', value.text);
    } else if (category === '圖片') {
      add('', value.name);
      if (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value.image ?? '')) {
        const image = document.createElement('img');
        image.alt = value.name || '圖片預覽';
        image.src = value.image;
        target.append(image);
      }
      for (const overlay of value.texts ?? []) add('圖片文字', overlay.text);
    } else if (category === 'Viewer 資料夾') {
      for (const root of value.roots ?? []) add('根目錄', root + '/');
      add('檔案數', value.files?.length);
      add('資料夾數', value.directories?.filter(path => path.includes('/')).length);
    } else if (category === '最近開啟的筆記' && Array.isArray(value)) {
      add('最近開啟', value.length + ' 則筆記');
    } else if (typeof value === 'boolean') {
      add('', value ? '已開啟' : '已關閉');
    }
    if (!target.childElementCount) add('', '沒有可顯示的預覽');
  }

  function chooseMergeItems(rows, guestAccount = '', canGoBack = false) {
    return new Promise(resolve => {
      const source = guestAccount ? '本機訪客資料' : 'Google Drive';
      const destination = guestAccount ? '帳號資料' : '此裝置的帳號資料';
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';
      dialog.setAttribute('aria-labelledby', 'googleDriveMergeTitle');
      dialog.innerHTML = `
        <section class="app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('cloudOutline')}</span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title" id="googleDriveMergeTitle">${guestAccount ? '比對本機訪客資料' : '比對本機與雲端資料'}</h2>
              <p class="app-modal-header-subtitle">${guestAccount ? '' : '只套用勾選的雲端項目，其他本機資料會保留'}</p>
            </div>
            <button type="button" class="app-modal-header-close" aria-label="關閉" autofocus>✕</button>
          </header>
          <div class="app-dialog-body">
            <p class="google-drive-merge-help">${guestAccount ? '勾選要匯入帳號的項目。本機訪客資料會保留。' : '可勾選要帶回此裝置的雲端項目。要將此裝置的帳號資料更新到雲端，請使用 Google Drive 選單的「上傳備份至 Google Drive」。'}</p>
            <small class="google-drive-merge-preserved" hidden></small>
            <div class="google-drive-merge-list"></div>
          </div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset">${guestAccount ? '稍後比對' : canGoBack ? '上一步' : '取消'}</button>
            <button type="button" class="btn-confirm" disabled>${guestAccount ? '匯入所選項目' : '套用至本機'}</button>
          </footer>
        </section>`;
      const list = dialog.querySelector('.google-drive-merge-list');
      const scrollBody = dialog.querySelector('.app-dialog-body');
      let mergeScroll;
      if (guestAccount) dialog.querySelector('.app-modal-header-subtitle').textContent = '匯入至 ' + guestAccount;
      const apply = dialog.querySelector('.btn-confirm');
      const chosen = new Set();
      let selection;
      const groups = new Map();
      const categoryIcons = new Map([
        ['卡片', 'card'], ['書籤', 'bookmark'], ['圖片', 'img'],
        ['QR', 'qr'], ['網路工具', 'ext-terminal'], ['Viewer', 'folder']
      ]);
      const preserved = rows.filter(row => row.cloud === undefined).length;
      const preservedNote = dialog.querySelector('.google-drive-merge-preserved');
      if (preserved) {
        preservedNote.hidden = false;
        preservedNote.textContent = '另有 ' + preserved + ' 項只存在於' + (guestAccount ? '帳號中' : '本機') + '，會保留。';
      }
      if (!rows.some(row => row.cloud !== undefined && !row.blocked)) {
        apply.hidden = true;
        if (!canGoBack) dialog.querySelector('.btn-reset').textContent = '關閉';
      }
      if (!rows.length || (guestAccount && preserved === rows.length)) {
        list.textContent = guestAccount ? '沒有可匯入的訪客項目。'
          : '沒有可套用到本機的雲端項目。';
      }
      rows.forEach((row, index) => {
        if (guestAccount && row.cloud === undefined) return;
        const hasLocal = row.local !== undefined;
        const hasCloud = row.cloud !== undefined;
        const item = document.createElement('div');
        item.className = 'google-drive-merge-row';
        const category = row.group ?? ({
          '書籤主題': '書籤', PowerShell: '網路工具', Bash: '網路工具', 'Viewer 資料夾': 'Viewer'
        }[row.label] || row.label);
        if (!groups.has(category)) {
          const group = document.createElement('section');
          const heading = document.createElement('h3');
          const icon = document.createElement('span');
          icon.className = 'google-drive-merge-category-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = resolveIcon(categoryIcons.get(category));
          heading.append(icon, category);
          group.append(heading);
          list.append(group);
          groups.set(category, group);
        }
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = row.title + ' ';
        const state = document.createElement('small');
        state.textContent = !hasCloud ? '僅此裝置的帳號有' : row.blocked ? '無法配對' : hasLocal ? '內容不同' : guestAccount ? '僅訪客資料有' : '僅雲端有';
        summary.append(state);
        details.append(summary);
        details.addEventListener('toggle', () => {
          mergeScroll?.updateScrollbar();
          if (!details.open || details.children.length > 1) return;
          const versions = document.createElement('div');
          versions.className = 'google-drive-merge-content';
          const sides = hasLocal ? [[destination, row.local], [source, row.cloud]] : [[source, row.cloud]];
          for (const [name, value] of sides) {
            const side = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = name;
            const content = document.createElement('div');
            content.className = 'google-drive-merge-preview';
            renderMergePreview(content, row.label, value);
            side.append(title);
            const revision = name === destination ? row.localTime : row.cloudTime;
            if (revision !== undefined) {
              const time = document.createElement('div');
              time.textContent = new Date(revision).toLocaleString();
              side.append(time);
            }
            side.append(content);
            versions.append(side);
          }
          details.append(versions);
        });
        item.append(details);
        if (hasCloud && !row.blocked) {
          const label = document.createElement('label');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.setAttribute('role', 'switch');
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) chosen.add(index);
            else chosen.delete(index);
            apply.disabled = chosen.size === 0;
          });
          label.append(checkbox, hasLocal ? (guestAccount ? ' 採用訪客版本' : ' 採用雲端版本') : ' 加入');
          const options = document.createElement('span');
          options.className = 'guest-diff-pin-options';
          options.append(label);
          item.append(options);
        }
        groups.get(category).append(item);
      });
      for (const category of categoryIcons.keys()) {
        if (groups.has(category)) list.append(groups.get(category));
      }
      const close = () => ModalManager.closeDialog(dialog);
      apply.onclick = () => { selection = [...chosen]; close(); };
      dialog.querySelector('.app-modal-header-close').onclick = close;
      dialog.querySelector('.btn-reset').onclick = () => {
        if (canGoBack) selection = 'back';
        close();
      };
      dialog.addEventListener('close', () => {
        mergeScroll?.destroy();
        dialog.remove();
        resolve(selection);
      }, { once: true });
      document.body.append(dialog);
      ModalManager.showDialog(dialog, close);
      if (typeof NiceScroll === 'function') {
        scrollBody.classList.add('google-drive-merge-scroll');
        mergeScroll = new NiceScroll(scrollBody);
      }
    });
  }

  function syncMarker(account) {
    return 'site-drive-backup-version:' + account.user.permissionId;
  }

  async function syncBackup(mode, category = mode === 'download' ? currentBackupCategory() : undefined) {
    if (mode === 'download' && !category) return;
    const manual = mode === 'upload' || mode === 'download';
    if (!manual && (session?.syncPaused || session?.autoSyncDisabled)) return;
    if (syncing || pending) {
      if (mode === 'save') {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => void syncBackup('save'), 1000);
      }
      return;
    }
    const account = session;
    const auth = account?.authorization;
    if (!auth || auth.expiresAt <= Date.now()) {
      if (manual && account) requestLogin(account.user, () => syncBackup(mode, category));
      return;
    }
    syncing = true;
    try {
      const token = auth.token;
      const marker = syncMarker(account);
      const process = async () => {
        if (session !== account) return;
        const local = await AccountStorage.snapshot();
        const remote = await latestBackup(token);
        if (mode === 'upload' && !local) {
          showToast('目前沒有可上傳的本機資料。');
          return;
        }
        if (mode === 'download' && !remote) {
          showToast('Google Drive 目前沒有可還原的備份。');
          return;
        }
        const digest = local && await fingerprint(local.envelope);
        const remoteSnapshotDigest = remote?.name === backupIndexFile
          ? remote.appProperties?.snapshotDigest : remote?.appProperties?.digest;
        if (!category && local && remoteSnapshotDigest === digest) {
          localStorage.setItem(marker, remote.id);
          account.syncPaused = false;
          if (manual || mode === 'save') showToast('已同步至 Google Drive。');
          return;
        }
        const sameBase = remote && localStorage.getItem(marker) === remote.id;
        const canAutoUpload = local && mode === 'save' && (!remote || sameBase);
        const autoReview = !manual && remote && (!local || !sameBase);
        const comparisonCategory = category ?? (autoReview ? currentBackupCategory() : undefined);
        if (remote && (mode === 'download' || autoReview)) {
          account.syncPaused = true;
          clearTimeout(syncTimer);
        }
        if (autoReview && !comparisonCategory) {
          showToast('請切換到要比對的模組，再從 Google Drive 下載還原。');
          return;
        }
        let action;
        let mergePlan;
        let remoteItems;
        let restoreRows;
        if (canAutoUpload && !remote) action = 'upload';
        else if (manual || autoReview || canAutoUpload) {
          if (remote) {
            const progress = showTransferProgress('正在下載雲端備份以比較版本…');
            try {
              const envelope = comparisonCategory && remote.name === backupIndexFile
                ? await readBackupIndex(token, remote, progress)
                  .then(({ packages }) => readBackupObject(token, packages[comparisonCategory], progress))
                : await readBackupEnvelope(token, remote, progress);
              remoteItems = await AccountStorage.inspectBackup(envelope);

              if (local || comparisonCategory) {
                mergePlan = await AccountStorage.prepareBackupMerge(local?.envelope ?? null, envelope, comparisonCategory,
                  { includeCloudCards: mode === 'download' });
                if (mergePlan.identical) {
                  if ((await AccountStorage.snapshot())?.envelope !== local?.envelope ||
                      (await latestBackup(token))?.id !== remote.id) {
                    throw new Error('版本已更新，請重新比較。');
                  }
                  if (comparisonCategory) {
                    if (manual) showToast('目前模組與 Google Drive 的內容相同。');
                    return;
                  }
                  localStorage.setItem(marker, remote.id);
                  account.syncPaused = false;
                  sessionStorage.removeItem(marker + ':paused');
                  if (manual || mode === 'save') showToast('本機與 Google Drive 的內容相同，無需同步。');
                  return;
                }
              }
            } finally {
              progress.close();
            }
          }
          if (mode === 'download' && comparisonCategory === 'card' && remote &&
              (local?.items?.[AccountStorage.backupCategories.indexOf('card')] ?? 0) === 0) {
            restoreRows = mergePlan.rows.flatMap((row, index) =>
              row.label === '卡片' && row.local === undefined && row.cloud !== undefined && !row.blocked ? [index] : []);
            if (!restoreRows.length) {
              showToast('這份雲端備份沒有可還原的卡片。');
              return;
            }
          }
          const direction = restoreRows ? 'restore' : mode === 'upload' || canAutoUpload ? 'upload' : undefined;
          if (canAutoUpload && !mergePlan?.requiresOverwrite) {
            action = 'upload';
          } else {
            if (canAutoUpload) account.syncPaused = true;
            action = await chooseBackupAction(local, remote, direction, remoteItems, comparisonCategory);
          }
        }
        if (!action || action === 'cancel' || session !== account) return;
        const progress = showTransferProgress(action === 'restore' ? '正在準備還原卡片…'
          : action === 'review' ? '正在整理本機與雲端差異…' : '正在準備上傳備份…');
        try {
          const latest = await latestBackup(token);
          if (latest?.id !== remote?.id) throw new Error('雲端版本已更新，請重新比較。');
          if (action === 'review' || action === 'restore') {
            const plan = mergePlan;
            progress.close();
            let chosen = restoreRows;
            if (action === 'review') {
              do {
                chosen = await chooseMergeItems(plan.rows, '', true);
                if (chosen !== 'back') break;
                const review = await chooseBackupAction(local, remote, undefined, remoteItems, comparisonCategory);
                if (review !== 'review' || session !== account) return;
              } while (chosen === 'back');
            }
            if (!chosen?.length || session !== account) return;
            const applyProgress = showTransferProgress('正在加密並儲存所選項目…');
            try {
              if ((await latestBackup(token))?.id !== remote.id) throw new Error('雲端版本已更新，請重新比較。');
              await plan.apply(chosen);
              sessionStorage.setItem(marker + ':paused', 'true');
              sessionStorage.setItem('site-google-drive-import-message', '已套用所選項目到本機。如要更新雲端，請手動上傳備份。');
              location.reload();
            } finally {
              applyProgress.close();
            }
            return;
          }
          const current = await AccountStorage.snapshot();
          if (current?.envelope !== local.envelope) throw new Error('本機版本已更新，請重新比較。');
          progress.phase('正在上傳備份至 Google Drive…');
          const uploaded = await publishCategoryBackup(token, local, remote, progress,
            category ? { categoryOnly: category, preserveLegacyModules: true } : { snapshotDigest: digest });
          if (!uploaded.id) throw new Error('Google Drive 未回傳備份識別碼。');
          if (session !== account) return;
          if (category) {
            account.syncPaused = true;
            sessionStorage.setItem(marker + ':paused', 'true');
            showToast('已上傳目前模組至 Google Drive。');
            return;
          }
          localStorage.setItem(marker, uploaded.id);
          account.syncPaused = false;
          sessionStorage.removeItem(marker + ':paused');
          showToast('已同步至 Google Drive。');
        } finally {
          progress.close();
        }
      };
      if (navigator.locks) await navigator.locks.request(marker, process);
      else await process();
    } catch (error) {
      if (error.status === 401) {
        clearAuthorization();
        delete account.authorization;
        showToast('Google Drive 授權已到期，請重新登入後同步。');
      } else {
        showToast('Google Drive 同步未完成：' + error.message);
      }
    } finally {
      syncing = false;
    }
  }

  async function listKeyFiles(token) {
    const query = new URLSearchParams({
      spaces: 'appDataFolder',
      q: "trashed = false and name = '" + keyFile + "'",
      fields: 'nextPageToken,files(id)',
      pageSize: '2'
    });
    const { files, nextPageToken } = await driveRequest(token, 'drive/v3/files?' + query);
    if (files.length > 1 || nextPageToken) {
      throw new Error('找到多份金鑰，已停止解鎖以保護既有資料。');
    }
    return files;
  }

  async function loadAccountKey(token, allowCreate) {
    let files = await listKeyFiles(token);
    if (!files.length) {
      if (!allowCreate) throw new Error('找不到這個帳號的 Drive 金鑰。');
      const query = new URLSearchParams({
        spaces: 'appDataFolder',
        q: 'trashed = false',
        fields: 'nextPageToken,files(id)',
        pageSize: '1'
      });
      const existing = await driveRequest(token, 'drive/v3/files?' + query);
      if (existing.files.length || existing.nextPageToken) {
        throw new Error('Drive 已有應用程式資料，但找不到金鑰，已停止建立新金鑰。');
      }

      const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const exported = await crypto.subtle.exportKey('jwk', generated);
      const boundary = crypto.randomUUID();
      const metadata = { name: keyFile, parents: ['appDataFolder'], mimeType: 'application/json' };
      const body = '--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(exported) +
        '\r\n--' + boundary + '--\r\n';
      const created = await driveRequest(token, 'upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body
      });
      files = await listKeyFiles(token);
      if (files[0]?.id !== created.id) throw new Error('無法確認新建的金鑰，請重新登入。');
    }

    const jwk = await driveRequest(token, 'drive/v3/files/' + encodeURIComponent(files[0].id) + '?alt=media');
    const key = await crypto.subtle.importKey('jwk', jwk, 'AES-GCM', false, ['encrypt', 'decrypt']);
    if (key.algorithm.length !== 256) throw new Error('Drive 金鑰格式不符。');
    return { key, jwk };
  }

  async function signOut() {
    if (pending || syncing || !session) return;
    pending = true;
    const accountId = session.user.permissionId;
    try {
      await AccountStorage.flush();
      const saved = JSON.parse(localStorage.getItem(localAccountStorageKey));
      if (saved?.user?.permissionId === accountId) await forgetLocalKey(saved);
      localStorage.setItem('site-google-drive-sign-out', accountId + ':' + crypto.randomUUID());
      clearSession();
      location.reload();
    } catch (error) {
      showToast('無法完成登出：' + error.message);
    } finally {
      pending = false;
    }
  }

  function clearSession() {
    clearTimeout(syncTimer);
    clearAuthorization();
    AccountStorage.lock();
    session = undefined;
    plugin.icon = signedOutIcon;
    plugin.label = '登入 Google Drive';
    delete plugin.children;
    renderToolbar();
  }

  function clearAuthorization() {
    try {
      sessionStorage.removeItem(authorizationStorageKey);
    } catch {
      // Storage can be disabled by the browser.
    }
  }

  function accessKeyShare(id, operation, value, legacy = false) {
    const database = legacy ? 'site-google-drive-key-shares' : 'site-local-state';
    const collection = legacy ? 'shares' : 'entries';
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(database, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(collection);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const readOnly = operation === 'get' || operation === 'count';
        const tx = db.transaction(collection, readOnly ? 'readonly' : 'readwrite');
        const store = tx.objectStore(collection);
        const action = operation === 'put' ? store.put(value, id) :
          operation === 'count' ? store.count() : store[operation](id);
        tx.oncomplete = () => { db.close(); resolve(action.result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }

  async function removeKeyShare(saved) {
    const legacy = saved.storageVersion !== 2;
    await accessKeyShare(saved.shareId, 'delete', undefined, legacy);
    if (legacy && await accessKeyShare(undefined, 'count', undefined, true) === 0) {
      indexedDB.deleteDatabase('site-google-drive-key-shares');
    }
  }

  async function forgetLocalKey(saved) {
    localStorage.removeItem(localAccountStorageKey);
    if (saved?.shareId) {
      await removeKeyShare(saved).catch(() => {
        showToast('本機金鑰已停用，但無法清除其中一份片段。');
      });
    }
  }

  async function saveLocalKey(user, jwk, previous) {
    const bytes = new TextEncoder().encode(JSON.stringify(jwk));
    const mask = crypto.getRandomValues(new Uint8Array(bytes.length));
    const masked = bytes.map((byte, index) => byte ^ mask[index]);
    const shareId = crypto.randomUUID();
    await accessKeyShare(shareId, 'put', mask);
    try {
      localStorage.setItem(localAccountStorageKey, JSON.stringify({
        user, optedIn: true, storageVersion: 2, shareId, masked: btoa(String.fromCharCode(...masked))
      }));
    } catch (error) {
      await accessKeyShare(shareId, 'delete').catch(() => {});
      throw error;
    }
    if (previous?.shareId) await removeKeyShare(previous).catch(() => {});
  }

  async function readLocalKey(saved) {
    const mask = await accessKeyShare(saved.shareId, 'get', undefined, saved.storageVersion !== 2);
    const masked = Uint8Array.from(atob(saved.masked), char => char.charCodeAt(0));
    if (!mask || mask.length !== masked.length) throw new Error('找不到完整的本機金鑰片段。');
    return JSON.parse(new TextDecoder().decode(masked.map((byte, index) => byte ^ mask[index])));
  }

  function chooseKeyRetention(isRemembered) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';
      dialog.setAttribute('aria-labelledby', 'googleDriveKeyTitle');
      dialog.innerHTML = `
        <section class="app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('key')}</span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title" id="googleDriveKeyTitle">本機金鑰</h2>
              <p class="app-modal-header-subtitle">選擇是否在此瀏覽器記住金鑰</p>
            </div>
            <button type="button" class="app-modal-header-close" aria-label="關閉" autofocus>✕</button>
          </header>
          <div class="app-dialog-body">
            <div class="google-drive-key-options" role="group" aria-label="金鑰保存方式">
              <label>
                <input type="radio" name="googleDriveKeyRetention" value="session" ${isRemembered ? '' : 'checked'}>
                <span class="google-drive-key-option-icon" aria-hidden="true">${resolveIcon('viewerHistory')}</span>
                <span><strong>僅本次使用</strong><br>金鑰只留在記憶體。同一分頁重新整理時，可在 Google 授權有效期間取回金鑰，授權通常約一小時。</span>
              </label>
              <label>
                <input type="radio" name="googleDriveKeyRetention" value="remember" ${isRemembered ? 'checked' : ''}>
                <span class="google-drive-key-option-icon" aria-hidden="true">${resolveIcon('saveLocal')}</span>
                <span><strong>記住金鑰</strong><br>重開站台仍可載入金鑰，直到你登出。</span>
              </label>
            </div>
            <div class="app-dialog-warning">
              <span aria-hidden="true">!</span>
              <div><strong>安全提醒</strong><br>若選擇記住金鑰，能讀取此瀏覽器儲存資料的人也可能取得金鑰。</div>
            </div>
            <small>兩種選擇都需要有效的 Google 授權才能同步。</small>
          </div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset">取消</button>
            <button type="button" class="btn-confirm">確定</button>
          </footer>
        </section>`;
      let remember;
      dialog.querySelector('.app-modal-header-close').onclick = () => ModalManager.closeDialog(dialog);
      dialog.querySelector('.btn-reset').onclick = () => ModalManager.closeDialog(dialog);
      dialog.querySelector('.btn-confirm').onclick = () => {
        remember = dialog.querySelector('input:checked').value === 'remember';
        ModalManager.closeDialog(dialog);
      };
      dialog.addEventListener('close', () => {
        dialog.remove();
        resolve(remember);
      }, { once: true });
      document.body.append(dialog);
      ModalManager.showDialog(dialog, () => ModalManager.closeDialog(dialog));
    });
  }

  async function changeKeyRetention() {
    const currentSession = session;
    if (!currentSession) return;
    let isRemembered = false;
    try {
      const saved = JSON.parse(localStorage.getItem(localAccountStorageKey));
      isRemembered = saved?.optedIn === true && saved.user?.permissionId === currentSession.user.permissionId;
    } catch {
      // The browser may block access to local storage.
    }
    const remember = await chooseKeyRetention(isRemembered);
    if (remember === undefined || session !== currentSession) return;
    const { user, jwk } = currentSession;
    try {
      await applyKeyPreference(user, jwk, remember);
    } catch {
      showToast('瀏覽器無法更新本機金鑰儲存。');
    }
  }

  async function applyKeyPreference(user, jwk, remember) {
    const previous = JSON.parse(localStorage.getItem(localAccountStorageKey));
    if (remember) {
      await saveLocalKey(user, jwk, previous);
    } else if (previous?.user?.permissionId === user.permissionId) {
      await forgetLocalKey(previous);
    }
    localStorage.setItem(keyPreferencePrefix + user.permissionId, remember ? 'remember' : 'session');
  }

  async function configureKeyOnSignIn(user, jwk) {
    const previous = JSON.parse(localStorage.getItem(localAccountStorageKey));
    const preference = localStorage.getItem(keyPreferencePrefix + user.permissionId);
    if (previous && previous.user?.permissionId !== user.permissionId) await forgetLocalKey(previous);
    if (previous?.optedIn === true && previous.user?.permissionId === user.permissionId && preference !== 'session') {
      localStorage.setItem(keyPreferencePrefix + user.permissionId, 'remember');
      return;
    }
    if (preference === 'session') return;
    const remember = preference === 'remember' ? true : await chooseKeyRetention(false);
    if (remember !== undefined) await applyKeyPreference(user, jwk, remember);
  }

  async function restoreSession() {
    pending = true;
    try {
      const saved = JSON.parse(localStorage.getItem(localAccountStorageKey));
      if (saved?.user?.permissionId && saved.optedIn === true) {
        const jwk = saved.jwk || await readLocalKey(saved);
        const key = await crypto.subtle.importKey('jwk', jwk, 'AES-GCM', false, ['encrypt', 'decrypt']);
        if (key.algorithm.length !== 256) throw new Error('本機金鑰格式不符。');
        if (saved.jwk) {
          try {
            await saveLocalKey(saved.user, jwk, saved);
          } catch (error) {
            await forgetLocalKey(saved);
            throw error;
          }
        } else if (saved.storageVersion !== 2) {
          await saveLocalKey(saved.user, jwk, saved).catch(() => {
            showToast('本機儲存轉移未完成，下次開啟時會重試。');
          });
        }
        await AccountStorage.unlock(saved.user.permissionId, key);
        showAccount(saved.user, key, jwk);
      } else if (saved) {
        await forgetLocalKey(saved);
      }
    } catch {
      showToast('無法讀取本機 Google Drive 金鑰，請重新登入。');
    } finally {
      try {
        await restoreAuthorization();
      } finally {
        pending = false;
      }
    }
  }

  async function restoreAuthorization() {
    let authorization;
    try {
      authorization = JSON.parse(sessionStorage.getItem(authorizationStorageKey));
    } catch {
      clearAuthorization();
      return;
    }
    if (!authorization) return;
    if (typeof authorization.token !== 'string' || !authorization.token ||
        !Number.isFinite(authorization.expiresAt) || authorization.expiresAt <= Date.now()) {
      clearAuthorization();
      return;
    }

    try {
      if (session && session.user.permissionId !== authorization.accountId) {
        clearAuthorization();
        return;
      }
      await unlockAccount(authorization.token, false, authorization.accountId);
      session.authorization = authorization;
    } catch (error) {
      if (error.status === 401) clearAuthorization();
      showToast('無法恢復 Google Drive 連線，請點擊工具列重新登入。');
    }
  }

  async function unlockAccount(token, allowCreate, expectedAccountId, activate = !allowCreate) {
    const { user } = await driveRequest(token, 'drive/v3/about?fields=user(permissionId,displayName,emailAddress,photoLink)');
    if (!user?.permissionId) throw new Error('無法識別 Google Drive 帳號。');
    if (expectedAccountId && user.permissionId !== expectedAccountId) {
      clearAuthorization();
      throw new Error('Google Drive 帳號與此分頁的授權不符。');
    }
    const loadKey = () => loadAccountKey(token, allowCreate);
    const { key, jwk } = navigator.locks
      ? await navigator.locks.request('google-drive-key:' + user.permissionId, loadKey)
      : await loadKey();
    if (activate) {
      await AccountStorage.unlock(user.permissionId, key);
      showAccount(user, key, jwk);
    }
    return { user, jwk };
  }

  async function prepareGuestReview({ keys, groups }) {
    const sources = AccountStorage.legacyEntries().filter(([key]) => keys.test(key));
    const entries = new Map(sources.filter(([key, , source]) => key === source));
    for (const [key, value, source] of sources) {
      if (source !== key) entries.set(key, value);
    }
    if (!entries.size) return { rows: [] };
    const local = await AccountStorage.snapshot();
    const plan = await AccountStorage.prepareGuestMerge(local?.envelope ?? null, entries);
    const rows = plan.rows.map((row, index) => ({ row, index }))
      .filter(({ row }) => groups.includes(row.group ?? row.label));
    return { plan, rows };
  }

  async function importLegacyData() {
    if (pending || syncing || !session) return;
    const currentSession = session;
    const mode = window.viewMode;
    const review = window.plugins[mode]?.guestReview;
    if (!review || review.isAvailable?.() === false) return;
    pending = true;
    try {
      const opened = await review.open?.();
      if (opened || session !== currentSession || window.viewMode !== mode) return;
      const { plan, rows } = await prepareGuestReview(review);
      if (session !== currentSession || window.viewMode !== mode) return;
      if (!rows?.some(({ row }) => row.cloud !== undefined)) {
        showToast('目前模式沒有本機訪客資料可比對。');
        return;
      }
      const user = currentSession.user;
      const chosen = await chooseMergeItems(rows.map(({ row }) => row),
        user.emailAddress || user.displayName || '目前 Google 帳號');
      if (session !== currentSession || window.viewMode !== mode || !chosen?.length) return;
      await plan.apply(chosen.map(index => rows[index].index));
      sessionStorage.setItem('site-google-drive-import-message', '已將所選項目匯入目前帳號。');
      location.reload();
    } catch (error) {
      showToast('匯入未完成：' + error.message);
    } finally {
      pending = false;
    }
  }
  function autoSyncPreference(user) {
    return 'site-drive-auto-sync:' + user.permissionId;
  }

  function toggleAutoSync() {
    if (!session || pending || syncing) return;
    const disabled = !session.autoSyncDisabled;
    try {
      localStorage.setItem(autoSyncPreference(session.user), disabled ? 'off' : 'on');
      session.autoSyncDisabled = disabled;
      if (disabled) clearTimeout(syncTimer);
      renderToolbar();
      showToast(disabled ? '已暫停自動同步，資料仍會儲存在本機。' :
        session.syncPaused ? '已啟用自動同步，請先處理本機與雲端的版本差異。' : '已啟用自動同步。');
    } catch {
      showToast('無法儲存自動同步設定。');
    }
  }

  function currentBackupCategory() {
    const mode = window.viewMode;
    const category = mode === 'img' ? 'image' : mode;
    return AccountStorage.backupCategories.includes(category) ? category : undefined;
  }

  function showAccount(user, key, jwk) {
    session = { user, key, jwk, autoSyncDisabled: localStorage.getItem(autoSyncPreference(user)) === 'off' };
    try {
      session.syncPaused = sessionStorage.getItem(syncMarker(session) + ':paused') === 'true';
    } catch {
      // The browser may block access to session storage.
    }
    const name = user.displayName || user.emailAddress || 'Google Drive';
    const identity = user.emailAddress && user.emailAddress !== name ? name + '（' + user.emailAddress + '）' : name;
    plugin.icon = accountIcon(user, name);
    plugin.label = 'Google Drive（' + identity + '）';
    plugin.children = [
      { label: '登出', icon: resolveIcon('logout'), open: signOut },
      { label: '本機金鑰', icon: resolveIcon('key'), open: changeKeyRetention },
      {
        label: () => window.plugins[window.viewMode]?.guestReview?.label,
        hidden: () => !window.plugins[window.viewMode]?.guestReview || window.plugins[window.viewMode]?.guestReview?.isAvailable?.() === false,
        icon: resolveIcon('compare'),
        showCount: () => plugin.showCount(),
        open: () => void importLegacyData()
      },
      {
        label: '上傳目前模組至 Google Drive',
        icon: resolveIcon('import'),
        hidden: () => !currentBackupCategory(),
        open: () => {
          const category = currentBackupCategory();
          if (category) void syncBackup('upload', category);
        }
      },
      { label: '整站備份至 Google Drive', icon: resolveIcon('cloudOutline'), open: () => void syncBackup('upload') },
      {
        label: '從 Google Drive 下載還原',
        icon: resolveIcon('export'),
        hidden: () => !currentBackupCategory(),
        open: () => {
          const category = currentBackupCategory();
          if (category) void syncBackup('download', category);
        }
      },
      {
        label: () => session?.autoSyncDisabled ? '啟用自動同步' : '暫停自動同步',
        get icon() { return resolveIcon(session?.autoSyncDisabled ? 'play' : 'pause'); },
        disabled: () => pending || syncing,
        open: toggleAutoSync
      }
    ];
    renderToolbar();
    window.dispatchEvent(new Event('site-account-ready'));
    try {
      const message = sessionStorage.getItem('site-google-drive-import-message');
      if (message) {
        sessionStorage.removeItem('site-google-drive-import-message');
        showToast(message);
      }
    } catch {
      // The browser may block access to session storage.
    }
  }

  async function connect(response) {
    const reconnect = reconnectAccount;
    reconnectAccount = undefined;
    let openBackup = false;
    try {
      if (response.error || !response.access_token ||
          !google.accounts.oauth2.hasGrantedAllScopes(response, scope)) {
        showToast('Google Drive 授權未完成。');
        return;
      }
      const token = response.access_token;
      const expiresAt = Date.now() + Number(response.expires_in) * 1000;
      const { user, jwk } = await unlockAccount(token, !reconnect, reconnect?.account.permissionId, false);
      if (!reconnect) {
        try {
          await configureKeyOnSignIn(user, jwk);
        } catch {
          showToast('瀏覽器無法更新本機金鑰儲存，本次仍可使用。');
        }
      }
      clearAuthorization();
      if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
        const authorization = { token, expiresAt, accountId: user.permissionId };
        if (reconnect) {
          session.authorization = authorization;
          openBackup = true;
        }
        try {
          sessionStorage.setItem(authorizationStorageKey, JSON.stringify(authorization));
        } catch {
          showToast('目前分頁無法保存短效授權，重新整理後需再次登入。');
          return;
        }
      } else {
        throw new Error('Google 未提供可用的授權期限。');
      }
      if (!reconnect) location.reload();
    } catch (error) {
      showToast('Google Drive 登入失敗：' + error.message);
    } finally {
      pending = false;
      if (openBackup) {
        if (typeof reconnect.action === 'function') void reconnect.action();
        else void syncBackup(reconnect.action);
      }
    }
  }

  registerPlugin('google-drive', plugin);
})();
