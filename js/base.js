const defaultData = [];
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
   ModalManager — shared dialog stacking and Escape
   CSS fallback is 12000; actual levels are assigned per open dialog.
   ============================================= */
const ModalManager = {
  stack: [],
  baseZIndex: 12000,
  open(element, closeHandler) {
    if (!element || typeof closeHandler !== 'function') return;
    this.stack = this.stack.filter(entry => entry.element !== element && entry.element.isConnected);
    this.stack.push({ element, closeHandler });
    this.update();
  },
  close(element) {
    this.stack = this.stack.filter(entry => entry.element !== element && entry.element.isConnected);
    if (element) {
      element.style.removeProperty('--modal-z-index');
      element.style.removeProperty('z-index');
    }
    this.update();
  },
  update() {
    const cssBase = Number.parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-base-z-index'), 10);
    const base = Number.isFinite(cssBase) ? cssBase : this.baseZIndex;
    this.stack = this.stack.filter(entry => entry.element.isConnected);
    this.stack.forEach((entry, index) => {
      entry.element.style.setProperty('--modal-z-index', String(base + index));
      // Inline fallback makes migration safe before base.css is updated.
      entry.element.style.zIndex = 'var(--modal-z-index, 12000)';
    });
  },
  top() { return this.stack[this.stack.length - 1] || null; },
  isRegistered(element) { return this.stack.some(entry => entry.element === element); }
};
window.ModalManager = ModalManager;
// Native modal dialogs use the browser top layer, not CSS z-index.
// Register close callbacks via cancel; close() is the only successful dismissal path.
ModalManager.nativeStack = [];
ModalManager.showDialog = function(dialog, onRequestClose) {
  if (!(dialog instanceof HTMLDialogElement)) throw new TypeError('Expected HTMLDialogElement');
  if (dialog.open) return;
  dialog.__requestClose = onRequestClose;
  if (!dialog.__modalBound) {
    dialog.__modalBound = true;
    dialog.addEventListener('cancel', function(event) {
      event.preventDefault();
      if (typeof dialog.__requestClose === 'function') dialog.__requestClose();
    });
    dialog.addEventListener('close', function() { dialog.__requestClose = null; ModalManager.nativeStack = ModalManager.nativeStack.filter(d => d !== dialog); });
  }
  dialog.showModal();
  ModalManager.nativeStack = ModalManager.nativeStack.filter(d => d !== dialog);
  ModalManager.nativeStack.push(dialog);
};
ModalManager.closeDialog = function(dialog) {
  if (dialog && dialog.open) dialog.close();
  ModalManager.nativeStack = ModalManager.nativeStack.filter(d => d !== dialog);
};

// One Escape per keypress, only the topmost native dialog.
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const dialogs = Array.from(document.querySelectorAll('dialog:modal'));
  if (dialogs.length) {
    const topDialog = ModalManager.nativeStack.filter(d => d.open && d.matches(':modal')).at(-1) || dialogs[dialogs.length - 1];
    if (typeof topDialog.__requestClose !== 'function') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    topDialog.__requestClose();
    return;
  }
  const top = ModalManager.top();
  if (!top) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  top.closeHandler();
}, true);

/* =============================================
   Popup Helper
   ============================================= */
function bindPopup(bgEl, onClose) {
  bgEl.addEventListener('click', function(e) { if (e.target === bgEl) onClose(); });
  var closeBtn = bgEl.querySelector('.close-btn');
  if (closeBtn) closeBtn.addEventListener('click', onClose);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !document.querySelector('dialog:modal') && bgEl.classList.contains('open') && !ModalManager.isRegistered(bgEl)) onClose();
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
  document.body.dataset.viewMode = mode;
  var activePlugin = window.plugins[mode];
  if (activePlugin && activePlugin.main) {
    document.title = activePlugin.label || mode;
  }
  localStorage.setItem(VIEW_MODE_KEY, mode);
  renderToolbar();

  // ── Common cleanup ──
  var countdown = document.querySelector('.countdown-container');
  var wrapper = document.getElementById('app-content');
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

/* =============================================
   Import Error Popup
   ============================================= */
