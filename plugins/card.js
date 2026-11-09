registerPlugin('card', {
  main: true,
  menuOrder: 1,
  menuIcon: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M22 3c.53 0 1.039.211 1.414.586s.586.884.586 1.414v14c0 .53-.211 1.039-.586 1.414s-.884.586-1.414.586h-20c-.53 0-1.039-.211-1.414-.586s-.586-.884-.586-1.414v-14c0-.53.211-1.039.586-1.414s.884-.586 1.414-.586h20zm1 8h-22v8c0 .552.448 1 1 1h20c.552 0 1-.448 1-1v-8zm-15 5v1h-5v-1h5zm13-2v1h-3v-1h3zm-10 0v1h-8v-1h8zm-10-6v2h22v-2h-22zm22-1v-2c0-.552-.448-1-1-1h-20c-.552 0-1 .448-1 1v2h22z"/></svg>',
  icon: window.CARD_ICONS.add,
  label: '卡片',
  mode: 'card',
  order: 5,
  open: null,
  favicon: function(canvas, ctx) {
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(28, 15); ctx.lineTo(24, 15);
    ctx.lineTo(24, 27); ctx.lineTo(19, 27); ctx.lineTo(19, 20);
    ctx.lineTo(13, 20); ctx.lineTo(13, 27); ctx.lineTo(8, 27);
    ctx.lineTo(8, 15); ctx.lineTo(4, 15); ctx.closePath();
    ctx.fill();
  },

  render: null,

  init() {
    // ── Data Management ───────────────────────────────────────────
    const STORAGE_KEY = "card_order";
    const SITE_DATA_KEY = "site_data";

    function loadData() {
      try {
        const saved = localStorage.getItem(SITE_DATA_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) { }
      const initial = JSON.parse(JSON.stringify(defaultData));
      localStorage.setItem(SITE_DATA_KEY, JSON.stringify(initial));
      return initial;
    }

    function saveData() {
      localStorage.setItem(SITE_DATA_KEY, JSON.stringify(data));
      if (typeof renderToolbar === 'function') renderToolbar();
    }

    var data = loadData();

    function loadOrder() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr) && arr.length === data.length) return arr;
        }
      } catch (e) { }
      return data.map((_, i) => i + 1);
    }

    var currentOrder = loadOrder();
    var pendingOrder = [];

    function resolveIconSrc(icon) {
      if (!icon) return '';
      if (icon.startsWith('data:')) return icon;
      return 'image/icon/' + icon + '.png';
    }

    // ── renderGrid ────────────────────────────────────────────────
    var BROKEN_ICON_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--text-dim)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".4"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="3" x2="21" y2="21"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

    function renderGrid() {
      if (typeof window.totpBeforeRender === 'function') window.totpBeforeRender();

      const wrapper = document.getElementById("card-wrapper");
      wrapper.innerHTML = "";

      if (data.length === 0) {
        if (typeof window.totpAfterRender === 'function') window.totpAfterRender();
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'card-empty';
        emptyDiv.innerHTML = '<div class="card-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M22 3c.53 0 1.039.211 1.414.586s.586.884.586 1.414v14c0 .53-.211 1.039-.586 1.414s-.884.586-1.414.586h-20c-.53 0-1.039-.211-1.414-.586s-.586-.884-.586-1.414v-14c0-.53.211-1.039.586-1.414s.884-.586 1.414-.586h20zm1 8h-22v8c0 .552.448 1 1 1h20c.552 0 1-.448 1-1v-8zm-15 5v1h-5v-1h5zm13-2v1h-3v-1h3zm-10 0v1h-8v-1h8zm-10-6v2h22v-2h-22zm22-1v-2c0-.552-.448-1-1-1h-20c-.552 0-1 .448-1 1v2h22z"/></svg></div><div>尚無卡片</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div>';
        wrapper.appendChild(emptyDiv);
        return;
      }

      currentOrder.forEach((oneBasedIdx, pos) => {
        const block = data[oneBasedIdx - 1];
        const container = document.createElement("div");
        container.className = "list-container";

        const main = document.createElement("div");
        main.className = "list-main";

        const left = document.createElement("div");
        left.className = "list-icon";
        var iconSrc = resolveIconSrc(block.icon);
        var iconDiv;
        if (iconSrc) {
          iconDiv = document.createElement("img");
          iconDiv.className = "icon-pic";
          iconDiv.src = iconSrc;
          iconDiv.alt = block.title;
          iconDiv.onerror = function () {
            var placeholder = document.createElement("div");
            placeholder.className = "icon-pic";
            placeholder.innerHTML = BROKEN_ICON_SVG;
            this.replaceWith(placeholder);
          };
        } else {
          iconDiv = document.createElement("div");
          iconDiv.className = "icon-pic";
          iconDiv.innerHTML = BROKEN_ICON_SVG;
        }
        const titleDiv = document.createElement("div");
        titleDiv.className = "icon-title";
        titleDiv.textContent = block.title;
        const typeDiv = document.createElement("div");
        typeDiv.dataset.type = block.type;
        typeDiv.textContent = block.type;

        left.appendChild(iconDiv);
        left.appendChild(titleDiv);
        left.appendChild(typeDiv);

        const right = document.createElement("div");
        right.className = "list-content";

        block.itemlist.forEach(itemGroup => {
          const ul = document.createElement("ul");
          ul.dataset.area = itemGroup.name;
          ul.classList.add("item-group");

          itemGroup.item.forEach(it => {
            if (it._hidden) return;
            if (typeof window.totpSkipItem === 'function' && window.totpSkipItem(it)) return;
            const li = document.createElement("li");

            if (it.link) {
              const a = document.createElement("a");
              a.href = it.link;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              const svg = createSvgIcon("link", null, CARD_ICONS.link);
              li.dataset.tooltip = it.link;
              li.classList.add('has-tooltip');
              li.addEventListener('mouseenter', function () {
                const rect = li.getBoundingClientRect();
                if (rect.top < 70) li.classList.add('to-bottom');
                else li.classList.remove('to-bottom');
              });
              a.appendChild(svg);
              li.appendChild(a);
            }

            if (it.user) {
              const svg = createSvgIcon("user", it.user, CARD_ICONS.user);
              li.dataset.tooltip = it.user;
              li.dataset.copyContent = it.user;
              li.classList.add('has-tooltip');
              li.addEventListener('mouseenter', function () {
                const rect = li.getBoundingClientRect();
                if (rect.top < 70) li.classList.add('to-bottom');
                else li.classList.remove('to-bottom');
              });
              li.appendChild(svg);
            }

            if (it.key) {
              const svg = createSvgIcon("key", it.key, CARD_ICONS.key);
              li.dataset.copyContent = it.key;
              li.appendChild(svg);
            }

            if (it.db) {
              const svg = createSvgIcon("db", it.db, CARD_ICONS.db);
              li.dataset.copyContent = it.db;
              li.appendChild(svg);
            }

            if (it.ssh) {
              const svg = createSvgIcon("ssh", it.ssh, CARD_ICONS.ssh);
              li.dataset.tooltip = it.ssh;
              li.dataset.copyContent = it.ssh;
              li.classList.add('has-tooltip');
              li.addEventListener('mouseenter', function () {
                const rect = li.getBoundingClientRect();
                if (rect.top < 70) li.classList.add('to-bottom');
                else li.classList.remove('to-bottom');
              });
              li.appendChild(svg);
            }

            if (it.modal) {
              const mod = window.modalModules[it.modal];
              if (mod && typeof mod.createTrigger === 'function') {
                const trigger = mod.createTrigger(it[it.modal] || it.modal, createSvgIcon);
                li.appendChild(trigger);
              } else {
                const lock = document.createElement('a');
                lock.href = '#';
                lock.className = 'modal-missing';
                lock.textContent = '🔒';
                lock.title = '缺少模組: modules/' + it.modal + '.js';
                lock.addEventListener('click', (e) => {
                  e.preventDefault();
                  showToast('缺少模組: modules/' + it.modal + '.js');
                });
                li.appendChild(lock);
              }
            }

            if (it.totp) {
              if (typeof window.totpRenderItem === 'function') {
                window.totpRenderItem(li, it.totp);
              }
            }

            ul.appendChild(li);
          });
          right.appendChild(ul);
        });

        main.appendChild(left);
        main.appendChild(right);
        container.appendChild(main);

        if (typeof window.totpRenderCard === 'function') window.totpRenderCard(container, block);

        container.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (typeof window.showCardContextMenu === 'function') {
            window.showCardContextMenu(e.clientX, e.clientY, oneBasedIdx);
          }
        });

        wrapper.appendChild(container);
      });

      if (typeof window.totpAfterRender === 'function') window.totpAfterRender();
      resizeQuicksand("#card-wrapper", "#card-wrapper");
    }

    // ── resizeQuicksand ───────────────────────────────────────────
    function resizeQuicksand(parentSelector, targetSelector) {
      const parent = document.querySelector(parentSelector);
      const target = document.querySelector(targetSelector);
      if (!parent || !target) return;
      const cards = Array.from(target.querySelectorAll('.list-container'));
      if (!cards.length) return;
      const containerRect = target.getBoundingClientRect();
      const oldRects = cards.map(el => ({
        top: el.getBoundingClientRect().top - containerRect.top,
        left: el.getBoundingClientRect().left - containerRect.left,
        width: el.offsetWidth, height: el.offsetHeight
      }));
      const oldHeight = target.offsetHeight;
      target.style.position = "relative";
      target.style.height = oldHeight + "px";
      cards.forEach((el, i) => { const r = oldRects[i]; el.style.position = "absolute"; el.style.top = r.top + "px"; el.style.left = r.left + "px"; });
      target.style.height = "auto";
      cards.forEach(el => el.style.position = "");
      const newRects = cards.map(el => ({
        top: el.getBoundingClientRect().top - containerRect.top,
        left: el.getBoundingClientRect().left - containerRect.left
      }));
      const newHeight = target.scrollHeight;
      target.style.height = oldHeight + "px";
      cards.forEach((el, i) => { const r = oldRects[i]; el.style.position = "absolute"; el.style.top = r.top + "px"; el.style.left = r.left + "px"; });
      const duration = 600;
      const start = performance.now();
      function easeInOutQuart(t) { return t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2, 4)/2; }
      function animate(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = easeInOutQuart(p);
        target.style.height = oldHeight + (newHeight - oldHeight) * eased + "px";
        cards.forEach((el, i) => {
          const from = oldRects[i], to = newRects[i];
          el.style.top = from.top + (to.top - from.top) * eased + "px";
          el.style.left = from.left + (to.left - from.left) * eased + "px";
        });
        if (p < 1) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    }

    var _resizeTimer;
    window.addEventListener("resize", function() {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function() { resizeQuicksand("#card-wrapper", "#card-wrapper"); }, 80);
    });

    // ── initModules ───────────────────────────────────────────────
    function loadModuleScript(name) {
      return new Promise(function(resolve) {
        if (window.modalModules[name]) { resolve(); return; }
        var s = document.createElement('script');
        s.src = 'modules/' + name + '.js';
        s.onload = resolve;
        s.onerror = function() { console.warn('Module ' + name + ' load failed'); resolve(); };
        document.head.appendChild(s);
      });
    }

    function initModules() {
      var needed = new Set();
      data.forEach(function(block) {
        block.itemlist.forEach(function(group) {
          group.item.forEach(function(it) { if (it.modal) needed.add(it.modal); });
        });
      });
      return Promise.all([...needed].map(function(name) { return loadModuleScript(name); })).then(function() {
        Object.values(window.modalModules).forEach(function(mod) {
          if (typeof mod.init === 'function') mod.init();
        });
      });
    }

    // ── Expose globals for sub-plugins ────────────────────────────
    window.STORAGE_KEY = STORAGE_KEY;
    window.data = data;
    window.currentOrder = currentOrder;
    window.pendingOrder = pendingOrder;
    window.loadData = loadData;
    window.saveData = saveData;
    window.loadOrder = loadOrder;
    window.resolveIconSrc = resolveIconSrc;
    window.renderGrid = renderGrid;
    window.initModules = initModules;

    // ── render method ─────────────────────────────────────────────
    var self = this;
    this.render = function(wrapper) {
      var countdown = document.querySelector('.countdown-container');
      if (countdown) countdown.style.display = 'none';
      setModeFavicon('card');
      renderGrid();
    };

    // ── Card Manager ──────────────────────────────────────────────
    let editingIdx = null; // null = add mode, number = edit mode (0-based)

    // ── 1. Inject CSS ──────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      #cardMgrModalBg { position:fixed; inset:0; backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .3s; z-index:300 }
      #cardMgrModalBg.open { opacity:1; pointer-events:all }
      .card-mgr-modal { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:28px; width:min(580px, 94vw); max-height:90vh; overflow-y:auto; transform:translateY(20px) scale(.97); transition:transform .35s cubic-bezier(.22,1,.36,1); display:flex; flex-direction:column; gap:16px; scrollbar-width:thin; scrollbar-color:#555 #1e1e1e }
      #cardMgrModalBg.open .card-mgr-modal { transform:translateY(0) scale(1) }

      .cm-field { display:flex; flex-direction:column; gap:4px }
      .cm-field label { font-size:12px; color:var(--text-dim); font-family:'IBM Plex Mono',monospace }
      .cm-field input, .cm-field select { padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface2); color:var(--text-dim); font-size:13px; outline:none }
      .cm-field input:focus, .cm-field select:focus { border-color:var(--accent) }
      .cm-group { border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:8px; position:relative }
      .cm-group-header { display:flex; align-items:center; gap:8px; margin-bottom:8px }
      .cm-item-row { display:flex; gap:6px; margin-bottom:4px; align-items:center }
      .cm-item-row select { width:80px; padding:6px; border-radius:6px; border:1px solid var(--border); background:var(--surface2); color:var(--text-dim); font-size:12px }
      .cm-item-row input { flex:1; padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface2); color:var(--text-dim); font-size:12px }
      .cm-btn { padding:6px 12px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--accent); cursor:pointer; font-size:12px; transition:background .15s }
      .cm-btn:hover { background:rgba(81,203,238,.1) }
      .cm-btn-danger { color:var(--danger); border-color:var(--danger) }
      .cm-btn-danger:hover { background:rgba(229,57,53,.1) }
      .cm-eye-btn { padding:4px 6px !important; font-size:13px !important }
      .cm-item-hidden { opacity:.4 }
      .cm-item-hidden select, .cm-item-hidden input { text-decoration:line-through }

      .cm-sort-popup-bg{position:fixed;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;z-index:450}
      .cm-sort-popup{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;width:min(340px,88vw);max-height:70vh;display:flex;flex-direction:column;gap:12px}
      .cm-sort-popup h3{font-size:13px;color:var(--accent3);margin:0;display:flex;align-items:center;justify-content:space-between;white-space:nowrap}
      .cm-sort-popup h3 .close-btn{margin-left:auto;flex-shrink:0}
      .cm-sort-list{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto}
      .cm-sort-row{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:8px;cursor:grab;user-select:none;transition:border-color .15s, background .15s}
      .cm-sort-row:hover{border-color:#555}
      .cm-sort-row.selected{border-color:var(--accent);background:rgba(232,255,71,.06)}
      .cm-sort-row.drag-over{border-top:2px solid var(--accent)}
      .cm-sort-num{width:20px;height:20px;border-radius:5px;background:var(--border);color:#0f0f0f;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'IBM Plex Mono',monospace}
      .cm-sort-row.selected .cm-sort-num{background:var(--accent)}
      .cm-sort-label{flex:1;font-size:12px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .cm-sort-type{font-size:10px;color:var(--accent2);font-family:'IBM Plex Mono',monospace}
      .cm-btn-save { background:var(--accent); color:#fff; border:none; padding:12px; border-radius:10px; font-weight:600; cursor:pointer; font-size:14px }
      .cm-btn-save:hover { opacity:.88 }
      .cm-icon-preview { width:48px; height:48px; border-radius:8px; border:1px solid var(--border); background:var(--surface2); object-fit:contain; display:none }
      .cm-paste-area { border:1.5px dashed var(--border); border-radius:8px; padding:8px; text-align:center; cursor:pointer; color:var(--text-dim); font-size:11px; transition:border-color .2s }
      .cm-paste-area:hover { border-color:var(--accent) }

      .card-ctx-menu { position:fixed; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:4px 0; z-index:500; min-width:120px; box-shadow:0 4px 16px rgba(0,0,0,.4) }
      #cmConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:400}
      #cmConfirmBg.open{opacity:1;pointer-events:all}
      .cm-confirm{background:var(--surface);border:1px solid var(--danger);border-radius:12px;padding:24px;width:min(400px,90vw);display:flex;flex-direction:column;gap:16px}
      .cm-confirm-msg{font-size:14px;color:var(--text-dim);line-height:1.5;text-align:center}
      .cm-confirm-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px}
      .cm-confirm-card img{width:32px;height:32px;border-radius:6px;object-fit:contain;flex-shrink:0}
      .cm-confirm-card-body{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
      .cm-confirm-card-name{font-size:14px;font-weight:500;color:var(--text)}
      .cm-confirm-card-mark{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
      .cm-confirm-card-mark .sort-type{font-size:9px}
      .cm-confirm-card-mark .sort-icon{font-size:9px}
      .cm-confirm-card-mark code{font-size:9px;padding:2px 5px;border-radius:4px;background:rgba(108,63,224,.12);color:var(--accent2);border:1px solid rgba(108,63,224,.25);font-family:'IBM Plex Mono',monospace}
      .cm-confirm-actions{display:flex;gap:10px}
      .cm-confirm-actions button{flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;transition:opacity .15s}
      .cm-confirm-cancel{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border) !important}
      .cm-confirm-cancel:hover{opacity:.8}
      .cm-confirm-delete{background:var(--danger);color:#fff}
      .cm-confirm-delete:hover{opacity:.85}
      .card-ctx-menu button { display:block; width:100%; padding:8px 16px; background:none; border:none; color:var(--text-dim); text-align:left; cursor:pointer; font-size:13px }
      .card-ctx-menu button:hover { background:var(--surface2); color:var(--text) }
    `;
    document.head.appendChild(style);

    // ── 2. Inject modal HTML ───────────────────────────────────────
    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = `
      <div id="cardMgrModalBg">
        <div class="card-mgr-modal">
		  <div class="modal-header">
          <h2 id="cardMgrTitle">
		  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
		  新增卡片</h2>
		  <button class="close-btn" id="cardMgrCloseBtn">✕</button>
		  </div>
          <div class="cm-field">
            <label>Icon</label>
            <div style="display:flex;gap:10px;align-items:flex-end">
              <img id="cmIconPreview" class="cm-icon-preview">
              <div id="cmPasteArea" class="cm-paste-area" tabindex="0" style="flex:1">Ctrl+V 貼上圖片，或點擊選擇檔案</div>
            </div>
            <input type="file" id="cmIconFile" accept="image/*" style="display:none">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
            <div class="cm-field">
              <label>Title</label>
              <input id="cmTitle" type="text" placeholder="卡片名稱">
            </div>
            <div class="cm-field">
              <label>Type</label>
              <select id="cmType">
                <option value="PIC">PIC</option>
                <option value="UAT">UAT</option>
                <option value="PROD">PROD</option>
                <option value="LOCAL">LOCAL</option>
              </select>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
              <label style="font-size:12px; color:var(--text-dim)">群組 (itemlist)</label>
              <div style="display:flex;gap:6px">
                <button class="cm-btn" id="cmSortGroups" title="排序群組">⇅</button>
                <button class="cm-btn" id="cmAddGroup">+ 新增群組</button>
              </div>
            </div>
            <div id="cmGroups"></div>
          </div>

          <button class="cm-btn-save" id="cmSaveBtn">儲存</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrapper.firstElementChild);

    const confirmEl = document.createElement('div');
    confirmEl.innerHTML = `
      <div id="cmConfirmBg">
        <div class="cm-confirm">
          <div class="cm-confirm-msg">確定要刪除這張卡片？</div>
          <div class="cm-confirm-card" id="cmConfirmCard"></div>
          <div class="cm-confirm-actions">
            <button class="cm-confirm-cancel" id="cmConfirmCancel">取消</button>
            <button class="cm-confirm-delete" id="cmConfirmDelete">刪除</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(confirmEl.firstElementChild);

    const confirmBg = document.getElementById('cmConfirmBg');
    let pendingDeleteIdx = null;

    function showDeleteConfirm(oneBasedIdx) {
      pendingDeleteIdx = oneBasedIdx;
      var card = data[oneBasedIdx - 1];
      var cardEl = document.getElementById('cmConfirmCard');
      if (!card) { cardEl.innerHTML = ''; confirmBg.classList.add('open'); return; }

      var iconSrc = (typeof resolveIconSrc === 'function') ? resolveIconSrc(card.icon) : '';
      var groupTags = card.itemlist.map(function(g) {
        return '<div class="sort-icon" data-area="' + (g.name || '') + '">' + (g.name || '未命名') + '</div>';
      }).join('');
      var modals = new Set();
      card.itemlist.forEach(function(g) {
        g.item.forEach(function(it) { if (it.modal) modals.add(it.modal); });
      });
      var modalTags = Array.from(modals).map(function(m) { return '<code>' + m + '</code>'; }).join('');

      cardEl.innerHTML =
        '<img src="' + iconSrc + '" onerror="this.style.display=\'none\'">' +
        '<div class="cm-confirm-card-body">' +
          '<div class="cm-confirm-card-name">' + card.title + '</div>' +
          '<div class="cm-confirm-card-mark">' +
            '<div class="sort-type" data-type="' + card.type + '">' + card.type + '</div>' +
            groupTags + modalTags +
          '</div>' +
        '</div>';

      confirmBg.classList.add('open');
    }

    document.getElementById('cmConfirmCancel').addEventListener('click', () => {
      confirmBg.classList.remove('open');
      pendingDeleteIdx = null;
    });
    confirmBg.addEventListener('click', e => {
      if (e.target === confirmBg) { confirmBg.classList.remove('open'); pendingDeleteIdx = null; }
    });
    document.getElementById('cmConfirmDelete').addEventListener('click', () => {
      confirmBg.classList.remove('open');
      if (pendingDeleteIdx === null) return;
      var oneBasedIdx = pendingDeleteIdx;
      pendingDeleteIdx = null;
      var dataIdx = oneBasedIdx - 1;
      data.splice(dataIdx, 1);
      saveData();
      currentOrder = currentOrder.filter(function (i) { return i !== oneBasedIdx; }).map(function (i) { return i > oneBasedIdx ? i - 1 : i; });
      localStorage.setItem('card_order', JSON.stringify(currentOrder));
      renderGrid();
      showToast('卡片已刪除');
    });

    // ── 3. References ──────────────────────────────────────────────
    const modalBg    = document.getElementById('cardMgrModalBg');
    const closeBtn   = document.getElementById('cardMgrCloseBtn');
    const titleEl    = document.getElementById('cardMgrTitle');
    const iconPreview= document.getElementById('cmIconPreview');
    const pasteArea  = document.getElementById('cmPasteArea');
    const iconFileIn = document.getElementById('cmIconFile');
    const typeSelect = document.getElementById('cmType');
    const titleInput = document.getElementById('cmTitle');
    const groupsDiv  = document.getElementById('cmGroups');
    const addGroupBtn= document.getElementById('cmAddGroup');
    const saveBtn    = document.getElementById('cmSaveBtn');

    let iconValue = '';

    function updateIconPreview() {
      if (!iconValue) {
        iconPreview.style.display = 'none';
        return;
      }
      iconPreview.src = iconValue.startsWith('data:') ? iconValue : resolveIconSrc(iconValue);
      iconPreview.style.display = 'block';
    }

    function compressImage(dataUrl, cb) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX = 96;
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    }

    function handleImageFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        compressImage(e.target.result, function(compressed) {
          iconValue = compressed;
          pasteArea.textContent = '已貼上自訂圖片';
          updateIconPreview();
          cardMark();
        });
      };
      reader.readAsDataURL(file);
    }

    function handlePaste(e) {
      if (!modalBg.classList.contains('open')) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          handleImageFile(items[i].getAsFile());
          e.preventDefault();
          return;
        }
      }
    }
    document.addEventListener('paste', handlePaste);

    pasteArea.addEventListener('click', function() { iconFileIn.click(); });
    iconFileIn.addEventListener('change', function() {
      if (iconFileIn.files[0]) handleImageFile(iconFileIn.files[0]);
      iconFileIn.value = '';
    });

    // ── 4. Group / Item helpers ────────────────────────────────────
    var BASIC_FIELDS = ['link', 'user', 'key', 'totp', 'db', 'ssh'];

    function createItemRow(key, value, hidden) {
      var isModal = (key === 'modal');
      var row = document.createElement('div');
      row.className = 'cm-item-row';
      if (hidden) row.classList.add('cm-item-hidden');
      row.innerHTML =
        '<select>' +
          '<option value="link">link</option>' +
          '<option value="user">user</option>' +
          '<option value="key">key</option>' +
          '<option value="totp">totp</option>' +
          '<option value="db">db</option>' +
          '<option value="ssh">ssh</option>' +
          '<option value="modal">modal</option>' +
        '</select>' +
        '<input type="text" placeholder="值">' +
        '<button class="cm-btn cm-eye-btn" title="顯示/隱藏">' + (hidden ? '👁‍🗨' : '👁') + '</button>' +
        '<button class="cm-btn cm-btn-danger" style="padding:4px 8px">✕</button>';

      if (key) row.querySelector('select').value = isModal ? 'modal' : key;
      if (value) row.querySelector('input').value = value;

      row.querySelector('.cm-eye-btn').addEventListener('click', function () {
        row.classList.toggle('cm-item-hidden');
        this.textContent = row.classList.contains('cm-item-hidden') ? '👁‍🗨' : '👁';
      });

      row.querySelector('.cm-btn-danger').addEventListener('click', function () {
        row.remove();
      });

      return row;
    }

    function createGroup(groupData) {
      var group = document.createElement('div');
      group.className = 'cm-group';
      group.innerHTML =
        '<div class="cm-group-header">' +
          '<input type="text" placeholder="群組名稱 (e.g. B2C)" class="cm-group-name" style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface2); color:var(--text-dim); font-size:12px">' +
          '<button class="cm-btn cm-sort-group" title="排序項目">⇅</button>' +
          '<button class="cm-btn cm-btn-danger cm-remove-group">✕</button>' +
        '</div>' +
        '<div class="cm-items"></div>' +
        '<button class="cm-btn cm-add-item" style="margin-top:4px">+ 新增項目</button>';

      var nameInput = group.querySelector('.cm-group-name');
      var itemsContainer = group.querySelector('.cm-items');
      var addItemBtn = group.querySelector('.cm-add-item');
      var removeGroupBtn = group.querySelector('.cm-remove-group');

      if (groupData && groupData.name) {
        nameInput.value = groupData.name;
      }

      if (groupData && groupData.item && groupData.item.length > 0) {
        groupData.item.forEach(function (it) {
          var isHidden = !!it._hidden;
          if (it.modal) {
            itemsContainer.appendChild(createItemRow('modal', it.modal, isHidden));
          } else {
            var keys = Object.keys(it).filter(function(k) { return k !== '_hidden'; });
            keys.forEach(function (k) {
              itemsContainer.appendChild(createItemRow(k, it[k], isHidden));
            });
          }
        });
      }

      addItemBtn.addEventListener('click', function () {
        itemsContainer.appendChild(createItemRow());
      });

      removeGroupBtn.addEventListener('click', function () {
        group.remove();
      });

      group.querySelector('.cm-sort-group').addEventListener('click', function () {
        openSortPopup(itemsContainer, '.cm-item-row', function(row) {
          var sel = row.querySelector('select');
          var inp = row.querySelector('input');
          var type = sel ? sel.value : '?';
          var val = inp ? inp.value : '';
          if (val.length > 30) val = val.substring(0, 30) + '…';
          return { type: type, val: val };
        }, '排序項目');
      });

      return group;
    }

    function openSortPopup(container, childSelector, getLabelFn, title) {
      var rows = Array.from(container.querySelectorAll(':scope > ' + childSelector));
      if (rows.length < 2) { showToast('項目不足，無需排序'); return; }

      var order = rows.map(function(_, i) { return i; });
      var pending = [];
      var dragSrcIdx = null;

      var bg = document.createElement('div');
      bg.className = 'cm-sort-popup-bg';
      var popup = document.createElement('div');
      popup.className = 'cm-sort-popup';
      popup.innerHTML = '<h3>' + (title || '排序') + ' <button class="close-btn" style="width:26px;height:26px;font-size:14px">✕</button></h3><div class="cm-sort-list"></div><div style="display:flex;gap:8px"><button class="cm-btn" id="cmSortReset" style="flex:0">重置</button><button class="cm-btn-save" id="cmSortApply" style="flex:1;padding:8px;font-size:12px">套用</button></div>';
      bg.appendChild(popup);
      document.body.appendChild(bg);

      var listEl = popup.querySelector('.cm-sort-list');

      function render() {
        listEl.innerHTML = '';
        order.forEach(function(origIdx, pos) {
          var info = getLabelFn(rows[origIdx]);
          var selected = pending.indexOf(origIdx) !== -1;
          var el = document.createElement('div');
          el.className = 'cm-sort-row' + (selected ? ' selected' : '');
          el.draggable = true;
          el.dataset.idx = origIdx;
          var num = selected ? (pending.indexOf(origIdx) + 1) : (pos + 1);
          el.innerHTML = '<div class="cm-sort-num">' + num + '</div><div class="cm-sort-label">' + escHtml(info.val || '(空)') + '</div><div class="cm-sort-type">' + info.type + '</div>';

          el.addEventListener('click', function() {
            var p = pending.indexOf(origIdx);
            if (p === -1) pending.push(origIdx);
            else pending.splice(p, 1);
            render();
          });

          el.addEventListener('dragstart', function(e) {
            dragSrcIdx = order.indexOf(origIdx);
            e.dataTransfer.effectAllowed = 'move';
          });
          el.addEventListener('dragover', function(e) {
            e.preventDefault();
            listEl.querySelectorAll('.cm-sort-row').forEach(function(r) { r.classList.remove('drag-over'); });
            el.classList.add('drag-over');
          });
          el.addEventListener('drop', function(e) {
            e.preventDefault();
            el.classList.remove('drag-over');
            var dropIdx = order.indexOf(origIdx);
            if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) {
              var moved = order.splice(dragSrcIdx, 1)[0];
              order.splice(dropIdx, 0, moved);
              pending = [];
              render();
            }
            dragSrcIdx = null;
          });
          el.addEventListener('dragend', function() {
            listEl.querySelectorAll('.cm-sort-row').forEach(function(r) { r.classList.remove('drag-over'); });
            dragSrcIdx = null;
          });

          listEl.appendChild(el);
        });
      }

      function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

      render();

      popup.querySelector('.close-btn').addEventListener('click', function() { bg.remove(); });
      bg.addEventListener('click', function(e) { if (e.target === bg) bg.remove(); });

      popup.querySelector('#cmSortReset').addEventListener('click', function() {
        order = rows.map(function(_, i) { return i; });
        pending = [];
        render();
      });

      popup.querySelector('#cmSortApply').addEventListener('click', function() {
        var finalOrder = pending.length > 0 ? pending : order;
        var fragment = document.createDocumentFragment();
        finalOrder.forEach(function(origIdx) {
          fragment.appendChild(rows[origIdx]);
        });
        var remaining = rows.filter(function(_, i) { return finalOrder.indexOf(i) === -1; });
        remaining.forEach(function(r) { fragment.appendChild(r); });
        container.innerHTML = '';
        container.appendChild(fragment);
        bg.remove();
      });
    }

    // ── 5. Reset form ──────────────────────────────────────────────
    function resetForm() {
      iconValue = '';
      iconPreview.style.display = 'none';
      pasteArea.textContent = 'Ctrl+V 貼上圖片，或點擊選擇檔案';
      typeSelect.value = 'PIC';
      titleInput.value = '';
      groupsDiv.innerHTML = '';
    }

    // ── 6. Populate form from card data ────────────────────────────
    function populateForm(card) {
      iconValue = card.icon || '';
      if (iconValue) {
        pasteArea.textContent = '已貼上自訂圖片';
      } else {
        pasteArea.textContent = 'Ctrl+V 貼上圖片，或點擊選擇檔案';
      }
      updateIconPreview();
      typeSelect.value = card.type || 'PIC';
      titleInput.value = card.title || '';
      groupsDiv.innerHTML = '';

      if (card.itemlist && card.itemlist.length > 0) {
        card.itemlist.forEach(function (g) {
          groupsDiv.appendChild(createGroup(g));
        });
      }
    }

    // ── 7. Build card object from form ─────────────────────────────
    function buildCardFromForm() {
      var card = {
        icon: iconValue,
        title: titleInput.value.trim(),
        type: typeSelect.value,
        itemlist: []
      };

      var groups = groupsDiv.querySelectorAll('.cm-group');
      groups.forEach(function (groupEl) {
        var groupName = groupEl.querySelector('.cm-group-name').value.trim();
        var items = [];
        var rows = groupEl.querySelectorAll('.cm-item-row');
        rows.forEach(function (row) {
          var key = row.querySelector('select').value;
          var val = row.querySelector('input').value.trim();
          var isHidden = row.classList.contains('cm-item-hidden');
          if (val) {
            var obj = {};
            if (key === 'modal') {
              obj[val] = val;
              obj.modal = val;
            } else {
              obj[key] = val;
            }
            if (isHidden) obj._hidden = true;
            items.push(obj);
          }
        });
        card.itemlist.push({ name: groupName || '未命名', item: items });
      });

      return card;
    }

    // ── 8. Edit guard ────────────────────────────────────────────
    var cardEdited = false;
    function cardMark() { cardEdited = true; markEdited(titleEl); }

    titleInput.addEventListener('input', cardMark);
    typeSelect.addEventListener('change', cardMark);

    function closeModal() {
      confirmLeave(cardEdited, function() {
        cardEdited = false;
        clearEdited(titleEl);
        modalBg.classList.remove('open');
      });
    }
    bindPopup(modalBg, closeModal);

    // ── 9. Open modal (add mode) ───────────────────────────────────
    function openAddModal() {
      editingIdx = null;
      resetForm();
      cardEdited = false;
      titleEl.innerHTML = window.CARD_ICONS.add + '新增卡片';
      clearEdited(titleEl);
      modalBg.classList.add('open');
    }

    // ── 10. Open modal (edit mode) ──────────────────────────────────
    function openEditModal(oneBasedIdx) {
      var dataIdx = oneBasedIdx - 1;
      if (dataIdx < 0 || dataIdx >= data.length) return;
      editingIdx = dataIdx;
      populateForm(data[dataIdx]);
      cardEdited = false;
      titleEl.innerHTML = window.CARD_ICONS.edit + '編輯卡片';
      clearEdited(titleEl);
      modalBg.classList.add('open');
    }

    // ── 11. Add group / sort groups buttons ──────────────────────────
    groupsDiv.addEventListener('input', cardMark);
    groupsDiv.addEventListener('change', cardMark);
    addGroupBtn.addEventListener('click', function () {
      groupsDiv.appendChild(createGroup());
      cardMark();
    });

    document.getElementById('cmSortGroups').addEventListener('click', function () {
      openSortPopup(groupsDiv, '.cm-group', function(groupEl) {
        var name = groupEl.querySelector('.cm-group-name').value || '未命名';
        var count = groupEl.querySelectorAll('.cm-item-row').length;
        return { type: count + ' 項', val: name };
      }, '排序群組');
    });

    // ── 12. Save button ────────────────────────────────────────────
    saveBtn.addEventListener('click', function () {
      var card = buildCardFromForm();
      if (!card.title) {
        showToast('請輸入卡片名稱');
        return;
      }

      if (editingIdx !== null) {
        data[editingIdx] = card;
        saveData();
        renderGrid();
        showToast('卡片已更新');
      } else {
        data.push(card);
        saveData();
        currentOrder.push(data.length);
        localStorage.setItem('card_order', JSON.stringify(currentOrder));
        renderGrid();
        showToast('卡片已新增');
      }

      cardEdited = false;
      clearEdited(titleEl);
      modalBg.classList.remove('open');
    });

    // ── 13. Context menu ───────────────────────────────────────────
    var activeMenu = null;

    function removeContextMenu() {
      if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
      }
    }

    document.addEventListener('click', function () {
      removeContextMenu();
    });

    window.showCardContextMenu = function (x, y, oneBasedIdx) {
      removeContextMenu();

      var menu = document.createElement('div');
      menu.className = 'card-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var editBtn = document.createElement('button');
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeContextMenu();
        openEditModal(oneBasedIdx);
      });

      var copyBtn = document.createElement('button');
      copyBtn.textContent = '複製';
      copyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeContextMenu();
        var src = data[oneBasedIdx - 1];
        if (!src) return;
        var clone = JSON.parse(JSON.stringify(src));
        var base = clone.title.replace(/-copy\(\d+\)$/, '');
        var n = 1;
        while (data.some(function (c) { return c.title === base + '-copy(' + n + ')'; })) n++;
        clone.title = base + '-copy(' + n + ')';
        data.push(clone);
        saveData();
        currentOrder.push(data.length);
        localStorage.setItem('card_order', JSON.stringify(currentOrder));
        renderGrid();
        showToast('卡片已複製');
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = '刪除';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeContextMenu();
        showDeleteConfirm(oneBasedIdx);
      });

      menu.appendChild(editBtn);
      menu.appendChild(copyBtn);
      menu.appendChild(deleteBtn);

      // Prevent the document click listener from immediately removing the menu
      menu.addEventListener('click', function (e) {
        e.stopPropagation();
      });

      document.body.appendChild(menu);
      activeMenu = menu;

      // Adjust position if menu goes off-screen
      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
      }
    };

    // ── 14. Expose globals ─────────────────────────────────────────
    window.openEditCardModal = openEditModal;
    this.open = openAddModal;
  }
});
