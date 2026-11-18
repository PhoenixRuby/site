registerPlugin('card', {
  main: true,
  menuOrder: 1,
  label: '卡片',
  menuIcon: 'card',
  icon: 'add',
  mode: 'card',
  order: 5,
  
  favicon: function(canvas, ctx) {
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(28, 15); ctx.lineTo(24, 15);
    ctx.lineTo(24, 27); ctx.lineTo(19, 27); ctx.lineTo(19, 20);
    ctx.lineTo(13, 20); ctx.lineTo(13, 27); ctx.lineTo(8, 27);
    ctx.lineTo(8, 15); ctx.lineTo(4, 15); ctx.closePath();
    ctx.fill();
  },
  open: null,
  render: null,
  storageKeys: ['card_order', 'site_data'],
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
	const subCssList = ['card', 'card-export', 'card-import', 'card-totp'];
	const subPlugins = ['card-export', 'card-import', 'card-sort', 'card-totp', 'card-setting', 'card-help'];
	
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
    // ── Data Management ───────────────────────────────────────────
    function loadData() {
      // 💡 呼叫通用工具讀取（預設抓第一個 Key: 'site_data'）
      const parsed = self.loadData('site_data');
      
      // 如果有合法資料，直接回傳
      if (parsed.length > 0) return parsed;
      
      // ✨ 沒資料時的特殊防呆：複製預設值、寫入儲存區，並回傳
      const initial = JSON.parse(JSON.stringify(defaultData));
      self.saveData(initial, 'site_data');
      return initial;
    }

    function saveData() {
      // 💡 改用引數對齊的通用工具儲存（資料在前，Key 在後）
      self.saveData(data, 'site_data');
      if (typeof initModules === 'function') initModules(data);
      
      // 原本儲存後會即時觸發工具列更新的機制保持不變
      if (typeof renderToolbar === 'function') renderToolbar();
    }

    var data = loadData();

    function loadOrder() {
      try {
        const arr = self.loadData('card_order');
        
        if (Array.isArray(arr) && arr.length === data.length) return arr;
      } catch (e) { }
      return data.map((_, i) => i + 1);
    }

    var currentOrder = loadOrder();

    function resolveIconSrc(icon) {
      if (!icon) return '';
      if (icon.startsWith('data:')) return icon;
      return 'image/icon/' + icon + '.png';
    }

    // CSS-only icons. Keep data-icon / data-copy-content for existing card handlers.
    function createCardIcon(type, copyContent, iconName = type, size = 16) {
		const wrapper = document.createElement('span');
		wrapper.className = 'copy-wrapper';

		if (type) wrapper.dataset.icon = type;
		if (copyContent) wrapper.dataset.copyContent = copyContent;

		wrapper.innerHTML = resolveIcon(iconName, null, size);

		return wrapper;
	}

    // ── renderGrid ────────────────────────────────────────────────
    var BROKEN_ICON_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--text-dim)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".4"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="3" x2="21" y2="21"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

    function renderGrid() {
      if (typeof window.totpBeforeRender === 'function') window.totpBeforeRender();

      const wrapper = document.getElementById("app-content");
      wrapper.innerHTML = "";

      if (data.length === 0) {
        if (typeof window.totpAfterRender === 'function') window.totpAfterRender();
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'card-empty';
        emptyDiv.innerHTML = `<div class="card-empty-icon">${resolveIcon("card", '#38bdf8', 64)}</div><div>尚無卡片</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div>`;
        wrapper.appendChild(emptyDiv);
        return;
      }

      currentOrder.forEach(oneBasedIdx => {
        const block = data[oneBasedIdx - 1];
        const container = renderCard(block);
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
      resizeQuicksand("#app-content", "#app-content");
    }

    // ── resizeQuicksand ───────────────────────────────────────────
    function renderCard(block, preview = false) {
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
      titleDiv.textContent = preview ? block.title || '未命名卡片' : block.title;
      const typeDiv = document.createElement("div");
      typeDiv.dataset.type = block.type;
      typeDiv.textContent = block.type;

      left.appendChild(iconDiv);
      left.appendChild(titleDiv);
      left.appendChild(typeDiv);

      const right = document.createElement("div");
      right.className = "list-content";

      block.itemlist.forEach((itemGroup, groupIndex) => {
        const ul = document.createElement("ul");
        ul.dataset.area = itemGroup.name;
        if (preview) ul.dataset.previewGroup = groupIndex;
        ul.classList.add("item-group");

        itemGroup.item.forEach((it, itemIndex) => {
          if (it._hidden) return;
          const skipItem = typeof window.totpSkipItem === 'function' && window.totpSkipItem(it);
          if (skipItem || (preview && it.totp)) return;
          const li = document.createElement("li");
          if (preview) {
            const guide = it.guide || (it.modal === 'wsl' || it.modal === 'cicd' ? it.modal : '');
            const kind = guide ? 'guide' : it.modal ? 'modal' :
              ['link', 'user', 'key', 'db', 'ssh'].find(key => it[key]);
            if (kind) {
              li.dataset.previewItem = itemIndex;
              li.appendChild(createCardIcon(kind, null, guide || it.modal || kind));
              ul.appendChild(li);
            }
            return;
          }


          if (it.link) {
            const a = document.createElement("a");
            a.href = it.link;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            const svg = createCardIcon("link", null);
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
            const svg = createCardIcon("user", it.user);
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
            const svg = createCardIcon("key", it.key);
            li.dataset.copyContent = it.key;
            li.appendChild(svg);
          }

          if (it.db) {
            const svg = createCardIcon("db", it.db);
            li.dataset.copyContent = it.db;
            li.appendChild(svg);
          }

          if (it.ssh) {
            const svg = createCardIcon("ssh", it.ssh);
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

          const guideId = it.guide || (it.modal === 'wsl' || it.modal === 'cicd' ? it.modal : '');
          if (guideId) {
            const trigger = document.createElement('a');
            trigger.href = '#';
            trigger.title = '開啟 Guide：' + guideId;
            trigger.setAttribute('aria-label', trigger.title);
            const icon = guideId;
            if (icon) {
              // Do not attach copyContent: Guide icons open panels, not clipboard text.
              trigger.appendChild(createCardIcon('guide', null, icon));
            } else {
              trigger.textContent = guideId;
            }
            trigger.addEventListener('click', function(e) {
              e.preventDefault();
              if (window.modalModules?.guide?.open) window.modalModules.guide.open(guideId);
              else showToast('Guide 模組尚未載入');
            });
            li.appendChild(trigger);
          } else if (it.modal) {
            const mod = window.modalModules[it.modal];
            if (mod && typeof mod.createTrigger === 'function') {
              // 相容舊版子模組：自行產生卡片觸發按鈕。
              const trigger = mod.createTrigger(it[it.modal] || it.modal, createCardIcon);
              li.appendChild(trigger);
            } else if (mod && typeof mod.open === 'function') {
              // 新版子模組：只需提供 open()，由 Card 建立共用觸發按鈕。
              const trigger = document.createElement('a');
              trigger.href = '#';
              trigger.title = '開啟 ' + it.modal;
              trigger.setAttribute('aria-label', trigger.title);
              // 沿用既有 CARD_ICONS SVG，不使用 Emoji；WSL 仍顯示原本圖示。
              const icon = it.modal;
              if (icon) {
                trigger.appendChild(createCardIcon(it.modal, it[it.modal] || it.modal, icon));
              } else {
                // 未配置圖示時提供純文字名稱，避免傳入 undefined 造成 SVG path 異常。
                trigger.textContent = it.modal;
              }
              trigger.addEventListener('click', function(e) {
                e.preventDefault();
                mod.open();
              });
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

      return container;
    }

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
      _resizeTimer = setTimeout(function() { resizeQuicksand("#app-content", "#app-content"); }, 80);
    });

    // ── initModules ───────────────────────────────────────────────
    //function loadModuleScript(name) {
    //  return new Promise(function(resolve) {
    //    if (window.modalModules[name]) { resolve(); return; }
    //    var s = document.createElement('script');
    //    s.src = 'modules/' + name + '.js';
    //    s.onload = resolve;
    //    s.onerror = function() { console.warn('Module ' + name + ' load failed'); resolve(); };
    //    document.head.appendChild(s);
    //  });
    //}
	//
    //function initModules() {
    //  var needed = new Set();
    //  data.forEach(function(block) {
    //    block.itemlist.forEach(function(group) {
    //      group.item.forEach(function(it) { if (it.modal) needed.add(it.modal); });
    //    });
    //  });
    //  return Promise.all([...needed].map(function(name) { return loadModuleScript(name); })).then(function() {
    //    Object.values(window.modalModules).forEach(function(mod) {
    //      if (typeof mod.init === 'function') mod.init();
    //    });
    //  });
    //}

    // ── Expose globals for sub-plugins ────────────────────────────
    //window.STORAGE_KEY = STORAGE_KEY;
    window.data = data;
    window.currentOrder = currentOrder;
    // Shared ordering API for card-sort: update the closure used by renderGrid.
    this.applyCardOrder = function(order) {
      currentOrder = [...order];
      window.currentOrder = currentOrder;
      self.saveData(currentOrder, 'card_order');
      renderGrid();
    };
    window.loadData = self.loadData;
    window.saveData = self.saveData;
    window.loadOrder = loadOrder;
    window.resolveIconSrc = resolveIconSrc;
    window.renderGrid = renderGrid;
    window.initModules = initModules;

    // ── render method ─────────────────────────────────────────────
    this.render = function(wrapper) {
      var countdown = document.querySelector('.countdown-container');
      if (countdown) countdown.style.display = 'none';
      setModeFavicon('card');
      renderGrid();
    };

    // ── Card Manager ──────────────────────────────────────────────
    let editingIdx = null; // null = add mode, number = edit mode (0-based)

    // ── 2. Inject modal HTML ───────────────────────────────────────
    const modalWrapper = document.createElement('div');
    modalWrapper.innerHTML = `
      <dialog id="cardMgrModalBg" class="app-dialog" aria-labelledby="cardMgrTitle" aria-describedby="cardMgrSubtitle">
        <div class="card-mgr-modal app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            <div class="app-modal-header-info">
              <h2 id="cardMgrTitle" class="app-modal-header-title">新增卡片</h2>
              <p id="cardMgrSubtitle" class="app-modal-header-subtitle">設定卡片名稱與類型，再新增群組和站台項目。</p>
  
            </div>
            <button type="button" class="app-modal-header-close" id="cardMgrCloseBtn" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body cm-workspace">
            <aside class="cm-sidebar">
              <div class="cm-sidebar-tools">
                <button type="button" class="cm-btn" id="cmSortGroups">排序群組</button>
                <button type="button" class="cm-btn" id="cmAddGroup">＋ 新增群組</button>
              </div>
              <input type="search" id="cmGroupSearch" placeholder="搜尋群組…" aria-label="搜尋群組">
              <nav id="cmGroupNav" aria-label="卡片資料與群組"></nav>
            </aside>
            <div class="cm-editor-panel">
            <div id="cmBasic">
            <div class="cm-field" data-basic-field="icon">
              <label>圖示</label>
              <div class="cm-icon-options">
                <div class="cm-icon-tile">
                  <span id="cmIconFallback" class="cm-icon-fallback" aria-hidden="true" data-svgicon="card"></span>
                  <img id="cmIconPreview" class="cm-icon-preview" alt="卡片圖示">
                </div>
                <div id="cmPasteArea" class="cm-paste-area" tabindex="0" style="flex:1">Ctrl+V 貼上圖片，或點擊選擇檔案</div>
              </div>
              <input type="file" id="cmIconFile" accept="image/*" style="display:none">
            </div>
            <div class="cm-basic-fields">
              <div class="cm-field" data-basic-field="title">
                <label for="cmTitle">卡片名稱</label>
                <input id="cmTitle" type="text" placeholder="卡片名稱">
              </div>
              <fieldset class="cm-environments" data-basic-field="environment">
                <legend>環境</legend>
                <div class="cm-environment-options">
                  <label><input type="radio" name="cmEnvironment" value="PIC" checked><span data-type="PIC">PIC</span></label>
                  <label><input type="radio" name="cmEnvironment" value="UAT"><span data-type="UAT">UAT</span></label>
                  <label><input type="radio" name="cmEnvironment" value="PROD"><span data-type="PROD">PROD</span></label>
                  <label><input type="radio" name="cmEnvironment" value="LOCAL"><span data-type="LOCAL">LOCAL</span></label>
                </div>
              </fieldset>
            </div>

            </div>
            <div id="cmGroups"></div>
            </div>
            <details class="cm-draft-preview" open>
              <summary>卡片預覽</summary>
              <div id="cmDraftCard" class="cm-draft-card"></div>
            </details>
          </div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" id="cmCancelBtn">取消</button>
            <span id="cmEditStatus" role="status"></span>
            <button type="button" class="btn-confirm" id="cmSaveBtn">儲存</button>
          </footer>
        </div>
      </dialog>
    `;
    document.body.appendChild(modalWrapper.firstElementChild);

    const confirmEl = document.createElement('div');
    confirmEl.innerHTML = `
      <dialog id="cmConfirmBg" class="app-dialog" aria-labelledby="cmConfirmTitle">
        <div class="cm-confirm app-dialog-panel-medium">
          <header class="app-modal-header">

            <div class="app-modal-header-info">
              <h2 id="cmConfirmTitle" class="app-modal-header-title">確定要刪除這張卡片？</h2>
  
            </div>
            <button type="button" class="app-modal-header-close" id="cmConfirmClose" aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body">
              <div class="cm-confirm-card" id="cmConfirmCard"></div>
          </div>
          <footer class="app-dialog-footer">
            <button class="btn-reset" id="cmConfirmCancel" autofocus>取消</button>
            <button class="btn-confirm cm-confirm-delete" id="cmConfirmDelete">刪除</button>
          </footer>
        </div>
      </dialog>
    `;
    document.body.appendChild(confirmEl.firstElementChild);

    const confirmBg = document.getElementById('cmConfirmBg');
    let pendingDeleteIdx = null;

    function showDeleteConfirm(oneBasedIdx) {
      pendingDeleteIdx = oneBasedIdx;
      var card = data[oneBasedIdx - 1];
      var cardEl = document.getElementById('cmConfirmCard');
      if (!card) { cardEl.innerHTML = ''; ModalManager.showDialog(confirmBg, closeDeleteConfirm); return; }

      var iconSrc = (typeof resolveIconSrc === 'function') ? resolveIconSrc(card.icon) : '';
      var groupTags = card.itemlist.map(function(g) {
        return '<div class="sort-icon" data-area="' + (g.name || '') + '">' + (g.name || '未命名') + '</div>';
      }).join('');
      var modals = new Set();
      card.itemlist.forEach(function(g) {
        g.item.forEach(function(it) { if (it.guide) modals.add('guide:' + it.guide); else if (it.modal) modals.add(it.modal); });
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

      ModalManager.showDialog(confirmBg, closeDeleteConfirm);
    }

    function closeDeleteConfirm() {
      ModalManager.closeDialog(confirmBg);
      pendingDeleteIdx = null;
    }
    document.getElementById('cmConfirmCancel').addEventListener('click', closeDeleteConfirm);
    document.getElementById('cmConfirmClose').addEventListener('click', closeDeleteConfirm);
    confirmBg.addEventListener('click', e => {
      if (e.target === confirmBg) closeDeleteConfirm();
    });
    document.getElementById('cmConfirmDelete').addEventListener('click', () => {
      ModalManager.closeDialog(confirmBg);
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
    const subtitleEl = document.getElementById('cardMgrSubtitle');
    const iconPreview= document.getElementById('cmIconPreview');
    const pasteArea  = document.getElementById('cmPasteArea');
    const iconFileIn = document.getElementById('cmIconFile');
    const environmentInputs = Array.from(modalBg.querySelectorAll('input[name="cmEnvironment"]'));
    const titleInput = document.getElementById('cmTitle');
    const groupsDiv  = document.getElementById('cmGroups');
    const addGroupBtn= document.getElementById('cmAddGroup');
    const saveBtn    = document.getElementById('cmSaveBtn');

    const basicPanel = document.getElementById('cmBasic');
    const groupNav = document.getElementById('cmGroupNav');
    const groupSearch = document.getElementById('cmGroupSearch');
    const editStatus = document.getElementById('cmEditStatus');
    let activeGroup = null;
    let activeBasicField = null;
    const basicPreviewSelectors = { icon: ".icon-pic", title: ".icon-title", environment: "[data-type]" };
    const draftPreview = document.getElementById('cmDraftCard');
    const draftPanel = draftPreview.closest('.cm-draft-preview');

    function highlightDraftSelection(focused = document.activeElement) {
      const groups = readGroups();
      const activeItem = focused?.matches('.cm-item-row input') ? focused.closest('.cm-item-row') : null;
      const groupNameSelected = focused === activeGroup?.querySelector('.cm-group-name');
      const basicField = focused === titleInput ? 'title'
        : focused?.matches('input[name="cmEnvironment"]') ? 'environment' : activeBasicField;
      const basicCard = draftPreview.querySelector('.list-icon');
      basicCard?.classList.toggle('cm-preview-basic-selected', activeGroup === null);
      for (const [field, selector] of Object.entries(basicPreviewSelectors)) {
        basicCard?.querySelector(selector)?.classList.toggle(
          'cm-preview-basic-field-selected', activeGroup === null && basicField === field
        );
      }
      const groupIndex = [...groups.keys()].indexOf(activeGroup);
      const items = groups.get(activeGroup)?.items;
      const itemIndex = items ? [...items.keys()].indexOf(activeItem) : -1;
      draftPreview.querySelectorAll('[data-preview-group]').forEach(group => {
        const selected = Number(group.dataset.previewGroup) === groupIndex;
        group.classList.toggle('cm-preview-group-selected', selected);
        group.classList.toggle('cm-preview-group-name-selected', selected && groupNameSelected);
        group.querySelectorAll('[data-preview-item]').forEach(item => {
          item.classList.toggle('cm-preview-item-selected',
            selected && Number(item.dataset.previewItem) === itemIndex);
        });
      });
      draftPreview.querySelectorAll('.cm-draft-totp').forEach(digits => {
        digits.classList.toggle('cm-preview-item-selected',
          Number(digits.dataset.groupIndex) === groupIndex && Number(digits.dataset.itemIndex) === itemIndex);
      });
    }

    function selectBasicField(event) {
      const field = event.target.closest('[data-basic-field]');
      if (!field) return;
      activeBasicField = field.dataset.basicField === 'icon' ? 'icon' : null;
      highlightDraftSelection();
    }

    draftPreview.addEventListener('click', event => {
      const target = event.target;
      const totp = target.closest('.cm-draft-totp');
      const previewGroup = target.closest('[data-preview-group]');
      const previewItem = target.closest('[data-preview-item]');

      if (totp || previewGroup) {
        const groupIndex = Number(totp?.dataset.groupIndex ?? previewGroup.dataset.previewGroup);
        const itemIndex = Number(totp?.dataset.itemIndex ?? previewItem?.dataset.previewItem);
        const [group, snapshot] = [...readGroups().entries()][groupIndex] || [];
        if (!group) return;

        activeGroup = group;
        activeBasicField = null;
        refreshGroupNav();
        const row = [...snapshot.items.keys()][itemIndex];
        const input = row?.querySelector('input') || group.querySelector('.cm-group-name');
        input.focus();
        highlightDraftSelection();
        return;
      }

      if (!target.closest('.list-icon')) return;
      activeGroup = null;
      activeBasicField = null;
      refreshGroupNav();
      if (target.closest('.icon-pic')) {
        pasteArea.focus();
      } else if (target.closest('[data-type]')) {
        environmentInputs.find(option => option.checked)?.focus();
      } else {
        titleInput.focus();
      }
      highlightDraftSelection();
    });

    basicPanel.addEventListener('focusin', selectBasicField);
    basicPanel.addEventListener('click', selectBasicField);
    basicPanel.addEventListener('change', selectBasicField);

    groupsDiv.addEventListener('focusin', () => highlightDraftSelection());
    [basicPanel, groupsDiv].forEach(panel => {
      panel.addEventListener('focusout', event => highlightDraftSelection(event.relatedTarget));
    });

    function refreshGroupNav() {
      basicPanel.hidden = Boolean(activeGroup);
      groupNav.replaceChildren();
      const query = groupSearch.value.trim().toLocaleLowerCase();

      function addEntry(label, group, count) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        if (group?.classList.contains('cm-group-deleted')) {
          button.classList.add('cm-group-nav-deleted');
          button.setAttribute('aria-label', label + '，待刪除');
        }
        if (count !== undefined) {
          const total = document.createElement('small');
          total.textContent = count;
          button.appendChild(total);
        }
        if (group === activeGroup) button.setAttribute('aria-current', 'true');
        button.addEventListener('click', () => {
          activeGroup = group;
          activeBasicField = null;
          refreshGroupNav();
          highlightDraftSelection();
          groupNav.querySelector('[aria-current="true"]')?.focus();
        });
        groupNav.appendChild(button);
      }

      addEntry('卡片基本資料', null);
      Array.from(groupsDiv.children).forEach(group => {
        group.hidden = group !== activeGroup;
        const name = group.querySelector('.cm-group-name').value.trim() || '未命名群組';
        if (group === activeGroup || name.toLocaleLowerCase().includes(query)) {
          addEntry(name, group, group.querySelectorAll('.cm-item-row:not(.cm-item-deleted)').length);
        }
      });
      if (query && groupNav.children.length === 1) {
        const message = document.createElement('small');
        message.textContent = '找不到符合的群組';
        groupNav.appendChild(message);
      }
    }

    groupSearch.addEventListener('input', refreshGroupNav);

    const iconFallback = document.getElementById('cmIconFallback');
    iconPreview.addEventListener('error', () => {
      iconPreview.style.display = 'none';
      iconFallback.hidden = false;
    });

    let iconValue = '';

    function updateIconPreview() {
      iconFallback.hidden = Boolean(iconValue);
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
      if (!modalBg.open) return;
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

    const itemTypes = new Map([
      ['link', '網址'], ['user', '帳號'], ['key', '金鑰'], ['totp', 'TOTP'],
      ['db', 'DB'], ['ssh', 'SSH'], ['modal', '模組'], ['guide', '教學']
    ]);

    function renderTypeChange(target, original, current, emptyLabel, onRestore) {
      function badge(key) {
        const restore = onRestore && key === original && original !== current;
        const element = document.createElement(restore ? 'button' : 'span');
        element.className = 'cm-type-badge';
        element.dataset.kind = key;
        element.textContent = itemTypes.get(key) || key;
        if (restore) {
          element.type = 'button';
          element.title = '回復原始類型';
          element.setAttribute('aria-label', '回復原始類型：' + element.textContent);
          element.addEventListener('click', onRestore);
        }
        return element;
      }
      target.replaceChildren();
      if (!original || original === current) {
        if (emptyLabel) target.textContent = original ? '無異動' : '新增項目';
        else target.appendChild(badge(current));
        return;
      }
      const arrow = document.createElement('span');
      arrow.className = 'cm-type-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
      target.append(badge(original), arrow, badge(current));
    }

    function openTypePicker(trigger, original, current, onSelect) {
      const rect = trigger.getBoundingClientRect();
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog cm-type-picker';
      dialog.setAttribute('aria-labelledby', 'cmTypePickerTitle');
      dialog.innerHTML = `
        <div class="cm-type-picker-panel">
          <header>
            <strong id="cmTypePickerTitle">變更類型</strong>
            <span class="cm-type-change"></span>
            <button type="button" class="cm-btn cm-type-restore" aria-label="回復原始類型" title="回復原始類型" hidden>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4v6h6M3 10a9 9 0 1 1 2 8"/></svg>
            </button>
            <button type="button" class="cm-btn cm-type-close" aria-label="取消變更類型">×</button>
          </header>
          <div class="cm-type-options"></div>
        </div>`;
      const canRestore = Boolean(original && original !== current);
      const restoreButton = dialog.querySelector('.cm-type-restore');
      restoreButton.hidden = !canRestore;
      restoreButton.addEventListener('click', restore);
      renderTypeChange(dialog.querySelector('.cm-type-change'), original, current, true, canRestore ? restore : null);
      const options = dialog.querySelector('.cm-type-options');

      function close() {
        ModalManager.closeDialog(dialog);
        dialog.remove();
        trigger.focus({ preventScroll: true });
      }
      function restore() {
        onSelect(original);
        close();
      }
      dialog.querySelector('.cm-type-close').addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      let selected;
      itemTypes.forEach((label, key) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.dataset.kind = key;
        option.textContent = label;
        option.setAttribute('aria-pressed', String(key === current));
        if (key === current) selected = option;
        option.addEventListener('click', () => {
          onSelect(key);
          close();
        });
        options.appendChild(option);
      });
      document.body.appendChild(dialog);
      ModalManager.showDialog(dialog, close);
      const width = dialog.offsetWidth;
      const height = dialog.offsetHeight;
      dialog.style.left = Math.max(8, Math.min(rect.left, innerWidth - width - 8)) + 'px';
      dialog.style.top = Math.max(8, Math.min(innerHeight - height - 8,
        rect.bottom + 5 + height <= innerHeight - 8 ? rect.bottom + 5 : rect.top - height - 5)) + 'px';
      (selected || options.firstElementChild).focus({ preventScroll: true });
    }

    function createItemRow(key, value, hidden) {
      var row = document.createElement('div');
      row.className = 'cm-item-row';
      if (hidden) row.classList.add('cm-item-hidden');
      row.innerHTML = `
        <button type="button" class="cm-btn cm-item-kind" aria-haspopup="dialog"></button>
        <input type="text" placeholder="值" aria-label="項目值">
        <button type="button" class="cm-btn cm-eye-btn"></button>
        <button type="button" class="cm-btn cm-copy-item" aria-label="複製項目值" title="複製項目值">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
        </button>
        <button type="button" class="cm-btn cm-btn-danger" aria-label="刪除項目" title="刪除項目">×</button>`;

      const kindButton = row.querySelector('.cm-item-kind');
      row.dataset.kind = key || 'link';
      const input = row.querySelector('input');
      const eye = row.querySelector('.cm-eye-btn');
      if (value) input.value = value;
      const copy = row.querySelector('.cm-copy-item');
      copy.disabled = !input.value;
      input.addEventListener('input', () => { copy.disabled = !input.value; });
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(input.value);
          showToast('已複製項目值');
        } catch (_) {
          showToast('無法複製項目值');
        }
      });
      function updateKind() {
        const current = row.dataset.kind;
        renderTypeChange(kindButton, key, current, false);
        const label = itemTypes.get(current) || current;
        const original = key && key !== current ? (itemTypes.get(key) || key) + ' → ' : '';
        kindButton.setAttribute('aria-label', '變更類型：' + original + label);
      }
      updateKind();
      kindButton.addEventListener('click', () => {
        openTypePicker(kindButton, key, row.dataset.kind, next => {
          row.dataset.kind = next;
          updateKind();
          cardMark();
        });
      });

      function updateEye() {
        const masked = row.classList.contains('cm-item-hidden');
        input.type = masked ? 'password' : 'text';
        eye.innerHTML = `
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>
            ${masked ? '<path d="m3 3 18 18"/>' : ''}
          </svg>`;
        const label = '隱藏項目值';
        eye.title = masked ? '顯示項目值' : label;
        eye.setAttribute('aria-label', label);
        eye.setAttribute('aria-pressed', String(masked));
      }
      updateEye();
      eye.addEventListener('click', () => {
        row.classList.toggle('cm-item-hidden');
        updateEye();
        cardMark();
      });

      const remove = row.querySelector('.cm-btn-danger');
      remove.addEventListener('click', () => {
        const group = row.closest('.cm-group');
        if (!originalGroups.get(group)?.items.has(row)) {
          row.remove();
          cardMark();
          refreshGroupNav();
          group.querySelector('.cm-add-item').focus();
          return;
        }
        const deleted = row.classList.toggle('cm-item-deleted');
        kindButton.disabled = input.disabled = eye.disabled = deleted;
        copy.disabled = deleted || !input.value;
        remove.textContent = deleted ? '復原' : '×';
        remove.title = deleted ? '復原刪除' : '刪除項目';
        remove.setAttribute('aria-label', remove.title);
        cardMark();
        refreshGroupNav();
      });

      return row;
    }

    function createGroup(groupData) {
      var group = document.createElement('div');
      group.className = 'cm-group';
      group.innerHTML = `
        <div class="cm-group-header">
          <div class="cm-group-heading">
            <label><span>項目：</span><input type="text" placeholder="未命名群組" aria-label="群組名稱" class="cm-group-name"></label>
            <button type="button" class="cm-btn cm-rename-group" aria-label="編輯群組名稱" title="編輯群組名稱">${resolveIcon('edit')}</button>
          </div>
          <button class="cm-btn cm-sort-group" title="排序項目">排序項目</button>
          <button class="cm-btn cm-btn-danger cm-remove-group">刪除群組</button>
        </div>
        <div class="cm-items"></div>
        <button class="cm-btn cm-add-item" style="margin-top:4px">+ 新增項目</button>`;

      var nameInput = group.querySelector('.cm-group-name');
      group.querySelector('.cm-rename-group').addEventListener('click', () => {
        nameInput.focus();
        nameInput.select();
      });
      var itemsContainer = group.querySelector('.cm-items');
      var addItemBtn = group.querySelector('.cm-add-item');
      var removeGroupBtn = group.querySelector('.cm-remove-group');

      if (groupData && groupData.name) {
        nameInput.value = groupData.name;
      }

      if (groupData && groupData.item && groupData.item.length > 0) {
        groupData.item.forEach(function (it) {
          var isHidden = !!it._hidden;
          if (it.guide) {
            itemsContainer.appendChild(createItemRow('guide', it.guide, isHidden));
          } else if (it.modal === 'wsl' || it.modal === 'cicd') {
            itemsContainer.appendChild(createItemRow('guide', it.modal, isHidden));
          } else if (it.modal) {
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
        const row = createItemRow();
        itemsContainer.appendChild(row);
        row.querySelector('input').focus();
        cardMark();
        refreshGroupNav();
      });

      removeGroupBtn.addEventListener('click', function () {
        if (!originalGroups.has(group)) {
          group.remove();
          activeGroup = null;
          activeBasicField = null;
          cardMark();
          refreshGroupNav();
          groupNav.querySelector('[aria-current="true"]')?.focus();
          return;
        }
        const deleted = group.classList.toggle('cm-group-deleted');
        group.querySelectorAll('.cm-group-heading, .cm-sort-group, .cm-items, .cm-add-item').forEach(element => {
          element.inert = deleted;
        });
        removeGroupBtn.textContent = deleted ? '復原群組' : '刪除群組';
        cardMark();
        refreshGroupNav();
      });

      group.querySelector('.cm-sort-group').addEventListener('click', function () {
        openSortPopup(itemsContainer, '.cm-item-row:not(.cm-item-deleted)', function(row) {
          var inp = row.querySelector('input');
          var type = itemTypes.get(row.dataset.kind) || row.dataset.kind;
          var val = row.classList.contains('cm-item-hidden') ? '已隱藏' : (inp ? inp.value : '');
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

      var bg = document.createElement('dialog');
      bg.className = 'app-dialog';
      bg.setAttribute('aria-labelledby', 'cmSortTitle');
      var popup = document.createElement('div');
      popup.className = 'cm-sort-popup app-dialog-panel-medium';
      popup.innerHTML = `
        <header class="app-modal-header">

            <div class="app-modal-header-info">
              <h2 id="cmSortTitle" class="app-modal-header-title">${AppUtils.escHtml(title || '排序')}</h2>
  
            </div>
            <button type="button" class="app-modal-header-close" aria-label="關閉">✕</button>
          </header>
        <div class="app-dialog-body"><div class="cm-sort-list"></div></div>
        <footer class="app-dialog-footer">
          <button type="button" class="btn-reset" id="cmSortReset">重置</button>
          <button type="button" class="btn-confirm" id="cmSortApply">套用</button>
        </footer>`;
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
          el.innerHTML = '<div class="cm-sort-num">' + num + '</div><div class="cm-sort-label">' + AppUtils.escHtml(info.val || '(空)') + '</div><div class="cm-sort-type">' + info.type + '</div>';

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

      render();

      function closeSortPopup() {
        ModalManager.closeDialog(bg);
        bg.remove();
      }

      popup.querySelector('.app-modal-header-close').addEventListener('click', closeSortPopup);
      bg.addEventListener('click', function(e) { if (e.target === bg) closeSortPopup(); });
      ModalManager.showDialog(bg, closeSortPopup);

      popup.querySelector('#cmSortReset').addEventListener('click', function() {
        order = rows.map(function(_, i) { return i; });
        pending = [];
        render();
      });

      popup.querySelector('#cmSortApply').addEventListener('click', function() {
        var finalOrder = pending.length > 0 ? pending : order;
        const chosen = new Set(finalOrder);
        const sorted = finalOrder.map(index => rows[index]).concat(rows.filter((_, index) => !chosen.has(index)));
        const sortable = new Set(rows);
        const children = Array.from(container.children);
        let next = 0;
        container.replaceChildren(...children.map(child => sortable.has(child) ? sorted[next++] : child));
        cardMark();
        refreshGroupNav();
        closeSortPopup();
      });
    }

    // ── 5. Reset form ──────────────────────────────────────────────
    function setEnvironment(value) {
      const input = environmentInputs.find(option => option.value === value);
      (input || environmentInputs[0]).checked = true;
    }

    function resetForm() {
      iconValue = '';
      updateIconPreview();
      pasteArea.textContent = 'Ctrl+V 貼上圖片，或點擊選擇檔案';
      setEnvironment('PIC');
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
      setEnvironment(card.type);
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
        type: environmentInputs.find(option => option.checked).value,
        itemlist: []
      };

      for (const snapshot of readGroups().values()) {
        card.itemlist.push({ name: snapshot.name, item: Array.from(snapshot.items.values()) });
      }

      return card;
    }

    function readGroups() {
      const groups = new Map();
      groupsDiv.querySelectorAll('.cm-group:not(.cm-group-deleted)').forEach(group => {
        const name = group.querySelector('.cm-group-name').value.trim() || '未命名';
        const items = new Map();
        group.querySelectorAll('.cm-item-row:not(.cm-item-deleted)').forEach(row => {
          const key = row.dataset.kind;
          const value = row.querySelector('input').value.trim();
          if (!value) return;
          const item = key === 'modal' ? { [value]: value, modal: value } : { [key]: value };
          if (row.classList.contains('cm-item-hidden')) item._hidden = true;
          items.set(row, item);
        });
        groups.set(group, { name, items });
      });
      return groups;
    }

    function describeChanges(card) {
      const sections = { 新增: [], 修改: [], 刪除: [], 排序: [] };
      const current = readGroups();
      const original = JSON.parse(originalCard);
      const itemKind = item => item.modal ? 'modal' : Object.keys(item).find(key => key !== '_hidden');
      const typeLabel = key => itemTypes.get(key) || key;
      const itemPath = (name, item) => '群組「' + name + '」 / ' + typeLabel(itemKind(item));
      const formatValue = (kind, value) => {
        if (!value) return '（空白）';
        if (kind !== 'link') return value;
        try {
          const url = new URL(value);
          url.username = '';
          url.password = '';
          if (url.search) url.search = '?…';
          if (url.hash) url.hash = '#…';
          return url.href;
        } catch {
          return '（相對或無效網址）';
        }
      };
      const listItems = (section, name, items) => {
        items.forEach(item => sections[section].push(itemPath(name, item)));
      };
      function reordered(before, after) {
        const retained = [...before.keys()].filter(key => after.has(key));
        return [...after.keys()].filter(key => before.has(key)).some((key, index) => key !== retained[index]);
      }

      if (editingIdx === null) sections.新增.push('卡片「' + card.title + '」');
      else {
        if (original.title !== card.title) sections.修改.push('卡片名稱：' + original.title + ' → ' + card.title);
        if (original.type !== card.type) sections.修改.push('環境：' + original.type + ' → ' + card.type);
        if (original.icon !== card.icon) sections.修改.push('卡片圖示');
      }
      if (reordered(originalGroups, current)) sections.排序.push('群組順序：' + [...originalGroups.values()].map(group => group.name).join('、') + ' → ' + [...current.values()].map(group => group.name).join('、'));

      current.forEach(({ name, items }, group) => {
        const before = originalGroups.get(group);
        if (!before) {
          sections.新增.push('群組「' + name + '」');
          listItems('新增', name, items);
          return;
        }
        if (before.name !== name) sections.修改.push('群組名稱：' + before.name + ' → ' + name);
        if (reordered(before.items, items)) sections.排序.push('群組「' + name + '」 / 項目順序已調整');
        items.forEach((item, row) => {
          const old = before.items.get(row);
          const path = itemPath(name, item);
          if (!old) {
            sections.新增.push(path + '：新增項目');
            return;
          }
          const oldKind = itemKind(old);
          const kind = itemKind(item);
          if (oldKind !== kind) {
            sections.修改.push({ path, detail: '類型：' + typeLabel(oldKind) + ' → ' + typeLabel(kind) });
          } else if (old[kind] !== item[kind]) {
            const detail = ['link', 'modal', 'guide'].includes(kind)
              ? '內容：' + formatValue(kind, old[kind]) + ' → ' + formatValue(kind, item[kind])
              : '內容已變更';
            sections.修改.push({ path, detail });
          }
          if (Boolean(old._hidden) !== Boolean(item._hidden)) {
            sections.修改.push({ path, detail: '顯示狀態：' + (old._hidden ? '隱藏 → 顯示' : '顯示 → 隱藏') });
          }
        });
        before.items.forEach((item, row) => {
          if (!items.has(row)) sections.刪除.push(itemPath(name, item));
        });
      });
      originalGroups.forEach(({ name, items }, group) => {
        if (current.has(group)) return;
        sections.刪除.push('群組「' + name + '」');
        listItems('刪除', name, items);
      });
      return Object.entries(sections).filter(([, entries]) => entries.length);
    }

    // ── 8. Edit guard ────────────────────────────────────────────
    var cardEdited = false;
    let originalCard = '';
    let originalGroups = new Map();

    function updateDraftPreview(card) {
      if (draftPanel.hidden) return;
      const cardNode = renderCard(card, true);
      card.itemlist.forEach((group, groupIndex) => {
        group.item.forEach((item, itemIndex) => {
          if (!item.totp || item._hidden) return;
          const digits = document.createElement('div');
          digits.className = 'cm-draft-totp';
          digits.dataset.groupIndex = groupIndex;
          digits.dataset.itemIndex = itemIndex;
          for (let index = 0; index < 6; index++) {
            const digit = document.createElement('span');
            digit.textContent = '•';
            digits.appendChild(digit);
          }
          cardNode.appendChild(digits);
        });
      });
      draftPreview.replaceChildren(cardNode);
      highlightDraftSelection();
    }

    function cardMark() {
      const card = buildCardFromForm();
      updateDraftPreview(card);
      const changed = JSON.stringify(card) !== originalCard;
      if (changed === cardEdited) return;
      cardEdited = changed;
      saveBtn.disabled = !changed;
      if (changed) markEdited(titleEl);
      else clearEdited(titleEl);
      editStatus.textContent = changed ? '尚未儲存' : '';
    }

    function resetCardEdited() {
      const settings = window.plugins['card-setting'];
      draftPanel.hidden = settings?.showPreview() === false;
      draftPanel.open = settings?.openPreviewByDefault?.() !== false;
      activeBasicField = null;
      const card = buildCardFromForm();
      originalCard = JSON.stringify(card);
      updateDraftPreview(card);
      originalGroups = readGroups();
      saveBtn.disabled = true;
      cardEdited = false;
      clearEdited(titleEl);
      editStatus.textContent = '';
    }

    titleInput.addEventListener('input', cardMark);
    environmentInputs.forEach(input => input.addEventListener('change', cardMark));

    function closeModal() {
      confirmLeave(cardEdited, function() {
        cardEdited = false;
        clearEdited(titleEl);
        ModalManager.closeDialog(modalBg);
      });
    }
    modalBg.addEventListener('click', function(e) { if (e.target === modalBg) closeModal(); });
    document.getElementById('cardMgrCloseBtn').addEventListener('click', closeModal);
    document.getElementById('cmCancelBtn').addEventListener('click', closeModal);

    // ── 9. Open modal (add mode) ───────────────────────────────────
    function openAddModal() {
      editingIdx = null;
      resetForm();
      activeGroup = null;
      groupSearch.value = '';
      refreshGroupNav();
      resetCardEdited();
      titleEl.textContent = '新增卡片';
      subtitleEl.textContent = '設定卡片名稱與類型，再新增群組和站台項目。';
      modalBg.querySelector('.app-modal-header-icon').innerHTML = resolveIcon('add');
      clearEdited(titleEl);
      ModalManager.showDialog(modalBg, closeModal);
    }

    // ── 10. Open modal (edit mode) ──────────────────────────────────
    function openEditModal(oneBasedIdx) {
      var dataIdx = oneBasedIdx - 1;
      if (dataIdx < 0 || dataIdx >= data.length) return;
      editingIdx = dataIdx;
      populateForm(data[dataIdx]);
      activeGroup = groupsDiv.firstElementChild;
      groupSearch.value = '';
      refreshGroupNav();
      resetCardEdited();
      titleEl.textContent = '編輯卡片';
      subtitleEl.textContent = '修改卡片資料，或調整群組和站台項目。';
      modalBg.querySelector('.app-modal-header-icon').innerHTML = resolveIcon('edit');
      clearEdited(titleEl);
      ModalManager.showDialog(modalBg, closeModal);
    }

    // ── 11. Add group / sort groups buttons ──────────────────────────
    groupsDiv.addEventListener('input', event => {
      cardMark();
      if (event.target.matches('.cm-group-name')) refreshGroupNav();
    });
    groupsDiv.addEventListener('change', cardMark);
    addGroupBtn.addEventListener('click', function () {
      activeGroup = createGroup();
      groupsDiv.appendChild(activeGroup);
      groupSearch.value = '';
      cardMark();
      refreshGroupNav();
      activeGroup.querySelector('.cm-group-name').focus();
    });

    document.getElementById('cmSortGroups').addEventListener('click', function () {
      openSortPopup(groupsDiv, '.cm-group:not(.cm-group-deleted)', function(groupEl) {
        var name = groupEl.querySelector('.cm-group-name').value || '未命名';
        var count = groupEl.querySelectorAll('.cm-item-row').length;
        return { type: count + ' 項', val: name };
      }, '排序群組');
    });

    function confirmCardSave(changes, onConfirm) {
      const dialog = document.createElement('dialog');
      dialog.className = 'app-dialog';
      dialog.setAttribute('aria-labelledby', 'cmSaveReviewTitle');
      dialog.innerHTML = `
        <div class="app-dialog-panel-medium cm-save-review">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('edit')}</span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title" id="cmSaveReviewTitle">確認卡片異動</h2>
            </div>
            <button type="button" class="app-modal-header-close" aria-label="返回編輯">×</button>
          </header>
          <div class="app-dialog-body"></div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-reset" autofocus>返回編輯</button>
            <button type="button" class="btn-confirm">確認儲存</button>
          </footer>
        </div>`;
      const body = dialog.querySelector('.app-dialog-body');
      changes.forEach(([label, entries]) => {
        const section = document.createElement('section');
        section.className = 'cm-review-section';
        const heading = document.createElement('h3');
        heading.dataset.change = label;
        heading.textContent = label + ' · ' + entries.length;
        const list = document.createElement('ul');
        entries.forEach(entry => {
          const row = document.createElement('li');
          if (typeof entry === 'string') {
            row.textContent = entry;
          } else {
            const path = document.createElement('strong');
            path.textContent = entry.path;
            const detail = document.createElement('div');
            detail.textContent = entry.detail;
            row.append(path, detail);
          }
          list.appendChild(row);
        });
        section.append(heading, list);
        body.appendChild(section);
      });
      function closeReview() {
        ModalManager.closeDialog(dialog);
        dialog.remove();
      }
      dialog.querySelector('.app-modal-header-close').addEventListener('click', closeReview);
      dialog.querySelector('.btn-reset').addEventListener('click', closeReview);
      dialog.addEventListener('click', event => { if (event.target === dialog) closeReview(); });
      dialog.querySelector('.btn-confirm').addEventListener('click', () => {
        closeReview();
        onConfirm();
      });
      document.body.appendChild(dialog);
      ModalManager.showDialog(dialog, closeReview);
    }

    // ── 12. Save button ────────────────────────────────────────────
    saveBtn.addEventListener('click', function () {
      var card = buildCardFromForm();
      if (!card.title) {
        activeGroup = null;
        refreshGroupNav();
        titleInput.focus();
        showToast('請輸入卡片名稱');
        return;
      }

      if (!cardEdited) return;
      confirmCardSave(describeChanges(card), () => {
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
        ModalManager.closeDialog(modalBg);
      });
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
