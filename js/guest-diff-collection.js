/* Reusable list workflow. Each mode supplies only tile/detail rendering and source adapters. */
const GuestDiffCollection = {
  create(options) {
    const { mode, renderTile, renderDetail, reload } = options;
    const config = GuestDiffData.modes[mode], owner = window.plugins[mode];
    const receiptKey = config.keys[0] + ':guest-import-receipts';
    const selected = new Set(), removing = new Set(), dialogs = new Map();
    let entries = [], viewed = null, filter = 'all', busy = false, request = 0, menu;
    const available = () => window.viewMode === mode && (options.isAvailable?.() ?? true);
    const closeMenu = () => { menu?.remove(); menu = undefined; };
    const shell = GuestDiffPanel.createShell({ mode, noun: config.noun, archive: true });
    const { panel, side } = shell;
    side.classList.add('guest-collection-detail');
    const grid = panel.querySelector('.' + mode + '-guest-grid'); grid.classList.add('guest-collection-grid');
    const archive = panel.querySelector('[data-archive]'), upload = panel.querySelector('[data-upload]');
    const diff = GuestDiffPanel.create({ ...shell, mode, isAvailable: options.isAvailable,
      sideScrollTargets: () => [side], beforeClose: closeMenu, onModeExit: closeMenu,
      onEscape: () => { if (!menu) return false; closeMenu(); return true; } });
    const receipts = () => GuestDiffData.read(AccountStorage.getItem(receiptKey));
    async function list() {
      if (!AccountStorage.isActive()) return [];
      const saved = new Set(config.keys.flatMap(key => GuestDiffData.read(AccountStorage.getItem(key)).map(item => GuestDiffData.content(key, item))));
      const imported = new Set(receipts());
      const sources = AccountStorage.legacyEntries().filter(([key]) => config.keys.includes(key))
        .map(([key, raw, source]) => ({ key, items: GuestDiffData.read(raw), source }));
      if (options.readSources) sources.push(...await options.readSources());
      const candidates = new Map();
      for (const { key, items } of sources) for (let item of items) {
        if (mode === 'viewer') item = GuestDiffData.portableViewer(item);
        if (!GuestDiffData.valid(key, item)) continue;
        const content = GuestDiffData.content(key, item);
        if (!saved.has(content)) candidates.set(content, { key, item });
      }
      const result = await Promise.all([...candidates].map(async ([content, entry]) => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
        return { ...entry, fingerprint: btoa(String.fromCharCode(...new Uint8Array(digest))) };
      }));
      return result.filter(entry => !imported.has(entry.fingerprint));
    }
    function controls(entry) {
      return GuestDiffPanel.createPinControls({ pinned: selected.has(entry.fingerprint), keep: !removing.has(entry.fingerprint), busy,
        onPin(value) { if (busy) return; if (value) selected.add(entry.fingerprint); else { selected.delete(entry.fingerprint); removing.delete(entry.fingerprint); } render(); },
        onKeep(value) { if (busy) return; if (value) removing.delete(entry.fingerprint); else removing.add(entry.fingerprint); render(); } });
    }
    function detail(target, entry, update) {
      const heading = document.createElement('h3'); heading.textContent = GuestDiffData.name(entry); target.append(heading);
      renderDetail(target, entry, update);
    }
    function showDialog(entry, tile) {
      const dialog = GuestDiffPanel.createDialog({ title: config.noun + '明細', icon: config.icon, scroll: true,
        bodyClass: 'guest-collection-detail', footerHTML: '<div data-guest-dialog-controls></div>',
        onClose: () => dialogs.delete(dialog.dialog), restoreFocus: () => {
          [...grid.children].find(node => node.dataset.fingerprint === entry.fingerprint)?.focus({ preventScroll: true });
        } });
      detail(dialog.body, entry, dialog.updateScroll);
      dialog.dialog.querySelector('[data-guest-dialog-controls]').append(controls(entry));
      dialogs.set(dialog.dialog, entry); dialog.show();
    }
    function render() {
      grid.replaceChildren();
      const visible = entries.filter(entry => filter === 'all' || selected.has(entry.fingerprint) === (filter === 'selected'));
      if (!visible.some(entry => entry.fingerprint === viewed)) viewed = null;
      for (const entry of visible) {
        const tile = document.createElement('article'); tile.className = 'guest-collection-tile'; tile.tabIndex = 0;
        tile.dataset.fingerprint = entry.fingerprint;
        tile.setAttribute('aria-label', GuestDiffData.name(entry)); tile.setAttribute('aria-haspopup', 'menu');
        tile.classList.toggle('is-selected', selected.has(entry.fingerprint)); tile.classList.toggle('is-viewing', viewed === entry.fingerprint);
        renderTile(tile, entry);
        const toggle = () => {
          viewed = viewed === entry.fingerprint ? null : entry.fingerprint; render();
          [...grid.children].find(node => node.dataset.fingerprint === entry.fingerprint)?.focus({ preventScroll: true });
        };
        tile.onclick = event => { if (!event.target.closest('a,button,input')) toggle(); };
        tile.onkeydown = event => { if (['Enter', ' '].includes(event.key) && event.target === tile) { event.preventDefault(); toggle(); } };
        tile.oncontextmenu = event => {
          event.preventDefault(); closeMenu(); menu = document.createElement('div'); menu.className = 'guest-collection-menu'; menu.setAttribute('role', 'menu');
          const actions = [['檢視內容', () => showDialog(entry, tile)], [selected.has(entry.fingerprint) ? '取消釘選' : '釘選以歸檔', () => {
            if (selected.has(entry.fingerprint)) { selected.delete(entry.fingerprint); removing.delete(entry.fingerprint); } else selected.add(entry.fingerprint); render();
          }], ...(selected.size ? [['歸檔至本機（' + selected.size + '）', () => archive.click()]] : []), ['刪除訪客原檔', () => deleteOriginal(entry)]];
          for (const [name, action] of actions) {
            const button = document.createElement('button'); button.textContent = name; button.type = 'button'; button.disabled = busy; button.setAttribute('role', 'menuitem');
            button.onclick = () => { closeMenu(); action(); }; menu.append(button);
          }
          menu.onkeydown = event => {
            if (event.key === 'Escape') { event.preventDefault(); closeMenu(); tile.focus(); }
            else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              const buttons = [...menu.querySelectorAll('button:not(:disabled)')];
              if (!buttons.length) return;
              const index = buttons.indexOf(document.activeElement);
              buttons[(index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length].focus();
            }
          };
          document.body.append(menu); const box = tile.getBoundingClientRect();
          menu.style.left = Math.max(0, Math.min(event.clientX || box.left, innerWidth - menu.offsetWidth - 8)) + 'px';
          menu.style.top = Math.max(0, Math.min(event.clientY || box.top, innerHeight - menu.offsetHeight - 8)) + 'px';
          menu.firstElementChild.focus();
        };
        grid.append(tile);
      }
      diff.updateFilters(entries.length, selected.size, filter);
      panel.querySelector('[data-empty]').hidden = visible.length > 0;
      archive.hidden = upload.hidden = selected.size === 0; archive.disabled = upload.disabled = busy;
      archive.textContent = '歸檔至本機（' + selected.size + '）'; upload.textContent = '上傳至雲端（' + selected.size + '）';
      const entry = entries.find(entry => entry.fingerprint === viewed);
      diff.renderSide(Boolean(entry), () => { side.replaceChildren(); detail(side, entry, () => diff.attachScrolls()); side.append(controls(entry)); }, { clear: () => side.replaceChildren() });
      for (const [dialog, entry] of dialogs) dialog.querySelector('[data-guest-dialog-controls]').replaceChildren(controls(entry));
      if (!entries.length) diff.opened = false;
      diff.layout(diff.opened && available());
    }
    async function removeOriginals(contents) {
      const writes = [];
      for (const [key, raw, source] of AccountStorage.legacyEntries()) {
        if (!config.keys.includes(key)) continue;
        const previous = GuestDiffData.read(raw), next = previous.filter(item => !contents.has(GuestDiffData.content(key, item)));
        if (next.length !== previous.length) writes.push([source, raw, JSON.stringify(next)]);
      }
      const written = [];
      try {
        for (const [key, before, after] of writes) {
          if (localStorage.getItem(key) !== before) throw new Error('訪客資料已變更。');
          localStorage.setItem(key, after); written.push([key, before, after]);
        }
        await options.removeOriginals?.(contents);
      } catch (error) {
        for (const [key, before, after] of written.reverse()) if (localStorage.getItem(key) === after) localStorage.setItem(key, before);
        throw error;
      }
    }
    function deleteOriginal(entry) {
      if (busy || !available()) return;
      confirmAction({ message: '確定要刪除訪客原檔「' + GuestDiffData.name(entry) + '」？', confirmText: '刪除' }, async () => {
        if (busy || !available() || !AccountStorage.isActive()) return;
        try { await removeOriginals(new Set([GuestDiffData.content(entry.key, entry.item)])); await refresh(); showToast('已刪除訪客原檔。'); }
        catch (error) { showToast('刪除未完成：' + error.message); }
      });
    }
    async function archiveSelection(fingerprints, originals) {
      if (busy || !available()) return;
      busy = true; render();
      try {
        const changed = await AccountStorage.updateEntries(async () => {
          const chosen = (await list()).filter(entry => fingerprints.has(entry.fingerprint));
          if (chosen.length !== fingerprints.size) throw new Error('未歸檔清單已變更，請重新確認。');
          const values = new Map(config.keys.map(key => [key, AccountStorage.getItem(key)]));
          const next = GuestDiffData.plan(mode, values, chosen).build(chosen.map(() => 'add'));
          if (!next) return null;
          return [...next, [receiptKey, JSON.stringify([...new Set([...receipts(), ...fingerprints])])]];
        }, { deferDriveSync: true });
        if (!changed) throw new Error('未歸檔清單已變更，請重新確認。');
        selected.clear(); removing.clear();
        let cleanupError;
        try { if (originals.size) await removeOriginals(originals); } catch (error) { cleanupError = error; }
        if (available()) await reload();
        showToast(cleanupError ? '已歸檔，訪客原檔清理未完成：' + cleanupError.message : '已歸檔 ' + fingerprints.size + ' 筆' + config.noun + '。');
      } catch (error) { showToast('歸檔未完成：' + error.message); }
      finally { busy = false; await refresh(); }
    }
    archive.onclick = () => {
      if (busy || !selected.size || !available()) return;
      const fingerprints = new Set(selected), originals = new Set(entries.filter(entry => fingerprints.has(entry.fingerprint) && removing.has(entry.fingerprint)).map(entry => GuestDiffData.content(entry.key, entry.item)));
      const commit = () => void archiveSelection(fingerprints, originals);
      if (originals.size) confirmAction({ message: '確定要歸檔，並移除所選訪客原檔？', confirmText: '歸檔並移除' }, commit); else commit();
    };
    upload.onclick = async () => {
      if (busy || !selected.size || !available()) return;
      const drive = window.plugins['google-drive'];
      if (!drive?.uploadGuestItems) { showToast('訪客資料上傳功能尚未載入。'); return; }
      busy = true; render();
      try { await drive.uploadGuestItems(entries.filter(entry => selected.has(entry.fingerprint)), config.category); }
      finally { busy = false; render(); }
    };
    async function refresh() {
      const version = ++request;
      try {
        const next = await list(); if (version !== request) return;
        const countChanged = next.length !== entries.length;
        entries = next;
        const known = new Set(entries.map(entry => entry.fingerprint));
        for (const id of selected) if (!known.has(id)) { selected.delete(id); removing.delete(id); }
        render();
        if (countChanged && available()) renderToolbar();
      } catch (error) { console.warn('無法讀取訪客' + config.noun, error); }
    }
    for (const button of panel.querySelectorAll('[data-filter]')) button.onclick = () => { filter = button.dataset.filter; render(); };
    document.addEventListener('click', closeMenu);
    for (const event of ['site-data-ready', 'site-account-ready', 'site-data-saved']) {
      window.addEventListener(event, () => void refresh());
    }
    window.addEventListener('storage', event => { if (event.key === null || config.keys.some(key => event.key === key || event.key === 'site-guest:' + key)) void refresh(); });
    owner.guestReview = { label: '比對本機' + config.noun, keys: /$^/, groups: [], isAvailable: options.isAvailable,
      async open() { if (!available()) return true; if (diff.opened) { diff.close(); return true; } await refresh(); if (!available()) return true;
        if (entries.length) diff.open(render); else showToast('目前沒有訪客未歸檔項目。'); return true; } };
    owner.getGuestCount = () => (options.isAvailable?.() ?? true) ? entries.length : 0;
    const syncVisibility = () => {
      if (!available()) { diff.opened = false; diff.layout(false); closeMenu(); for (const dialog of dialogs.keys()) ModalManager.closeDialog(dialog); }
      else { diff.layout(diff.opened); void refresh(); }
    };
    void refresh();
    return { refresh, syncVisibility };
  }
};