(function() {
  var bg = document.createElement('dialog');
  bg.id = 'importErrBg';
  bg.className = 'app-dialog';
  bg.setAttribute('aria-labelledby', 'importErrTitle');
  bg.innerHTML = `
	  <div class="app-dialog-panel-medium">
		<header class="app-modal-header">
		  <div class="app-modal-header-info">
			<h2 class="app-modal-header-title" id="importErrTitle">無法匯入</h2>
		  </div>
		  <button type="button" class="app-modal-header-close" aria-label="關閉">✕</button>
		</header>
		<div class="app-dialog-body" id="importErrMsg"></div>
		<footer class="app-dialog-footer">
		  <button type="button" class="btn-confirm" id="importErrOk" autofocus>確認</button>
		</footer>
	  </div>
	`;
  document.body.appendChild(bg);

  var message = document.getElementById('importErrMsg');
  message.style.whiteSpace = 'pre-wrap';
  function closeErr() { ModalManager.closeDialog(bg); }
  bg.querySelector('.app-modal-header-close').addEventListener('click', closeErr);
  document.getElementById('importErrOk').addEventListener('click', closeErr);
  bg.addEventListener('click', function(e) { if (e.target === bg) closeErr(); });

  window.showImportError = function(msg) {
    message.textContent = msg;
    ModalManager.showDialog(bg, closeErr);
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
const KNOWN_PLUGINS = ['about', 'setting', 'qr', 'card', 'bookmark', 'network', 'img', 'viewer', 'google-drive'];

// Shared core modules must finish loading before plugins initialize.
// Cache the Promise so repeated calls wait for the same loading operation.
const coreScriptPromises = new Map();
function loadCoreScript(name) {
  if (coreScriptPromises.has(name)) return coreScriptPromises.get(name);

  const src = `js/${name}.js`;
  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    const script = existing || document.createElement('script');

    // guard.js exposes these functions when its initialization is complete.
    const isInitialized = () => name === 'guard' &&
      typeof window.markEdited === 'function' &&
      typeof window.clearEdited === 'function' &&
      typeof window.confirmLeave === 'function';

    if (script.dataset.coreLoaded === 'true' || isInitialized()) {
      resolve();
      return;
    }

    // A previously loaded script without a completion marker cannot reliably
    // be distinguished from an in-flight script using the DOM alone.
    if (existing && (script.readyState === 'complete' || script.readyState === 'loaded')) {
      reject(new Error(`核心模組已載入，但未完成初始化：${src}`));
      return;
    }

    script.addEventListener('load', () => {
      if (name === 'guard' && !isInitialized()) {
        reject(new Error(`核心模組缺少必要函式：${src}`));
        return;
      }
      script.dataset.coreLoaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`核心模組載入失敗：${src}`)), { once: true });

    if (!existing) {
      script.src = src;
      document.head.appendChild(script);
    }
  });
  coreScriptPromises.set(name, promise);
  return promise;
}

async function initPlugins() {
  await loadPluginScript('google-drive');
  await window.plugins['google-drive']?.load();
  await Promise.all(KNOWN_PLUGINS.filter(name => name !== 'google-drive').map(name => loadPluginScript(name)));
  // 2. 改用 for...of 迴圈，這樣才能在內部使用 await
  const plugins = Object.values(window.plugins);
  for (const p of plugins) {
    if (p === window.plugins['google-drive']) continue;
    if (typeof p.load === 'function') {
      // ✨ 關鍵：如果插件的 load 返回的是 Promise，就等待它完全做好再換下一個
      await p.load(); 
    }
  }
}

function loadPluginScript(name) {
  return new Promise(resolve => {
    const src = 'plugins/' + name + '.js';
    
    // 修正點 1：改用 src 檢查 DOM，防止異步同時呼叫時重複插入標籤
    if (document.querySelector(`script[src="${src}"]`)) { 
      resolve(); 
      return; 
    }
    
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    
    // 修正點 2：失敗時可以回傳一個標記，或是用 console.warn 提示，方便除錯
    s.onerror = () => {
      console.warn(`Plugin [${name}] failed to load.`);
      resolve(false); 
    };
    
    document.head.appendChild(s);
  });
}


