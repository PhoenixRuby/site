registerPlugin('card-import', {
  icon: window.CARD_ICONS.import,
  label: '匯入', mode: 'card', order: 8,
  open: null,

  init() {
    const style = document.createElement('style');
    style.textContent = `
      #importModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s}
      #importModalBg.open{opacity:1;pointer-events:all}
      .import-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:min(92vw,1600px);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:16px;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}
      #importModalBg.open .import-modal{transform:translateY(0) scale(1)}
      .import-drop{border:2px dashed var(--border);border-radius:10px;padding:36px 20px;text-align:center;cursor:pointer;color:var(--text-dim);font-size:.9rem;transition:border-color .2s, background .2s}
      .import-drop:hover,.import-drop.drag-over{border-color:var(--accent);background:rgba(0,229,255,.04);color:var(--text)}
      .import-analysis{display:none;flex-direction:column;gap:10px}
      .import-warn{background:rgba(229,57,53,.08);border:1px solid var(--danger);border-radius:8px;padding:12px;font-size:12px;color:var(--text-dim);line-height:1.6}
      .import-warn strong{color:var(--danger)}
      .import-warn code{background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:11px;color:var(--accent)}
      .import-card-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:6px;max-height:60vh;overflow-y:auto;padding-right:4px}
      .import-card-list::-webkit-scrollbar{width:4px}
      .import-card-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      .import-card-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:flex-start;gap:10px;font-size:13px}
      .import-card-dup-id{border-color:#e040fb}
      .import-card-dup-id .import-dup-label{color:#e040fb}
      .import-card-dup-both{border-color:#ff5252}
      .import-card-dup-both .import-dup-label{color:#ff5252}
      #cardImportDropOverlay{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s}
      #cardImportDropOverlay.active{opacity:1;pointer-events:all}
      .card-drop-overlay-inner{border:3px dashed var(--accent);border-radius:16px;padding:48px 64px;color:var(--accent);font-size:1.4rem;font-weight:600;background:rgba(0,0,0,.6);pointer-events:none;text-align:center}
      .import-card-item img{width:24px;height:24px;border-radius:4px;object-fit:contain}
      .import-card-item .import-card-info{flex:1;min-width:0}
      .import-card-item .import-card-title{font-weight:500}
      .import-card-item .import-card-type{font-size:10px;color:var(--text-dim);font-family:'IBM Plex Mono',monospace}
      .import-card-item .import-card-mark{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:2px}
      .import-card-item .import-card-mark .sort-icon,.import-card-item .import-card-mark .sort-type{font-size:9px}
      .import-card-modules{display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap}
      .import-card-modules code{font-size:9px;padding:2px 5px;border-radius:4px;background:rgba(108,63,224,.12);color:var(--accent2);border:1px solid rgba(108,63,224,.25);font-family:'IBM Plex Mono',monospace}
      .import-card-new{border-color:var(--success)}
      .import-card-new.import-card-skipped{border-color:var(--border)}
      .import-card-new .import-new-label{font-size:10px;color:var(--success);font-weight:600}
      .import-card-new.import-card-skipped .import-new-label{color:var(--text-dim)}
      .import-card-dup{border-color:#ff9800}
      .import-card-dup.dup-overwrite-card{border-color:var(--accent)}
      .import-card-dup .import-dup-label{font-size:10px;color:#ff9800;font-weight:600}
      .import-card-dup.dup-overwrite-card .import-dup-label{color:var(--accent)}
      .import-action{display:flex;gap:6px;flex-shrink:0}
      .import-action button{padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-dim);transition:background .15s}
      .import-action button.active-add{border-color:var(--success);color:var(--success);background:rgba(0,168,84,.1)}
      .import-action button.active{border-color:var(--accent);color:var(--accent);background:rgba(81,203,238,.1)}
      .import-action button.active-skip{border-color:#ff9800;color:#ff9800;background:rgba(255,152,0,.1)}
      .import-actions{display:flex;gap:10px}
      .import-actions .btn-reset{flex:0}
      .import-actions .btn-confirm{flex:1}
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="importModalBg">
        <div class="import-modal">
		  <div class="modal-header">
          <h2>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
			匯入站台卡片資料
          </h2>
		  <button class="close-btn" id="importCloseBtn">✕</button>
		  </div>
          <div class="modal-hint">選擇 JSON 檔案或拖曳至下方區域</div>
          <div class="import-drop" id="importDrop">📁 點擊選擇檔案 或 拖曳 JSON 至此</div>
          <input type="file" id="importFileInput" accept=".json" style="display:none">
          <div class="import-analysis" id="importAnalysis"></div>
          <label id="importChatRow" style="display:none;align-items:center;gap:8px;font-size:13px;color:var(--text-dim)"><input type="checkbox" id="importChatChk" checked> 一併匯入 Chat 環境設定（同名設定覆蓋、其餘新增）及自動時間戳偏好</label>
          <div class="import-actions">
            <button class="btn-reset" id="importCancelBtn">取消</button>
            <button class="btn-confirm" id="importConfirmBtn" disabled>確認匯入</button>
          </div>
        </div>
      </div>
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

    function showImportModal() {
      importPendingData = null;
      pendingChat = null;
      document.getElementById('importChatRow').style.display = 'none';
      dupActions = {};
      analysisDiv.style.display = 'none';
      analysisDiv.innerHTML = '';
      confirmBtn.disabled = true;
      importDrop.textContent = '📁 點擊選擇檔案 或 拖曳 JSON 至此';
      importDrop.style.display = '';
      importModalBg.classList.add('open');
    }

    function hideImportModal() {
      importModalBg.classList.remove('open');
      importPendingData = null;
      pendingChat = null;
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
          } else if (parsed && parsed.format === 'card-backup-v2' && Array.isArray(parsed.cards)) {
            items = parsed.cards;
            if (parsed.chat != null) {
              const env = parsed.chat.environments;
              if (env != null && (!Array.isArray(env.profiles) || !env.profiles.every(p => p && typeof p.id === 'string' && typeof p.label === 'string' && typeof p.url === 'string' && typeof p.clientid === 'string' && typeof p.key === 'string'))) {
                throw new Error('Chat 環境設定格式不正確');
              }
              pendingChat = parsed.chat;
            }
          } else if (parsed.themes && parsed.favorites) {
            showImportError('這是「書籤我的最愛」格式，無法匯入至站台卡片。\n\n請在書籤頁面使用匯入功能。');
            return;
          } else {
            showImportError('JSON 格式不正確：頂層結構應為陣列。\n\n請確認是由本工具匯出的站台 JSON 檔。');
            return;
          }
          const valid = items.every(it => it.title && it.itemlist);
          if (!valid || (items.length === 0 && !pendingChat)) {
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
          g.item.forEach(it => { if (it.modal) modules.add(it.modal); });
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
        item.itemlist.forEach(g => { g.item.forEach(it => { if (it.modal) cardModals.add(it.modal); }); });
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
      confirmBtn.disabled = items.length === 0 && !pendingChat;
    }

    function confirmImport() {
      if (!importPendingData) return;

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
        saveData();
        if (addedCount > 0) {
          const newLen = data.length;
          for (let i = currentOrder.length + 1; i <= newLen; i++) {
            currentOrder.push(i);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));
        }
        renderGrid();
      }

      let chatCount = 0;
      if (pendingChat && document.getElementById('importChatChk').checked) {
        try {
          const incoming = pendingChat.environments;
          if (incoming && incoming.profiles.length) {
            const key = 'chat_environment_profiles_v1';
            let existing = { profiles: [], selectedId: '' };
            try {
              const old = JSON.parse(localStorage.getItem(key));
              if (old && Array.isArray(old.profiles)) existing = old;
            } catch (_) {}
            const merged = existing.profiles.map(p => ({...p}));
            for (const p of incoming.profiles) {
              const idx = merged.findIndex(x => x.label === p.label || x.id === p.id);
              if (idx >= 0) merged[idx] = { ...p, id: merged[idx].id };
              else merged.push({...p});
              chatCount++;
            }
            const selected = incoming.profiles.find(p => p.id === incoming.selectedId);
            const selectedMerged = selected && merged.find(p => p.label === selected.label);
            localStorage.setItem(key, JSON.stringify({ profiles: merged, selectedId: selectedMerged?.id || existing.selectedId || merged[0]?.id || '' }));
          }
          if (typeof pendingChat.autoTimestamp === 'boolean') localStorage.setItem('chat_auto_timestamp', String(pendingChat.autoTimestamp));
        } catch (e) { showToast('卡片已處理，但 Chat 設定匯入失敗：' + e.message); return; }
      }
      const chatImported = pendingChat && document.getElementById('importChatChk').checked;
      hideImportModal();
      const parts = [];
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
    confirmBtn.addEventListener('click', confirmImport);

    window.showImportModal = showImportModal;
    window.hideImportModal = hideImportModal;
    window.confirmImport = confirmImport;
    this.open = showImportModal;

    // ── Full-page drop zone overlay ──
    const dropOverlay = document.createElement('div');
    dropOverlay.id = 'cardImportDropOverlay';
    dropOverlay.innerHTML = '<div class="card-drop-overlay-inner">📁 放開以匯入站台 JSON</div>';
    document.body.appendChild(dropOverlay);

    let dragCounter = 0;
    function shouldHandleDrop() {
      if (window.viewMode !== 'card') return false;
      if (importModalBg.classList.contains('open')) return false;
      return true;
    }
    document.addEventListener('dragenter', function(e) {
      if (!shouldHandleDrop()) return;
      dragCounter++;
      dropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function(e) {
      if (!shouldHandleDrop() && dragCounter === 0) return;
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('active'); }
    });
    document.addEventListener('dragover', function(e) {
      if (!shouldHandleDrop()) return;
      e.preventDefault();
    });
    document.addEventListener('drop', function(e) {
      dragCounter = 0;
      dropOverlay.classList.remove('active');
      if (!shouldHandleDrop()) return;
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      e.preventDefault();
      showImportModal();
      handleImportFile(file);
    });
  }
});
