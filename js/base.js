/* =============================================
   Module Registry
   ============================================= */
window.modalModules = {};
function registerModal(name, moduleObj) {
  window.modalModules[name] = moduleObj;
}

/* =============================================
   Plugin Registry
   ============================================= */
window.plugins = {};
function registerPlugin(name, pluginObj) {
  window.plugins[name] = pluginObj;
}

/* =============================================
   Popup Helper
   ============================================= */
function bindPopup(bgEl, onClose) {
  bgEl.addEventListener('click', function(e) { if (e.target === bgEl) onClose(); });
  var closeBtn = bgEl.querySelector('.close-btn');
  if (closeBtn) closeBtn.addEventListener('click', onClose);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && bgEl.classList.contains('open')) onClose();
  });
}

/* =============================================
   View Mode
   ============================================= */
const VIEW_MODE_KEY = 'view_mode';
var _legacyModes = { cards: 'card', bookmarks: 'bookmark' };
let viewMode = localStorage.getItem(VIEW_MODE_KEY) || 'card';
viewMode = _legacyModes[viewMode] || viewMode;
window.viewMode = viewMode;

function switchMode(mode) {
  mode = _legacyModes[mode] || mode;
  viewMode = mode;
  window.viewMode = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
  renderToolbar();

  // ── Common cleanup ──
  var countdown = document.querySelector('.countdown-container');
  var wrapper = document.getElementById('card-wrapper');
  if (wrapper) {
    wrapper.style.height = ''; wrapper.style.position = '';
    wrapper.querySelectorAll('.list-container').forEach(function(el) {
      el.style.position = ''; el.style.top = ''; el.style.left = '';
    });
    wrapper.classList.remove('bookmark-mode');
  }
  var oldSidebar = document.getElementById('bmSidebar');
  if (oldSidebar) oldSidebar.remove();
  document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
  document.body.style.paddingTop = ''; document.body.style.paddingBottom = ''; document.body.style.paddingLeft = ''; document.body.style.paddingRight = '';

  // ── Detach plugin content before clearing wrapper ──
  if (wrapper) {
    wrapper.querySelectorAll('[data-plugin-content]').forEach(function(el) {
      el.style.display = 'none';
      document.body.appendChild(el);
    });
  }

  // ── Mode-specific render ──
  if (mode === 'card') {
    var cardPlugin = window.plugins['card'];
    if (cardPlugin && typeof cardPlugin.render === 'function') {
      if (wrapper) { wrapper.innerHTML = ''; cardPlugin.render(wrapper); }
    }
  } else if (mode === 'bookmark') {
    if (countdown) countdown.style.display = 'none';
    if (wrapper) wrapper.classList.add('bookmark-mode');
    setModeFavicon('bookmark');
    if (typeof window.renderBookmarks === 'function') window.renderBookmarks();
  } else {
    if (countdown) countdown.style.display = 'none';
    setModeFavicon(mode);
    var plugin = window.plugins[mode];
    if (plugin && typeof plugin.render === 'function') {
      if (wrapper) { wrapper.innerHTML = ''; plugin.render(wrapper); }
    } else if (plugin && typeof plugin.open === 'function') {
      if (wrapper) wrapper.innerHTML = '';
      plugin.open();
    }
  }

  window.scrollTo(0, 0);
  if (window.niceScroll) {
    requestAnimationFrame(function() { window.niceScroll.updateScrollbar(); });
  }
}

function setModeFavicon(mode) {
  var canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffd100';
  var plugin = window.plugins[mode];
  if (plugin && typeof plugin.favicon === 'function') {
    plugin.favicon(canvas, ctx);
  }
  var link = document.querySelector('link[rel*="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'shortcut icon'; document.head.appendChild(link); }
  link.href = canvas.toDataURL('image/png');
}

/* Data Management, renderGrid, resizeQuicksand, initModules — moved to plugins/card.js */

/* =============================================
   createSvgIcon
   ============================================= */
function createSvgIcon(type, copyContent, svgString) {
  const wrapper = document.createElement("span");

  if (typeof svgString === 'string' && svgString.trimStart().startsWith('<')) {
    if (!type) {
      const temp = document.createElement("div");
      temp.innerHTML = svgString;
      return temp.firstElementChild;
    }
    wrapper.innerHTML = svgString;
  } else {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 640 640");
    svg.setAttribute("fill", "currentColor");
    svg.classList.add("icon-svg");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", svgString);
    svg.appendChild(path);

    if (!type) return svg;
    wrapper.appendChild(svg);
  }

  wrapper.classList.add("copy-wrapper");
  wrapper.dataset.icon = type;
  if (copyContent) wrapper.dataset.copyContent = copyContent;
  return wrapper;
}

function createSvgIcon_old(type, copyContent, pathData) {
  const wrapper = document.createElement("span");
  wrapper.classList.add("copy-wrapper");
  wrapper.dataset.icon = type;
  if (copyContent) wrapper.dataset.copyContent = copyContent;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 640 640");
  svg.setAttribute("fill", "currentColor");
  svg.classList.add("icon-svg");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);

  wrapper.appendChild(svg);
  return wrapper;
}

