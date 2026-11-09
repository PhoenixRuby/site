registerPlugin('card-export', {
  icon: window.CARD_ICONS.export,
  label: '匯出', mode: 'card', order: 7, requiresData: true,
  open: null,

  init() {
    // ── CSS ───────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      #exportModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);z-index:200;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s}
      #exportModalBg.open{opacity:1;pointer-events:all}
      .export-modal{background:var(--surface);border:1px solid var(--border);border-radius:20px 20px 0 0;width:100%;max-width:560px;padding:28px 24px 40px;transform:translateY(40px);transition:transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)}
      #exportModalBg.open .export-modal{transform:translateY(0)}
      .export-list{display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;margin-bottom:20px;padding-right:4px}
      .export-list::-webkit-scrollbar{width:4px}
      .export-list::-webkit-scrollbar-track{background:transparent}
      .export-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      .export-item{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color 0.15s, background 0.15s;user-select:none}
      .export-item:hover{border-color:var(--border);background:var(--surface3)}
      .export-item.selected{border-color:var(--accent);background:rgba(232,255,71,0.06)}
      .export-item input[type="checkbox"]{width:18px;height:18px;accent-color:var(--accent);cursor:pointer;flex-shrink:0}
      .export-item .icon-pic{width:26px;height:26px;border-radius:7px;flex-shrink:0}
      .export-item-body{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
      .export-item-name{font-size:14px}
      .export-item-mark{display:flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:9px}
      .export-item-modules{display:flex;gap:4px;flex-shrink:0}
      .export-item-modules code{font-size:9px;padding:2px 5px;border-radius:4px;background:rgba(108,63,224,.12);color:var(--accent2);border:1px solid rgba(108,63,224,.25);font-family:'IBM Plex Mono',monospace}
      .export-result{padding:16px 0;display:flex;flex-direction:column;gap:12px}
      .export-result-ok{color:var(--success);font-weight:600;font-size:15px}
      .export-result-warn{background:rgba(229,57,53,.08);border:1px solid var(--danger);border-radius:8px;padding:12px;font-size:12px;color:var(--text-dim);line-height:1.6}
      .export-result-warn strong{color:var(--danger)}
      .export-result-files{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
      .export-result-files code{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:11px;color:var(--accent)}
      .export-enc-row{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13px;color:var(--text-dim)}
      .export-enc-row input{width:15px;height:15px;accent-color:var(--accent);cursor:pointer}
      .export-enc-row label{cursor:pointer;user-select:none}
    `;
    document.head.appendChild(style);

    // ── HTML ──────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="exportModalBg">
        <div class="export-modal">
		  <div class="modal-header">
          <h2>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>
			選擇要匯出的站台
          </h2>
		  <button class="close-btn" id="exportCloseBtn">✕</button>
		  </div>
          <div class="modal-hint">勾選要匯出的項目，然後點擊匯出</div>
          <div class="export-list" id="exportList"></div>
          <div class="modal-quick">
            <button class="btn-quick" id="exportSelectAllBtn">全選</button>
            <button class="btn-quick" id="exportDeselectAllBtn">取消全選</button>
          </div>
          <div class="export-enc-row"><input type="checkbox" id="exportEncChk"><label for="exportEncChk">🔑 加密匯出（產生金鑰）</label></div>
          <div class="modal-footer">
            <button class="btn-reset" id="exportCancelBtn">取消</button>
            <button class="btn-confirm" id="exportConfirmBtn">匯出所選</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);

    // ── References ────────────────────────────
    const exportModalBg = document.getElementById('exportModalBg');

    // ── Local state ──────────────────────────
    let exportSelections = [];

    // ── Render ────────────────────────────────
    function renderExportList() {
      const list = document.getElementById('exportList');
      list.innerHTML = '';
      data.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'export-item' + (exportSelections[i] ? ' selected' : '');
        const modals = new Set();
        item.itemlist.forEach(g => { g.item.forEach(it => { if (it.modal) modals.add(it.modal); }); });
        const modalBadges = modals.size > 0
          ? `<div class="export-item-modules">${[...modals].map(m => `<code>${m}</code>`).join('')}</div>`
          : '';

        el.innerHTML = `
          <input type="checkbox" ${exportSelections[i] ? 'checked' : ''} data-idx="${i}">
          <img class="icon-pic" src="${resolveIconSrc(item.icon)}" onerror="this.style.display='none'">
          <div class="export-item-body">
            <div class="export-item-name">${item.title}</div>
            <div class="export-item-mark">
              <div class="sort-type" data-type="${item.type}">${item.type}</div>
              ${item.itemlist.map(g => `<div class="sort-icon" data-area="${g.name}">${g.name}</div>`).join('')}
            </div>
          </div>
          ${modalBadges}
        `;
        el.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT') return;
          exportSelections[i] = !exportSelections[i];
          renderExportList();
        });
        const cb = el.querySelector('input[type="checkbox"]');
        cb.addEventListener('change', () => {
          exportSelections[i] = cb.checked;
          renderExportList();
        });
        list.appendChild(el);
      });
    }

    function exportSelectAll() {
      exportSelections = data.map(() => true);
      renderExportList();
    }

    function exportDeselectAll() {
      exportSelections = data.map(() => false);
      renderExportList();
    }

    function showExportModal() {
      exportSelections = data.map((_, i) => true);
      renderExportList();
      exportModalBg.classList.add('open');
    }

    function hideExportModal() {
      exportModalBg.classList.remove('open');
    }

    function confirmExport() {
      const selected = data.filter((_, i) => exportSelections[i]);
      if (selected.length === 0) { showToast('請至少選擇一個項目'); return; }

      const exportData = JSON.parse(JSON.stringify(selected));
      exportData.forEach(card => { delete card.iconBase64; });

      const modules = new Set();
      exportData.forEach(card => {
        card.itemlist.forEach(g => {
          g.item.forEach(it => { if (it.modal) modules.add(it.modal); });
        });
      });

      const str = JSON.stringify(exportData, null, 2);
      const fileName = `卡片清單_${new Date().toISOString().slice(0, 10)}`;
      const useEnc = document.getElementById('exportEncChk').checked;

      function showResult(encrypted) {
        const list = document.getElementById('exportList');
        let resultHTML = `<div class="export-result"><div class="export-result-ok">✓ 已匯出 ${exportData.length} 個站台卡片${encrypted ? '（已加密）' : '（icon 已轉為 base64）'}</div>`;
        if (!encrypted && modules.size > 0) {
          resultHTML += `<div class="export-result-warn"><strong>⚠ 注意：</strong>匯出的卡片包含以下模組功能，對方需要有對應的模組檔案才能使用：<div class="export-result-files">${[...modules].map(m => `<code>modules/${m}.js</code>`).join('')}</div>請記得將上述檔案一併提供給對方。</div>`;
        }
        resultHTML += '</div>';
        list.innerHTML = resultHTML;
        const quickDiv = document.querySelector('#exportModalBg .modal-quick');
        const footerDiv = document.querySelector('#exportModalBg .modal-footer');
        const encRow = document.querySelector('.export-enc-row');
        if (quickDiv) quickDiv.style.display = 'none';
        if (encRow) encRow.style.display = 'none';
        if (footerDiv) footerDiv.innerHTML = '<button class="btn-confirm" id="exportDoneBtn" style="flex:1">完成</button>';
        document.getElementById('exportDoneBtn').addEventListener('click', () => {
          if (quickDiv) quickDiv.style.display = '';
          if (encRow) encRow.style.display = '';
          hideExportModal();
        });
      }

      function doDownload(content, name) {
        const blob = new Blob([content], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      if (useEnc) {
        window.CryptoExport.encrypt(str).then(result => {
          window.showExportKeyModal(result.keyBase64, () => {
            doDownload(result.json, fileName + '.enc.json');
            showResult(true);
          });
        });
      } else {
        doDownload(str, fileName + '.json');
        showResult(false);
      }
    }

    // ── Event listeners ──────────────────────
    document.getElementById('exportCloseBtn').addEventListener('click', hideExportModal);
    exportModalBg.addEventListener('click', e => {
      if (e.target === exportModalBg) hideExportModal();
    });
    document.getElementById('exportSelectAllBtn').addEventListener('click', exportSelectAll);
    document.getElementById('exportDeselectAllBtn').addEventListener('click', exportDeselectAll);
    document.getElementById('exportCancelBtn').addEventListener('click', hideExportModal);
    document.getElementById('exportConfirmBtn').addEventListener('click', confirmExport);

    // ── Expose globals (for backward compat) ─
    window.showExportModal = showExportModal;
    window.hideExportModal = hideExportModal;
    window.exportSelectAll = exportSelectAll;
    window.exportDeselectAll = exportDeselectAll;
    window.confirmExport = confirmExport;

    this.open = showExportModal;
  }
});


