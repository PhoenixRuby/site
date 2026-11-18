registerPlugin('bookmark-export', {
  icon: 'export',
  label: '匯出',
  order: 60,
  mode: 'bookmark',
  hideToolbar: false,
  requiresData: true,
  open: null,

  load() {
	this.init();
  },

  init() {
    var exportWrapper = document.createElement('div');
    exportWrapper.innerHTML =
      `<dialog id="bmExportModalBg" class="app-dialog"><div class="bm-export-modal app-dialog-panel-medium">
        <header class="app-modal-header">
          <span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg></span>
          <div class="app-modal-header-info"><h2 class="app-modal-header-title">匯出書籤</h2><p class="app-modal-header-subtitle">勾選要匯出的書籤，然後點擊匯出</p></div>
          <button type="button" class="app-modal-header-close" id="bmExportCloseBtn" aria-label="關閉匯出">✕</button>
        </header>
        <div class="app-dialog-body">
          <div class="bm-export-tools" id="bmExportQuick"><input type="search" id="bmExportSearch" placeholder="搜尋書籤…" aria-label="搜尋書籤標題或網址"><span id="bmExportCount" aria-live="polite"></span><button type="button" class="btn-quick" id="bmExportSelectAllBtn">全選</button><button type="button" class="btn-quick" id="bmExportDeselectAllBtn">取消全選</button></div>
          <div class="bm-export-list" id="bmExportList"></div>
          <p id="bmExportEmpty" role="status" hidden>找不到符合的書籤</p>
          <p class="bm-export-result-ok" id="bmExportResult" role="status" hidden></p>
        </div>
        <footer class="app-dialog-footer">
          <button type="button" class="btn-reset" id="bmExportCancelBtn">取消</button>
          <fieldset class="bm-export-format" id="bmExportFormatRow"><legend>格式</legend>
            <label><input type="radio" name="bmExportFormat" value="json" id="bmExportJson" checked> JSON</label>
            <label><input type="radio" name="bmExportFormat" value="html" id="bmExportHtml"> HTML</label>
          </fieldset>
          <label class="bm-export-enc-row" id="bmExportEncRow"><input type="checkbox" id="bmExportEncChk">加密匯出</label>
          <button type="button" class="btn-confirm" id="bmExportConfirmBtn">匯出書籤</button>
          <button type="button" class="btn-confirm" id="bmExportDoneBtn" hidden>完成</button>
        </footer>
      </div></dialog>`;
    document.body.appendChild(exportWrapper.firstElementChild);

    var bmExportModalBg = document.getElementById('bmExportModalBg');
    const list = document.getElementById('bmExportList');
    const count = document.getElementById('bmExportCount');
    const search = document.getElementById('bmExportSearch');
    const empty = document.getElementById('bmExportEmpty');
    const selectAll = document.getElementById('bmExportSelectAllBtn');
    const deselectAll = document.getElementById('bmExportDeselectAllBtn');
    const tools = document.getElementById('bmExportQuick');
    const jsonFormat = document.getElementById('bmExportJson');
    const htmlFormat = document.getElementById('bmExportHtml');
    const formatRow = document.getElementById('bmExportFormatRow');
    const encrypt = document.getElementById('bmExportEncChk');
    const encryptRow = document.getElementById('bmExportEncRow');
    const confirmBtn = document.getElementById('bmExportConfirmBtn');
    const cancelBtn = document.getElementById('bmExportCancelBtn');
    const doneBtn = document.getElementById('bmExportDoneBtn');
    const resultText = document.getElementById('bmExportResult');
    let exportSelections = [];
    let groups = [];
    let pendingEncryption = null;
    let pendingHtml = null;

    function syncSelection() {
      groups.forEach(({ checkbox, rows, countLabel }) => {
        const visibleRows = rows.filter(({ row }) => !row.hidden);
        let selected = 0;
        rows.forEach(({ input, index }) => {
          input.checked = exportSelections[index];
          if (input.checked) selected++;
        });
        const visibleSelected = visibleRows.filter(({ input }) => input.checked).length;
        checkbox.checked = visibleRows.length > 0 && visibleSelected === visibleRows.length;
        checkbox.indeterminate = visibleSelected > 0 && visibleSelected < visibleRows.length;
        countLabel.textContent = selected + ' / ' + rows.length + ' 已選';
      });
      const selected = exportSelections.filter(Boolean).length;
      count.textContent = '已選 ' + selected + ' / ' + exportSelections.length + ' 個書籤';
      const html = htmlFormat.checked;
      encryptRow.hidden = html;
      formatRow.disabled = !!pendingHtml || !!pendingEncryption;
      confirmBtn.textContent = html
        ? '匯出 ' + selected + ' 個書籤為 HTML' + (selected > 1 ? '（ZIP）' : '')
        : (encrypt.checked ? '加密匯出 ' : '匯出 ') + selected + ' 個書籤';
      confirmBtn.disabled = !selected || !!pendingEncryption || !!pendingHtml;
    }

    function filterExportList() {
      const query = search.value.trim().toLocaleLowerCase();
      let matches = 0;
      groups.forEach(group => {
        group.rows.forEach(({ row, searchText }) => { row.hidden = !searchText.includes(query); });
        const visible = group.rows.filter(({ row }) => !row.hidden).length;
        group.section.hidden = visible === 0;
        updateGroupExpansion(group);
        matches += visible;
      });
      empty.hidden = matches > 0;
      selectAll.textContent = query ? '全選搜尋結果' : '全選';
      deselectAll.textContent = query ? '取消選取搜尋結果' : '取消全選';
      selectAll.disabled = deselectAll.disabled = !matches;
      syncSelection();
    }

    function updateGroupExpansion(group) {
      const expanded = search.value.trim() ? group.searchExpanded : group.expanded;
      group.items.hidden = !expanded;
      group.toggle.textContent = expanded ? '▾' : '▸';
      group.toggle.setAttribute('aria-expanded', String(expanded));
    }

    function setMatchingSelection(checked) {
      groups.forEach(({ rows }) => rows.forEach(({ row, index }) => {
        if (!row.hidden) exportSelections[index] = checked;
      }));
      syncSelection();
    }

    function urlSummary(url) {
      if (!url) return '無網址';
      try { return new URL(url).hostname || url; }
      catch (_) { return url; }
    }

    function renderExportList({ themes, favorites }) {
      list.replaceChildren();
      groups = [];
      const themeGroups = new Map(themes.filter(theme => theme.id !== 'all').map(theme => [
        theme.id, { name: [theme.icon, theme.name].filter(Boolean).join(' '), entries: [] }
      ]));
      const uncategorized = { name: '未分類', entries: [] };
      favorites.forEach((fav, index) => {
        const memberships = new Set((fav.themeIds || []).map(id => themeGroups.get(id)).filter(Boolean));
        if (!memberships.size) memberships.add(uncategorized);
        memberships.forEach(group => group.entries.push({ fav, index }));
      });

      [...themeGroups.values(), uncategorized].forEach(({ name, entries }, groupIndex) => {
        if (!entries.length) return;
        const section = document.createElement('section');
        const rowsId = 'bmExportGroup' + groupIndex;
        section.className = 'bm-export-theme-section';
        section.innerHTML =
          '<div class="bm-export-theme-header"><button type="button" class="btn-quick bm-export-toggle" aria-expanded="true" aria-controls="' + rowsId + '">▾</button>' +
          '<label><input type="checkbox"><span class="bm-export-theme-name"></span><span class="bm-export-theme-count"></span></label></div>' +
          '<div class="bm-export-items" id="' + rowsId + '"></div>';
        const toggle = section.querySelector('button');
        const checkbox = section.querySelector('input');
        const items = section.querySelector('.bm-export-items');
        const countLabel = section.querySelector('.bm-export-theme-count');
        section.querySelector('.bm-export-theme-name').textContent = name;
        toggle.setAttribute('aria-label', '展開或收合 ' + name);
        const group = { section, items, toggle, checkbox, countLabel, expanded: true, searchExpanded: true };
        toggle.addEventListener('click', () => {
          const state = search.value.trim() ? 'searchExpanded' : 'expanded';
          group[state] = !group[state];
          updateGroupExpansion(group);
        });
        checkbox.addEventListener('change', () => {
          group.rows.forEach(({ row, index }) => {
            if (!row.hidden) exportSelections[index] = checkbox.checked;
          });
          syncSelection();
        });

        group.rows = entries.map(({ fav, index }) => {
          const row = document.createElement('div');
          row.className = 'bm-export-item';
          row.innerHTML =
            '<label><input type="checkbox"><span class="bm-export-item-body"><span class="bm-export-item-heading"><span class="bm-export-item-name"></span><span class="bm-export-item-type"></span></span></span></label>';
          const input = row.querySelector('input');
          const isNote = Boolean(fav.content) || !fav.url;
          const typeLabel = isNote ? '筆記' : '網址';
          const type = row.querySelector('.bm-export-item-type');
          type.textContent = typeLabel;
          type.dataset.kind = isNote ? 'note' : 'url';
          row.querySelector('.bm-export-item-name').textContent = fav.title;
          if (!isNote) {
            const summary = document.createElement('span');
            summary.className = 'bm-export-item-url';
            summary.textContent = urlSummary(fav.url);
            row.querySelector('.bm-export-item-body').appendChild(summary);
            const details = document.createElement('details');
            details.className = 'bm-export-address';
            details.innerHTML = '<summary>完整網址</summary><span></span>';
            details.querySelector('span').textContent = fav.url;
            row.appendChild(details);
          }
          input.addEventListener('change', () => {
            exportSelections[index] = input.checked;
            syncSelection();
          });
          items.appendChild(row);
          const searchText = [fav.title, typeLabel, isNote ? '' : fav.url].join(' ').toLocaleLowerCase();
          return { input, index, row, searchText };
        });

        groups.push(group);
        list.appendChild(section);
      });
      filterExportList();
    }

    function showResult(message) {
      const complete = Boolean(message);
      resultText.hidden = !complete;
      resultText.textContent = message;
      tools.hidden = list.hidden = formatRow.hidden = cancelBtn.hidden = confirmBtn.hidden = complete;
      encryptRow.hidden = complete || htmlFormat.checked;
      doneBtn.hidden = !complete;
      if (complete) {
        empty.hidden = true;
        doneBtn.focus();
      }
    }

    async function confirmExport() {
      var bmData = window.bmGetData();
      var selectedFavs = bmData.favorites.filter(function(_, i) { return exportSelections[i]; });
      if (selectedFavs.length === 0) { showToast('請至少選擇一個項目'); return; }
      if (htmlFormat.checked) {
        const request = new AbortController();
        pendingHtml = request;
        syncSelection();
        try {
          await window.plugins.bookmark.exportHtml(selectedFavs.map(fav => ({ ...fav })), request.signal);
          if (pendingHtml === request) showResult('✓ 已匯出 ' + selectedFavs.length + ' 個書籤的 HTML');
        } catch (_) {
          if (pendingHtml === request) showToast('HTML 匯出失敗，請再試一次');
        } finally {
          if (pendingHtml === request) {
            pendingHtml = null;
            if (!confirmBtn.hidden) syncSelection();
          }
        }
        return;
      }
      var usedThemeIds = new Set();
      selectedFavs.forEach(function(f) { (f.themeIds || []).forEach(function(tid) { usedThemeIds.add(tid); }); });
      var exportThemes = bmData.themes.filter(function(t) { return t.id !== 'all' && usedThemeIds.has(t.id); });
      var exportObj = { themes: JSON.parse(JSON.stringify(exportThemes)), favorites: JSON.parse(JSON.stringify(selectedFavs)) };
      var str = JSON.stringify(exportObj, null, 2);
      var fileName = '書籤_' + new Date().toISOString().slice(0, 10);
      if (exportObj.favorites.length === 1) fileName += '_' + exportObj.favorites[0].title.replace(/[\/\\:*?"<>|]/g, '');
      var useEnc = encrypt.checked;

      function doDownload(content, name) {
        var blob = new Blob([content], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
        showResult('✓ 已匯出 ' + selectedFavs.length + ' 個書籤' + (useEnc ? '（已加密）' : ''));
      }

      if (useEnc) {
        const request = {};
        pendingEncryption = request;
        syncSelection();
        window.CryptoExport.encrypt(str).then(function(result) {
          if (pendingEncryption !== request) return;
          pendingEncryption = null;
          syncSelection();
          window.showExportKeyModal(result.keyBase64, function() {
            doDownload(result.json, fileName + '.enc.json');
          });
        }, function() {
          if (pendingEncryption !== request) return;
          pendingEncryption = null;
          syncSelection();
          showToast('加密匯出失敗，請再試一次');
        });
      } else {
        doDownload(str, fileName + '.json');
      }
    }

    function openExport() {
      if (bmExportModalBg.open) return;
      const bmData = window.bmGetData();
      exportSelections = bmData.favorites.map(() => true);
      search.value = '';
      jsonFormat.checked = true;
      showResult('');
      renderExportList(bmData);
      list.scrollTop = 0;
      ModalManager.showDialog(bmExportModalBg, closeExportModal);
    }

    function closeExportModal() {
      pendingHtml?.abort();
      pendingHtml = null;
      pendingEncryption = null;
      ModalManager.closeDialog(bmExportModalBg);
    }

    bmExportModalBg.addEventListener('click', e => { if (e.target === bmExportModalBg) closeExportModal(); });
    document.getElementById('bmExportCloseBtn').addEventListener('click', closeExportModal);
    search.addEventListener('input', () => {
      groups.forEach(group => { group.searchExpanded = true; });
      filterExportList();
    });
    selectAll.addEventListener('click', () => setMatchingSelection(true));
    deselectAll.addEventListener('click', () => setMatchingSelection(false));
    formatRow.addEventListener('change', syncSelection);
    encrypt.addEventListener('change', syncSelection);
    cancelBtn.addEventListener('click', closeExportModal);
    confirmBtn.addEventListener('click', confirmExport);
    doneBtn.addEventListener('click', closeExportModal);

    this.open = openExport;
  }
});