function loadPluginCss(name) {
  return new Promise(resolve => {
    const href = `css/${name}.css`;
    
    // 防止重複載入同一個 CSS 檔案
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    link.onload = resolve; 
    link.onerror = resolve; // 避免單一 CSS 失敗卡死整個插件
    
    document.head.appendChild(link);
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

let toolbarBadgeStates = new Map();

function renderToolbar() {
  const previousBadges = toolbarBadgeStates;
  toolbarBadgeStates = new Map();
  closeToolbarSubmenu();
  const old = document.getElementById('toolbar');
  if (old) old.remove();
  applyToolbarBodyClass();

  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar';
  toolbar.classList.add('tb-' + tbPos);
  if (tbLabels) toolbar.classList.add('show-labels');

  function addBtn(iconEl, label, handler) {
    const btn = document.createElement('button');

    const getLabel = typeof label === 'object' 
    ? () => label.label 
    : () => label;

    btn.dataset.tooltip = getLabel();
    btn.addEventListener('mouseenter', () => {
      btn.dataset.tooltip = getLabel();
    });

    if (typeof iconEl === 'string') {
		btn.innerHTML = resolveIcon(iconEl);
	} else if (iconEl instanceof Node) {
		btn.appendChild(iconEl);
	}
    
    if (tbLabels) {
      const span = document.createElement('span');
      span.classList.add('tb-label');
      span.textContent = getLabel();
      btn.appendChild(span);
    }
    btn.addEventListener('click', handler);
    toolbar.appendChild(btn);
    return btn;
  }

  //function modeDataCount() {
  //  try {
  //    if (viewMode === 'card') { var d = JSON.parse(localStorage.getItem('site_data') || '[]'); return Array.isArray(d) ? d.length : 0; }
  //    if (viewMode === 'bookmark') { return window.bmGetData ? window.bmGetData().favorites.length : 0; }
  //    if (viewMode === 'img') { return window.isLoadStamps ? window.isLoadStamps().length : 0; }
  //    if (viewMode === 'qr') { return window.qrLoadData ? window.qrLoadData().length : 0; }
  //  } catch (_) {}
  //  return 99;
  //}
  
  function modeDataCount() {
		const plugin = window.plugins[viewMode];

		if (!plugin || typeof plugin.getDataCount !== 'function') {
			return 0;
		}

		try {
			const count = Number(plugin.getDataCount());

			return Number.isFinite(count) && count >= 0
				? count
				: 0;
		} catch (error) {
			console.error(
				`[Toolbar] ${viewMode} getDataCount() 執行失敗：`,
				error
			);
			return 0;
		}
	}

  var dataCount = modeDataCount();

	// 取得目前應顯示的 Toolbar 插件
	const toolbarPlugins = Object.entries(window.plugins)
		.filter(([, p]) => {
			//// if (!p.icon || p.hideToolbar) return false;
			if (!p.icon) return false;

			const hidden = typeof p.hideToolbar === 'function'
				? p.hideToolbar()
				: p.hideToolbar === true;

			if (hidden) return false;

			// bottom / top 為全域插件，不受 mode 限制
			if (p.toolbarPosition === 'top' ||
				p.toolbarPosition === 'bottom') {
				return typeof p.open === 'function' || (Array.isArray(p.children) && p.children.length > 0);
			}
			
			// middle 為一般子插件
			if (p.mode !== viewMode) return false;
			if (p.requiresData === 'sort') return dataCount >= 2;
			if (p.requiresData) return dataCount >= 1;
			//// 
			//// return true;
			return p.mode === viewMode;
		});

	// 根據 toolbarPosition 建立按鈕
	function renderPluginButtons(position) {
		toolbarPlugins
			.filter(([, p]) =>
				(p.toolbarPosition ?? 'middle') === position
			)
			.sort(([, a], [, b]) =>
				(a.order ?? 99) - (b.order ?? 99)
			)
			.forEach(([name, p]) => {
				const btn = addBtn(
					p.icon,
					p,
					() => {
                        if (Array.isArray(p.children) && p.children.length) {
                            toggleToolbarSubmenu(btn, p.children);
                        } else if (typeof p.open === 'function') {
                            p.open();
                        }
                    }
				);
				
				// Plugin 可提供固定數字或函式；未設定、0、無效值均不顯示。
                const rawCount = typeof p.showCount === 'function'
                    ? p.showCount()
                    : p.showCount;
                const count = Number(rawCount);
                if (rawCount == null || rawCount === '' ||
                    !Number.isFinite(count) || count <= 0) return;

                const total = Math.trunc(count);
                const key = JSON.stringify([viewMode, name]);
                const maxDisplay = p.maxDisplay ?? null;
                const previous = previousBadges.get(key);
                if (previous && previous.maxDisplay !== maxDisplay) previous.animation?.reset();
                const state = previous?.maxDisplay === maxDisplay
                    ? previous : { badge: document.createElement('span'), maxDisplay };
                const { badge } = state;
                badge.className = 'tb-count';
                badge.setAttribute('aria-hidden', 'true');
                btn.appendChild(badge);
                btn.setAttribute('aria-label', `${p.label || name}：${total}`);
                toolbarBadgeStates.set(key, state);
                previousBadges.delete(key);

                if (state.total !== total) {
                    if (state.animation && state.animation.frameVal !== total) {
                        state.animation.update(total);
                    } else if (!state.animation && state.total === undefined && typeof window.CountUp === 'function') {
                        state.animation = new window.CountUp(badge, 0, total, 0, 2.5, {
                            useEasing: true,
                            useGrouping: true,
                            separator: ',',
                            delay: p.delay ?? 0,
                            maxDisplay
                        });
                        state.animation.start();
                    } else {
                        state.animation?.reset();
                        state.animation = undefined;
                        badge.textContent = maxDisplay != null && maxDisplay !== '' && total > Number(maxDisplay)
                            ? Number(maxDisplay).toLocaleString('en-US') + '+'
                            : total.toLocaleString('en-US');
                    }
                    state.total = total;
                }
			});
	}

	// 上方插件
	renderPluginButtons('top');

	if (tbAlign === 'center') {
		const spacerBefore = document.createElement('div');
		spacerBefore.className = 'tb-spacer tb-spacer-clean';
		toolbar.appendChild(spacerBefore);
	}
	addBtn('mainmenu', '選單', function() { toggleMainMenu(toolbar); });

	// 中間插件
	renderPluginButtons('middle');

	// 底部區域需要彈性空間
	const hasBottomPlugins = toolbarPlugins.some(
		([, p]) => p.toolbarPosition === 'bottom'
	);

	if (hasBottomPlugins) {
		const spacer = document.createElement('div');
		spacer.className = 'tb-spacer';
		toolbar.appendChild(spacer);
	}

	// 底部插件
	renderPluginButtons('bottom');

  for (const state of previousBadges.values()) state.animation?.reset();
	document.body.appendChild(toolbar);
}

/* =============================================
   Shared Toolbar Submenu (all four positions)
   Plugin API: children: [{ label, icon, open, disabled? }]
   ============================================= */
let toolbarSubmenu = null;
function closeToolbarSubmenu() {
  if (!toolbarSubmenu) return;
  const state = toolbarSubmenu;
  toolbarSubmenu = null;
  state.cleanup();
  if (state.parentBadge) state.button.appendChild(state.parentBadge);
  state.menu.remove();
  state.button.classList.remove('tb-submenu-active', 'tb-submenu-count-open');
  state.button.setAttribute('aria-expanded', 'false');
}
function toggleToolbarSubmenu(button, children) {
  if (toolbarSubmenu?.button === button) { closeToolbarSubmenu(); return; }
  closeToolbarSubmenu();
  const menu = document.createElement('div');
  menu.className = 'tb-submenu';
  menu.setAttribute('role', 'menu');
  menu.dataset.position = tbPos;
  // Follow the same toolbarLabels setting used by the main Toolbar.
  // Inline sizing avoids depending on a newer base.css for icon-only menus.
  if (!tbLabels) {
    menu.style.minWidth = '0';
    menu.style.width = 'auto';
    menu.style.alignItems = 'center';
  }
  const actions = [];
  let parentBadge;
  children.forEach(item => {
    if (!item || item.hidden === true || (typeof item.hidden === 'function' && item.hidden())) return;
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'tb-submenu-item';
    action.setAttribute('role', 'menuitem');
    //action.title = item.label || '';
	const getLabel = () =>
		typeof item.label === 'function'
			? item.label()
			: item.label || '';

	action.dataset.tooltip = getLabel();
    action.setAttribute('aria-label', getLabel());

	action.addEventListener('mouseenter', () => {
		action.dataset.tooltip = getLabel();
	});

    if (!tbLabels) {
      action.style.width = '36px';
      action.style.height = '36px';
      action.style.minHeight = '36px';
      action.style.padding = '0';
      action.style.justifyContent = 'center';
    }
    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'tb-submenu-icon';
      if (typeof item.icon === 'string') icon.innerHTML = item.icon;
      else icon.appendChild(item.icon.cloneNode(true));
      action.appendChild(icon);
    }
    if (tbLabels) {
      const label = document.createElement('span');
      label.textContent = getLabel();
      action.appendChild(label);
    }
    const badgeToMove = item.receivesParentCount && !parentBadge
      ? button.querySelector('.tb-count') : null;
    const count = Math.trunc(Number(item.showCount?.()));
    if (badgeToMove) {
      parentBadge = badgeToMove;
      action.appendChild(parentBadge);
      menu.classList.add('has-count');
      if (Number.isFinite(count) && count > 0) {
        action.setAttribute('aria-label', getLabel() + '，' + count + ' 項待處理');
      }
    } else if (Number.isFinite(count) && count > 0) {
      const badge = document.createElement('span');
      badge.className = 'tb-count';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = String(count);
      action.appendChild(badge);
      action.setAttribute('aria-label', getLabel() + '，' + count + ' 項待處理');
      menu.classList.add('has-count');
    }
    action.disabled = typeof item.disabled === 'function' ? !!item.disabled() : !!item.disabled;
    action.addEventListener('click', () => {
      closeToolbarSubmenu();
      if (typeof item.open === 'function') item.open();
    });
    menu.appendChild(action);
    actions.push(action);
  });
  if (!actions.length) return;
  document.body.appendChild(menu); // avoid toolbar overflow clipping
  button.classList.toggle('tb-submenu-count-open', menu.classList.contains('has-count'));
  button.classList.add('tb-submenu-active');
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'true');
  const position = () => {
    if (!button.isConnected) { closeToolbarSubmenu(); return; }
    const b = button.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const gap = 8, margin = 8;
    let x, y;
    if (tbPos === 'left') { x = b.right + gap; y = b.top + (b.height - m.height)/2; }
    else if (tbPos === 'right') { x = b.left - m.width - gap; y = b.top + (b.height - m.height)/2; }
    else if (tbPos === 'top') { x = b.left + (b.width-m.width)/2; y = b.bottom + gap; }
    else { x = b.left + (b.width-m.width)/2; y = b.top - m.height - gap; }
    x = Math.max(margin, Math.min(x, window.innerWidth-m.width-margin));
    y = Math.max(margin, Math.min(y, window.innerHeight-m.height-margin));
    menu.style.left = x+'px'; menu.style.top = y+'px';
  };
  const outside = e => { if (!menu.contains(e.target) && !button.contains(e.target)) closeToolbarSubmenu(); };
  const keydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); closeToolbarSubmenu(); button.focus(); return; }
    if (!menu.contains(document.activeElement)) return;
    if (!['ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const enabled = actions.filter(a=>!a.disabled);
    const current = enabled.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? enabled.length-1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
    enabled[next]?.focus();
  };
  const onScroll = () => position();
  const cleanup = () => {
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', keydown, true);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', onScroll, true);
  };
  toolbarSubmenu = {menu,button,cleanup,parentBadge};
  position();
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', keydown, true);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', onScroll, true);
}


