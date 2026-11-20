registerPlugin('img', {
  main: true,
  menuOrder: 3,
  label: '文壓圖',
  menuIcon: 'img',
  icon: 'add',
  mode: 'img',
  order: 12,
  favicon: function(canvas, ctx) {
    ctx.strokeStyle = '#ffd100'; ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 24, 24);
    ctx.beginPath(); ctx.arc(11, 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(14, 16); ctx.lineTo(22, 22); ctx.lineTo(28, 18); ctx.lineTo(28, 28); ctx.lineTo(4, 28); ctx.closePath(); ctx.fill();
  },
  open: null,
  render: null,
  storageKeys: ['imgStampData'],
  loadData(key) {
    return AppStorage.load(this.storageKeys, key) || [];
  },
  saveData(arr, key) {
    AppStorage.save(this.storageKeys, arr, key);
  },
  getDataCount(key) {
    return this.loadData(key).length;
  },
  load() {
	var self = this;
	const subCssList = ['img'];
	const subPlugins = ['img-sort', 'img-export', 'img-import', 'img-help'];
	
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
    //var STORAGE_KEY = 'imgStampData';
    //function loadStamps() {
    //  try { var d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(d)) return d; } catch (e) {}
    //  return [];
    //}
    //function saveStamps(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); if (typeof renderToolbar === 'function') renderToolbar(); }
    //function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    var stamps = self.loadData();
    var FONT_LIST = ['sans-serif','serif','monospace','Arial','Times New Roman','Courier New','Georgia','Verdana','Impact','Comic Sans MS','Microsoft JhengHei','Noto Sans TC'];


	

    // ── HTML ──────────────────────────────────────────────────
    var contentEl = document.createElement('div');
    contentEl.id = 'isContent';
    contentEl.setAttribute('data-plugin-content', '');
    contentEl.style.display = 'none';
    contentEl.innerHTML =
      '<div class="is-gallery" id="isGallery"></div>';
    document.body.appendChild(contentEl);

    // ── Editor popup modal (參考 bookmark.js bmEditModalBg) ───
    var editorModalEl = document.createElement('dialog');
    editorModalEl.className = 'app-dialog';
    editorModalEl.setAttribute('aria-labelledby', 'isEditorTitle');
    editorModalEl.id = 'isEditorModalBg';
    editorModalEl.innerHTML =
      `<div class="is-editor app-dialog-panel-medium" id="isEditor">
        <header class="app-modal-header">
          <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('img')}</span>
          <div class="app-modal-header-info"><h2 id="isEditorTitle" class="app-modal-header-title">新增母片</h2><p id="isEditorSubtitle" class="app-modal-header-subtitle">上傳或貼上圖片，再加入文字以建立母片。</p></div>
          <button type="button" class="app-modal-header-close" id="isEditorClose" aria-label="關閉">✕</button>
        </header>
        <div class="app-dialog-body">
        <input class="is-editor-name" id="isEditorName" type="text" placeholder="輸入母片名稱...">
        <div class="is-canvas-wrap" id="isCanvasWrap">
          <div class="is-canvas-empty" id="isCanvasEmpty">拖曳 / 貼上 / 點擊下方按鈕上傳圖片</div>
          <canvas id="isCanvas" style="display:none"></canvas>
          <div class="is-drop-overlay" id="isDropOverlay">放開以載入圖片</div>
        </div>
        <div class="is-text-list" id="isTextList"></div>
        <div class="is-output" id="isOutput">
          <img id="isOutputImg">
          <div style="display:flex;gap:8px">
            <button class="is-btn" id="isDownloadBtn">下載圖片</button>
            <button class="is-btn" id="isCopyB64Btn">複製 Base64</button>
          </div>
          <div class="is-b64-box" id="isB64Box" title="點擊複製"></div>
        </div>
        </div>
        <footer class="app-dialog-footer is-editor-footer">
          <button type="button" class="btn-reset" id="isUploadBtn">上傳圖片</button>
          <button type="button" class="btn-reset is-confirm-delete" id="isDeleteBtn" style="display:none">刪除母片</button>
          <button type="button" class="btn-reset" id="isExportBtn">輸出</button>
          <button type="button" class="btn-confirm" id="isSaveBtn">儲存</button>
        </footer>
      </div>`;
    document.body.appendChild(editorModalEl);

    var confirmEl = document.createElement('div');
    confirmEl.innerHTML = `
      <dialog id="isConfirmBg" class="app-dialog" aria-labelledby="isConfirmTitle">
        <div class="is-confirm app-dialog-panel-medium">
          <header class="app-modal-header">
            <div class="app-modal-header-info"><h2 id="isConfirmTitle" class="app-modal-header-title">確定要刪除這個母片？</h2></div>
            <button type="button" class="app-modal-header-close" id="isConfirmClose" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body"><div class="is-confirm-card" id="isConfirmCard"></div></div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" id="isConfirmCancel" autofocus>取消</button>
            <button type="button" class="btn-confirm is-confirm-delete" id="isConfirmOk">刪除</button>
          </footer>
        </div>
      </dialog>`;
    document.body.appendChild(confirmEl.firstElementChild);

    var isConfirmBg = document.getElementById('isConfirmBg');
    var pendingDeleteIdx = null;

    function showDeleteConfirm(idx) {
      pendingDeleteIdx = idx;
      var s = stamps[idx];
      var cardEl = document.getElementById('isConfirmCard');
      if (!s) { cardEl.innerHTML = ''; ModalManager.showDialog(isConfirmBg, closeDeleteConfirm); return; }
      cardEl.innerHTML =
        (s.image ? '<img alt="" src="' + AppUtils.escHtml(s.image) + '">' : '') +
        '<div class="is-confirm-card-body">' +
          '<div class="is-confirm-card-name">' + AppUtils.escHtml(s.name) + '</div>' +
          '<div class="is-confirm-card-meta">' + (s.texts || []).length + ' 個文字</div>' +
        '</div>';
      ModalManager.showDialog(isConfirmBg, closeDeleteConfirm);
    }

    function closeDeleteConfirm() {
      ModalManager.closeDialog(isConfirmBg);
      pendingDeleteIdx = null;
    }
    document.getElementById('isConfirmCancel').addEventListener('click', closeDeleteConfirm);
    document.getElementById('isConfirmClose').addEventListener('click', closeDeleteConfirm);
    isConfirmBg.addEventListener('click', event => { if (event.target === isConfirmBg) closeDeleteConfirm(); });

	document.getElementById('isConfirmOk').addEventListener('click', function() {
	  ModalManager.closeDialog(isConfirmBg);
	  if (pendingDeleteIdx === null) return;
	  
	  // 1. 操作資料陣列
	  stamps.splice(pendingDeleteIdx, 1);
	  
	  // ✨ 修正：使用 self 呼叫子項目物件身上的儲存方法，安全儲存！
	  self.saveData(stamps);
	  
	  pendingDeleteIdx = null;
	  
	  // 2. 重新整理畫面（這裡呼叫的是 init 內部的區域普通函式，直接呼叫名稱即可）
	  if (currentStampIdx >= 0) { 
		showGallery(); 
	  } else { 
		renderGallery(); 
	  }
	  
	  // 3. 提示訊息（如果 showToast 也是全域工具，可以直接呼叫）
	  showToast('母片已刪除');
	});


    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // ── Refs ──────────────────────────────────────────────────
    var galleryEl      = document.getElementById('isGallery');
    var editorModalBg  = document.getElementById('isEditorModalBg');
    var editorEl       = document.getElementById('isEditor');
    var editorTitle    = document.getElementById('isEditorTitle');
    var editorName     = document.getElementById('isEditorName');
    editorName.addEventListener('input', function() { edited = true; markEdited(editorTitle); });
    var canvasWrap     = document.getElementById('isCanvasWrap');
    var canvasEmpty = document.getElementById('isCanvasEmpty');
    var canvas      = document.getElementById('isCanvas');
    var ctx         = canvas.getContext('2d');
    var dropOverlay = document.getElementById('isDropOverlay');
    var textListEl  = document.getElementById('isTextList');
    var exportBtn   = document.getElementById('isExportBtn');
    var saveBtn     = document.getElementById('isSaveBtn');
    var deleteBtn   = document.getElementById('isDeleteBtn');
    var uploadBtn   = document.getElementById('isUploadBtn');
    var outputArea  = document.getElementById('isOutput');
    var outputImg   = document.getElementById('isOutputImg');
    var downloadBtn = document.getElementById('isDownloadBtn');
    var copyB64Btn  = document.getElementById('isCopyB64Btn');
    var b64Box      = document.getElementById('isB64Box');

    // ── State ─────────────────────────────────────────────────
    var currentStampIdx = -1;
    var baseImage = null;
    var baseImageData = null;
    var texts = [];
    var dragIdx = -1, dragOffX = 0, dragOffY = 0, isDragging = false, hoverIdx = -1;
    var lastOutputB64 = '';
    var viewMode = 'gallery'; // 'gallery' | 'editor'
    var edited = false;

    // ── View switching ────────────────────────────────────────
    function showGallery() {
      confirmLeave(edited, function() {
        viewMode = 'gallery';
        edited = false;
        clearEdited(editorTitle);
        ModalManager.closeDialog(editorModalBg);
        renderGallery();
      });
    }

    function showEditor(mode) {
      viewMode = 'editor';
      const isNew = mode === 'new';
      editorTitle.textContent = isNew ? '新增母片' : '編輯母片';
      document.getElementById('isEditorSubtitle').textContent = isNew
        ? '上傳或貼上圖片，再加入文字以建立母片。'
        : '調整圖片與文字，再儲存母片或輸出圖片。';
      editorModalBg.querySelector('.app-modal-header-icon').innerHTML = resolveIcon(isNew ? 'img' : 'edit');
      outputArea.classList.remove('open');
      ModalManager.showDialog(editorModalBg, showGallery);
    }

    document.getElementById('isEditorClose').addEventListener('click', showGallery);
    editorModalBg.addEventListener('click', event => { if (event.target === editorModalBg) showGallery(); });

    // ── Context menu ─────────────────────────────────────────
    var activeCtxMenu = null;
    function removeCtxMenu() {
      if (activeCtxMenu) { activeCtxMenu.remove(); activeCtxMenu = null; }
    }
    document.addEventListener('click', function() { removeCtxMenu(); });

    function showStampCtxMenu(x, y, idx) {
      removeCtxMenu();
      var menu = document.createElement('div');
      menu.className = 'is-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var editBtn = document.createElement('button');
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function(e) { e.stopPropagation(); removeCtxMenu(); openStampEditor(idx); });

      var copyBtn = document.createElement('button');
      copyBtn.textContent = '複製';
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation(); removeCtxMenu();
        var src = stamps[idx];
        if (!src) return;
        var clone = JSON.parse(JSON.stringify(src));
        clone.id = 'stamp_' + Date.now();
        var base = clone.name.replace(/-copy\(\d+\)$/, '');
        var n = 1;
        while (stamps.some(function(s) { return s.name === base + '-copy(' + n + ')'; })) n++;
        clone.name = base + '-copy(' + n + ')';
        stamps.push(clone);
        self.saveData(stamps);
        renderGallery();
        showToast('母片已複製');
      });

      var delBtn = document.createElement('button');
      delBtn.textContent = '刪除';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation(); removeCtxMenu();
        showDeleteConfirm(idx);
      });

      menu.appendChild(editBtn);
      menu.appendChild(copyBtn);
      menu.appendChild(delBtn);
      menu.addEventListener('click', function(e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;

      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    // ── Gallery ───────────────────────────────────────────────
    function renderGallery() {
      stamps = self.loadData();
      galleryEl.innerHTML = '';
      if (stamps.length === 0) {
        galleryEl.innerHTML = `<div class="is-gallery-empty"><div class="is-gallery-empty-icon">${resolveIcon("img", '#38bdf8', 64)}</div><div>尚無母片</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div></div>`;
        return;
      }
      var dragSrcIdx = null;
      stamps.forEach(function(s, i) {
        var card = document.createElement('div');
        card.className = 'is-gallery-item';
        card.draggable = true;
        var textCount = (s.texts || []).length;

        var thumbDiv = document.createElement('div');
        thumbDiv.className = 'is-gallery-thumb';
        if (s.image) {
          var img = document.createElement('img');
          img.src = s.image;
          img.alt = s.name;
          img.onerror = function() { thumbDiv.innerHTML = '<div class="is-no-thumb">🖼️</div>'; };
          thumbDiv.appendChild(img);
        } else {
          thumbDiv.innerHTML = '<div class="is-no-thumb">🖼️</div>';
        }

        var body = document.createElement('div');
        body.className = 'is-gallery-body';
        body.innerHTML = '<div class="is-gallery-name">' + AppUtils.escHtml(s.name) + '</div>' +
          '<div class="is-gallery-meta">' + textCount + ' 個文字</div>';

        card.appendChild(thumbDiv);
        card.appendChild(body);
        card.addEventListener('click', function() { openStampEditor(i); });
        card.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          showStampCtxMenu(e.clientX, e.clientY, i);
        });

        card.addEventListener('dragstart', function(e) {
          dragSrcIdx = i;
          card.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', function() {
          card.style.opacity = '';
          galleryEl.querySelectorAll('.is-gallery-item').forEach(function(c) { c.classList.remove('is-drag-over'); });
        });
        card.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          galleryEl.querySelectorAll('.is-gallery-item').forEach(function(c) { c.classList.remove('is-drag-over'); });
          card.classList.add('is-drag-over');
        });
        card.addEventListener('drop', function(e) {
          e.preventDefault();
          card.classList.remove('is-drag-over');
          if (dragSrcIdx === null || dragSrcIdx === i) return;
          var moved = stamps.splice(dragSrcIdx, 1)[0];
          stamps.splice(i, 0, moved);
		  self.saveData(stamps);
          renderGallery();
        });

        galleryEl.appendChild(card);
      });
    }

    // ── Open editor ───────────────────────────────────────────
    function openStampEditor(idx) {
      var s = stamps[idx];
      if (!s) return;
      currentStampIdx = idx;
      texts = JSON.parse(JSON.stringify(s.texts || []));
      baseImageData = s.image;
      deleteBtn.style.display = '';
      edited = false; clearEdited(editorTitle);
      showEditor('edit');
      editorName.value = s.name;
      renderTextList();
      loadImageFromData(s.image, function(img) {
        baseImage = img;
        canvas.style.display = 'block';
        canvasEmpty.style.display = 'none';
        redraw();
      });
    }

    function openNewEditor() {
      currentStampIdx = -1;
      baseImage = null;
      baseImageData = null;
      texts = [];
      lastOutputB64 = '';
      canvas.style.display = 'none';
      canvasEmpty.style.display = 'block';
      textListEl.innerHTML = '';
      deleteBtn.style.display = 'none';
      edited = false; clearEdited(editorTitle);
      showEditor('new');
      editorName.value = '';
    }

    // ── Canvas helpers ────────────────────────────────────────
    function scaleRatio() {
      if (!baseImage) return 1;
      return canvas.width / canvas.getBoundingClientRect().width;
    }

    function buildFont(t) {
      return (t.bold ? 'bold ' : '') + t.fontSize + 'px ' + (t.fontFamily || 'sans-serif');
    }

    function redraw(showOverlay) {
      if (!baseImage) return;
      canvas.width = baseImage.naturalWidth;
      canvas.height = baseImage.naturalHeight;
      ctx.drawImage(baseImage, 0, 0);
      texts.forEach(function(t, i) {
        ctx.font = buildFont(t);
        ctx.fillStyle = t.color;
        ctx.textBaseline = 'top';
        ctx.fillText(t.content || '', t.x, t.y);
        if (showOverlay !== false && i === hoverIdx) {
          var w = ctx.measureText(t.content || ' ').width;
          var h = t.fontSize * 1.2;
          ctx.save();
          ctx.strokeStyle = 'rgba(81,203,238,0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(t.x - 4, t.y - 4, w + 8, h + 8);
          ctx.fillStyle = 'rgba(81,203,238,0.08)';
          ctx.fillRect(t.x - 4, t.y - 4, w + 8, h + 8);
          ctx.restore();
        }
      });
    }

    function hitTest(mx, my) {
      var ratio = scaleRatio();
      var rx = mx * ratio, ry = my * ratio;
      for (var i = texts.length - 1; i >= 0; i--) {
        var t = texts[i];
        ctx.font = buildFont(t);
        var w = ctx.measureText(t.content || ' ').width;
        var h = t.fontSize * 1.2;
        if (rx >= t.x && rx <= t.x + w && ry >= t.y && ry <= t.y + h) return i;
      }
      return -1;
    }

    function loadImageFromData(dataUrl, cb) {
      var img = new Image();
      img.onload = function() { cb(img); };
      img.onerror = function() { showToast('圖片載入失敗'); };
      img.src = dataUrl;
    }

    function compressImage(dataUrl, maxSize, cb) {
      var img = new Image();
      img.onload = function() {
        var c = document.createElement('canvas');
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    }

    function handleNewImage(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        compressImage(e.target.result, 1920, function(compressed) {
          baseImageData = compressed;
          edited = true; markEdited(editorTitle);
          loadImageFromData(compressed, function(img) {
            baseImage = img;
            canvas.style.display = 'block';
            canvasEmpty.style.display = 'none';
            redraw();
          });
        });
      };
      reader.readAsDataURL(file);
    }

    // ── Text list ─────────────────────────────────────────────
    function renderTextList() {
      textListEl.innerHTML = '';
      texts.forEach(function(t, i) {
        var row = document.createElement('div');
        row.className = 'is-text-row';

        var inp = document.createElement('input');
        inp.type = 'text'; inp.value = t.content; inp.placeholder = '輸入文字...';
        inp.addEventListener('input', function() { t.content = inp.value; edited = true; markEdited(editorTitle); redraw(); });

        var fontSel = document.createElement('select');
        fontSel.title = '字型';
        FONT_LIST.forEach(function(f) {
          var opt = document.createElement('option');
          opt.value = f; opt.textContent = f; opt.style.fontFamily = f;
          if (f === (t.fontFamily || 'sans-serif')) opt.selected = true;
          fontSel.appendChild(opt);
        });
        fontSel.addEventListener('change', function() { t.fontFamily = fontSel.value; edited = true; markEdited(editorTitle); redraw(); });

        var sizeInp = document.createElement('input');
        sizeInp.type = 'number'; sizeInp.value = t.fontSize; sizeInp.min = 8; sizeInp.max = 200; sizeInp.title = '文字大小';
        sizeInp.addEventListener('input', function() { t.fontSize = parseInt(sizeInp.value) || 24; edited = true; markEdited(editorTitle); redraw(); });

        var boldBtn = document.createElement('button');
        boldBtn.title = '粗體';
        boldBtn.textContent = 'B';
        boldBtn.style.cssText = 'padding:4px 8px;border-radius:5px;border:1px solid var(--border);background:' + (t.bold ? 'var(--accent)' : 'transparent') + ';color:' + (t.bold ? '#fff' : 'var(--text-dim)') + ';cursor:pointer;font-size:13px;font-weight:bold;min-width:28px;transition:background .15s,color .15s';
        boldBtn.addEventListener('click', function() {
          t.bold = !t.bold; edited = true; markEdited(editorTitle);
          boldBtn.style.background = t.bold ? 'var(--accent)' : 'transparent';
          boldBtn.style.color = t.bold ? '#0f0f0f' : 'var(--text-dim)';
          redraw();
        });

        var colorInp = document.createElement('input');
        colorInp.type = 'color'; colorInp.value = t.color; colorInp.title = '文字顏色';
        colorInp.addEventListener('input', function() { t.color = colorInp.value; edited = true; markEdited(editorTitle); redraw(); });

        var delBtn = document.createElement('button');
        delBtn.className = 'is-del-text'; delBtn.textContent = '✕'; delBtn.title = '刪除此文字';
        delBtn.addEventListener('click', function() { texts.splice(i, 1); edited = true; markEdited(editorTitle); renderTextList(); redraw(); });

        row.appendChild(inp);
        row.appendChild(fontSel);
        row.appendChild(sizeInp);
        row.appendChild(boldBtn);
        row.appendChild(colorInp);
        row.appendChild(delBtn);
        textListEl.appendChild(row);
      });
    }

    // ── Canvas interaction ────────────────────────────────────
    canvas.addEventListener('mousedown', function(e) {
      if (!baseImage) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var hit = hitTest(mx, my);
      if (hit >= 0) {
        dragIdx = hit;
        var ratio = scaleRatio();
        dragOffX = mx * ratio - texts[hit].x;
        dragOffY = my * ratio - texts[hit].y;
        isDragging = false;
        e.preventDefault();
      }
    });

    canvas.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (dragIdx >= 0) {
        isDragging = true;
        var ratio = scaleRatio();
        texts[dragIdx].x = Math.max(0, mx * ratio - dragOffX);
        texts[dragIdx].y = Math.max(0, my * ratio - dragOffY);
        redraw();
        return;
      }
      var hit = hitTest(mx, my);
      if (hit !== hoverIdx) {
        hoverIdx = hit;
        canvas.style.cursor = hit >= 0 ? 'move' : 'crosshair';
        redraw();
      }
    });

    canvas.addEventListener('mouseleave', function() {
      if (hoverIdx >= 0) { hoverIdx = -1; redraw(); }
    });

    document.addEventListener('mouseup', function() { if (isDragging) { edited = true; markEdited(editorTitle); } dragIdx = -1; isDragging = false; });

    canvas.addEventListener('click', function(e) {
      if (!baseImage || isDragging) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (hitTest(mx, my) >= 0) return;
      var ratio = scaleRatio();
      texts.push({ x: mx * ratio, y: my * ratio, content: '新文字', fontSize: 24, color: '#ffffff', fontFamily: 'sans-serif', bold: false });
      edited = true; markEdited(editorTitle);
      renderTextList();
      redraw();
      var rows = textListEl.querySelectorAll('.is-text-row');
      if (rows.length > 0) {
        var lastInput = rows[rows.length - 1].querySelector('input[type="text"]');
        if (lastInput) { lastInput.focus(); lastInput.select(); }
      }
    });

    // ── Drop / paste / file ───────────────────────────────────
    canvasWrap.addEventListener('dragover', function(e) { e.preventDefault(); dropOverlay.classList.add('show'); });
    canvasWrap.addEventListener('dragleave', function() { dropOverlay.classList.remove('show'); });
    canvasWrap.addEventListener('drop', function(e) {
      e.preventDefault(); dropOverlay.classList.remove('show');
      if (e.dataTransfer.files.length) handleNewImage(e.dataTransfer.files[0]);
    });

    document.addEventListener('paste', function(e) {
      var imgActive = window.viewMode === 'img';
      if (!imgActive || viewMode !== 'editor') return;
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        if (e.clipboardData.items[i].type.indexOf('image/') === 0) {
          handleNewImage(e.clipboardData.items[i].getAsFile());
          break;
        }
      }
    });

    uploadBtn.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      if (fileInput.files.length) handleNewImage(fileInput.files[0]);
      fileInput.value = '';
    });

    // ── Export image ──────────────────────────────────────────
    exportBtn.addEventListener('click', function() {
      if (!baseImage) { showToast('請先載入母片'); return; }
      var prev = hoverIdx; hoverIdx = -1;
      redraw(false);
      lastOutputB64 = canvas.toDataURL('image/png');
      hoverIdx = prev;
      outputImg.src = lastOutputB64;
      b64Box.textContent = lastOutputB64;
      outputArea.classList.add('open');
    });

    downloadBtn.addEventListener('click', function() {
      if (!lastOutputB64) return;
      var a = document.createElement('a');
      a.href = lastOutputB64; a.download = 'stamped_' + Date.now() + '.png'; a.click();
    });

    function copyB64() {
      if (!lastOutputB64) return;
      navigator.clipboard.writeText(lastOutputB64).then(function() { showToast('Base64 已複製到剪貼簿'); });
    }
    copyB64Btn.addEventListener('click', copyB64);
    b64Box.addEventListener('click', copyB64);

    // ── Save stamp ────────────────────────────────────────────
    saveBtn.addEventListener('click', function() {
      if (!baseImageData) { showToast('請先載入母片'); return; }
      var name = editorName.value.trim() || '母片 ' + (stamps.length + 1);
      if (currentStampIdx >= 0) {
        stamps[currentStampIdx].texts = JSON.parse(JSON.stringify(texts));
        stamps[currentStampIdx].image = baseImageData;
        stamps[currentStampIdx].name = name;
        self.saveData(stamps);
        edited = false; clearEdited(editorTitle);
        showToast('已儲存');
      } else {
        stamps.push({ id: 'stamp_' + Date.now(), name: name, image: baseImageData, texts: JSON.parse(JSON.stringify(texts)) });
        self.saveData(stamps);
        currentStampIdx = stamps.length - 1;
        deleteBtn.style.display = '';
        edited = false; clearEdited(editorTitle);
        showToast('母片已新增');
      }
    });

    // ── Delete stamp ──────────────────────────────────────────
    deleteBtn.addEventListener('click', function() {
      if (currentStampIdx < 0) return;
      showDeleteConfirm(currentStampIdx);
    });

    // ── Expose globals for sub-plugins ─────────────────────
    window.isLoadStamps = () => self.loadData();
    window.isSaveStamps = stamps => self.saveData(stamps);
    window.isRenderGallery = renderGallery;
    //window.isEscHtml = escHtml;

    this.open = openNewEditor;

    this.render = (wrapper) => {
      stamps = self.loadData();
      contentEl.style.display = '';
      wrapper.appendChild(contentEl);
      showGallery();
      self.guestDiff?.syncVisibility();
    };
    self.guestDiff = GuestDiffCollection.create({ mode: 'img', reload: () => self.render(document.getElementById('app-content')),
      renderTile(target, { item }) {
        const image = document.createElement('img'); image.src = item.image; image.alt = ''; target.append(image);
        const title = document.createElement('h3'); title.textContent = item.name || '未命名母片';
        const meta = document.createElement('p'); meta.textContent = (item.texts?.length ?? 0) + ' 個文字'; target.append(title, meta);
      },
      renderDetail(target, { item }, update) {
        const preview = document.createElement('canvas'); preview.setAttribute('aria-label', item.name || '圖片母片預覽'); target.append(preview);
        const image = new Image();
        image.onload = () => {
          preview.width = image.naturalWidth; preview.height = image.naturalHeight;
          const context = preview.getContext('2d'); context.drawImage(image, 0, 0);
          for (const text of item.texts ?? []) {
            context.font = buildFont(text); context.fillStyle = text.color || '#ffffff'; context.textBaseline = 'top';
            context.fillText(text.content || '', text.x, text.y);
          }
          update?.();
        };
        image.onerror = () => { preview.replaceWith(document.createTextNode('圖片無法載入')); update?.(); }; image.src = item.image;
        const fields = document.createElement('dl');
        for (const [index, text] of (item.texts ?? []).entries()) {
          const title = document.createElement('dt'); title.textContent = '文字 ' + (index + 1);
          const value = document.createElement('dd'); value.textContent = text.content || ''; fields.append(title, value);
        }
        target.append(fields);
      }
    });
  }
});
