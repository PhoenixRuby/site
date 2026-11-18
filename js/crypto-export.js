/* =============================================
   CryptoExport — AES-GCM export encryption
   Encrypted file format:
     { "__enc": true, "v": 1, "iv": "<b64>", "ct": "<b64>" }
   Key: base64 of raw 256-bit AES key (44 chars)
   ============================================= */

window.CryptoExport = {

  async encrypt(text) {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const ct  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(text)
    );
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const b64 = buf => {
      const bytes = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s);
    };
    return {
      json:       JSON.stringify({ __enc: true, v: 1, iv: b64(iv), ct: b64(ct) }),
      keyBase64:  b64(rawKey)
    };
  },

  async decrypt(text, keyBase64) {
    let obj;
    try { obj = JSON.parse(text); } catch (_) { throw new Error('JSON 解析失敗'); }
    if (!obj.__enc) return text;
    const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    let rawKey;
    try { rawKey = fromB64(keyBase64); } catch (_) { throw new Error('金鑰格式錯誤'); }
    let key;
    try {
      key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
    } catch (_) { throw new Error('金鑰無效'); }
    let decoded;
    try {
      decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(obj.iv) }, key, fromB64(obj.ct));
    } catch (_) { throw new Error('解密失敗，金鑰可能不正確'); }
    return new TextDecoder().decode(decoded);
  },

  isEncrypted(text) {
    try { return JSON.parse(text).__enc === true; } catch (_) { return false; }
  }
};

/* =============================================
   Key reveal modal  (shown after encrypt export)
   Usage: window.showExportKeyModal(keyBase64, onDownload)
   ============================================= */
