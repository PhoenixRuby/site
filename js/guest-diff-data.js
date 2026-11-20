/* Array-based guest collections; no UI or storage side effects. */
const GuestDiffData = (() => {
  const modes = {
    img: { category: 'image', noun: '圖片母片', icon: 'img', keys: ['imgStampData'] },
    qr: { category: 'qr', noun: 'QR Code', icon: 'qr', keys: ['qrCodeData'] },
    network: { category: 'network', noun: '請求', icon: 'network', keys: ['requestCollector_ps', 'requestCollector_bash'] },
    viewer: { category: 'viewer', noun: '資料夾快照', icon: 'folder', keys: ['viewer-recent-folders'] }
  };
  const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
  function portableViewer(record) {
    const { handles, cached, baselineCached, textEnvelope, identityVerified, ...value } = record;
    return { ...value, label: record.label || (handles ?? []).map(handle => handle.name).join('、'), handles: [] };
  }
  function content(key, item) {
    if (item && typeof item === 'object') {
      const { id, ...value } = key === 'viewer-recent-folders' ? portableViewer(item) : item;
      if (key === 'viewer-recent-folders') {
        delete value.savedAt;
        delete value.updatedAt;
        delete value.reconnectBaseline;
      }
      return stable([key, value]);
    }
    return stable([key, item]);
  }
  const name = entry => typeof entry.item === 'string'
    ? (entry.key.endsWith('_ps') ? 'PowerShell · ' : 'Bash / cURL · ') + entry.item.split('\n')[0].slice(0, 100)
    : entry.item?.name || entry.item?.label || '未命名項目';
  function read(raw) {
    const value = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) throw new Error('資料清單格式不正確。');
    return value;
  }
  function valid(key, item) {
    if (key.startsWith('requestCollector_')) return typeof item === 'string' && item.trim().length > 0;
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (key === 'imgStampData') return typeof item.image === 'string' && (!item.texts || Array.isArray(item.texts));
    if (key === 'qrCodeData') return typeof item.text === 'string';
    return key === 'viewer-recent-folders' && typeof item.label === 'string';
  }
  function plan(mode, values, incoming) {
    const config = modes[mode];
    if (!config || !Array.isArray(incoming)) throw new Error('訪客資料類型不正確。');
    const lists = new Map(config.keys.map(key => [key, read(values.get(key))]));
    const rows = incoming.map(entry => {
      if (!lists.has(entry.key) || !valid(entry.key, entry.item)) throw new Error('訪客資料內容不正確。');
      const list = lists.get(entry.key);
      const id = entry.item?.id;
      const matches = id == null ? [] : list.flatMap((item, index) => item?.id === id ? [index] : []);
      const found = matches[0] ?? -1;
      return { ...entry, found, card: { title: name(entry) }, cloud: found < 0 ? undefined : { title: name({ key: entry.key, item: list[found] }) },
        identical: list.some(item => content(entry.key, item) === content(entry.key, entry.item)), canReplace: matches.length === 1 };
    });
    return { rows, cloudCardCount: [...lists.values()].reduce((sum, list) => sum + list.length, 0), build(choices) {
      const result = new Map([...lists].map(([key, list]) => [key, JSON.parse(JSON.stringify(list))]));
      const changed = new Set(), replaced = new Set();
      rows.forEach((row, index) => {
        const choice = choices[index];
        if (row.identical || !choice || choice === 'skip') return;
        if (!['add', 'copy', 'replace'].includes(choice)) throw new Error('訪客資料選項無效。');
        const list = result.get(row.key);
        let item = JSON.parse(JSON.stringify(row.item));
        if (mode === 'viewer') item = portableViewer(item);
        if (choice === 'replace') {
          const target = row.key + ':' + row.found;
          if (!row.canReplace || replaced.has(target)) throw new Error('同一個 ID 只能覆蓋一次。');
          replaced.add(target); list[row.found] = item;
        } else {
          if (list.some(existing => content(row.key, existing) === content(row.key, item))) return;
          if (item && typeof item === 'object') {
            const conflict = list.some(existing => existing?.id === item.id);
            if (item.id == null || conflict || choice === 'copy') {
              do { item.id = crypto.randomUUID(); } while (list.some(existing => existing?.id === item.id));
            }
            if ((conflict || choice === 'copy') && mode !== 'viewer') {
              const title = item.name || '未命名項目'; let suffix = 1;
              do { item.name = title + ' (' + suffix++ + ')'; } while (list.some(existing => existing?.name === item.name));
            }
          }
          list.push(item);
        }
        changed.add(row.key);
      });
      return changed.size ? [...changed].map(key => [key, JSON.stringify(result.get(key))]) : null;
    } };
  }
  return { modes, stable, read, valid, content, name, portableViewer, plan };
})();
