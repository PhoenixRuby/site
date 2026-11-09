registerPlugin('bookmark-import', {
  icon: window.CARD_ICONS.import,
  label: '匯入', mode: 'bookmark', order: 70, open: null,

  init() {
    var style = document.createElement('style');
    style.textContent =
      '#bmImportModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '#bmImportModalBg.open{opacity:1;pointer-events:all}' +
      '.bm-import-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:min(92vw,1600px);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:16px;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}' +
      '#bmImportModalBg.open .bm-import-modal{transform:translateY(0) scale(1)}' +
      '.bm-import-drop{border:2px dashed var(--border);border-radius:10px;padding:36px 20px;text-align:center;cursor:pointer;color:var(--text-dim);font-size:.9rem;transition:border-color .2s,background .2s}' +
      '.bm-import-drop:hover,.bm-import-drop.drag-over{border-color:var(--accent);background:rgba(0,229,255,.04);color:var(--text)}' +
      '.bm-import-analysis{display:none;flex-direction:column;gap:10px}' +
      '.bm-import-card-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:6px;max-height:60vh;overflow-y:auto;padding-right:4px}' +
      '.bm-import-card-list::-webkit-scrollbar{width:4px}.bm-import-card-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}' +
      '.bm-import-card-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:flex-start;gap:10px;font-size:13px}' +
      '.bm-import-card-item .bm-import-card-info{flex:1;min-width:0}' +
      '.bm-import-card-item .bm-import-card-title{font-weight:500;color:var(--text)}' +
      '.bm-import-card-item .bm-import-card-url{font-size:10px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.bm-import-card-item .bm-import-card-label{font-size:10px;font-weight:600;margin-top:2px}' +
      '.bm-import-card-themes{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}' +
      '.bm-import-card-theme-tag{font-size:10px;padding:1px 6px;border-radius:4px;background:var(--surface);border:1px solid var(--border);color:var(--muted)}' +
      '.bm-import-card-new{border-color:var(--success)}.bm-import-card-new .bm-import-card-label{color:var(--success)}' +
      '.bm-import-card-new.bm-import-card-skipped{border-color:var(--border)}.bm-import-card-new.bm-import-card-skipped .bm-import-card-label{color:var(--text-dim)}' +
      '.bm-import-card-dup{border-color:#ff9800}.bm-import-card-dup .bm-import-card-label{color:#ff9800}' +
      '.bm-import-card-dup-id{border-color:#e040fb}.bm-import-card-dup-id .bm-import-card-label{color:#e040fb}' +
      '.bm-import-card-dup-both{border-color:#ff5252}.bm-import-card-dup-both .bm-import-card-label{color:#ff5252}' +
      '.bm-import-card-dup.bm-dup-overwrite,.bm-import-card-dup-id.bm-dup-overwrite,.bm-import-card-dup-both.bm-dup-overwrite{border-color:var(--accent)}.bm-dup-overwrite .bm-import-card-label{color:var(--accent)}' +
      '.bm-import-action{display:flex;gap:6px;flex-shrink:0}' +
      '.bm-import-action button{padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-dim);transition:background .15s}' +
      '.bm-import-action button.active-add{border-color:var(--success);color:var(--success);background:rgba(0,168,84,.1)}' +
      '.bm-import-action button.active{border-color:var(--accent);color:var(--accent);background:rgba(81,203,238,.1)}' +
      '.bm-import-action button.active-skip{border-color:#ff9800;color:#ff9800;background:rgba(255,152,0,.1)}' +
      '.bm-import-actions{display:flex;gap:10px}.bm-import-actions .btn-reset{flex:0}.bm-import-actions .btn-confirm{flex:1}';
    document.head.appendChild(style);

    var importWrapper = document.createElement('div');
    importWrapper.innerHTML =
      '<div id="bmImportModalBg"><div class="bm-import-modal">' +
        '<div class="modal-header"><h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> 匯入書籤</h2>' +
        '<button class="close-btn" id="bmImportCloseBtn">✕</button></div>' +
        '<div class="modal-hint">選擇 JSON 檔案或拖曳至下方區域</div>' +
        '<div class="bm-import-drop" id="bmImportDrop">📁 點擊選擇檔案 或 拖曳 JSON 至此</div>' +
        '<input type="file" id="bmImportFileInput" accept=".json" style="display:none">' +
        '<div class="bm-import-analysis" id="bmImportAnalysis"></div>' +
        '<div class="bm-import-actions"><button class="btn-reset" id="bmImportCancelBtn">取消</button><button class="btn-confirm" id="bmImportConfirmBtn" disabled>確認匯入</button></div>' +
      '</div></div>';
    document.body.appendChild(importWrapper.firstElementChild);

    var bmImportModalBg = document.getElementById('bmImportModalBg');
    var bmImportDrop = document.getElementById('bmImportDrop');
    var bmImportFileInput = document.getElementById('bmImportFileInput');
    var bmImportAnalysis = document.getElementById('bmImportAnalysis');
    var bmImportConfirmBtn = document.getElementById('bmImportConfirmBtn');
    var importPendingData = null;
    var importDupActions = {};  // idx → 'add'|'overwrite'|'skip'
    var importDupInfo = {};     // idx → { dupUrl: existIdx|null, dupId: existIdIdx|null }

    function escHtml(s) { return window.bmEscHtml ? window.bmEscHtml(s) : String(s); }

    function openImport() {
      importPendingData = null;
      importDupActions = {};
      importDupInfo = {};
      bmImportAnalysis.style.display = 'none';
      bmImportAnalysis.innerHTML = '';
      bmImportConfirmBtn.disabled = true;
      bmImportDrop.textContent = '📁 點擊選擇檔案 或 拖曳 JSON 至此';
      bmImportDrop.style.display = '';
      bmImportModalBg.classList.add('open');
    }

    function handleImportFile(file) {
      if (!file.name.endsWith('.json')) { showImportError('請選擇 .json 格式的檔案。\n\n目前選擇的檔案：' + file.name); return; }
      var reader = new FileReader();
      reader.onload = function(ev) {
        var rawText = ev.target.result;
        if (window.CryptoExport && window.CryptoExport.isEncrypted(rawText)) {
          window.showDecryptModal(rawText, function(plain) { processImportText(plain, file.name); });
          return;
        }
        processImportText(rawText, file.name);
      };
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
              return '<span class="bm-import-card-theme-tag">' + escHtml(name) + '</span>';
            }).join('') + '</div>';
        }

        var actionButtons = isDup
          ? '<div class="bm-import-action"><button class="bm-imp-add" data-idx="' + idx + '">新建</button><button class="bm-imp-overwrite" data-idx="' + idx + '">覆蓋</button><button class="bm-imp-skip active-skip" data-idx="' + idx + '">✓ 跳過</button></div>'
          : '<div class="bm-import-action"><button class="bm-imp-add active-add" data-idx="' + idx + '">✓ 新建</button><button class="bm-imp-skip" data-idx="' + idx + '">跳過</button></div>';

        el.innerHTML =
          '<div class="bm-import-card-info">' +
            '<div class="bm-import-card-title">' + escHtml(fav.title) + '</div>' +
            '<div class="bm-import-card-url">' + escHtml(fav.url || '') + '</div>' +
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
      if (!importPendingData || !importPendingData.favorites || importPendingData.favorites.length === 0) return;
      var bmData = window.bmGetData();
      var existingUrls = {}, existingIds = {};
      bmData.favorites.forEach(function(f, i) {
        if (f.url) existingUrls[f.url] = i;
        if (f.id)  existingIds[f.id]  = i;
      });
      var existingThemeIds = new Set(bmData.themes.map(function(t) { return t.id; }));
      importPendingData.themes.forEach(function(t) {
        if (t.id !== 'all' && !existingThemeIds.has(t.id)) bmData.themes.push(t);
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
      if (addedCount > 0 || overwrittenCount > 0) { window.bmSaveData(); window.renderBookmarks(); }
      bmImportModalBg.classList.remove('open');
      var parts = [];
      if (addedCount > 0) parts.push('新增 ' + addedCount + ' 個');
      if (overwrittenCount > 0) parts.push('覆蓋 ' + overwrittenCount + ' 個');
      if (skippedCount > 0) parts.push('跳過 ' + skippedCount + ' 個');
      showToast('✓ ' + parts.join('、'));
    }

    var closeImportModal = function() { bmImportModalBg.classList.remove('open'); };
    bindPopup(bmImportModalBg, closeImportModal);
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
    function shouldHandleDrop() {
      if (window.viewMode !== 'bookmark') return false;
      if (bmImportModalBg.classList.contains('open')) return false;
      return true;
    }
    document.addEventListener('dragenter', function(e) {
      if (!shouldHandleDrop()) return;
      dragCounter++;
      dropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function(e) {
      if (!shouldHandleDrop() && dragCounter === 0) return;
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('active'); }
    });
    document.addEventListener('dragover', function(e) {
      if (!shouldHandleDrop()) return;
      e.preventDefault();
    });
    document.addEventListener('drop', function(e) {
      dragCounter = 0;
      dropOverlay.classList.remove('active');
      if (!shouldHandleDrop()) return;
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      e.preventDefault();
      openImport();
      handleImportFile(file);
    });

    this.open = openImport;
  }
});
