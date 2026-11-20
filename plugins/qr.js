registerPlugin('qr', {
  main: true,
  menuOrder: 4,
  label: 'QR Code',
  menuIcon: 'qr',
  icon: 'add',
  mode: 'qr',
  order: 1,
  favicon: function(canvas, ctx) {
    ctx.fillRect(4, 4, 10, 10); ctx.fillRect(18, 4, 10, 10); ctx.fillRect(4, 18, 10, 10);
    ctx.fillRect(20, 20, 4, 4); ctx.fillRect(26, 20, 4, 4); ctx.fillRect(20, 26, 4, 4);
  },
  open: null,
  render: null,
  storageKeys: ['qrCodeData'],
  loadData(key) {
    return AppStorage.load(this.storageKeys, key) || [];
  },
  saveData(arr, key) {
    AppStorage.save(this.storageKeys, arr, key);
    if (window.viewMode === this.mode) renderToolbar();
  },
  getDataCount(key) {
    return this.loadData(key).length;
  },
  load() {
	const subCssList = ['qr', 'qr-scan'];
	const subPlugins = ['qr-scan', 'qr-sort', 'qr-help'];
	
	// 1. 並行（Parallel）載入所有子插件所需的 CSS 樣式表
	const cssPromise = Promise.all(
	  subCssList.map(name => loadPluginCss(name))
	);

    // 2. 並行（Parallel）下載所有子插件的 JavaScript 腳本
    const pluginsPromise = Promise.all(
      subPlugins.map(name => loadPluginScript(name))
    );

    // 3. 當所有樣式與腳本皆載入完成後，啟動初始化流程
    return Promise.all([cssPromise, pluginsPromise]).then(() => {
      
      // 4. 遍歷並自動執行各個子插件的生命週期 load 函式
      subPlugins.forEach(name => {
        const sub = window.plugins[name];
        if (sub && typeof sub.load === 'function') {
          sub.load();
        }
      });

      // 5. 觸發核心內容載入
      this.init(); 
    });
  },
  
  init(){
    var self = this; 
    //var STORAGE_KEY = 'qrCodeData';
    function loadQRJS(callback) {
      return library('QRCode').then(callback, error => {
        console.error('QRCode 載入失敗：', error);
        showToast('無法載入 QR Code 產生元件，請確認 lib/qrcode.min.js');
      });
    }

    var items = self.loadData();
    // ── Gallery content ──
    var contentEl = document.createElement('div');
    contentEl.id = 'qrContent';
    contentEl.setAttribute('data-plugin-content', '');
    contentEl.style.display = 'none';
    contentEl.innerHTML = '<div class="qr-gallery" id="qrGallery"></div>';
    document.body.appendChild(contentEl);

    // ── Edit popup ──
    var editEl = document.createElement('div');
    editEl.innerHTML =
      `<dialog id="qrEditBg" class="app-dialog" aria-labelledby="qrEditTitle"><div class="qr-edit-modal app-dialog-panel-medium">
        <header class="app-modal-header">
          <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('qr')}</span>
          <div class="app-modal-header-info"><h2 id="qrEditTitle" class="app-modal-header-title">新增 QR Code</h2><p class="app-modal-header-subtitle">輸入網址或文字，即時預覽 QR Code，也可加入 Logo。</p></div>
          <button type="button" class="app-modal-header-close" id="qrEditClose" aria-label="關閉">✕</button>
        </header>
        <div class="app-dialog-body">
        <div class="qr-field"><label>名稱</label><input id="qrEditName" type="text" placeholder="輸入名稱..."></div>
        <div class="qr-field"><label for="qrEditText">網址 / 文字</label><textarea id="qrEditText" rows="2" placeholder="https://..."></textarea></div>
        <div class="qr-field"><label>Logo（選填，Ctrl+V 貼上）</label><div class="qr-logo-area" id="qrLogoArea">點擊選擇或貼上圖片</div><input type="file" id="qrLogoFile" accept="image/*" style="display:none"></div>
        <div class="qr-preview-wrap" id="qrPreviewWrap"><div style="color:var(--text-dim);font-size:13px">輸入內容後即時預覽</div></div>
        </div>
        <footer class="app-dialog-footer">
          <button type="button" class="btn-reset" id="qrEditCancel">取消</button>
          <button type="button" class="btn-reset" id="qrEditDownload">下載圖片</button>
          <button type="button" class="btn-confirm" id="qrEditSave">儲存</button>
        </footer>
      </div></dialog>`;
    document.body.appendChild(editEl.firstElementChild);

    // ── Delete confirm popup ──
    var confirmEl = document.createElement('div');
    confirmEl.innerHTML = `
	  <div id="qrConfirmBg">
		<div class="qr-confirm">
		  <div class="qr-confirm-msg">確定要刪除這個 QR Code？</div>
		  <div class="qr-confirm-card" id="qrConfirmCard"></div>
		  <div class="qr-confirm-actions">
			<button class="qr-confirm-cancel" id="qrConfirmCancel">取消</button>
			<button class="qr-confirm-delete" id="qrConfirmOk">刪除</button>
		  </div>
		</div>
	  </div>
	`;

    document.body.appendChild(confirmEl.firstElementChild);

    // ── Refs ──
    var galleryEl = document.getElementById('qrGallery');
    var editBg = document.getElementById('qrEditBg');
    var editTitleEl = document.getElementById('qrEditTitle');
    var editName = document.getElementById('qrEditName');
    var editText = document.getElementById('qrEditText');
    var logoArea = document.getElementById('qrLogoArea');
    var logoFile = document.getElementById('qrLogoFile');
    var previewWrap = document.getElementById('qrPreviewWrap');
    var confirmBg = document.getElementById('qrConfirmBg');

    // ── State ──
    var editingIdx = -1;
    var logoValue = null;
    var edited = false;
    var pendingDeleteIdx = null;
    var qrInstance = null;

    // ── Helpers ──
    function compressLogo(dataUrl, cb) {
      var img = new Image();
      img.onload = function() {
        var c = document.createElement('canvas');
        var MAX = 120;
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/png'));
      };
      img.src = dataUrl;
    }

    var _qrGenId = 0;
    function generateQR(text, logSrc, container, size, cb) {
      var myId = ++_qrGenId;
      container.innerHTML = '';
      if (!text || !window.QRCode) { container.innerHTML = '<div style="color:var(--text-dim);font-size:13px">輸入內容後即時預覽</div>'; return; }
      var wrapper = document.createElement('div');
      wrapper.style.display = 'none';
      container.appendChild(wrapper);
      try {
        new QRCode(wrapper, { text: text, width: size || 256, height: size || 256, correctLevel: QRCode.CorrectLevel.H });
      } catch (e) { container.innerHTML = '<div style="color:var(--danger);font-size:12px">QR 產生失敗</div>'; if (cb) cb(null); return; }
      setTimeout(function() {
        if (myId !== _qrGenId) return;
        var srcCanvas = wrapper.querySelector('canvas');
        if (!srcCanvas) {
          var srcImg = wrapper.querySelector('img');
          if (srcImg && srcImg.src) {
            var finalImg = document.createElement('img');
            finalImg.src = srcImg.src;
            finalImg.style.cssText = 'max-width:100%;border-radius:8px';
            wrapper.remove();
            container.appendChild(finalImg);
            if (cb) cb(srcImg.src);
          } else {
            if (cb) cb(null);
          }
          return;
        }
        function finish(canvas) {
          var dataUrl = canvas.toDataURL('image/png');
          var img = document.createElement('img');
          img.src = dataUrl;
          img.style.cssText = 'max-width:100%;border-radius:8px';
          wrapper.remove();
          container.appendChild(img);
          if (cb) cb(dataUrl);
        }
        if (logSrc) {
          var ctx = srcCanvas.getContext('2d');
          var logo = new Image();
          logo.onload = function() {
            var lw = srcCanvas.width * 0.22, lh = srcCanvas.height * 0.22;
            var lx = (srcCanvas.width - lw) / 2, ly = (srcCanvas.height - lh) / 2;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(lx - 4, ly - 4, lw + 8, lh + 8);
            ctx.drawImage(logo, lx, ly, lw, lh);
            finish(srcCanvas);
          };
          logo.onerror = function() { finish(srcCanvas); };
          logo.src = logSrc;
        } else {
          finish(srcCanvas);
        }
      }, 100);
    }

    // ── Context menu ──
    var activeCtxMenu = null;
    function removeCtxMenu() { if (activeCtxMenu) { activeCtxMenu.remove(); activeCtxMenu = null; } }
    document.addEventListener('click', function() { removeCtxMenu(); });

    function showCtxMenu(x, y, idx) {
      removeCtxMenu();
      var menu = document.createElement('div');
      menu.className = 'qr-ctx-menu';
      menu.style.left = x + 'px'; menu.style.top = y + 'px';

      var editBtn = document.createElement('button');
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function(e) { e.stopPropagation(); removeCtxMenu(); openEditor(idx); });

      var copyBtn = document.createElement('button');
      copyBtn.textContent = '複製';
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation(); removeCtxMenu();
        var src = items[idx]; if (!src) return;
        var clone = JSON.parse(JSON.stringify(src));
        clone.id = 'qr_' + Date.now();
        var base = clone.name.replace(/-copy\(\d+\)$/, '');
        var n = 1;
        while (items.some(function(q) { return q.name === base + '-copy(' + n + ')'; })) n++;
        clone.name = base + '-copy(' + n + ')';
        items.push(clone);
        self.saveData(items);
        renderGallery();
        showToast('QR Code 已複製');
      });

      var delBtn = document.createElement('button');
      delBtn.textContent = '刪除';
      delBtn.addEventListener('click', function(e) { e.stopPropagation(); removeCtxMenu(); showDeleteConfirm(idx); });

      menu.appendChild(editBtn); menu.appendChild(copyBtn); menu.appendChild(delBtn);
      menu.addEventListener('click', function(e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;
      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    // ── Delete confirm ──
    function showDeleteConfirm(idx) {
      pendingDeleteIdx = idx;
      var q = items[idx];
      var cardEl = document.getElementById('qrConfirmCard');
      cardEl.innerHTML = (q && q.image ? '<img src="' + q.image + '">' : '') +
        '<div class="qr-confirm-card-body"><div class="qr-confirm-card-name">' + AppUtils.escHtml(q ? q.name : '') + '</div><div class="qr-confirm-card-meta">' + AppUtils.escHtml(q ? q.text : '') + '</div></div>';
      confirmBg.classList.add('open');
    }
    bindPopup(confirmBg, function() { confirmBg.classList.remove('open'); pendingDeleteIdx = null; });
    document.getElementById('qrConfirmCancel').addEventListener('click', function() { confirmBg.classList.remove('open'); pendingDeleteIdx = null; });
	document.getElementById('qrConfirmOk').addEventListener('click', () => {
	  confirmBg.classList.remove('open');
	  if (pendingDeleteIdx === null) return;
	  items.splice(pendingDeleteIdx, 1);
	  
	  self.saveData(items);
	  
	  pendingDeleteIdx = null;
	  renderGallery();
	  showToast('QR Code 已刪除');
	});


    // ── Gallery ──
    function renderGallery() {
      items = self.loadData();
      galleryEl.innerHTML = '';
      if (items.length === 0) {
        galleryEl.innerHTML = '<div class="qr-gallery-empty"><div class="qr-gallery-empty-icon"><svg viewBox="0 0 512 512" width="48" height="48" fill="currentColor" stroke="currentColor" stroke-width="32"><rect x="336" y="336" width="80" height="80" rx="8" stroke="none"/><rect x="272" y="272" width="64" height="64" rx="8" stroke="none"/><rect x="416" y="416" width="64" height="64" rx="8" stroke="none"/><rect x="432" y="272" width="48" height="48" rx="8" stroke="none"/><rect x="272" y="432" width="48" height="48" rx="8" stroke="none"/><rect x="336" y="96" width="80" height="80" rx="8" stroke="none"/><rect x="288" y="48" width="176" height="176" rx="16" fill="none"/><rect x="96" y="96" width="80" height="80" rx="8" stroke="none"/><rect x="48" y="48" width="176" height="176" rx="16" fill="none"/><rect x="96" y="336" width="80" height="80" rx="8" stroke="none"/><rect x="48" y="288" width="176" height="176" rx="16" fill="none"/></svg></div><div>尚無 QR Code</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">Ctrl</kbd> + <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">V</kbd> 貼上網址或文字快速生成</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">拖曳 QR Code 圖片至畫面可快速解析</div></div>';
        return;
      }
      var dragSrcIdx = null;
      items.forEach(function(q, i) {
        var card = document.createElement('div');
        card.className = 'qr-gallery-item';
        card.draggable = true;

        var thumb = document.createElement('div');
        thumb.className = 'qr-gallery-thumb';
        if (q.image) { var img = document.createElement('img'); img.src = q.image; thumb.appendChild(img); }

        var body = document.createElement('div');
        body.className = 'qr-gallery-body';
        body.innerHTML = '<div class="qr-gallery-name">' + AppUtils.escHtml(q.name) + '</div><div class="qr-gallery-meta">' + AppUtils.escHtml(q.text) + '</div>';

        card.appendChild(thumb); card.appendChild(body);
        card.addEventListener('click', function() { openEditor(i); });
        card.addEventListener('contextmenu', function(e) { e.preventDefault(); showCtxMenu(e.clientX, e.clientY, i); });

        card.addEventListener('dragstart', function(e) { dragSrcIdx = i; card.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
        card.addEventListener('dragend', function() { card.style.opacity = ''; galleryEl.querySelectorAll('.qr-gallery-item').forEach(function(c) { c.classList.remove('qr-drag-over'); }); });
        card.addEventListener('dragover', function(e) { e.preventDefault(); galleryEl.querySelectorAll('.qr-gallery-item').forEach(function(c) { c.classList.remove('qr-drag-over'); }); card.classList.add('qr-drag-over'); });
        card.addEventListener('drop', function(e) {
          e.preventDefault(); card.classList.remove('qr-drag-over');
          if (dragSrcIdx === null || dragSrcIdx === i) return;
          var moved = items.splice(dragSrcIdx, 1)[0];
          items.splice(i, 0, moved);
          this.saveData(items);
          renderGallery();
        });

        galleryEl.appendChild(card);
      });
    }

	function renderGallery() {
	  items = self.loadData(); 
	  
	  galleryEl.innerHTML = '';
	  if (items.length === 0) {
		galleryEl.innerHTML = '<div class="qr-gallery-empty"><div class="qr-gallery-empty-icon"><svg viewBox="0 0 512 512" width="48" height="48" fill="currentColor" stroke="currentColor" stroke-width="32"><rect x="336" y="336" width="80" height="80" rx="8" stroke="none"/><rect x="272" y="272" width="64" height="64" rx="8" stroke="none"/><rect x="416" y="416" width="64" height="64" rx="8" stroke="none"/><rect x="432" y="272" width="48" height="48" rx="8" stroke="none"/><rect x="272" y="432" width="48" height="48" rx="8" stroke="none"/><rect x="336" y="96" width="80" height="80" rx="8" stroke="none"/><rect x="288" y="48" width="176" height="176" rx="16" fill="none"/><rect x="96" y="96" width="80" height="80" rx="8" stroke="none"/><rect x="48" y="48" width="176" height="176" rx="16" fill="none"/><rect x="96" y="336" width="80" height="80" rx="8" stroke="none"/><rect x="48" y="288" width="176" height="176" rx="16" fill="none"/></svg></div><div>尚無 QR Code</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">Ctrl</kbd> + <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">V</kbd> 貼上網址或文字快速生成</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">拖曳 QR Code 圖片至畫面可快速解析</div></div>';
		return;
	  }
	  
	  var dragSrcIdx = null;
	  
	  // 💡 建議：將 forEach 的 callback 改為箭頭函式，確保裡面的 this 語境正確
	  items.forEach((q, i) => {
		var card = document.createElement('div');
		card.className = 'qr-gallery-item';
		card.draggable = true;

		var thumb = document.createElement('div');
		thumb.className = 'qr-gallery-thumb';
		if (q.image) { var img = document.createElement('img'); img.src = q.image; thumb.appendChild(img); }

		var body = document.createElement('div');
		body.className = 'qr-gallery-body';
		body.innerHTML = '<div class="qr-gallery-name">' + AppUtils.escHtml(q.name) + '</div><div class="qr-gallery-meta">' + AppUtils.escHtml(q.text) + '</div>';

		card.appendChild(thumb); card.appendChild(body);
		
		// 💡 這裡如果原本 openEditor 是定義在物件外的普通函式，可以直接呼叫
		card.addEventListener('click', function() { openEditor(i); });
		card.addEventListener('contextmenu', function(e) { e.preventDefault(); showCtxMenu(e.clientX, e.clientY, i); });

		card.addEventListener('dragstart', function(e) { dragSrcIdx = i; card.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
		card.addEventListener('dragend', function() { card.style.opacity = ''; galleryEl.querySelectorAll('.qr-gallery-item').forEach(function(c) { c.classList.remove('qr-drag-over'); }); });
		card.addEventListener('dragover', function(e) { e.preventDefault(); galleryEl.querySelectorAll('.qr-gallery-item').forEach(function(c) { c.classList.remove('qr-drag-over'); }); card.classList.add('qr-drag-over'); });
		
		card.addEventListener('drop', (e) => {
		  e.preventDefault(); 
		  card.classList.remove('qr-drag-over');
		  if (dragSrcIdx === null || dragSrcIdx === i) return;
		  
		  var moved = items.splice(dragSrcIdx, 1)[0];
		  items.splice(i, 0, moved);
		  
		  this.saveData(items);
		  renderGallery(); 
		});

		galleryEl.appendChild(card);
	  });
	}

    // ── Editor ──
    function mark() { edited = true; markEdited(editTitleEl); }

    let afterEditorSave = null;

    function openEditor(idx, initialText = '', onSave = null) {
      afterEditorSave = onSave;
      editingIdx = idx;
      edited = false;
      clearEdited(editTitleEl);
      if (idx >= 0 && items[idx]) {
        var q = items[idx];
        editName.value = q.name || '';
        editText.value = q.text || '';
        logoValue = q.logo || null;
        editTitleEl.textContent = '編輯 QR Code';
        editBg.querySelector('.app-modal-header-icon').innerHTML = resolveIcon('edit');
      } else {
        editingIdx = -1;
        editName.value = '';
        editText.value = initialText;
        logoValue = null;
        editTitleEl.textContent = '新增 QR Code';
        editBg.querySelector('.app-modal-header-icon').innerHTML = resolveIcon('qr');
      }
      updateLogoArea();
      updatePreview();
      ModalManager.showDialog(editBg, closeEditor);
    }

    function closeEditor() {
      confirmLeave(edited, function() {
        edited = false; clearEdited(editTitleEl);
        ModalManager.closeDialog(editBg);
      });
    }
    document.getElementById('qrEditClose').addEventListener('click', closeEditor);
    document.getElementById('qrEditCancel').addEventListener('click', closeEditor);
    editBg.addEventListener('click', event => { if (event.target === editBg) closeEditor(); });

    function updatePreview() {
      if (!editText.value.trim()) {
        generateQR('', null, previewWrap, 256);
        return;
      }
      loadQRJS(() => generateQR(editText.value.trim(), logoValue, previewWrap, 256));
    }

    editName.addEventListener('input', mark);
    editText.addEventListener('input', function() { mark(); updatePreview(); });

    // Logo display helper
    function updateLogoArea() {
      if (logoValue) {
        logoArea.innerHTML = '<img src="' + logoValue + '"><button class="qr-logo-remove" title="移除 Logo">✕</button>';
        logoArea.querySelector('.qr-logo-remove').addEventListener('click', function(e) {
          e.stopPropagation();
          logoValue = null;
          updateLogoArea();
          mark(); updatePreview();
        });
      } else {
        logoArea.innerHTML = '點擊選擇或貼上圖片';
      }
    }

    // Logo paste/upload
    logoArea.addEventListener('click', function() { logoFile.click(); });
    logoFile.addEventListener('change', function() {
      if (!logoFile.files[0]) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        compressLogo(e.target.result, function(compressed) {
          logoValue = compressed;
          updateLogoArea();
          mark(); updatePreview();
        });
      };
      reader.readAsDataURL(logoFile.files[0]);
      logoFile.value = '';
    });
    document.addEventListener('paste', function(e) {
      if (!e.clipboardData) return;
      const top = ModalManager.nativeStack.filter(dialog => dialog.open).at(-1);
      if (top && top !== editBg) return;

      // ── Inside edit modal: paste image as logo ──
      if (editBg.open) {
        var items = e.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image/') === 0) {
            var file = items[i].getAsFile();
            var reader = new FileReader();
            reader.onload = function(ev) {
              compressLogo(ev.target.result, function(compressed) {
                logoValue = compressed;
                updateLogoArea();
                mark(); updatePreview();
              });
            };
            reader.readAsDataURL(file);
            break;
          }
        }
        return;
      }

      // ── On QR main page: paste text → generate QR ──
      if (window.viewMode !== 'qr') return;
      var text = e.clipboardData.getData('text/plain');
      if (!text) return;
      if (/[\r\n]/.test(text)) { showToast('⚠ 內容含斷行，無法生成 QR Code'); return; }
      if (text.length > 500) { showToast('⚠ 內容過長（' + text.length + ' 字元），無法生成 QR Code'); return; }
      e.preventDefault();
      openEditor(-1);
      editText.value = text;
      mark(); updatePreview();
    });

    // Download
    document.getElementById('qrEditDownload').addEventListener('click', function() {
      var text = editText.value.trim();
      if (!text) { showToast('請先輸入網址或文字'); return; }
      loadQRJS(function() {
        generateQR(text, logoValue, previewWrap, 256, function(imageData) {
          if (!imageData) { showToast('QR Code 產生失敗'); return; }
          var a = document.createElement('a');
          a.href = imageData;
          a.download = (editName.value.trim() || 'qrcode') + '.png';
          a.click();
        });
      });
    });

    // Save
	document.getElementById('qrEditSave').addEventListener('click', () => {
	  var name = editName.value.trim();
	  var text = editText.value.trim();
	  if (!text) { showToast('請輸入網址或文字'); return; }
	  if (!name) name = text.substring(0, 30);

	  loadQRJS(() => {
		generateQR(text, logoValue, previewWrap, 256, (imageData) => {
          if (!imageData) { showToast('QR Code 產生失敗'); return; }
		  var entry = { id: 'qr_' + Date.now(), name: name, text: text, logo: logoValue, image: imageData };
		  if (editingIdx >= 0) {
			entry.id = items[editingIdx].id;
			items[editingIdx] = entry;
		  } else {
			items.push(entry);
		  }
		  
		  this.saveData(items);
		  
		  edited = false; clearEdited(editTitleEl);
		  ModalManager.closeDialog(editBg);
		  const onSave = afterEditorSave;
		  afterEditorSave = null;
		  if (onSave) onSave();
		  renderGallery();
		  showToast(editingIdx >= 0 ? 'QR Code 已更新' : 'QR Code 已新增');
		});
	  });
	});


    // ── Expose globals ──
    window.qrLoadData = () => self.loadData();
    window.qrSaveData = items => self.saveData(items);
    window.qrRenderGallery = renderGallery;

    this.open = function(initialText, onSave) {
      openEditor(-1, typeof initialText === 'string' ? initialText : '', typeof onSave === 'function' ? onSave : null);
    };
    this.render = (wrapper) => {
      items = self.loadData();
      contentEl.style.display = '';
      wrapper.appendChild(contentEl);
      renderGallery();
      self.guestDiff?.syncVisibility();
    };
    self.guestDiff = GuestDiffCollection.create({ mode: 'qr', reload: () => self.render(document.getElementById('app-content')),
      renderTile(target, { item }) {
        if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = ''; target.append(image); }
        const title = document.createElement('h3'); title.textContent = item.name || '未命名 QR Code';
        const text = document.createElement('p'); text.textContent = item.text.slice(0, 160); target.append(title, text);
      },
      renderDetail(target, { item }, update) {
        if (item.image) { const image = document.createElement('img'); image.src = item.image; image.alt = item.name || 'QR Code'; image.onload = () => update?.(); target.append(image); }
        else {
          const preview = document.createElement('div'); preview.className = 'guest-qr-preview'; target.append(preview);
          library('QRCode').then(() => {
            if (!target.contains(preview)) return;
            new QRCode(preview, { text: item.text, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.H }); update?.();
          }).catch(() => { preview.textContent = '無法產生 QR Code 預覽'; update?.(); });
        }
        const text = document.createElement('pre'); text.textContent = item.text;
        target.classList.add('guest-diff-native-content'); target.append(text);
      }
    });
  }
});
