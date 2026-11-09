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
    '#cryptoKeyBg{position:fixed;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s}' +
    '#cryptoKeyBg.open{opacity:1;pointer-events:all}' +
    '.cke-box{background:var(--surface);border:1px solid var(--accent);border-radius:14px;padding:28px;width:min(460px,92vw);display:flex;flex-direction:column;gap:16px;transform:scale(.95);transition:transform .2s cubic-bezier(.22,1,.36,1)}' +
    '#cryptoKeyBg.open .cke-box{transform:scale(1)}' +
    '.cke-title{font-size:1rem;font-weight:700;color:var(--accent)}' +
    '.cke-warn{font-size:.82rem;color:#ff9800;line-height:1.5;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.3);border-radius:8px;padding:10px 12px}' +
    '.cke-key-row{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px}' +
    '.cke-key-val{flex:1;font-family:"JetBrains Mono",monospace;font-size:.78rem;color:var(--text);word-break:break-all;line-height:1.5;user-select:all}' +
    '.cke-copy{flex-shrink:0;padding:6px 14px;border-radius:6px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:.78rem;cursor:pointer;transition:background .15s,color .15s}' +
    '.cke-copy:hover{background:var(--accent);color:#000}' +
    '.cke-copy.copied{border-color:var(--success);color:var(--success)}' +
    '.cke-dl{padding:11px;border-radius:10px;border:none;background:var(--accent);color:#000;font-weight:700;font-size:.88rem;cursor:pointer;transition:opacity .15s}' +
    '.cke-dl:hover{opacity:.88}' +
    '.cke-dl:disabled{opacity:.4;cursor:not-allowed}';
  document.head.appendChild(style);

  const bg = document.createElement('div');
  bg.id = 'cryptoKeyBg';
  bg.innerHTML =
    '<div class="cke-box">' +
      '<div class="cke-title">🔑 請先複製並保存您的金鑰</div>' +
      '<div class="cke-warn">⚠ 此金鑰只顯示一次，關閉後無法再次查看。<br>遺失金鑰將導致加密檔案永久無法解密。</div>' +
      '<div class="cke-key-row"><span class="cke-key-val" id="ckeKeyVal"></span><button class="cke-copy" id="ckeCopyBtn">複製</button></div>' +
      '<button class="cke-dl" id="ckeDlBtn" disabled>已複製金鑰，下載加密檔</button>' +
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

  dlBtn.addEventListener('click', function () {
    bg.classList.remove('open');
    if (typeof _onDownload === 'function') _onDownload();
  });

  window.showExportKeyModal = function (keyBase64, onDownload) {
    keyValEl.textContent = keyBase64;
    dlBtn.disabled = true;
    copyBtn.textContent = '複製';
    copyBtn.classList.remove('copied');
    _onDownload = onDownload;
    bg.classList.add('open');
  };
})();

/* =============================================
   Decrypt key input modal  (shown on encrypted import)
   Usage: window.showDecryptModal(encText, onSuccess(plainText), onCancel)
   ============================================= */
(function () {
  const style = document.createElement('style');
  style.textContent =
    '#cryptoDecBg{position:fixed;inset:0;z-index:600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s}' +
    '#cryptoDecBg.open{opacity:1;pointer-events:all}' +
    '.cde-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:min(420px,92vw);display:flex;flex-direction:column;gap:14px;transform:scale(.95);transition:transform .2s cubic-bezier(.22,1,.36,1)}' +
    '#cryptoDecBg.open .cde-box{transform:scale(1)}' +
    '.cde-title{font-size:1rem;font-weight:700;color:var(--text)}' +
    '.cde-hint{font-size:.82rem;color:var(--text-dim)}' +
    '.cde-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-family:"JetBrains Mono",monospace;font-size:.82rem;color:var(--text);width:100%;box-sizing:border-box;outline:none;transition:border-color .15s}' +
    '.cde-input:focus{border-color:var(--accent)}' +
    '.cde-err{font-size:.8rem;color:var(--danger,#e53935);display:none}' +
    '.cde-actions{display:flex;gap:8px}' +
    '.cde-cancel{flex:0 0 auto;padding:10px 18px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:.85rem}' +
    '.cde-ok{flex:1;padding:10px;border-radius:8px;border:none;background:var(--accent);color:#000;font-weight:700;font-size:.85rem;cursor:pointer;transition:opacity .15s}' +
    '.cde-ok:hover{opacity:.88}';
  document.head.appendChild(style);

  const bg = document.createElement('div');
  bg.id = 'cryptoDecBg';
  bg.innerHTML =
    '<div class="cde-box">' +
      '<div class="cde-title">🔐 此檔案已加密</div>' +
      '<div class="cde-hint">請輸入匯出時產生的金鑰以解密</div>' +
      '<input class="cde-input" id="cdeKeyInput" placeholder="貼上金鑰…" spellcheck="false">' +
      '<div class="cde-err" id="cdeErr"></div>' +
      '<div class="cde-actions"><button class="cde-cancel" id="cdeCancel">取消</button><button class="cde-ok" id="cdeOk">解密</button></div>' +
    '</div>';
  document.body.appendChild(bg);

  const keyInput = document.getElementById('cdeKeyInput');
  const errEl    = document.getElementById('cdeErr');
  let _encText   = '';
  let _onSuccess = null;
  let _onCancel  = null;

  function close() {
    bg.classList.remove('open');
    keyInput.value = '';
    errEl.style.display = 'none';
  }

  document.getElementById('cdeCancel').addEventListener('click', function () {
    close();
    if (typeof _onCancel === 'function') _onCancel();
  });

  document.getElementById('cdeOk').addEventListener('click', async function () {
    const key = keyInput.value.trim();
    if (!key) { errEl.textContent = '請輸入金鑰'; errEl.style.display = ''; return; }
    errEl.style.display = 'none';
    try {
      const plain = await window.CryptoExport.decrypt(_encText, key);
      close();
      if (typeof _onSuccess === 'function') _onSuccess(plain);
    } catch (e) {
      errEl.textContent = e.message || '解密失敗，請確認金鑰是否正確';
      errEl.style.display = '';
    }
  });

  keyInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('cdeOk').click();
  });

  bg.addEventListener('click', function (e) {
    if (e.target === bg) { close(); if (typeof _onCancel === 'function') _onCancel(); }
  });

  window.showDecryptModal = function (encText, onSuccess, onCancel) {
    _encText   = encText;
    _onSuccess = onSuccess;
    _onCancel  = onCancel;
    keyInput.value = '';
    errEl.style.display = 'none';
    bg.classList.add('open');
    setTimeout(function () { keyInput.focus(); }, 200);
  };
})();
