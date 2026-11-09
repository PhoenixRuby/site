registerPlugin('bookmark-export', {
  icon: window.CARD_ICONS.export,
  label: '匯出', mode: 'bookmark', order: 60, requiresData: true, open: null,

  init() {
    var style = document.createElement('style');
    style.textContent =
      '#bmExportModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);z-index:200;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '#bmExportModalBg.open{opacity:1;pointer-events:all}' +
      '.bm-export-modal{background:var(--surface);border:1px solid var(--border);border-radius:20px 20px 0 0;width:100%;max-width:560px;padding:28px 24px 40px;transform:translateY(40px);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}' +
      '#bmExportModalBg.open .bm-export-modal{transform:translateY(0)}' +
      '.bm-export-list{display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;margin-bottom:20px;padding-right:4px}' +
      '.bm-export-list::-webkit-scrollbar{width:4px}.bm-export-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}' +
      '.bm-export-theme-section{margin-bottom:8px}' +
      '.bm-export-theme-header{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:8px;cursor:pointer;user-select:none;margin-bottom:4px}' +
      '.bm-export-theme-header input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}' +
      '.bm-export-theme-header .bm-export-theme-name{font-size:13px;color:var(--text);font-weight:500;flex:1}' +
      '.bm-export-theme-header .bm-export-theme-count{font-size:11px;color:var(--text-dim)}' +
      '.bm-export-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s,background .15s;user-select:none;margin-left:16px;margin-bottom:3px}' +
      '.bm-export-item:hover{border-color:var(--border);background:var(--surface3)}' +
      '.bm-export-item.selected{border-color:var(--accent);background:rgba(232,255,71,.06)}' +
      '.bm-export-item input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0}' +
      '.bm-export-item-body{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}' +
      '.bm-export-item-name{font-size:13px;color:var(--text)}' +
      '.bm-export-item-url{font-size:10px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.bm-export-result{padding:16px 0;display:flex;flex-direction:column;gap:12px}' +
      '.bm-export-result-ok{color:var(--success);font-weight:600;font-size:15px}' +
      '.bm-export-enc-row{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13px;color:var(--text-dim)}' +
      '.bm-export-enc-row input{width:15px;height:15px;accent-color:var(--accent);cursor:pointer}' +
      '.bm-export-enc-row label{cursor:pointer;user-select:none}';
    document.head.appendChild(style);

    var exportWrapper = document.createElement('div');
    exportWrapper.innerHTML =
      '<div id="bmExportModalBg"><div class="bm-export-modal">' +
        '<div class="modal-header"><h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg> 匯出書籤</h2>' +
        '<button class="close-btn" id="bmExportCloseBtn">✕</button></div>' +
        '<div class="modal-hint">勾選要匯出的書籤，然後點擊匯出</div>' +
        '<div class="bm-export-list" id="bmExportList"></div>' +
        '<div class="modal-quick" id="bmExportQuick"><button class="btn-quick" id="bmExportSelectAllBtn">全選</button><button class="btn-quick" id="bmExportDeselectAllBtn">取消全選</button></div>' +
        '<div class="bm-export-enc-row"><input type="checkbox" id="bmExportEncChk"><label for="bmExportEncChk">🔑 加密匯出（產生金鑰）</label></div>' +
        '<div class="modal-footer" id="bmExportFooter"><button class="btn-reset" id="bmExportCancelBtn">取消</button><button class="btn-confirm" id="bmExportConfirmBtn">匯出所選</button></div>' +
      '</div></div>';
    document.body.appendChild(exportWrapper.firstElementChild);

    var bmExportModalBg = document.getElementById('bmExportModalBg');
    var exportSelections = [];

    function escHtml(s) { return window.bmEscHtml ? window.bmEscHtml(s) : String(s); }

    function renderExportList() {
      var bmData = window.bmGetData();
      var list = document.getElementById('bmExportList');
      list.innerHTML = '';

      var customThemes = bmData.themes.filter(function(t) { return t.id !== 'all'; });
      customThemes.forEach(function(theme) {
        var themeFavs = bmData.favorites.filter(function(f) { return f.themeIds && f.themeIds.indexOf(theme.id) !== -1; });
        if (themeFavs.length === 0) return;
        var section = document.createElement('div');
        section.className = 'bm-export-theme-section';
        var allSelected = themeFavs.every(function(fav) { var idx = bmData.favorites.indexOf(fav); return exportSelections[idx]; });
        var header = document.createElement('div');
        header.className = 'bm-export-theme-header';
        header.innerHTML = '<input type="checkbox" ' + (allSelected ? 'checked' : '') + '><span class="bm-export-theme-name">' + escHtml((theme.icon || '') + ' ' + theme.name) + '</span><span class="bm-export-theme-count">' + themeFavs.length + ' 個書籤</span>';
        var themeCheckbox = header.querySelector('input[type="checkbox"]');
        themeCheckbox.addEventListener('change', function() { themeFavs.forEach(function(fav) { exportSelections[bmData.favorites.indexOf(fav)] = themeCheckbox.checked; }); renderExportList(); });
        header.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; themeCheckbox.checked = !themeCheckbox.checked; themeCheckbox.dispatchEvent(new Event('change')); });
        section.appendChild(header);
        themeFavs.forEach(function(fav) {
          var idx = bmData.favorites.indexOf(fav);
          var el = document.createElement('div');
          el.className = 'bm-export-item' + (exportSelections[idx] ? ' selected' : '');
          el.innerHTML = '<input type="checkbox" ' + (exportSelections[idx] ? 'checked' : '') + '><div class="bm-export-item-body"><div class="bm-export-item-name">' + escHtml(fav.title) + '</div><div class="bm-export-item-url">' + escHtml(fav.url) + '</div></div>';
          el.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; exportSelections[idx] = !exportSelections[idx]; renderExportList(); });
          el.querySelector('input').addEventListener('change', function() { exportSelections[idx] = this.checked; renderExportList(); });
          section.appendChild(el);
        });
        list.appendChild(section);
      });

      var uncategorized = bmData.favorites.filter(function(f) { return !f.themeIds || f.themeIds.length === 0 || !f.themeIds.some(function(tid) { return bmData.themes.find(function(t) { return t.id === tid && t.id !== 'all'; }); }); });
      if (uncategorized.length > 0) {
        var section = document.createElement('div');
        section.className = 'bm-export-theme-section';
        var header = document.createElement('div');
        header.className = 'bm-export-theme-header';
        var allSel = uncategorized.every(function(fav) { return exportSelections[bmData.favorites.indexOf(fav)]; });
        header.innerHTML = '<input type="checkbox" ' + (allSel ? 'checked' : '') + '><span class="bm-export-theme-name">未分類</span><span class="bm-export-theme-count">' + uncategorized.length + ' 個書籤</span>';
        var tc = header.querySelector('input');
        tc.addEventListener('change', function() { uncategorized.forEach(function(fav) { exportSelections[bmData.favorites.indexOf(fav)] = tc.checked; }); renderExportList(); });
        header.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; tc.checked = !tc.checked; tc.dispatchEvent(new Event('change')); });
        section.appendChild(header);
        uncategorized.forEach(function(fav) {
          var idx = bmData.favorites.indexOf(fav);
          var el = document.createElement('div');
          el.className = 'bm-export-item' + (exportSelections[idx] ? ' selected' : '');
          el.innerHTML = '<input type="checkbox" ' + (exportSelections[idx] ? 'checked' : '') + '><div class="bm-export-item-body"><div class="bm-export-item-name">' + escHtml(fav.title) + '</div><div class="bm-export-item-url">' + escHtml(fav.url) + '</div></div>';
          el.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; exportSelections[idx] = !exportSelections[idx]; renderExportList(); });
          el.querySelector('input').addEventListener('change', function() { exportSelections[idx] = this.checked; renderExportList(); });
          section.appendChild(el);
        });
        list.appendChild(section);
      }
    }

    function confirmExport() {
      var bmData = window.bmGetData();
      var selectedFavs = bmData.favorites.filter(function(_, i) { return exportSelections[i]; });
      if (selectedFavs.length === 0) { showToast('請至少選擇一個項目'); return; }
      var usedThemeIds = new Set();
      selectedFavs.forEach(function(f) { (f.themeIds || []).forEach(function(tid) { usedThemeIds.add(tid); }); });
      var exportThemes = bmData.themes.filter(function(t) { return t.id !== 'all' && usedThemeIds.has(t.id); });
      var exportObj = { themes: JSON.parse(JSON.stringify(exportThemes)), favorites: JSON.parse(JSON.stringify(selectedFavs)) };
      var str = JSON.stringify(exportObj, null, 2);
      var fileName = '書籤_' + new Date().toISOString().slice(0, 10);
      if (exportObj.favorites.length === 1) fileName += '_' + exportObj.favorites[0].title.replace(/[\/\\:*?"<>|]/g, '');
      var useEnc = document.getElementById('bmExportEncChk').checked;

      function doDownload(content, name) {
        var blob = new Blob([content], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
        document.getElementById('bmExportList').innerHTML = '<div class="bm-export-result"><div class="bm-export-result-ok">✓ 已匯出 ' + selectedFavs.length + ' 個書籤' + (useEnc ? '（已加密）' : '') + '</div></div>';
        var quickDiv = document.getElementById('bmExportQuick');
        var footerDiv = document.getElementById('bmExportFooter');
        var encRow = document.querySelector('.bm-export-enc-row');
        if (quickDiv) quickDiv.style.display = 'none';
        if (encRow) encRow.style.display = 'none';
        if (footerDiv) footerDiv.innerHTML = '<button class="btn-confirm" id="bmExportDoneBtn" style="flex:1">完成</button>';
        document.getElementById('bmExportDoneBtn').addEventListener('click', function() {
          if (quickDiv) quickDiv.style.display = '';
          if (encRow) encRow.style.display = '';
          bmExportModalBg.classList.remove('open');
        });
      }

      if (useEnc) {
        window.CryptoExport.encrypt(str).then(function(result) {
          window.showExportKeyModal(result.keyBase64, function() {
            doDownload(result.json, fileName + '.enc.json');
          });
        });
      } else {
        doDownload(str, fileName + '.json');
      }
    }

    function openExport() {
      var bmData = window.bmGetData();
      exportSelections = bmData.favorites.map(function() { return true; });
      var quickDiv = document.getElementById('bmExportQuick');
      var footerDiv = document.getElementById('bmExportFooter');
      if (quickDiv) quickDiv.style.display = '';
      if (footerDiv) footerDiv.innerHTML = '<button class="btn-reset" id="bmExportCancelBtn">取消</button><button class="btn-confirm" id="bmExportConfirmBtn">匯出所選</button>';
      document.getElementById('bmExportCancelBtn').addEventListener('click', function() { bmExportModalBg.classList.remove('open'); });
      document.getElementById('bmExportConfirmBtn').addEventListener('click', confirmExport);
      renderExportList();
      bmExportModalBg.classList.add('open');
    }

    var closeExportModal = function() { bmExportModalBg.classList.remove('open'); };
    bindPopup(bmExportModalBg, closeExportModal);
    document.getElementById('bmExportSelectAllBtn').addEventListener('click', function() { var bmData = window.bmGetData(); exportSelections = bmData.favorites.map(function() { return true; }); renderExportList(); });
    document.getElementById('bmExportDeselectAllBtn').addEventListener('click', function() { var bmData = window.bmGetData(); exportSelections = bmData.favorites.map(function() { return false; }); renderExportList(); });
    document.getElementById('bmExportCancelBtn').addEventListener('click', closeExportModal);
    document.getElementById('bmExportConfirmBtn').addEventListener('click', confirmExport);

    this.open = openExport;
  }
});
