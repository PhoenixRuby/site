registerModal('chat', {

  init() {
    /* --- cross-module dependency: lastSecret from QR scanner --- */
    window.chatLastSecret = window.chatLastSecret || '';
    window.setLastSecret = function (s) { window.chatLastSecret = s; };

    /* ========== CSS ========== */
    const style = document.createElement('style');
    style.textContent = `
/* JSON 表單樣式 */
#chatModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}
#chatModalBg.open{opacity:1;pointer-events:all}
.chat-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;min-width:min(820px, 96vw);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:18px;scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface)}
#chatModalBg.open .chat-modal{transform:translateY(0) scale(1)}
.json-form{display:grid;gap:12px}
.form-group{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--border);border-radius:4px;background-color:var(--surface)}
.json-key{font-family:'Courier New', monospace;font-weight:bold;color:var(--accent);min-width:100px;text-align:right;font-size:0.9em}
.json-colon{font-family:'Courier New', monospace;font-weight:bold;color:var(--accent2)}
.form-input{flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:4px;font-family:'Courier New', monospace;font-size:0.9em;transition:border-color 0.2s;background:var(--bg);color:var(--text)}
input:hover, select:hover, textarea:hover{outline:none;box-shadow:0 0 5px var(--accent);border:1px solid var(--accent)}
.form-input.error{border-color:var(--danger);background-color:rgba(229,57,53,.1)}
.validation-message{font-size:11px;color:var(--danger);margin-left:5px;flex-shrink:0}
.device-select{appearance:none;background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");background-position:right 8px center;background-repeat:no-repeat;background-size:12px;padding-right:30px;width:100%}
.json-preview{background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:10px;font-family:'Courier New', monospace;font-size:0.85em;white-space:pre-wrap;max-height:150px;overflow-y:auto}
.toggle-mode{background:var(--accent);color:white;border:none;padding:8px 15px;border-radius:4px;cursor:pointer;font-size:0.9em;margin-bottom:10px}
.toggle-mode:hover{opacity:.85}
.chat-modal button{background-color:var(--success);color:#fff;border:none;padding:5px 10px;margin-right:10px;cursor:pointer;border-radius:5px}
.clear-button{background-color:var(--danger)}
.open-button{background-color:#ff9800}
.valid-text{color:var(--success);font-weight:700}
.extra-text{color:var(--muted)}
.missing-text{color:var(--danger);font-weight:700}
.information-text{color:var(--accent)}
#nonce-display{font-family:monospace;font-size:1.2em;margin-top:5px;display:flex}
.char-box{width:20px;height:25px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);margin:2px;font-weight:700;font-size:1.2em}
.valid-char{background:#d8ffd8;color:green;border-color:green}
.extra-char{background:var(--surface2);color:var(--muted);border-color:var(--muted)}
.missing-char{background:#ffd8d8;color:red;border-color:red}
.information-char{background:#c5f8ff;color:#00bcd4;border-color:#00bcd4}
#nonce-hint{font-size:.9em;margin-top:3px;color:var(--muted)}
#nonce-display span{padding:0;font-weight:100;text-align:center}
label[for="ciphertext"]{font-size:12px;color:var(--text)}
textarea{max-width:350px}
#result, #urlparam{background-color:var(--bg);border:1px solid var(--border);padding:10px;margin-top:10px;word-wrap:break-word;max-width:350px;font-size:12px}
.json-form-container, .json-form-container *{box-sizing:border-box}
.json-form-container_old{scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface);position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);z-index:9999;background:var(--surface);color:var(--text-dim);padding:20px;width:95vw;max-width:900px;max-height:90vh;overflow-y:auto;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.8)}
.section{display:flex;flex-wrap:wrap;margin:0;padding:10px 0}
.left-section{flex:1;min-width:300px;padding-right:20px;box-sizing:border-box}
.right-section{flex:1;min-width:300px;padding-left:20px;box-sizing:border-box;border-left:1px solid var(--border)}
@media (max-width:999px){.section{flex-direction:column}.left-section,.right-section{width:100%;padding:0;border-left:none;border-bottom:1px solid var(--border);padding-bottom:20px}}
.radio-group{display:flex;flex-wrap:wrap;gap:10px;margin-top:5px}
.radio-item{display:flex;align-items:center;cursor:pointer;background:var(--surface3);padding:4px 10px;border-radius:4px;font-size:14px;color:var(--text-dim)}
.radio-item input[type="radio"]{display:none}
.radio-item:has(input:checked){background:#ff8400;color:#fff}
`;
    document.head.appendChild(style);

    /* ========== HTML ========== */
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
<div id="chatModalBg">
    <div class="chat-modal">
      <h2>
        \u{1F4F1} 裝置資訊設定
        <button class="close-btn" id="chatCloseBtn">✕</button>
      </h2>
<div id="jsonFormMode" class="json-form-container">

  <div class="section">
    <div class="left-section">
        <div class="json-form">

            <div class="form-group">
                <span class="json-key">Base URL</span>
                <span class="json-colon">:</span>
                <div class="radio-group" id="baseurl-container"></div>
                <button type="button" id="chatEditUrls" title="編輯網址選項">編輯網址</button>
            </div>

            <div class="form-group">
                <span class="json-key">廠商代碼</span>
                <span class="json-colon">:</span>
                <input type="text" id="clientid" placeholder="Client ID" value="TEST"
                       class="form-input" >
            </div>


            <div class="form-group">
                <span class="json-key">"gid"</span>
                <span class="json-colon">:</span>
                <input type="text"
                       class="form-input"
                       id="gid"
                       value="GID71171171171171"
                       pattern="^GID[0-9]{14}$"
                       title="格式: GID + 14位數字">
                <span class="validation-message" id="gid-error"></span>
            </div>

            <div class="form-group">
                <span class="json-key">"version"</span>
                <span class="json-colon">:</span>
                <input type="text"
                       class="form-input"
                       id="version"
                       value="5.64.0(0)"
                       pattern="^[\\d]+\\.[\\d]+\\.[\\d]+\\([\\d]+\\)$"
                       title="格式: x.xx.x(x)">
                <span class="validation-message" id="version-error"></span>
            </div>

            <div class="form-group">
                <span class="json-key">"deviceType"</span>
                <span class="json-colon">:</span>
                <select class="form-input device-select" id="deviceType">
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                    <option value="Web">Web</option>
                </select>
            </div>

            <div class="form-group">
                <span class="json-key">"os_version"</span>
                <span class="json-colon">:</span>
                <input type="text"
                       class="form-input"
                       id="os_version"
                       value="18.1.1"
                       pattern="^[\\d]+\\.[\\d]+\\.[\\d]+$"
                       title="格式: x.x.x">
                <span class="validation-message" id="os_version-error"></span>
            </div>

            <div class="form-group">
              <span class="json-key">"timestamp"</span>
              <span class="json-colon">:</span>
              <input
                id="timestamp"
                class="form-input"
                type="text"
                placeholder="yyyyMMddHHmmss（例如 20250813091530）"
                inputmode="numeric"
                autocomplete="off"
                minlength="14"
                maxlength="14"
                pattern="\\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])([01]\\d|2[0-3])([0-5]\\d)([0-5]\\d)"
                title="請輸入 14 位 yyyyMMddHHmmss（年4位、月01–12、日01–31、時00–23、分秒00–59）">
              <label for="chatAutoTimestamp" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px;color:var(--text);cursor:pointer" title="勾選後，每次按加密都更新為當下時間">
                <input type="checkbox" id="chatAutoTimestamp" style="width:15px;height:15px;flex:none;accent-color:var(--accent)">
                自動時間
              </label>
              <span class="validation-message" id="timestamp-error"></span>
            </div>
            <div class="json-preview" id="jsonPreview"></div>
        </div>
    </div>
    <div class="right-section">
        <div class="json-form">


            <div class="form-group">
              <span class="json-key">密鑰 (32 字節)</span>
              <span class="json-colon">:</span>
              <input id="key" placeholder="輸入密鑰" value="12345678901234567890123456789012"
                class="form-input"
                type="text"
                autocomplete="off"
                minlength="32"
                maxlength="32">
            </div>
            <div class="form-group">
              <span class="json-key">nonce (12 字節)</span>
              <span class="json-colon">:</span>
              <input id="nonce" placeholder="留空將自動生成" value=""
                class="form-input"
                type="text"
                autocomplete="off"
                minlength="12"
                maxlength="12">
            </div>

            <div id="nonce-display">
                    <span id="valid-nonce"></span><span id="extra-nonce"></span>
                </div>
                <p id="nonce-hint"><span class="valid-text">前 12 字節是有效的。</span> <span class="extra-text">超出部分不會被使用。</span></p>
                <label for="ciphertext">密文:[ IV (12 bytes) ] [ 加密後的密文 bytes ] [ 可選的驗證標籤 bytes ]</label>
                <textarea id="ciphertext" class="form-input"></textarea>
          </div>
          <br/>
        <button onclick="encrypt()">加密</button>
        <button onclick="decrypt()">解密</button>
        <button onclick="clearGID()" class="clear-button">清除 GID</button>
        <button onclick="encrypt_open()" class="open-button">另開視窗</button>

        <div id="result"></div>
        <div id="urlparam"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button type="button" id="chatEditBtn">編輯資料</button>
          <button type="button" id="chatSaveBtn" style="display:none">儲存資料</button>
          <button type="button" id="chatCancelBtn" style="display:none">取消編輯</button>
        </div>
        <small id="chatEditHint" style="color:var(--muted)">設定由已儲存資料呈現；加密金鑰與 nonce 不會寫入瀏覽器儲存空間。</small>
    </div>
  </div>

</div>

    </div>
</div>
`;
    document.body.appendChild(wrapper.firstElementChild);

    /* ========== Environment profiles: URL + Client ID + Key ========== */
    const CHAT_CONFIG_KEY = 'chat_environment_profiles_v1';
    const CHAT_DEVICE_KEY = 'chat_device_config_v1';
    const defaultProfiles = [
      { id: 'local', label: 'localhost', url: 'https://localhost:44309/Login/AppLogin', clientid: 'TEST', key: '' },
      { id: 'lan', label: '192.168.137.1', url: 'https://192.168.137.1/Login/AppLogin', clientid: 'TEST', key: '' }
    ];
    function loadProfiles() {
      try {
        const saved = JSON.parse(localStorage.getItem(CHAT_CONFIG_KEY));
        if (saved && Array.isArray(saved.profiles)) return saved;
      } catch (e) { console.warn('環境設定讀取失敗', e); }
      // Migrate URL list from previous editable version, if available.
      try {
        const old = JSON.parse(localStorage.getItem(CHAT_DEVICE_KEY));
        if (old && Array.isArray(old.urls) && old.urls.length) {
          const profiles = old.urls.map((x, i) => ({
            id: 'migrated_' + i, label: x.label, url: x.url,
            clientid: old.clientid || 'TEST', key: ''
          }));
          return { profiles, selectedId: profiles.find(x => x.url === old.selectedUrl)?.id || profiles[0].id };
        }
      } catch (e) { console.warn('舊設定轉換失敗', e); }
      return { profiles: defaultProfiles.map(x => ({...x})), selectedId: 'local' };
    }
    let environmentData = loadProfiles();
    let pendingEnvironment = null;
    let chatEditing = false;
    const chatFields = ['gid', 'version', 'deviceType', 'os_version'];
    const editBtn = document.getElementById('chatEditBtn');
    const saveConfigBtn = document.getElementById('chatSaveBtn');
    const cancelConfigBtn = document.getElementById('chatCancelBtn');
    const editUrlsBtn = document.getElementById('chatEditUrls');
    editUrlsBtn.textContent = '管理環境設定';
    document.getElementById('chatEditHint').textContent = '環境設定（網址、廠商代碼、金鑰）僅儲存於此瀏覽器的 localStorage；請勿在共用電腦儲存正式金鑰。';
    document.getElementById('clientid').readOnly = true;
    document.getElementById('key').readOnly = true;
    const environmentEditor = document.createElement('div');
    environmentEditor.id = 'chatEnvironmentEditor';
    environmentEditor.style.cssText = 'display:none;border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:10px';
    environmentEditor.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">
        <strong>環境設定管理</strong><button type="button" id="chatAddProfile">+ 新增設定</button>
      </div>
      <div id="chatProfileRows"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" id="chatSaveProfiles">儲存環境設定</button>
        <button type="button" id="chatCancelProfiles">取消</button>
      </div>`;
    document.getElementById('baseurl-container').closest('.form-group').after(environmentEditor);
    function selectedProfile() {
      return environmentData.profiles.find(p => p.id === environmentData.selectedId) || null;
    }
    function applyProfile() {
      const p = selectedProfile();
      document.getElementById('clientid').value = p?.clientid || '';
      document.getElementById('key').value = p?.key || '';
    }
    function renderBaseUrls() {
      const holder = document.getElementById('baseurl-container');
      holder.replaceChildren();
      environmentData.profiles.forEach(p => {
        const label = document.createElement('label'); label.className = 'radio-item';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'baseurl'; input.value = p.id;
        input.checked = p.id === environmentData.selectedId;
        input.addEventListener('change', () => {
          environmentData.selectedId = p.id;
          applyProfile();
          try { localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(environmentData)); }
          catch (e) { alert('無法儲存環境選擇：' + e.message); }
        });
        const name = document.createElement('span'); name.textContent = p.label;
        label.append(input, name); holder.appendChild(label);
      });
      applyProfile();
    }
    function saveDeviceConfig() {
      const data = Object.fromEntries(chatFields.map(id => [id, document.getElementById(id).value]));
      localStorage.setItem(CHAT_DEVICE_KEY, JSON.stringify(data));
    }
    function applyChatConfig() {
      try {
        const config = JSON.parse(localStorage.getItem(CHAT_DEVICE_KEY)) || {};
        chatFields.forEach(id => { if (typeof config[id] === 'string') document.getElementById(id).value = config[id]; });
      } catch (e) { console.warn('裝置資料讀取失敗', e); }
      renderBaseUrls();
      if (typeof updatePreview === 'function') updatePreview();
    }
    function setChatEditing(editing) {
      chatEditing = editing;
      chatFields.forEach(id => { document.getElementById(id).disabled = !editing; });
      editBtn.style.display = editing ? 'none' : '';
      saveConfigBtn.style.display = editing ? '' : 'none';
      cancelConfigBtn.style.display = editing ? '' : 'none';
      editUrlsBtn.style.display = '';
    }
    editBtn.addEventListener('click', () => setChatEditing(true));
    cancelConfigBtn.addEventListener('click', () => { applyChatConfig(); setChatEditing(false); });
    saveConfigBtn.addEventListener('click', () => {
      if (!validateAll()) { alert('請先修正欄位格式'); return; }
      try { saveDeviceConfig(); setChatEditing(false); updatePreview(); }
      catch (e) { alert('儲存失敗：' + e.message); }
    });
    function renderProfileEditor() {
      const holder = document.getElementById('chatProfileRows'); holder.replaceChildren();
      pendingEnvironment.profiles.forEach((p, index) => {
        const row = document.createElement('div');
        row.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:10px;margin:8px 0;display:grid;gap:7px';
        [['label','設定名稱'], ['url','Base URL'], ['clientid','廠商代碼'], ['key','金鑰']].forEach(([field, title]) => {
          const wrap = document.createElement('label');
          wrap.style.cssText = 'display:grid;gap:3px;font-size:12px;color:var(--text-dim)';
          wrap.textContent = title;
          const input = document.createElement('input');
          input.type = 'text'; input.value = p[field] || '';
          input.style.cssText = 'width:100%;box-sizing:border-box;padding:7px;border:1px solid var(--border);border-radius:5px;background:var(--bg);color:var(--text)';
          input.addEventListener('input', () => { p[field] = input.value; });
          wrap.appendChild(input); row.appendChild(wrap);
        });
        const remove = document.createElement('button'); remove.type = 'button';
        remove.textContent = '刪除此設定';
        remove.addEventListener('click', () => {
          if (!confirm('確定刪除「' + p.label + '」？')) return;
          pendingEnvironment.profiles.splice(index, 1);
          if (pendingEnvironment.selectedId === p.id) pendingEnvironment.selectedId = pendingEnvironment.profiles[0]?.id || '';
          renderProfileEditor();
        });
        row.appendChild(remove); holder.appendChild(row);
      });
    }
    editUrlsBtn.addEventListener('click', () => {
      pendingEnvironment = JSON.parse(JSON.stringify(environmentData));
      environmentEditor.style.display = 'block'; renderProfileEditor();
    });
    document.getElementById('chatAddProfile').addEventListener('click', () => {
      pendingEnvironment.profiles.push({ id: 'profile_' + crypto.randomUUID(), label: '', url: '', clientid: '', key: '' });
      renderProfileEditor();
    });
    document.getElementById('chatCancelProfiles').addEventListener('click', () => {
      pendingEnvironment = null; environmentEditor.style.display = 'none';
    });
    document.getElementById('chatSaveProfiles').addEventListener('click', () => {
      const profiles = pendingEnvironment.profiles;
      if (!profiles.length || profiles.some(p => !p.label.trim() || !/^https?:\/\/\S+$/i.test(p.url) || !p.clientid.trim() || !p.key)) {
        alert('至少保留一組設定，且名稱、http(s) URL、廠商代碼、金鑰均不得空白。'); return;
      }
      if (new Set(profiles.map(p => p.label.trim())).size !== profiles.length) {
        alert('設定名稱不可重複'); return;
      }
      if (!profiles.some(p => p.id === pendingEnvironment.selectedId)) pendingEnvironment.selectedId = profiles[0].id;
      try {
        localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(pendingEnvironment));
        environmentData = pendingEnvironment; pendingEnvironment = null;
        environmentEditor.style.display = 'none'; renderBaseUrls();
        if (typeof showToast === 'function') showToast('環境設定已儲存');
      } catch (e) { alert('儲存失敗：' + e.message); }
    });

    /* ========== JS Logic ========== */

    // 全局變數控制輸入模式
    let isFormMode = true;

    // 嚴格格式（YYYYMMDDhhmmss）
    const ts14Regex = /^(?<y>\d{4})(?<M>0[1-9]|1[0-2])(?<d>0[1-9]|[12]\d|3[01])(?<H>[01]\d|2[0-3])(?<m>[0-5]\d)(?<s>[0-5]\d)$/;
    // 驗證規則
    const validators = {
      gid:      { pattern: /^GID\d{14}$/i,            message: "格式錯誤：必須是 GID + 14 位數字" },
      version:  { pattern: /^\d+\.\d+\.\d+\(\d+\)$/,  message: "格式錯誤：必須是 x.y.z(編號) 格式" },
      os_version:{pattern:/^\d+(?:\.\d+){1,2}$/,      message: "格式錯誤：必須是 x.y 或 x.y.z 格式" },
      timestamp:{
        pattern: ts14Regex,
        message: "格式錯誤：必須是 yyyyMMddHHmmss（例如 20250813091530）"
      }
    };

    // 進一步檢核「日期是否真實存在」
    function isValidTimestamp14(s) {
      const m = ts14Regex.exec(String(s ?? '').trim());
      if (!m) return false;
      const y  = +m.groups.y,
            M  = +m.groups.M,
            d  = +m.groups.d,
            H  = +m.groups.H,
            mi = +m.groups.m,
            se = +m.groups.s;

      // 用 UTC 建立，避免時區溢位干擾，再逐一比對
      const dt = new Date(Date.UTC(y, M - 1, d, H, mi, se));
      return dt.getUTCFullYear() === y &&
             dt.getUTCMonth()    === M - 1 &&
             dt.getUTCDate()     === d &&
             dt.getUTCHours()    === H &&
             dt.getUTCMinutes()  === mi &&
             dt.getUTCSeconds()  === se;
    }

    // 可選：轉成 Unix 毫秒（若需要）
    function parseTimestamp14ToMs(s) {
      if (!isValidTimestamp14(s)) return null;
      const { y, M, d, H, m, s: S } = ts14Regex.exec(s).groups;
      return Date.UTC(+y, +M - 1, +d, +H, +m, +S); // milliseconds since epoch (UTC)
    }

    const tsInput = document.getElementById('timestamp');
    const tsErr = document.getElementById('timestamp-error');

    tsInput.addEventListener('input', () => {
      // 只允許數字
      tsInput.value = tsInput.value.replace(/\D+/g, '').slice(0,14);
      tsInput.setCustomValidity(''); tsErr.textContent = '';
    });

    tsInput.addEventListener('blur', () => {
      const ok = isValidTimestamp14(tsInput.value);
      if (!ok) {
        const msg = '請輸入有效的 yyyyMMddHHmmss（例如 20250813091530）';
        tsInput.setCustomValidity(msg);
        tsErr.textContent = msg;
      } else {
        tsInput.setCustomValidity('');
        tsErr.textContent = '';
      }
    });

    // Utility function to convert string to ArrayBuffer
    function str2ab(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }

    // 切換輸入模式
    function toggleInputMode() {
      isFormMode = !isFormMode;
      const formMode = document.getElementById('jsonFormMode');
      const textMode = document.getElementById('plaintext');
      const toggleBtn = document.querySelector('.toggle-mode');

      if (isFormMode) {
        formMode.style.display = 'block';
        textMode.style.display = 'none';
        toggleBtn.textContent = '切換到原始文字模式';

        // ★ 嘗試解析文字模式內容並回填（解析不了就略過）
        try {
          const obj = JSON.parse(textMode.value);
          if (obj && typeof obj === 'object') fillFormFromJson(obj);
        } catch { /* 不可解析就不塞回 */ }

        // 更新預覽
        updatePreview();

      } else {
        formMode.style.display = 'none';
        textMode.style.display = 'block';
        toggleBtn.textContent = '切換到表單模式';
        // 同步表單數據到文字框
        textMode.value = getCurrentPlaintext();
      }
    }

    function fillFormFromJson(obj) {
      if (typeof obj.gid === 'string') document.getElementById('gid').value = obj.gid;
      if (typeof obj.version === 'string') document.getElementById('version').value = obj.version;
      if (typeof obj.os_version === 'string') document.getElementById('os_version').value = obj.os_version;

      if (typeof obj.deviceType === 'string') {
        const sel = document.getElementById('deviceType');
        const hasOption = Array.from(sel.options).some(o => o.value === obj.deviceType);
        if (hasOption) sel.value = obj.deviceType; // 只在有此選項時才回填
      }

      if (typeof obj.timestamp === 'number' || typeof obj.timestamp === 'string') {
        document.getElementById('timestamp').value = String(obj.timestamp);
      }
    }

    // 獲取當前明文
    function getCurrentPlaintext() {
      if (isFormMode) {
        if (!validateAll()) {
          return null; // 驗證失敗返回 null
        }
        const tsRaw = document.getElementById('timestamp').value.trim();
        const timestamp = /^\d+$/.test(tsRaw) ? Number(tsRaw) : tsRaw;

        return JSON.stringify({
          gid: document.getElementById('gid').value,
          version: document.getElementById('version').value,
          deviceType: document.getElementById('deviceType').value,
          os_version: document.getElementById('os_version').value,
          timestamp
        });
      } else {
        const raw = document.getElementById('plaintext').value.trim();
        try {
          return JSON.stringify(JSON.parse(raw)); // 單行、無多餘空白
        } catch {
          return raw
            .replace(/\r?\n/g, '')   // 移除換行
            .replace(/\t/g, '')      // 移除 tab
            .replace(/\s{2,}/g, ' ') // 多個空白壓成一個
            .trim();
        }
      }
    }

    // 更新 JSON 預覽
    function updatePreview() {
      if (!isFormMode) return;

      const gid = document.getElementById('gid').value;
      const version = document.getElementById('version').value;
      const deviceType = document.getElementById('deviceType').value;
      const os_version = document.getElementById('os_version').value;
      const tsRaw = document.getElementById('timestamp').value.trim();
      const timestamp = /^\d+$/.test(tsRaw) ? Number(tsRaw) : tsRaw;

      const jsonObj = { gid, version, deviceType, os_version, timestamp };
      const jsonString = JSON.stringify(jsonObj, null, 2);
      document.getElementById('jsonPreview').textContent = jsonString;
    }

    // 驗證單一欄位
    function validateField(fieldId) {
      const field = document.getElementById(fieldId);
      const errorElement = document.getElementById(fieldId + '-error');
      const validator = validators[fieldId];

      if (validator && !validator.pattern.test(field.value)) {
        field.classList.add('error');
        errorElement.textContent = validator.message;
        return false;
      } else {
        field.classList.remove('error');
        errorElement.textContent = '';
        return true;
      }
    }

    // 驗證所有欄位
    function validateAll() {
      if (!isFormMode) return true; // 文字模式不驗證

      let isValid = true;
      Object.keys(validators).forEach(fieldId => {
        if (!validateField(fieldId)) {
          isValid = false;
        }
      });
      return isValid;
    }

    // Adjust key length similar to C# implementation
    function adjustKey(key) {
      // Convert to UTF-8 bytes
      const encoder = new TextEncoder();
      let keyBytes = encoder.encode(key);

      // Truncate or pad to 16-32 bytes
      const minLength = 16;
      const maxLength = 32;
      const targetLength = Math.min(maxLength, Math.max(keyBytes.length, minLength));

      // Create a new array of the target length
      const adjustedKey = new Uint8Array(targetLength);

      // Copy existing key bytes
      adjustedKey.set(keyBytes.slice(0, targetLength));

      // If key is shorter, it's already padded with zeros
      return adjustedKey;
    }

    // 清除 GID 函數
    function clearGID() {
      localStorage.removeItem('deviceGID');
      const gidEl = document.getElementById('gid');
      gidEl.value = '';
      chatConfig.gid = '';
      localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(chatConfig));
      if (isFormMode) {
        updatePreview();
      }
      alert('GID 已清除，下次將重新生成。');
    }

    // 實作 generateDeviceGID：基於裝置特徵生成唯一 GID
    // 收集裝置資訊：userAgent、螢幕尺寸、時區，hash 後取 14 位數字
    // 實作 generateDeviceGID：基於裝置特徵生成唯一 GID，並使用 localStorage 記住
    // 收集裝置資訊：userAgent、螢幕尺寸、時區，hash 後取 14 位數字
    async function generateDeviceGID() {
      const storedGID = localStorage.getItem('deviceGID');
      if (!localStorage.getItem(CHAT_DEVICE_KEY) && storedGID && /^GID\d{14}$/.test(storedGID)) {
        return storedGID; // 如果有儲存的且格式正確，直接返回
      }

      try {
        // 收集裝置特徵字符串
        const userAgent = navigator.userAgent || '';
        const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const deviceSeed = `${userAgent}${screenInfo}${timezone}${Date.now()}`; // 加 timestamp 增加唯一性

        // 轉成 Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(deviceSeed);

        // 使用 SHA-256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);

        // 從 hash 前 7 bytes 轉成 14 位十進制數字（每個 byte 0-255，組合後 mod 10^14）
        let num = 0n;
        for (let i = 0; i < 7; i++) {
          num = (num * 256n) + BigInt(hashArray[i]);
        }
        const fourteenDigits = (num % (10n ** 14n)).toString().padStart(14, '0');

        const newGID = `GID${fourteenDigits}`;
        localStorage.setItem('deviceGID', newGID); // 儲存到 localStorage
        return newGID;
      } catch (error) {
        // 後備：生成隨機 14 位數字
        console.warn('generateDeviceGID 失敗，使用隨機生成：', error);
        const randomNum = Math.floor(Math.random() * 1e14).toString().padStart(14, '0');
        const randomGID = `GID${randomNum}`;
        localStorage.setItem('deviceGID', randomGID);
        return randomGID;
      }
    }

    async function encrypt_open() {
      try {
        // 自動刷新 GID (確保使用此裝置專屬的 GID)
        const gidEl = document.getElementById('gid');
        const deviceGID = await generateDeviceGID();
        if (!localStorage.getItem(CHAT_CONFIG_KEY)) gidEl.value = deviceGID;

        alert(`生成的裝置專屬 GID: ${deviceGID}\n\n將使用此 GID 進行加密，並開啟新視窗。`);

        // 自動刷新 timestamp 為當前時間
        const tsEl = document.getElementById('timestamp');
        tsEl.value = nowTimestamp14();

        // 更新預覽
        if (isFormMode) {
          updatePreview();
        }

        // 執行加密
        await encrypt();

        // 獲取生成的 URL
        const urlparam = document.getElementById('urlparam');
        const url = urlparam.textContent.trim();

        if (url) {
          // 在新視窗中開啟 URL
          window.open(url, '_blank');
        } else {
          alert('URL 生成失敗,請檢查加密是否成功');
        }
      } catch (error) {
        alert(`執行錯誤: ${error.message}`);
      }
    }

    function getBaseUrl() {
      const selected = document.querySelector('input[name="baseurl"]:checked');
      return selectedProfile()?.url || "";
    }

    async function encrypt() {
      try {
        // 只有勾選時，一般「加密」才自動更新時間戳；「另開視窗」仍維持原本的自動更新行為。
        if (document.getElementById('chatAutoTimestamp')?.checked) {
          document.getElementById('timestamp').value = nowTimestamp14();
          updatePreview();
        }
        // 獲取明文
        const plainText = getCurrentPlaintext();
        if (plainText === null) {
          alert('請先修正所有格式錯誤！');
          return;
        }

        const urlparam = document.getElementById('urlparam');
        const clientid = document.getElementById('clientid').value;
        const baseurl = getBaseUrl();

        const result = document.getElementById('result');
        const ciphertext = document.getElementById('ciphertext');
        let key = document.getElementById('key').value;
        const nonceInput = document.getElementById('nonce').value;

        // Adjust key length
        const adjustedKey = adjustKey(key);
        // Prepare nonce
        let nonce;
        if (nonceInput) {
          const encoder = new TextEncoder();
          nonce = encoder.encode(nonceInput).slice(0, 12);
        } else {
          // Generate random nonce
          nonce = crypto.getRandomValues(new Uint8Array(12));
        }
        // Convert plain text to ArrayBuffer
        const encoder = new TextEncoder();
        const data = encoder.encode(plainText);

        // Perform encryption
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          adjustedKey,
          { name: 'AES-GCM', length: adjustedKey.length * 8 },
          false,
          ['encrypt']
        );
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: nonce },
          cryptoKey,
          data
        );
        // Combine nonce and encrypted data
        const combinedArray = new Uint8Array(nonce.length + encrypted.byteLength);
        combinedArray.set(nonce);
        combinedArray.set(new Uint8Array(encrypted), nonce.length);
        // 可選的驗證標籤
        const tag = encrypted.byteLength > 16 ? encrypted.slice(-16) : null;
        // 將 IV + 密文 + 驗證標籤展示給用戶
        const ivHex = Array.from(nonce).map(byte => byte.toString(16).padStart(2, '0')).join('');
        const encryptedHex = Array.from(new Uint8Array(encrypted)).map(byte => byte.toString(16).padStart(2, '0')).join('');
        const tagHex = tag ? Array.from(new Uint8Array(tag)).map(byte => byte.toString(16).padStart(2, '0')).join('') : '';

        // Convert to base64
        const base64Encrypted = btoa(String.fromCharCode.apply(null, combinedArray));

        document.getElementById('ciphertext').value = base64Encrypted;
        result.innerHTML = `加密結果: ${base64Encrypted}`;

        urlparam.textContent = baseurl + '?clientid=' + encodeURIComponent(clientid) + '&v=' + encodeURIComponent(base64Encrypted);
      } catch (error) {
        result.innerHTML = `加密錯誤: ${error.message}`;
      }
    }

    async function decrypt() {
      try {
        const result = document.getElementById('result');
        const cipherText = document.getElementById('ciphertext').value;
        let key = document.getElementById('key').value;
        document.getElementById('step-2-1-description').textContent = cipherText;
        // Adjust key length
        const adjustedKey = adjustKey(key);
        // Decode base64
        const combinedArray = new Uint8Array(atob(cipherText).split('').map(char => char.charCodeAt(0)));
        // Extract nonce (first 12 bytes)
        const nonce = combinedArray.slice(0, 12);
        const encryptedData = combinedArray.slice(12);

        // 提取驗證標籤 (最後 16 字節)
        const authTag = combinedArray.slice(combinedArray.length - 16);

        const ivHex = Array.from(nonce).map(byte => byte.toString(16).padStart(2, '0')).join('');
        document.getElementById('step-2-2-description').textContent = ivHex;
        // 顯示驗證標籤
        const authTagHex = Array.from(authTag).map(byte => byte.toString(16).padStart(2, '0')).join('');
        document.getElementById('step-2-3-description').textContent = authTagHex;

        // 顯示加密資料
        const encryptedDataHex = Array.from(encryptedData).map(byte => byte.toString(16).padStart(2, '0')).join('');
        document.getElementById('step-2-4-description').textContent = encryptedDataHex;

        // Perform decryption
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          adjustedKey,
          { name: 'AES-GCM', length: adjustedKey.length * 8 },
          false,
          ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: nonce },
          cryptoKey,
          encryptedData
        );
        // Convert decrypted data to string
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decrypted);

        document.getElementById('step-2-5-description').textContent = decryptedText;

        result.innerHTML = `解密結果: ${decryptedText}`;
      } catch (error) {
        result.innerHTML = `解密錯誤: ${error.message}`;
      }
    }

    function updateNonceDisplay() {
      const input = document.getElementById('nonce').value;
      const validPart = input.slice(0, 12);  // 取前 12 字元（有效部分）
      const extraPart = input.slice(12);     // 取超過的部分（無效）
      const missingCount = 12 - validPart.length; // 計算不足的字元數
      const validNonce = document.getElementById('valid-nonce');
      const extraNonce = document.getElementById('extra-nonce');
      // 清空舊的內容
      validNonce.innerHTML = '';
      extraNonce.innerHTML = '';
      // 顯示有效部分
      validPart.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('char-box', 'valid-char');
        validNonce.appendChild(span);
      });
      // 顯示不足部分（紅色框）
      for (let i = 0; i < missingCount; i++) {
        const span = document.createElement('span');
        span.textContent = '_';  // 用下劃線表示缺失字元
        if (missingCount == 12) {
          span.classList.add('char-box', 'information-char');
        } else {
          span.classList.add('char-box', 'missing-char');
        }
        validNonce.appendChild(span);
      }
      // 顯示超出部分（灰色框）
      extraPart.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('char-box', 'extra-char');
        extraNonce.appendChild(span);
      });
      // 更新提示訊息
      const hint = document.getElementById('nonce-hint');
      if (missingCount == 12 ) {
        hint.innerHTML = `<span class="information-text">將採隨機自動生成進行填充</span>`;
      } else if (missingCount > 0) {
        hint.innerHTML = `<span class="missing-text">還差 ${missingCount} 個字節，請補足！</span>`;
      } else if (extraPart.length > 0) {
        hint.innerHTML = `<span class="valid-text">前 12 字節是有效的。</span> <span class="extra-text">超出部分 (${extraPart}) 不會被使用。</span>`;
      } else {
        hint.innerHTML = `<span class="valid-text">前 12 字節是有效的。</span> <span class="extra-text">沒有超出的部分。</span>`;
      }
    }

    // 初始化顯示
    updateNonceDisplay();

    // 監聽 input 變化
    document.getElementById('nonce').addEventListener('input', updateNonceDisplay);

    document.getElementById('gid').addEventListener('input', updatePreview);
    document.getElementById('version').addEventListener('input', updatePreview);
    document.getElementById('deviceType').addEventListener('input', updatePreview);
    document.getElementById('os_version').addEventListener('input', updatePreview);
    document.getElementById('timestamp').addEventListener('input', updatePreview);

    function nowTimestamp14(tz = 'Asia/Taipei') {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit',
          hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
        }).formatToParts(new Date()).map(p => [p.type, p.value])
      );
      return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
    }

    // 記住使用者的勾選狀態（僅儲存在本機瀏覽器）
    const autoTsCheckbox = document.getElementById('chatAutoTimestamp');
    if (autoTsCheckbox) {
      autoTsCheckbox.checked = localStorage.getItem('chat_auto_timestamp') === 'true';
      autoTsCheckbox.addEventListener('change', () => {
        localStorage.setItem('chat_auto_timestamp', String(autoTsCheckbox.checked));
      });
    }

    // 初始化 timestamp 和 GID
    const tsEl = document.getElementById('timestamp');
    if (tsEl && !tsEl.value) {
      tsEl.value = nowTimestamp14();
    }
    // 載入儲存的 GID 並覆蓋預設值
    const storedGID = localStorage.getItem('deviceGID');
    if (!localStorage.getItem(CHAT_DEVICE_KEY) && storedGID && /^GID\d{14}$/.test(storedGID)) {
      document.getElementById('gid').value = storedGID;
    }
    applyChatConfig();
    setChatEditing(false);
    updatePreview();

    // 讓 #urlparam 一點就複製內容
    (function enableUrlParamCopy() {
      const el = document.getElementById('urlparam');
      if (!el) return;

      el.style.cursor = 'pointer';
      el.title = '點擊複製';

      el.addEventListener('click', async () => {
        const text = el.textContent.trim();
        if (!text) return;

        const showToast = (msg, ms = 1200) => {
          const old = el.textContent;
          el.textContent = msg;
          setTimeout(() => { el.textContent = old; }, ms);
        };

        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            // 後援：建立暫時 textarea 來複製
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          showToast('✅ 已複製！');
        } catch (e) {
          showToast('❌ 複製失敗');
          console.error('Copy failed:', e);
        }
      });
    })();

    // Expose functions globally so onclick handlers in HTML work
    window.encrypt = encrypt;
    window.decrypt = decrypt;
    window.clearGID = clearGID;
    window.encrypt_open = encrypt_open;
    window.toggleInputMode = toggleInputMode;
  },

  createTrigger(value, createSvgIcon) {
    const chatModalBg = document.getElementById('chatModalBg');

    // Setup close/backdrop listeners (once)
    if (!this._initialized) {
      this._initialized = true;
      const chatCloseBtn = document.getElementById('chatCloseBtn');
      chatCloseBtn.addEventListener('click', () => chatModalBg.classList.remove('open'));
      chatModalBg.addEventListener('click', e => {
        if (e.target === chatModalBg) chatModalBg.classList.remove('open');
      });
    }

    const a = document.createElement('a');
    a.href = '#';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      chatModalBg.classList.add('open');
    });

    const svg = createSvgIcon('chat', value, CARD_ICONS.chat);
    a.appendChild(svg);
    return a;
  }
});
