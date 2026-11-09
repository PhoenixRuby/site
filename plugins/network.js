registerPlugin('network', {
  main: true,
  menuOrder: 5,
  label: 'Network',
  favicon: function(canvas, ctx) {
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffd100'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(16, 16); ctx.lineTo(8, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 24); ctx.lineTo(24, 24); ctx.stroke();
  },
menuIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" height="28" width="28">
  <path d="M4.887 20h11.868c0.893 0 1.664 -0.665 1.847 -1.592l2.358 -12c0.212 -1.081 -0.442 -2.14 -1.462 -2.366A1.784 1.784 0 0 0 19.113 4H7.245c-0.893 0 -1.664 0.665 -1.847 1.592l-2.358 12c-0.212 1.081 0.442 2.14 1.462 2.366 0.127 0.028 0.256 0.042 0.385 0.042z" stroke-width="1"></path>
  <path d="m9 8 4 4 -6 4" stroke-width="1"></path>
  <path d="M12 16h3" stroke-width="1"></path>
</svg>`,
  icon: null,
  mode: 'network',
  order: 11,
  open: null,

  init() {
    /* ── 1. CSS ─────────────────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
      /* ── Modal overlay ── */
      .nc-modal-bg {
        position: fixed;
        inset: 0;
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity .3s;
        z-index: 200;
      }
      .nc-modal-bg.open {
        opacity: 1;
        pointer-events: all;
      }
      .nc-modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 28px;
        width: min(1000px, 95vw);
        max-height: 90vh;
        overflow-y: auto;
        transform: translateY(20px) scale(.97);
        transition: transform .35s cubic-bezier(.22,1,.36,1);
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 18px;
        font-family: Consolas, 'Microsoft JhengHei', monospace;
        color: var(--text);
        box-sizing: border-box;
		scrollbar-width: thin;
		scrollbar-color: #555 #1e1e1e;
      }
      .nc-modal-bg.open .nc-modal {
        transform: translateY(0) scale(1);
      }

      /* ── Modal header ── */
      .nc-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
      }
      .nc-modal-title {
        gap: 10px;
      }

      /* ── Prompt / empty state ── */
      .nc-prompt {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-dim);
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .nc-prompt-icon {
        margin-bottom: 12px;
        color: var(--text-dim);
        opacity: .5;
      }
      .nc-prompt-icon svg {
        width: 48px;
        height: 48px;
      }
      .nc-prompt strong {
        color: var(--text);
      }

      /* ── Panels ── */
	  .nc-panel_body{
    	display: flex;
		flex-direction: column;
		gap: 18px;
		overflow-y: auto;
        box-sizing: border-box;
		scrollbar-width: thin;
		scrollbar-color: #555 #1e1e1e;
	  }
      .nc-panel {
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 14px;
        display: none;
      }
      .nc-panel-title {
        font-size: .95rem;
        font-weight: bold;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nc-count {
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-dim);
        padding: 1px 7px;
        border-radius: 5px;
        font-size: .75rem;
      }

      /* ── Request list ── */
      .nc-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        min-height: 60px;
        max-height: 240px;
        overflow-y: auto;
        background: var(--surface);
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 10px;
      }
      .nc-item {
        background: var(--surface2);
        padding: 8px 11px;
        border-radius: 6px;
        cursor: pointer;
        flex: 1 1 200px;
        min-width: 0;
        max-width: calc(25% - 6px);
        border-left: 4px solid #0a0;
        font-size: 13px;
        height: 38px;
        display: flex;
        align-items: center;
        gap: 7px;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        transition: opacity .15s;
      }
      .nc-item:hover { opacity: .8; }
      @media (max-width: 900px) { .nc-item { max-width: calc(33.33% - 6px); } }
      @media (max-width: 640px) { .nc-item { max-width: calc(50% - 4px); } }
      @media (max-width: 420px) { .nc-item { max-width: 100%; } }
      .nc-item.ps-item { border-left-color: #00aaff; }
      .nc-item-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
        flex: 1;
        min-width: 0;
        font-size: 12px;
        color: var(--text-dim);
      }
      .nc-item::after {
        content: '';
        position: absolute;
        right: 0; top: 0;
        width: 40px; height: 100%;
        background: linear-gradient(to right, transparent, var(--surface2) 80%);
        pointer-events: none;
      }

      /* ── Method badges ── */
      .nc-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .4px;
        padding: 2px 5px;
        border-radius: 3px;
        flex-shrink: 0;
        min-width: 34px;
        text-align: center;
      }
      .nc-GET    { background:#1a4a1a; color:#4caf50; border:1px solid #2d7a2d; }
      .nc-POST   { background:#1a3a4a; color:#42a5f5; border:1px solid #1565c0; }
      .nc-PUT    { background:#3a2a00; color:#ffb300; border:1px solid #e65100; }
      .nc-PATCH  { background:#2a1a3a; color:#ce93d8; border:1px solid #6a1b9a; }
      .nc-DELETE { background:#3a1a1a; color:#ef5350; border:1px solid #b71c1c; }
      .nc-HEAD   { background:#2a2a2a; color:#90a4ae; border:1px solid #546e7a; }
      .nc-OPTS   { background:#2a2a1a; color:#fff176; border:1px solid #f9a825; }
      .nc-UNK    { background:#2a2a2a; color:#888;    border:1px solid #444; }

      /* ── Panel actions ── */
      .nc-panel-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .nc-btn {
        padding: 7px 13px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: .8rem;
        font-family: inherit;
        transition: opacity .15s;
      }
      .nc-btn:hover { opacity: .82; }
      .nc-btn-copy  { background: #0a7a0a; color: #fff; }
      .nc-btn-clear { background: #a02020; color: #fff; }

      /* ── Edit sub-modal ── */
      .nc-sub-modal-bg {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 300;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s;
      }
      .nc-sub-modal-bg.open {
        opacity: 1;
        pointer-events: all;
      }
      .nc-sub-modal {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 22px;
        width: min(760px, 92vw);
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 14px;
        font-family: Consolas, monospace;
        transform: scale(.96);
        transition: transform .3s cubic-bezier(.22,1,.36,1);
      }
      .nc-sub-modal-bg.open .nc-sub-modal {
        transform: scale(1);
      }
      .nc-sub-modal h3 {
        margin: 0;
        font-size: .95rem;
        color: var(--text);
      }
      .nc-sub-modal textarea {
        width: 100%;
		max-width: 100% !important;
        height: 300px;
        background: var(--surface2);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 12px;
        font-family: inherit;
        font-size: .82rem;
        resize: vertical;
        box-sizing: border-box;
      }
      .nc-sub-modal-actions {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }

      /* ── Confirm sub-modal ── */
      .nc-confirm-bg {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 400;
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s;
      }
      .nc-confirm-bg.open {
        opacity: 1;
        pointer-events: all;
      }
      .nc-confirm-box {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px 28px;
        width: min(400px, 92vw);
        text-align: center;
        font-family: Consolas, monospace;
        display: flex;
        flex-direction: column;
        gap: 14px;
        transform: scale(.95);
        transition: transform .25s cubic-bezier(.22,1,.36,1);
      }
      .nc-confirm-bg.open .nc-confirm-box { transform: scale(1); }
      .nc-confirm-box h3 { margin: 0; font-size: .95rem; color: var(--text); }
      .nc-confirm-box p  { margin: 0; font-size: .85rem; color: var(--text-dim); }
      .nc-confirm-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 6px;
      }

      /* ── Toast ── */
      .nc-toast {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        color: #fff;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: .85rem;
        box-shadow: 0 4px 18px rgba(0,0,0,.6);
        display: none;
        align-items: center;
        gap: 8px;
        border-left: 4px solid transparent;
        white-space: nowrap;
        z-index: 500;
        font-family: Consolas, monospace;
      }
      .nc-toast.open { display: flex; }
      .nc-toast.t-ps   { background: #1a2e3d; border-left-color: #00aaff; }
      .nc-toast.t-bash { background: #1a2e1a; border-left-color: #00cc44; }
      .nc-toast.t-del  { background: #3a1a1a; border-left-color: #ef5350; }
      .nc-toast.t-info { background: #2a2a2a; border-left-color: #888; }

      /* Help CSS moved to network-help.js */
    `;
    document.head.appendChild(style);

    /* ── 2. HTML ─────────────────────────────────────────────── */
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <!-- Main content (rendered into wrapper) -->
      <div id="ncContent" data-plugin-content style="display:none;font-family:Consolas,'Microsoft JhengHei',monospace;color:var(--text);flex-direction:column;gap:18px;width:100%">
          <div id="ncPrompt" class="nc-prompt">
            <div class="nc-prompt-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="48" height="48"><path d="M4.887 20h11.868c0.893 0 1.664 -0.665 1.847 -1.592l2.358 -12c0.212 -1.081 -0.442 -2.14 -1.462 -2.366A1.784 1.784 0 0 0 19.113 4H7.245c-0.893 0 -1.664 0.665 -1.847 1.592l-2.358 12c-0.212 1.081 0.442 2.14 1.462 2.366 0.127 0.028 0.256 0.042 0.385 0.042z" stroke-width="1"></path><path d="m9 8 4 4 -6 4" stroke-width="1"></path><path d="M12 16h3" stroke-width="1"></path></svg></div>
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

      <!-- Edit sub-modal -->
      <div class="nc-sub-modal-bg" id="ncEditBg">
        <div class="nc-sub-modal">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
			<h2 class="nc-modal-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" id="Brand-Powershell--Streamline-Tabler" height="28" width="28">
  <desc>
    Brand Powershell Streamline Icon
  </desc>
  <path d="M4.887 20h11.868c0.893 0 1.664 -0.665 1.847 -1.592l2.358 -12c0.212 -1.081 -0.442 -2.14 -1.462 -2.366A1.784 1.784 0 0 0 19.113 4H7.245c-0.893 0 -1.664 0.665 -1.847 1.592l-2.358 12c-0.212 1.081 0.442 2.14 1.462 2.366 0.127 0.028 0.256 0.042 0.385 0.042z" stroke-width="2"></path>
  <path d="m9 8 4 4 -6 4" stroke-width="2"></path>
  <path d="M12 16h3" stroke-width="2"></path>
</svg>
              <span id="ncEditTitle" style="margin:0;">Chrome Network 請求收集器</span>
            </h2>
            <button class="close-btn" id="ncEditCloseBtn">✕</button>
          </div>
          <textarea id="ncEditText"></textarea>
          <div class="nc-sub-modal-actions">
            <button class="nc-btn nc-btn-clear" id="ncEditDelete">刪除此筆</button>
            <button class="nc-btn nc-btn-copy"  id="ncEditSave">儲存修改</button>
          </div>
        </div>
      </div>

      <!-- Confirm sub-modal -->
      <div class="nc-confirm-bg" id="ncConfirmBg">
        <div class="nc-confirm-box">
          <h2 id="ncConfirmTitle">確認</h2>
          <p  id="ncConfirmText"></p>
          <div class="nc-confirm-actions">
            <button class="nc-btn" id="ncConfirmCancel" style="border:1px solid var(--border);background:transparent;color:var(--text-dim);">取消</button>
            <button class="nc-btn nc-btn-clear" id="ncConfirmOk">確定</button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div class="nc-toast" id="ncToast">
        <span id="ncToastIcon"></span>
        <span id="ncToastMsg"></span>
      </div>

      <!-- Help popup moved to network-help.js -->
      <!--
        <div class="nc-help-modal">
          <div class="nc-help-modal-header">
            <h2 class="nc-help-modal-title">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" id="Brand-Powershell--Streamline-Tabler" height="28" width="28">
  <desc>
    Brand Powershell Streamline Icon
  </desc>
  <path d="M4.887 20h11.868c0.893 0 1.664 -0.665 1.847 -1.592l2.358 -12c0.212 -1.081 -0.442 -2.14 -1.462 -2.366A1.784 1.784 0 0 0 19.113 4H7.245c-0.893 0 -1.664 0.665 -1.847 1.592l-2.358 12c-0.212 1.081 0.442 2.14 1.462 2.366 0.127 0.028 0.256 0.042 0.385 0.042z" stroke-width="2"></path>
  <path d="m9 8 4 4 -6 4" stroke-width="2"></path>
  <path d="M12 16h3" stroke-width="2"></path>
</svg>
			Chrome Network 複製教學</h2>
            <button class="close-btn" id="ncHelpCloseBtn">✕</button>
          </div>
		  <div class="nc-shortcut-body">
          <div class="nc-shortcut-box">
            Windows：<kbd>F12</kbd> 或 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>i</kbd><br><br>
            Mac：<kbd>⌥</kbd>+<kbd>⌘</kbd>+<kbd>I</kbd><br><br>
            <span class="nc-warn">有些網站會鎖定 F12，建議直接使用 Ctrl + Shift + i</span>
          </div>
          <div class="nc-help-grid">
            <div class="nc-help-card">
              <div class="nc-help-card-header">Copy as PowerShell</div>
              <div class="nc-help-card-body">
                <div class="nc-fake-devtools">
                  <div class="nc-fake-tabs">
                    <span>Elements</span><span>Console</span>
                    <span class="active">Network</span><span>Sources</span>
                  </div>
                  <div class="nc-fake-row">
                    <span class="nc-req-method post">POST</span>
                    <span class="nc-req-url">/api/login</span>
                    <span class="nc-req-status">200</span>
                  </div>
                  <div class="nc-ctx-menu level-1">
                    <div>Open in new tab</div><div>Copy link address</div>
                    <div>Save all as HAR</div>
                    <div class="nc-submenu-trigger">Copy <span>▶</span></div>
                  </div>
                  <div class="nc-ctx-menu level-2">
                    <div>Copy URL</div><div>Copy request headers</div>
                    <div>Copy response</div>
                    <div class="nc-ctx-highlight">Copy as PowerShell</div>
                  </div>
                </div>
                <div class="nc-help-steps">
                  <ol>
                    <li>開啟 DevTools</li>
                    <li>切換到 <strong>Network</strong></li>
                    <li>重新操作 API / 頁面</li>
                    <li>對 Request 按右鍵，選擇：</li>
                  </ol>
                  <pre>Copy → Copy as PowerShell</pre>
                </div>
              </div>
            </div>
            <div class="nc-help-card">
              <div class="nc-help-card-header">Copy as cURL (bash)</div>
              <div class="nc-help-card-body">
                <div class="nc-fake-devtools">
                  <div class="nc-fake-tabs">
                    <span>Elements</span><span>Console</span>
                    <span class="active">Network</span><span>Sources</span>
                  </div>
                  <div class="nc-fake-row">
                    <span class="nc-req-method get">GET</span>
                    <span class="nc-req-url">/api/user/list</span>
                    <span class="nc-req-status">200</span>
                  </div>
                  <div class="nc-ctx-menu level-1">
                    <div>Open in new tab</div><div>Copy link address</div>
                    <div>Save all as HAR</div>
                    <div class="nc-submenu-trigger">Copy <span>▶</span></div>
                  </div>
                  <div class="nc-ctx-menu level-2">
                    <div>Copy URL</div><div>Copy request headers</div>
                    <div>Copy response</div>
                    <div class="nc-ctx-highlight">Copy as cURL (bash)</div>
                  </div>
                </div>
                <div class="nc-help-steps">
                  <ol>
                    <li>開啟 DevTools</li>
                    <li>切換到 <strong>Network</strong></li>
                    <li>對 Request 按右鍵，選擇：</li>
                  </ol>
                  <pre>Copy → Copy as cURL (bash)</pre>
                </div>
              </div>
            </div>
          </div>
		  </div>
        </div>
      </div> -->
    `;
    document.body.appendChild(wrap);

    /* ── 3. State ────────────────────────────────────────────── */
    const STORAGE_KEY_PS   = 'requestCollector_ps';
    const STORAGE_KEY_BASH = 'requestCollector_bash';

    let psList   = JSON.parse(localStorage.getItem(STORAGE_KEY_PS))   || [];
    let bashList = JSON.parse(localStorage.getItem(STORAGE_KEY_BASH)) || [];

    let currentType      = '';
    let currentEditIndex = -1;
    let actionType       = '';
    let clearTarget      = '';
    let toastTimer       = null;

    /* ── 4. Helpers ─────────────────────────────────────────── */
    function saveToStorage() {
      localStorage.setItem(STORAGE_KEY_PS,   JSON.stringify(psList));
      localStorage.setItem(STORAGE_KEY_BASH,  JSON.stringify(bashList));
    }

    function escapeHTML(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
          `<span class="nc-item-text">${escapeHTML(firstLine)}</span>`;
        div.onclick     = () => openEditModal(type, i);
        listEl.appendChild(div);
      });
    }

    function renderAll() {
      renderList('ps');
      renderList('bash');
    }

    /* ── 6. Paste handler ───────────────────────────────────── */
    function splitAndProcess(text) {
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
          added > 0 ? `貼上 ${added} 筆 PowerShell 請求` : 'PowerShell 請求已存在');
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
          added > 0 ? `貼上 ${added} 筆 Bash / cURL 請求` : 'cURL 請求已存在');
      }
      else {
        showToast('info', '⚠️', '無法識別格式');
      }
    }

    /* ── 7. Edit modal ──────────────────────────────────────── */
    function openEditModal(type, index) {
      currentType      = type;
      currentEditIndex = index;
      const arr = type === 'ps' ? psList : bashList;
      document.getElementById('ncEditTitle').textContent =
        type === 'ps' ? '編輯 PowerShell 指令' : '編輯 cURL 指令';
      document.getElementById('ncEditText').value = arr[index];
      document.getElementById('ncEditBg').classList.add('open');
    }

    function closeEditModal() {
      document.getElementById('ncEditBg').classList.remove('open');
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
      document.getElementById('ncConfirmBg').classList.add('open');
    };

    document.getElementById('ncEditCloseBtn').onclick = closeEditModal;
    document.getElementById('ncEditBg').addEventListener('click', e => {
      if (e.target === document.getElementById('ncEditBg')) closeEditModal();
    });

    /* ── Help moved to network-help.js ─────────────────────── */

    /* ── 8. Confirm modal ───────────────────────────────────── */
    function closeConfirm() {
      document.getElementById('ncConfirmBg').classList.remove('open');
    }

    document.getElementById('ncConfirmCancel').onclick = closeConfirm;
    document.getElementById('ncConfirmBg').addEventListener('click', e => {
      if (e.target === document.getElementById('ncConfirmBg')) closeConfirm();
    });

    document.getElementById('ncConfirmOk').onclick = () => {
      if (actionType === 'delete') {
        const label = currentType === 'ps' ? 'PowerShell' : 'Bash / cURL';
        (currentType === 'ps' ? psList : bashList).splice(currentEditIndex, 1);
        saveToStorage(); renderList(currentType); closeEditModal();
        showToast('del', '🗑️', `已刪除 1 筆 ${label} 指令`);
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
      document.getElementById('ncConfirmBg').classList.add('open');
    }

    document.getElementById('ncPsCopy').onclick   = () => copyPanel('ps');
    document.getElementById('ncPsClear').onclick  = () => showClearConfirm('ps');
    document.getElementById('ncBashCopy').onclick  = () => copyPanel('bash');
    document.getElementById('ncBashClear').onclick = () => showClearConfirm('bash');

    /* ── 10. Global keyboard ────────────────────────────────── */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (document.getElementById('ncConfirmBg').classList.contains('open'))    { closeConfirm(); return; }
      if (document.getElementById('ncEditBg').classList.contains('open'))       { closeEditModal(); return; }
    });

    /* ── 11. Global paste ───────────────────────────────────── */
    document.addEventListener('paste', e => {
      if (window.viewMode !== 'network') return;
      if (document.getElementById('ncEditBg').classList.contains('open')) return;
      const text = e.clipboardData.getData('text/plain').trim();
      if (text) splitAndProcess(text);
    });

    /* ── 12. Full-page render ──────────────────────────────── */
    var ncContentEl = document.getElementById('ncContent');
    this.render = function(wrapper) {
      renderAll();
      ncContentEl.style.display = 'flex';
      wrapper.appendChild(ncContentEl);
    };
  }
});