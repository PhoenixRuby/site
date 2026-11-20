registerPlugin('network', {
  main: true,
  menuOrder: 5,
  label: 'Network',
  menuIcon: 'network', 
  icon: 'add',
  mode: 'network',
  order: 1,
  favicon: function(canvas, ctx) {
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffd100'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(16, 16); ctx.lineTo(8, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 24); ctx.lineTo(24, 24); ctx.stroke();
  },
  open: null,
  render: null,
  storageKeys: ['requestCollector_ps', 'requestCollector_bash'],
  loadData(key) {
    return AppStorage.load(this.storageKeys, key) || [];
  },
  saveData(arr, key) {
    AppStorage.save(this.storageKeys, arr, key);
  },
  getDataCount(key) {
    return this.loadData(key).length;
  },
  load() {
	const subCssList = ['network', 'network-help'];
	const subPlugins = ['network-help'];
	
	// 1. 並行（Parallel）載入所有子插件所需的 CSS 樣式表
	const cssPromise = Promise.all(
	  subCssList.map(name => loadPluginCss(name))
	);

    // 2. 並行（Parallel）下載所有子插件的 JavaScript 腳本
    const pluginsPromise = Promise.all(
      subPlugins.map(name => loadPluginScript(name))
    );

    // 3. 當所有樣式與腳本皆載入完成後，啟動初始化流程
    return Promise.all([cssPromise, pluginsPromise]).then(() => {
      
      // 4. 遍歷並自動執行各個子插件的生命週期 load 函式
      subPlugins.forEach(name => {
        const sub = window.plugins[name];
        if (sub && typeof sub.load === 'function') {
          sub.load();
        }
      });

      // 5. 觸發核心內容載入
      this.init(); 
    });
  },
  
  init(){
	var self = this;
    /* ── 2. HTML ─────────────────────────────────────────────── */
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <!-- Main content (rendered into wrapper) -->
      <div id="ncContent" data-plugin-content style="display:none;font-family:Consolas,'Microsoft JhengHei',monospace;color:var(--text);flex-direction:column;gap:18px;width:100%">
          <div id="ncPrompt" class="nc-prompt">
            <div class="nc-prompt-icon">${resolveIcon("network", '#38bdf8', 64)}</div>
            <div>尚無請求資料</div>
            <div style="font-size:12px;margin-top:4px">按 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">Ctrl</kbd> + <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">V</kbd> 貼上請求，或點 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">?</kbd> 查看複製教學</div>
          </div>

          <div class="nc-panel_body">
          <div class="nc-panel" id="ncPsPanel">
            <div class="nc-panel-title">
              PowerShell
              <span class="nc-count" id="ncPsCount">0</span>
            </div>
            <div class="nc-list" id="ncPsList"></div>
            <div class="nc-panel-actions">
              <button class="nc-btn nc-btn-copy"  id="ncPsCopy">複製全部</button>
              <button class="nc-btn nc-btn-clear" id="ncPsClear">清除全部</button>
            </div>
          </div>

          <div class="nc-panel" id="ncBashPanel">
            <div class="nc-panel-title">
              Bash / cURL
              <span class="nc-count" id="ncBashCount">0</span>
            </div>
            <div class="nc-list" id="ncBashList"></div>
            <div class="nc-panel-actions">
              <button class="nc-btn nc-btn-copy"  id="ncBashCopy">複製全部</button>
              <button class="nc-btn nc-btn-clear" id="ncBashClear">清除全部</button>
            </div>
          </div>
          </div>
      </div>

      <dialog id="ncAddBg" class="app-dialog" aria-labelledby="ncAddTitle">
        <div class="app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('network')}</span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title" id="ncAddTitle">新增請求</h2>
              <p class="app-modal-header-subtitle">輸入或貼上從 Chrome Network 複製的 PowerShell 或 cURL 請求。</p>
            </div>
            <button type="button" class="app-modal-header-close" id="ncAddClose" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body">
            <textarea id="ncAddText" rows="8" aria-label="請求內容" autofocus></textarea>
            <p id="ncAddError" role="alert" hidden>無法識別格式，請輸入 PowerShell 或 cURL 請求。</p>
          </div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" id="ncAddCancel">取消</button>
            <button type="button" class="btn-confirm" id="ncAddSave" disabled>新增</button>
          </footer>
        </div>
      </dialog>

      <dialog id="ncEditBg" class="app-dialog" aria-labelledby="ncEditTitle">
        <div class="app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('network')}</span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title" id="ncEditTitle">編輯請求</h2>
              <p class="app-modal-header-subtitle">修改指令內容後，按「儲存修改」。</p>
            </div>
            <button type="button" class="app-modal-header-close" id="ncEditCloseBtn" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body"><textarea id="ncEditText" rows="12" aria-label="請求內容" autofocus></textarea></div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" id="ncEditCancel">取消</button>
            <button type="button" class="btn-reset" id="ncEditDelete">刪除此筆</button>
            <button type="button" class="btn-confirm" id="ncEditSave">儲存修改</button>
          </footer>
        </div>
      </dialog>

      <dialog id="ncConfirmBg" class="app-dialog" aria-labelledby="ncConfirmTitle" aria-describedby="ncConfirmText">
        <div class="app-dialog-panel-medium nc-confirm-panel">
          <header class="app-modal-header">
            <div class="app-modal-header-info"><h2 class="app-modal-header-title" id="ncConfirmTitle">確認</h2></div>
            <button type="button" class="app-modal-header-close" id="ncConfirmClose" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body"><p id="ncConfirmText"></p></div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" id="ncConfirmCancel" autofocus>取消</button>
            <button type="button" class="btn-confirm" id="ncConfirmOk">確定</button>
          </footer>
        </div>
      </dialog>

      <!-- Toast -->
      <div class="nc-toast" id="ncToast">
        <span id="ncToastIcon"></span>
        <span id="ncToastMsg"></span>
      </div>
    `;
    document.body.appendChild(wrap);

    /* ── 3. State ────────────────────────────────────────────── */
    let psList   = self.loadData('requestCollector_ps');   
    let bashList = self.loadData('requestCollector_bash'); 

    let currentType      = '';
    let currentEditIndex = -1;
    let actionType       = '';
    let clearTarget      = '';
    let toastTimer       = null;

    /* ── 4. Helpers ─────────────────────────────────────────── */
    function saveToStorage(type) {
      if (type === 'ps') {
        self.saveData(psList, 'requestCollector_ps');
      } else if (type === 'bash') {
        self.saveData(bashList, 'requestCollector_bash');
      } else {
        // 如果沒指定，才兩組一起存（相容舊邏輯）
        self.saveData(psList, 'requestCollector_ps');
        self.saveData(bashList, 'requestCollector_bash');
      }
    }

    function detectMethod(cmd) {
      const psMatch = cmd.match(/-Method\s+['"]?(\w+)['"]?/i);
      if (psMatch) return psMatch[1].toUpperCase();
      const curlX = cmd.match(/(?:-X|--request)\s+['"]?(\w+)['"]?/i);
      if (curlX) return curlX[1].toUpperCase();
      if (/\s(?:--data(?:-raw|-urlencode|-binary)?|-d)\s/i.test(cmd)) return 'POST';
      if (cmd.trimStart().startsWith('curl')) return 'GET';
      if (/Invoke-WebRequest/i.test(cmd)) return 'GET';
      return null;
    }

    function methodBadgeHTML(method) {
      const known = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'];
      const label  = known.includes(method) ? method : (method || '???');
      const display = label === 'OPTIONS' ? 'OPTS' : label;
      const cls = known.includes(method)
        ? `nc-${method === 'OPTIONS' ? 'OPTS' : method}`
        : 'nc-UNK';
      return `<span class="nc-badge ${cls}">${display}</span>`;
    }

    function showToast(theme, icon, message) {
      const toast = document.getElementById('ncToast');
      document.getElementById('ncToastIcon').textContent = icon;
      document.getElementById('ncToastMsg').textContent  = message;
      toast.className = `nc-toast open t-${theme}`;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.classList.remove('open'); }, 2200);
    }

    function cleanPowerShell(text) {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Invoke-WebRequest -UseBasicParsing -Uri')) {
          return lines.slice(i).join('\n').trim().replace(/;+$/, '');
        }
      }
      return null;
    }

    /* ── 5. Render ──────────────────────────────────────────── */
    function renderList(type) {
      const listEl  = document.getElementById(type === 'ps' ? 'ncPsList'  : 'ncBashList');
      const panel   = document.getElementById(type === 'ps' ? 'ncPsPanel' : 'ncBashPanel');
      const countEl = document.getElementById(type === 'ps' ? 'ncPsCount' : 'ncBashCount');
      const arr     = type === 'ps' ? psList : bashList;

      countEl.textContent = arr.length;
      panel.style.display = arr.length > 0 ? 'block' : 'none';

      const hasData = psList.length > 0 || bashList.length > 0;
      document.getElementById('ncPrompt').style.display = hasData ? 'none' : '';

      listEl.innerHTML = '';
      arr.forEach((cmd, i) => {
        const method    = detectMethod(cmd);
        const firstLine = cmd.split('\n')[0];
        const div       = document.createElement('div');
        div.className   = `nc-item${type === 'ps' ? ' ps-item' : ''}`;
        div.title       = '點擊查看完整內容並編輯';
        div.innerHTML   = methodBadgeHTML(method) +
          `<span class="nc-item-text">${AppUtils.escHtml(firstLine)}</span>`;
        div.onclick     = () => openEditModal(type, i);
        listEl.appendChild(div);
      });
    }

    function renderAll() {
      renderList('ps');
      renderList('bash');
    }

    /* ── 6. Paste handler ───────────────────────────────────── */
    function splitAndProcess(text, source = '貼上') {
      const psRegex   = /(?=Invoke-WebRequest)/gi;
      const curlRegex = /(?=curl ')/gi;

      if (text.includes('Invoke-WebRequest')) {
        const items = text.split(psRegex)
          .filter(item => item.trim().includes('Invoke-WebRequest'));
        let added = 0;
        items.forEach(item => {
          const cleaned = cleanPowerShell(item);
          if (cleaned && !psList.includes(cleaned)) { psList.push(cleaned); added++; }
        });
        saveToStorage(); renderList('ps');
        showToast(added > 0 ? 'ps' : 'info', added > 0 ? '📋' : 'ℹ️',
          added > 0 ? `${source} ${added} 筆 PowerShell 請求` : 'PowerShell 請求已存在');
      }
      else if (text.includes('curl ')) {
        const items = text.split(curlRegex)
          .filter(item => item.trim().startsWith("curl '"));
        let added = 0;
        items.forEach(item => {
          const trimmed = item.trim().replace(/\s*&&\s*$/, ''); // 去掉結尾的 &&
          if (trimmed && !bashList.includes(trimmed)) { bashList.push(trimmed); added++; }
        });
        saveToStorage(); renderList('bash');
        showToast(added > 0 ? 'bash' : 'info', added > 0 ? '📋' : 'ℹ️',
          added > 0 ? `${source} ${added} 筆 Bash / cURL 請求` : 'cURL 請求已存在');
      }
      else {
        if (source === '貼上') showToast('info', '⚠️', '無法識別格式');
        return false;
      }
      return true;
    }

    const addDialog = document.getElementById('ncAddBg');
    const addText = document.getElementById('ncAddText');
    const addError = document.getElementById('ncAddError');
    const addSave = document.getElementById('ncAddSave');
    function closeAdd() { ModalManager.closeDialog(addDialog); }
    this.open = () => {
      if (addDialog.open) return;
      addText.value = '';
      addError.hidden = true;
      addSave.disabled = true;
      ModalManager.showDialog(addDialog, closeAdd);
    };
    document.getElementById('ncAddClose').addEventListener('click', closeAdd);
    document.getElementById('ncAddCancel').addEventListener('click', closeAdd);
    addDialog.addEventListener('click', e => { if (e.target === addDialog) closeAdd(); });
    addText.addEventListener('input', () => {
      addError.hidden = true;
      addSave.disabled = !addText.value.trim();
    });
    addSave.addEventListener('click', () => {
      if (splitAndProcess(addText.value.trim(), '新增')) closeAdd();
      else addError.hidden = false;
    });

    /* ── 7. Edit modal ──────────────────────────────────────── */
    function openEditModal(type, index) {
      currentType      = type;
      currentEditIndex = index;
      const arr = type === 'ps' ? psList : bashList;
      document.getElementById('ncEditTitle').textContent =
        type === 'ps' ? '編輯 PowerShell 指令' : '編輯 cURL 指令';
      document.getElementById('ncEditText').value = arr[index];
      ModalManager.showDialog(document.getElementById('ncEditBg'), closeEditModal);
    }

    function closeEditModal() {
      ModalManager.closeDialog(document.getElementById('ncEditBg'));
    }

    document.getElementById('ncEditSave').onclick = () => {
      const newText = document.getElementById('ncEditText').value.trim();
      if (newText) {
        (currentType === 'ps' ? psList : bashList)[currentEditIndex] = newText;
        saveToStorage(); renderList(currentType);
      }
      closeEditModal();
    };

    document.getElementById('ncEditDelete').onclick = () => {
      actionType = 'delete';
      const label = currentType === 'ps' ? 'PowerShell' : 'Bash / cURL';
      document.getElementById('ncConfirmTitle').textContent = '刪除確認';
      document.getElementById('ncConfirmText').innerHTML =
        `確定要刪除此筆 <strong>${label}</strong> 指令嗎？`;
      ModalManager.showDialog(document.getElementById('ncConfirmBg'), closeConfirm);
    };

    document.getElementById('ncEditCloseBtn').onclick = closeEditModal;
    document.getElementById('ncEditCancel').onclick = closeEditModal;
    document.getElementById('ncEditBg').addEventListener('click', e => {
      if (e.target === document.getElementById('ncEditBg')) closeEditModal();
    });

    /* ── Help moved to network-help.js ─────────────────────── */

    /* ── 8. Confirm modal ───────────────────────────────────── */
    function closeConfirm() {
      ModalManager.closeDialog(document.getElementById('ncConfirmBg'));
    }

    document.getElementById('ncConfirmCancel').onclick = closeConfirm;
    document.getElementById('ncConfirmClose').onclick = closeConfirm;
    document.getElementById('ncConfirmBg').addEventListener('click', e => {
      if (e.target === document.getElementById('ncConfirmBg')) closeConfirm();
    });

    document.getElementById('ncConfirmOk').onclick = () => {
      if (actionType === 'delete') {
        const label = currentType === 'ps' ? 'PowerShell' : 'Bash / cURL';
        (currentType === 'ps' ? psList : bashList).splice(currentEditIndex, 1);
        saveToStorage(); renderList(currentType); closeConfirm(); closeEditModal();
        showToast('del', '🗑️', `已刪除 1 筆 ${label} 指令`);
        return;
      }
      else if (actionType === 'clear') {
        const label = clearTarget === 'ps' ? 'PowerShell' : 'Bash / cURL';
        const count = (clearTarget === 'ps' ? psList : bashList).length;
        if (clearTarget === 'ps') psList = []; else bashList = [];
        saveToStorage(); renderList(clearTarget);
        showToast('del', '🗑️', `已清除全部 ${count} 筆 ${label} 指令`);
      }
      closeConfirm();
    };

    /* ── 9. Panel buttons ───────────────────────────────────── */
    function copyPanel(type) {
	  const arr   = type === 'ps' ? psList : bashList;
	  const label = type === 'ps' ? 'PowerShell' : 'Bash / cURL';
	  if (!arr.length) return;

	  const separator = type === 'ps' ? '; ' : ' && ';
	  const text = arr.join(separator);

	  navigator.clipboard.writeText(text).then(() => {
		showToast(type, '📄', `已複製 ${arr.length} 筆 ${label} 指令`);
	  });
	}

    function showClearConfirm(type) {
      actionType  = 'clear';
      clearTarget = type;
      const label = type === 'ps' ? 'PowerShell' : 'cURL';
      document.getElementById('ncConfirmTitle').textContent = '清除確認';
      document.getElementById('ncConfirmText').innerHTML =
        `確定要清除全部 <strong>${label}</strong> 指令嗎？`;
      ModalManager.showDialog(document.getElementById('ncConfirmBg'), closeConfirm);
    }

    document.getElementById('ncPsCopy').onclick   = () => copyPanel('ps');
    document.getElementById('ncPsClear').onclick  = () => showClearConfirm('ps');
    document.getElementById('ncBashCopy').onclick  = () => copyPanel('bash');
    document.getElementById('ncBashClear').onclick = () => showClearConfirm('bash');

    /* ── 11. Global paste ───────────────────────────────────── */
    document.addEventListener('paste', e => {
      if (window.viewMode !== 'network') return;
      if (document.querySelector('dialog:modal')) return;
      const text = e.clipboardData.getData('text/plain').trim();
      if (text) splitAndProcess(text);
    });

    /* ── 12. Full-page render ──────────────────────────────── */
    var ncContentEl = document.getElementById('ncContent');
    this.render = (wrapper) => {
      psList = self.loadData('requestCollector_ps');
      bashList = self.loadData('requestCollector_bash');
      renderAll();
      ncContentEl.style.display = 'flex';
      wrapper.appendChild(ncContentEl);
      self.guestDiff?.syncVisibility();
    };
    self.guestDiff = GuestDiffCollection.create({ mode: 'network', reload: () => self.render(document.getElementById('app-content')),
      renderTile(target, { key, item }) {
        const title = document.createElement('h3'); title.textContent = (key.endsWith('_ps') ? 'PowerShell' : 'Bash / cURL') + ' · ' + (detectMethod(item) || '請求');
        const command = document.createElement('p'); command.textContent = item.split('\n')[0].slice(0, 160); target.append(title, command);
      },
      renderDetail(target, { key, item }, update) {
        const kind = document.createElement('p'); kind.textContent = (key.endsWith('_ps') ? 'PowerShell' : 'Bash / cURL') + ' · ' + (detectMethod(item) || '請求');
        const pre = document.createElement('pre'), code = document.createElement('code'); code.textContent = item;
        code.className = 'language-' + (key.endsWith('_ps') ? 'powershell' : 'bash'); pre.append(code);
        target.classList.add('guest-diff-native-content'); target.append(kind, pre);
        library('hljs').then(() => { if (target.contains(code)) { hljs.highlightElement(code); update?.(); } }).catch(() => {});
      }
    });
  }
});