/* =============================================
   Import Error Popup
   ============================================= */
(function() {
  var style = document.createElement('style');
  style.textContent =
    '#importErrBg{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .2s}' +
    '#importErrBg.open{opacity:1;pointer-events:all}' +
    '.import-err-box{background:var(--surface);border:1px solid var(--danger,#e53935);border-radius:12px;padding:24px 28px;width:min(420px,90vw);display:flex;flex-direction:column;gap:14px;transform:scale(.95);transition:transform .2s cubic-bezier(.22,1,.36,1)}' +
    '#importErrBg.open .import-err-box{transform:scale(1)}' +
    '.import-err-title{display:flex;align-items:center;gap:10px;font-weight:600;font-size:1rem;color:var(--danger,#e53935)}' +
    '.import-err-msg{font-size:.88rem;color:var(--text);line-height:1.6;white-space:pre-wrap}' +
    '.import-err-ok{align-self:flex-end;padding:7px 22px;border-radius:8px;border:1px solid var(--danger,#e53935);background:transparent;color:var(--danger,#e53935);font-size:.85rem;cursor:pointer;transition:background .15s,color .15s}' +
    '.import-err-ok:hover{background:var(--danger,#e53935);color:#fff}';
  document.head.appendChild(style);

  var bg = document.createElement('div');
  bg.id = 'importErrBg';
  bg.innerHTML = '<div class="import-err-box"><div class="import-err-title">⚠ 格式錯誤</div><div class="import-err-msg" id="importErrMsg"></div><button class="import-err-ok" id="importErrOk">確認</button></div>';
  document.body.appendChild(bg);

  function closeErr() { bg.classList.remove('open'); }
  document.getElementById('importErrOk').addEventListener('click', closeErr);
  bg.addEventListener('click', function(e) { if (e.target === bg) closeErr(); });

  window.showImportError = function(msg) {
    document.getElementById('importErrMsg').textContent = msg;
    bg.classList.add('open');
  };
})();

// Global click handler for copy icons
document.addEventListener("click", e => {
  const target = e.target.closest("[data-copy-content]");
  if (target) {
    const content = target.dataset.copyContent;
    navigator.clipboard.writeText(content).then(() => {
      const indicator = target.querySelector('.copy-wrapper') || target;
      indicator.classList.add("show-check");
      setTimeout(() => indicator.classList.remove("show-check"), 300);
    }).catch(err => console.error("Copy failed:", err));
  }
});

/* TOTP Logic -- moved to plugins/totp.js */

/* QR Scanner -- moved to plugins/qr.js */

/* =============================================
   makeCard (shared by wsl.js and cicd.js)
   ============================================= */
window.makeCard = function makeCard(item, type) {
  const card = document.createElement('div');
  card.className = 'cmd-card' + (type === 'pip' ? ' pip' : item.note ? ' note' : '');

  const header = document.createElement('div');
  header.className = 'cmd-header';

  const dotR = document.createElement('div');
  dotR.className = 'dot dot-r';
  const dotY = document.createElement('div');
  dotY.className = 'dot dot-y';
  const dotG = document.createElement('div');
  dotG.className = 'dot dot-g';

  const left = document.createElement('div');
  left.className = 'cmd-header-left';

  const lbl = document.createElement('div');
  lbl.appendChild(dotR);
  lbl.appendChild(dotY);
  lbl.appendChild(dotG);
  lbl.className = 'cmd-label';
  lbl.appendChild(document.createTextNode(item.label));

  left.appendChild(lbl);

  if (item.desc) {
    const desc = document.createElement('div');
    desc.className = 'cmd-desc';
    desc.textContent = item.desc;
    left.appendChild(desc);
  }

  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = 'Copy';
  btn.onclick = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(item.code);
      } else {
        const ta = Object.assign(document.createElement('textarea'), { value: item.code, readOnly: true });
        ta.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    } catch (e) {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }
  };

  header.appendChild(left);
  header.appendChild(btn);

  const body = document.createElement('div');
  body.className = 'cmd-body';
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = `language-${item.lang || 'bash'}`;
  code.textContent = item.code;
  pre.appendChild(code);
  body.appendChild(pre);

  card.appendChild(header);
  card.appendChild(body);
  return card;
};

