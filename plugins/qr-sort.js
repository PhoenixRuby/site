registerPlugin('qr-sort', {
  icon: window.CARD_ICONS.sort,
  label: '排序', mode: 'qr', order: 15, requiresData: 'sort', open: null,

  init() {
    var style = document.createElement('style');
    style.textContent =
      '#qrSortBg{position:fixed;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;z-index:450;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '#qrSortBg.open{opacity:1;pointer-events:all}' +
      '.qr-sort-popup{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;width:min(1000px,95vw);max-height:70vh;display:flex;flex-direction:column;gap:12px;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
      '#qrSortBg.open .qr-sort-popup{transform:translateY(0) scale(1)}' +
      '.qr-sort-list{display:grid;gap:4px;max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface);grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}' +
      '.qr-sort-row{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:8px;cursor:grab;user-select:none;transition:border-color .15s,background .15s}' +
      '.qr-sort-row:hover{border-color:var(--accent);background:var(--surface3)}' +
      '.qr-sort-row.selected{border-color:var(--accent);background:rgba(232,255,71,.06)}' +
      '.qr-sort-row.drag-over{border-top:2px solid var(--accent)}' +
      '.qr-sort-num{width:20px;height:20px;border-radius:5px;background:var(--accent);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '@media(prefers-color-scheme:light){html[data-theme="system"] .qr-sort-num{color:#fff}}' +
      '.qr-sort-thumb{width:36px;height:36px;border-radius:4px;object-fit:contain;flex-shrink:0;background:#fff}' +
      '.qr-sort-label{flex:1;font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.qr-sort-meta{font-size:10px;color:var(--accent2);flex-shrink:0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
    document.head.appendChild(style);

    var sortWrapper = document.createElement('div');
    sortWrapper.innerHTML =
      '<div id="qrSortBg"><div class="qr-sort-popup">' +
        '<div class="modal-header"><h2 id="qrSortTitle"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="17 9 12 4 7 9"/></svg> 排序 QR Code</h2>' +
        '<button class="close-btn" id="qrSortClose">✕</button></div>' +
        '<div class="qr-sort-list" id="qrSortList"></div>' +
        '<div style="display:flex;gap:8px"><button class="qr-btn" id="qrSortReset" style="flex:0">重置</button><button class="qr-btn qr-btn-primary" id="qrSortApply" style="flex:1">套用</button></div>' +
      '</div></div>';
    document.body.appendChild(sortWrapper.firstElementChild);

    var sortBg = document.getElementById('qrSortBg');
    var sortTitle = document.getElementById('qrSortTitle');
    var edited = false;

    function escHtml(s) { return window.qrEscHtml ? window.qrEscHtml(s) : String(s); }

    function closeSort() {
      confirmLeave(edited, function() { edited = false; clearEdited(sortTitle); sortBg.classList.remove('open'); });
    }

    function openSort() {
      var items = window.qrLoadData ? window.qrLoadData() : [];
      if (items.length < 2) { showToast('QR Code 不足，無需排序'); return; }

      var order = items.map(function(_, i) { return i; });
      var pending = [];
      var dragSrcIdx = null;
      edited = false; clearEdited(sortTitle);

      function mark() { if (!edited) { edited = true; markEdited(sortTitle); } }

      function renderList() {
        var listEl = document.getElementById('qrSortList');
        listEl.innerHTML = '';
        order.forEach(function(origIdx, pos) {
          var q = items[origIdx];
          var selected = pending.indexOf(origIdx) !== -1;
          var el = document.createElement('div');
          el.className = 'qr-sort-row' + (selected ? ' selected' : '');
          el.draggable = true;
          var num = selected ? (pending.indexOf(origIdx) + 1) : (pos + 1);
          el.innerHTML =
            '<div class="qr-sort-num">' + num + '</div>' +
            (q.image ? '<img class="qr-sort-thumb" src="' + q.image + '">' : '') +
            '<div class="qr-sort-label">' + escHtml(q.name) + '</div>' +
            '<div class="qr-sort-meta">' + escHtml(q.text) + '</div>';
          el.addEventListener('click', function() { var p = pending.indexOf(origIdx); if (p === -1) pending.push(origIdx); else pending.splice(p, 1); mark(); renderList(); });
          el.addEventListener('dragstart', function(e) { dragSrcIdx = order.indexOf(origIdx); e.dataTransfer.effectAllowed = 'move'; });
          el.addEventListener('dragover', function(e) { e.preventDefault(); listEl.querySelectorAll('.qr-sort-row').forEach(function(r) { r.classList.remove('drag-over'); }); el.classList.add('drag-over'); });
          el.addEventListener('drop', function(e) { e.preventDefault(); el.classList.remove('drag-over'); var dropIdx = order.indexOf(origIdx); if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) { var moved = order.splice(dragSrcIdx, 1)[0]; order.splice(dropIdx, 0, moved); pending = []; mark(); renderList(); } dragSrcIdx = null; });
          el.addEventListener('dragend', function() { listEl.querySelectorAll('.qr-sort-row').forEach(function(r) { r.classList.remove('drag-over'); }); dragSrcIdx = null; });
          listEl.appendChild(el);
        });
      }

      renderList();
      sortBg.classList.add('open');

      var resetBtn = document.getElementById('qrSortReset');
      var newReset = resetBtn.cloneNode(true);
      resetBtn.parentNode.replaceChild(newReset, resetBtn);
      newReset.addEventListener('click', function() { order = items.map(function(_, i) { return i; }); pending = []; edited = false; clearEdited(sortTitle); renderList(); });

      var applyBtn = document.getElementById('qrSortApply');
      var newApply = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newApply, applyBtn);
      newApply.addEventListener('click', function() {
        var finalOrder = pending.length > 0 ? pending : order;
        var reordered = finalOrder.map(function(origIdx) { return items[origIdx]; });
        var remaining = items.filter(function(q) { return reordered.indexOf(q) === -1; });
        if (window.qrSaveData) window.qrSaveData(reordered.concat(remaining));
        edited = false; clearEdited(sortTitle);
        sortBg.classList.remove('open');
        if (window.qrRenderGallery) window.qrRenderGallery();
        showToast('排序已套用');
      });
    }

    bindPopup(sortBg, closeSort);
    this.open = openSort;
  }
});
