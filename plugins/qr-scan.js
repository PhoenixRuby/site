registerPlugin('qr-scan', {
  icon: 'scan',
  label: '解析', 
  mode: 'qr', 
  order: 3, 
  open: null,

  load() {
	this.init(); 
  },
  init(){
    var wrap = document.createElement('div');
    wrap.innerHTML =
      `<dialog id="qrScanBg" class="app-dialog" aria-labelledby="qrScanTitle"><div class="qr-scan-modal app-dialog-panel-medium">
        <header class="app-modal-header">
          <span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
          <div class="app-modal-header-info"><h2 class="app-modal-header-title" id="qrScanTitle">QR Code 解析</h2><p class="app-modal-header-subtitle">選擇、拖曳或貼上圖片以解析內容。</p></div>
          <button type="button" class="app-modal-header-close" id="qrScanClose" aria-label="關閉">✕</button>
        </header>
        <div class="app-dialog-body">
        <div class="qr-scan-drop" id="qrScanDrop"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>點擊 / 拖曳 / 貼上圖片<div class="hint">支援 PNG、JPG、WebP 等常見格式</div></div>
        <input type="file" id="qrScanFileInput" accept="image/*" style="display:none">
          <div id="qrScanResults"></div>
        </div>
        <footer class="app-dialog-footer">
          <button type="button" class="btn-reset" id="qrScanCancel">關閉</button>
          <div class="qr-scan-actions" id="qrScanActions" style="display:none"><button type="button" class="btn-reset" id="qrScanReset">重選圖片</button><button type="button" class="btn-confirm" id="qrScanAnalyse">開始解析</button></div>
        </footer>
      </div></dialog>`;
    document.body.appendChild(wrap.firstElementChild);

    var scanBg = document.getElementById('qrScanBg');
    var dropZone = document.getElementById('qrScanDrop');
    var fileInput = document.getElementById('qrScanFileInput');
    var actionsEl = document.getElementById('qrScanActions');
    var results = document.getElementById('qrScanResults');
    var currentFile = null;
    var lastSecret = null;

    function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function extractSecret(str) {
      try { var u = new URL(str); var s = u.searchParams.get('secret'); if (s) return s; } catch (_) {}
      var m = str.match(/[?&]?secret=([^&\s]+)/i); if (m) return m[1];
      var otp = str.match(/secret=([A-Z2-7a-z0-9]+)/i); if (otp) return otp[1];
      return null;
    }

    function makeCopyBtn(text) {
      var btn = document.createElement('button');
      btn.className = 'qr-scan-copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(text).then(function() {
          btn.textContent = 'Copied';
          btn.classList.add('copied');
          setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
        });
      });
      return btn;
    }

    function showUploadState() {
      dropZone.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>點擊 / 拖曳 / 貼上圖片<div class="hint">支援 PNG、JPG、WebP 等常見格式</div>';
      actionsEl.style.display = 'none';
      results.style.display = 'none';
      results.innerHTML = '';
      currentFile = null;
      fileInput.value = '';
    }

    function showPreviewState(file) {
      currentFile = file;
      results.style.display = 'none';
      results.innerHTML = '';
      var img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      dropZone.innerHTML = '';
      dropZone.appendChild(img);
      actionsEl.style.display = 'flex';
    }

    function showResultState(raw) {
      actionsEl.style.display = 'none';
      renderResults(raw);
    }

