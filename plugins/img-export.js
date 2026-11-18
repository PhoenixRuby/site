registerPlugin('img-export', {
  icon: 'export',
  label: '匯出', mode: 'img', order: 20, requiresData: true, open: null,

  load() {
	  this.init();
  },
  init(){
    var expWrap = document.createElement('div');
    expWrap.innerHTML =
      '<dialog id="isExpBg" class="app-dialog" aria-labelledby="isExpTitle"><div class="is-popup app-dialog-panel-medium">' +
        '<header class="app-modal-header">' +
          '<span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg></span>' +
          '<div class="app-modal-header-info"><h2 class="app-modal-header-title" id="isExpTitle">匯出母片</h2><p class="app-modal-header-subtitle">勾選要匯出的母片，然後點擊匯出</p></div>' +
          '<button type="button" class="app-modal-header-close" id="isExpClose" aria-label="關閉">✕</button>' +
        '</header>' +
        '<div class="app-dialog-body">' +
          '<div class="is-exp-tools"><input type="search" id="isExpSearch" placeholder="搜尋母片…" aria-label="搜尋母片名稱">' +
            '<div class="is-exp-selection"><span id="isExpCount" aria-live="polite"></span><button type="button" class="btn-quick" id="isExpSelAll">全選</button><button type="button" class="btn-quick" id="isExpDeselAll">取消全選</button></div></div>' +
          '<div class="is-popup-list" id="isExpList"></div>' +
          '<p id="isExpEmpty" role="status" hidden>找不到符合的母片</p>' +
        '</div>' +
        '<footer class="app-dialog-footer is-exp-footer"><button type="button" class="btn-reset" id="isExpCancel">取消</button>' +
          '<label><input type="checkbox" id="isExpEncChk">加密匯出</label><button type="button" class="btn-confirm" id="isExpConfirm">匯出</button></footer>' +
      '</div></dialog>';
    document.body.appendChild(expWrap.firstElementChild);

    var expBg = document.getElementById('isExpBg');
    var expList = document.getElementById('isExpList');
    const search = document.getElementById('isExpSearch');
    const count = document.getElementById('isExpCount');
    const empty = document.getElementById('isExpEmpty');
    const selectAll = document.getElementById('isExpSelAll');
    const deselectAll = document.getElementById('isExpDeselAll');
    const encrypt = document.getElementById('isExpEncChk');
    const confirmBtn = document.getElementById('isExpConfirm');
    let rows = [];
    let pendingEncryption = null;

    function updateSelection() {
      const selected = rows.filter(({ checkbox }) => checkbox.checked).length;
      count.textContent = '已選 ' + selected + ' / ' + rows.length + ' 組';
      confirmBtn.textContent = (encrypt.checked ? '加密匯出 ' : '匯出 ') + selected + ' 組母片';
      confirmBtn.disabled = !selected || Boolean(pendingEncryption);
    }

    function filterRows() {
      const query = search.value.trim().toLocaleLowerCase();
      rows.forEach(({ row, name }) => { row.hidden = !name.includes(query); });
      const found = rows.some(({ row }) => !row.hidden);
      empty.hidden = found;
      selectAll.disabled = deselectAll.disabled = !found;
      selectAll.textContent = query ? '全選搜尋結果' : '全選';
      deselectAll.textContent = query ? '取消選取搜尋結果' : '取消全選';
    }

    function setMatchingSelection(checked) {
      rows.forEach(({ row, checkbox }) => { if (!row.hidden) checkbox.checked = checked; });
      updateSelection();
    }

    function openExpPopup() {
      if (expBg.open) return;
      const stamps = window.isLoadStamps();
      if (!stamps.length) { showToast('沒有母片可匯出'); return; }
      expList.replaceChildren();
      rows = stamps.map(stamp => {
        const row = document.createElement('label');
        row.className = 'is-popup-row';
        row.innerHTML = '<input type="checkbox" checked><img class="is-popup-row-thumb" alt="" loading="lazy">' +
          '<span class="is-popup-row-info"><span class="is-popup-row-name"></span><span class="is-popup-row-meta"></span></span>';
        const checkbox = row.querySelector('input');
        const image = row.querySelector('img');
        if (stamp.image) image.src = stamp.image;
        else image.hidden = true;
        row.querySelector('.is-popup-row-name').textContent = stamp.name;
        row.querySelector('.is-popup-row-meta').textContent = (stamp.texts || []).length + ' 個文字';
        checkbox.addEventListener('change', updateSelection);
        expList.appendChild(row);
        return { stamp, row, checkbox, name: String(stamp.name || '').toLocaleLowerCase() };
      });
      search.value = '';
      filterRows();
      updateSelection();
      expList.scrollTop = 0;
      ModalManager.showDialog(expBg, closeExp);
    }

    function closeExp() {
      pendingEncryption = null;
      ModalManager.closeDialog(expBg);
    }

    document.getElementById('isExpClose').addEventListener('click', closeExp);
    expBg.addEventListener('click', event => { if (event.target === expBg) closeExp(); });
    document.getElementById('isExpCancel').addEventListener('click', closeExp);
    search.addEventListener('input', filterRows);
    encrypt.addEventListener('change', updateSelection);
    selectAll.addEventListener('click', () => setMatchingSelection(true));
    deselectAll.addEventListener('click', () => setMatchingSelection(false));
    confirmBtn.addEventListener('click', function() {
      const selected = rows.filter(({ checkbox }) => checkbox.checked).map(({ stamp }) => stamp);
      if (!selected.length || pendingEncryption) return;
      var json = JSON.stringify(selected, null, 2);
      var fileName = 'img_stamps_' + new Date().toISOString().slice(0, 10);
      var useEnc = encrypt.checked;

      function doDownload(content, name) {
        var blob = new Blob([content], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      if (useEnc) {
        const request = {};
        pendingEncryption = request;
        updateSelection();
        window.CryptoExport.encrypt(json).then(function(result) {
          if (pendingEncryption !== request) return;
          pendingEncryption = null;
          updateSelection();
          window.showExportKeyModal(result.keyBase64, function() {
            doDownload(result.json, fileName + '.enc.json');
            closeExp();
            showToast('已匯出 ' + selected.length + ' 組母片（已加密）');
          });
        }, function() {
          if (pendingEncryption !== request) return;
          pendingEncryption = null;
          updateSelection();
          showToast('加密匯出失敗，請再試一次');
        });
      } else {
        doDownload(json, fileName + '.json');
        closeExp();
        showToast('已匯出 ' + selected.length + ' 組母片');
      }
    });

    this.open = openExpPopup;
  }
});
