const AccountStorage = (() => {
  const prefix = 'site-account-vault-v1:';
  const lockedFlag = 'site-account-storage-enabled';
  const guestPrefix = 'site-guest:';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const legacyKeys = new Set([
    'site_data', 'card_order', 'card_show_preview', 'card_preview_open', 'bookmarkData',
    'bookmarkTheme', 'bookmarkTabPos', 'bookmarkTabOverflow', 'bookmark_recent_notes',
    'imgStampData', 'qrCodeData', 'requestCollector_ps', 'requestCollector_bash',
    'chat_full_profiles_v1', 'chat_environment_profiles_v1', 'chat_device_config_v1',
    'chat_auto_timestamp', 'wsl_runbook_v2', 'wsl_profiles_v1', 'cicd_profiles_v1',
    'site-viewer-location', 'site-viewer-sidebar-width', 'site-viewer-search-height',
    'site-viewer-search-history', 'site-viewer-thumbnail-settings', 'site-viewer-auto-open',
    'site-viewer-explorer-size', 'viewer-image-checkerboard'
  ]);
  const comparisonSettings = new Map([
    ['card_show_preview', ['卡片', '顯示卡片預覽']],
    ['card_preview_open', ['卡片', '預設展開卡片預覽']],
    ['bookmarkTheme', ['書籤', '目前選取的主題']],
    ['bookmarkTabPos', ['書籤', '主題標籤位置']],
    ['bookmarkTabOverflow', ['書籤', '主題標籤排列方式']],
    ['bookmark_recent_notes', ['書籤', '最近開啟的筆記']],
    ['chat_full_profiles_v1', ['卡片', '聊天設定']],
    ['chat_environment_profiles_v1', ['卡片', '聊天環境設定']],
    ['chat_device_config_v1', ['卡片', '聊天裝置設定']],
    ['chat_auto_timestamp', ['卡片', '聊天自動時間戳']],
    ['wsl_runbook_v2', ['卡片', 'WSL 操作指南']],
    ['wsl_profiles_v1', ['卡片', 'WSL 操作指南設定']],
    ['cicd_profiles_v1', ['卡片', 'CI/CD 操作指南設定']]
  ]);
  const backupCategories = Object.freeze(['card', 'bookmark', 'image', 'qr', 'network', 'viewer']);

  function backupCategory(key) {
    if (key.startsWith('bookmark')) return 'bookmark';
    if (key === 'imgStampData' || key.startsWith('imgStampData:')) return 'image';
    if (key === 'qrCodeData' || key.startsWith('qrCodeData:')) return 'qr';
    if (key.startsWith('requestCollector_')) return 'network';
    if (key.startsWith('viewer-') || key.startsWith('site-viewer-')) return 'viewer';
    return 'card';
  }

  let active;

  function encode(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 8192) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    }
    return btoa(binary);
  }

  function decode(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }

  function isLocked() {
    return !active && localStorage.getItem(lockedFlag) === 'true';
  }

  async function readEnvelope(saved, key, additionalData) {
    const envelope = JSON.parse(saved);
    const plain = await crypto.subtle.decrypt({
      name: 'AES-GCM', iv: decode(envelope.iv), additionalData
    }, key, decode(envelope.data));
    const entries = JSON.parse(decoder.decode(plain));
    if (!Array.isArray(entries) || entries.some(entry =>
      !Array.isArray(entry) || entry.length !== 2 || entry.some(value => typeof value !== 'string'))) {
      throw new Error('本機帳號資料格式不符。');
    }
    return entries;
  }

  function countItems(values) {
    const read = key => {
      try { return JSON.parse(values.get(key) ?? 'null'); }
      catch { return null; }
    };
    const length = value => Array.isArray(value) ? value.length : 0;
    return [
      length(read('site_data')),
      length(read('bookmarkData')?.favorites),
      length(read('imgStampData')),
      length(read('qrCodeData')),
      length(read('requestCollector_ps')) + length(read('requestCollector_bash')),
      length(read('viewer-recent-folders'))
    ];
  }

  async function unlock(accountId, key) {
    const storageKey = prefix + accountId;
    const additionalData = encoder.encode(storageKey);
    const saved = localStorage.getItem(storageKey);
    const entries = saved ? await readEnvelope(saved, key, additionalData) : [];
    localStorage.setItem(lockedFlag, 'true');
    active = { storageKey, additionalData, key, saved, values: new Map(entries), queue: Promise.resolve(), pending: 0 };
  }

  async function seal(vault, snapshot) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({
      name: 'AES-GCM', iv, additionalData: vault.additionalData
    }, vault.key, encoder.encode(snapshot));
    return JSON.stringify({
      iv: encode(iv), data: encode(new Uint8Array(encrypted)), updatedAt: new Date().toISOString()
    });
  }

  function persist(vault) {
    const snapshot = JSON.stringify([...vault.values]);
    const write = async () => {
      const envelope = await seal(vault, snapshot);
      if (localStorage.getItem(vault.storageKey) !== vault.saved) {
        throw new Error('另一個分頁已更新帳號資料，請重新整理後再儲存。');
      }
      localStorage.setItem(vault.storageKey, envelope);
      vault.saved = envelope;
      window.dispatchEvent(new Event('site-data-saved'));
    };
    vault.pending++;
    vault.queue = vault.queue.catch(() => {}).then(() =>
      navigator.locks ? navigator.locks.request(vault.storageKey, write) : write()
    ).finally(() => { vault.pending--; });
    vault.queue.catch(error => showToast('本機加密儲存失敗：' + error.message));
  }

  function prepareMerge(localValues, cloudValues, onlyVersionedMatches = false, includeCloudCards = false) {
    const rows = [];
    const writes = [];
    const handled = new Set();
    const parse = value => {
      try { return JSON.parse(value); }
      catch { return value; }
    };
    const identify = value => value?.id ?? null;
    const revisionTime = record => {
      const value = record?.updatedAt ?? record?.modifiedAt ?? record?.savedAt;
      if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : NaN;
      return typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
    };
    const cardIdentity = value => identify(value) ??
      (value?.title ? JSON.stringify([value.type, value.title]) : null);
    const title = (value, index) => value?.title || value?.name || value?.label ||
      (typeof value === 'string' ? '項目 ' + (index + 1) : value?.id || '項目 ' + (index + 1));

    function compareList(label, local, cloud, identity, write, summarize = value => value, includeCloudOnly = false) {
      const claimed = new Set();
      const positions = new Map();
      const cloudIdentityCounts = new Map();
      local.forEach((value, index) => {
        const id = identity(value);
        if (id !== null) positions.set(id, positions.has(id) ? -1 : index);
      });
      cloud.forEach(value => {
        const id = identity(value);
        if (id !== null) cloudIdentityCounts.set(id, (cloudIdentityCounts.get(id) || 0) + 1);
      });
      const versionPair = (left, right) => {
        const id = identify(left);
        return id !== null && id === identify(right) &&
          Number.isFinite(revisionTime(left)) && Number.isFinite(revisionTime(right));
      };
      const exact = new Map();
      local.forEach((value, index) => {
        const text = JSON.stringify(summarize(value));
        if (!exact.has(text)) exact.set(text, []);
        exact.get(text).push(index);
      });
      const changes = [];
      const matches = cloud.map(value => {
        const index = exact.get(JSON.stringify(summarize(value)))?.pop();
        if (index !== undefined) claimed.add(index);
        return index;
      });
      cloud.forEach((value, index) => {
        if ((!onlyVersionedMatches || includeCloudOnly) && matches[index] !== undefined) return;
        const id = identity(value);
        const candidate = cloudIdentityCounts.get(id) === 1 ? positions.get(id) : undefined;
        const matched = candidate >= 0 && (onlyVersionedMatches || !claimed.has(candidate));
        const previous = matched ? local[candidate] : undefined;
        const verifiable = versionPair(previous, value);
        const cloudOnly = includeCloudOnly && !matched && !positions.has(id);
        if (onlyVersionedMatches && !cloudOnly && (!verifiable || revisionTime(previous) === revisionTime(value))) return;
        const blocked = id !== null && !matched && (positions.has(id) || cloudIdentityCounts.get(id) > 1);
        if (matched) claimed.add(candidate);
        const row = rows.length;
        rows.push({ label, title: title(summarize(value), index),
          local: matched ? summarize(local[candidate]) : undefined, cloud: summarize(value), blocked,
          localTime: verifiable ? revisionTime(previous) : undefined,
          cloudTime: verifiable ? revisionTime(value) : undefined,
          verifiedUpdate: verifiable && revisionTime(previous) > revisionTime(value) });
        if (!blocked) changes.push({ row, index: matched ? candidate : -1, value });
      });
      local.forEach((value, index) => {
        if (!onlyVersionedMatches && !claimed.has(index)) rows.push({ label, title: title(summarize(value), index), local: summarize(value) });
      });
      if (changes.length) writes.push((chosen, result) => {
        const next = [...local];
        let changed = false;
        for (const change of changes) {
          if (!chosen.has(change.row)) continue;
          if (change.index < 0) next.push(change.value);
          else next[change.index] = change.value;
          changed = true;
        }
        if (changed) write(result, next);
      });
    }

    for (const [key, label, identity] of [
      ['site_data', '卡片', onlyVersionedMatches ? identify : cardIdentity], ['imgStampData', '圖片', identify],
      ['qrCodeData', 'QR', identify], ['requestCollector_ps', 'PowerShell', () => null],
      ['requestCollector_bash', 'Bash', () => null]
    ]) {
      const local = parse(localValues.get(key)) ?? [];
      const cloud = parse(cloudValues.get(key)) ?? [];
      if (!Array.isArray(local) || !Array.isArray(cloud)) continue;
      handled.add(key);
      compareList(label, local, cloud, identity, (result, value) => {
        result.set(key, JSON.stringify(value));
        if (key !== 'site_data' || value.length <= local.length) return;
        const savedOrder = parse(localValues.get('card_order'));
        const order = new Set(Array.isArray(savedOrder)
          ? savedOrder.filter(position => Number.isInteger(position) && position >= 1 && position <= local.length)
          : []);
        value.forEach((_, index) => order.add(index + 1));
        result.set('card_order', JSON.stringify([...order]));
      }, undefined, includeCloudCards && key === 'site_data');
    }

    const viewerKey = 'viewer-recent-folders';
    handled.add(viewerKey);
    const viewerRoots = record => Array.isArray(record?.directories)
      ? [...new Set(record.directories.filter(path => typeof path === 'string').map(path => path.split('/')[0]).filter(Boolean))].sort()
      : (typeof record?.label === 'string' ? record.label.split('、').filter(Boolean).sort() : []);
    const storedFolders = parse(localValues.get(viewerKey));
    const localFolders = Array.isArray(storedFolders) ? storedFolders : [];
    const localRoots = localFolders.filter(record => viewerRoots(record).length);
    const cloudFolders = parse(cloudValues.get(viewerKey));
    const summarizeFolder = record => {
      const roots = viewerRoots(record);
      const files = (record.snapshot?.files ?? []).map(({ path, size, mtime }) => [path, size, mtime])
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
      const directories = [...(record.directories ?? [])].sort();
      return { id: record.id, label: roots.join('、'), roots, files, directories };
    };
    compareList('Viewer 資料夾',
      localRoots,
      Array.isArray(cloudFolders) ? cloudFolders.filter(record => viewerRoots(record).length) : [],
      identify,
      (result, value) => {
        const next = [...localFolders];
        let position = 0;
        localFolders.forEach((record, index) => {
          if (viewerRoots(record).length) next[index] = value[position++];
        });
        result.set(viewerKey, JSON.stringify([...next, ...value.slice(position)]));
      }, summarizeFolder);

    const bookmarkKey = 'bookmarkData';
    const localBookmarks = parse(localValues.get(bookmarkKey)) ?? {};
    const cloudBookmarks = parse(cloudValues.get(bookmarkKey)) ?? {};
    if ([localBookmarks, cloudBookmarks].every(value => value && typeof value === 'object' && !Array.isArray(value) &&
        ['themes', 'favorites'].every(key => value[key] === undefined || Array.isArray(value[key])))) {
      handled.add(bookmarkKey);
      for (const [key, label] of [['themes', '書籤主題'], ['favorites', '書籤']]) {
        compareList(label, localBookmarks[key] ?? [], cloudBookmarks[key] ?? [], identify, (result, value) => {
          const merged = parse(result.get(bookmarkKey)) ?? { themes: [], favorites: [] };
          merged[key] = value;
          if (key === 'favorites') {
            const themeIds = new Set(merged.themes?.map(theme => theme.id));
            const selected = value.filter(favorite => !(localBookmarks.favorites ?? []).includes(favorite));
            if (selected.some(favorite => (favorite.themeIds ?? [favorite.themeId]).some(id => id && id !== 'all' && !themeIds.has(id)))) {
              throw new Error('所選書籤需要對應的雲端主題，請一併選取。');
            }
          }
          result.set(bookmarkKey, JSON.stringify(merged));
        });
      }
    }

    for (const key of new Set([...localValues.keys(), ...cloudValues.keys()])) {
      if (handled.has(key) || localValues.get(key) === cloudValues.get(key)) continue;
      if (onlyVersionedMatches) continue;
      const setting = comparisonSettings.get(key) ??
        (/^guide_.+_v1$/.test(key) ? ['卡片', '操作指南'] : null);
      if (!setting) continue;
      const row = rows.length;
      const local = localValues.get(key);
      const cloud = cloudValues.get(key);
      const [group, title] = setting;
      rows.push({ label: title, group, title, local: parse(local), cloud: parse(cloud) });
      if (cloud !== undefined) writes.push((chosen, result) => {
        if (chosen.has(row)) result.set(key, cloud);
      });
    }
    return {
      rows,
      build(chosen) {
        const result = new Map(localValues);
        for (const write of writes) write(chosen, result);
        return result;
      }
    };
  }

  function createMergePlan(vault, localEnvelope, local, cloud, preserved = new Map(), onlyVersionedMatches = false, includeCloudCards = false) {
    const plan = prepareMerge(local, cloud, onlyVersionedMatches, includeCloudCards);
    const normalized = value => {
      try {
        return JSON.stringify(JSON.parse(value), (_, item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
          return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
        });
      } catch {
        return value;
      }
    };
    return {
      rows: plan.rows,
      requiresOverwrite: plan.rows.some(row => row.cloud !== undefined && !row.verifiedUpdate),
      identical: local.size === cloud.size && [...local].every(([key, value]) =>
        cloud.has(key) && normalized(value) === normalized(cloud.get(key))),
      async apply(chosen) {
        const values = new Map([...preserved, ...plan.build(new Set(chosen))]);
        const write = async () => {
          const envelope = await seal(vault, JSON.stringify([...values]));
          if (vault !== active || vault.pending || vault.saved !== localEnvelope ||
              localStorage.getItem(vault.storageKey) !== localEnvelope) {
            throw new Error('本機版本已更新，請重新比較。');
          }
          localStorage.setItem(vault.storageKey, envelope);
          vault.saved = envelope;
          vault.values = values;
        };
        if (navigator.locks) await navigator.locks.request(vault.storageKey, write);
        else await write();
      }
    };
  }

  window.addEventListener('beforeunload', event => {
    if (!active?.pending) return;
    event.preventDefault();
    event.returnValue = true;
  });

  return {
    unlock,
    isLocked,
    isActive: () => !!active,
    localScope: () => active?.storageKey,
    async sealViewerText(value, scope) {
      const vault = active;
      if (!vault || vault.storageKey !== scope) throw new Error('Viewer 帳號已切換。');
      return seal(vault, JSON.stringify([['viewer-local-text', JSON.stringify(value)]]));
    },
    async readViewerText(envelope) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const entries = await readEnvelope(envelope, vault.key, vault.additionalData);
      return JSON.parse(new Map(entries).get('viewer-local-text'));
    },
    async snapshot() {
      const vault = active;
      if (!vault) return null;
      let queue;
      do {
        queue = vault.queue;
        await queue;
      } while (queue !== vault.queue);
      if (vault !== active || localStorage.getItem(vault.storageKey) !== vault.saved) {
        throw new Error('本機資料已變更，請重新整理。');
      }
      return vault.saved ? {
        envelope: vault.saved,
        updatedAt: JSON.parse(vault.saved).updatedAt,
        count: vault.values.size,
        items: countItems(vault.values)
      } : null;
    },
    async inspectBackup(envelope) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      return countItems(new Map(await readEnvelope(envelope, vault.key, vault.additionalData)));
    },
    backupCategories,
    async splitBackup(envelope, categories = backupCategories, previous = {}) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const entries = envelope === null ? [] : await readEnvelope(envelope, vault.key, vault.additionalData);
      const groups = Object.fromEntries(backupCategories.map(category => [category, []]));
      for (const entry of entries) groups[backupCategory(entry[0])].push(entry);
      return Object.fromEntries(await Promise.all(categories.map(async category => {
        const sorted = groups[category].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
        const text = JSON.stringify(sorted);
        const digest = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))));
        const envelope = previous[category]?.contentDigest === digest ? null : await seal(vault, text);
        return [category, { envelope, digest, count: sorted.length }];
      })));
    },
    async joinBackup(packages) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const combined = new Map();
      for (const category of backupCategories) {
        const entries = await readEnvelope(packages[category], vault.key, vault.additionalData);
        for (const [key, value] of entries) {
          if (backupCategory(key) !== category || combined.has(key)) throw new Error('備份分類內容不符。');
          combined.set(key, value);
        }
      }
      return seal(vault, JSON.stringify([...combined]));
    },
    async sealBackupIndex(index) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      return seal(vault, JSON.stringify([['category-backup-index', JSON.stringify(index)]]));
    },
    async readBackupIndex(envelope) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const entries = await readEnvelope(envelope, vault.key, vault.additionalData);
      const index = JSON.parse(new Map(entries).get('category-backup-index') ?? 'null');
      if (index?.version !== 2 || !backupCategories.every(category => {
        const ref = index.packages?.[category];
        return typeof ref?.id === 'string' && typeof ref.digest === 'string' &&
          typeof ref.contentDigest === 'string' && Number.isSafeInteger(ref.count) && ref.count >= 0;
      })) throw new Error('備份索引格式不符。');
      return index;
    },
    async prepareGuestListUpload(envelope, incoming, category) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const mode = Object.keys(GuestDiffData.modes).find(mode => GuestDiffData.modes[mode].category === category);
      if (!mode) throw new Error('訪客資料類型不正確。');
      const values = new Map(envelope ? await readEnvelope(envelope, vault.key, vault.additionalData) : []);
      const plan = GuestDiffData.plan(mode, values, incoming);
      return { rows: plan.rows, cloudCardCount: plan.cloudCardCount, async build(choices) {
        if (active !== vault) throw new Error('登入帳號已變更。');
        const entries = plan.build(choices);
        if (!entries) return null;
        for (const [key, value] of entries) values.set(key, value);
        const result = await seal(vault, JSON.stringify([...values]));
        return { envelope: result, count: values.size, updatedAt: JSON.parse(result).updatedAt };
      } };
    },
    async prepareGuestBookmarkUpload(envelope, incoming) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const values = new Map(envelope ? await readEnvelope(envelope, vault.key, vault.additionalData) : []);
      const data = JSON.parse(values.get('bookmarkData') ?? '{"themes":[],"favorites":[]}');
      const plan = window.plugins['bookmark-data'].guestPlan(data, incoming);
      return {
        rows: plan.rows, cloudCardCount: plan.cloudCardCount,
        async build(choices) {
          if (active !== vault) throw new Error('登入帳號已變更。');
          const next = plan.build(choices);
          if (!next) return null;
          values.set('bookmarkData', JSON.stringify(next));
          const result = await seal(vault, JSON.stringify([...values]));
          return { envelope: result, count: values.size, updatedAt: JSON.parse(result).updatedAt };
        }
      };
    },
    async prepareGuestCardUpload(envelope, incoming) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const values = new Map(envelope ? await readEnvelope(envelope, vault.key, vault.additionalData) : []);
      const readArray = key => {
        const parsed = JSON.parse(values.get(key) ?? '[]');
        if (!Array.isArray(parsed)) throw new Error('雲端卡片資料格式不符。');
        return parsed;
      };
      const cards = readArray('site_data');
      const order = readArray('card_order');
      const stable = value => JSON.stringify(value, (_, item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
      const rows = incoming.map(card => {
        const matches = card.id == null ? [] :
          cards.flatMap((item, index) => item?.id === card.id ? [index] : []);
        const found = matches[0] ?? -1;
        const identical = matches.some(index => stable(cards[index]) === stable(card)) ||
          (card.id == null && cards.some(item => stable(item) === stable(card)));
        return { card, cloud: cards[found], found, identical, canReplace: matches.length === 1 };
      });
      return {
        rows,
        cloudCardCount: cards.length,
        async build(choices) {
          if (active !== vault) throw new Error('登入帳號已變更。');
          const next = [...cards];
          const ids = new Set(next.map(card => card?.id));
          const names = new Set(next.map(card => card?.title));
          const replaced = new Set();
          let changed = 0;
          rows.forEach((row, index) => {
            const choice = choices[index];
            if (row.identical || !choice || choice === 'skip') return;
            if (choice === 'replace') {
              if (!row.canReplace || replaced.has(row.found)) throw new Error('同一個雲端 ID 只能覆蓋一次。');
              replaced.add(row.found);
              next[row.found] = row.card;
              names.add(row.card.title);
            } else if (choice === 'add' || choice === 'copy') {
              const card = { ...row.card };
              if (choice === 'copy' || card.id == null || ids.has(card.id)) {
                do { card.id = crypto.randomUUID(); } while (ids.has(card.id));
              }
              if (choice === 'copy' || (row.card.id != null && ids.has(row.card.id))) {
                const title = card.title || '未命名卡片';
                let suffix = 1;
                do { card.title = title + ' (' + suffix++ + ')'; } while (names.has(card.title));
              }
              ids.add(card.id);
              names.add(card.title);
              next.push(card);
            } else {
              throw new Error('訪客卡片上傳選項無效。');
            }
            changed++;
          });
          if (!changed) return null;
          const nextOrder = new Set(order.filter(i => Number.isInteger(i) && i >= 1 && i <= cards.length));
          next.forEach((_, index) => nextOrder.add(index + 1));
          values.set('site_data', JSON.stringify(next));
          values.set('card_order', JSON.stringify([...nextOrder]));
          const result = await seal(vault, JSON.stringify([...values]));
          return { envelope: result, count: values.size, updatedAt: JSON.parse(result).updatedAt };
        }
      };
    },
    async prepareBackupMerge(localEnvelope, remoteEnvelope, category, { includeCloudCards = false } = {}) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const [local, cloud] = await Promise.all([localEnvelope, remoteEnvelope].map(async envelope =>
        new Map(envelope ? await readEnvelope(envelope, vault.key, vault.additionalData) : [])));
      if (!category) return createMergePlan(vault, localEnvelope, local, cloud);
      if (!backupCategories.includes(category)) throw new Error('備份分類不正確。');
      const belongs = ([key]) => backupCategory(key) === category;
      return createMergePlan(vault, localEnvelope, new Map([...local].filter(belongs)),
        new Map([...cloud].filter(belongs)), new Map([...local].filter(entry => !belongs(entry))), true, category === 'card' && includeCloudCards);
    },
    async prepareGuestMerge(expected, entries) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const local = expected ? new Map(await readEnvelope(expected, vault.key, vault.additionalData)) : new Map();
      return createMergePlan(vault, expected, local, new Map(entries));
    },
    async restore(envelope, expected) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const entries = await readEnvelope(envelope, vault.key, vault.additionalData);
      await vault.queue;
      const replace = () => {
        if (vault !== active || vault.pending || vault.saved !== expected ||
            localStorage.getItem(vault.storageKey) !== expected) {
          throw new Error('本機資料已變更，請重新比較。');
        }
        localStorage.setItem(vault.storageKey, envelope);
        vault.saved = envelope;
        vault.values = new Map(entries);
      };
      if (navigator.locks) await navigator.locks.request(vault.storageKey, replace);
      else replace();
    },
    legacyEntries() {
      return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter(Boolean)
        .map(source => [source.startsWith(guestPrefix) ? source.slice(guestPrefix.length) : source, localStorage.getItem(source), source])
        .filter(([key, value]) => value !== null &&
          (legacyKeys.has(key) || /^guide_.+_v1$/.test(key) || /^site-viewer-(session|note):/.test(key)));
    },
    flush: () => active?.queue ?? Promise.resolve(),
    async updateEntries(build, { deferDriveSync = false } = {}) {
      const vault = active;
      if (!vault) throw new Error('請先登入。');
      const snapshot = await this.snapshot();
      const entries = await build();
      if (!entries) return false;
      await this.saveEntries(entries, { vault, saved: snapshot?.envelope ?? null }, { deferDriveSync });
      return true;
    },
    async saveEntries(entries, expected, { deferDriveSync = false } = {}) {
      const vault = active;
      if (expected && expected.vault !== vault) throw new Error('登入帳號已變更，請重新整理。');
      if (!vault) {
        const prefix = isLocked() ? guestPrefix : '';
        const written = [];
        try {
          for (const [key, value] of entries) {
            const path = prefix + key;
            const previous = localStorage.getItem(path);
            localStorage.setItem(path, value);
            written.push([path, previous]);
          }
        } catch (error) {
          for (const [path, previous] of written.reverse()) {
            if (previous === null) localStorage.removeItem(path);
            else localStorage.setItem(path, previous);
          }
          throw error;
        }
      } else {
        await vault.queue;
        const write = async () => {
          const saved = vault.saved;
          if (expected && expected.saved !== saved) {
            throw new Error('本機資料已變更，請重新整理後再儲存。');
          }
          const values = new Map([...vault.values, ...entries]);
          const envelope = await seal(vault, JSON.stringify([...values]));
          if (vault !== active || vault.pending || vault.saved !== saved || localStorage.getItem(vault.storageKey) !== saved) {
            throw new Error('本機資料已變更，請重新整理後再儲存。');
          }
          localStorage.setItem(vault.storageKey, envelope);
          vault.saved = envelope;
          vault.values = values;
        };
        if (navigator.locks) await navigator.locks.request(vault.storageKey, write);
        else await write();
      }
      window.dispatchEvent(new CustomEvent('site-data-saved', { detail: { deferDriveSync } }));
    },
    lock() { active = undefined; },
    getItem(key) {
      if (active) return active.values.get(key) ?? null;
      return localStorage.getItem(isLocked() ? guestPrefix + key : key);
    },
    setItem(key, value) {
      if (!active) {
        localStorage.setItem(isLocked() ? guestPrefix + key : key, value);
        window.dispatchEvent(new Event('site-data-saved'));
        return;
      }
      const text = String(value);
      if (active.values.get(key) === text) return;
      active.values.set(key, text);
      persist(active);
    },
    removeItem(key) {
      if (active) {
        if (active.values.delete(key)) persist(active);
      } else {
        localStorage.removeItem(isLocked() ? guestPrefix + key : key);
      }
    },
    get length() {
      return active ? active.values.size : isLocked() ? 0 : localStorage.length;
    },
    key(index) {
      return active ? [...active.values.keys()][index] ?? null : isLocked() ? null : localStorage.key(index);
    }
  };
})();
