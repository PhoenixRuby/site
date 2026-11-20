registerPlugin('card-export', {
  icon: 'export',
  label: '匯出', mode: 'card', order: 7, requiresData: true,
  open: null,

  load() {
	this.init(); 
  },
  
  init(){
    // ── HTML ──────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <dialog id="exportModalBg" class="app-dialog" aria-labelledby="cardExportTitle">
        <div class="export-modal app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg></span>
            <div class="app-modal-header-info">
              <h2 id="cardExportTitle" class="app-modal-header-title">選擇要匯出的站台</h2>
              <p class="app-modal-header-subtitle">勾選要匯出的項目，然後點擊匯出</p>
            </div>
            <button type="button" class="app-modal-header-close" id="exportCloseBtn" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body">
            <div class="card-export-tools">
              <input type="search" id="exportSearch" placeholder="搜尋名稱、環境、群組或模組…" aria-label="搜尋站台">
              <div class="card-export-selection">
                <span id="exportCount" aria-live="polite"></span>
                <button type="button" class="btn-quick" id="exportSelectAllBtn">全選</button>
                <button type="button" class="btn-quick" id="exportDeselectAllBtn">取消全選</button>
              </div>
            </div>
            <div class="export-list" id="exportList"></div>
            <p id="exportEmpty" role="status" hidden>找不到符合的站台</p>
            <section class="card-export-extras" aria-label="附加備份">
              <h3>附加備份</h3>
              <label class="export-enc-row"><input type="checkbox" id="exportGuideChk" checked><span>全部 Guide 手冊<small>含所有設定組與章節</small></span></label>
              <label class="export-enc-row"><input type="checkbox" id="exportChatChk" checked><span>全部 Chat 設定<small>含 IV、裝置資訊與自動時間設定</small></span></label>
            </section>
          </div>
          <footer class="app-dialog-footer">
            <p id="exportSummary" aria-live="polite"></p>
            <button class="btn-reset" id="exportCancelBtn">取消</button>
            <label class="export-enc-row"><input type="checkbox" id="exportEncChk">加密匯出</label>
            <button class="btn-confirm" id="exportConfirmBtn">匯出所選</button>
            <button class="btn-confirm" id="exportDoneBtn" hidden>完成</button>
          </footer>
        </div>
      </dialog>
    `;
    document.body.appendChild(wrapper.firstElementChild);

    // ── References ────────────────────────────
    const exportModalBg = document.getElementById('exportModalBg');

    // ── Local state ──────────────────────────
    let exportSelections = [];
    const exportOptions = exportModalBg.querySelectorAll('.card-export-tools, .card-export-extras, .app-dialog-footer .export-enc-row, #exportSummary');
    const search = document.getElementById('exportSearch');
    const list = document.getElementById('exportList');
    const empty = document.getElementById('exportEmpty');
    const selectAll = document.getElementById('exportSelectAllBtn');
    const deselectAll = document.getElementById('exportDeselectAllBtn');
    const guide = document.getElementById('exportGuideChk');
    const chat = document.getElementById('exportChatChk');
    const encrypt = document.getElementById('exportEncChk');
    let rows = [];
    const cancelBtn = document.getElementById('exportCancelBtn');
    const exportBtn = document.getElementById('exportConfirmBtn');
    const doneBtn = document.getElementById('exportDoneBtn');

    function showExportResult(showing) {
      exportOptions.forEach(el => { el.hidden = showing; });
      cancelBtn.hidden = showing;
      exportBtn.hidden = showing;
      doneBtn.hidden = !showing;
      if (showing) empty.hidden = true;
    }

    // ── Render ────────────────────────────────
    function updateSelection() {
      const count = exportSelections.filter(Boolean).length;
      const contents = [];
      if (count) contents.push(count + ' 張站台卡片');
      if (guide.checked) contents.push('全部 Guide 手冊');
      if (chat.checked) contents.push('全部 Chat 設定');
      document.getElementById('exportCount').textContent = '已選 ' + count + ' / ' + rows.length + ' 張';
      document.getElementById('exportSummary').textContent = contents.join(' · ') || '尚未選取匯出項目';
      exportBtn.textContent = (encrypt.checked ? '加密匯出' : '匯出') + (count ? ' ' + count + ' 張卡片' : '備份');
      exportBtn.disabled = !contents.length;
    }

    function filterExportList() {
      const query = search.value.trim().toLocaleLowerCase();
      rows.forEach(({ row, key }) => { row.hidden = !key.includes(query); });
      const matches = rows.some(({ row }) => !row.hidden);
      empty.hidden = matches;
      selectAll.disabled = deselectAll.disabled = !matches;
      selectAll.textContent = query ? '全選搜尋結果' : '全選';
      deselectAll.textContent = query ? '取消選取搜尋結果' : '取消全選';
    }

    function renderExportList() {
      list.replaceChildren();
      rows = data.map((item, i) => {
        const row = document.createElement('label');
        row.className = 'export-item';
        const groups = item.itemlist.map(group => group.name);
        const modules = new Set();
        item.itemlist.forEach(group => group.item.forEach(entry => {
          if (entry.guide || entry.modal === 'wsl' || entry.modal === 'cicd') modules.add('guide');
          else if (entry.modal) modules.add(entry.modal);
        }));
        const escape = AppUtils.escHtml;
        row.innerHTML = `
          <input type="checkbox" checked>
          <img class="icon-pic" alt="" src="${escape(resolveIconSrc(item.icon))}" onerror="this.hidden=true">
          <span class="export-item-body">
            <span class="export-item-name">${escape(item.title)}</span>
            <span class="export-item-mark">
              <span class="sort-type" data-type="${escape(item.type)}">${escape(item.type)}</span>
              ${groups.map(name => `<span class="sort-icon" data-area="${escape(name)}">${escape(name)}</span>`).join('')}
            </span>
          </span>
          ${modules.size ? `<span class="export-item-modules">${[...modules].map(name => `<code>${escape(name)}</code>`).join('')}</span>` : ''}
        `;
        const checkbox = row.querySelector('input');
        checkbox.addEventListener('change', () => {
          exportSelections[i] = checkbox.checked;
          updateSelection();
        });
        list.appendChild(row);
        return { row, checkbox, key: [item.title, item.type, ...groups, ...modules].join(' ').toLocaleLowerCase() };
      });
      filterExportList();
      updateSelection();
    }

    function selectMatching(checked) {
      rows.forEach(({ row, checkbox }, index) => {
        if (!row.hidden) exportSelections[index] = checkbox.checked = checked;
      });
      updateSelection();
    }

    function exportSelectAll() { selectMatching(true); }
    function exportDeselectAll() { selectMatching(false); }

    function showExportModal() {
      if (exportModalBg.open) return;
      exportSelections = data.map(() => true);
      search.value = '';
      showExportResult(false);
      renderExportList();
      list.scrollTop = 0;
      ModalManager.showDialog(exportModalBg, hideExportModal);
    }

    function hideExportModal() {
      ModalManager.closeDialog(exportModalBg);
    }

    function confirmExport() {
      const selected = data.filter((_, i) => exportSelections[i]);
      if (selected.length === 0 && !document.getElementById('exportChatChk').checked && !document.getElementById('exportGuideChk').checked) { showToast('請至少選擇一個站台、Chat 設定或 Guide 手冊'); return; }

      const exportData = JSON.parse(JSON.stringify(selected));
      exportData.forEach(card => { delete card.iconBase64; });

      const modules = new Set();
      exportData.forEach(card => {
        card.itemlist.forEach(g => {
          g.item.forEach(it => { if (it.guide || it.modal === 'wsl' || it.modal === 'cicd') modules.add('guide'); else if (it.modal) modules.add(it.modal); });
        });
      });

      const includeChat = document.getElementById('exportChatChk').checked;
      const includeGuide = document.getElementById('exportGuideChk').checked;
      const guides = {};
      if (includeGuide) {
        try {
          for (let n = 0; n < AccountStorage.length; n++) {
            const key = AccountStorage.key(n);
            const match = /^guide_([a-z][a-z0-9_-]{0,63})_v1$/i.exec(key || '');
            if (!match) continue;
            const saved = JSON.parse(AccountStorage.getItem(key));
            if (!saved || !Array.isArray(saved.profiles) || !saved.profiles.length ||
                !saved.profiles.every(profile => profile && typeof profile.id === 'string' &&
                  typeof profile.label === 'string' && profile.document && Array.isArray(profile.document.chapters))) {
              throw new Error(key + ' 資料格式不正確');
            }
            guides[match[1]] = saved;
          }
        } catch (err) { showToast('Guide 備份失敗：' + err.message); return; }
      }
      // Include built-in/legacy Guide data even when it has never been saved under guide_<id>_v1.
      if (includeGuide) {
        const ids = new Set(Object.keys(guides));
        // Built-in guides are always available from guide.js defaults.
        ids.add('wsl'); ids.add('cicd');
        data.forEach(card => (card.itemlist || []).forEach(group => (group.item || []).forEach(it => {
          if (it.guide) ids.add(it.guide);
          else if (it.modal === 'wsl' || it.modal === 'cicd') ids.add(it.modal);
        })));
        try {
          const module = window.modalModules && window.modalModules.guide;
          if (!module || typeof module.getBackup !== 'function') throw new Error('Guide 模組尚未載入，無法取得預設手冊');
          for (const id of ids) {
            if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(id)) continue;
            if (!guides[id]) guides[id] = module.getBackup(id);
          }
        } catch (err) { showToast('Guide 備份失敗：' + err.message); return; }
      }
      let payload = exportData; // 未勾選 Chat 與 Guide 時維持舊版陣列格式
      if (includeChat) {
        let chatProfiles = null;
        try {
          const raw = AccountStorage.getItem('chat_full_profiles_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.profiles)) chatProfiles = { ...parsed, profiles: parsed.profiles.map(p => ({ ...p, timestamp: '' })) };
          }
        } catch (e) { showToast('Chat 環境設定讀取失敗，請檢查 localStorage'); return; }
        payload = {
          format: 'card-backup-v3',
          cards: exportData,
          chat: {
            environments: chatProfiles
          }
        };
      }
      if (includeGuide) {
        if (Array.isArray(payload)) payload = {format:'card-backup-v3', cards:exportData};
        payload.guides = guides;
      }
      const str = JSON.stringify(payload, null, 2);
      const fileName = `卡片清單_${new Date().toISOString().slice(0, 10)}`;
      const useEnc = document.getElementById('exportEncChk').checked;
      if (includeChat && payload.chat.environments?.profiles?.length && !useEnc) {
        confirmAction({ message: '匯出檔將包含未加密的環境金鑰，確定要繼續？建議勾選「加密匯出」。', confirmText: '繼續匯出' }, downloadExport);
      } else {
        downloadExport();
      }

      function showResult(encrypted) {
        const list = document.getElementById('exportList');
        let resultHTML = `<div class="export-result"><div class="export-result-ok">✓ 已匯出 ${exportData.length} 個站台卡片${encrypted ? '（已加密）' : '（icon 已轉為 base64）'}</div>`;
        if (!encrypted && modules.size > 0) {
          resultHTML += `<div class="export-result-warn"><strong>⚠ 注意：</strong>匯出的卡片包含以下模組功能，對方需要有對應的模組檔案才能使用：<div class="export-result-files">${[...modules].map(m => `<code>modules/${m}.js</code>`).join('')}</div>請記得將上述檔案一併提供給對方。</div>`;
        }
        if (includeGuide) resultHTML += '<div>Guide 手冊：' + Object.keys(guides).length + ' 份</div>';
        if (includeChat) resultHTML += '<div>Chat 環境設定：' + (payload.chat.environments?.profiles?.length || 0) + ' 組（含每張卡片的自動時間設定與 IV；不包含即時時間戳）</div>';
        resultHTML += '</div>';
        list.innerHTML = resultHTML;
        showExportResult(true);
        doneBtn.focus();
      }

      function doDownload(content, name) {
        const blob = new Blob([content], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      function downloadExport() {
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
    }

    // ── Event listeners ──────────────────────
    document.getElementById('exportCloseBtn').addEventListener('click', hideExportModal);
    exportModalBg.addEventListener('click', e => {
      if (e.target === exportModalBg) hideExportModal();
    });
    search.addEventListener('input', filterExportList);
    selectAll.addEventListener('click', exportSelectAll);
    deselectAll.addEventListener('click', exportDeselectAll);
    [guide, chat, encrypt].forEach(input => input.addEventListener('change', updateSelection));
    document.getElementById('exportCancelBtn').addEventListener('click', hideExportModal);
    exportBtn.addEventListener('click', confirmExport);
    doneBtn.addEventListener('click', hideExportModal);

    // ── Expose globals (for backward compat) ─
    window.showExportModal = showExportModal;
    window.hideExportModal = hideExportModal;
    window.exportSelectAll = exportSelectAll;
    window.exportDeselectAll = exportDeselectAll;
    window.confirmExport = confirmExport;

    this.open = showExportModal;
  }
});