function renderResults(resultList) {
  results.style.display = 'block';
  results.innerHTML = '';

  if (!resultList || resultList.length === 0) {
    results.innerHTML = '<div class="qr-scan-fail">無法解析條碼 / QR Code</div>';
    actionsEl.style.display = 'flex';
    return;
  }

  resultList.forEach(function(result, idx) {
    //var raw = result.getText();
    //var format = result.getBarcodeFormat(); // e.g. QR_CODE, CODE_128, EAN_13...
	var raw = result.text;
	var format = result.format;

    var row = document.createElement('div');
    row.className = 'qr-scan-result-row';

    var body = document.createElement('div');
    body.className = 'qr-scan-result-body';
    body.innerHTML = `
	  <div class="qr-scan-result-label">
	    ${resultList.length > 1 ? `條碼 ${idx + 1}　` : ''}
	    <span class="qr-format-badge">${escapeHtml(String(format))}</span>
	  </div>
	  <div class="qr-scan-result-value">${escapeHtml(raw)}</div>
	`;


    row.appendChild(body);
    const rowActions = document.createElement('div');
    rowActions.className = 'qr-scan-result-actions';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn-quick';
    add.textContent = '新增為一組';
    add.addEventListener('click', () => window.plugins.qr.open(raw, closeScan));
    rowActions.append(makeCopyBtn(raw), add);
    row.appendChild(rowActions);
    results.appendChild(row);

    // TOTP secret（只對 QR Code 格式嘗試）
    var secret = extractSecret(raw);
    if (secret) {
      lastSecret = secret;
      if (window.setLastSecret) window.setLastSecret(lastSecret);
      var secretRow = document.createElement('div');
      secretRow.className = 'qr-scan-result-row qr-scan-secret-row';
      var secretBody = document.createElement('div');
      secretBody.className = 'qr-scan-result-body';
      secretBody.innerHTML = `
		  <div class="qr-scan-result-label">TOTP Secret</div>
		  <div class="qr-scan-secret-value">${escapeHtml(secret)}</div>
		`;

      secretRow.appendChild(secretBody);
      secretRow.appendChild(makeCopyBtn(secret));
      results.appendChild(secretRow);
    }
  });

  actionsEl.style.display = 'flex';
  document.getElementById('qrScanAnalyse').style.display = 'none';
}

    function renderResults_old(raw) {
      results.style.display = 'block';
      results.innerHTML = '';

      if (!raw) {
        results.innerHTML = '<div class="qr-scan-fail">無法解析 QR Code</div>';
        actionsEl.style.display = 'flex';
        return;
      }

      // Full content row with copy
      var urlRow = document.createElement('div');
      urlRow.className = 'qr-scan-result-row';
      var urlBody = document.createElement('div');
      urlBody.className = 'qr-scan-result-body';
      urlBody.innerHTML = '<div class="qr-scan-result-label">完整內容</div><div class="qr-scan-result-value">' + escapeHtml(raw) + '</div>';
      urlRow.appendChild(urlBody);
      urlRow.appendChild(makeCopyBtn(raw));
      results.appendChild(urlRow);

      // Secret row (TOTP)
      var secret = extractSecret(raw);
      if (secret) {
        lastSecret = secret;
        if (window.setLastSecret) window.setLastSecret(lastSecret);

        var secretRow = document.createElement('div');
        secretRow.className = 'qr-scan-result-row qr-scan-secret-row';
        var secretBody = document.createElement('div');
        secretBody.className = 'qr-scan-result-body';
        secretBody.innerHTML = '<div class="qr-scan-result-label">TOTP Secret</div><div class="qr-scan-secret-value">' + escapeHtml(secret) + '</div>';
        secretRow.appendChild(secretBody);
        secretRow.appendChild(makeCopyBtn(secret));
        results.appendChild(secretRow);
      }

      // Reset button to scan another
      actionsEl.style.display = 'flex';
      document.getElementById('qrScanAnalyse').style.display = 'none';
    }

    function openScan() {
      showUploadState();
      document.getElementById('qrScanAnalyse').style.display = '';
      ModalManager.showDialog(scanBg, closeScan);
    }
    function closeScan() { ModalManager.closeDialog(scanBg); }
    document.getElementById('qrScanClose').addEventListener('click', closeScan);
    document.getElementById('qrScanCancel').addEventListener('click', closeScan);
    scanBg.addEventListener('click', event => { if (event.target === scanBg) closeScan(); });

    dropZone.addEventListener('click', function() { if (!currentFile) fileInput.click(); });
    fileInput.addEventListener('change', function(e) { if (e.target.files.length) showPreviewState(e.target.files[0]); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function(e) { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) showPreviewState(e.dataTransfer.files[0]); });

    document.addEventListener('paste', function(e) {
      if (!scanBg.open) return;
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        if (e.clipboardData.items[i].type.startsWith('image/')) { showPreviewState(e.clipboardData.items[i].getAsFile()); break; }
      }
    });

    //document.getElementById('qrScanAnalyse').addEventListener('click', function() {
    //  if (!currentFile) return;
    //  var img = new Image();
    //  img.src = URL.createObjectURL(currentFile);
    //  img.onload = function() {
    //    var canvas = document.createElement('canvas'); 
	//	canvas.width = img.width; 
	//	canvas.height = img.height;
    //    var ctx = canvas.getContext('2d');
	//	ctx.drawImage(img, 0, 0);
	//
    //    //var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    //    ////var code = jsQR(imageData.data, canvas.width, canvas.height);
    //    ////showResultState(code ? code.data : null);
    //  };
    //});

document.getElementById('qrScanAnalyse').addEventListener('click', function() {
  if (!currentFile) return;
  var img = new Image();
  img.src = URL.createObjectURL(currentFile);

  img.onload = async function() {  // ← 加 async
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);

    var resultList = await tryDecodeWithFallbacks(canvas);  // ← 接住回傳值
    showResultState(resultList.length ? resultList : null);
  };
});

