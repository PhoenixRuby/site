registerPlugin('network-help', {
  icon: window.CARD_ICONS.help,
  label: '教學', mode: 'network', order: 10, open: null,

  init() {
    var style = document.createElement('style');
    style.textContent = `
      .nc-inline-help{max-width:900px;margin:0 auto;text-align:left}
      .nc-inline-help-title{font-size:1rem;color:var(--text);margin-bottom:14px;text-align:center}
      .nc-shortcut-body{overflow-y:auto;box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--border) var(--surface)}
      .nc-shortcut-box{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px 18px;font-size:.85rem;line-height:2;color:var(--text-dim)}
      .nc-shortcut-box kbd{background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:2px 7px;font-size:.78rem;color:var(--text)}
      .nc-warn{color:var(--accent3)}
      .nc-help-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:18px}
      @media(max-width:680px){.nc-help-grid{grid-template-columns:1fr}}
      .nc-help-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden}
      .nc-help-card-header{background:var(--surface);padding:10px 14px;font-size:.92rem;font-weight:bold;border-bottom:1px solid var(--border)}
      .nc-help-card-body{padding:14px}
      .nc-fake-devtools{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;height:280px}
      .nc-fake-tabs{height:34px;background:var(--surface2);display:flex;align-items:center;gap:14px;padding:0 12px;border-bottom:1px solid var(--border);font-size:12px;color:var(--muted)}
      .nc-fake-tabs .active{color:var(--text-dim);border-bottom:2px solid var(--accent);padding-bottom:8px}
      .nc-fake-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--border);font-size:12px;background:var(--surface3)}
      .nc-req-method{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold}
      .nc-req-method.post{background:#0d47a1;color:#90caf9}
      .nc-req-method.get{background:#1b5e20;color:#a5d6a7}
      .nc-req-url{color:var(--text-dim);flex:1}
      .nc-req-status{color:var(--success)}
      .nc-ctx-menu{position:absolute;width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;overflow:hidden;box-shadow:0 8px 22px rgba(0,0,0,.3);font-size:12px}
      .nc-ctx-menu div{padding:8px 11px;border-bottom:1px solid var(--border);color:var(--text-dim)}
      .nc-ctx-menu div:last-child{border-bottom:none}
      .nc-ctx-menu.level-1{top:62px;left:50px}
      .nc-ctx-menu.level-2{top:128px;left:225px}
      .nc-submenu-trigger{display:flex;justify-content:space-between;align-items:center;background:var(--surface3)}
      .nc-ctx-highlight{background:var(--accent);color:var(--surface) !important}
      .nc-help-steps{margin-top:12px;font-size:.8rem;line-height:2;color:var(--text-dim)}
      .nc-help-steps ol{padding-left:18px}
      .nc-help-steps strong{color:var(--text)}
      .nc-help-steps pre{background:var(--surface3);padding:10px 12px;border-radius:6px;color:var(--success);overflow:auto;margin-top:8px;font-size:.78rem}
      .nc-help-modal-bg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;z-index:350}
      .nc-help-modal-bg.open{opacity:1;pointer-events:all}
      .nc-help-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px 28px;width:min(920px,95vw);max-height:88vh;overflow-y:auto;transform:translateY(16px) scale(.97);transition:transform .3s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:18px;font-family:Consolas,'Microsoft JhengHei',monospace;box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--border) var(--surface)}
      .nc-help-modal-bg.open .nc-help-modal{transform:translateY(0) scale(1)}
      .nc-help-modal-header{display:flex;align-items:center;justify-content:space-between}
      .nc-help-modal-title{display:flex;align-items:center;gap:10px}
    `;
    document.head.appendChild(style);

    var helpWrap = document.createElement('div');
    helpWrap.innerHTML = `
      <div class="nc-help-modal-bg" id="ncHelpModalBg">
        <div class="nc-help-modal">
          <div class="nc-help-modal-header">
            <h2 class="nc-help-modal-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" height="28" width="28">
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
      </div>`;
    document.body.appendChild(helpWrap.firstElementChild);

    function openHelp() {
      document.getElementById('ncHelpModalBg').classList.add('open');
    }
    function closeHelp() {
      document.getElementById('ncHelpModalBg').classList.remove('open');
    }
    bindPopup(document.getElementById('ncHelpModalBg'), closeHelp);

    this.open = openHelp;
  }
});
