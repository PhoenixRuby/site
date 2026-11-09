registerPlugin('card-sort', {
  icon: window.CARD_ICONS.sort,
  label: '排序', mode: 'card', order: 6, requiresData: 'sort',
  open: null,

  init() {
    // ── CSS ───────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      #sortModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);z-index:200;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s}
      #sortModalBg.open{opacity:1;pointer-events:all}
      .sort-modal{background:var(--surface);border:1px solid var(--border);border-radius:20px 20px 0 0;width: min(920px, 95vw);max-width:80%;padding:28px 24px 40px;transform:translateY(40px);transition:transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)}
      #sortModalBg.open .sort-modal{transform:translateY(0)}
      .sort-list{display:grid;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;margin-bottom:20px;padding-right:4px;flex-wrap:wrap;grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));}
      .sort-list::-webkit-scrollbar{width:4px}
      .sort-list::-webkit-scrollbar-track{background:transparent}
      .sort-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      .sort-item{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:grab;transition:border-color 0.15s, background 0.15s;user-select:none;flex:0 0 calc(33.33% - 10px)}
      .sort-item:hover{border-color:var(--accent);background:var(--surface3)}
      .sort-item.selected{border-color:var(--accent);background:rgba(232,255,71,0.06)}
      .sort-item.drag-over{border-top:2px solid var(--accent)}
      .sort-badge{width:26px;height:26px;border-radius:7px;flex-shrink:0;transition:background 0.15s, color 0.15s;color:var(--muted);position:relative}
      html[data-theme="light"] .sort-badge{color:#b0b0b0}
      @media(prefers-color-scheme:light){html[data-theme="system"] .sort-badge{color:#b0b0b0}}
      .sort-badge .icon-pic{width:26px;height:26px;border-radius:7px}
      .sort-item.selected .sort-badge::before{background-color:var(--accent);color:#0f0f0f;content:attr(data-count);display:flex;position:absolute;top:0;left:0;width:26px;height:26px;border-radius:7px;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600}
      html[data-theme="light"] .sort-item.selected .sort-badge::before{color:#fff}
      @media(prefers-color-scheme:light){html[data-theme="system"] .sort-item.selected .sort-badge::before{color:#fff}}
      .sort-body{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
      .sort-name{font-size:14px}
      .sort-mark{display:flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:9px}
      .sort-type{width:auto}
      .sort-icon{color:var(--accent2);background:var(--surface);border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0}
      .sort-orig{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)}
    `;
    document.head.appendChild(style);

    // ── HTML ──────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="sortModalBg">
        <div class="sort-modal">
		  <div class="modal-header">
          <h2>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="17 9 12 4 7 9"/></svg>
			自訂排列順序
          </h2>
		  <button class="close-btn" id="sortCloseBtn">✕</button>
		  </div>
          <div class="modal-hint">依序點選項目，設定顯示順序</div>
          <div class="sort-list" id="sortList"></div>
          <div class="modal-quick">
            <button class="btn-quick" id="sortSelectAllBtn">全選</button>
            <button class="btn-quick" id="sortByTitleBtn">A→Z 名稱</button>
            <button class="btn-quick" id="sortByIconBtn">A→Z Icon</button>
          </div>
          <div class="modal-footer">
            <button class="btn-reset" id="sortResetBtn">重置</button>
            <button class="btn-confirm" id="confirmBtn">確定套用</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);

    // ── References ────────────────────────────
    const sortModalBg = document.getElementById('sortModalBg');
    const sortTitleEl = sortModalBg.querySelector('h2');
    var sortEdited = false;

    function sortMark() { if (!sortEdited) { sortEdited = true; markEdited(sortTitleEl); } }

    // ── Render ────────────────────────────────
    var dragSrcIdx = null;
    function renderSortList() {
      const list = document.getElementById('sortList');
      list.innerHTML = '';
      data.forEach((item, i) => {
        const idx = i + 1;
        const pos = pendingOrder.indexOf(idx);
        const selected = pos !== -1;
        const el = document.createElement('div');
        el.className = 'sort-item' + (selected ? ' selected' : '');
        el.draggable = true;
        el.dataset.idx = idx;
        el.innerHTML = `
          <div class="sort-badge" data-count="${selected ? pos + 1 : ''}"><img class="icon-pic" src="${resolveIconSrc(item.icon)}" onerror="this.style.display='none'"></div>
          <div class="sort-body">
            <div class="sort-name">${item.title}</div>
            <div class="sort-mark">
              <div class="sort-type" data-type="${item.type}">${item.type}</div>
              ${item.itemlist.map(g => `<div class="sort-icon" data-area="${g.name}">${g.name}</div>`).join('')}
            </div>
          </div>
          <div class="sort-orig">Original ${idx}</div>
        `;
        el.addEventListener('click', () => toggleItem(idx));
        el.addEventListener('dragstart', (e) => { dragSrcIdx = i; el.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
        el.addEventListener('dragend', () => { el.style.opacity = ''; list.querySelectorAll('.sort-item').forEach(r => r.classList.remove('drag-over')); dragSrcIdx = null; });
        el.addEventListener('dragover', (e) => { e.preventDefault(); list.querySelectorAll('.sort-item').forEach(r => r.classList.remove('drag-over')); el.classList.add('drag-over'); });
        el.addEventListener('drop', (e) => {
          e.preventDefault(); el.classList.remove('drag-over');
          if (dragSrcIdx === null || dragSrcIdx === i) return;
          pendingOrder = data.map((_, k) => k + 1);
          var moved = pendingOrder.splice(dragSrcIdx, 1)[0];
          pendingOrder.splice(i, 0, moved);
          sortMark();
          renderSortList();
          dragSrcIdx = null;
        });
        list.appendChild(el);
      });
      document.getElementById('confirmBtn').disabled = false;
    }

    function toggleItem(idx) {
      const pos = pendingOrder.indexOf(idx);
      if (pos === -1) pendingOrder.push(idx);
      else pendingOrder.splice(pos, 1);
      sortMark();
      renderSortList();
    }

    function resetOrder() {
      pendingOrder = [];
      sortEdited = false;
      clearEdited(sortTitleEl);
      renderSortList();
    }

    function selectAll() {
      pendingOrder = data.map((_, i) => i + 1);
      sortMark();
      renderSortList();
    }

    function sortByField(field) {
      pendingOrder = data
        .map((item, i) => ({ idx: i + 1, val: item[field].toLowerCase() }))
        .sort((a, b) => a.val.localeCompare(b.val))
        .map(x => x.idx);
      sortMark();
      renderSortList();
    }

    function applyOrder() {
      currentOrder = [...pendingOrder];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));
      sortEdited = false;
      clearEdited(sortTitleEl);
      sortModalBg.classList.remove('open');
      renderGrid();
      showToast('排序已套用');
    }

    function closeSort() {
      confirmLeave(sortEdited, function() {
        sortEdited = false;
        clearEdited(sortTitleEl);
        sortModalBg.classList.remove('open');
      });
    }

    function openSortModal() {
      pendingOrder = [...currentOrder];
      sortEdited = false;
      clearEdited(sortTitleEl);
      renderSortList();
      sortModalBg.classList.add('open');
    }

    // ── Event listeners ──────────────────────
    bindPopup(sortModalBg, closeSort);

    document.getElementById('sortSelectAllBtn').addEventListener('click', selectAll);
    document.getElementById('sortByTitleBtn').addEventListener('click', () => sortByField('title'));
    document.getElementById('sortByIconBtn').addEventListener('click', () => sortByField('icon'));
    document.getElementById('sortResetBtn').addEventListener('click', resetOrder);
    document.getElementById('confirmBtn').addEventListener('click', applyOrder);

    // ── Expose globals (for backward compat) ─
    window.openSortModal = openSortModal;
    window.selectAll = selectAll;
    window.sortByField = sortByField;
    window.resetOrder = resetOrder;
    window.applyOrder = applyOrder;

    this.open = openSortModal;
  }
});


