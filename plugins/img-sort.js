registerPlugin('img-sort', {
  icon: window.CARD_ICONS.sort,
  label: '排序', mode: 'img', order: 15, requiresData: 'sort', open: null,

  init() {
    var style = document.createElement('style');
    style.textContent =
      '#isSortBg{position:fixed;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;z-index:450;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '#isSortBg.open{opacity:1;pointer-events:all}' +
      '.is-sort-popup{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;width:min(1000px,95vw);max-height:70vh;display:flex;flex-direction:column;gap:12px;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
      '#isSortBg.open .is-sort-popup{transform:translateY(0) scale(1)}' +
      '.is-sort-list{display:grid;gap:4px;max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface);grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}' +
      '.is-sort-row{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:8px;cursor:grab;user-select:none;transition:border-color .15s,background .15s}' +
      '.is-sort-row:hover{border-color:var(--accent);background:var(--surface3)}' +
      '.is-sort-row.selected{border-color:var(--accent);background:rgba(232,255,71,.06)}' +
      '.is-sort-row.drag-over{border-top:2px solid var(--accent)}' +
      '.is-sort-num{width:20px;height:20px;border-radius:5px;background:var(--accent);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:"IBM Plex Mono",monospace}' +
      '.is-sort-row.selected .is-sort-num{background:var(--accent);color:#fff}' +
      '@media(prefers-color-scheme:light){html[data-theme="system"] .is-sort-row.selected .is-sort-num{color:#fff}}' +
      '.is-sort-thumb{width:48px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0;background:var(--surface)}' +
      '.is-sort-label{flex:1;font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.is-sort-meta{font-size:10px;color:var(--accent2);font-family:"IBM Plex Mono",monospace;flex-shrink:0}';
    document.head.appendChild(style);

    var sortWrapper = document.createElement('div');
    sortWrapper.innerHTML =
      '<div id="isSortBg"><div class="is-sort-popup">' +
        '<div class="modal-header"><h2 id="isSortTitle"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="17 9 12 4 7 9"/></svg> 排序母片</h2>' +
        '<button class="close-btn" id="isSortClose">✕</button></div>' +
        '<div class="is-sort-list" id="isSortList"></div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="is-btn" id="isSortReset" style="flex:0">重置</button>' +
          '<button class="is-btn is-btn-primary" id="isSortApply" style="flex:1">套用</button>' +
        '</div>' +
      '</div></div>';
    document.body.appendChild(sortWrapper.firstElementChild);

    var sortBg = document.getElementById('isSortBg');
    var sortTitle = document.getElementById('isSortTitle');
    var edited = false;

    function escHtml(s) { return window.isEscHtml ? window.isEscHtml(s) : String(s); }

    function closeSort() {
      confirmLeave(edited, function() {
        edited = false;
        clearEdited(sortTitle);
        sortBg.classList.remove('open');
      });
    }

    function openSort() {
      var stamps = window.isLoadStamps ? window.isLoadStamps() : [];
      if (stamps.length < 2) { showToast('母片不足，無需排序'); return; }

      var order = stamps.map(function(_, i) { return i; });
      var pending = [];
      var dragSrcIdx = null;
      edited = false;
      clearEdited(sortTitle);

      function mark() {
        if (!edited) { edited = true; markEdited(sortTitle); }
      }

      function renderList() {
        var listEl = document.getElementById('isSortList');
        listEl.innerHTML = '';
        order.forEach(function(origIdx, pos) {
          var s = stamps[origIdx];
          var selected = pending.indexOf(origIdx) !== -1;
          var el = document.createElement('div');
          el.className = 'is-sort-row' + (selected ? ' selected' : '');
          el.draggable = true;
          el.dataset.idx = origIdx;
          var num = selected ? (pending.indexOf(origIdx) + 1) : (pos + 1);
          el.innerHTML =
            '<div class="is-sort-num">' + num + '</div>' +
            '<img class="is-sort-thumb" src="' + s.image + '">' +
            '<div class="is-sort-label">' + escHtml(s.name) + '</div>' +
            '<div class="is-sort-meta">' + (s.texts || []).length + ' 個文字</div>';

          el.addEventListener('click', function() {
            var p = pending.indexOf(origIdx);
            if (p === -1) pending.push(origIdx); else pending.splice(p, 1);
            mark();
            renderList();
          });
          el.addEventListener('dragstart', function(e) { dragSrcIdx = order.indexOf(origIdx); e.dataTransfer.effectAllowed = 'move'; });
          el.addEventListener('dragover', function(e) {
            e.preventDefault();
            listEl.querySelectorAll('.is-sort-row').forEach(function(r) { r.classList.remove('drag-over'); });
            el.classList.add('drag-over');
          });
          el.addEventListener('drop', function(e) {
            e.preventDefault(); el.classList.remove('drag-over');
            var dropIdx = order.indexOf(origIdx);
            if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) {
              var moved = order.splice(dragSrcIdx, 1)[0];
              order.splice(dropIdx, 0, moved);
              pending = [];
              mark();
              renderList();
            }
            dragSrcIdx = null;
          });
          el.addEventListener('dragend', function() {
            listEl.querySelectorAll('.is-sort-row').forEach(function(r) { r.classList.remove('drag-over'); });
            dragSrcIdx = null;
          });
          listEl.appendChild(el);
        });
      }

      renderList();
      sortBg.classList.add('open');

      var resetBtn = document.getElementById('isSortReset');
      var newReset = resetBtn.cloneNode(true);
      resetBtn.parentNode.replaceChild(newReset, resetBtn);
      newReset.addEventListener('click', function() {
        order = stamps.map(function(_, i) { return i; });
        pending = [];
        edited = false;
        clearEdited(sortTitle);
        renderList();
      });

      var applyBtn = document.getElementById('isSortApply');
      var newApply = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newApply, applyBtn);
      newApply.addEventListener('click', function() {
        var finalOrder = pending.length > 0 ? pending : order;
        var reordered = finalOrder.map(function(origIdx) { return stamps[origIdx]; });
        var remaining = stamps.filter(function(s) { return reordered.indexOf(s) === -1; });
        var result = reordered.concat(remaining);
        if (window.isSaveStamps) window.isSaveStamps(result);
        edited = false;
        clearEdited(sortTitle);
        sortBg.classList.remove('open');
        if (window.isRenderGallery) window.isRenderGallery();
        showToast('排序已套用');
      });
    }

    bindPopup(sortBg, closeSort);

    this.open = openSort;
  }
});
