registerPlugin('bookmark-sort', {
  icon: window.CARD_ICONS.sort,
  label: '排序', mode: 'bookmark', order: 50, requiresData: 'sort', open: null,

  init() {
    var style = document.createElement('style');
    style.textContent =
      '#bmSortModalBg{position:fixed;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;z-index:450;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '#bmSortModalBg.open{opacity:1;pointer-events:all}' +
      '.bm-sort-popup{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;width:min(1000px,95vw);max-height:70vh;display:flex;flex-direction:column;gap:12px;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
      '#bmSortModalBg.open .bm-sort-popup{transform:translateY(0) scale(1)}' +
      '.bm-sort-list{display:grid;gap:4px;max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface);grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}' +
      '.bm-sort-row{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:8px;cursor:grab;user-select:none;transition:border-color .15s,background .15s}' +
      '.bm-sort-row:hover{border-color:var(--accent);background:var(--surface3)}' +
      '.bm-sort-row.selected{border-color:var(--accent);background:rgba(232,255,71,.06)}' +
      '.bm-sort-row.drag-over{border-top:2px solid var(--accent)}' +
      /* badge：未選取時顯示 icon-like 佔位，選取時疊加編號 */
      '.bm-sort-badge{width:20px;height:20px;border-radius:5px;flex-shrink:0;position:relative;background:var(--surface3)}' +
      '.bm-sort-badge::before{content:attr(data-count);display:none;position:absolute;inset:0;border-radius:5px;background:var(--accent);color:#0f0f0f;font-size:11px;font-weight:600;font-family:"IBM Plex Mono",monospace;align-items:center;justify-content:center}' +
      '.bm-sort-row.selected .bm-sort-badge::before{display:flex}' +
      'html[data-theme="light"] .bm-sort-badge::before{color:#fff}' +
      '@media(prefers-color-scheme:light){html[data-theme="system"] .bm-sort-badge::before{color:#fff}}' +
      '.bm-sort-label{flex:1;font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.bm-sort-url{font-size:10px;color:var(--accent2);font-family:"IBM Plex Mono",monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px}';
    document.head.appendChild(style);

    var sortWrapper = document.createElement('div');
    sortWrapper.innerHTML =
      '<div id="bmSortModalBg"><div class="bm-sort-popup">' +
        '<div class="modal-header">' +
          '<h2 id="bmSortTitle"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="17 9 12 4 7 9"/></svg>排序書籤</h2>' +
          '<button class="close-btn" id="bmSortCloseBtn">✕</button>' +
        '</div>' +
        '<div class="modal-hint">依序點選項目，設定顯示順序</div>' +
        '<div class="bm-sort-list" id="bmSortList"></div>' +
        '<div class="modal-quick">' +
          '<button class="btn-quick" id="bmSortSelectAll">全選</button>' +
          '<button class="btn-quick" id="bmSortByTitle">A→Z 標題</button>' +
          '<button class="btn-quick" id="bmSortByUrl">A→Z URL</button>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-reset" id="bmSortReset">重置</button>' +
          '<button class="btn-confirm" id="bmSortApply">確定套用</button>' +
        '</div>' +
      '</div></div>';
    document.body.appendChild(sortWrapper.firstElementChild);

    var bmSortModalBg = document.getElementById('bmSortModalBg');
    var sortTitle = document.getElementById('bmSortTitle');

    // ── 每次開啟時的狀態，宣告在 init 層級，openSort 內初始化 ──
    var visibleFavs = [];
    var order = [];        // 當前顯示順序（origIdx 陣列），drag 改這裡
    var pendingOrder = []; // click 選取累積的 origIdx 陣列
    var dragSrcIdx = null;
    var edited = false;

    function mark() { if (!edited) { edited = true; markEdited(sortTitle); } }

    // ── Render ────────────────────────────────────────────────────
    function renderSortList() {
      var listEl = document.getElementById('bmSortList');
      var escHtml = window.bmEscHtml;
      listEl.innerHTML = '';
      order.forEach(function(origIdx, pos) {
        var fav = visibleFavs[origIdx];
        var pendingPos = pendingOrder.indexOf(origIdx);
        var selected = pendingPos !== -1;
        var el = document.createElement('div');
        el.className = 'bm-sort-row' + (selected ? ' selected' : '');
        el.draggable = true;
        el.dataset.idx = origIdx;
        el.innerHTML =
          '<div class="bm-sort-badge" data-count="' + (selected ? pendingPos + 1 : '') + '"></div>' +
          '<div class="bm-sort-label">' + escHtml(fav.title) + '</div>' +
          '<div class="bm-sort-url">' + escHtml(fav.url) + '</div>';

        // click：切換 pendingOrder（同 card-sort toggleItem）
        el.addEventListener('click', function() {
          var p = pendingOrder.indexOf(origIdx);
          if (p === -1) pendingOrder.push(origIdx);
          else pendingOrder.splice(p, 1);
          mark();
          renderSortList();
        });

        // drag & drop：重排 order（同 card-sort drop handler）
        el.addEventListener('dragstart', function(e) {
          dragSrcIdx = pos;
          el.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        el.addEventListener('dragend', function() {
          el.style.opacity = '';
          listEl.querySelectorAll('.bm-sort-row').forEach(function(r) { r.classList.remove('drag-over'); });
          dragSrcIdx = null;
        });
        el.addEventListener('dragover', function(e) {
          e.preventDefault();
          listEl.querySelectorAll('.bm-sort-row').forEach(function(r) { r.classList.remove('drag-over'); });
          el.classList.add('drag-over');
        });
        el.addEventListener('drop', function(e) {
          e.preventDefault();
          el.classList.remove('drag-over');
          if (dragSrcIdx === null || dragSrcIdx === pos) return;
          var moved = order.splice(dragSrcIdx, 1)[0];
          order.splice(pos, 0, moved);
          pendingOrder = []; // drag 後清空 click 選取，同 card-sort 行為
          mark();
          renderSortList();
          dragSrcIdx = null;
        });

        listEl.appendChild(el);
      });
    }

    // ── 快捷操作 ──────────────────────────────────────────────────
    function selectAll() {
      pendingOrder = order.slice(); // 照當前 order 全選
      mark();
      renderSortList();
    }

    function sortByField(field) {
      // 先建立含 origIdx 的暫存陣列，依欄位排序後更新 order
      var sorted = order
        .map(function(origIdx) { return { origIdx: origIdx, val: (visibleFavs[origIdx][field] || '').toLowerCase() }; })
        .sort(function(a, b) { return a.val.localeCompare(b.val); });
      order = sorted.map(function(x) { return x.origIdx; });
      pendingOrder = [];
      mark();
      renderSortList();
    }

    function resetOrder() {
      order = visibleFavs.map(function(_, i) { return i; });
      pendingOrder = [];
      edited = false;
      clearEdited(sortTitle);
      renderSortList();
    }

    // ── Apply（對齊 card-sort applyOrder）────────────────────────
    function applyOrder() {
      var bmData = window.bmGetData();
      var currentThemeId = window.bmGetCurrentThemeId();

      // 最終順序：有 click 選取就用 pendingOrder，否則用 drag 後的 order
      var finalOrder = pendingOrder.length > 0 ? pendingOrder : order;

      // 補上未被選取的項目（維持原相對順序）
      var remaining = order.filter(function(i) { return finalOrder.indexOf(i) === -1; });
      var allOrigIdx = finalOrder.concat(remaining);

      var visibleIds = visibleFavs.map(function(f) { return f.id; });
      var reorderedIds = allOrigIdx.map(function(i) { return visibleIds[i]; });

      if (currentThemeId === 'all') {
        var favMap = {};
        bmData.favorites.forEach(function(f) { favMap[f.id] = f; });
        bmData.favorites = reorderedIds.map(function(id) { return favMap[id]; }).filter(Boolean);
      } else {
        var reorderedFavs = reorderedIds.map(function(id) { return bmData.favorites.find(function(f) { return f.id === id; }); }).filter(Boolean);
        var otherFavs = bmData.favorites.filter(function(f) { return !f.themeIds || f.themeIds.indexOf(currentThemeId) === -1; });
        bmData.favorites = otherFavs.concat(reorderedFavs);
      }

      window.bmSaveData();
      edited = false;
      clearEdited(sortTitle);
      bmSortModalBg.classList.remove('open');
      window.renderBookmarks();
      showToast('排序已套用');
    }

    function closeSort() {
      confirmLeave(edited, function() {
        edited = false;
        clearEdited(sortTitle);
        bmSortModalBg.classList.remove('open');
      });
    }

    // ── Open ──────────────────────────────────────────────────────
    function openSortBookmarks() {
      visibleFavs = window.bmGetVisibleFavorites();
      if (visibleFavs.length < 2) { showToast('書籤不足，無需排序'); return; }

      // 每次開啟時重設狀態
      order = visibleFavs.map(function(_, i) { return i; });
      pendingOrder = [];
      dragSrcIdx = null;
      edited = false;
      clearEdited(sortTitle);

      renderSortList();
      bmSortModalBg.classList.add('open');
    }

    // ── Event listeners ───────────────────────────────────────────
    bindPopup(bmSortModalBg, closeSort);
    document.getElementById('bmSortCloseBtn').addEventListener('click', closeSort);
    document.getElementById('bmSortSelectAll').addEventListener('click', selectAll);
    document.getElementById('bmSortByTitle').addEventListener('click', function() { sortByField('title'); });
    document.getElementById('bmSortByUrl').addEventListener('click', function() { sortByField('url'); });
    document.getElementById('bmSortReset').addEventListener('click', resetOrder);
    document.getElementById('bmSortApply').addEventListener('click', applyOrder);

    this.open = openSortBookmarks;
  }
});