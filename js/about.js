/* =============================================
   About Modal — 關於此工具
   Embedded docs from CLAUDE.md & ARCHITECTURE.md
   When those files change, sync content here.
   ============================================= */
(function() {

  // ── Embedded docs ─────────────────────────────────────────────────
  var DOCS = {
    claude: [
'# CLAUDE.md — 12-rule template',
'',
'These rules apply to every task in this project unless explicitly overridden.',
'Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.',
'',
'## Rule 0 — Read the architecture blueprint first',
'Before starting any work, read `ARCHITECTURE.md` to understand directory structure, plugin system, data models, CSS variables, and UI conventions.',
'After any change that affects architecture, update `ARCHITECTURE.md` accordingly.',
'',
'## Rule 1 — Think Before Coding',
'State assumptions explicitly. If uncertain, ask rather than guess.',
'Present multiple interpretations when ambiguity exists.',
'Push back when a simpler approach exists.',
'Stop when confused. Name what\'s unclear.',
'',
'## Rule 2 — Simplicity First',
'Minimum code that solves the problem. Nothing speculative.',
'No features beyond what was asked. No abstractions for single-use code.',
'Test: would a senior engineer say this is overcomplicated? If yes, simplify.',
'',
'## Rule 3 — Surgical Changes',
'Touch only what you must. Clean up only your own mess.',
'Don\'t "improve" adjacent code, comments, or formatting.',
'Don\'t refactor what isn\'t broken. Match existing style.',
'',
'## Rule 4 — Goal-Driven Execution',
'Define success criteria. Loop until verified.',
'Don\'t follow steps. Define success and iterate.',
'Strong success criteria let you loop independently.',
'',
'## Rule 5 — Use the model only for judgment calls',
'Use me for: classification, drafting, summarization, extraction.',
'Do NOT use me for: routing, retries, deterministic transforms.',
'If code can answer, code answers.',
'',
'## Rule 6 — Token budgets are not advisory',
'Per-task: 4,000 tokens. Per-session: 30,000 tokens.',
'If approaching budget, summarize and start fresh.',
'Surface the breach. Do not silently overrun.',
'',
'## Rule 7 — Surface conflicts, don\'t average them',
'If two patterns contradict, pick one (more recent / more tested).',
'Explain why. Flag the other for cleanup.',
'Don\'t blend conflicting patterns.',
'',
'## Rule 8 — Read before you write',
'Before adding code, read exports, immediate callers, shared utilities.',
'"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.',
'',
'## Rule 9 — Tests verify intent, not just behavior',
'Tests must encode WHY behavior matters, not just WHAT it does.',
'A test that can\'t fail when business logic changes is wrong.',
'',
'## Rule 10 — Checkpoint after every significant step',
'Summarize what was done, what\'s verified, what\'s left.',
'Don\'t continue from a state you can\'t describe back.',
'If you lose track, stop and restate.',
'',
'## Rule 11 — Match the codebase\'s conventions, even if you disagree',
'Conformance > taste inside the codebase.',
'If you genuinely think a convention is harmful, surface it. Don\'t fork silently.',
'',
'## Rule 12 — Fail loud',
'"Completed" is wrong if anything was skipped silently.',
'"Tests pass" is wrong if any were skipped.',
'Default to surfacing uncertainty, not hiding it.'
    ].join('\n'),

    architecture: [
'# ARCHITECTURE.md — 專案架構藍圖',
'',
'> **用途**：每次改造前先讀此文件，快速掌握全局。改造完若動到架構則更新此文件。',
'',
'---',
'',
'## 1. 目錄結構',
'',
'```',
'tools/',
'├── site.htm                 # 唯一入口 HTML',
'├── CLAUDE.md                # Claude 工作指引',
'├── ARCHITECTURE.md          # 架構藍圖',
'├── css/',
'│   └── base.css             # 全域樣式 + CSS 變數（深淺色主題）',
'├── js/',
'│   ├── nicescroll.js        # 自訂捲軸元件 NiceScroll',
'│   ├── base.js              # 核心：plugin registry、toolbar、mode 切換',
'│   ├── edit-guard.js        # 編輯防護',
'│   └── about.js             # 關於頁面（本檔）',
'├── modules/                 # 模態對話框模組（registerModal）',
'│   ├── chat.js',
'│   ├── cicd.js',
'│   └── wsl.js',
'├── plugins/                 # 插件系統（registerPlugin）',
'│   ├── bookmark.js          # 主插件：書籤管理',
'│   ├── bookmark-sort / export / import / search',
'│   ├── card.js              # 主插件：卡片儀表板',
'│   ├── card-sort / export / import / totp',
'│   ├── img.js               # 主插件：文壓圖',
'│   ├── img-sort / export / import',
'│   ├── qr.js                # 主插件：QR Code',
'│   ├── qr-sort / scan',
'│   ├── network.js           # 主插件：Network 請求收集',
'│   └── network-help.js      # 子插件：教學',
'└── image/                   # 圖片資源',
'```',
'',
'---',
'',
'## 2. 插件系統',
'',
'### 主插件 → 子插件依賴圖',
'',
'```',
'card     ── sort / export / import / totp',
'bookmark ── sort / export / import / search',
'img      ── sort / export / import',
'qr       ── sort / scan',
'network  ── help',
'```',
'',
'### 註冊格式',
'',
'```javascript',
'registerPlugin(name, {',
'  main, menuOrder, menuIcon,  // 主模式用',
'  mode, icon, label, order,   // 工具列用',
'  init(), open(), render()    // 生命週期',
'});',
'```',
'',
'---',
'',
'## 3. 資料模型（localStorage）',
'',
'| 插件 | Key | 說明 |',
'|------|-----|------|',
'| bookmark | `bookmarkData` | themes[] + favorites[]，書籤用 themeIds 陣列支援多主題 |',
'| card | `site_data` | 卡片陣列（name/icon/type/group/items/links） |',
'| img | `imgStampData` | 文壓圖模板 |',
'| qr | `qrCodeData` | QR Code 資料 |',
'| network | `requestCollector_ps` / `_bash` | 收集的請求 |',
'',
'---',
'',
'## 4. CSS 設計系統',
'',
'- 深色主題為預設，淺色 / system 可切換',
'- 主色 `--accent: #51cbee`、副色 `--accent2: #b497ff`、第三色 `--accent3: #e8ff47`',
'- 工具列位置：`tb-right`（預設）/ `tb-left` / `tb-top` / `tb-bottom`',
'- Modal z-index 層級：300（一般）→ 400（確認）→ 500（最高）',
'',
'---',
'',
'## 5. 核心工具函式',
'',
'| 函式 | 用途 |',
'|------|------|',
'| `registerPlugin()` | 註冊插件 |',
'| `bindPopup(bg, close)` | 彈窗管理（ESC + 點背景 + .close-btn） |',
'| `showToast(msg)` | Toast 通知 |',
'| `switchMode(mode)` | 切換檢視模式 |',
'| `markEdited() / confirmLeave()` | 編輯防護 |'
    ].join('\n')
  };

  // ── CSS ──────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = '\
    #aboutBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}\
    #aboutBg.open{opacity:1;pointer-events:all}\
    .about-modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:0;width:min(920px,94vw);height:min(80vh,700px);display:flex;flex-direction:column;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);overflow:hidden}\
    #aboutBg.open .about-modal{transform:translateY(0) scale(1)}\
    .about-header{padding:16px 24px 12px;border-bottom:1px solid var(--border);flex-shrink:0}\
    .about-header .modal-header{display:flex;align-items:center;justify-content:space-between}\
    .about-header h2{font-size:16px;color:var(--text);margin:0;display:flex;align-items:center;gap:8px}\
    .about-header .about-desc{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.4}\
    .about-split{flex:1;display:flex;min-height:0}\
    .about-nav{width:180px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;padding:8px 0;overflow-y:auto}\
    .about-nav-item{padding:10px 20px;cursor:pointer;font-size:13px;color:var(--text-dim);border-left:3px solid transparent;transition:color .15s,background .15s,border-color .15s;user-select:none;display:flex;flex-direction:column;gap:2px}\
    .about-nav-item:hover{background:var(--surface2);color:var(--text)}\
    .about-nav-item.active{color:var(--accent);border-left-color:var(--accent);background:var(--surface2)}\
    .about-nav-item .about-nav-label{font-weight:600}\
    .about-nav-item .about-nav-badge{font-size:10px;color:var(--muted)}\
    .about-content{flex:1;overflow-y:auto;padding:24px 32px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}\
    .about-content::-webkit-scrollbar{width:5px}\
    .about-content::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}\
    .about-md h1{font-size:1.4em;color:var(--text);margin:0 0 .5em;border-bottom:1px solid var(--border);padding-bottom:.3em}\
    .about-md h2{font-size:1.15em;color:var(--text);margin:1.2em 0 .4em}\
    .about-md h3{font-size:1em;color:var(--accent);margin:.8em 0 .3em}\
    .about-md{font-size:13px;line-height:1.7;color:var(--text-dim)}\
    .about-md code{background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:.9em}\
    .about-md pre{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;overflow-x:auto;font-size:12px}\
    .about-md pre code{background:none;padding:0}\
    .about-md table{border-collapse:collapse;width:100%;margin:.6em 0}\
    .about-md th,.about-md td{border:1px solid var(--border);padding:6px 10px;text-align:left;font-size:12px}\
    .about-md th{background:var(--surface2)}\
    .about-md blockquote{border-left:3px solid var(--accent);padding-left:14px;color:var(--muted);margin:.6em 0}\
    .about-md ul,.about-md ol{padding-left:20px}\
    .about-md li{margin:2px 0}\
    .about-md hr{border:none;border-top:1px solid var(--border);margin:1em 0}\
    .about-md a{color:var(--accent)}\
    .about-md strong{color:var(--text)}\
    @media(max-width:600px){.about-nav{width:120px;padding:4px 0}.about-nav-item{padding:8px 12px;font-size:12px}.about-content{padding:16px 18px}}\
  ';
  document.head.appendChild(style);

  // ── Menu items config ─────────────────────────────────────────────
  var menuItems = [
    { key: 'about',  label: '關於',         badge: '',                md: null },
    { key: 'claude', label: 'Claude 指引',  badge: 'CLAUDE.md',      md: DOCS.claude },
    { key: 'arch',   label: '架構藍圖',     badge: 'ARCHITECTURE.md', md: DOCS.architecture }
  ];

  var aboutIntroHtml = '<h1>ℹ️ 關於此工具</h1>' +
    '<p>離線工具箱 — 卡片管理、書籤收藏、文壓圖、QR Code、Network 請求收集。</p>' +
    '<p>所有資料儲存於瀏覽器 localStorage，不經過任何伺服器。</p>' +
    '<h2>功能一覽</h2>' +
    '<table><thead><tr><th>模式</th><th>說明</th><th>快捷鍵</th></tr></thead><tbody>' +
    '<tr><td><strong>卡片</strong></td><td>網站帳號卡片管理、TOTP 驗證碼</td><td>—</td></tr>' +
    '<tr><td><strong>書籤</strong></td><td>多主題書籤收藏、Markdown 筆記、閱讀器</td><td>Ctrl+F 搜尋</td></tr>' +
    '<tr><td><strong>文壓圖</strong></td><td>圖片上疊加文字浮水印</td><td>—</td></tr>' +
    '<tr><td><strong>QR Code</strong></td><td>產生 / 解碼 QR Code</td><td>—</td></tr>' +
    '<tr><td><strong>Network</strong></td><td>Chrome DevTools 請求收集</td><td>—</td></tr>' +
    '</tbody></table>' +
    '<h2>技術資訊</h2>' +
    '<ul>' +
    '<li>純前端靜態 HTML，無需伺服器</li>' +
    '<li>插件系統架構，功能可獨立擴充</li>' +
    '<li>深色 / 淺色 / 系統主題自動切換</li>' +
    '<li>工具列位置可自由調整（上下左右）</li>' +
    '</ul>';

  // ── DOM ──────────────────────────────────────────────────────────
  var bg = document.createElement('div');
  bg.id = 'aboutBg';

  var navHtml = '';
  menuItems.forEach(function(item) {
    navHtml += '<div class="about-nav-item" data-key="' + item.key + '">' +
      '<span class="about-nav-label">' + item.label + '</span>' +
      (item.badge ? '<span class="about-nav-badge">' + item.badge + '</span>' : '') +
    '</div>';
  });

  bg.innerHTML = '<div class="about-modal">' +
    '<div class="about-header">' +
      '<div class="modal-header"><h2>ℹ️ 關於此工具</h2><button class="close-btn" id="aboutClose">✕</button></div>' +
    '</div>' +
    '<div class="about-split">' +
      '<div class="about-nav">' + navHtml + '</div>' +
      '<div class="about-content"><div class="about-md" id="aboutDocContent"></div></div>' +
    '</div>' +
  '</div>';
  document.body.appendChild(bg);

  var contentEl = document.getElementById('aboutDocContent');
  var navItems = bg.querySelectorAll('.about-nav-item');
  var renderedCache = {};
  var activeKey = 'about';

  function renderMarkdown(md) {
    if (window.marked) return window.marked.parse(md);
    return '<pre>' + md.replace(/</g, '&lt;') + '</pre>';
  }

  function ensureMarked(cb) {
    if (window.marked) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function showDoc(key) {
    activeKey = key;
    navItems.forEach(function(n) { n.classList.toggle('active', n.dataset.key === key); });

    if (key === 'about') {
      contentEl.innerHTML = aboutIntroHtml;
      return;
    }

    if (renderedCache[key]) {
      contentEl.innerHTML = renderedCache[key];
      return;
    }

    var item = menuItems.find(function(m) { return m.key === key; });
    if (!item || !item.md) return;

    ensureMarked(function() {
      renderedCache[key] = renderMarkdown(item.md);
      if (activeKey === key) contentEl.innerHTML = renderedCache[key];
    });
  }

  navItems.forEach(function(nav) {
    nav.addEventListener('click', function() {
      showDoc(nav.dataset.key);
      bg.querySelector('.about-content').scrollTop = 0;
    });
  });

  function closeAbout() { bg.classList.remove('open'); }
  bindPopup(bg, closeAbout);

  window.openAbout = function() {
    showDoc('about');
    bg.classList.add('open');
  };

})();
