registerPlugin('card-import', {
  icon: 'import',
  label: '匯入', mode: 'card', order: 8,
  open: null,

  load() {
	this.init(); 
  },
  
  init(){
    const main = window.plugins['card']; 
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <dialog id="importModalBg" class="app-dialog" aria-labelledby="cardImportTitle">
        <div class="import-modal app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></span>
            <div class="app-modal-header-info">
              <h2 id="cardImportTitle" class="app-modal-header-title">匯入站台卡片資料</h2>
              <p class="app-modal-header-subtitle">選擇 JSON 檔案或拖曳至下方區域</p>
            </div>
            <button type="button" class="app-modal-header-close" id="importCloseBtn" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body">
            <div class="import-drop" id="importDrop">📁 點擊選擇檔案 或 拖曳 JSON 至此</div>
            <input type="file" id="importFileInput" accept=".json" style="display:none">
            <div class="import-analysis" id="importAnalysis"></div>
            <label id="importGuideRow" style="display:none;align-items:center;gap:8px;font-size:13px;color:var(--text-dim)"><input type="checkbox" id="importGuideChk" checked> 一併還原 Guide 手冊（同 ID 整份覆蓋，會先確認）</label>
            <label id="importChatRow" style="display:none;align-items:center;gap:8px;font-size:13px;color:var(--text-dim)"><input type="checkbox" id="importChatChk" checked> 一併匯入 Chat 設定卡片（同名覆蓋，其餘新增；包含 IV 與各卡片自動時間設定）</label>
          </div>
          <footer class="app-dialog-footer">
            <button class="btn-reset" id="importCancelBtn">取消</button>
            <button class="btn-confirm" id="importConfirmBtn" disabled>確認匯入</button>
          </footer>
        </div>
      </dialog>
    `;
    document.body.appendChild(wrapper.firstElementChild);

    const importModalBg = document.getElementById('importModalBg');
    const importDrop = document.getElementById('importDrop');
    const importFileInput = document.getElementById('importFileInput');
    const analysisDiv = document.getElementById('importAnalysis');
    const confirmBtn = document.getElementById('importConfirmBtn');

    let importPendingData = null;
    let dupActions = {};
    let pendingChat = null;
    let pendingGuides = null;

    function showImportModal() {
      importPendingData = null;
      pendingChat = null;
      pendingGuides = null;
      document.getElementById('importGuideRow').style.display = 'none';
      document.getElementById('importChatRow').style.display = 'none';
      dupActions = {};
      analysisDiv.style.display = 'none';
      analysisDiv.innerHTML = '';
      confirmBtn.disabled = true;
      importDrop.textContent = '📁 點擊選擇檔案 或 拖曳 JSON 至此';
      importDrop.style.display = '';
      ModalManager.showDialog(importModalBg, hideImportModal);
    }

    function hideImportModal() {
      ModalManager.closeDialog(importModalBg);
      importPendingData = null;
      pendingChat = null;
      pendingGuides = null;
    }

    function handleImportFile(file) {
      if (!file.name.endsWith('.json')) { showImportError('請選擇 .json 格式的檔案。\n\n目前選擇的檔案：' + file.name); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const rawText = ev.target.result;
        if (window.CryptoExport && window.CryptoExport.isEncrypted(rawText)) {
          window.showDecryptModal(rawText, plain => processCardImport(plain, file.name));
          return;
        }
        processCardImport(rawText, file.name);
      };
      reader.readAsText(file);
    }

    function processCardImport(rawText, fileName) {
        try {
          const parsed = JSON.parse(rawText);
          let items = [];
          if (Array.isArray(parsed)) {
            items = parsed;
          } else if (parsed && ['card-backup-v2', 'card-backup-v3'].includes(parsed.format) && Array.isArray(parsed.cards)) {
            items = parsed.cards;
            if (parsed.guides !== undefined) {
              if (!parsed.guides || typeof parsed.guides !== 'object' || Array.isArray(parsed.guides)) throw new Error('Guide 備份格式不正確');
              for (const [id, guide] of Object.entries(parsed.guides)) {
                if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(id) || !guide ||
                    !Array.isArray(guide.profiles) || !guide.profiles.length ||
                    !guide.profiles.every(profile => profile && typeof profile.id === 'string' &&
                      typeof profile.label === 'string' && profile.document && Array.isArray(profile.document.chapters))) {
                  throw new Error('Guide ' + id + ' 格式不正確');
                }
              }
              pendingGuides = parsed.guides;
            }
            if (parsed.chat != null) {
              const env = parsed.chat.environments;
              if (env != null && (!Array.isArray(env.profiles) || !env.profiles.every(p => p && typeof p.id === 'string' && typeof p.label === 'string' && typeof p.url === 'string' && typeof p.clientid === 'string' && typeof p.key === 'string'))) {
                throw new Error('Chat 環境設定格式不正確');
              }
              // v2 的 Chat 資料只有 URL / clientid / key，v3 包含完整卡片設定。
              pendingChat = { ...parsed.chat, backupFormat: parsed.format };
            }
          } else if (parsed.themes && parsed.favorites) {
            showImportError('這是「書籤我的最愛」格式，無法匯入至站台卡片。\n\n請在書籤頁面使用匯入功能。');
            return;
          } else {
            showImportError('JSON 格式不正確：頂層結構應為陣列。\n\n請確認是由本工具匯出的站台 JSON 檔。');
            return;
          }
          const valid = items.every(it => it.title && it.itemlist);
          if (!valid || (items.length === 0 && !pendingChat && !pendingGuides)) {
            showImportError('JSON 內容不符合站台格式：每個項目需包含 title 與 itemlist 欄位。');
            return;
          }

          const KNOWN_MODALS = ['chat', 'wsl', 'cicd'];
          items.forEach(block => {
            if (block.itemlist) {
              block.itemlist.forEach(group => {
                group.item.forEach(it => {
                  if (!it.modal) {
                    const found = KNOWN_MODALS.find(k => it[k] !== undefined);
                    if (found) it.modal = found;
                  }
                });
              });
            }
          });

          importPendingData = items;
          document.getElementById('importChatRow').style.display = pendingChat ? 'flex' : 'none';
          document.getElementById('importGuideRow').style.display = pendingGuides ? 'flex' : 'none';
          document.getElementById('importGuideChk').checked = true;
          document.getElementById('importChatChk').checked = true;
          dupActions = {};
          importDrop.textContent = '✅ 已讀取：' + fileName;
          showAnalysis(items);
        } catch (err) {
          showImportError('JSON 解析失敗，檔案可能已損毀或非有效 JSON 格式。\n\n錯誤：' + err.message);
        }
    }

    function showAnalysis(items) {
      analysisDiv.innerHTML = '';
      analysisDiv.style.display = 'flex';

      const modules = new Set();
      items.forEach(card => {
        card.itemlist.forEach(g => {
          g.item.forEach(it => { if (it.guide || it.modal === 'wsl' || it.modal === 'cicd') modules.add('guide'); else if (it.modal) modules.add(it.modal); });
        });
      });

      if (modules.size > 0) {
        const warnDiv = document.createElement('div');
        warnDiv.className = 'import-warn';
        warnDiv.innerHTML = `<strong>⚠ 模組相依：</strong>以下卡片包含模組功能，請確認 modules/ 目錄中有對應檔案：<br>` +
          [...modules].map(m => `<code>modules/${m}.js</code>`).join(' ') +
          `<br>缺少模組檔案的功能將無法使用。`;
        analysisDiv.appendChild(warnDiv);
      }

      const existingTitles = {};
      const existingIds = {};
      data.forEach((d, i) => {
        existingTitles[d.title + '|' + d.type] = i;
        if (d.id != null) existingIds[String(d.id)] = i;
      });

      const seenImportIds = {};
      const listDiv = document.createElement('div');
      listDiv.className = 'import-card-list';

      items.forEach((item, idx) => {
        const key = item.title + '|' + item.type;
        const dupTitle = existingTitles.hasOwnProperty(key);
        const dupIdVsExisting = item.id != null && existingIds.hasOwnProperty(String(item.id));
        const dupIdInFile = item.id != null && seenImportIds.hasOwnProperty(String(item.id));
        if (item.id != null) seenImportIds[String(item.id)] = idx;

        let dupType = 'new';
        if (dupTitle && dupIdVsExisting) dupType = 'both';
        else if (dupTitle) dupType = 'title';
        else if (dupIdVsExisting) dupType = 'id';

        const isDup = dupType !== 'new';
        const el = document.createElement('div');

        const iconSrc = (typeof resolveIconSrc === 'function') ? resolveIconSrc(item.icon) : (item.icon || '');
        const groupNames = item.itemlist.map(g => `<div class="sort-icon" data-area="${g.name}">${g.name}</div>`).join('');
        const cardModals = new Set();
        item.itemlist.forEach(g => { g.item.forEach(it => { if (it.guide || it.modal === 'wsl' || it.modal === 'cicd') cardModals.add('guide'); else if (it.modal) cardModals.add(it.modal); }); });
        const modalBadges = cardModals.size > 0
          ? `<div class="import-card-modules">${[...cardModals].map(m => `<code>${m}</code>`).join('')}</div>`
          : '';

        if (dupType === 'both') {
          el.className = 'import-card-item import-card-dup-both';
          dupActions[idx] = 'skip';
        } else if (dupType === 'id') {
          el.className = 'import-card-item import-card-dup-id';
          dupActions[idx] = 'skip';
        } else if (dupType === 'title') {
          el.className = 'import-card-item import-card-dup';
          dupActions[idx] = 'skip';
        } else {
          el.className = 'import-card-item import-card-new';
          dupActions[idx] = 'add';
        }
        if (dupIdInFile) el.className += ' import-card-dup-id';

        const dupLabel = dupType === 'both' ? '重複（標題+ID）'
          : dupType === 'id' ? 'ID 重複'
          : dupType === 'title' ? '重複（標題）'
          : '';
        const inFileNote = dupIdInFile ? ' <span style="color:#e040fb;font-size:9px">（檔案內重複ID）</span>' : '';

        const statusLabel = isDup || dupIdInFile
          ? `<span class="import-dup-label">${dupLabel || '新項目'}${inFileNote}</span>`
          : '<span class="import-new-label">新項目</span>';

        const actionButtons = isDup
          ? `<div class="import-action">
              <button class="dup-overwrite" data-idx="${idx}">覆蓋</button>
              <button class="dup-skip active-skip" data-idx="${idx}">✓ 跳過</button>
            </div>`
          : `<div class="import-action">
              <button class="new-add active-add" data-idx="${idx}">✓ 新建</button>
              <button class="new-skip" data-idx="${idx}">跳過</button>
            </div>`;

        el.innerHTML = `
          <img src="${iconSrc}" onerror="this.style.display='none'" style="width:24px;height:24px;border-radius:4px;object-fit:contain">
          <div class="import-card-info">
            <div class="import-card-title">${item.title}</div>
            <div class="import-card-mark">
              <div class="sort-type" data-type="${item.type}">${item.type}</div>
              ${groupNames}
              ${modalBadges}
            </div>
            <div class="import-card-type">${statusLabel}</div>
          </div>
          ${actionButtons}
        `;

        listDiv.appendChild(el);
      });

      listDiv.addEventListener('click', e => {
        const btn = e.target.closest('.dup-overwrite, .dup-skip, .new-add, .new-skip');
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx);
        const row = btn.closest('.import-action');
        const card = btn.closest('.import-card-item');
        row.querySelectorAll('button').forEach(b => {
          b.classList.remove('active', 'active-skip', 'active-add');
          b.textContent = b.textContent.replace('✓ ', '');
        });
        if (btn.classList.contains('dup-overwrite')) {
          dupActions[idx] = 'overwrite';
          btn.classList.add('active');
          btn.textContent = '✓ 覆蓋';
          card.classList.add('dup-overwrite-card');
        } else if (btn.classList.contains('new-add')) {
          dupActions[idx] = 'add';
          btn.classList.add('active-add');
          btn.textContent = '✓ 新建';
          card.classList.remove('import-card-skipped');
        } else if (btn.classList.contains('new-skip')) {
          dupActions[idx] = 'skip';
          btn.classList.add('active-skip');
          btn.textContent = '✓ 跳過';
          card.classList.add('import-card-skipped');
        } else {
          dupActions[idx] = 'skip';
          btn.classList.add('active-skip');
          btn.textContent = '✓ 跳過';
          card.classList.remove('dup-overwrite-card');
        }
      });

      analysisDiv.appendChild(listDiv);
      confirmBtn.disabled = items.length === 0 && !pendingChat && !pendingGuides;
    }

    function confirmImport(overwriteGuides = false) {
      if (!importPendingData) return;
      const restoreGuides = pendingGuides && document.getElementById('importGuideChk').checked;
      const guideIds = restoreGuides ? Object.keys(pendingGuides) : [];
      const conflicts = guideIds.filter(id => AccountStorage.getItem('guide_' + id + '_v1') !== null);
      if (conflicts.length && !overwriteGuides) {
        confirmAction({ message: '下列 Guide 已有資料，匯入將整份覆蓋所有設定組：\n' + conflicts.join('、') + '\n\n確定繼續？', confirmText: '覆蓋並匯入' }, () => confirmImport(true));
        return;
      }
      // First commit Guide storage; on failure restore originals before touching card/chat data.
      let guideCount = 0;
      if (restoreGuides) {
        const previous = new Map();
        try {
          guideIds.forEach(id => previous.set(id,AccountStorage.getItem('guide_' + id + '_v1')));
          guideIds.forEach(id => { AccountStorage.setItem('guide_' + id + '_v1',JSON.stringify(pendingGuides[id])); guideCount++; });
          window.dispatchEvent(new CustomEvent('guide-profiles-imported',{detail:{ids:guideIds}}));
        } catch (err) {
          previous.forEach((raw,id) => { try { if (raw === null) AccountStorage.removeItem('guide_' + id + '_v1'); else AccountStorage.setItem('guide_' + id + '_v1',raw); } catch (_) {} });
          showToast('Guide 還原失敗：' + err.message);
          return;
        }
      }

      const existingMap = {};
      const existingIdMap = {};
      data.forEach((d, i) => {
        existingMap[d.title + '|' + d.type] = i;
        if (d.id != null) existingIdMap[String(d.id)] = i;
      });

      let addedCount = 0;
      let overwrittenCount = 0;
      let skippedCount = 0;

      importPendingData.forEach((item, idx) => {
        const key = item.title + '|' + item.type;
        const existIdx = existingMap[key] !== undefined ? existingMap[key]
          : (item.id != null && existingIdMap[String(item.id)] !== undefined ? existingIdMap[String(item.id)] : undefined);

        if (existIdx !== undefined) {
          if (dupActions[idx] === 'overwrite') {
            data[existIdx] = item;
            overwrittenCount++;
          } else {
            skippedCount++;
          }
        } else {
          if (dupActions[idx] === 'add') {
            data.push(item);
            addedCount++;
          } else {
            skippedCount++;
          }
        }
      });

      if (addedCount > 0 || overwrittenCount > 0) {
        main.saveData(data, 'site_data');
        if (addedCount > 0) {
          const newLen = data.length;
          for (let i = currentOrder.length + 1; i <= newLen; i++) {
            currentOrder.push(i);
          }
          //AccountStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));
		  main.saveData(currentOrder, 'card_order');
        }
        renderGrid();
      }

      let chatCount = 0;
      if (pendingChat && document.getElementById('importChatChk').checked) {
        try {
          const incoming = pendingChat.environments;
          if (incoming && Array.isArray(incoming.profiles) && incoming.profiles.length) {
            const key = 'chat_full_profiles_v1';
            const legacyKey = 'chat_environment_profiles_v1';
            const defaults = {url:'https://localhost:44309/Login/AppLogin',clientid:'TEST',key:'',gid:'GID71171171171171',version:'5.64.0(0)',deviceType:'iOS',os_version:'18.1.1',timestamp:'',nonce:'',autoTimestamp:true};
            const legacyDevice = (() => { try { return JSON.parse(AccountStorage.getItem('chat_device_config_v1')) || {}; } catch (_) { return {}; } })();
            const legacyAuto = typeof pendingChat.autoTimestamp === 'boolean' ? pendingChat.autoTimestamp : AccountStorage.getItem('chat_auto_timestamp') !== 'false';
            const isLegacy = pendingChat.backupFormat === 'card-backup-v2';
            const normalize = p => ({ ...defaults, ...(isLegacy ? legacyDevice : {}), ...p, timestamp:'', autoTimestamp:typeof p.autoTimestamp === 'boolean' ? p.autoTimestamp : legacyAuto, nonce:typeof p.nonce === 'string' ? p.nonce : '' });
            let existing = {profiles:[],selectedId:''};
            try {
              const stored = JSON.parse(AccountStorage.getItem(key));
              if (stored && Array.isArray(stored.profiles)) existing = stored;
            } catch (_) {}
            if (!existing.profiles.length) {
              try {
                const stored = JSON.parse(AccountStorage.getItem(legacyKey));
                if (stored && Array.isArray(stored.profiles)) existing = {profiles:stored.profiles.map(p=>({...defaults,...legacyDevice,...p,timestamp:'',autoTimestamp:legacyAuto})),selectedId:stored.selectedId};
              } catch (_) {}
            }
            const merged = existing.profiles.map(p => ({...p,timestamp:''}));
            const importedIdMap = new Map();
            for (const source of incoming.profiles) {
              const p = normalize(source);
              const idx = merged.findIndex(x => x.label === p.label || x.id === p.id);
              if (idx >= 0) {
                // 舊版備份缺少的欄位，不應清除現有卡片的 IV / 裝置資訊。
                const combined = isLegacy ? {...merged[idx],...source,timestamp:''} : {...merged[idx],...p};
                combined.id = merged[idx].id;
                if (isLegacy && typeof source.autoTimestamp !== 'boolean') combined.autoTimestamp = merged[idx].autoTimestamp;
                merged[idx] = combined;
                importedIdMap.set(source.id,combined.id);
              } else {
                if (merged.some(x => x.id === p.id)) p.id = 'card_import_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).slice(2));
                merged.push(p);
                importedIdMap.set(source.id,p.id);
              }
              chatCount++;
            }
            const selectedId = importedIdMap.get(incoming.selectedId) || existing.selectedId;
            const result = {profiles:merged,selectedId:merged.some(p=>p.id===selectedId)?selectedId:merged[0]?.id||''};
            AccountStorage.setItem(key,JSON.stringify(result));
            window.dispatchEvent(new CustomEvent('chat-profiles-imported'));
          }
        } catch (e) { showToast('卡片已處理，但 Chat 設定匯入失敗：' + e.message); return; }
      }
      const chatImported = pendingChat && document.getElementById('importChatChk').checked;
      hideImportModal();
      const parts = [];
      if (guideCount) parts.push(`Guide 手冊 ${guideCount} 份`);
      if (chatImported) parts.push(`Chat 環境設定 ${chatCount} 組`);
      if (addedCount > 0) parts.push(`新增 ${addedCount} 個`);
      if (overwrittenCount > 0) parts.push(`覆蓋 ${overwrittenCount} 個`);
      if (skippedCount > 0) parts.push(`跳過 ${skippedCount} 個`);
      showToast('✓ ' + parts.join('、'));
    }

    document.getElementById('importCloseBtn').addEventListener('click', hideImportModal);
    importModalBg.addEventListener('click', e => { if (e.target === importModalBg) hideImportModal(); });
    importDrop.addEventListener('click', () => importFileInput.click());
    importDrop.addEventListener('dragover', e => { e.preventDefault(); importDrop.classList.add('drag-over'); });
    importDrop.addEventListener('dragleave', () => { importDrop.classList.remove('drag-over'); });
    importDrop.addEventListener('drop', e => {
      e.preventDefault();
      importDrop.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]);
    });
    importFileInput.addEventListener('change', e => {
      if (e.target.files[0]) handleImportFile(e.target.files[0]);
      importFileInput.value = '';
    });
    document.getElementById('importCancelBtn').addEventListener('click', hideImportModal);
    confirmBtn.addEventListener('click', () => confirmImport());

    window.showImportModal = showImportModal;
    window.hideImportModal = hideImportModal;
    window.confirmImport = confirmImport;
    this.open = showImportModal;

    // ── Full-page drop zone overlay ──
    const dropOverlay = document.createElement('div');
    dropOverlay.id = 'cardImportDropOverlay';
    dropOverlay.innerHTML = '<div class="card-drop-overlay-inner">📁 放開以匯入站台 JSON</div>';
    document.body.appendChild(dropOverlay);

    // Only OS file drags are imports. Internal sortable items use text/custom MIME types.
    let dragCounter = 0;
    function isFileDrag(e) {
      const dt = e && e.dataTransfer;
      return !!(dt && dt.types && Array.from(dt.types).includes('Files'));
    }
    function resetDropOverlay() {
      dragCounter = 0;
      dropOverlay.classList.remove('active');
    }
    function shouldHandleDrop() {
      return window.viewMode === 'card' && !document.querySelector('dialog:modal');
    }
    document.addEventListener('dragenter', function(e) {
      if (!shouldHandleDrop() || !isFileDrag(e)) return;
      dragCounter++;
      dropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function(e) {
      if (!isFileDrag(e)) return;
      if (!shouldHandleDrop()) { resetDropOverlay(); return; }
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) dropOverlay.classList.remove('active');
    });
    document.addEventListener('dragover', function(e) {
      if (!shouldHandleDrop() || !isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('drop', function(e) {
      const fileDrag = isFileDrag(e);
      const canImport = shouldHandleDrop();
      resetDropOverlay();
      if (!canImport || !fileDrag) return;
      e.preventDefault();
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      showImportModal();
      handleImportFile(file);
    });
    document.addEventListener('dragend', resetDropOverlay);
    window.addEventListener('blur', resetDropOverlay);
  }
});
