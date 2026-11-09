registerPlugin('img-import', {
  icon: window.CARD_ICONS.import,
  label: '匯入', mode: 'img', order: 30, open: null,

  init() {
    var importInput = document.createElement('input');
    importInput.type = 'file'; importInput.accept = '.json'; importInput.style.display = 'none';
    document.body.appendChild(importInput);

    var impWrap = document.createElement('div');
    impWrap.innerHTML =
      '<div class="is-popup-bg" id="isImpBg"><div class="is-popup">' +
        '<div class="modal-header"><h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> 匯入母片</h2><button class="close-btn" id="isImpClose">✕</button></div>' +
        '<div class="is-popup-hint">選擇 JSON 檔案或拖曳至下方區域</div>' +
        '<div class="is-imp-drop" id="isImpDrop">📁 點擊選擇檔案 或 拖曳 JSON 至此</div>' +
        '<div class="is-popup-list" id="isImpList" style="display:none"></div>' +
        '<div class="is-popup-footer"><button class="is-popup-cancel" id="isImpCancel">取消</button><button class="is-popup-confirm" id="isImpConfirm" disabled>確認匯入</button></div>' +
      '</div></div>';
    document.body.appendChild(impWrap.firstElementChild);

    var impBg = document.getElementById('isImpBg');
    var impDrop = document.getElementById('isImpDrop');
    var impListEl = document.getElementById('isImpList');
    var impConfirmBtn = document.getElementById('isImpConfirm');
    var impPending = null;
    var impActions = {};

    function escHtml(s) { return window.isEscHtml ? window.isEscHtml(s) : String(s); }
    function loadStamps() { return window.isLoadStamps ? window.isLoadStamps() : []; }
    function saveStamps(arr) { if (window.isSaveStamps) window.isSaveStamps(arr); }
    function renderGallery() { if (window.isRenderGallery) window.isRenderGallery(); }

    function openImpPopup() {
      impPending = null;
      impActions = {};
      impListEl.style.display = 'none';
      impListEl.innerHTML = '';
      impConfirmBtn.disabled = true;
      impDrop.textContent = '📁 點擊選擇檔案 或 拖曳 JSON 至此';
      impDrop.style.display = '';
      impBg.classList.add('open');
    }

    function handleImpFile(file) {
      if (!file.name.endsWith('.json')) { showImportError('請選擇 .json 格式的檔案。\n\n目前選擇的檔案：' + file.name); return; }
      var reader = new FileReader();
      reader.onload = function(ev) {
        var rawText = ev.target.result;
        if (window.CryptoExport && window.CryptoExport.isEncrypted(rawText)) {
          window.showDecryptModal(rawText, function(plain) { processImgImport(plain, file.name); });
          return;
        }
        processImgImport(rawText, file.name);
      };
      reader.readAsText(file);
    }

    function processImgImport(rawText, fileName) {
      try {
        var parsed = JSON.parse(rawText);
        if (!Array.isArray(parsed)) { showImportError('JSON 格式不正確：頂層結構應為陣列。\n\n請確認是由本工具匯出的母片 JSON 檔。'); return; }
        impPending = parsed.filter(function(s) { return s && s.image && s.name; });
        if (impPending.length === 0) { showImportError('JSON 中無有效母片資料。\n\n每筆母片需包含 image 與 name 欄位。'); return; }
        impDrop.textContent = '✅ 已讀取：' + fileName;
        renderImpList();
      } catch (err) { showImportError('JSON 解析失敗，檔案可能已損毀或非有效 JSON 格式。\n\n錯誤：' + err.message); }
    }

    function renderImpList() {
      impListEl.innerHTML = '';
      impListEl.style.display = '';
      impActions = {};
      var stamps = loadStamps();
      var existingIds = {};
      stamps.forEach(function(s, i) { existingIds[s.id] = i; });
      var seenImportIds = {};

      impPending.forEach(function(s, idx) {
        var isDupVsExisting = s.id && existingIds.hasOwnProperty(s.id);
        var isDupInFile = s.id && seenImportIds.hasOwnProperty(s.id);
        if (s.id) seenImportIds[s.id] = idx;
        var isDup = isDupVsExisting;
        impActions[idx] = isDup ? 'skip' : 'add';

        var row = document.createElement('div');
        var rowClass = 'is-popup-row ' + (isDup ? 'is-imp-dup' : 'is-imp-new');
        if (isDupInFile) rowClass += ' is-imp-dup-file';
        row.className = rowClass;
        row.dataset.idx = idx;

        var label = isDup ? '重複 (ID 相同)' : isDupInFile ? '重複 (檔案內)' : '新項目';
        var actionHtml = isDup
          ? '<div class="is-imp-action">' +
              '<button data-a="add" data-idx="' + idx + '">新建</button>' +
              '<button data-a="overwrite" data-idx="' + idx + '">覆蓋</button>' +
              '<button data-a="skip" data-idx="' + idx + '" class="active-skip">✓ 跳過</button>' +
            '</div>'
          : '<div class="is-imp-action">' +
              '<button data-a="add" data-idx="' + idx + '" class="active-add">✓ 新建</button>' +
              '<button data-a="skip" data-idx="' + idx + '">跳過</button>' +
            '</div>';

        row.innerHTML =
          '<img class="is-popup-row-thumb" src="' + s.image + '">' +
          '<div class="is-popup-row-info">' +
            '<div class="is-popup-row-name">' + escHtml(s.name) + '</div>' +
            '<div class="is-popup-row-meta">' + (s.texts || []).length + ' 個文字</div>' +
            '<div class="is-popup-row-label">' + label + '</div>' +
          '</div>' +
          actionHtml;

        impListEl.appendChild(row);
      });

      impListEl.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-a]');
        if (!btn) return;
        var idx = parseInt(btn.dataset.idx);
        var action = btn.dataset.a;
        impActions[idx] = action;
        var row = btn.closest('.is-popup-row');
        row.classList.remove('is-imp-new','is-imp-dup','is-imp-overwrite','is-imp-skipped');
        if (action === 'add') row.classList.add('is-imp-new');
        else if (action === 'overwrite') row.classList.add('is-imp-dup','is-imp-overwrite');
        else row.classList.add('is-imp-skipped');
        var btns = row.querySelectorAll('[data-a]');
        btns.forEach(function(b) {
          b.classList.remove('active-add','active-over','active-skip');
          b.textContent = b.textContent.replace('✓ ', '');
        });
        if (action === 'add') { btn.classList.add('active-add'); btn.textContent = '✓ 新建'; }
        else if (action === 'overwrite') { btn.classList.add('active-over'); btn.textContent = '✓ 覆蓋'; }
        else { btn.classList.add('active-skip'); btn.textContent = '✓ 跳過'; }
      });

      impConfirmBtn.disabled = false;
    }

    impDrop.addEventListener('click', function() { importInput.click(); });
    impDrop.addEventListener('dragover', function(e) { e.preventDefault(); impDrop.classList.add('drag-over'); });
    impDrop.addEventListener('dragleave', function() { impDrop.classList.remove('drag-over'); });
    impDrop.addEventListener('drop', function(e) {
      e.preventDefault(); impDrop.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleImpFile(e.dataTransfer.files[0]);
    });
    importInput.addEventListener('change', function() {
      if (importInput.files.length) handleImpFile(importInput.files[0]);
      importInput.value = '';
    });

    var closeImp = function() { impBg.classList.remove('open'); };
    bindPopup(impBg, closeImp);
    document.getElementById('isImpCancel').addEventListener('click', closeImp);

    impConfirmBtn.addEventListener('click', function() {
      if (!impPending) return;
      var stamps = loadStamps();
      var existingIds = {};
      stamps.forEach(function(s, i) { existingIds[s.id] = i; });
      var added = 0, overwritten = 0, skipped = 0;
      impPending.forEach(function(s, idx) {
        var action = impActions[idx] || 'skip';
        if (!s.id) s.id = 'stamp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        if (action === 'add') {
          var clone = JSON.parse(JSON.stringify(s));
          if (existingIds.hasOwnProperty(s.id)) clone.id = 'stamp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          stamps.push(clone);
          added++;
        } else if (action === 'overwrite') {
          var existIdx = existingIds[s.id];
          if (existIdx !== undefined) { stamps[existIdx] = JSON.parse(JSON.stringify(s)); overwritten++; }
          else { stamps.push(JSON.parse(JSON.stringify(s))); added++; }
        } else {
          skipped++;
        }
      });
      saveStamps(stamps);
      impBg.classList.remove('open');
      renderGallery();
      var parts = [];
      if (added) parts.push('新增 ' + added);
      if (overwritten) parts.push('覆蓋 ' + overwritten);
      if (skipped) parts.push('跳過 ' + skipped);
      showToast('匯入完成：' + parts.join('、'));
    });

    this.open = openImpPopup;

    // ── Full-page drop zone overlay ──
    var dropOverlay = document.createElement('div');
    dropOverlay.id = 'imgImportDropOverlay';
    dropOverlay.innerHTML = '<div class="img-drop-overlay-inner">📁 放開以匯入母片 JSON</div>';
    document.body.appendChild(dropOverlay);

    var dragCounter = 0;
    function shouldHandleDrop() {
      if (window.viewMode !== 'img') return false;
      if (impBg.classList.contains('open')) return false;
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
      openImpPopup();
      handleImpFile(file);
    });
  }
});
