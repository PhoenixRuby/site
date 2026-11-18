registerPlugin('network-help', {
  icon: 'help',
  label: '教學', 
  mode: 'network', 
  order: 10, 
  open: null,
  close: null,
  load() {
	this.init(); 
  },
  
  init(){
    var helpWrap = document.createElement('div');
    helpWrap.innerHTML = `
      <dialog class="app-dialog" id="ncHelpModalBg" aria-labelledby="ncHelpTitle">
        <div class="nc-help-modal app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('network')}</span>
            <div class="app-modal-header-info">
              <h2 id="ncHelpTitle" class="app-modal-header-title">Chrome Network 複製教學</h2>
              <p class="app-modal-header-subtitle">從開發人員工具複製 PowerShell 或 cURL 請求。</p>
            </div>
            <button type="button" class="app-modal-header-close" id="ncHelpCloseBtn" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body nc-shortcut-body">
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
          <footer class="app-dialog-footer">
            <button type="button" class="btn-confirm" id="ncHelpDone">關閉</button>
          </footer>
        </div>
      </dialog>`;
    const helpModal = helpWrap.firstElementChild;
    document.body.appendChild(helpModal);

    function closeHelp() { ModalManager.closeDialog(helpModal); }
    helpModal.querySelector('#ncHelpCloseBtn').addEventListener('click', closeHelp);
    helpModal.querySelector('#ncHelpDone').addEventListener('click', closeHelp);
    helpModal.addEventListener('click', event => { if (event.target === helpModal) closeHelp(); });

    this.open = () => ModalManager.showDialog(helpModal, closeHelp);
    this.close = closeHelp;
  }
});