(function () {
  const style = document.createElement('style');
  style.textContent =
    '.cke-warn{font-size:.82rem;color:#ff9800;line-height:1.5;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.3);border-radius:8px;padding:10px 12px}' +
    '.cke-key-row{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px}' +
    '.cke-key-val{flex:1;font-family:"JetBrains Mono",monospace;font-size:.78rem;color:var(--text);word-break:break-all;line-height:1.5;user-select:all}' +
    '.cke-copy{flex-shrink:0;padding:6px 14px;border-radius:6px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:.78rem;cursor:pointer;transition:background .15s,color .15s}' +
    '.cke-copy:hover{background:var(--accent);color:#000}' +
    '.cke-copy.copied{border-color:var(--success);color:var(--success)}';
  document.head.appendChild(style);

  const bg = document.createElement('dialog');
  bg.className = 'app-dialog';
  bg.id = 'cryptoKeyBg';
  bg.setAttribute('aria-labelledby', 'ckeTitle');
  bg.innerHTML =
    '<div class="app-dialog-panel-medium" style="width:min(460px,calc(100vw - 32px))">' +
      '<header class="app-modal-header">' +
        '<div class="app-modal-header-info"><h2 id="ckeTitle" class="app-modal-header-title">🔑 請先複製並保存您的金鑰</h2></div>' +
        '<button type="button" class="app-modal-header-close" aria-label="關閉">✕</button>' +
      '</header>' +
      '<div class="app-dialog-body">' +
      '<div class="cke-warn">⚠ 此金鑰只顯示一次，關閉後無法再次查看。<br>遺失金鑰將導致加密檔案永久無法解密。</div>' +
      '<div class="cke-key-row"><span class="cke-key-val" id="ckeKeyVal"></span><button class="cke-copy" id="ckeCopyBtn">複製</button></div>' +
      '</div>' +
      '<footer class="app-dialog-footer"><button class="btn-confirm" id="ckeDlBtn" disabled>已複製金鑰，下載加密檔</button></footer>' +
    '</div>';
  document.body.appendChild(bg);

  const keyValEl = document.getElementById('ckeKeyVal');
  const copyBtn  = document.getElementById('ckeCopyBtn');
  const dlBtn    = document.getElementById('ckeDlBtn');
  let _onDownload = null;

  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(keyValEl.textContent).then(function () {
      copyBtn.textContent = '已複製 ✓';
      copyBtn.classList.add('copied');
      dlBtn.disabled = false;
      setTimeout(function () {
        copyBtn.textContent = '複製';
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  });

  function close() {
    ModalManager.closeDialog(bg);
    keyValEl.textContent = '';
    _onDownload = null;
  }

  bg.querySelector('.app-modal-header-close').addEventListener('click', close);
  bg.addEventListener('click', function(e) { if (e.target === bg) close(); });
  dlBtn.addEventListener('click', function () {
    const download = _onDownload;
    close();
    if (typeof download === 'function') download();
  });

  window.showExportKeyModal = function (keyBase64, onDownload) {
    keyValEl.textContent = keyBase64;
    dlBtn.disabled = true;
    copyBtn.textContent = '複製';
    copyBtn.classList.remove('copied');
    _onDownload = onDownload;
    ModalManager.showDialog(bg, close);
  };
})();

/* =============================================
   Decrypt key input modal  (shown on encrypted import)
   Usage: window.showDecryptModal(encText, onSuccess(plainText), onCancel)
   ============================================= */
(function () {
  const style = document.createElement('style');
  style.textContent =
    '.cde-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-family:"JetBrains Mono",monospace;font-size:.82rem;color:var(--text);width:100%;box-sizing:border-box;outline:none;transition:border-color .15s}' +
    '.cde-input:focus{border-color:var(--accent)}' +
    '.cde-err{font-size:.8rem;color:var(--danger,#e53935)}';
  document.head.appendChild(style);

  const bg = document.createElement('dialog');
  bg.className = 'app-dialog';
  bg.id = 'cryptoDecBg';
  bg.setAttribute('aria-labelledby', 'cdeTitle');
  bg.innerHTML =
    '<div class="app-dialog-panel-medium" style="width:min(460px,calc(100vw - 32px))">' +
      '<header class="app-modal-header">' +
        '<div class="app-modal-header-info"><h2 id="cdeTitle" class="app-modal-header-title">🔐 此檔案已加密</h2><p class="app-modal-header-subtitle">請輸入匯出時產生的金鑰以解密</p></div>' +
        '<button type="button" class="app-modal-header-close" aria-label="關閉">✕</button>' +
      '</header>' +
      '<div class="app-dialog-body">' +
      '<input class="cde-input" id="cdeKeyInput" placeholder="貼上金鑰…" spellcheck="false">' +
      '<div class="cde-err" id="cdeErr"></div>' +
      '</div>' +
      '<footer class="app-dialog-footer"><button class="btn-reset" id="cdeCancel">取消</button><button class="btn-confirm" id="cdeOk">解密</button></footer>' +
    '</div>';
  document.body.appendChild(bg);

  const keyInput = document.getElementById('cdeKeyInput');
  const errEl    = document.getElementById('cdeErr');
  let _encText   = '';
  let _onSuccess = null;
  let _onCancel  = null;

  function close() {
    ModalManager.closeDialog(bg);
    keyInput.value = '';
    errEl.style.display = 'none';
    _encText = '';
    _onSuccess = null;
    _onCancel = null;
  }

  function cancel() {
    const onCancel = _onCancel;
    close();
    if (typeof onCancel === 'function') onCancel();
  }

  bg.querySelector('.app-modal-header-close').addEventListener('click', cancel);
  document.getElementById('cdeCancel').addEventListener('click', cancel);

  document.getElementById('cdeOk').addEventListener('click', async function () {
    const key = keyInput.value.trim();
    if (!key) { errEl.textContent = '請輸入金鑰'; errEl.style.display = ''; return; }
    errEl.style.display = 'none';
    const request = _onSuccess;
    try {
      const plain = await window.CryptoExport.decrypt(_encText, key);
      if (!bg.open || _onSuccess !== request) return;
      close();
      if (typeof request === 'function') request(plain);
    } catch (e) {
      if (!bg.open || _onSuccess !== request) return;
      errEl.textContent = e.message || '解密失敗，請確認金鑰是否正確';
      errEl.style.display = '';
    }
  });

  keyInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('cdeOk').click();
  });

  bg.addEventListener('click', function (e) {
    if (e.target === bg) cancel();
  });

  window.showDecryptModal = function (encText, onSuccess, onCancel) {
    _encText   = encText;
    _onSuccess = onSuccess;
    _onCancel  = onCancel;
    keyInput.value = '';
    errEl.style.display = 'none';
    ModalManager.showDialog(bg, cancel);
    keyInput.focus();
  };
})();
