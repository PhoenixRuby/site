registerPlugin('bookmark', {
  main: true,
  menuOrder: 2,
  label: '書籤',
  menuIcon: 'bookmark',
  icon: null,
  mode: 'bookmark',
  order: 2,
  favicon: function(canvas, ctx) {
    ctx.beginPath();
    ctx.moveTo(8, 4); ctx.lineTo(24, 4); ctx.lineTo(24, 28); ctx.lineTo(16, 22); ctx.lineTo(8, 28); ctx.closePath();
    ctx.fill();
  },
  storageKeys: ['bookmarkData', 'bookmarkTheme', 'bookmarkTabPos', 'bookmarkTabOverflow'],
  loadData(key) {
    return AppStorage.load(this.storageKeys, key);
  },
  saveData(arr, key) {
    AppStorage.save(this.storageKeys, arr, key);
  },
  getDataCount(key) {
	return this.loadData()?.favorites?.length ?? 0;
    //return this.loadData(key).length;
  },
  guestReview: {
    label: '比對本機書籤設定',
    keys: /^bookmark(Theme|TabPos|TabOverflow|_recent_notes)$/,
    groups: ['書籤']
  },
  getGuestCount() { return window.plugins['bookmark-guest']?.count ?? 0; },
  load() {
	const subCssList = ['setting', 'bookmark', 'bookmark-export', 'bookmark-import', 'bookmark-search', 'bookmark-searchcontent', 'bookmark-setting', 'bookmark-editor'];
	const subPlugins = ['bookmark-export', 'bookmark-import', 'bookmark-search', 'bookmark-searchcontent','bookmark-sort', 'bookmark-setting', 'bookmark-data', 'bookmark-editor', 'bookmark-add', 'bookmark-help'];
	
	// 1. 並行（Parallel）載入所有子插件所需的 CSS 樣式表
	const cssPromise = Promise.all(
	  subCssList.map(name => loadPluginCss(name))
	);

    // 2. 並行（Parallel）下載所有子插件的 JavaScript 腳本
    const pluginsPromise = Promise.all(
      subPlugins.map(name => loadPluginScript(name))
    );

    // 3. 當所有樣式與腳本皆載入完成後，啟動初始化流程
    return Promise.all([cssPromise, pluginsPromise, loadPluginCss('bookmark-guest'), loadPluginCss('guest-upload'), loadPluginScript('bookmark-guest')]).then(() => {
      
      // 4. 遍歷並自動執行各個子插件的生命週期 load 函式
      subPlugins.forEach(name => {
        const sub = window.plugins[name];
        if (sub && typeof sub.load === 'function') {
          sub.load();
        }
      });

      // 5. 觸發核心內容載入
      this.init();
      window.plugins['bookmark-guest'].load();
    });
  },
  
  init(){
	var self = this;
    // ── Data ─────────────────────────────────────────────────────────
    let bmData = { themes: [{ id: 'all', name: '全部收藏', icon: '⭐' }], favorites: [] };
    
    // 2. 讀取設定檔，沒傳就直接套用原本的預設純字串
    let currentThemeId = self.loadData('bookmarkTheme')       || 'all';
    let tabPosition    = self.loadData('bookmarkTabPos')      || 'top';
    let tabOverflow    = self.loadData('bookmarkTabOverflow') || 'scroll';
    var _tabScrollNeedsFocus = true;
    var _currentSidebar = null;

    // 3. 重構後的資料載入邏輯（移除了重複的 try-catch，改用通用工具）
    function loadBmData() {
      const parsed = self.loadData('bookmarkData');
      
      // 驗證讀出來的資料是否符合書籤結構（有 themes 和 favorites）
      if (parsed && parsed.themes && parsed.favorites) {
        // 安全檢查：確保有「全部收藏」分類
        if (!parsed.themes.find(t => t.id === 'all')) {
          parsed.themes.unshift({ id: 'all', name: '全部收藏', icon: '⭐' });
        }
        // 資料相容性修正：將舊版的 themeId 改為新版的陣列型 themeIds
        parsed.favorites.forEach(function(f) {
          if (!f.themeIds) {
            f.themeIds = f.themeId ? [f.themeId] : [];
            delete f.themeId;
          }
        });
        bmData = parsed;
        return;
      }
      
      // 💡 如果通用工具讀出來是 null 或損毀，則套用初始預設物件
      bmData = { themes: [{ id: 'all', name: '全部收藏', icon: '⭐' }], favorites: [] };
    }

    // 4. 重構後的儲存邏輯（對齊參數順序：資料在前，Key 在後）
    function saveBmData() {
      self.saveData(bmData, 'bookmarkData');
      if (typeof renderToolbar === 'function') renderToolbar();
    }

    // 執行載入
    loadBmData();

    // ── Helper: get theme name by id ─────────────────────────────────
    function getThemeName(themeId) {
      var t = bmData.themes.find(function (th) { return th.id === themeId; });
      return t ? t.name : '未分類';
    }

    // ── Helper: get favorites for current view ───────────────────────
    function getVisibleFavorites() {
      if (currentThemeId === 'all') return bmData.favorites;
      return bmData.favorites.filter(function (f) { return f.themeIds && f.themeIds.indexOf(currentThemeId) !== -1; });
    }

    // ── Sidebar layout calculator (init-level, shared with openTabSettings) ──
    function applySidebarLayout() {
      var sidebar = _currentSidebar;
      if (!sidebar) return;
      var tb = document.getElementById('toolbar');
      var tbW = 0, tbH = 0, tbPos = 'right';
      if (tb) {
        var tbRect = tb.getBoundingClientRect();
        tbW = tbRect.width;
        tbH = tbRect.height;
        tbPos = document.body.classList.contains('tb-right') ? 'right'
              : document.body.classList.contains('tb-left') ? 'left'
              : document.body.classList.contains('tb-top') ? 'top'
              : document.body.classList.contains('tb-bottom') ? 'bottom' : 'right';
      }
      // Reset sidebar offsets first
      sidebar.style.top = '';
      sidebar.style.bottom = '';
      sidebar.style.left = '';
      sidebar.style.right = '';
      if (tbPos === 'right') sidebar.style.right = tbW + 'px';
      else if (tbPos === 'left') sidebar.style.left = tbW + 'px';
      else if (tbPos === 'top') sidebar.style.top = tbH + 'px';
      else if (tbPos === 'bottom') sidebar.style.bottom = tbH + 'px';

      // Reset body padding
      document.body.style.paddingTop = '';
      document.body.style.paddingBottom = '';
      document.body.style.paddingLeft = '';
      document.body.style.paddingRight = '';

      var sbRect = sidebar.getBoundingClientRect();
      if (tabPosition === 'right' || tabPosition === 'left') {
        var totalSide = tbW + sbRect.width;
        if (tabPosition === 'right') document.body.style.paddingRight = totalSide + 'px';
        else document.body.style.paddingLeft = totalSide + 'px';
      } else if (tabPosition === 'top' || tabPosition === 'bottom') {
        var totalVert = (tbPos === 'top' || tbPos === 'bottom') ? tbH + sbRect.height : sbRect.height;
        if (tabPosition === 'top') document.body.style.paddingTop = totalVert + 'px';
        else document.body.style.paddingBottom = totalVert + 'px';
      }
    }

    // ── Context menu ─────────────────────────────────────────────────
    var activeCtxMenu = null;

    function removeCtxMenu() {
      if (activeCtxMenu) {
        activeCtxMenu.remove();
        activeCtxMenu = null;
      }
    }

    document.addEventListener('click', function () { removeCtxMenu(); });

    function showBookmarkCtxMenu(x, y, favId) {
      removeCtxMenu();
      var menu = document.createElement('div');
      menu.className = 'bm-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var editBtn = document.createElement('button');
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        window.plugins['bookmark-editor'].open({id:favId});
      });

      var copyBtn = document.createElement('button');
      copyBtn.textContent = '複製';
      copyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        var src = bmData.favorites.find(function (f) { return f.id === favId; });
        if (!src) return;
        var clone = JSON.parse(JSON.stringify(src));
        clone.id = 'fav_' + Date.now();
        var base = clone.title.replace(/-copy\(\d+\)$/, '');
        var n = 1;
        while (bmData.favorites.some(function (f) { return f.title === base + '-copy(' + n + ')'; })) n++;
        clone.title = base + '-copy(' + n + ')';
        bmData.favorites.push(clone);
        saveBmData();
        renderBookmarks();
        showToast('書籤已複製');
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = '刪除';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        showDeleteConfirm(favId);
      });

      menu.appendChild(editBtn);
      menu.appendChild(copyBtn);
      menu.appendChild(deleteBtn);
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;

      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    self.applyTabSettings = function(next) {
      tabPosition = next.position;
      tabOverflow = next.overflow;
      renderBookmarks();
      requestAnimationFrame(function() {
        requestAnimationFrame(applySidebarLayout);
      });
    };

    function showThemeCtxMenu(x, y, themeId) {
      removeCtxMenu();
      if (themeId === 'all') return;

      var menu = document.createElement('div');
      menu.className = 'bm-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var renameBtn = document.createElement('button');
      renameBtn.textContent = '重新命名';
      renameBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        openRenameTheme(themeId);
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = '刪除主題';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        showThemeDeleteConfirm(themeId);
      });

      menu.appendChild(renameBtn);
      menu.appendChild(deleteBtn);
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;

      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    // ── renderBookmarks ──────────────────────────────────────────────
    function capturePositions() {
      var map = {};
      document.querySelectorAll('.bm-card[data-fav-id]').forEach(function(el) {
        var r = el.getBoundingClientRect();
        map[el.dataset.favId] = { top: r.top, left: r.left };
      });
      return map;
    }

    function animateFlip(oldPositions) {
      document.querySelectorAll('.bm-card[data-fav-id]').forEach(function(el) {
        var id = el.dataset.favId;
        var old = oldPositions[id];
        if (!old) return;
        var now = el.getBoundingClientRect();
        var dx = old.left - now.left;
        var dy = old.top - now.top;
        if (dx === 0 && dy === 0) return;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        el.style.transition = 'none';
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            el.classList.add('bm-flip');
            el.style.transform = '';
            el.style.transition = '';
            el.addEventListener('transitionend', function handler() {
              el.classList.remove('bm-flip');
              el.removeEventListener('transitionend', handler);
            });
          });
        });
      });
    }

    var _animateEntry = false;
    var _prevFavIds = new Set();
    function renderBookmarks() {
      window.plugins['bookmark-guest']?.refresh?.();
      loadBmData();
      if (typeof renderToolbar === 'function') renderToolbar();
      if (currentThemeId !== 'all' && !bmData.themes.find(function(t) { return t.id === currentThemeId; })) {
        currentThemeId = 'all';
        self.saveData(currentThemeId, 'bookmarkTheme');
      }
      var wrapper = document.getElementById('app-content');
      var oldPositions = capturePositions();
      wrapper.innerHTML = '';

      var oldSidebar = document.getElementById('bmSidebar');
      if (oldSidebar) {
        _tabScrollNeedsFocus = false;
        oldSidebar.remove();
      }

      if (bmData.favorites.length === 0) {
        _currentSidebar = null;
        document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
        document.body.style.paddingTop = ''; document.body.style.paddingBottom = ''; document.body.style.paddingLeft = ''; document.body.style.paddingRight = '';
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'bm-empty';
        emptyDiv.innerHTML = `<div class="bm-empty-icon">${resolveIcon("bookmark", '#38bdf8', 64)}</div><div>尚無書籤</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div>`;
        wrapper.appendChild(emptyDiv);
        return;
      }

      // Build sidebar (fixed, like toolbar)
      var sidebar = document.createElement('div');
      var isHorizontal = (tabPosition === 'top' || tabPosition === 'bottom');
      sidebar.className = 'bm-sidebar bm-sb-' + tabPosition + (isHorizontal ? ' bm-overflow-' + tabOverflow : '');
      sidebar.id = 'bmSidebar';

      // Build theme buttons
      var tabContainer = isHorizontal ? document.createElement('div') : sidebar;
      if (isHorizontal) tabContainer.className = 'bm-tab-scroll';

      bmData.themes.forEach(function (theme) {
        var btn = document.createElement('button');
        if (theme.id === currentThemeId) btn.classList.add('active');
        var count = theme.id === 'all'
          ? bmData.favorites.length
          : bmData.favorites.filter(function (f) { return f.themeIds && f.themeIds.indexOf(theme.id) !== -1; }).length;
        btn.innerHTML = AppUtils.escHtml(theme.icon ? theme.icon + ' ' : '') + AppUtils.escHtml(theme.name) +
          '<span class="bm-tab-count">' + count + '</span>';
        btn.dataset.themeId = theme.id;
        btn.addEventListener('click', function () {
          if (currentThemeId === theme.id) return;
          _prevFavIds = new Set();
          document.querySelectorAll('.bm-card[data-fav-id]').forEach(function(c) {
            _prevFavIds.add(c.dataset.favId);
          });
          _animateEntry = true;
          currentThemeId = theme.id;
          self.saveData(currentThemeId, 'bookmarkTheme');
          // Update active class without rebuilding sidebar
          tabContainer.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          // Update counts
          tabContainer.querySelectorAll('button').forEach(function(b, idx) {
            var t = bmData.themes[idx];
            if (!t) return;
            var c = t.id === 'all' ? bmData.favorites.length : bmData.favorites.filter(function(f) { return f.themeIds && f.themeIds.indexOf(t.id) !== -1; }).length;
            var badge = b.querySelector('.bm-tab-count');
            if (badge) badge.textContent = c;
          });
          renderBookmarkContent();
        });
        btn.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          showThemeCtxMenu(e.clientX, e.clientY, theme.id);
        });
        tabContainer.appendChild(btn);
      });

      if (isHorizontal) {
        // Left arrow
        var arrowLeft = document.createElement('button');
        arrowLeft.className = 'bm-tab-arrow';
        arrowLeft.innerHTML = '◀';
        arrowLeft.addEventListener('click', function() {
          tabContainer.scrollLeft -= 120;
        });

        // Right arrow
        var arrowRight = document.createElement('button');
        arrowRight.className = 'bm-tab-arrow';
        arrowRight.innerHTML = '▶';
        arrowRight.addEventListener('click', function() {
          tabContainer.scrollLeft += 120;
        });

        function updateArrows() {
          arrowLeft.classList.toggle('disabled', tabContainer.scrollLeft <= 0);
          arrowRight.classList.toggle('disabled', tabContainer.scrollLeft >= tabContainer.scrollWidth - tabContainer.clientWidth - 1);
        }
        tabContainer.addEventListener('scroll', updateArrows);
        tabContainer.addEventListener('wheel', function(e) {
          e.preventDefault();
          e.stopPropagation();
          tabContainer.scrollLeft += (e.deltaY || e.deltaX);
        }, { passive: false });

        if (tabOverflow === 'scroll') {
          sidebar.appendChild(arrowLeft);
        }
        sidebar.appendChild(tabContainer);
        if (tabOverflow === 'scroll') {
          sidebar.appendChild(arrowRight);
        }

        // Only on first render (page load): scroll active tab into view
        setTimeout(function() {
          if (_tabScrollNeedsFocus) {
            _tabScrollNeedsFocus = false;
            tabContainer.style.scrollBehavior = 'auto';
            var activeBtn = tabContainer.querySelector('button.active');
            if (activeBtn) {
              var cw = tabContainer.clientWidth;
              var maxScroll = tabContainer.scrollWidth - cw;
              if (activeBtn.offsetLeft + activeBtn.offsetWidth > cw) {
                tabContainer.scrollLeft = maxScroll;
              }
            }
            tabContainer.style.scrollBehavior = '';
          }
          updateArrows();
        }, 50);

        // Fixed right section: dropdown select + gear
        var fixedSection = document.createElement('div');
        fixedSection.className = 'bm-tab-fixed';

        var overflowBtn = null;
        var overflowPopup = null;
        if (tabOverflow === 'dropdown') {
          overflowBtn = document.createElement('button');
          overflowBtn.className = 'bm-tab-overflow-btn';
          overflowBtn.innerHTML = resolveIcon('menu') + '<span class="bm-tab-overflow-badge">0</span>';
          overflowPopup = document.createElement('div');
          overflowPopup.className = 'bm-tab-overflow-popup';
          overflowBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var rect = overflowBtn.getBoundingClientRect();
            overflowPopup.style.top = (rect.bottom + 4) + 'px';
            overflowPopup.style.right = (window.innerWidth - rect.right) + 'px';
            overflowPopup.classList.toggle('open');
          });
          document.addEventListener('click', function() { overflowPopup.classList.remove('open'); });
          fixedSection.appendChild(overflowBtn);
          document.body.appendChild(overflowPopup);
        }

        // 只有下拉溢出模式需要固定區塊；設定入口已移至 Toolbar。
        if (tabOverflow === 'dropdown') sidebar.appendChild(fixedSection);
      }

      if (isHorizontal && tabOverflow === 'wrap') {
        wrapper.appendChild(sidebar);
        document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
        document.body.classList.add('bm-active');
      } else {
        document.body.appendChild(sidebar);
        document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
        document.body.classList.add('bm-active', 'bm-pos-' + tabPosition);
      }

      // ── 儲存 sidebar 參照，雙層 rAF 確保 layout 完全穩定後才計算 ──
      _currentSidebar = sidebar;
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          applySidebarLayout();
        });
      });

      // Dropdown mode: detect overflowing buttons, move to popup menu
      if (overflowBtn && overflowPopup && isHorizontal) {
        function recalcDropdown() {
          var themeButtons = tabContainer.querySelectorAll('button');
          themeButtons.forEach(function(btn) { btn.style.display = ''; });
          overflowPopup.innerHTML = '';
          overflowBtn.style.display = '';

          var containerWidth = tabContainer.clientWidth;
          var overflowCount = 0;
          themeButtons.forEach(function(btn, i) {
            if (btn.offsetLeft + btn.offsetWidth > containerWidth) {
              btn.style.display = 'none';
              var theme = bmData.themes[i];
              if (theme) {
                var menuItem = document.createElement('button');
                menuItem.textContent = (theme.icon || '') + ' ' + theme.name;
                if (theme.id === currentThemeId) menuItem.classList.add('active');
                menuItem.addEventListener('click', function(e) {
                  e.stopPropagation();
                  overflowPopup.classList.remove('open');
                  currentThemeId = theme.id;
                  self.saveData(currentThemeId, 'bookmarkTheme');
                  _animateEntry = true;
                  renderBookmarks();
                });
                overflowPopup.appendChild(menuItem);
                overflowCount++;
              }
            }
          });
          if (overflowCount === 0) {
            overflowBtn.style.display = 'none';
            overflowPopup.classList.remove('open');
          } else {
            overflowBtn.style.display = 'flex';
            overflowBtn.querySelector('.bm-tab-overflow-badge').textContent = overflowCount;
          }
        }
        requestAnimationFrame(recalcDropdown);
        var _dropdownResizeObs = new ResizeObserver(function() { recalcDropdown(); });
        _dropdownResizeObs.observe(tabContainer);
      }

      if (isHorizontal && tabOverflow === 'scroll') {
        new ResizeObserver(function() { updateArrows(); }).observe(tabContainer);
      }

      renderBookmarkContent();
    }

    function renderBookmarkContent() {
      var readerBg = document.querySelector('.bm-reader-bg');
      if (readerBg && readerBg.style.display === 'none') {
        readerBg.style.removeProperty('display');
      }
      var wrapper = document.getElementById('app-content');
      var oldPositions = capturePositions();
      // Clear only bookmark grid content, not sidebar
      var oldGrid = wrapper.querySelector('.bm-grid');
      if (oldGrid) oldGrid.remove();
      var oldEmpty = wrapper.querySelector('.bm-empty');
      if (oldEmpty) oldEmpty.remove();

      var visibleFavs = getVisibleFavorites();

      if (visibleFavs.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'bm-empty';
        emptyDiv.innerHTML = `<div class="bm-empty-icon">${resolveIcon("bookmark", '#38bdf8', 18)}</div><div>尚無書籤</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增書籤</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div>`;
        wrapper.appendChild(emptyDiv);
        return;
      }

      var grid = document.createElement('div');
      grid.className = 'bm-grid';

      var dragSrcId = null;

      visibleFavs.forEach(function (fav) {
        var card = document.createElement('div');
        card.className = 'bm-card';
        card.draggable = true;
        card.dataset.favId = fav.id;

        var thumbDiv = document.createElement('div');
        thumbDiv.className = 'bm-card-thumb';
        if (fav.thumbnail) {
          var img = document.createElement('img');
          img.src = fav.thumbnail;
          img.alt = fav.title;
          img.onerror = function () {
            thumbDiv.innerHTML = '<div class="bm-no-thumb">🌐</div>';
          };
          thumbDiv.appendChild(img);
        } else {
          thumbDiv.innerHTML = '<div class="bm-no-thumb">🌐</div>';
        }

        var body = document.createElement('div');
        body.className = 'bm-card-body';
        body.innerHTML = '<div class="bm-card-title">' + AppUtils.escHtml(fav.title) + '</div>' +
          '<div class="bm-card-url">' + (fav.content ? '📝 筆記' : AppUtils.escHtml(fav.url)) + '</div>';

        var favThemes = fav.themeIds || [];
        var showTags = [];
        if (currentThemeId === 'all' && favThemes.length > 0) {
          showTags = favThemes;
        } else if (currentThemeId !== 'all' && favThemes.length >= 2) {
          showTags = favThemes.filter(function(tid) { return tid !== currentThemeId; });
        }
        if (showTags.length > 0) {
          var tagsDiv = document.createElement('div');
          tagsDiv.className = 'bm-card-tags';
          showTags.forEach(function(tid) {
            var span = document.createElement('span');
            span.className = 'bm-tag';
            span.textContent = getThemeName(tid);
            tagsDiv.appendChild(span);
          });
          body.appendChild(tagsDiv);
        }

        card.appendChild(thumbDiv);
        card.appendChild(body);

        card.addEventListener('click', function () {
          if (fav.content) {
            var notesList = getVisibleFavorites().filter(function(f) { return f.content; });			
            openReader(fav.title, fav.content, fav.notionId, fav.codeLang, fav.id, notesList);
          } else if (fav.url) {
            window.open(fav.url, '_blank');
          }
        });

        card.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          showBookmarkCtxMenu(e.clientX, e.clientY, fav.id);
        });

        card.addEventListener('dragstart', function (e) {
          dragSrcId = fav.id;
          card.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', function () {
          card.style.opacity = '';
          grid.querySelectorAll('.bm-card').forEach(function (c) { c.classList.remove('bm-drag-over'); });
        });
        card.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          grid.querySelectorAll('.bm-card').forEach(function (c) { c.classList.remove('bm-drag-over'); });
          card.classList.add('bm-drag-over');
        });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          card.classList.remove('bm-drag-over');
          if (!dragSrcId || dragSrcId === fav.id) return;
          var srcIdx = bmData.favorites.findIndex(function (f) { return f.id === dragSrcId; });
          var dstIdx = bmData.favorites.findIndex(function (f) { return f.id === fav.id; });
          if (srcIdx === -1 || dstIdx === -1) return;
          var moved = bmData.favorites.splice(srcIdx, 1)[0];
          bmData.favorites.splice(dstIdx, 0, moved);
          saveBmData();
          renderBookmarks();
        });

        grid.appendChild(card);
      });

      wrapper.appendChild(grid);

      if (_animateEntry) {
        _animateEntry = false;
        var newIdx = 0;
        grid.querySelectorAll('.bm-card').forEach(function(c) {
          var id = c.dataset.favId;
          if (_prevFavIds.has(id) && oldPositions[id]) {
            var now = c.getBoundingClientRect();
            var old = oldPositions[id];
            var dx = old.left - now.left;
            var dy = old.top - now.top;
            if (dx !== 0 || dy !== 0) {
              c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
              c.style.transition = 'none';
              requestAnimationFrame(function() { requestAnimationFrame(function() {
                c.classList.add('bm-flip');
                c.style.transform = '';
                c.style.transition = '';
                c.addEventListener('transitionend', function h() { c.classList.remove('bm-flip'); c.removeEventListener('transitionend', h); });
              }); });
            }
          } else {
            c.style.animationDelay = (newIdx * 50) + 'ms';
            c.classList.add('bm-enter');
            c.addEventListener('animationend', function h() { c.classList.remove('bm-enter'); c.style.animationDelay = ''; c.removeEventListener('animationend', h); });
            newIdx++;
          }
        });
        _prevFavIds = new Set();
      } else {
        animateFlip(oldPositions);
      }
    }

    // ── Reader panel ──────────────────────────────────────────────────
    function extractNotionId(str) {
      if (!str) return null;
      var m = str.match(/([a-f0-9]{32})/);
      return m ? m[1] : null;
    }

    function slugify(text) {
      return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, '');
    }

    function replaceNotionLinks(md, selfNotionId, linkOtherNotes = true) {
      return md.replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]*notion\.so[^\s)]*)\)/g, function(match, text, href) {
        var hrefId = extractNotionId(href);
        if (!hrefId) return match;

        if (selfNotionId && hrefId === selfNotionId) {
          return '[' + text + '](#' + slugify(text) + ')';
        }

        if (!linkOtherNotes) return match;
        var found = bmData.favorites.find(function(f) {
          if (!f.content) return false;
          if (f.notionId === hrefId) return true;
          if (f.url && extractNotionId(f.url) === hrefId) return true;
          if (f.title && f.title === text) return true;
          return false;
        });
        if (found) return '[' + text + '](#bm:' + found.id + ')';
        return match;
      });
    }

    var readerScroll = null;
    var currentReaderNotionId = null;
    var currentReaderCodeLang = 'auto';

    function getLangLabel(codeLang) {
      var map = {auto:'Auto',javascript:'JavaScript',typescript:'TypeScript',css:'CSS',csharp:'C#',bash:'WSL / Bash',python:'Python',markdown:'Markdown',html:'HTML',json:'JSON',sql:'SQL',xml:'XML',yaml:'YAML',ini:'Config / INI',plaintext:'Text'};
      return map[codeLang] || codeLang || 'Auto';
    }

    function highlightReaderCode(container, codeLang) {
      if (!window.hljs) return;
      var blocks = container.querySelectorAll('pre code');
      if (blocks.length === 0) return;
      blocks.forEach(function(block) {
        block.removeAttribute('data-highlighted');
        var hasLangClass = Array.from(block.classList).some(function(c) { return /^language-/.test(c); });
        if (codeLang && codeLang !== 'auto' && codeLang !== 'plaintext') {
          if (!hasLangClass) block.className = 'language-' + codeLang;
          hljs.highlightElement(block);
        } else if (codeLang === 'plaintext') {
          block.classList.add('hljs');
        } else {
          hljs.highlightElement(block);
        }
      });
    }

    function detectLangFromTitle(title) {
      if (!title) return null;
      var ext = (title.match(/\.([a-zA-Z0-9]+)$/) || [])[1];
      if (!ext) {
        // 無副檔名但整個名稱是已知 config 檔
        var known = { pg_hba: 'ini', pgpass: 'ini', dockerfile: 'ini', makefile: 'bash', gemfile: 'ruby', procfile: 'ini' };
        return known[title.toLowerCase()] || null;
      }
      var map = {
        js: 'javascript', mjs: 'javascript', cjs: 'javascript',
        ts: 'typescript', tsx: 'typescript',
        py: 'python', pyw: 'python',
        cs: 'csharp',
        css: 'css', scss: 'css', less: 'css',
        html: 'html', htm: 'html',
        xml: 'xml', svg: 'xml', xsl: 'xml',
        json: 'json', jsonc: 'json',
        sql: 'sql',
        sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
        yaml: 'yaml', yml: 'yaml',
        md: 'markdown', mdx: 'markdown',
        conf: 'ini', cfg: 'ini', ini: 'ini', env: 'ini', toml: 'ini',
        txt: 'plaintext', log: 'plaintext'
      };
      return map[ext.toLowerCase()] || null;
    }

    function detectLangFromContent(content) {
      if (!content) return 'auto';
      var trimmed = content.trim();

      // 整個內容就是單一 code block → 返回該語言
      var singleFence = trimmed.match(/^```(\w+)\n[\s\S]*?```\s*$/);
      if (singleFence) return singleFence[1] || 'auto';

      var sample = content.substring(0, 3000);

      // Config / INI（先於 markdown，避免 # 注釋被誤判為標題）
      if (/^(local|host|hostssl|hostnossl|hostgssenc|hostnogssenc)\s+\S/m.test(sample)) return 'ini';
      if (/^\[[\w\s.-]+\]/m.test(sample) && /^[\w.-]+\s*=\s*\S/m.test(sample)) return 'ini';

      // Markdown 特徵計分
      var mdScore = 0;
      // # 標題：只有非全大寫的才算真正標題（全大寫通常是 config 注釋）
      if (/^#{1,6}\s+(?![A-Z_\s]+$)\S/m.test(sample)) mdScore += 3;
      if (/^\s*[-*]\s+/m.test(sample)) mdScore += 2;
      if (/\[.+?\]\(.+?\)/.test(sample)) mdScore += 2;
      if (/```/.test(sample)) mdScore += 2;
      if (/\*\*.+?\*\*|__.+?__/.test(sample)) mdScore += 1;
      if (/^>\s/m.test(sample)) mdScore += 1;
      if (mdScore >= 3) return 'markdown';

      if (/\bSELECT\b.*\bFROM\b/i.test(sample) || /\bINSERT\s+INTO\b/i.test(sample) || /\bCREATE\s+TABLE\b/i.test(sample)) return 'sql';
      if (/\busing\s+System\b/.test(sample) || /\bnamespace\s+\w/.test(sample) || /\bpublic\s+(class|void|static|async)\b/.test(sample)) return 'csharp';
      if (/\bdef\s+\w+\s*\(/.test(sample) || (/\bimport\s+\w+/.test(sample) && /:\s*$/m.test(sample))) return 'python';
      if (/\binterface\s+\w+|:\s*(string|number|boolean|void|any|never)\b/.test(sample)) return 'typescript';
      if (/\bfunction\s*[\w]*\s*\(/.test(sample) || /\bconst\s+\w+\s*=/.test(sample) || /\bconsole\.log\b/.test(sample) || /=>\s*\{/.test(sample)) return 'javascript';
      if (/^\s*[\w-]+\s*:\s*[^;{]+;/m.test(sample) && /\{[\s\S]*?\}/.test(sample) && /@media|\.[\w-]+\s*\{|#[\w-]+\s*\{/.test(sample)) return 'css';
      if (/^\s*<\?xml/.test(sample) || (/^\s*<[\w:]+[\s>]/.test(sample) && /<\/[\w:]+>/.test(sample))) return 'xml';
      if (/^\s*<[\w!]/.test(sample) && /<\/\w+>/.test(sample)) return 'html';
      if (/^\s*\{[\s\S]*?"[\w]+"/.test(sample) || /^\s*\[[\s\S]*?\{/.test(sample)) return 'json';
      if (/^\s*[$#]\s|^\s*(sudo|apt|yum|dnf|chmod|chown|grep|awk|sed|curl|wget)\s/m.test(sample)) return 'bash';
      if (/^[\w-]+:\s+\S/m.test(sample) && /^---/m.test(sample)) return 'yaml';
      // 大量 # 注釋行且無 markdown inline 語法 → config
      if (/^#/m.test(sample) && !/\[.+?\]\(.+?\)|\*\*.+?\*\*/.test(sample) && /^[\w.-]+\s*[=:]/m.test(sample)) return 'ini';
      return 'auto';
    }

    function applyHljsLineNumbers(container) {
      if (!window.hljs || !window.hljs.lineNumbersBlock) return;
      var blocks = container.querySelectorAll('pre code');
      blocks.forEach(function(block) {
        hljs.lineNumbersBlock(block);
      });
    }

    function getCodeText(codeEl) {
      var table = codeEl.querySelector('.hljs-ln');
      if (table) {
        var lines = [];
        table.querySelectorAll('.hljs-ln-code').forEach(function(td) {
          lines.push(td.innerText);
        });
        return lines.join('\n');
      }
      return codeEl.innerText;
    }

    function addCodeCopyButtons(container) {
      container.querySelectorAll('pre').forEach(function(pre) {
        if (pre.querySelector('.bm-code-copy')) return;
        var codeEl = pre.querySelector('code');
        if (!codeEl) return;
        var btn = document.createElement('button');
        btn.className = 'bm-code-copy';
        btn.textContent = 'Copy';
        btn.addEventListener('click', function() {
          var text = getCodeText(codeEl).trim();
          navigator.clipboard.writeText(text).then(function() {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function() {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 1800);
          });
        });
        pre.appendChild(btn);
      });
    }

    function renderAndHighlight(container, content, codeLang, context) {
      var effectiveLang = codeLang;
      if (effectiveLang === 'auto') effectiveLang = detectLangFromTitle(context ? context.title : currentReaderTitle) || detectLangFromContent(content);

      var isMarkdown = !context?.source && (effectiveLang === 'markdown' || effectiveLang === 'auto');

      if (isMarkdown) {
        var rendered = replaceNotionLinks(content, context ? context.notionId : currentReaderNotionId);
        if (renderMarkdown) {
          container.replaceChildren(renderMarkdown(rendered, { headingId: slugify, allowMedia: true }));
        } else {
          container.innerHTML = '<pre>' + AppUtils.escHtml(content) + '</pre>';
        }
        var mermaidJobs = collectMermaidJobs(container);
        highlightReaderCode(container, effectiveLang);
        applyHljsLineNumbers(container);
        addCodeCopyButtons(container);
        if (mermaidJobs.length > 0) renderMermaidJobs(mermaidJobs);
        container.querySelectorAll('a[href]').forEach(function(a) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.addEventListener('click', function(e) {
            e.preventDefault();
            window.bmShowLinkConfirm(a.href);
          });
        });
      } else {
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        if (effectiveLang === 'plaintext') {
          code.classList.add('hljs', 'nohighlight');
        } else {
          code.className = 'language-' + effectiveLang;
        }
        code.textContent = content;
        pre.appendChild(code);
        container.innerHTML = '';
        container.appendChild(pre);
        if (effectiveLang !== 'plaintext') {
          highlightReaderCode(container, effectiveLang);
        }
        applyHljsLineNumbers(container);
      }

      return effectiveLang;
    }

    var currentReaderFavId = null;
    var currentReaderContent = null;
    var currentReaderTitle = null;

    const recentNoteKey = ['bookmark_recent_notes'];
    const storedRecentNotes = AppStorage.load(recentNoteKey);
    let recentReaderNotes = Array.isArray(storedRecentNotes) ? storedRecentNotes : [];

    function rememberReaderNote(id) {
      if (id == null || recentReaderNotes.at(-1) === id) return;
      recentReaderNotes = [...recentReaderNotes.filter(noteId => noteId !== id), id].slice(-12);
      AppStorage.save(recentNoteKey, recentReaderNotes);
    }

    function openReader(title, content, notionId, codeLang, favId, notesList) {
      currentReaderNotionId = notionId || null;
      currentReaderCodeLang = codeLang || 'auto';
      currentReaderFavId = favId || null;
      currentReaderContent = content;
      currentReaderTitle = title || null;

      var readerNotes = notesList || bmData.favorites.filter(function(f) { return f.content; });
      var readerListOpen = false;
      var readerListTabFilter = currentThemeId || 'all';
      var readerRightFavId = null;
      var readerRightContent = null;
      var readerRightScroll = null;
      var activePaneId = 'left'; // 'left' | 'right'

      function getNoteIndex(favId) {
        var id = favId !== undefined ? favId : currentReaderFavId;
        return readerNotes.findIndex(function(f) { return f.id === id; });
      }
	  
      var readerBg = document.querySelector('.bm-reader-bg');
      if (readerBg){
        readerBg.style.removeProperty('display');
      }

      prepareMarkdown(function() {
      loadHljs(function() {
        var effectiveLang = currentReaderCodeLang;
        if (effectiveLang === 'auto') effectiveLang = detectLangFromTitle(currentReaderTitle) || detectLangFromContent(content);
        var badgeLabel = getLangLabel(effectiveLang !== 'auto' ? effectiveLang : 'auto');
        var readerLeftEffectiveLang = effectiveLang;
        var readerRightEffectiveLang = 'auto';

        var reader = document.createElement('div');
        reader.className = 'bm-reader-bg';

        // ── Shared inline icons ──────────────────────────────────────────
        var ICO_MENU          = resolveIcon('menu');
        var ICO_COPY          = paneActionIcon('copy');
        var ICO_EDIT          = paneActionIcon('edit');
        var ICO_EXPORT        = paneActionIcon('export');
        var ICO_SEARCH        = resolveIcon('search');
        var ICO_CHEVRON_RIGHT = resolveIcon('chevron-right');

        function paneActionIcon(name) {
          return '<span data-svgicon="' + name + '" aria-hidden="true"></span>';
        }

        function buildPaneNav(favId, btnPrevId, btnNextId, counterId) {
          var idx = getNoteIndex(favId);
          var total = readerNotes.length;
          if (total <= 1) return '<div class="bm-reader-pane-nav"></div>';
          return '<div class="bm-reader-pane-nav">' +
            '<button id="' + btnPrevId + '" title="上一則" ' + (idx <= 0 ? 'disabled' : '') + '>&#8592;</button>' +
            '<span id="' + counterId + '">' + (idx + 1) + '/' + total + '</span>' +
            '<button id="' + btnNextId + '" title="下一則" ' + (idx >= total - 1 ? 'disabled' : '') + '>&#8594;</button>' +
          '</div>';
        }

        function buildHeader() {
          var listActiveClass = readerListOpen ? ' active' : '';
          return '<div class="bm-reader-header">' +
            '<button class="bm-hdr-btn bm-hdr-back" id="bmReaderBack" title="返回 (Esc)">← <kbd>Esc</kbd></button>' +
            '<button class="bm-hdr-btn' + listActiveClass + '" id="bmReaderListBtn" title="筆記清單">' + ICO_MENU + ' 筆記清單</button>' +
			'<button class="bm-hdr-btn bm-hdr-mainmenu" id="bmReaderMainMenu" title="主選單">' + resolveIcon('mainmenu') + '</button>' +
          '</div>';
        }

        function buildLeftPaneHd() {
		  const isSplit = !!readerRightFavId;
		  const activeClass = isSplit ? (activePaneId === 'left' ? ' bm-pane-active' : ' bm-pane-inactive') : '';
		  return `
		    <div class="bm-reader-pane-hd${activeClass}" id="bmReaderLeftPaneHd">
		      ${buildPaneNav(currentReaderFavId, 'bmReaderPrevL', 'bmReaderNextL', 'bmReaderCounterL')}
		      <span class="bm-reader-pane-hd-title">${AppUtils.escHtml(currentReaderTitle || '')}</span>
		      <span class="bm-reader-pane-lang-badge">${AppUtils.escHtml(getLangLabel(readerLeftEffectiveLang))}</span>
		      <div class="bm-reader-pane-hd-actions">
		        <button class="bm-reader-pane-hd-btn" id="bmPaneLCopy" title="複製">${ICO_COPY} 複製</button>
		        <button class="bm-reader-pane-hd-btn" id="bmPaneLEdit" title="編輯">${ICO_EDIT} 編輯</button>
		        <button type="button" class="bm-reader-pane-hd-btn" id="bmPaneLExport" title="匯出 HTML" aria-label="匯出 HTML">${ICO_EXPORT}</button>
		      </div>
		      <button class="bm-reader-pane-close" id="bmReaderLeftClose" title="${isSplit ? '關閉左側' : '關閉'}">✕</button>
		    </div>
		  `;
		}
		
		function buildRightPaneHd() {
		  if (!readerRightFavId) return '';
		  const rightFav = readerNotes.find(f => f.id === readerRightFavId) ||
		                   bmData.favorites.find(f => f.id === readerRightFavId);
		  const rightTitle = rightFav ? (rightFav.title || '') : '';
		  const activeClass = activePaneId === 'right' ? ' bm-pane-active' : '';
		  return `
		    <div class="bm-reader-pane-hd${activeClass}" id="bmReaderRightPaneHd">
		      ${buildPaneNav(readerRightFavId, 'bmReaderPrevR', 'bmReaderNextR', 'bmReaderCounterR')}
		      <span class="bm-reader-pane-hd-title" id="bmReaderRightTitle">${AppUtils.escHtml(rightTitle)}</span>
		      <span class="bm-reader-pane-lang-badge">${AppUtils.escHtml(getLangLabel(readerRightEffectiveLang))}</span>
		      <div class="bm-reader-pane-hd-actions">
		        <button class="bm-reader-pane-hd-btn" id="bmPaneRCopy" title="複製右側內容">${ICO_COPY} 複製</button>
		        <button class="bm-reader-pane-hd-btn" id="bmPaneREdit" title="編輯">${ICO_EDIT} 編輯</button>
		        <button type="button" class="bm-reader-pane-hd-btn" id="bmPaneRExport" title="匯出 HTML" aria-label="匯出 HTML">${ICO_EXPORT}</button>
		      </div>
		      <button class="bm-reader-pane-close" id="bmReaderRightClose" title="關閉右側">✕</button>
		    </div>
		  `;
		}

        reader.innerHTML = `
		  ${buildHeader()}
		  <div class="bm-reader-body">
		    <div class="bm-reader-list bm-list-hidden" id="bmReaderList">
		      <div class="bm-reader-list-search">
		        <input id="bmReaderSearch" placeholder="搜尋筆記..." autocomplete="off">
		        <span class="bm-list-search-icon">${ICO_SEARCH}</span>
		        <button class="bm-reader-list-close" id="bmReaderListClose" title="關閉清單">✕</button>
		      </div>
		      <div class="bm-reader-list-tabs" id="bmReaderListTabs"></div>
		      <div class="bm-reader-list-items" id="bmReaderListItems"></div>
		    </div>
		    <div class="bm-reader-list-tab bm-tab-visible" id="bmReaderListTab" title="開啟筆記清單">${ICO_CHEVRON_RIGHT}</div>
		    <div class="bm-reader-main">
		      <div class="bm-reader-pane" id="bmReaderLeftPane">
		        ${buildLeftPaneHd()}
		        <div class="bm-reader-content" id="bmReaderContent">
		          <div class="bm-reader-inner" id="bmReaderInner"></div>
		        </div>
		      </div>
		      <div class="bm-reader-resizer" id="bmReaderResizer"></div>
		      <div class="bm-reader-right bm-pane-hidden" id="bmReaderRight">
		        ${buildRightPaneHd()}
		        <div class="bm-reader-content" id="bmReaderRightContent">
		          <div class="bm-reader-inner" id="bmReaderRightInner"></div>
		        </div>
		      </div>
		    </div>
		  </div>
		`;


        // Swap button: lives directly on reader (position:fixed context) so it can sit at the top of the resizer bar
        var swapBtnEl = document.createElement('button');
        swapBtnEl.id = 'bmResizerSwap';
        swapBtnEl.className = 'bm-resizer-swap';
        swapBtnEl.title = '互換左右';
        swapBtnEl.textContent = '⇄';
        swapBtnEl.style.display = 'none';
        reader.appendChild(swapBtnEl);
        swapBtnEl.addEventListener('click', function(e){ e.stopPropagation(); doSwapPanes(); });

        function positionSwapBtn() {
          var resizerEl = document.getElementById('bmReaderResizer');
          var headerEl = reader.querySelector('.bm-reader-header');
          if (!resizerEl || !headerEl || !readerRightFavId) { swapBtnEl.style.display = 'none'; return; }
          var rRect = resizerEl.getBoundingClientRect();
          var hRect = headerEl.getBoundingClientRect();
          swapBtnEl.style.display = 'flex';
          swapBtnEl.style.left = (rRect.left + rRect.width / 2) + 'px';
          swapBtnEl.style.top = (hRect.top + 13) + 'px';
          swapBtnEl.style.transform = 'translateX(-50%)';
        }

        document.body.appendChild(reader);
        rememberReaderNote(favId);

        var innerEl = document.getElementById('bmReaderInner');
        renderAndHighlight(innerEl, content, effectiveLang);

        var contentEl = document.getElementById('bmReaderContent');
        contentEl.style.overflow = 'auto';
        contentEl.style.scrollbarWidth = 'none';
        if (typeof NiceScroll === 'function') {
          readerScroll = new NiceScroll('#bmReaderContent');
        }

        var isEditing = false;
        var editingPane = null;
        var cmEditor = null;
        var readerEdited = false;
        function getLeftTitleEl() { return reader.querySelector('#bmReaderLeftPaneHd .bm-reader-pane-hd-title'); }
        var readerTitleEl = null; // unused; use getLeftTitleEl() instead

        // ── Rebuild header + pane headers ───────────────────────────────
        function refreshHeader() {
          var oldHeader = reader.querySelector('.bm-reader-header');
          var tmpDiv = document.createElement('div');
          tmpDiv.innerHTML = buildHeader();
          reader.replaceChild(tmpDiv.firstElementChild, oldHeader);
          bindHeaderBtns();
          refreshPaneHeaders();
        }

        function refreshPaneHeaders() {
          var isSplit = !!readerRightFavId;
          // Left pane header
          var oldL = document.getElementById('bmReaderLeftPaneHd');
          var tmpL = document.createElement('div');
          tmpL.innerHTML = buildLeftPaneHd();
          var newL = tmpL.firstElementChild;
          if (oldL) oldL.parentNode.replaceChild(newL, oldL);
          // Right pane header
          var rightEl = document.getElementById('bmReaderRight');
          if (isSplit && rightEl) {
            var oldR = document.getElementById('bmReaderRightPaneHd');
            var tmpR = document.createElement('div');
            tmpR.innerHTML = buildRightPaneHd();
            var newR = tmpR.firstElementChild;
            if (oldR) { oldR.parentNode.replaceChild(newR, oldR); }
            else { rightEl.insertBefore(newR, rightEl.firstChild); }
          }
          bindPaneNavBtns();
        }

        // ── Load note into main pane ─────────────────────────────────────
        function loadNote(fav) {
          confirmLeave(readerEdited, function() {
            findL.close();
            if (isEditing) { isEditing = false; cmEditor = null; }
            readerEdited = false;
            currentReaderNotionId = fav.notionId || null;
            currentReaderCodeLang = fav.codeLang || 'auto';
            currentReaderFavId = fav.id;
            rememberReaderNote(fav.id);
            currentReaderContent = fav.content;
            currentReaderTitle = fav.title || null;
            var lang = currentReaderCodeLang;
            if (lang === 'auto') lang = detectLangFromTitle(currentReaderTitle) || detectLangFromContent(currentReaderContent);
            readerLeftEffectiveLang = lang;
            innerEl.classList.remove('bm-editing');
            renderAndHighlight(innerEl, currentReaderContent, lang);
            contentEl.scrollTop = 0;
            if (readerScroll) readerScroll.updateScrollbar();
            refreshHeader();
            refreshListHighlight();
          });
        }

        // ── Navigate prev / next (pane-aware) ───────────────────────────
        function navNote(delta) {
          if (activePaneId === 'right' && readerRightFavId) {
            var ridx = getNoteIndex(readerRightFavId);
            var rnext = readerNotes[ridx + delta];
            if (rnext) loadRightNote(rnext);
          } else {
            var idx = getNoteIndex();
            var next = readerNotes[idx + delta];
            if (next) loadNote(next);
          }
        }

        // ── Right split pane ─────────────────────────────────────────────
        function loadRightNote(fav) {
          findR.close();
          readerRightFavId = fav.id;
          rememberReaderNote(fav.id);
          readerRightContent = fav.content;
          var rightInner = document.getElementById('bmReaderRightInner');
          var rightContent = document.getElementById('bmReaderRightContent');
          if (!rightInner) return;
          var lang = fav.codeLang || 'auto';
          if (lang === 'auto') lang = detectLangFromTitle(fav.title) || detectLangFromContent(fav.content);
          readerRightEffectiveLang = lang;
          rightInner.innerHTML = '';
          renderAndHighlight(rightInner, fav.content, lang);
          rightContent.scrollTop = 0;
          if (readerRightScroll) readerRightScroll.updateScrollbar();
          refreshPaneHeaders();
          refreshListHighlight();
        }

        function openRightPane(fav) {
          readerRightFavId = fav.id;
          rememberReaderNote(fav.id);
          readerRightContent = fav.content;
          activePaneId = 'right';
          var rightEl = document.getElementById('bmReaderRight');
          var resizerEl = document.getElementById('bmReaderResizer');
          rightEl.classList.remove('bm-pane-hidden');
          if (resizerEl) resizerEl.classList.add('bm-split-show');
          // Remove old pane header and inject fresh one
          var oldHd = document.getElementById('bmReaderRightPaneHd');
          if (oldHd) oldHd.remove();
          var tmpR = document.createElement('div');
          tmpR.innerHTML = buildRightPaneHd();
          rightEl.insertBefore(tmpR.firstElementChild, rightEl.firstChild);
          bindPaneNavBtns();
          // Render content
          var rightInner = document.getElementById('bmReaderRightInner');
          var rightContent = document.getElementById('bmReaderRightContent');
          var lang = fav.codeLang || 'auto';
          if (lang === 'auto') lang = detectLangFromTitle(fav.title) || detectLangFromContent(fav.content);
          readerRightEffectiveLang = lang;
          rightInner.innerHTML = '';
          renderAndHighlight(rightInner, fav.content, lang);
          rightContent.style.overflow = 'auto';
          rightContent.style.scrollbarWidth = 'none';
          if (typeof NiceScroll === 'function') {
            if (readerRightScroll) readerRightScroll.destroy();
            readerRightScroll = new NiceScroll('#bmReaderRightContent');
          }
          // Refresh left pane header (show nav + active state)
          refreshHeader();
          positionSwapBtn();
          refreshListHighlight();
        }

        function closeRightPane() {
          var wasRightActive = activePaneId === 'right';
          readerRightFavId = null;
          activePaneId = 'left';
          var rightEl = document.getElementById('bmReaderRight');
          var resizerEl = document.getElementById('bmReaderResizer');
          rightEl.classList.add('bm-pane-hidden');
          if (resizerEl) resizerEl.classList.remove('bm-split-show');
          if (readerRightScroll) { readerRightScroll.destroy(); readerRightScroll = null; }
          // Reset flex widths
          var leftPane = document.getElementById('bmReaderLeftPane');
          if (leftPane) leftPane.style.flex = '';
          refreshHeader();
          positionSwapBtn();
        }

        // ── Bind per-pane nav buttons ────────────────────────────────────
        function bindPaneNavBtns() {
          var pL = document.getElementById('bmReaderPrevL');
          var nL = document.getElementById('bmReaderNextL');
          var pR = document.getElementById('bmReaderPrevR');
          var nR = document.getElementById('bmReaderNextR');
          if (pL) pL.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(); var f=readerNotes[i-1]; if(f) loadNote(f); });
          if (nL) nL.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(); var f=readerNotes[i+1]; if(f) loadNote(f); });
          if (pR) pR.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(readerRightFavId); var f=readerNotes[i-1]; if(f) loadRightNote(f); });
          if (nR) nR.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(readerRightFavId); var f=readerNotes[i+1]; if(f) loadRightNote(f); });
          // Close right pane
          var closeRBtn = document.getElementById('bmReaderRightClose');
          if (closeRBtn) closeRBtn.addEventListener('click', function(e){ e.stopPropagation(); closeRightPane(); });
          // Close left pane (swap right→main, hide right)
          var closeLBtn = document.getElementById('bmReaderLeftClose');
          if (closeLBtn) closeLBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!readerRightFavId) { doClose(); return; }
            var rightFav = readerNotes.find(function(f){ return f.id === readerRightFavId; }) ||
                           bmData.favorites.find(function(f){ return f.id === readerRightFavId; });
            if (rightFav) loadNote(rightFav);
            closeRightPane();
          });
          for (const [suffix, side] of [['L', 'left'], ['R', 'right']]) {
            const button = document.getElementById('bmPane' + suffix + 'Export');
            if (!button) continue;
            button.addEventListener('click', async function(e) {
              e.stopPropagation();
              if (isEditing && editingPane === side) {
                showToast('請先儲存或取消編輯後再匯出');
                return;
              }
              const id = side === 'left' ? currentReaderFavId : readerRightFavId;
              const fav = bmData.favorites.find(item => item.id === id);
              if (!fav) return;
              button.disabled = true;
              try {
                await self.exportHtml([{ ...fav }]);
                showToast('已匯出 HTML');
              } catch (_) {
                showToast('HTML 匯出失敗，請再試一次');
              } finally {
                button.disabled = false;
              }
            });
          }
          // Left pane copy / edit
          var paneLCopy = document.getElementById('bmPaneLCopy');
          if (paneLCopy) paneLCopy.addEventListener('click', function(e){
            e.stopPropagation();
            navigator.clipboard.writeText(currentReaderContent).then(function(){ showToast('已複製左側內容'); });
          });
          var paneLEdit = document.getElementById('bmPaneLEdit');
          if (paneLEdit) paneLEdit.addEventListener('click', function(e){ e.stopPropagation(); enterEditMode('left'); });
          // Right pane copy / edit
          var paneRCopy = document.getElementById('bmPaneRCopy');
          if (paneRCopy) paneRCopy.addEventListener('click', function(e){
            e.stopPropagation();
            navigator.clipboard.writeText(readerRightContent || '').then(function(){ showToast('已複製右側內容'); });
          });
          var paneREdit = document.getElementById('bmPaneREdit');
          if (paneREdit) paneREdit.addEventListener('click', function(e){ e.stopPropagation(); enterEditMode('right'); });
        }

        function activateReaderPane(event) {
          const pane = event.target.closest('.bm-reader-pane, .bm-reader-right');
          if (!pane || event.target.closest('.bm-reader-pane-hd') || !readerRightFavId) return;
          const side = pane.id === 'bmReaderLeftPane' ? 'left' : 'right';
          if (activePaneId === side) return;
          activePaneId = side;
          refreshPaneHeaders();
        }
        reader.addEventListener('mousedown', activateReaderPane);

        // ── Note list sidebar ────────────────────────────────────────────
        function buildListTabs() {
          var tabsEl = document.getElementById('bmReaderListTabs');
          if (!tabsEl) return;
          var seenIds = {};
          readerNotes.forEach(function(f) {
            (f.themeIds || []).forEach(function(tid) { seenIds[tid] = true; });
          });
          var themes = bmData.themes.filter(function(t) { return seenIds[t.id]; });
          if (!themes.length) { tabsEl.style.display = 'none'; return; }
          tabsEl.style.display = '';

          if (readerListTabFilter !== 'all') {
            // Show label for the active theme; tapping it resets to 'all'
            var activeTheme = bmData.themes.find(function(t) { return t.id === readerListTabFilter; });
            var label = activeTheme ? activeTheme.name : '全部';
            tabsEl.innerHTML = '<span class="bm-list-tab-label">' + AppUtils.escHtml(label) +
              ' <button class="bm-list-tab-reset" title="顯示全部">✕</button></span>';
            tabsEl.querySelector('.bm-list-tab-reset').addEventListener('click', function() {
              readerListTabFilter = 'all';
              buildListTabs();
              buildListItems((document.getElementById('bmReaderSearch') || {}).value || '');
            });
          } else {
            // Show all tabs
            var html = '<button class="bm-list-tab active" data-tab="all">全部</button>';
            themes.forEach(function(t) {
              html += '<button class="bm-list-tab" data-tab="' + AppUtils.escHtml(t.id) + '">' + AppUtils.escHtml(t.name) + '</button>';
            });
            tabsEl.innerHTML = html;
            tabsEl.querySelectorAll('.bm-list-tab').forEach(function(btn) {
              btn.addEventListener('click', function() {
                readerListTabFilter = this.dataset.tab;
                buildListTabs();
                buildListItems((document.getElementById('bmReaderSearch') || {}).value || '');
              });
            });
          }
        }

        function buildListItems(filter) {
          var listEl = document.getElementById('bmReaderListItems');
          if (!listEl) return;
          listEl.innerHTML = '';
          var q = (filter || '').toLowerCase();
          var showAll = readerListTabFilter === 'all';
          var notes = showAll ? readerNotes : readerNotes.filter(function(f) {
            return (f.themeIds || []).indexOf(readerListTabFilter) !== -1;
          });
          notes.forEach(function(f) {
            if (q && f.title && f.title.toLowerCase().indexOf(q) === -1) return;
            var item = document.createElement('div');
            var isLeft = f.id === currentReaderFavId;
            var isRight = f.id === readerRightFavId;
            item.className = 'bm-reader-list-item' + (isLeft ? ' active' : '') + (isRight ? ' active-right' : '');
            var titleText = AppUtils.escHtml(f.title || '（無標題）');
            if (q && f.title) {
              var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
              titleText = AppUtils.escHtml(f.title).replace(re, '<mark class="bm-list-highlight">$1</mark>');
            }
            var themeTagsHtml = '';
            if (showAll && f.themeIds && f.themeIds.length) {
              themeTagsHtml = '<span class="bm-list-theme-tags">' +
                f.themeIds.map(function(tid) {
                  return '<span class="bm-list-theme-tag">' + AppUtils.escHtml(getThemeName(tid)) + '</span>';
                }).join('') + '</span>';
            }
            item.innerHTML = '<span class="bm-list-title">' + titleText + '</span>' +
              themeTagsHtml +
              '<button class="bm-list-split-btn" title="並排開啟">⇌</button>';
            item.querySelector('.bm-list-title').addEventListener('click', function() {
              if (activePaneId === 'right' && readerRightFavId) loadRightNote(f);
              else loadNote(f);
            });
            item.querySelector('.bm-list-split-btn').addEventListener('click', function(e) {
              e.stopPropagation();
              openRightPane(f);
            });
            listEl.appendChild(item);
          });
        }
        function refreshListHighlight() {
          var items = document.querySelectorAll('.bm-reader-list-item');
          items.forEach(function(item) {
            item.classList.toggle('active', false);
          });
          var q = (document.getElementById('bmReaderSearch') || {}).value || '';
          buildListItems(q);
        }
        function toggleList() {
          readerListOpen = !readerListOpen;
          var listEl = document.getElementById('bmReaderList');
          var tabEl = document.getElementById('bmReaderListTab');
          listEl.classList.toggle('bm-list-hidden', !readerListOpen);
          if (tabEl) tabEl.classList.toggle('bm-tab-visible', !readerListOpen);
          if (readerListOpen) {
            buildListTabs();
            buildListItems('');
            var si = document.getElementById('bmReaderSearch');
            if (si) si.focus();
          }
          var btn = document.getElementById('bmReaderListBtn');
          if (btn) btn.classList.toggle('active', readerListOpen);
        }


        // ── Quick note picker ────────────────────────────────────────────
        const cmdBg = document.createElement('div');
        cmdBg.className = 'bm-reader-cmd-bg';
        cmdBg.style.display = 'none';
        cmdBg.innerHTML = `
          <section class="bm-reader-cmd" aria-label="快速開啟筆記">
            <label for="bmReaderCmdInput">快速開啟筆記</label>
            <input id="bmReaderCmdInput" type="search" role="combobox" aria-autocomplete="list"
              aria-expanded="false" aria-controls="bmReaderQuickResults" autocomplete="off" placeholder="搜尋筆記標題…">
            <p class="bm-reader-quick-status" role="status"></p>
            <ul id="bmReaderQuickResults" role="listbox" aria-label="筆記"></ul>
            <div class="bm-reader-cmd-hint">↑ ↓ 選取 · Enter 開啟 · Shift+Enter 並排 · Esc 關閉</div>
          </section>`;
        reader.appendChild(cmdBg);

        const cmdInput = cmdBg.querySelector('input');
        const quickList = cmdBg.querySelector('ul');
        const quickStatus = cmdBg.querySelector('.bm-reader-quick-status');
        let quickResults = [];
        let quickIndex = 0;
        let previousFocus = null;

        function selectQuickResult(index, reveal = false) {
          quickIndex = index;
          const rows = [...quickList.children];
          rows.forEach((row, i) => row.setAttribute('aria-selected', String(i === index)));
          const selected = rows[index];
          if (selected) {
            cmdInput.setAttribute('aria-activedescendant', selected.id);
            if (reveal) selected.scrollIntoView({ block: 'nearest' });
          } else {
            cmdInput.removeAttribute('aria-activedescendant');
          }
        }

        function renderQuickResults() {
          const terms = cmdInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
          const notes = bmData.favorites.filter(note => note.content);
          if (terms.length) {
            quickResults = notes.filter(note => {
              const title = (note.title || '').toLocaleLowerCase();
              return terms.every(term => title.includes(term));
            });
            quickStatus.textContent = quickResults.length ? quickResults.length + ' 篇筆記' : '找不到符合的筆記';
          } else {
            const noteById = new Map(notes.map(note => [note.id, note]));
            quickResults = [...recentReaderNotes].reverse().map(id => noteById.get(id)).filter(Boolean);
            quickStatus.textContent = quickResults.length ? '最近閱讀' : '輸入標題搜尋筆記';
          }

          quickList.replaceChildren();
          quickResults.forEach((note, index) => {
            const row = document.createElement('li');
            row.id = 'bmReaderQuickOption-' + index;
            row.dataset.index = index;
            row.setAttribute('role', 'option');
            const title = document.createElement('span');
            title.textContent = note.title || '（無標題）';
            const themes = document.createElement('small');
            themes.textContent = (note.themeIds || []).map(getThemeName).filter(Boolean).join('、');
            row.append(title, themes);
            quickList.append(row);
          });
          quickList.scrollTop = 0;
          selectQuickResult(quickResults.length ? 0 : -1);
        }

        function openCmd() {
          previousFocus = document.activeElement;
          cmdBg.style.display = 'flex';
          cmdInput.setAttribute('aria-expanded', 'true');
          cmdInput.value = '';
          renderQuickResults();
          cmdInput.focus();
        }

        function closeCmd() {
          cmdBg.style.display = 'none';
          cmdInput.setAttribute('aria-expanded', 'false');
          if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
          previousFocus = null;
        }

        function openQuickResult(index, split) {
          const note = quickResults[index];
          if (!note) return;
          closeCmd();
          if (!readerNotes.some(item => item.id === note.id)) readerNotes = [...readerNotes, note];

          const rightActive = activePaneId === 'right' && readerRightFavId;
          if (split) {
            if (rightActive) {
              activePaneId = 'left';
              loadNote(note);
            } else if (readerRightFavId) {
              activePaneId = 'right';
              loadRightNote(note);
            } else {
              openRightPane(note);
            }
          } else if (rightActive) {
            loadRightNote(note);
          } else {
            loadNote(note);
          }
        }

        cmdInput.addEventListener('input', renderQuickResults);
        cmdInput.addEventListener('keydown', event => {
          if (event.isComposing || !['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape') closeCmd();
          else if (event.key === 'Enter') openQuickResult(quickIndex, event.shiftKey);
          else if (quickResults.length) {
            const step = event.key === 'ArrowUp' ? -1 : 1;
            selectQuickResult((quickIndex + step + quickResults.length) % quickResults.length, true);
          }
        });
        quickList.addEventListener('click', event => {
          const option = event.target.closest('[data-index]');
          if (option) openQuickResult(Number(option.dataset.index), event.shiftKey);
        });
        cmdBg.addEventListener('click', event => { if (event.target === cmdBg) closeCmd(); });

        // ── Edit mode ────────────────────────────────────────────────────
        function enterEditMode(pane) {
          if (isEditing) return;
          isEditing = true;
          editingPane = pane || (readerRightFavId ? activePaneId : 'left');
          var isSplit = !!readerRightFavId;
          var isRight = editingPane === 'right';

          var editContent = isRight ? readerRightContent : currentReaderContent;
          var editFavId  = isRight ? readerRightFavId   : currentReaderFavId;
          var editInnerEl = isRight ? document.getElementById('bmReaderRightInner') : innerEl;
          var editLang = isRight ? 'auto' : currentReaderCodeLang;
          if (editLang === 'auto') {
            var ef = bmData.favorites.find(function(f){ return f.id === editFavId; });
            if (ef) editLang = detectLangFromTitle(ef.title) || detectLangFromContent(editContent);
          }
          var editTitleEl = isRight
            ? reader.querySelector('#bmReaderRightPaneHd .bm-reader-pane-hd-title')
            : getLeftTitleEl();

          // Place save/cancel in the pane header actions slot
          const saveCancelHtml = `
			  <button class="bm-reader-pane-hd-btn" id="bmReaderSave" style="background:var(--accent);color:#fff;border-color:var(--accent)">儲存</button>
			  <button class="bm-reader-pane-hd-btn" id="bmReaderCancel">取消</button>
			`;

          var hdEl = document.getElementById(isRight ? 'bmReaderRightPaneHd' : 'bmReaderLeftPaneHd');
          var actionsEl = hdEl ? hdEl.querySelector('.bm-reader-pane-hd-actions') : null;
          if (actionsEl) actionsEl.innerHTML = saveCancelHtml;

          editInnerEl.classList.add('bm-editing');
          editInnerEl.innerHTML = '';
          var editorWrap = document.createElement('div');
          editorWrap.className = 'bm-reader-editor';
          editInnerEl.appendChild(editorWrap);

          loadCodeMirror(editLang).catch(function() { return window.CodeMirror; }).then(function(CodeMirror) {
            if (!CodeMirror) {
              editorWrap.innerHTML = '<textarea style="width:100%;height:100%;background:#282c34;color:#abb2bf;border:none;padding:16px;font-family:monospace;font-size:14px;resize:none">' + AppUtils.escHtml(editContent) + '</textarea>';
              return;
            }
            cmEditor = CodeMirror(editorWrap, {
              value: editContent,
              mode: getCmMode(editLang),
              theme: isDarkMode() ? 'material-darker' : 'eclipse',
              lineNumbers: true, tabSize: 2, indentWithTabs: false, lineWrapping: true, scrollbarStyle: 'native'
            });
            cmEditor.focus();
            cmEditor.on('change', function() { readerEdited = true; if (editTitleEl) markEdited(editTitleEl); });
          });

          document.getElementById('bmReaderSave').addEventListener('click', function() {
            var val = cmEditor ? cmEditor.getValue() : editContent;
            var fav = bmData.favorites.find(function(f) { return f.id === editFavId; });
            if (fav) {
              fav.content = val;
              if (isRight) readerRightContent = val; else currentReaderContent = val;
              // If the other pane shows the same note, sync its content too
              if (isRight && currentReaderFavId === editFavId) {
                currentReaderContent = val;
              } else if (!isRight && readerRightFavId === editFavId) {
                readerRightContent = val;
              }
              saveBmData();
              readerEdited = false;
              if (editTitleEl) clearEdited(editTitleEl);
              showToast('已儲存');
            }
            exitEditMode();
          });

          document.getElementById('bmReaderCancel').addEventListener('click', function() {
            confirmLeave(readerEdited, function() {
              readerEdited = false;
              if (editTitleEl) clearEdited(editTitleEl);
              exitEditMode();
            });
          });
        }

        function exitEditMode() {
          var wasRight = editingPane === 'right';
          isEditing = false;
          editingPane = null;
          cmEditor = null;
          var isSplit = !!readerRightFavId;
          var editInnerEl = wasRight ? document.getElementById('bmReaderRightInner') : innerEl;
          var editContent = wasRight ? readerRightContent : currentReaderContent;
          var editFavId   = wasRight ? readerRightFavId   : currentReaderFavId;
          var eLang = wasRight ? 'auto' : currentReaderCodeLang;
          if (eLang === 'auto') {
            var ef = bmData.favorites.find(function(f){ return f.id === editFavId; });
            if (ef) eLang = detectLangFromTitle(ef.title) || detectLangFromContent(editContent);
          }
          if (editInnerEl) {
            editInnerEl.classList.remove('bm-editing');
            renderAndHighlight(editInnerEl, editContent, eLang);
          }
          if (!wasRight) {
            if (readerScroll) readerScroll.updateScrollbar();
            // If right pane shows the same note, re-render it too
            if (readerRightFavId === editFavId) {
              var ri = document.getElementById('bmReaderRightInner');
              if (ri) { ri.innerHTML = ''; renderAndHighlight(ri, readerRightContent, eLang); }
              if (readerRightScroll) readerRightScroll.updateScrollbar();
            }
          } else {
            if (readerRightScroll) readerRightScroll.updateScrollbar();
            // If left pane shows the same note, re-render it too
            if (currentReaderFavId === editFavId) {
              innerEl.innerHTML = '';
              renderAndHighlight(innerEl, currentReaderContent, eLang);
              if (readerScroll) readerScroll.updateScrollbar();
            }
          }
          // Restore action buttons via pane header rebuild
          refreshPaneHeaders();
          bindPaneNavBtns();
        }

        // ── Close reader ─────────────────────────────────────────────────
        function doClose() {
          confirmLeave(readerEdited, function() {
            readerEdited = false;
            document.removeEventListener('keydown', keyHandler);
            window.removeEventListener('resize', onWindowResize);
            reader.remove();
            cmdBg.remove();
            readerScroll = null;
            if (readerRightScroll) { readerRightScroll.destroy(); readerRightScroll = null; }
          });
        }

        function doSwapPanes() {
          if (!readerRightFavId) return;
          var tmpId = currentReaderFavId, tmpContent = currentReaderContent,
              tmpTitle = currentReaderTitle, tmpNotionId = currentReaderNotionId,
              tmpLang = currentReaderCodeLang, tmpEffLang = readerLeftEffectiveLang;
          currentReaderFavId = readerRightFavId;
          currentReaderContent = readerRightContent;
          var rightFav = readerNotes.find(function(f){ return f.id === readerRightFavId; }) ||
                         bmData.favorites.find(function(f){ return f.id === readerRightFavId; });
          currentReaderTitle = rightFav ? (rightFav.title || '') : '';
          currentReaderNotionId = rightFav ? (rightFav.notionId || null) : null;
          currentReaderCodeLang = rightFav ? (rightFav.codeLang || 'auto') : 'auto';
          readerLeftEffectiveLang = readerRightEffectiveLang;
          readerRightFavId = tmpId;
          readerRightContent = tmpContent;
          readerRightEffectiveLang = tmpEffLang;
          findL.close(); findR.close();
          innerEl.innerHTML = '';
          renderAndHighlight(innerEl, currentReaderContent, readerLeftEffectiveLang);
          var rightInner = document.getElementById('bmReaderRightInner');
          if (rightInner) { rightInner.innerHTML = ''; renderAndHighlight(rightInner, readerRightContent, readerRightEffectiveLang); }
          refreshHeader();
          refreshListHighlight();
        }

        // ── Find in note (one instance per pane) ────────────────────────
        function makeFindInstance(pane) {
          var innerIdStr  = pane === 'right' ? 'bmReaderRightInner'   : 'bmReaderInner';
          var contentIdStr = pane === 'right' ? 'bmReaderRightContent' : 'bmReaderContent';
          var matches = [], idx = -1;

          var bar = document.createElement('div');
          bar.className = 'bm-find-bar';
          bar.innerHTML = `
			  <input class="bm-find-input" placeholder="搜尋..." autocomplete="off" spellcheck="false">
			  <span class="bm-find-counter"></span>
			  <button class="bm-find-nav" title="上一個 (Shift+Enter)">↑</button>
			  <button class="bm-find-nav" title="下一個 (Enter)">↓</button>
			  <button class="bm-find-close" title="關閉 (Esc)">✕</button>
			`;

          bar.style.display = 'none';
          reader.appendChild(bar);

          var inp     = bar.querySelector('.bm-find-input');
          var counter = bar.querySelector('.bm-find-counter');
          var navBtns = bar.querySelectorAll('.bm-find-nav');
          var closeBtn = bar.querySelector('.bm-find-close');

          function getInnerEl()   { return document.getElementById(innerIdStr); }
          function getContentEl() { return document.getElementById(contentIdStr); }

          function reposition() {
            var cEl = getContentEl();
            if (!cEl) return;
            var r = cEl.getBoundingClientRect();
            bar.style.top  = (r.top + 6) + 'px';
            bar.style.left = (r.right - bar.offsetWidth - 8) + 'px';
          }

          function clearHighlights() {
            var el = getInnerEl();
            if (!el) return;
            el.querySelectorAll('mark.bm-find-match').forEach(function(m) {
              m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
            });
            el.normalize();
          }

          function runFind(term) {
            clearHighlights();
            matches = []; idx = -1;
            if (!term.trim()) { counter.textContent = ''; return; }
            var el = getInnerEl();
            if (!el) return;
            var re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            var nodes = [], node;
            while ((node = walker.nextNode())) {
              var p = node.parentElement, skip = false;
              while (p) { if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') { skip = true; break; } p = p.parentElement; }
              if (!skip) nodes.push(node);
            }
            nodes.forEach(function(tn) {
              var text = tn.nodeValue;
              re.lastIndex = 0;
              if (!re.test(text)) return;
              re.lastIndex = 0;
              var frag = document.createDocumentFragment(), last = 0, m2;
              while ((m2 = re.exec(text)) !== null) {
                if (m2.index > last) frag.appendChild(document.createTextNode(text.slice(last, m2.index)));
                var mark = document.createElement('mark');
                mark.className = 'bm-find-match';
                mark.textContent = m2[0];
                frag.appendChild(mark);
                matches.push(mark);
                last = m2.index + m2[0].length;
              }
              if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
              tn.parentNode.replaceChild(frag, tn);
            });
            if (matches.length) { idx = 0; scrollTo(0); }
            counter.textContent = matches.length ? '1/' + matches.length : '無結果';
          }

          function nav(delta) {
            if (!matches.length) return;
            idx = (idx + delta + matches.length) % matches.length;
            scrollTo(idx);
            counter.textContent = (idx + 1) + '/' + matches.length;
          }

          function scrollTo(i) {
            matches.forEach(function(m, j) { m.classList.toggle('bm-find-current', j === i); });
            if (matches[i]) matches[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
          }

          function open() {
            bar.style.display = 'flex';
            reposition();
            inp.select(); inp.focus();
          }

          function close() {
            bar.style.display = 'none';
            clearHighlights();
            matches = []; idx = -1;
            counter.textContent = '';
          }

          inp.addEventListener('input', function() { runFind(this.value); });
          inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? nav(-1) : nav(1); }
            if (e.key === 'Escape') { e.preventDefault(); close(); }
          });
          navBtns[0].addEventListener('click', function() { nav(-1); });
          navBtns[1].addEventListener('click', function() { nav(1); });
          closeBtn.addEventListener('click', close);

          return { open: open, close: close, clearHighlights: clearHighlights, reposition: reposition, isOpen: function() { return bar.style.display !== 'none'; } };
        }

        var findL = makeFindInstance('left');
        var findR = makeFindInstance('right');

        function openFindBar() {
          var isRight = readerRightFavId && activePaneId === 'right';
          if (isRight) findR.open(); else findL.open();
        }
        function closeFindBar() { findL.close(); findR.close(); }

        // ── Bind header buttons ──────────────────────────────────────────
        function bindHeaderBtns() {
          var backBtn = document.getElementById('bmReaderBack');
          if (backBtn) backBtn.addEventListener('click', doClose);
          var listBtn = document.getElementById('bmReaderListBtn');
          if (listBtn) listBtn.addEventListener('click', toggleList);
          // List sidebar close btn
          var listCloseBtn = document.getElementById('bmReaderListClose');
          if (listCloseBtn) listCloseBtn.addEventListener('click', function() { if (readerListOpen) toggleList(); });
          // Edge tab to open list
          var tabEl = document.getElementById('bmReaderListTab');
          if (tabEl) {
            tabEl.classList.toggle('bm-tab-visible', !readerListOpen);
            tabEl.addEventListener('click', toggleList);
          }
		  // 主選單
		  
          var mainMenuBtn = document.getElementById('bmReaderMainMenu');
          if (mainMenuBtn) mainMenuBtn.addEventListener('click', function() {
            toggleMainMenu(null, function(name) {
                var readerBg = document.querySelector('.bm-reader-bg');
                if (readerBg && name !== 'bookmark') {
                    readerBg.style.display = 'none';
                }
            });
          });
          }
        bindHeaderBtns();
        bindPaneNavBtns();

        // ── Resizer drag ─────────────────────────────────────────────────
        (function() {
          var resizerEl = document.getElementById('bmReaderResizer');
          if (!resizerEl) return;
          var dragging = false, startX = 0, startLeftW = 0, startRightW = 0;
          resizerEl.addEventListener('mousedown', function(e) {
            dragging = true;
            startX = e.clientX;
            var leftPane = document.getElementById('bmReaderLeftPane');
            var rightPane = document.getElementById('bmReaderRight');
            startLeftW = leftPane ? leftPane.offsetWidth : 0;
            startRightW = rightPane ? rightPane.offsetWidth : 0;
            resizerEl.classList.add('dragging');
            document.body.style.userSelect = 'none';
            e.preventDefault();
          });
          document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            var dx = e.clientX - startX;
            var leftPane = document.getElementById('bmReaderLeftPane');
            var rightPane = document.getElementById('bmReaderRight');
            var total = startLeftW + startRightW;
            var newLeft = Math.max(200, Math.min(total - 200, startLeftW + dx));
            var newRight = total - newLeft;
            if (leftPane) { leftPane.style.flex = 'none'; leftPane.style.width = newLeft + 'px'; }
            if (rightPane) { rightPane.style.flex = 'none'; rightPane.style.width = newRight + 'px'; }
            positionSwapBtn();
          });
          document.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false;
            resizerEl.classList.remove('dragging');
            document.body.style.userSelect = '';
            // Store ratio for proportional resize
            var lp = document.getElementById('bmReaderLeftPane');
            var rp = document.getElementById('bmReaderRight');
            if (lp && rp && lp.style.width) {
              var total = lp.offsetWidth + rp.offsetWidth;
              if (total > 0) splitRatio = lp.offsetWidth / total;
            }
            positionSwapBtn();
          });
        })();

        // ── Search in list ───────────────────────────────────────────────
        document.getElementById('bmReaderSearch').addEventListener('input', function() {
          buildListItems(this.value);
        });

        // ── Keyboard shortcuts ───────────────────────────────────────────
        function keyHandler(e) {
          if (cmdBg.style.display !== 'none') return;
          // Ctrl+F: open find bar
          if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openFindBar(); return; }
          var tag = document.activeElement && document.activeElement.tagName;
          var inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);
          if (isEditing) {
            if (e.key === 'Escape') {
              e.preventDefault();
              var cancelBtn = document.getElementById('bmReaderCancel');
              if (cancelBtn) cancelBtn.click();
            }
            return;
          }

          // Shift+; → command palette
          if (!inInput && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey &&
              (e.key === ':' || (e.shiftKey && e.code === 'Semicolon'))) {
            e.preventDefault();
            openCmd();
            return;
          }

          if (inInput) return;

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navNote(1); return; }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navNote(-1); return; }
          if (e.key === 'Escape') {
            if (readerRightFavId) {
              // split: close active pane
              if (activePaneId === 'right') {
                closeRightPane();
              } else {
                var rightFav = readerNotes.find(function(f){ return f.id === readerRightFavId; }) ||
                               bmData.favorites.find(function(f){ return f.id === readerRightFavId; });
                if (rightFav) loadNote(rightFav);
                closeRightPane();
              }
            } else {
              doClose();
            }
            return;
          }
        }
        document.addEventListener('keydown', keyHandler);

        // ── Window resize: re-proportion split panes ─────────────────────
        var splitRatio = 0.5; // track left-pane fraction after manual drag
        function onWindowResize() {
          positionSwapBtn();
          if (findL.isOpen()) findL.reposition();
          if (findR.isOpen()) findR.reposition();
          if (!readerRightFavId) return;
          var leftPane = document.getElementById('bmReaderLeftPane');
          var rightPane = document.getElementById('bmReaderRight');
          var resizerEl = document.getElementById('bmReaderResizer');
          if (!leftPane || !rightPane) return;
          if (!leftPane.style.width) return; // still flex, no resize needed
          var resizerW = resizerEl ? resizerEl.offsetWidth : 5;
          var container = leftPane.parentElement;
          var newTotal = container.offsetWidth - resizerW;
          var newLeft = Math.round(splitRatio * newTotal);
          var newRight = newTotal - newLeft;
          leftPane.style.width = newLeft + 'px';
          rightPane.style.width = newRight + 'px';
        }
        window.addEventListener('resize', onWindowResize);

        // ── Inline note links (existing logic) ──────────────────────────
        innerEl.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href') || '';
          var match = null;
          if (href.indexOf('#bm:') === 0) {
            var bmId = href.substring(4);
            match = bmData.favorites.find(function(f) { return f.id === bmId && f.content; });
          }
          if (!match) {
            match = bmData.favorites.find(function(f) {
              return f.content && f.url && href.indexOf(f.url) !== -1;
            });
          }
          if (!match && href.indexOf('notion.so') !== -1) {
            match = bmData.favorites.find(function(f) {
              if (!f.content || !f.url) return false;
              var hrefId = href.replace(/.*[-/]([a-f0-9]{32}).*/, '$1');
              var favId2 = f.url.replace(/.*[-/]([a-f0-9]{32}).*/, '$1');
              return hrefId.length === 32 && hrefId === favId2;
            });
          }
          if (match) {
            e.preventDefault();
            loadNote(match);
          }
        });

      });
      });
    }

    // ── Delete confirmation modal ────────────────────────────────────
    var confirmWrapper = document.createElement('div');
    confirmWrapper.innerHTML = '<div id="bmConfirmBg"><div class="bm-confirm"><div class="bm-confirm-msg">確定要刪除這個書籤？</div><div class="bm-confirm-card" id="bmConfirmCard"></div><div class="bm-confirm-actions"><button class="bm-confirm-cancel" id="bmConfirmCancel">取消</button><button class="bm-confirm-delete" id="bmConfirmDelete">刪除</button></div></div></div>';
    document.body.appendChild(confirmWrapper.firstElementChild);

    var bmConfirmBg = document.getElementById('bmConfirmBg');
    var pendingDeleteId = null;

    function showDeleteConfirm(favId) {
      pendingDeleteId = favId;
      var fav = bmData.favorites.find(function (f) { return f.id === favId; });
      var cardEl = document.getElementById('bmConfirmCard');
      if (!fav) { cardEl.innerHTML = ''; bmConfirmBg.classList.add('open'); return; }
      cardEl.innerHTML = `
		  <div class="bm-confirm-card-name">${AppUtils.escHtml(fav.title)}</div>
		  <div class="bm-confirm-card-url">${AppUtils.escHtml(fav.url)}</div>
		  <div class="bm-confirm-card-theme">主題: ${AppUtils.escHtml((fav.themeIds || []).map(getThemeName).join(', ') || '無')}</div>
		`;

      bmConfirmBg.classList.add('open');
    }

    var closeBmConfirm = function() { bmConfirmBg.classList.remove('open'); pendingDeleteId = null; };
    bindPopup(bmConfirmBg, closeBmConfirm);
    document.getElementById('bmConfirmCancel').addEventListener('click', closeBmConfirm);
    document.getElementById('bmConfirmDelete').addEventListener('click', function () {
      bmConfirmBg.classList.remove('open');
      if (!pendingDeleteId) return;
      window.plugins['bookmark-data'].remove(pendingDeleteId);
      pendingDeleteId = null;
      showToast('書籤已刪除');
    });

    // ── Theme delete confirmation ────────────────────────────────────
    var themeConfirmWrapper = document.createElement('div');
    themeConfirmWrapper.innerHTML = '<div id="bmThemeConfirmBg"><div class="bm-confirm"><div class="bm-confirm-msg" id="bmThemeConfirmMsg">確定要刪除這個主題？</div><div class="bm-confirm-actions"><button class="bm-confirm-cancel" id="bmThemeConfirmCancel">取消</button><button class="bm-confirm-delete" id="bmThemeConfirmDelete">刪除</button></div></div></div>';
    document.body.appendChild(themeConfirmWrapper.firstElementChild);

    var bmThemeConfirmBg = document.getElementById('bmThemeConfirmBg');
    var pendingDeleteThemeId = null;

    function showThemeDeleteConfirm(themeId) {
      pendingDeleteThemeId = themeId;
      var theme = bmData.themes.find(function (t) { return t.id === themeId; });
      var count = bmData.favorites.filter(function (f) { return f.themeIds && f.themeIds.indexOf(themeId) !== -1; }).length;
      var msg = document.getElementById('bmThemeConfirmMsg');
      msg.textContent = '確定要刪除主題「' + (theme ? theme.name : '') + '」？';
      if (count > 0) {
        msg.textContent += ' 該主題下有 ' + count + ' 個書籤將移除此主題標記。';
      }
      bmThemeConfirmBg.classList.add('open');
    }

    var closeBmThemeConfirm = function() { bmThemeConfirmBg.classList.remove('open'); pendingDeleteThemeId = null; };
    bindPopup(bmThemeConfirmBg, closeBmThemeConfirm);
    document.getElementById('bmThemeConfirmCancel').addEventListener('click', closeBmThemeConfirm);
    document.getElementById('bmThemeConfirmDelete').addEventListener('click', function () {
      bmThemeConfirmBg.classList.remove('open');
      if (!pendingDeleteThemeId) return;
      bmData.themes = bmData.themes.filter(function (t) { return t.id !== pendingDeleteThemeId; });
      bmData.favorites.forEach(function (f) {
        if (f.themeIds) {
          var idx = f.themeIds.indexOf(pendingDeleteThemeId);
          if (idx !== -1) f.themeIds.splice(idx, 1);
        }
      });
      pendingDeleteThemeId = null;
      if (currentThemeId !== 'all' && !bmData.themes.find(function (t) { return t.id === currentThemeId; })) {
        currentThemeId = 'all';
        self.saveData(currentThemeId, 'bookmarkTheme');
      }
      saveBmData();
      renderBookmarks();
      showToast('主題已刪除');
    });

    // ── Link open confirmation ────────────────────────────────────
    var linkConfirmEl = document.createElement('div');
    linkConfirmEl.innerHTML = '<div id="bmLinkConfirmBg"><div class="bm-link-confirm"><div class="bm-confirm-msg">即將另開以下網址</div><div class="bm-link-confirm-url" id="bmLinkConfirmUrl"></div><div class="bm-confirm-actions"><button class="bm-confirm-cancel" id="bmLinkConfirmCancel">取消</button><button id="bmLinkConfirmOpen" style="flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;background:var(--accent);color:#fff">開啟</button></div></div></div>';
    document.body.appendChild(linkConfirmEl.firstElementChild);
    var bmLinkConfirmBg = document.getElementById('bmLinkConfirmBg');
    var pendingLinkUrl = null;

    window.bmShowLinkConfirm = function(url) {
      pendingLinkUrl = url;
      document.getElementById('bmLinkConfirmUrl').textContent = url;
      bmLinkConfirmBg.classList.add('open');
    };
    var closeBmLinkConfirm = function() { bmLinkConfirmBg.classList.remove('open'); pendingLinkUrl = null; };
    bindPopup(bmLinkConfirmBg, closeBmLinkConfirm);
    document.getElementById('bmLinkConfirmCancel').addEventListener('click', closeBmLinkConfirm);
    document.getElementById('bmLinkConfirmOpen').addEventListener('click', function() {
      bmLinkConfirmBg.classList.remove('open');
      if (pendingLinkUrl) window.open(pendingLinkUrl, '_blank', 'noopener,noreferrer');
      pendingLinkUrl = null;
    });

    // ── Theme rename modal ───────────────────────────────────────────
    var renameWrapper = document.createElement('div');
    renameWrapper.innerHTML = '<div id="bmThemeRenameBg"><div class="bm-theme-modal"><div class="modal-header"><h2>重新命名主題</h2><button class="close-btn" id="bmRenameCloseBtn">✕</button></div><div class="bm-field"><label>主題名稱</label><input id="bmRenameInput" type="text" placeholder="輸入新名稱"></div><div class="bm-field"><label>Icon (emoji)</label><input id="bmRenameIconInput" type="text" placeholder="例如: 📁" maxlength="4"></div><button class="bm-btn-save" id="bmRenameSaveBtn">儲存</button></div></div>';
    document.body.appendChild(renameWrapper.firstElementChild);

    var bmThemeRenameBg = document.getElementById('bmThemeRenameBg');
    var renamingThemeId = null;

    function openRenameTheme(themeId) {
      renamingThemeId = themeId;
      var theme = bmData.themes.find(function (t) { return t.id === themeId; });
      document.getElementById('bmRenameInput').value = theme ? theme.name : '';
      document.getElementById('bmRenameIconInput').value = theme ? (theme.icon || '') : '';
      bmThemeRenameBg.classList.add('open');
    }

    bindPopup(bmThemeRenameBg, function() { bmThemeRenameBg.classList.remove('open'); });
    document.getElementById('bmRenameSaveBtn').addEventListener('click', function () {
      if (!renamingThemeId) return;
      var newName = document.getElementById('bmRenameInput').value.trim();
      var newIcon = document.getElementById('bmRenameIconInput').value.trim();
      if (!newName) { showToast('請輸入主題名稱'); return; }
      var theme = bmData.themes.find(function (t) { return t.id === renamingThemeId; });
      if (theme) {
        theme.name = newName;
        theme.icon = newIcon;
      }
      bmThemeRenameBg.classList.remove('open');
      renamingThemeId = null;
      saveBmData();
      renderBookmarks();
      showToast('主題已更新');
    });

    var renderMarkdown;
    function prepareMarkdown(cb) {
      loadMarkdown().then(function(render) {
        renderMarkdown = render;
      }).then(cb, cb);
    }

    function isDarkMode() {
      var t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function loadHljs(cb) {
      loadHighlightWithLineNumbers().then(cb, cb);
    }

    function getMermaidConfig() {
      var s = getComputedStyle(document.documentElement);
      var get = function(v) { return s.getPropertyValue(v).trim(); };
      var dark = isDarkMode();
      return {
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          background:          get('--bg'),
          mainBkg:             get('--surface2'),
          nodeBorder:          get('--border'),
          clusterBkg:          get('--surface'),
          clusterBorder:       get('--border'),
          primaryColor:        get('--surface2'),
          primaryTextColor:    get('--text-dim'),
          primaryBorderColor:  get('--border'),
          secondaryColor:      get('--surface3'),
          secondaryTextColor:  get('--text-dim'),
          tertiaryColor:       get('--surface'),
          tertiaryTextColor:   get('--text-dim'),
          lineColor:           get('--accent'),
          edgeLabelBackground: get('--surface2'),
          titleColor:          get('--text'),
          textColor:           get('--text-dim'),
          labelColor:          get('--text-dim'),
          fontFamily:          'Consolas,"Microsoft JhengHei",monospace',
          fontSize:            '14px',
          actorBkg:            get('--surface2'),
          actorBorder:         get('--accent'),
          actorTextColor:      get('--text-dim'),
          actorLineColor:      get('--border'),
          signalColor:         get('--accent'),
          signalTextColor:     get('--text-dim'),
          activationBkgColor:  get('--surface3'),
          activationBorderColor: get('--accent'),
          labelBoxBkgColor:    get('--surface2'),
          labelBoxBorderColor: get('--border'),
          labelTextColor:      get('--text-dim'),
          loopTextColor:       get('--text-dim'),
          noteBkgColor:        dark ? '#3a3010' : '#fffbe6',
          noteTextColor:       dark ? '#fff143' : '#5a4a00',
          noteBorderColor:     get('--accent3'),
          fillType0: get('--surface2'), fillType1: get('--surface3'),
          fillType2: get('--surface'),  fillType3: get('--surface2'),
          fillType4: get('--surface3'), fillType5: get('--surface'),
          fillType6: get('--surface2'), fillType7: get('--surface3'),
          pie1: get('--accent'),  pie2: get('--accent2'), pie3: get('--accent3'),
          pie4: get('--success'), pie5: get('--danger'),
          pie6: get('--accent'),  pie7: get('--accent2'),
          pie8: get('--accent3')
        }
      };
    }
    function collectMermaidJobs(container) {
      var mermaidJobs = [];
      container.querySelectorAll('pre code.language-mermaid').forEach(function(code) {
        var pre = code.parentElement;
        var source = code.textContent;
        var wrapper = document.createElement('div');
        wrapper.className = 'bm-mermaid-block';
        pre.parentNode.replaceChild(wrapper, pre);
        mermaidJobs.push({ wrapper: wrapper, source: source });
      });
      return mermaidJobs;
    }

    var _mermaidId = 0;
    async function renderMermaidJobs(jobs) {
      const mermaid = await library('mermaid').catch(() => null);
      if (mermaid) mermaid.initialize({ ...getMermaidConfig(), securityLevel: 'strict' });
      await Promise.all(jobs.map(async ({ wrapper, source }) => {
        if (mermaid) {
          try {
            const result = await mermaid.render('bm-mermaid-' + (++_mermaidId), source);
            wrapper.innerHTML = result.svg;
            return;
          } catch (_) {}
        }
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = source;
        pre.append(code);
        wrapper.replaceChildren(pre);
      }));
    }

    async function buildBookmarkHtml(fav) {
      const title = AppUtils.escHtml(fav.title || '未命名書籤');
      const container = document.createElement('div');
      if (fav.content || !fav.url) {
        const content = fav.content || '';
        const lang = !fav.codeLang || fav.codeLang === 'auto'
          ? detectLangFromTitle(fav.title) || detectLangFromContent(content)
          : fav.codeLang;
        if (lang === 'markdown' || lang === 'auto') {
          const render = await loadMarkdown();
          const notionId = fav.notionId || extractNotionId(String(fav.url || ''));
          container.append(render(replaceNotionLinks(content, notionId, false), {
            headingId: slugify, allowMedia: true
          }));
          const jobs = collectMermaidJobs(container);
          if (jobs.length) await renderMermaidJobs(jobs);
        } else {
          const code = document.createElement('code');
          code.textContent = content;
          code.className = 'language-' + lang;
          const pre = document.createElement('pre');
          pre.append(code);
          container.append(pre);
        }
      } else {
        const url = String(fav.url).trim();
        const line = document.createElement('p');
        if (/^https?:\/\//i.test(url)) {
          const link = document.createElement('a');
          link.href = url;
          link.textContent = url;
          line.append(link);
        } else {
          line.textContent = url;
        }
        container.append(line);
      }

      return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:; media-src data: https: http:; base-uri 'none'; form-action 'none'">
<title>${title}</title>
<style>
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
body { max-width: 54rem; margin: 0 auto; padding: clamp(1rem, 5vw, 3rem); line-height: 1.65; overflow-wrap: anywhere; }
pre { overflow: auto; padding: 1rem; background: color-mix(in srgb, CanvasText 7%, Canvas); border-radius: .5rem; }
img, video, svg { max-width: 100%; height: auto; }
table { border-collapse: collapse; display: block; overflow: auto; }
td, th { border: 1px solid GrayText; padding: .4rem .65rem; }
blockquote { margin-inline-start: 0; padding-inline-start: 1rem; border-inline-start: .25rem solid GrayText; }
</style></head><body><main><h1>${title}</h1>${container.innerHTML}</main></body></html>`;
    }

    self.exportHtml = async function(favorites, signal) {
      if (!favorites.length) return;
      const entries = Object.create(null);
      const multiple = favorites.length > 1;
      const encoder = new TextEncoder();
      let fileName;
      for (const [index, fav] of favorites.entries()) {
        if (signal?.aborted) return;
        const stem = String(fav.title || '').replace(/[\x00-\x1f/\\:*?"<>|]/g, '_')
          .trim().slice(0, 90).replace(/^[.]+|[. ]+$/g, '') || '書籤';
        const safeStem = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem) ? '_' + stem : stem;
        fileName = (multiple ? (index + 1) + '_' : '') + safeStem + '.html';
        entries[fileName] = encoder.encode(await buildBookmarkHtml(fav));
      }
      let blob;
      if (multiple) {
        const fflate = await library('fflate');
        blob = new Blob([fflate.zipSync(entries)], { type: 'application/zip' });
        fileName = '書籤_HTML.zip';
      } else {
        blob = new Blob([entries[fileName]], { type: 'text/html;charset=utf-8' });
      }
      if (signal?.aborted) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    };

    function getCmMode(codeLang) {
      var map = {
        javascript: 'javascript',
        typescript: {name:'javascript', typescript:true},
        json: {name:'javascript', json:true},
        css: 'css',
        csharp: 'text/x-csharp',
        bash: 'shell',
        python: 'python',
        markdown: 'markdown',
        html: 'htmlmixed',
        sql: 'sql',
        xml: 'xml',
        yaml: 'yaml',
        ini: 'properties'
      };
      return map[codeLang] || null;
    }

    // ── Add theme modal ──────────────────────────────────────────────
    var themeWrapper = document.createElement('div');
    themeWrapper.innerHTML = `
      <div id="bmThemeModalBg">
        <div class="bm-theme-modal">
          <div class="modal-header">
          <h2>` + resolveIcon('add') + `新增主題</h2><button class="close-btn" id="bmThemeCloseBtn">✕</button>
          </div>
          <div class="bm-field">
            <label>主題名稱</label>
            <input id="bmThemeNameInput" type="text" placeholder="例如: 工作、學習">
          </div>
          <button class="bm-btn-save" id="bmThemeSaveBtn">新增</button>
        </div>
      </div>
    `;
    document.body.appendChild(themeWrapper.firstElementChild);

    var bmThemeModalBg = document.getElementById('bmThemeModalBg');

    function openAddTheme() {
      document.getElementById('bmThemeNameInput').value = '';
      bmThemeModalBg.classList.add('open');
    }

    document.getElementById('bmThemeCloseBtn').addEventListener('click', function () {
      bmThemeModalBg.classList.remove('open');
    });
    bmThemeModalBg.addEventListener('click', function (e) {
      if (e.target === bmThemeModalBg) bmThemeModalBg.classList.remove('open');
    });
    document.getElementById('bmThemeSaveBtn').addEventListener('click', function () {
      var name = document.getElementById('bmThemeNameInput').value.trim();
      if (!name) { showToast('請輸入主題名稱'); return; }
      bmData.themes.push({
        id: 'theme_' + Date.now(),
        name: name,
        icon: '📌'
      });
      saveBmData();
      bmThemeModalBg.classList.remove('open');
      renderBookmarks();
      showToast('主題已新增');
    });

    /* Sort/Export/Import code moved to bookmark-sort.js, bookmark-export.js, bookmark-import.js */
	registerPlugin('bookmark-search-menu', {
		mode: 'bookmark',
		label: '搜尋',
		order: 5,
		icon: 'search',
		hideToolbar: false,
		children: [
			{
				label: '書籤搜尋',
				icon: resolveIcon('seachbookmark'),
				open: function() {
					window.plugins['bookmark-search']?.open?.();
				}
			},
			{
				label: '內文搜尋',
				icon: resolveIcon('searchcontent'),
				open: function() {
					window.plugins['bookmark-searchcontent']?.open?.();
				}
			}
		]
	});
	
    // ── Expose globals for sub-plugins ────────────────────────────
    window.renderBookmarks = renderBookmarks;
    window.bmGetData = function() { return bmData; };
    window.bmSaveData = saveBmData;
    window.bmLoadData = loadBmData;

    window.bmGetVisibleFavorites = getVisibleFavorites;
    window.bmGetCurrentThemeId = function() { return currentThemeId; };
    window.bmSetCurrentThemeId = function(id) { currentThemeId = id; self.saveData(id, 'bookmarkTheme'); };
    window.bmOpenReader = openReader;
    window.bmGetThemeName = getThemeName;
    window.bmReplaceNotionLinks = replaceNotionLinks;
    window.bmExtractNotionId = extractNotionId;
    window.bmRenderContent = function(container, content, onDone, options) {
      prepareMarkdown(function() {
        loadHljs(function() {
          if (options?.isCurrent && !options.isCurrent()) return;
          renderAndHighlight(container, content, options?.codeLang || 'auto', options);
          if (typeof onDone === 'function') onDone();
        });
      });
    };
  }
});
