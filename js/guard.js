(function() {
  'use strict';
   loadPluginCss('guard');

  // ── Confirm popup (singleton) ──
  var confirmBg = document.createElement('dialog');
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

  var cancelConfirm = function() { ModalManager.closeDialog(confirmBg); pendingLeave = null; restoreConfirmLabels(); };
  confirmBg.addEventListener('click', function(e) { if (e.target === confirmBg) cancelConfirm(); });
  confirmBg.addEventListener('cancel', function(e) { e.preventDefault(); cancelConfirm(); });
  document.getElementById('egCancel').addEventListener('click', cancelConfirm);
  document.getElementById('egDiscard').addEventListener('click', function() {
    ModalManager.closeDialog(confirmBg);
    var action = pendingLeave; pendingLeave = null;
    if (typeof action === 'function') action();
  });

  // Shared confirmation API: reuse the same modal as confirmLeave.
  // Labels/message are reset on either cancel or confirm.
  var messageEl = confirmBg.querySelector('.eg-confirm-msg');
  var cancelEl = document.getElementById('egCancel');
  var confirmEl = document.getElementById('egDiscard');
  var defaultMessage = messageEl.textContent;
  var defaultCancel = cancelEl.textContent;
  var defaultConfirm = confirmEl.textContent;
  function restoreConfirmLabels() {
    messageEl.textContent = defaultMessage;
    cancelEl.textContent = defaultCancel;
    confirmEl.textContent = defaultConfirm;
  }
  window.confirmAction = function(options, onConfirm) {
    if (typeof onConfirm !== 'function') return;
    options = options || {};
    messageEl.textContent = options.message || defaultMessage;
    cancelEl.textContent = options.cancelText || '取消';
    confirmEl.textContent = options.confirmText || '確定';
    pendingLeave = function() { restoreConfirmLabels(); onConfirm(); };
    ModalManager.showDialog(confirmBg, cancelConfirm);
  };
  // Original handlers remain responsible for dismissal; reset copy on close.
  cancelEl.addEventListener('click', restoreConfirmLabels);
  confirmEl.addEventListener('click', restoreConfirmLabels);
  confirmBg.addEventListener('transitionend', function() {
    if (!confirmBg.open) restoreConfirmLabels();
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
    restoreConfirmLabels();
    pendingLeave = onLeave;
    ModalManager.showDialog(confirmBg, cancelConfirm);
  };
})();
