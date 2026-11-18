registerPlugin('bookmark-import', {
  icon: 'import',
  label: '匯入', 
  order: 70, 
  mode: 'bookmark', 
  hideToolbar: false,
  open: null,

  load() {
	this.init();
  },
  
  init(){
    var importWrapper = document.createElement('div');
    importWrapper.innerHTML =
      '<dialog id="bmImportModalBg" class="app-dialog"><div class="bm-import-modal app-dialog-panel-medium">' +
        '<header class="app-modal-header">' +
          '<span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></span>' +
          '<div class="app-modal-header-info"><h2 class="app-modal-header-title">匯入書籤</h2><p class="app-modal-header-subtitle">選擇 JSON 檔案或拖曳至下方區域</p></div>' +
          '<button type="button" class="app-modal-header-close" id="bmImportCloseBtn" aria-label="關閉匯入">✕</button>' +
        '</header>' +
        '<div class="app-dialog-body">' +
        '<div class="bm-import-drop" id="bmImportDrop">📁 點擊選擇檔案 或 拖曳 JSON 至此</div>' +
        '<input type="file" id="bmImportFileInput" accept=".json" style="display:none">' +
        '<div class="bm-import-analysis" id="bmImportAnalysis"></div>' +
        '</div>' +
        '<footer class="app-dialog-footer"><button class="btn-reset" id="bmImportCancelBtn">取消</button><button class="btn-confirm" id="bmImportConfirmBtn" disabled>確認匯入</button></footer>' +
      '</div></dialog>';
    document.body.appendChild(importWrapper.firstElementChild);

    var bmImportModalBg = document.getElementById('bmImportModalBg');
    var bmImportDrop = document.getElementById('bmImportDrop');
    var bmImportFileInput = document.getElementById('bmImportFileInput');
    var bmImportAnalysis = document.getElementById('bmImportAnalysis');
    var bmImportConfirmBtn = document.getElementById('bmImportConfirmBtn');
    var importPendingData = null;
    var importDupActions = {};  // idx → 'add'|'overwrite'|'skip'
    var importDupInfo = {};     // idx → { dupUrl: existIdx|null, dupId: existIdIdx|null }

    function openImport() {
      importPendingData = null;
      importDupActions = {};
      importDupInfo = {};
      bmImportAnalysis.style.display = 'none';
      bmImportAnalysis.innerHTML = '';
      bmImportConfirmBtn.disabled = true;
      bmImportDrop.textContent = '📁 點擊選擇檔案 或 拖曳 JSON 至此';
      bmImportDrop.style.display = '';
      ModalManager.showDialog(bmImportModalBg, closeImportModal);
    }

    function handleImportFile(file) {
      if (!/\.json$/i.test(file.name)) { showImportError('請選擇 .json 格式的檔案。\n\n目前選擇的檔案：' + file.name); return; }
      importPendingData = null;
      bmImportAnalysis.style.display = 'none';
      bmImportConfirmBtn.disabled = true;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var rawText = ev.target.result;
        if (window.CryptoExport && window.CryptoExport.isEncrypted(rawText)) {
          window.showDecryptModal(rawText, function(plain) { processImportText(plain, file.name); });
          return;
        }
        processImportText(rawText, file.name);
      };
      reader.onerror = function() { showImportError('無法讀取檔案：' + file.name); };
      reader.readAsText(file);
    }

    function processImportText(rawText, fileName) {
        try {
          var parsed = JSON.parse(rawText);
          if (!parsed || !parsed.themes || !parsed.favorites) {
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].itemlist) { showImportError('這是「站台卡片」格式，無法匯入至書籤。\n\n請在站台頁面使用匯入功能。'); return; }
            showImportError('JSON 格式不正確：缺少必要欄位 themes 或 favorites。\n\n請確認是由本工具匯出的書籤 JSON 檔。'); return;
          }
          if (!Array.isArray(parsed.favorites) || !Array.isArray(parsed.themes)) { showImportError('JSON 格式不正確：favorites 或 themes 欄位型別有誤。'); return; }
          if (!parsed.favorites.length && !parsed.themes.some(function(theme) { return theme && theme.id && theme.id !== 'all'; })) {
            showImportError('這個檔案沒有可匯入的書籤或主題。');
            return;
          }
          importPendingData = parsed;
          importDupActions = {};
          importDupInfo = {};
          bmImportDrop.textContent = '✅ 已讀取：' + fileName;
          showImportAnalysis(parsed);
        } catch (err) { showImportError('JSON 解析失敗，檔案可能已損毀或非有效 JSON 格式。\n\n錯誤：' + err.message); }
    }

    function showImportAnalysis(importObj) {
      var bmData = window.bmGetData();
      bmImportAnalysis.innerHTML = '';
      bmImportAnalysis.style.display = 'flex';

      // Build lookup maps (against existing data)
      var existingUrls = {}, existingIds = {};
      bmData.favorites.forEach(function(f, i) {
        if (f.url) existingUrls[f.url] = i;
        if (f.id)  existingIds[f.id]  = i;
      });
      // Also track IDs seen so far within the import file itself
      var seenImportIds = {};

      // Build theme name map from imported data
      var importThemeMap = {};
      (importObj.themes || []).forEach(function(t) { importThemeMap[t.id] = t.name || t.id; });

      var listDiv = document.createElement('div');
      listDiv.className = 'bm-import-card-list';

      importObj.favorites.forEach(function(fav, idx) {
        var dupUrlIdx = (fav.url && existingUrls.hasOwnProperty(fav.url)) ? existingUrls[fav.url] : null;
        var dupIdIdx  = (fav.id  && existingIds.hasOwnProperty(fav.id))   ? existingIds[fav.id]   : null;
        // Check duplicate ID within the import file itself
        var dupIdInFile = (fav.id && seenImportIds.hasOwnProperty(fav.id));
        if (fav.id) seenImportIds[fav.id] = idx;
        if (dupIdInFile) dupIdIdx = -1; // -1 = intra-file dup (no existing index to overwrite)
        var isDup = dupUrlIdx !== null || dupIdIdx !== null;
        importDupInfo[idx] = { dupUrl: dupUrlIdx, dupId: dupIdIdx, dupIdInFile: dupIdInFile };

        var dupType = (!isDup) ? 'new'
          : (dupUrlIdx !== null && dupIdIdx !== null) ? 'both'
          : (dupUrlIdx !== null) ? 'url'
          : 'id';

        importDupActions[idx] = isDup ? 'skip' : 'add';

        var el = document.createElement('div');
        el.className = 'bm-import-card-item';
        if (dupType === 'new')   el.classList.add('bm-import-card-new');
        if (dupType === 'url')   el.classList.add('bm-import-card-dup');
        if (dupType === 'id')    el.classList.add('bm-import-card-dup-id');
        if (dupType === 'both')  el.classList.add('bm-import-card-dup-both');

        var labelText = dupType === 'new'  ? '新項目'
          : dupType === 'url'  ? '重複 URL'
          : dupType === 'id'   ? (dupIdInFile ? '重複 ID（檔案內）' : '重複 ID')
          : '重複 URL + ID';

        // Theme tags from imported data
        var themeIds = fav.themeIds || (fav.themeId ? [fav.themeId] : []);
        var themeTagsHtml = '';
        if (themeIds.length) {
          themeTagsHtml = '<div class="bm-import-card-themes">' +
            themeIds.map(function(tid) {
              var name = importThemeMap[tid] || tid;
              return '<span class="bm-import-card-theme-tag">' + AppUtils.escHtml(name) + '</span>';
            }).join('') + '</div>';
        }

        var actionButtons = isDup
          ? '<div class="bm-import-action"><button class="bm-imp-add" data-idx="' + idx + '">新建</button><button class="bm-imp-overwrite" data-idx="' + idx + '">覆蓋</button><button class="bm-imp-skip active-skip" data-idx="' + idx + '">✓ 跳過</button></div>'
          : '<div class="bm-import-action"><button class="bm-imp-add active-add" data-idx="' + idx + '">✓ 新建</button><button class="bm-imp-skip" data-idx="' + idx + '">跳過</button></div>';

        el.innerHTML =
          '<div class="bm-import-card-info">' +
            '<div class="bm-import-card-title">' + AppUtils.escHtml(fav.title) + '</div>' +
            '<div class="bm-import-card-url">' + AppUtils.escHtml(fav.url || '') + '</div>' +
            '<div class="bm-import-card-label">' + labelText + '</div>' +
            themeTagsHtml +
          '</div>' + actionButtons;

        listDiv.appendChild(el);
      });

      listDiv.addEventListener('click', function(e) {
        var btn = e.target.closest('.bm-imp-add, .bm-imp-skip, .bm-imp-overwrite');
        if (!btn) return;
        var idx = parseInt(btn.dataset.idx);
        var row = btn.closest('.bm-import-action');
        var card = btn.closest('.bm-import-card-item');
        row.querySelectorAll('button').forEach(function(b) {
          b.classList.remove('active', 'active-skip', 'active-add');
          b.textContent = b.textContent.replace('✓ ', '');
        });
        if (btn.classList.contains('bm-imp-add')) {
          importDupActions[idx] = 'add';
          btn.classList.add('active-add'); btn.textContent = '✓ 新建';
          card.classList.remove('bm-import-card-skipped', 'bm-dup-overwrite');
        } else if (btn.classList.contains('bm-imp-overwrite')) {
          importDupActions[idx] = 'overwrite';
          btn.classList.add('active'); btn.textContent = '✓ 覆蓋';
          card.classList.add('bm-dup-overwrite'); card.classList.remove('bm-import-card-skipped');
        } else {
          importDupActions[idx] = 'skip';
          btn.classList.add('active-skip'); btn.textContent = '✓ 跳過';
          card.classList.add('bm-import-card-skipped'); card.classList.remove('bm-dup-overwrite');
        }
      });

      bmImportAnalysis.appendChild(listDiv);
      bmImportConfirmBtn.disabled = false;
    }

    function confirmImport() {
      if (!importPendingData) return;
      var bmData = window.bmGetData();
      var addedThemes = 0;
      var existingThemeIds = new Set(bmData.themes.map(function(t) { return t.id; }));
      importPendingData.themes.forEach(function(t) {
        if (!t || !t.id || t.id === 'all' || existingThemeIds.has(t.id)) return;
        bmData.themes.push(t);
        existingThemeIds.add(t.id);
        addedThemes++;
      });
      importPendingData.favorites.forEach(function(f) {
        if (!f.themeIds) { f.themeIds = f.themeId ? [f.themeId] : []; delete f.themeId; }
      });
      var addedCount = 0, overwrittenCount = 0, skippedCount = 0;
      importPendingData.favorites.forEach(function(fav, idx) {
        var info = importDupInfo[idx] || {};
        var action = importDupActions[idx] || 'skip';
        // Prefer URL match; fall back to ID match (skip -1 = intra-file dup, no target to overwrite)
        var existIdx = info.dupUrl !== null ? info.dupUrl
          : (info.dupId !== null && info.dupId >= 0) ? info.dupId
          : undefined;
        if (existIdx !== undefined) {
          if (action === 'overwrite') {
            bmData.favorites[existIdx] = fav;
            overwrittenCount++;
          } else if (action === 'add') {
            // Always regenerate ID to avoid collision
            fav.id = 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            bmData.favorites.push(fav);
            addedCount++;
          } else {
            skippedCount++;
          }
        } else {
          if (action === 'add') {
            if (!fav.id) fav.id = 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            bmData.favorites.push(fav);
            addedCount++;
          } else {
            skippedCount++;
          }
        }
      });
      if (addedThemes || addedCount || overwrittenCount) { window.bmSaveData(); window.renderBookmarks(); }
      ModalManager.closeDialog(bmImportModalBg);
      var parts = [];
      if (addedCount > 0) parts.push('新增 ' + addedCount + ' 個');
      if (overwrittenCount > 0) parts.push('覆蓋 ' + overwrittenCount + ' 個');
      if (skippedCount > 0) parts.push('跳過 ' + skippedCount + ' 個');
      if (addedThemes) parts.push('新增 ' + addedThemes + ' 個主題');
      showToast(parts.length ? '✓ ' + parts.join('、') : '沒有新的書籤或主題可匯入');
    }

    var closeImportModal = function() { ModalManager.closeDialog(bmImportModalBg); };
    bmImportModalBg.addEventListener('click', function(e) { if (e.target === bmImportModalBg) closeImportModal(); });
     document.getElementById('bmImportCloseBtn').addEventListener('click', closeImportModal);
    bmImportDrop.addEventListener('click', function() { bmImportFileInput.click(); });
    bmImportDrop.addEventListener('dragover', function(e) { e.preventDefault(); bmImportDrop.classList.add('drag-over'); });
    bmImportDrop.addEventListener('dragleave', function() { bmImportDrop.classList.remove('drag-over'); });
    bmImportDrop.addEventListener('drop', function(e) { e.preventDefault(); bmImportDrop.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]); });
    bmImportFileInput.addEventListener('change', function(e) { if (e.target.files[0]) handleImportFile(e.target.files[0]); bmImportFileInput.value = ''; });
    document.getElementById('bmImportCancelBtn').addEventListener('click', closeImportModal);
    bmImportConfirmBtn.addEventListener('click', confirmImport);

    // ── Full-page drop zone overlay (shown when no bookmarks + dragging) ──
    var dropOverlay = document.createElement('div');
    dropOverlay.id = 'bmImportDropOverlay';
    dropOverlay.innerHTML = '<div class="bm-drop-overlay-inner">📁 放開以匯入書籤 JSON</div>';
    document.body.appendChild(dropOverlay);
    var dropOverlayStyle = document.createElement('style');
    dropOverlayStyle.textContent =
      '#bmImportDropOverlay{position:fixed;inset:0;z-index:190;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);pointer-events:none}' +
      '#bmImportDropOverlay.active{display:flex}' +
      '.bm-drop-overlay-inner{border:3px dashed var(--accent);border-radius:16px;padding:48px 64px;color:var(--accent);font-size:1.4rem;font-weight:600;background:rgba(0,0,0,.6);pointer-events:none;text-align:center}';
    document.head.appendChild(dropOverlayStyle);

    var dragCounter = 0;
    function clearPageDropOverlay() {
      dragCounter = 0;
      dropOverlay.classList.remove('active');
    }
    function isFileDrag(e) {
      var types = e.dataTransfer && e.dataTransfer.types;
      return !!(types && Array.prototype.indexOf.call(types, 'Files') !== -1);
    }
    function shouldHandleDrop(e) {
      if (window.viewMode !== 'bookmark' ||
          document.querySelector('dialog:modal') ||
          !isFileDrag(e)) return false;
      return true;
    }
    document.addEventListener('dragenter', function(e) {
      if (!shouldHandleDrop(e)) { clearPageDropOverlay(); return; }
      dragCounter++;
      dropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function(e) {
      if (!shouldHandleDrop(e)) { clearPageDropOverlay(); return; }
      dragCounter = Math.max(0, dragCounter - 1);
      if (!dragCounter) dropOverlay.classList.remove('active');
    });
    document.addEventListener('dragover', function(e) {
      if (!shouldHandleDrop(e)) { clearPageDropOverlay(); return; }
      e.preventDefault();
    });
    document.addEventListener('drop', function(e) {
      var allowed = shouldHandleDrop(e);
      clearPageDropOverlay();
      if (!allowed) return;
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      e.preventDefault();
      openImport();
      handleImportFile(file);
    });
    document.addEventListener('dragend', clearPageDropOverlay);

    this.open = openImport;
  }
});
