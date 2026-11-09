(function() {
  // ── CSS ──
  var style = document.createElement('style');
  style.textContent =
    '.eg-badge{display:inline-block;padding:2px 8px;border-radius:4px;background:var(--accent2);color:#fff;font-size:10px;font-weight:600;margin-left:8px;vertical-align:middle}' +
    '#egConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:9999}' +
    '#egConfirmBg.open{opacity:1;pointer-events:all}' +
    '.eg-confirm{background:var(--surface);border:1px solid var(--accent2);border-radius:12px;padding:24px;width:min(400px,90vw);display:flex;flex-direction:column;gap:16px}' +
    '.eg-confirm-msg{font-size:14px;color:var(--text-dim);line-height:1.5;text-align:center}' +
    '.eg-confirm-actions{display:flex;gap:10px}' +
    '.eg-confirm-actions button{flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;transition:opacity .15s}' +
    '.eg-cancel{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border) !important}' +
    '.eg-cancel:hover{opacity:.8}' +
    '.eg-discard{background:var(--accent2);color:#fff}' +
    '.eg-discard:hover{opacity:.85}';
  document.head.appendChild(style);

  // ── Confirm popup (singleton) ──
  var confirmBg = document.createElement('div');
  confirmBg.id = 'egConfirmBg';
  confirmBg.innerHTML =
    '<div class="eg-confirm">' +
      '<div class="eg-confirm-msg">有未儲存的變更，確定要離開嗎？</div>' +
      '<div class="eg-confirm-actions">' +
        '<button class="eg-cancel" id="egCancel">繼續編輯</button>' +
        '<button class="eg-discard" id="egDiscard">捨棄變更</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(confirmBg);

  var pendingLeave = null;

  var cancelConfirm = function() { confirmBg.classList.remove('open'); pendingLeave = null; };
  bindPopup(confirmBg, cancelConfirm);
  document.getElementById('egCancel').addEventListener('click', cancelConfirm);
  document.getElementById('egDiscard').addEventListener('click', function() {
    confirmBg.classList.remove('open');
    if (typeof pendingLeave === 'function') pendingLeave();
    pendingLeave = null;
  });

  // ── Public API ──

  window.markEdited = function(titleEl) {
    if (!titleEl) return;
    var badge = titleEl.querySelector('.eg-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'eg-badge';
      badge.textContent = '已修改';
      titleEl.appendChild(badge);
    }
    badge.style.display = '';
  };

  window.clearEdited = function(titleEl) {
    if (!titleEl) return;
    var badge = titleEl.querySelector('.eg-badge');
    if (badge) badge.style.display = 'none';
  };

  window.confirmLeave = function(edited, onLeave) {
    if (!edited) { onLeave(); return; }
    pendingLeave = onLeave;
    confirmBg.classList.add('open');
  };
})();
