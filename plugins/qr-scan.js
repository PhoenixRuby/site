registerPlugin('qr-scan', {
  icon: window.CARD_ICONS.scan,
  label: '解析', mode: 'qr', order: 20, open: null,

  init() {
    var script = document.createElement('script');
    //script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
	//script.src = 'libs/jsQR.1.4.0.js';
	//script.src = 'libs/zxing.0.21.3.min.js';
	script.src = 'libs/zxing-wasm.js';
	
    document.head.appendChild(script);

    var style = document.createElement('style');
    style.textContent =
      '#qrScanBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}' +
      '#qrScanBg.open{opacity:1;pointer-events:all}' +
      '.qr-scan-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:min(480px,92vw);transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:18px}' +
      '#qrScanBg.open .qr-scan-modal{transform:translateY(0) scale(1)}' +
      '.qr-scan-drop{border:2px dashed var(--border);border-radius:10px;padding:36px 20px;text-align:center;cursor:pointer;color:var(--text-dim);font-size:.9rem;transition:border-color .2s,background .2s;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}' +
      '.qr-scan-drop:hover,.qr-scan-drop.drag-over{border-color:var(--accent);background:rgba(0,229,255,.04);color:var(--text)}' +
      '.qr-scan-drop svg{width:40px;height:40px;stroke:var(--text-dim);display:block}' +
      '.qr-scan-drop .hint{font-size:.78rem;opacity:.55}' +
      '.qr-scan-drop img{max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border)}' +
      '.qr-scan-actions{display:flex;gap:8px}' +
      '.qr-scan-btn{flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);cursor:pointer;font-size:.85rem;font-weight:600;transition:background .15s,color .15s,border-color .15s,opacity .15s}' +
      '.qr-scan-btn-go{background:var(--accent);color:#fff;border-color:var(--accent)}' +
      '.qr-scan-btn-go:hover{opacity:.88}' +
      '.qr-scan-btn-reset{background:transparent;color:var(--text-dim)}' +
      '.qr-scan-btn-reset:hover{background:var(--surface2);color:var(--text);border-color:var(--accent)}' +
      '#qrScanResults{display:none;animation:qrScanFadeUp .4s ease}' +
      '@keyframes qrScanFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
      '.qr-scan-result-row{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px}' +
      '.qr-scan-result-body{flex:1;min-width:0}' +
      '.qr-scan-result-label{font-size:.7rem;color:var(--text-dim);font-family:"JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}' +
      '.qr-scan-result-value{font-family:"JetBrains Mono",monospace;font-size:.82rem;color:var(--text);word-break:break-all;line-height:1.5}' +
      '.qr-scan-result-value a{color:var(--accent);text-decoration:none}.qr-scan-result-value a:hover{text-decoration:underline}' +
      '.qr-scan-secret-row{border-color:var(--accent2);background:rgba(108,63,224,.07)}' +
      '.qr-scan-secret-value{font-family:"JetBrains Mono",monospace;font-size:.88rem;color:var(--accent);letter-spacing:.05em;word-break:break-all}' +
      '.qr-scan-copy-btn{flex-shrink:0;padding:7px 14px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text-dim);font-size:.75rem;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}' +
      '.qr-scan-copy-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}' +
      '.qr-scan-copy-btn.copied{border-color:var(--success);color:var(--success)}' +
      '.qr-scan-fail{color:var(--danger);font-size:.85rem;text-align:center;padding:10px 0}' +
	  '.qr-format-badge {display: inline-block;font-size: 0.72em;padding: 1px 6px;border-radius: 4px;background: #e8f0fe;color: #3c5faa;font-weight: 600;vertical-align: middle;margin-left: 4px;}';
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="qrScanBg"><div class="qr-scan-modal">' +
        '<div class="modal-header"><h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> QR Code 解析</h2><button class="close-btn" id="qrScanClose">✕</button></div>' +
        '<div class="qr-scan-drop" id="qrScanDrop"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>點擊 / 拖曳 / 貼上圖片<div class="hint">支援 PNG、JPG、WebP 等常見格式</div></div>' +
        '<input type="file" id="qrScanFileInput" accept="image/*" style="display:none">' +
        '<div class="qr-scan-actions" id="qrScanActions" style="display:none"><button class="qr-scan-btn qr-scan-btn-go" id="qrScanAnalyse">▶ 開始解析</button><button class="qr-scan-btn qr-scan-btn-reset" id="qrScanReset">↺ 重選圖片</button></div>' +
        '<div id="qrScanResults"></div>' +
      '</div></div>';
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
    body.innerHTML =
      '<div class="qr-scan-result-label">' +
        (resultList.length > 1 ? '條碼 ' + (idx + 1) + '　' : '') +
        '<span class="qr-format-badge">' + escapeHtml(String(format)) + '</span>' +
      '</div>' +
      '<div class="qr-scan-result-value">' + escapeHtml(raw) + '</div>';

    row.appendChild(body);
    row.appendChild(makeCopyBtn(raw));
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
      secretBody.innerHTML =
        '<div class="qr-scan-result-label">TOTP Secret</div>' +
        '<div class="qr-scan-secret-value">' + escapeHtml(secret) + '</div>';
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
      scanBg.classList.add('open');
    }
    bindPopup(scanBg, function() { scanBg.classList.remove('open'); });

    dropZone.addEventListener('click', function() { if (!currentFile) fileInput.click(); });
    fileInput.addEventListener('change', function(e) { if (e.target.files.length) showPreviewState(e.target.files[0]); });
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function(e) { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) showPreviewState(e.dataTransfer.files[0]); });

    document.addEventListener('paste', function(e) {
      if (!scanBg.classList.contains('open')) return;
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
    var results = await ZXingWASM.readBarcodes(imageData, {
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
      if (scanBg.classList.contains('open')) return false;
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
