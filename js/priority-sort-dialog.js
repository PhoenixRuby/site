function createPrioritySortDialog(options) {
var sortWrapper = document.createElement('div');
  sortWrapper.innerHTML = (
    '<dialog id="sortDialogModalBg" class="app-dialog priority-sort-dialog" aria-labelledby="sortDialogTitle"><div class="priority-sort-popup app-dialog-panel-medium">' +
      '<header class="app-modal-header">' +
        '<span class="app-modal-header-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="17 9 12 4 7 9"/></svg>' +
        '</span>' +
        '<div class="app-modal-header-info">' +
          '<h2 id="sortDialogTitle" class="app-modal-header-title">' + options.title + '</h2>' +
          '<p class="app-modal-header-subtitle">左側選取或拖入右側；右側拖曳調整順序，未選取項目保留原相對順序</p>' +
        '</div>' +
        '<button type="button" class="app-modal-header-close" id="sortDialogCloseBtn" aria-label="關閉排序">✕</button>' +
      '</header>' +
      '<div class="app-dialog-body">' +
      '<div class="priority-sort-panels">' +
        '<section class="priority-sort-panel"><div class="priority-sort-panel-head"><strong>' + options.availableLabel + ' <span id="sortDialogAvailableCount"></span></strong><input id="sortDialogSearch" type="search" placeholder="' + options.searchLabel + '…" aria-label="搜尋' + options.availableLabel + '"></div><div class="priority-sort-items" id="sortDialogAvailable"></div><div class="priority-sort-panel-tools"><button type="button" class="btn-quick" id="sortDialogSelectAll">全部加入 →</button></div></section>' +
        '<section class="priority-sort-panel priority-sort-priority-panel"><div class="priority-sort-panel-head"><strong>優先排序 <span id="sortDialogSelectedCount"></span></strong><span class="priority-sort-head-note" id="sortDialogMode" aria-live="polite">自訂排序</span></div><div class="priority-sort-items priority-sort-priority" id="sortDialogPriority"></div><div class="priority-sort-panel-tools priority-sort-panel-tools-priority"><button type="button" class="btn-quick" id="sortDialogByTitle">A→Z ' + options.titleLabel + '</button><button type="button" class="btn-quick" id="sortDialogByUrl">A→Z ' + options.secondaryLabel + '</button><button type="button" class="btn-quick" id="sortDialogRemoveAll">← 全部移出</button></div></section>' +
      '</div>' +
      '</div>' +
      '<footer class="app-dialog-footer">' +
        '<button class="btn-reset" id="sortDialogReset">重置</button>' +
        '<button class="btn-confirm" id="sortDialogApply">確定套用</button>' +
      '</footer>' +
    '</div></dialog>').replaceAll('sortDialog', options.id);
  var sortDialogModalBg = sortWrapper.firstElementChild;
  document.body.appendChild(sortDialogModalBg);
  function find(suffix) { return sortDialogModalBg.querySelector('#' + options.id + suffix); }
  var sortTitle = find('Title');
  var availableEl = find('Available');
  var priorityEl = find('Priority');
  var searchEl = find('Search');
  var items = [];
  var order = [];        // 原始/快捷排序基準，未選取項目維持此順序
  var pendingOrder = []; // 右側優先排序
  var edited = false;
  var sortMode = 'custom';
  var modeEl = find('Mode');
  var titleBtn = find('ByTitle');
  var urlBtn = find('ByUrl');
  function setSortMode(mode) {
    sortMode = mode;
    modeEl.textContent = mode === 'title' ? 'A→Z ' + options.titleLabel + '排序' : mode === 'secondary' ? 'A→Z ' + options.secondaryLabel + ' 排序' : '自訂排序';
    titleBtn.classList.toggle('priority-sort-mode-active', mode === 'title');
    urlBtn.classList.toggle('priority-sort-mode-active', mode === 'secondary');
    titleBtn.setAttribute('aria-pressed', String(mode === 'title'));
    urlBtn.setAttribute('aria-pressed', String(mode === 'secondary'));
  }
  var dragItem = null;
  var dragBefore = true;

  function mark() { if (!edited) { edited = true; markEdited(sortTitle); } }
  function clearDropIndicator() {
    priorityEl.querySelectorAll('.priority-sort-drop-before,.priority-sort-drop-after,.priority-sort-dragging').forEach(function(el) {
      el.classList.remove('priority-sort-drop-before','priority-sort-drop-after','priority-sort-dragging');
    });
    priorityEl.classList.remove('priority-sort-drop-empty');
  }
  function finishDrag() {
    dragItem = null; clearDropIndicator();
    availableEl.querySelectorAll('.priority-sort-dragging').forEach(function(el) { el.classList.remove('priority-sort-dragging'); });
  }
  function insertDraggedItem(insertion) {
    if (dragItem === null) return;
    var from = pendingOrder.indexOf(dragItem);
    if (from !== -1) {
      pendingOrder.splice(from, 1);
      if (from < insertion) insertion--;
    }
    insertion = Math.max(0, Math.min(insertion, pendingOrder.length));
    pendingOrder.splice(insertion, 0, dragItem);
    if (from !== insertion) mark();
    finishDrag(); setSortMode('custom'); renderSortList();
  }
  function moveItem(from, to) {
    if (from === to || from < 0 || to < 0 || from >= pendingOrder.length || to >= pendingOrder.length) return;
    var moved = pendingOrder.splice(from, 1)[0];
    pendingOrder.splice(to, 0, moved);
    mark(); setSortMode('custom'); renderSortList();
  }
  function addItem(idx) {
    if (pendingOrder.indexOf(idx) !== -1) return;
    pendingOrder.push(idx); mark(); setSortMode('custom'); renderSortList();
  }
  function removeItem(idx) {
    var p = pendingOrder.indexOf(idx);
    if (p < 0) return;
    pendingOrder.splice(p, 1); mark(); setSortMode('custom'); renderSortList();
  }
  // Highlight search matches without inserting untrusted HTML.
  function highlightMatch(value, query) {
    var source = String(value || '');
    if (!query) return AppUtils.escHtml(source);
    var lowered = source.toLocaleLowerCase();
    var needle = query.toLocaleLowerCase();
    var result = '', cursor = 0, at;
    while ((at = lowered.indexOf(needle, cursor)) !== -1) {
      result += AppUtils.escHtml(source.slice(cursor, at));
      result += '<mark class="priority-sort-match">' + AppUtils.escHtml(source.slice(at, at + needle.length)) + '</mark>';
      cursor = at + needle.length;
    }
    return result + AppUtils.escHtml(source.slice(cursor));
  }
  function makeRow(idx, pos, selected, query) {
    var item = items[idx];
    var el = document.createElement('div');
    el.className = 'priority-sort-row' + (selected ? ' selected priority-sort-mode-' + (sortMode === 'secondary' ? 'url' : sortMode) : '');
    el.dataset.idx = idx;
    if (selected) {
      el.draggable = true;
      el.innerHTML = '<span class="priority-sort-grip" title="拖曳調整" aria-hidden="true">⠿</span>' +
        '<span class="priority-sort-badge">' + (pos + 1) + '</span>' +
        '<span class="priority-sort-info"><span class="priority-sort-label"><span class="priority-sort-field-indicator priority-sort-title-indicator" aria-hidden="true">▶</span>' + AppUtils.escHtml(item.title || '') + '</span><span class="priority-sort-url"><span class="priority-sort-field-indicator priority-sort-url-indicator" aria-hidden="true">▶</span>' + (item.secondary ? AppUtils.escHtml(item.secondary) : '<span class="priority-sort-no-url">' + options.emptySecondary + '</span>') + '</span></span>' +
        '<span class="priority-sort-actions"><button type="button" class="priority-sort-move-up" title="上移" aria-label="上移" ' + (pos === 0 ? 'disabled' : '') + '>↑</button><button type="button" class="priority-sort-move-down" title="下移" aria-label="下移" ' + (pos === pendingOrder.length - 1 ? 'disabled' : '') + '>↓</button><button type="button" class="priority-sort-remove" title="移回左側" aria-label="移回左側">×</button></span>';
      el.querySelector('.priority-sort-move-up').addEventListener('click', function() { moveItem(pos, pos - 1); });
      el.querySelector('.priority-sort-move-down').addEventListener('click', function() { moveItem(pos, pos + 1); });
      el.querySelector('.priority-sort-remove').addEventListener('click', function() { removeItem(idx); });
      el.addEventListener('dragstart', function(e) {
        if (e.target.closest && e.target.closest('button')) { e.preventDefault(); return; }
        dragItem = idx;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'priority-sort:' + idx);
        requestAnimationFrame(function() { el.classList.add('priority-sort-dragging'); });
      });
      el.addEventListener('dragend', finishDrag);
      el.addEventListener('dragover', function(e) {
        if (dragItem === null) return;
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        clearDropIndicator();
        dragBefore = e.clientY < el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
        el.classList.add(dragBefore ? 'priority-sort-drop-before' : 'priority-sort-drop-after');
      });
      el.addEventListener('drop', function(e) {
        if (dragItem === null) return;
        e.preventDefault(); e.stopPropagation();
        var target = pendingOrder.indexOf(idx);
        if (target !== -1) insertDraggedItem(target + (dragBefore ? 0 : 1));
      });
    } else {
      el.classList.add('priority-sort-available-row');
      el.draggable = true;
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.innerHTML = '<span class="priority-sort-add-icon">＋</span><span class="priority-sort-info"><span class="priority-sort-label">' + highlightMatch(item.title || '', query) + '</span><span class="priority-sort-url">' + highlightMatch(item.secondary || '', query) + '</span></span>';
      el.addEventListener('click', function() { addItem(idx); });
      el.addEventListener('dragstart', function(e) {
        dragItem = idx;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'priority-sort:' + idx);
        requestAnimationFrame(function() { if (el.isConnected) el.classList.add('priority-sort-dragging'); });
      });
      el.addEventListener('dragend', finishDrag);
      el.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addItem(idx); } });
    }
    return el;
  }
  function renderSortList() {
    var query = searchEl.value.trim().toLocaleLowerCase();
    availableEl.innerHTML = '';
    priorityEl.innerHTML = '';
    var remaining = order.filter(function(idx) { return pendingOrder.indexOf(idx) === -1; });
    remaining.filter(function(idx) {
      var item = items[idx];
      return !query || ((item.title || '') + ' ' + (item.secondary || '')).toLocaleLowerCase().includes(query);
    }).forEach(function(idx) { availableEl.appendChild(makeRow(idx, -1, false, query)); });
    pendingOrder.forEach(function(idx, pos) { priorityEl.appendChild(makeRow(idx, pos, true)); });
    if (!availableEl.children.length) availableEl.innerHTML = '<div class="priority-sort-empty">' + (remaining.length ? '沒有符合的項目' : '已全部加入右側') + '</div>';
    if (!pendingOrder.length) priorityEl.innerHTML = '<div class="priority-sort-empty">點選左側項目加入此處</div>';
    find('AvailableCount').textContent = '(' + remaining.length + ')';
    find('SelectedCount').textContent = '(' + pendingOrder.length + ')';
  }
  // 拖到右側空白區域，移至清單最後；也支援清單末尾的拖曳
  priorityEl.addEventListener('dragover', function(e) {
    if (dragItem === null || e.target.closest('.priority-sort-row')) return;
    e.preventDefault(); e.stopPropagation(); clearDropIndicator();
    priorityEl.classList.add('priority-sort-drop-empty');
  });
  priorityEl.addEventListener('drop', function(e) {
    if (dragItem === null || e.target.closest('.priority-sort-row')) return;
    e.preventDefault(); e.stopPropagation();
    insertDraggedItem(pendingOrder.length);
  });
  // 排序視窗內的拖放不傳到其他插件
  sortDialogModalBg.addEventListener('drop', function(e) {
    if (dragItem !== null) { e.preventDefault(); e.stopPropagation(); finishDrag(); }
  });
  searchEl.addEventListener('input', renderSortList);

  function selectAll() {
    if (pendingOrder.length === order.length) return;
    order.forEach(function(idx) { if (pendingOrder.indexOf(idx) === -1) pendingOrder.push(idx); });
    mark(); setSortMode('custom'); renderSortList();
  }
  function removeAll() {
    if (!pendingOrder.length) return;
    pendingOrder = [];
    mark(); setSortMode('custom'); renderSortList();
  }
  function sortByField(field) {
    if (pendingOrder.length < 2) { setSortMode(field); renderSortList(); return; }
    var sorted = pendingOrder.slice().sort(function(a, b) {
      var av = String(items[a][field] || '');
      var bv = String(items[b][field] || '');
      // Empty values (e.g. notes without a URL) always sort after populated values.
      if (!av && bv) return 1;
      if (av && !bv) return -1;
      var compared = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      if (compared !== 0) return compared;
      // Deterministic secondary key when URLs are equal or both empty.
      if (field === 'secondary') return String(items[a].title || '').localeCompare(String(items[b].title || ''), undefined, { numeric: true, sensitivity: 'base' });
      return 0;
    });
    var changed = !sorted.every(function(idx, i) { return idx === pendingOrder[i]; });
    pendingOrder = sorted;
    setSortMode(field);
    if (changed) mark();
    renderSortList(); // Refresh field indicators even when the order is unchanged.
  }
  function resetOrder() {
    order = items.map(function(_, i) { return i; });
    pendingOrder = [];
    edited = false; clearEdited(sortTitle); setSortMode('custom'); renderSortList();
  }

  function applyOrder() {
    var selected = new Set(pendingOrder);
    var finalOrder = pendingOrder.concat(order.filter(function(idx) { return !selected.has(idx); }));
    options.apply(finalOrder.map(function(idx) { return items[idx].id; }));
    edited = false;
    clearEdited(sortTitle);
    ModalManager.closeDialog(sortDialogModalBg);
    showToast('排序已套用');
  }

  function closeSort() {
    confirmLeave(edited, function() {
      edited = false;
      clearEdited(sortTitle);
      ModalManager.closeDialog(sortDialogModalBg);
    });
  }

  // ── Open ──────────────────────────────────────────────────────
  function openSort() {
    if (sortDialogModalBg.open) return;
    items = options.getItems();
    if (items.length < 2) { showToast(options.insufficient); return; }

    // 每次開啟時重設狀態
    order = items.map(function(_, i) { return i; });
    pendingOrder = [];
    finishDrag();
    setSortMode('custom');
    searchEl.value = '';
    edited = false;
    clearEdited(sortTitle);

    renderSortList();
    ModalManager.showDialog(sortDialogModalBg, closeSort);
  }

  // ── Event listeners ───────────────────────────────────────────
  sortDialogModalBg.addEventListener('click', function(e) { if (e.target === sortDialogModalBg) closeSort(); });
  find('CloseBtn').addEventListener('click', closeSort);
  find('SelectAll').addEventListener('click', selectAll);
  find('RemoveAll').addEventListener('click', removeAll);
  find('ByTitle').addEventListener('click', function() { sortByField('title'); });
  find('ByUrl').addEventListener('click', function() { sortByField('secondary'); });
  find('Reset').addEventListener('click', resetOrder);
  find('Apply').addEventListener('click', applyOrder);

  return openSort;
}