async function tryDecodeWithFallbacks(originalCanvas) {
	
  var attempts = [
    { label: '原圖',           fn: function() { return originalCanvas; } },
    { label: '補白邊 40px',    fn: function() { return addQuietZone(originalCanvas, 40); } },
    { label: '補白邊 80px',    fn: function() { return addQuietZone(originalCanvas, 80); } },
    { label: '放大 2x',        fn: function() { return upscale(originalCanvas, 2); } },
    { label: '放大 2x + 白邊', fn: function() { return addQuietZone(upscale(originalCanvas, 2), 60); } },
  ];

  var bestResults = [];
  for (var i = 0; i < attempts.length; i++) {
    var c = attempts[i].fn();
    console.log('[嘗試]', attempts[i].label, 'canvas size:', c.width, 'x', c.height);
    var found = await decodeWithZXing(c);
    console.log('[結果]', attempts[i].label, '找到', found.length, '個');
    if (found.length > bestResults.length) bestResults = found;
    if (bestResults.length > 1) break;
  }
  return bestResults;
}
async function decodeWithZXing(canvas) {
  try {
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var decoder = await library('ZXingWASM');
    var results = await decoder.readBarcodes(imageData, {
      tryHarder: true,
      formats: [],  // 空陣列 = 所有格式
    });
    return results;  // 已經是陣列，每個有 .text 和 .format
  } catch (_) { return []; }
}

function decodeWithZXing_old2(canvas) {
  try {
    var hints = new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    var reader = new ZXing.MultiFormatReader();
    reader.setHints(hints);
    var luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
    var binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
    try {
      var multiReader = new ZXing.GenericMultipleBarcodeReader(reader);
      return multiReader.decodeMultiple(binaryBitmap);
    } catch (_) {
      try {
        var single = reader.decode(binaryBitmap);
        return single ? [single] : [];
      } catch (_) { return []; }
    }
  } catch (_) { return []; }
}

function upscale(src, factor) {
  const dst = document.createElement('canvas');
  dst.width  = src.width  * factor;
  dst.height = src.height * factor;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = false;  // 保持清晰邊緣
  ctx.drawImage(src, 0, 0, dst.width, dst.height);
  return dst;
}

function addQuietZone(src, padding) {
  const dst = document.createElement('canvas');
  dst.width  = src.width  + padding * 2;
  dst.height = src.height + padding * 2;
  const ctx = dst.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, dst.width, dst.height);
  ctx.drawImage(src, padding, padding);
  
   // ← debug：看加完白邊的結果
  //var dbg = document.createElement('img');
  //dbg.src = dst.toDataURL();
  //dbg.style = 'position:fixed;top:0;right:0;z-index:99999;width:200px;border:3px solid green;';
  //document.body.appendChild(dbg);
  
  return dst;
}

    document.getElementById('qrScanReset').addEventListener('click', function() {
      showUploadState();
      document.getElementById('qrScanAnalyse').style.display = '';
    });

    // ── Full-page drag-to-scan ──
    var dragDropOverlay = document.createElement('div');
    dragDropOverlay.id = 'qrDragOverlay';
    dragDropOverlay.innerHTML = '<div class="qr-drag-overlay-inner">📷 放開以掃描 QR Code</div>';
    document.body.appendChild(dragDropOverlay);

    var qrDragStyle = document.createElement('style');
    qrDragStyle.textContent =
      '#qrDragOverlay{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s}' +
      '#qrDragOverlay.active{opacity:1;pointer-events:all}' +
      '.qr-drag-overlay-inner{border:3px dashed var(--accent);border-radius:16px;padding:48px 64px;color:var(--accent);font-size:1.4rem;font-weight:600;background:rgba(0,0,0,.6);pointer-events:none;text-align:center}';
    document.head.appendChild(qrDragStyle);

    var qrDragCounter = 0;
    function shouldHandleQrDrop() {
      if (window.viewMode !== 'qr') return false;
      if (document.querySelector('dialog:modal')) return false;
      return true;
    }
    document.addEventListener('dragenter', function(e) {
      if (!shouldHandleQrDrop()) return;
      qrDragCounter++;
      dragDropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function(e) {
      if (!shouldHandleQrDrop() && qrDragCounter === 0) return;
      qrDragCounter--;
      if (qrDragCounter <= 0) { qrDragCounter = 0; dragDropOverlay.classList.remove('active'); }
    });
    document.addEventListener('dragover', function(e) {
      if (!shouldHandleQrDrop()) return;
      e.preventDefault();
    });
    document.addEventListener('drop', function(e) {
      qrDragCounter = 0;
      dragDropOverlay.classList.remove('active');
      if (!shouldHandleQrDrop()) return;
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      e.preventDefault();
      scanAndShow(file);
    });

    function scanAndShow(file) {
      openScan();
      currentFile = file;
      var objectUrl = URL.createObjectURL(file);
      var img = new Image();
      img.src = objectUrl;
      img.style.cssText = 'max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border)';
      dropZone.innerHTML = '';
      dropZone.appendChild(img);
      actionsEl.style.display = 'none';
      results.style.display = 'none';
      results.innerHTML = '';

      img.onload = async function() {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        var resultList = await tryDecodeWithFallbacks(canvas);
        showResultState(resultList.length ? resultList : null);
      };
    }

    window.extractSecret = extractSecret;
    window.setLastSecret = function(s) { lastSecret = s; };
    window.getLastSecret = function() { return lastSecret; };

    this.open = openScan;
  }
});