/* =============================================
   escapeHtml utility
   ============================================= */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }


/* =============================================
   showToast utility
   ============================================= */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

/* Sort, Export, Import -- moved to plugins/card-tools.js */

/* =============================================
   Plugin Loading
   ============================================= */
const KNOWN_PLUGINS = ['qr', 'qr-scan', 'qr-sort', 'card', 'card-sort', 'card-export', 'card-import', 'card-totp', 'bookmark', 'bookmark-sort', 'bookmark-export', 'bookmark-import', 'bookmark-search', 'bookmark-searchcontent', 'network', 'network-help', 'img', 'img-sort', 'img-export', 'img-import'];

async function initPlugins() {
  await Promise.all(KNOWN_PLUGINS.map(name => loadPluginScript(name)));
  Object.values(window.plugins).forEach(p => {
    if (typeof p.init === 'function') p.init();
  });
}

function loadPluginScript(name) {
  return new Promise(resolve => {
    if (window.plugins[name]) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'plugins/' + name + '.js';
    s.onload = resolve;
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

/* =============================================
   Toolbar
   ============================================= */
const TB_POS_KEY = 'toolbarPos';
const TB_LABELS_KEY = 'toolbarLabels';
const TB_THEME_KEY = 'appTheme';
const TB_ALIGN_KEY = 'toolbarAlign';
let tbPos = localStorage.getItem(TB_POS_KEY) || 'right';
let tbLabels = localStorage.getItem(TB_LABELS_KEY) === 'true';
let tbAlign = localStorage.getItem(TB_ALIGN_KEY) || 'center';
let appTheme = localStorage.getItem(TB_THEME_KEY) || 'system';

function applyTheme() {
  document.documentElement.setAttribute('data-theme', appTheme);
}
applyTheme();

function svgIcon(paths) {
  return createSvgIcon(null, null, paths);
}

function applyToolbarBodyClass() {
  document.body.classList.remove('tb-right', 'tb-left', 'tb-top', 'tb-bottom', 'tb-labels');
  document.body.classList.add('tb-' + tbPos);
  if (tbLabels) document.body.classList.add('tb-labels');
}

function renderToolbar() {
  const old = document.getElementById('toolbar');
  if (old) old.remove();
  applyToolbarBodyClass();

  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar';
  toolbar.classList.add('tb-' + tbPos);
  if (tbLabels) toolbar.classList.add('show-labels');

  function addBtn(iconEl, label, handler) {
    const btn = document.createElement('button');
    btn.dataset.tooltip = label;

    const getLabel = typeof label === 'object' 
    ? () => label.label 
    : () => label;

    btn.dataset.tooltip = getLabel();
    btn.addEventListener('mouseenter', () => {
      btn.dataset.tooltip = getLabel();
    });

    if (typeof iconEl === 'string') {
      btn.innerHTML = iconEl;
    } else {
      btn.appendChild(iconEl);
    }
    
    if (tbLabels) {
      const span = document.createElement('span');
      span.classList.add('tb-label');
      span.textContent = label;
      btn.appendChild(span);
    }
    btn.addEventListener('click', handler);
    toolbar.appendChild(btn);
    return btn;
  }

  function addBtn_old(iconHtml, label, handler) {
    const btn = document.createElement('button');
    btn.dataset.tooltip = label;
    btn.innerHTML = iconHtml;
    if (tbLabels) btn.innerHTML += '<span class="tb-label">' + label + '</span>';
    btn.addEventListener('click', handler);
    toolbar.appendChild(btn);
    return btn;
  }

  if (tbAlign === 'center') {
    var spacerBefore = document.createElement('div');
    spacerBefore.className = 'tb-spacer tb-spacer-clean';
    toolbar.appendChild(spacerBefore);
  }

  addBtn(window.CARD_ICONS.mainmenu, '選單', function() { toggleMainMenu(toolbar); });

  function modeDataCount() {
    try {
      if (viewMode === 'card') { var d = JSON.parse(localStorage.getItem('site_data') || '[]'); return Array.isArray(d) ? d.length : 0; }
      if (viewMode === 'bookmark') { return window.bmGetData ? window.bmGetData().favorites.length : 0; }
      if (viewMode === 'img') { return window.isLoadStamps ? window.isLoadStamps().length : 0; }
      if (viewMode === 'qr') { return window.qrLoadData ? window.qrLoadData().length : 0; }
    } catch (_) {}
    return 99;
  }
  var dataCount = modeDataCount();

  const sorted = Object.entries(window.plugins)
    .filter(([, p]) => {
      if (p.mode !== viewMode || !p.icon || p.hideToolbar) return false;
      if (p.requiresData === 'sort') return dataCount >= 2;
      if (p.requiresData) return dataCount >= 1;
      return true;
    })
    .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99));
  sorted.forEach(([name, p]) => {
    addBtn(p.icon, p || name,
      () => { if (typeof p.open === 'function') p.open(); }
    );
  });

  var spacer = document.createElement('div');
  spacer.className = 'tb-spacer';
  toolbar.appendChild(spacer);

  addBtn(svgIcon(window.CARD_ICONS.setting),
    '設定', openToolbarSettings
  );
  
  addBtn(svgIcon(window.CARD_ICONS.about),
    '關於', function() { if (typeof window.openAbout === 'function') window.openAbout(); }
  );

  document.body.appendChild(toolbar);
}

/* =============================================
   Main Menu Popup
   ============================================= */
function toggleMainMenu(toolbar, callback) {
  var existing = document.getElementById('tbMainMenuBg');
  if (existing) { existing.remove(); return; }

  var bg = document.createElement('div');
  bg.id = 'tbMainMenuBg';
  bg.className = 'tb-menu-bg';

  var menu = document.createElement('div');
  menu.className = 'tb-menu';

  var mainPlugins = Object.entries(window.plugins)
    .filter(function(e) { return e[1].main; })
    .sort(function(a, b) { return (a[1].menuOrder || 99) - (b[1].menuOrder || 99); });

  var activeIdx = -1;
  mainPlugins.forEach(function(entry, i) {
    var name = entry[0], p = entry[1];
    var item = document.createElement('div');
    item.className = 'tb-menu-item' + (viewMode === name ? ' active' : '');
    item.setAttribute('tabindex', '0');
    item.dataset.idx = i;
    item.innerHTML =
      '<div class="tb-menu-icon">' + (p.menuIcon || p.icon || '') + '</div>' +
      '<div class="tb-menu-label">' + (p.label || name) + '</div>';
    item.addEventListener('click', function() {
      bg.remove();
      if (viewMode !== name) {switchMode(name)};
	  if (typeof callback === 'function') {
        callback(name);
      }
    });
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
    if (viewMode === name) activeIdx = i;
    menu.appendChild(item);
  });

  function getItems() { return menu.querySelectorAll('.tb-menu-item'); }
  function focusIdx(idx) {
    var items = getItems();
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    items[idx].focus();
  }

  var cols = getComputedStyle(menu).gridTemplateColumns.split(' ').length || 1;

  menu.addEventListener('keydown', function(e) {
    var items = getItems();
    var cur = Array.prototype.indexOf.call(items, document.activeElement);
    if (cur < 0) return;
    var handled = true;
    switch (e.key) {
      case 'ArrowRight': focusIdx(cur + 1); break;
      case 'ArrowLeft':  focusIdx(cur - 1); break;
      case 'ArrowDown':  focusIdx(cur + cols); break;
      case 'ArrowUp':    focusIdx(cur - cols); break;
      case 'Escape':     bg.remove(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  bg.appendChild(menu);
  bg.addEventListener('click', function(e) { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);

  requestAnimationFrame(function() {
    bg.classList.add('open');
    var items = getItems();
    var startIdx = activeIdx >= 0 ? activeIdx : 0;
    if (items[startIdx]) items[startIdx].focus();
  });
}

function openToolbarSettings() {
  var existing = document.getElementById('tbSettingsBg');
  if (existing) existing.remove();

  var bg = document.createElement('div');
  bg.className = 'tb-settings-bg open';
  bg.id = 'tbSettingsBg';
  bg.innerHTML = '<div class="tb-settings">' +
    '<div class="modal-header"><h2>' + window.CARD_ICONS.setting + '工具列設定</h2><button class="close-btn" id="tbSettingsClose">✕</button></div>' +
    '<div class="pos-picker">' +
      '<button class="pos-top tb-pos-btn' + (tbPos === 'top' ? ' active' : '') + '" data-pos="top">⬆ 置頂</button>' +
      '<button class="pos-left tb-pos-btn' + (tbPos === 'left' ? ' active' : '') + '" data-pos="left">⬅ 靠左</button>' +
      '<div class="pos-picker-screen"></div>' +
      '<button class="pos-right tb-pos-btn' + (tbPos === 'right' ? ' active' : '') + '" data-pos="right">靠右 ➡</button>' +
      '<button class="pos-bottom tb-pos-btn' + (tbPos === 'bottom' ? ' active' : '') + '" data-pos="bottom">⬇ 置底</button>' +
    '</div>' +
    '<div class="tb-label-toggle"><span>顯示按鈕名稱</span><div class="tb-switch' + (tbLabels ? ' on' : '') + '" id="tbLabelSwitch"></div></div>' +
    '<div class="tb-label-toggle"><span>按鈕對齊</span><div style="display:flex;gap:6px">' +
      '<button class="tb-align-btn' + (tbAlign === 'center' ? ' active' : '') + '" data-align="center" style="flex:1;padding:6px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px">置中</button>' +
      '<button class="tb-align-btn' + (tbAlign === 'start' ? ' active' : '') + '" data-align="start" style="flex:1;padding:6px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px">靠上/靠左</button>' +
    '</div></div>' +
    '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<span style="font-size:12px;color:var(--text-dim)">主題</span>' +
      '<div class="tb-theme-btns" style="display:flex;gap:6px">' +
        '<button class="tb-theme-btn' + (appTheme === 'system' ? ' active' : '') + '" style="flex:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>系統</button>' +
        '<button class="tb-theme-btn' + (appTheme === 'light' ? ' active' : '') + '" style="flex:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>亮色</button>' +
        '<button class="tb-theme-btn' + (appTheme === 'dark' ? ' active' : '') + '" style="flex:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>暗色</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.appendChild(bg);

  var settingsTitle = bg.querySelector('h2');
  var settingsEdited = false;
  var pendingPos = tbPos;
  var pendingLabels = tbLabels;
  var pendingAlign = tbAlign;
  var pendingTheme = appTheme;

  function settingsMark() {
    var changed = pendingPos !== tbPos || pendingLabels !== tbLabels || pendingAlign !== tbAlign || pendingTheme !== appTheme;
    if (changed && !settingsEdited) { settingsEdited = true; markEdited(settingsTitle); }
    if (!changed && settingsEdited) { settingsEdited = false; clearEdited(settingsTitle); }
  }

  function closeSettings() {
    confirmLeave(settingsEdited, function() { bg.remove(); });
  }
  bindPopup(bg, closeSettings);

  bg.querySelectorAll('.tb-pos-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      pendingPos = btn.dataset.pos;
      bg.querySelectorAll('.tb-pos-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      settingsMark();
    });
  });

  bg.querySelector('#tbLabelSwitch').addEventListener('click', function() {
    pendingLabels = !pendingLabels;
    this.classList.toggle('on', pendingLabels);
    settingsMark();
  });

  bg.querySelectorAll('.tb-align-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      pendingAlign = btn.dataset.align;
      bg.querySelectorAll('.tb-align-btn').forEach(function(b) { b.classList.remove('active'); b.style.borderColor = ''; b.style.color = ''; });
      btn.classList.add('active');
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
      settingsMark();
    });
    if (btn.classList.contains('active')) { btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; }
  });

  var themes = ['system', 'light', 'dark'];
  bg.querySelectorAll('.tb-theme-btn').forEach(function(btn, i) {
    btn.addEventListener('click', function() {
      pendingTheme = themes[i];
      bg.querySelectorAll('.tb-theme-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      settingsMark();
    });
  });

  var applyBtn = document.createElement('button');
  applyBtn.textContent = '套用';
  applyBtn.className = 'tb-apply-btn';
  bg.querySelector('.tb-settings').appendChild(applyBtn);
  applyBtn.addEventListener('click', function() {
    tbPos = pendingPos;
    tbLabels = pendingLabels;
    tbAlign = pendingAlign;
    appTheme = pendingTheme;
    localStorage.setItem(TB_POS_KEY, tbPos);
    localStorage.setItem(TB_LABELS_KEY, tbLabels);
    localStorage.setItem(TB_ALIGN_KEY, tbAlign);
    localStorage.setItem(TB_THEME_KEY, appTheme);
    applyTheme();
    bg.remove();
    renderToolbar();
    switchMode(viewMode);
  });
}


/* =============================================
   Initialization
   ============================================= */
initPlugins().then(function() {
  if (typeof window.initModules === 'function') {
    window.initModules().then(function() {
      renderToolbar();
      window.niceScroll = new NiceScroll('html');
      switchMode(viewMode);
    });
  } else {
    renderToolbar();
    window.niceScroll = new NiceScroll('html');
    switchMode(viewMode);
  }
});