const resolveIcon = (() => {
    // 閉包內共用，不會因為重複呼叫而重新建立
    const generatedColors = new Set();

    const safeName = /^[A-Za-z][A-Za-z0-9_-]*$/;
    const safeHex = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

    return function (value, color = null, size = null) {
        if (typeof value !== 'string') return '';

        const icon = value.trim();
        if (!icon) return '';

        // 相容舊版 SVG HTML 或已轉換的 span HTML
        // 注意：只適用於程式內可信任的圖示設定
        if (icon.startsWith('<')) {
            return value;
        }

        // 驗證圖示名稱
        if (!safeName.test(icon)) {
            console.warn('[Icon] Invalid icon name:', icon);
            return '';
        }

        let colorAttr = '';

        if (typeof color === 'string' && color.trim()) {
            const c = color.trim();

            if (safeHex.test(c)) {
                // HEX 色碼統一轉小寫
                const hex = c.toLowerCase();

                // 同一色碼只產生一次 CSS 規則
                if (!generatedColors.has(hex)) {
                    const style = document.createElement('style');

                    style.textContent =
                        `[data-svgicon][data-svgcolor="${hex}"]` +
                        `{color:${hex};}`;

                    document.head.appendChild(style);
                    generatedColors.add(hex);
                }

                colorAttr = ` data-svgcolor="${hex}"`;
            }
            else if (safeName.test(c)) {
                // 顏色名稱由 icon.css 預先定義
                colorAttr = ` data-svgcolor="${c}"`;
            }
            else {
                console.warn('[Icon] Invalid color:', c);
            }
        }
		
		const sizeAttr = [14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96].includes(size)
			? ` data-svgsize="${size}"`
			: '';

		return `<span data-svgicon="${icon}"${colorAttr}${sizeAttr}></span>`;
    };
})();

