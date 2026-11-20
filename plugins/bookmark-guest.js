/* Guest bookmarks remain separate until explicitly archived or uploaded. */
registerPlugin('bookmark-guest', {
  mode: 'bookmark', hideToolbar: true, count: 0,
  load() {
    if (this.refresh) return;
    const owner = window.plugins.bookmark;
    const data = window.plugins['bookmark-data'];
    const receiptKey = 'bookmark-guest-import-receipts';
    const selected = new Set();
    const removing = new Set();
    let entries = [], busy = false, filter = 'all', viewed = null, request = 0;
    let menu;
    const dialogs = new Map();
    const contentPreferences = new Map();
    const closeMenu = () => { menu?.remove(); menu = null; };
    document.addEventListener('click', closeMenu);
    const shell = GuestDiffPanel.createShell({ mode: 'bookmark', noun: '書籤', prefix: 'bm-guest', sideClass: 'bm-guest-reader', archive: true });
    const { panel, side: reader } = shell;
    const grid = panel.querySelector('.bm-guest-grid');
    const archive = panel.querySelector('[data-archive]');
    const upload = panel.querySelector('[data-upload]');
    const diff = GuestDiffPanel.create({ ...shell, mode: 'bookmark', compareClass: 'bm-guest-compare',
      sideScrollTargets: () => [reader], beforeClose: closeMenu, onModeExit: closeMenu,
      onEscape: () => { if (!menu) return false; closeMenu(); return true; } });
    const parse = raw => {
      const value = JSON.parse(raw ?? '{"themes":[],"favorites":[]}');
      if (!value || !Array.isArray(value.themes) || !Array.isArray(value.favorites)) throw new Error('書籤資料格式不正確。');
      return value;
    };
    const content = entry => data.guestContent(entry.card, entry.themes);
    const receipts = () => {
      const value = JSON.parse(AccountStorage.getItem(receiptKey) ?? '[]');
      if (!Array.isArray(value)) throw new Error('書籤歸檔紀錄格式不正確。');
      return value;
    };
    async function list() {
      if (!AccountStorage.isActive()) return [];
      const current = parse(AccountStorage.getItem('bookmarkData'));
      const saved = new Set(current.favorites.map(card => data.guestContent(card, current.themes)));
      const imported = new Set(receipts());
      const candidates = new Map();
      for (const [key, raw] of AccountStorage.legacyEntries()) {
        if (key !== 'bookmarkData') continue;
        const source = parse(raw);
        for (const card of source.favorites) {
          if (!card || typeof card !== 'object' || Array.isArray(card)) continue;
          const entry = { card, themes: source.themes };
          const text = content(entry);
          if (!saved.has(text)) candidates.set(text, entry);
        }
      }
      const result = await Promise.all([...candidates].map(async ([text, entry]) => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return { ...entry, fingerprint: btoa(String.fromCharCode(...new Uint8Array(digest))) };
      }));
      return result.filter(entry => !imported.has(entry.fingerprint));
    }
    function layout() {
      const visible = diff.opened && entries.length > 0 && window.viewMode === 'bookmark';
      if (!visible) closeMenu();
      diff.layout(visible);
    }
    function close() { closeMenu(); diff.close(); }
    function button(text, action) {
      const node = document.createElement('button');
      node.type = 'button'; node.textContent = text; node.disabled = busy; node.onclick = action;
      return node;
    }
    function controls(entry) {
      return GuestDiffPanel.createPinControls({
        pinned: selected.has(entry.fingerprint), keep: !removing.has(entry.fingerprint), busy,
        onPin(pinned) {
          if (busy) return;
          if (pinned) selected.add(entry.fingerprint);
          else { selected.delete(entry.fingerprint); removing.delete(entry.fingerprint); }
          render();
        },
        onKeep(keep) {
          if (busy) return;
          if (keep) removing.delete(entry.fingerprint); else removing.add(entry.fingerprint);
          render();
        }
      });
    }
    function fillContent(target, entry, onDone) {
      const icon = name => {
        const node = document.createElement('span'); node.className = 'bm-guest-field-icon';
        node.setAttribute('aria-hidden', 'true'); node.innerHTML = resolveIcon(name); return node;
      };
      const isNote = Boolean(entry.card.content);
      const header = document.createElement('header'); header.className = 'bm-guest-document-header';
      const titleRow = document.createElement('div'); titleRow.className = 'bm-guest-document-title';
      const heading = document.createElement('h3'); heading.textContent = entry.card.title || '未命名書籤';
      titleRow.append(icon('ext-file'), heading);
      const type = document.createElement('span'); type.className = 'bm-guest-type-badge';
      type.setAttribute('aria-label', '類型：' + (isNote ? '筆記' : '網址'));
      type.append(icon(isNote ? 'book' : 'link'), isNote ? '筆記' : '網址');
      header.append(titleRow, type); target.append(header);
      const themeNames = [...new Set((entry.card.themeIds ?? [entry.card.themeId]).filter(Boolean)
        .map(id => entry.themes.find(theme => theme.id === id)?.name).filter(Boolean))];
      if (themeNames.length) {
        const themes = document.createElement('div'); themes.className = 'bm-guest-theme-chips'; themes.setAttribute('aria-label', '主題');
        themes.append(icon('bookmark'));
        for (const name of themeNames) {
          const chip = document.createElement('span'); chip.className = 'bm-guest-theme-chip'; chip.textContent = name; themes.append(chip);
        }
        target.append(themes);
      }
      const address = (isNote ? entry.card.notionUrl || entry.card.url : entry.card.url) || '';
      if (address) {
        const url = document.createElement('div'); url.className = 'bm-guest-url';
        const text = document.createElement('span'); text.textContent = address; url.append(icon('link'), text); target.append(url);
      }
      if (!isNote) return;
      let preference = contentPreferences.get(entry.fingerprint);
      if (!preference) {
        preference = { mode: 'preview', codeLang: entry.card.codeLang || 'auto' };
        contentPreferences.set(entry.fingerprint, preference);
      }
      const languageLabel = document.createElement('span'); languageLabel.className = 'bm-guest-language-badge';
      const languages = { auto: 'Auto', javascript: 'JavaScript', css: 'CSS', csharp: 'C#', bash: 'WSL / Bash',
        python: 'Python', markdown: 'Markdown', html: 'HTML', json: 'JSON', sql: 'SQL', typescript: 'TypeScript',
        xml: 'XML', yaml: 'YAML', ini: 'Config / INI', plaintext: '純文字' };
      preference.codeLang = entry.card.codeLang || 'auto';
      const languageSymbol = document.createElement('span'); languageSymbol.className = 'bm-guest-language-symbol'; languageSymbol.textContent = '</>';
      languageLabel.append(languageSymbol, languages[preference.codeLang] || preference.codeLang);
      languageLabel.setAttribute('aria-label', '程式碼語法種類：' + (languages[preference.codeLang] || preference.codeLang));
      languageLabel.title = preference.codeLang === 'auto' ? '程式碼語法種類：自動偵測' : '程式碼語法種類';
      const tabs = document.createElement('div'); tabs.className = 'bm-guest-content-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '原始碼／預覽');
      const modes = ['source', 'preview'].map(mode => {
        const node = button(mode === 'source' ? '原始碼' : '預覽', () => { preference.mode = mode; renderContent(); });
        node.dataset.mode = mode; tabs.append(node); return node;
      });
      const toolbar = document.createElement('div'); toolbar.className = 'bm-guest-content-toolbar';
      toolbar.append(languageLabel, tabs); target.append(toolbar);
      const body = document.createElement('div'); body.className = 'bm-guest-content guest-diff-native-content'; target.append(body);
      let version = 0;
      function renderContent() {
        const current = ++version;
        modes.forEach(node => node.setAttribute('aria-pressed', String(node.dataset.mode === preference.mode)));
        body.replaceChildren();
        body.dataset.mode = preference.mode;
        if (preference.mode === 'source') {
          const pre = document.createElement('pre'); const code = document.createElement('code');
          code.textContent = entry.card.content;
          const lang = preference.codeLang;
          if (lang === 'plaintext') code.className = 'nohighlight';
          else if (lang !== 'auto' && window.hljs?.getLanguage(lang)) code.className = 'language-' + lang;
          pre.append(code); body.append(pre);
          if (lang !== 'plaintext' && window.hljs) window.hljs.highlightElement(code);
          onDone?.();
          return;
        }
        // Render into a separate node so an older async preview cannot replace source text.
        const preview = document.createElement('div'); preview.className = 'bm-guest-rendered-preview';
        window.bmRenderContent(preview, entry.card.content, () => {
          if (current !== version || !target.contains(body)) return;
          body.replaceChildren(preview); onDone?.();
        }, {
          title: entry.card.title, notionId: entry.card.notionId, codeLang: preference.codeLang,
          source: preference.mode === 'source', isCurrent: () => current === version && target.contains(body)
        });
        onDone?.();
      }
      renderContent();
    }
    function toggleReader(entry) {
      viewed = viewed === entry.fingerprint ? null : entry.fingerprint;
      renderReader();
    }
    function renderReader() {
      const entry = entries.find(entry => entry.fingerprint === viewed);
      diff.renderSide(Boolean(entry), () => {
        reader.replaceChildren();
        fillContent(reader, entry, () => diff.attachScrolls());
        reader.append(controls(entry));
      }, { clear: () => reader.replaceChildren() });
    }
    function openGuestDialog(entry) {
      const detail = GuestDiffPanel.createDialog({ title: '訪客書籤明細', icon: 'bookmark',
        panelClass: 'bm-guest-dialog', bodyClass: 'bm-guest-dialog-body', scroll: true,
        footerHTML: '<div data-guest-dialog-controls></div>',
        onClose: () => dialogs.delete(detail.dialog),
        restoreFocus: () => [...grid.children].find(tile => tile.dataset.fingerprint === entry.fingerprint)?.focus({ preventScroll: true })
      });
      fillContent(detail.body, entry, detail.updateScroll);
      detail.dialog.querySelector('[data-guest-dialog-controls]').append(controls(entry));
      dialogs.set(detail.dialog, entry);
      detail.show();
    }
    function render() {
      grid.replaceChildren();
      const visible = entries.filter(entry => filter === 'all' || selected.has(entry.fingerprint) === (filter === 'selected'));
      if (!visible.some(entry => entry.fingerprint === viewed)) viewed = null;
      for (const entry of visible) {
        const tile = document.createElement('article'); tile.className = 'bm-card bm-guest-tile';
        tile.tabIndex = 0;
        tile.dataset.fingerprint = entry.fingerprint;
        tile.setAttribute('aria-label', entry.card.title || '未命名書籤');
        tile.setAttribute('aria-haspopup', 'menu');
        const preview = button(entry.card.title || '未命名書籤', () => toggleReader(entry));
        preview.className = 'bm-guest-preview';
        if (entry.card.thumbnail) {
          const image = document.createElement('img'); image.src = entry.card.thumbnail; image.alt = '';
          image.onerror = () => image.remove(); preview.prepend(image);
        }
        const summary = document.createElement('p'); summary.textContent = entry.card.content ? '📝 筆記' : entry.card.url || '';
        tile.append(preview, summary);
        tile.oncontextmenu = event => {
          event.preventDefault(); closeMenu();
          menu = document.createElement('div'); menu.className = 'bm-ctx-menu'; menu.setAttribute('role', 'menu');
          const actions = [
            ['檢視內容', () => openGuestDialog(entry)],
            [selected.has(entry.fingerprint) ? '取消釘選' : '釘選以歸檔', () => {
              if (selected.has(entry.fingerprint)) { selected.delete(entry.fingerprint); removing.delete(entry.fingerprint); }
              else selected.add(entry.fingerprint);
              render();
            }],
            ...(selected.size ? [['歸檔至本機（' + selected.size + '）', () => archive.click()]] : []),
            ['刪除訪客原檔', () => deleteOriginal(entry)]
          ];
          for (const [label, action] of actions) {
            const item = button(label, () => { closeMenu(); action(); }); item.setAttribute('role', 'menuitem'); menu.append(item);
          }
          const bounds = tile.getBoundingClientRect();
          document.body.append(menu);
          menu.style.left = Math.max(0, Math.min(event.clientX || bounds.left, innerWidth - menu.offsetWidth - 8)) + 'px';
          menu.style.top = Math.max(0, Math.min(event.clientY || bounds.top, innerHeight - menu.offsetHeight - 8)) + 'px';
          menu.querySelector('button')?.focus();
        };
        tile.onkeydown = event => {
          if ((event.key === 'Enter' || event.key === ' ') && event.target === tile) { event.preventDefault(); preview.click(); }
        };
        tile.onclick = event => {
          if (!event.target.closest('button, input, label, a, .nice-scrollbar')) toggleReader(entry);
        };
        grid.append(tile);
      }
      panel.querySelector('[data-empty]').hidden = visible.length > 0;
      diff.updateFilters(entries.length, selected.size, filter);
      archive.hidden = upload.hidden = selected.size === 0;
      archive.disabled = upload.disabled = busy;
      archive.textContent = '歸檔至本機（' + selected.size + '）';
      upload.textContent = '上傳至雲端（' + selected.size + '）';
      for (const [dialog, entry] of dialogs) dialog.querySelector('[data-guest-dialog-controls]').replaceChildren(controls(entry));
      renderReader(); layout();
    }
    for (const node of panel.querySelectorAll('[data-filter]')) node.onclick = () => { filter = node.dataset.filter; render(); };
    function removeOriginals(contents) {
      const writes = [];
      for (const [key, raw, source] of AccountStorage.legacyEntries()) {
        if (key !== 'bookmarkData') continue;
        const value = parse(raw);
        const favorites = value.favorites.filter(card => !contents.has(data.guestContent(card, value.themes)));
        if (favorites.length !== value.favorites.length) writes.push([source, raw, JSON.stringify({ ...value, favorites })]);
      }
      const written = [];
      try {
        for (const [key, before, after] of writes) {
          if (localStorage.getItem(key) !== before) throw new Error('訪客資料已變更。');
          localStorage.setItem(key, after); written.push([key, before, after]);
        }
      } catch (error) {
        for (const [key, before, after] of written.reverse()) {
          if (localStorage.getItem(key) === after) localStorage.setItem(key, before);
        }
        throw error;
      }
      return writes.length > 0;
    }
    function deleteOriginal(entry) {
      if (busy) return;
      confirmAction({ message: '確定要刪除訪客原檔「' + (entry.card.title || '未命名書籤') + '」？', confirmText: '刪除' }, async () => {
        if (busy || window.viewMode !== 'bookmark' || !AccountStorage.isActive()) return;
        try { removeOriginals(new Set([content(entry)])); await refresh(); showToast('已刪除訪客原檔。'); }
        catch (error) { showToast('刪除未完成：' + error.message); }
      });
    }
    async function commit(fingerprints, originals) {
      if (busy || window.viewMode !== 'bookmark') return;
      busy = true; render();
      try {
        const changed = await AccountStorage.updateEntries(async () => {
          const current = await list();
          const chosen = current.filter(entry => fingerprints.has(entry.fingerprint));
          if (chosen.length !== fingerprints.size) throw new Error('未歸檔清單已變更，請重新確認。');
          const plan = data.guestPlan(parse(AccountStorage.getItem('bookmarkData')), chosen);
          const next = plan.build(chosen.map(() => 'add'));
          if (!next) return null;
          return [['bookmarkData', JSON.stringify(next)], [receiptKey, JSON.stringify([...new Set([...receipts(), ...fingerprints])])]];
        }, { deferDriveSync: true });
        if (!changed) throw new Error('未歸檔清單已變更，請重新確認。');
        selected.clear(); removing.clear();
        let cleanupError;
        try { if (originals.size) removeOriginals(originals); } catch (error) { cleanupError = error; }
        window.bmLoadData();
        if (window.viewMode === 'bookmark') window.renderBookmarks();
        showToast(cleanupError ? '書籤已歸檔，訪客原檔清理未完成：' + cleanupError.message : '已歸檔 ' + fingerprints.size + ' 筆書籤。');
      } catch (error) { showToast('書籤歸檔未完成：' + error.message); }
      finally { busy = false; await refresh(); render(); }
    }
    archive.onclick = () => {
      if (busy || !selected.size) return;
      const fingerprints = new Set(selected);
      const originals = new Set(entries.filter(entry => fingerprints.has(entry.fingerprint) && removing.has(entry.fingerprint)).map(content));
      if (originals.size) confirmAction({ message: '確定要歸檔，並移除所選訪客原檔？', confirmText: '歸檔並移除' }, () => void commit(fingerprints, originals));
      else void commit(fingerprints, originals);
    };
    upload.onclick = async () => {
      if (busy || !selected.size) return;
      const drive = window.plugins['google-drive'];
      if (!drive?.uploadGuestBookmarks) { showToast('訪客書籤上傳功能尚未載入。'); return; }
      const incoming = entries.filter(entry => selected.has(entry.fingerprint));
      busy = true; render();
      try { await drive.uploadGuestBookmarks(incoming); } finally { busy = false; render(); }
    };
    const refresh = this.refresh = async () => {
      const current = ++request;
      try {
        const next = await list();
        if (current !== request) return;
        entries = next;
        const known = new Set(entries.map(entry => entry.fingerprint));
        for (const fingerprint of selected) if (!known.has(fingerprint)) { selected.delete(fingerprint); removing.delete(fingerprint); }
        const changed = this.count !== entries.length;
        this.count = entries.length;
        if (!entries.length) diff.opened = false;
        if (changed) renderToolbar();
        render();
      } catch (error) { console.warn('無法讀取訪客書籤', error); }
    };
    owner.guestReview.open = async () => {
      if (window.viewMode !== 'bookmark') return false;
      if (diff.opened) { close(); return true; }
      await refresh();
      if (!entries.length || window.viewMode !== 'bookmark') return false;
      diff.open(render);
      return true;
    };
    window.addEventListener('site-data-saved', () => void refresh());
    window.addEventListener('storage', event => { if (event.key === null || /^(site-guest:)?bookmarkData$/.test(event.key)) void refresh(); });
    void refresh();
  }
});
