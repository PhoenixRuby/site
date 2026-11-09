registerPlugin('img-export', {
  icon: window.CARD_ICONS.export,
  label: '匯出', mode: 'img', order: 20, requiresData: true, open: null,

  init() {
    var expWrap = document.createElement('div');
    expWrap.innerHTML =
      '<div class="is-popup-bg" id="isExpBg"><div class="is-popup">' +
        '<div class="modal-header"><h2><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg> 匯出母片</h2><button class="close-btn" id="isExpClose">✕</button></div>' +
        '<div class="is-popup-hint">勾選要匯出的母片，然後點擊匯出</div>' +
        '<div class="is-popup-list" id="isExpList"></div>' +
        '<div class="is-popup-quick"><button id="isExpSelAll">全選</button><button id="isExpDeselAll">取消全選</button></div>' +
        '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text-dim)"><input type="checkbox" id="isExpEncChk" style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer"><label for="isExpEncChk" style="cursor:pointer;user-select:none">🔑 加密匯出（產生金鑰）</label></div>' +
        '<div class="is-popup-footer"><button class="is-popup-cancel" id="isExpCancel">取消</button><button class="is-popup-confirm" id="isExpConfirm">匯出所選</button></div>' +
      '</div></div>';
    document.body.appendChild(expWrap.firstElementChild);

    var expBg = document.getElementById('isExpBg');
    var expList = document.getElementById('isExpList');
    var expSels = [];
    var stamps = [];

    function escHtml(s) { return window.isEscHtml ? window.isEscHtml(s) : String(s); }

    function renderExpList() {
      expList.innerHTML = '';
      stamps.forEach(function(s, i) {
        var row = document.createElement('div');
        row.className = 'is-popup-row' + (expSels[i] ? ' selected' : '');
        row.innerHTML =
          '<input type="checkbox"' + (expSels[i] ? ' checked' : '') + '>' +
          '<img class="is-popup-row-thumb" src="' + s.image + '">' +
          '<div class="is-popup-row-info">' +
            '<div class="is-popup-row-name">' + escHtml(s.name) + '</div>' +
            '<div class="is-popup-row-meta">' + (s.texts || []).length + ' 個文字</div>' +
          '</div>';
        row.addEventListener('click', function(e) {
          if (e.target.tagName === 'INPUT') return;
          expSels[i] = !expSels[i]; renderExpList();
        });
        row.querySelector('input').addEventListener('change', function() {
          expSels[i] = this.checked; renderExpList();
        });
        expList.appendChild(row);
      });
    }

    function openExpPopup() {
      stamps = window.isLoadStamps ? window.isLoadStamps() : [];
      if (stamps.length === 0) { showToast('沒有母片可匯出'); return; }
      expSels = stamps.map(function() { return true; });
      renderExpList();
      expBg.classList.add('open');
    }

    var closeExp = function() { expBg.classList.remove('open'); };
    bindPopup(expBg, closeExp);
    document.getElementById('isExpCancel').addEventListener('click', closeExp);
    document.getElementById('isExpSelAll').addEventListener('click', function() { expSels = stamps.map(function() { return true; }); renderExpList(); });
    document.getElementById('isExpDeselAll').addEventListener('click', function() { expSels = stamps.map(function() { return false; }); renderExpList(); });
    document.getElementById('isExpConfirm').addEventListener('click', function() {
      var selected = stamps.filter(function(_, i) { return expSels[i]; });
      if (selected.length === 0) { showToast('請至少選擇一個項目'); return; }
      var json = JSON.stringify(selected, null, 2);
      var fileName = 'img_stamps_' + new Date().toISOString().slice(0, 10);
      var useEnc = document.getElementById('isExpEncChk').checked;

      function doDownload(content, name) {
        var blob = new Blob([content], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      if (useEnc) {
        window.CryptoExport.encrypt(json).then(function(result) {
          window.showExportKeyModal(result.keyBase64, function() {
            doDownload(result.json, fileName + '.enc.json');
            expBg.classList.remove('open');
            showToast('已匯出 ' + selected.length + ' 組母片（已加密）');
          });
        });
      } else {
        doDownload(json, fileName + '.json');
        expBg.classList.remove('open');
        showToast('已匯出 ' + selected.length + ' 組母片');
      }
    });

    this.open = openExpPopup;
  }
});