/* =============================================
   Main Menu Popup
   ============================================= */
function toggleMainMenu(toolbar, callback) {
  var existing = document.getElementById('tbMainMenuBg');
  if (existing) {
    // 由既有選單自己的關閉函式清理監聽器。
    existing.dispatchEvent(new Event('app-menu-close'));
    return;
  }

  closeToolbarSubmenu();
  const returnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement : toolbar.querySelector('button');

  var bg = document.createElement('div');
  bg.id = 'tbMainMenuBg';
  bg.className = 'tb-menu-bg';
  // base.css 的 #toolbar 為 11001；遮罩必須在其上，才能阻止點擊背景工具列。
  // ModalManager assigns the actual layer when the menu opens.

  function closeMainMenu(restoreFocus = true) {
    if (!bg.isConnected) return;
    ModalManager.close(bg);
    bg.remove();
    if (restoreFocus && returnFocus && returnFocus.isConnected) returnFocus.focus();
  }
  bg.addEventListener('app-menu-close', () => closeMainMenu());

  var menu = document.createElement('div');
  menu.className = 'tb-menu';

  var mainPlugins = Object.entries(window.plugins)
    .filter(function(e) { return e[1].main; })
    .sort(function(a, b) { return (a[1].menuOrder || 99) - (b[1].menuOrder || 99); });

  var activeIdx = -1;
  mainPlugins.forEach(function(entry, i) {
    var name = entry[0], p = entry[1];
    var item = document.createElement('div');
    if (p.menuIcon) {
      p.menuIcon = resolveIcon(p.menuIcon, null, 28);
    }
    
    if (p.icon) {
      p.icon = resolveIcon(p.icon);
    }
  
    item.className = 'tb-menu-item' + (viewMode === name ? ' active' : '');
    item.setAttribute('tabindex', '0');
    item.dataset.idx = i;
    item.innerHTML =
      '<div class="tb-menu-icon">' + (p.menuIcon || p.icon || '') + '</div>' +
      '<div class="tb-menu-label">' + (p.label || name) + '</div>';
    item.addEventListener('click', function() {
      closeMainMenu(false);
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
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  bg.appendChild(menu);
  bg.addEventListener('click', function(e) { if (e.target === bg) closeMainMenu(); });
  document.body.appendChild(bg);
  ModalManager.open(bg, () => closeMainMenu());

  requestAnimationFrame(function() {
    if (!bg.isConnected) return;
    bg.classList.add('open');
    var items = getItems();
    var startIdx = activeIdx >= 0 ? activeIdx : 0;
    if (items[startIdx]) items[startIdx].focus();
  });
}

/* =============================================
   Initialization
   ============================================= */
const modalScriptPromises = new Map();
function loadModuleScript(name) {
  if (modalScriptPromises.has(name)) return modalScriptPromises.get(name);
  const promise = new Promise(function(resolve) {
    if (window.modalModules[name]) {
      resolve();
      return;
    }

    var s = document.createElement('script');
    s.src = 'modules/' + name + '.js';
    s.onload = resolve;
    s.onerror = function() {
      console.warn('Module ' + name + ' load failed');
      resolve();
    };
    document.head.appendChild(s);
  });
  modalScriptPromises.set(name, promise);
  return promise;
}

function getModalSourceData() {
  // `data` may be a global lexical binding supplied by another classic script.
  if (typeof data !== 'undefined' && Array.isArray(data)) return data;
  console.warn('Modal 初始化已略過：data 尚未定義或不是陣列。');
  return [];
}

function initModules(sourceData = getModalSourceData()) {
  const needed = new Set();

  sourceData.forEach(block => {
    (block.itemlist || []).forEach(group => {
      (group.item || []).forEach(it => {
        if (it.guide || it.modal === 'wsl' || it.modal === 'cicd') needed.add('guide');
        else if (it.modal) needed.add(it.modal);
      });
    });
  });

  if (needed.size === 0) {
    return Promise.resolve();
  }

  const modules = [...needed];

  // 1. 並行載入 Modal CSS
  const cssPromise = Promise.all(
    modules.map(name => loadPluginCss(name))
  );

  // 2. 並行載入 Modal JS
  const scriptsPromise = Promise.all(
    modules.map(name => loadModuleScript(name))
  );

  // 3. CSS、JS 全部載入完成後初始化
  return Promise.all([cssPromise, scriptsPromise]).then(() => {
    modules.forEach(name => {
      const mod = window.modalModules[name];

      if (mod && typeof mod.init === 'function') {
        mod.init();
      }
    });
  });
}

loadCoreScript('guard').then(function() {
  return initPlugins();
}).then(function() {
  const sourceData = getModalSourceData();
  const hasModal = sourceData.some(block =>
    (block.itemlist || []).some(group =>
      (group.item || []).some(it => !!it.modal || !!it.guide)
    )
  );

  return hasModal ? initModules(sourceData) : Promise.resolve();
}).then(function() {
  renderToolbar();
  window.niceScroll = new NiceScroll('html');
  switchMode(viewMode);
  window.dispatchEvent(new Event('site-data-ready'));
}).catch(function(error) {
  console.error('主程式初始化失敗：', error);
});

const scripts = new Map();

const libraryFiles = {
    marked: 'marked.15.0.12.min.js',
    DOMPurify: 'purify.min.js',
    hljs: 'highlight.11.9.0.min.js',
    mermaid: 'mermaid.min.js',
    CodeMirror: 'codemirror.min.js',
    fflate: 'fflate.umd.js',
    ZXingWASM: 'zxing-wasm.js',
	QRCode: 'qrcode.min.js'
};

function library(name) {
    if (window[name]) return Promise.resolve(window[name]);
    return loadLibraryScript(libraryFiles[name], () => window[name], name);
}

function loadLibraryScript(file, getExport = () => true, name = file) {

    if (!scripts.has(file)) {
        scripts.set(file, new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'libs/' + file;

            const cleanup = () => {
                clearTimeout(timer);
                script.onload = null;
                script.onerror = null;
            };

            const fail = (message) => {
                cleanup();
                script.remove();
                scripts.delete(file);
                reject(new Error(message));
            };

            const timer = setTimeout(() => {
                fail(`${name} 載入逾時（10秒）`);
            }, 10000);

            script.onload = () => {
                const exported = getExport();
                if (!exported) {
                    fail(`${name} 載入後未建立全域物件`);
                    return;
                }

                cleanup();
                resolve(exported);
            };

            script.onerror = () => {
                fail(`${name} 載入失敗`);
            };

            document.head.append(script);
        }));
    }

    return scripts.get(file);
}
async function sanitizeHtml(html, options) {
    const purify = await library('DOMPurify');
    return purify.sanitize(html, options);
}

async function loadMarkdown() {
    const [marked, purify] = await Promise.all([library('marked'), library('DOMPurify')]);
    return (text, { headingId, allowMedia = false } = {}) => {
        const renderer = headingId ? new marked.Renderer() : undefined;
        if (renderer) {
            renderer.heading = function(token) {
                const level = token.depth;
                const id = AppUtils.escHtml(headingId(token.text || ''));
                return '<h' + level + ' id="' + id + '">' +
                    this.parser.parseInline(token.tokens) + '</h' + level + '>';
            };
        }
        const html = marked.parse(text, { renderer, async: false });
        return purify.sanitize(html, {
            RETURN_DOM_FRAGMENT: true,
            USE_PROFILES: { html: true },
            FORBID_TAGS: allowMedia
                ? ['form', 'style', 'link']
                : ['img', 'audio', 'video', 'source', 'picture', 'form', 'style', 'link'],
            FORBID_ATTR: allowMedia ? ['style'] : ['style', 'src', 'srcset']
        });
    };
}

async function markdown(text) {
    const render = await loadMarkdown();
    return render(text);
}

async function loadHighlightWithLineNumbers() {
    const hljs = await library('hljs');
    if (!hljs.lineNumbersBlock) {
        await loadLibraryScript('highlightjs-line-numbers.min.js', () => hljs.lineNumbersBlock);
    }
    return hljs;
}

function getCmModeFiles(codeLang) {
  var map = {
    javascript: ['mode/javascript/javascript.min.js'],
    typescript: ['mode/javascript/javascript.min.js'],
    json: ['mode/javascript/javascript.min.js'],
    css: ['mode/css/css.min.js'],
    csharp: ['mode/clike/clike.min.js'],
    bash: ['mode/shell/shell.min.js'],
    python: ['mode/python/python.min.js'],
    markdown: ['mode/xml/xml.min.js','mode/markdown/markdown.min.js'],
    html: ['mode/xml/xml.min.js','mode/javascript/javascript.min.js','mode/css/css.min.js','mode/htmlmixed/htmlmixed.min.js'],
    sql: ['mode/sql/sql.min.js'],
    xml: ['mode/xml/xml.min.js'],
    yaml: ['mode/yaml/yaml.min.js'],
    ini: ['mode/properties/properties.js']
  };
  return map[codeLang] || [];
}


let codeMirrorStylesAdded = false;

async function loadCodeMirror(codeLang) {
    if (!codeMirrorStylesAdded) {
        for (const file of ['codemirror.min.css', 'theme/material-darker.min.css', 'theme/eclipse.min.css']) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'libs/' + file;
            document.head.append(link);
        }
        codeMirrorStylesAdded = true;
    }
    const editor = await library('CodeMirror');
    for (const file of getCmModeFiles(codeLang)) {
        await loadLibraryScript(file);
    }
    return editor;
}

// 通用的 LocalStorage 處理器
const AppStorage = {
  // 核心驗證與預設值處理方法（內部抽離出來的共用邏輯）
  _getValidKey(keylist, key) {
    if (!Array.isArray(keylist) || keylist.length === 0) {
      console.error("[儲存錯誤] 子項目未定義合法的 storageKeys 陣列");
      return null;
    }
    
    // 1. 如果沒傳 key (undefined)，自動套用 keylist 的第一個元素
    if (key === undefined) {
      return keylist[0];
    }
    
    // 2. 如果有傳 key，去檢查是否在定義的 keylist 清單中
    if (!keylist.includes(key)) {
      console.error(`[儲存錯誤] 嘗試操作未定義的 Key: "${key}"。允許的清單為:`, keylist);
      return null;
    }
    
    return key;
  },

  load(keylist, key) {
    const validKey = this._getValidKey(keylist, key);
    if (!validKey) return null; // 💡 改為回傳 null，方便上層判斷並給予自訂物件預設值
    try {
      const raw = AccountStorage.getItem(validKey);
      if (!raw) return null;
      
      // 💡 嘗試解析 JSON，如果不是陣列也不是物件（例如純字串），會進入 catch 處理
      const d = JSON.parse(raw);
      return d; 
    } catch (_) { 
      // 💡 如果是純字串（如 'top', 'scroll'），JSON.parse 會失敗，這裡直接回傳原始字串
      return AccountStorage.getItem(validKey);
    }
  },

  save(keylist, arr, key) {
    const validKey = this._getValidKey(keylist, key);
    if (!validKey) return;
    try {
      // 💡 如果要存的是字串，就直接存；是物件或陣列才轉成 JSON 字串
      const valueToSave = (typeof arr === 'string') ? arr : JSON.stringify(arr);
      AccountStorage.setItem(validKey, valueToSave);
    } catch (e) {
      console.error(`儲存 ${validKey} 失敗:`, e);
    }
  }
};

const AppUtils = {
  /**
   * 防止 XSS 攻擊的 HTML 轉義工具
   */
  escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;'); // 順便補上單引號轉義，防禦更嚴密
  },

  /**
   * 未來可能會加進來的工具 1：格式化日期
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  /**
   * 未來可能會加進來的工具 2：剪貼簿複製
   */
  copyToClipboard(text) {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => false);
  }
};
