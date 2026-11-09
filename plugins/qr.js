registerPlugin('qr', {
  main: true,
  menuOrder: 4,
  label: 'QR Code',
  menuIcon: '<svg viewBox="0 0 512 512" width="28" height="28" fill="currentColor" stroke="currentColor" stroke-width="32"><rect x="336" y="336" width="80" height="80" rx="8" stroke="none"/><rect x="272" y="272" width="64" height="64" rx="8" stroke="none"/><rect x="416" y="416" width="64" height="64" rx="8" stroke="none"/><rect x="432" y="272" width="48" height="48" rx="8" stroke="none"/><rect x="272" y="432" width="48" height="48" rx="8" stroke="none"/><rect x="336" y="96" width="80" height="80" rx="8" stroke="none"/><rect x="288" y="48" width="176" height="176" rx="16" fill="none"/><rect x="96" y="96" width="80" height="80" rx="8" stroke="none"/><rect x="48" y="48" width="176" height="176" rx="16" fill="none"/><rect x="96" y="336" width="80" height="80" rx="8" stroke="none"/><rect x="48" y="288" width="176" height="176" rx="16" fill="none"/></svg>',
  icon: window.CARD_ICONS.add,
  mode: 'qr',
  order: 10,
  open: null,
  favicon: function(canvas, ctx) {
    ctx.fillRect(4, 4, 10, 10); ctx.fillRect(18, 4, 10, 10); ctx.fillRect(4, 18, 10, 10);
    ctx.fillRect(20, 20, 4, 4); ctx.fillRect(26, 20, 4, 4); ctx.fillRect(20, 26, 4, 4);
  },

  init() {
    var STORAGE_KEY = 'qrCodeData';
    var QRJS_CDN = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    var qrjsLoaded = false;

    var qrjsCallbacks = [];
    function loadQRJS(cb) {
      if (qrjsLoaded && window.QRCode) { cb(); return; }
      qrjsCallbacks.push(cb);
      if (qrjsCallbacks.length > 1) return;
      var s = document.createElement('script');
      s.src = QRJS_CDN;
      s.onload = function() { qrjsLoaded = true; var cbs = qrjsCallbacks.splice(0); cbs.forEach(function(fn) { fn(); }); };
      s.onerror = function() { var cbs = qrjsCallbacks.splice(0); cbs.forEach(function(fn) { fn(); }); };
      document.head.appendChild(s);
    }
    loadQRJS(function() {});

    function loadData() {
      try { var d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(d)) return d; } catch (e) {}
      return [];
    }
    function saveData(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); if (typeof renderToolbar === 'function') renderToolbar(); }
    function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    var items = loadData();

    // ── CSS ──
    var style = document.createElement('style');
    style.textContent = [
      '#qrContent{width:100%}',
      '.qr-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;width:100%}',
      '.qr-gallery-item{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s}',
      '.qr-gallery-item:hover{transform:translateY(-4px);box-shadow:0 8px 20px rgba(0,0,0,.3)}',
      '.qr-gallery-item.qr-drag-over{border-color:var(--accent);box-shadow:0 0 12px rgba(81,203,238,.3)}',
      '.qr-gallery-thumb{height:180px;background:var(--surface2);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:16px}',
      '.qr-gallery-thumb img{max-width:100%;max-height:100%;object-fit:contain}',
      '.qr-gallery-body{padding:12px}',
      '.qr-gallery-name{font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qr-gallery-meta{font-size:11px;color:var(--text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.qr-gallery-empty{grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.qr-gallery-empty-icon{margin-bottom:12px;color:var(--text-dim);opacity:.5}',
      '.qr-gallery-empty-icon svg{width:48px;height:48px}',
      '.qr-ctx-menu{position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;z-index:500;min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,.4)}',
      '.qr-ctx-menu button{display:block;width:100%;padding:8px 16px;background:none;border:none;color:var(--text-dim);text-align:left;cursor:pointer;font-size:13px}',
      '.qr-ctx-menu button:hover{background:var(--surface2);color:var(--text)}',
      '#qrEditBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:300}',
      '#qrEditBg.open{opacity:1;pointer-events:all}',
      '.qr-edit-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;width:min(480px,94vw);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '#qrEditBg.open .qr-edit-modal{transform:translateY(0) scale(1)}',
      '.qr-field{display:flex;flex-direction:column;gap:4px}',
      '.qr-field label{font-size:12px;color:var(--text-dim)}',
      '.qr-field input{padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;outline:none}',
      '.qr-field input:focus{border-color:var(--accent)}',
      '.qr-preview-wrap{display:flex;align-items:center;justify-content:center;min-height:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:16px}',
      '.qr-preview-wrap canvas,.qr-preview-wrap img{max-width:100%}',
      '.qr-logo-area{border:1.5px dashed var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer;color:var(--text-dim);font-size:11px;transition:border-color .2s;position:relative}',
      '.qr-logo-area:hover{border-color:var(--accent)}',
      '.qr-logo-area img{max-width:80px;max-height:80px;border-radius:6px;object-fit:contain}',
      '.qr-logo-remove{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:var(--danger);color:#fff;font-size:12px;line-height:20px;text-align:center;cursor:pointer;padding:0;display:none}',
      '.qr-logo-area:hover .qr-logo-remove{display:block}',
      '.qr-edit-actions{display:flex;gap:8px}',
      '.qr-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:13px;transition:background .15s,color .15s,border-color .15s}',
      '.qr-btn:hover{background:var(--surface2);color:var(--text);border-color:var(--accent)}',
      '.qr-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}',
      '.qr-btn-primary:hover{opacity:.88}',
      '#qrConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:400}',
      '#qrConfirmBg.open{opacity:1;pointer-events:all}',
      '.qr-confirm{background:var(--surface);border:1px solid var(--danger);border-radius:12px;padding:24px;width:min(400px,90vw);display:flex;flex-direction:column;gap:16px}',
      '.qr-confirm-msg{font-size:14px;color:var(--text-dim);line-height:1.5;text-align:center}',
      '.qr-confirm-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px}',
      '.qr-confirm-card img{width:48px;height:48px;border-radius:6px;object-fit:contain;flex-shrink:0;background:#fff}',
      '.qr-confirm-card-body{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.qr-confirm-card-name{font-size:14px;font-weight:500;color:var(--text)}',
      '.qr-confirm-card-meta{font-size:11px;color:var(--text-dim)}',
      '.qr-confirm-actions{display:flex;gap:10px}',
      '.qr-confirm-actions button{flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;transition:opacity .15s}',
      '.qr-confirm-cancel{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border) !important}',
      '.qr-confirm-delete{background:var(--danger);color:#fff}'
    ].join('\n');
    document.head.appendChild(style);

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
      '<div id="qrEditBg"><div class="qr-edit-modal">' +
        '<div class="modal-header"><h2 id="qrEditTitle"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增 QR Code</h2><button class="close-btn" id="qrEditClose">✕</button></div>' +
        '<div class="qr-field"><label>名稱</label><input id="qrEditName" type="text" placeholder="輸入名稱..."></div>' +
        '<div class="qr-field"><label>網址 / 文字</label><input id="qrEditText" type="text" placeholder="https://..."></div>' +
        '<div class="qr-field"><label>Logo（選填，Ctrl+V 貼上）</label><div class="qr-logo-area" id="qrLogoArea">點擊選擇或貼上圖片</div><input type="file" id="qrLogoFile" accept="image/*" style="display:none"></div>' +
        '<div class="qr-preview-wrap" id="qrPreviewWrap"><div style="color:var(--text-dim);font-size:13px">輸入內容後即時預覽</div></div>' +
        '<div class="qr-edit-actions"><button class="qr-btn" id="qrEditDownload">下載圖片</button><button class="qr-btn qr-btn-primary" id="qrEditSave" style="flex:1">儲存</button></div>' +
      '</div></div>';
    document.body.appendChild(editEl.firstElementChild);

    // ── Delete confirm popup ──
    var confirmEl = document.createElement('div');
    confirmEl.innerHTML =
      '<div id="qrConfirmBg"><div class="qr-confirm">' +
        '<div class="qr-confirm-msg">確定要刪除這個 QR Code？</div>' +
        '<div class="qr-confirm-card" id="qrConfirmCard"></div>' +
        '<div class="qr-confirm-actions"><button class="qr-confirm-cancel" id="qrConfirmCancel">取消</button><button class="qr-confirm-delete" id="qrConfirmOk">刪除</button></div>' +
      '</div></div>';
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
      } catch (e) { container.innerHTML = '<div style="color:var(--danger);font-size:12px">QR 產生失敗</div>'; return; }
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
        saveData(items);
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
        '<div class="qr-confirm-card-body"><div class="qr-confirm-card-name">' + escHtml(q ? q.name : '') + '</div><div class="qr-confirm-card-meta">' + escHtml(q ? q.text : '') + '</div></div>';
      confirmBg.classList.add('open');
    }
    bindPopup(confirmBg, function() { confirmBg.classList.remove('open'); pendingDeleteIdx = null; });
    document.getElementById('qrConfirmCancel').addEventListener('click', function() { confirmBg.classList.remove('open'); pendingDeleteIdx = null; });
    document.getElementById('qrConfirmOk').addEventListener('click', function() {
      confirmBg.classList.remove('open');
      if (pendingDeleteIdx === null) return;
      items.splice(pendingDeleteIdx, 1);
      saveData(items);
      pendingDeleteIdx = null;
      renderGallery();
      showToast('QR Code 已刪除');
    });

    // ── Gallery ──
    function renderGallery() {
      items = loadData();
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
        body.innerHTML = '<div class="qr-gallery-name">' + escHtml(q.name) + '</div><div class="qr-gallery-meta">' + escHtml(q.text) + '</div>';

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
          saveData(items);
          renderGallery();
        });

        galleryEl.appendChild(card);
      });
    }

    // ── Editor ──
    function mark() { edited = true; markEdited(editTitleEl); }

    function openEditor(idx) {
      editingIdx = idx;
      edited = false;
      clearEdited(editTitleEl);
      if (idx >= 0 && items[idx]) {
        var q = items[idx];
        editName.value = q.name || '';
        editText.value = q.text || '';
        logoValue = q.logo || null;
        editTitleEl.innerHTML = '<svg viewBox="0 0 528.899 528.899" width="24" height="24" fill="currentColor"><path d="M328.883 89.125l107.59 107.589-272.34 272.34L56.604 361.465 328.883 89.125zM518.113 63.177l-47.981-47.981c-18.543-18.543-48.653-18.543-67.259 0l-45.961 45.961 107.59 107.59 53.611-53.611c12.582-12.582 12.582-35.776 0-48.158zM0.3 512.69c-1.958 8.812 5.998 16.708 14.811 14.565l119.891-29.069L27.473 390.597 0.3 512.69z"/></svg> 編輯 QR Code';
      } else {
        editingIdx = -1;
        editName.value = '';
        editText.value = '';
        logoValue = null;
        editTitleEl.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增 QR Code';
      }
      updateLogoArea();
      updatePreview();
      editBg.classList.add('open');
    }

    function closeEditor() {
      confirmLeave(edited, function() {
        edited = false; clearEdited(editTitleEl);
        editBg.classList.remove('open');
      });
    }
    bindPopup(editBg, closeEditor);

    function updatePreview() {
      var text = editText.value.trim();
      loadQRJS(function() { generateQR(text, logoValue, previewWrap, 256); });
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

      // ── Inside edit modal: paste image as logo ──
      if (editBg.classList.contains('open')) {
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
    document.getElementById('qrEditSave').addEventListener('click', function() {
      var name = editName.value.trim();
      var text = editText.value.trim();
      if (!text) { showToast('請輸入網址或文字'); return; }
      if (!name) name = text.substring(0, 30);

      loadQRJS(function() {
        generateQR(text, logoValue, previewWrap, 256, function(imageData) {
          var entry = { id: 'qr_' + Date.now(), name: name, text: text, logo: logoValue, image: imageData };
          if (editingIdx >= 0) {
            entry.id = items[editingIdx].id;
            items[editingIdx] = entry;
          } else {
            items.push(entry);
          }
          saveData(items);
          edited = false; clearEdited(editTitleEl);
          editBg.classList.remove('open');
          renderGallery();
          showToast(editingIdx >= 0 ? 'QR Code 已更新' : 'QR Code 已新增');
        });
      });
    });

    // ── Expose globals ──
    window.qrLoadData = loadData;
    window.qrSaveData = saveData;
    window.qrRenderGallery = renderGallery;
    window.qrEscHtml = escHtml;

    this.open = function() { openEditor(-1); };
    this.render = function(wrapper) {
      items = loadData();
      contentEl.style.display = '';
      wrapper.appendChild(contentEl);
      renderGallery();
    };
  }
});
