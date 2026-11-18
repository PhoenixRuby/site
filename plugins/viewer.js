const viewerFolderPath = 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z';
const viewerIgnoredNames = new Set(['.git', 'node_modules', '.DS_Store']);
const viewerIgnoresPath = path => path.split('/').some(name => viewerIgnoredNames.has(name));

function viewerSourceKey(record) {
  if (record.identityVerified) return record.id;
  return record.handles.length
    ? JSON.stringify(record.handles.map(handle => handle.name).sort())
    : JSON.stringify((record.label || '').split('、').sort());
}

async function findViewerSource(records, handles) {
  if (!handles.length) return undefined;
  for (const record of records) {
    if (record.handles.length !== handles.length) continue;
    const remaining = [...record.handles];
    for (const handle of handles) {
      let match = -1;
      for (let index = 0; index < remaining.length; index++) {
        const other = remaining[index];
        if (handle.name === other.name && await Promise.resolve()
          .then(() => handle.isSameEntry(other)).catch(() => false)) {
          match = index;
          break;
        }
      }
      if (match < 0) break;
      remaining.splice(match, 1);
    }
    if (!remaining.length) return record;
  }
}

function normalizeViewerRecents(records) {
  if (!Array.isArray(records)) return [];
  const normalized = records.flatMap((record, index) => {
    if (Array.isArray(record)) {
      const handles = record.filter(handle => handle?.kind === 'directory');
      if (!handles.length) return [];
      return [{ id: 'legacy-' + index, handles }];
    }
    return record && Array.isArray(record.handles) ? [record] : [];
  });
  const seen = new Set();
  return normalized.filter(record => {
    const key = viewerSourceKey(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function viewerDiffIndex(prev, cur, now) {
  const sameSig = (a, b) => a.size === b.size && (a.mtime == null || b.mtime == null || a.mtime === b.mtime);
  const pf = (Array.isArray(prev) ? prev : prev?.files || []).filter(file => !viewerIgnoresPath(file.path));
  const pg = (Array.isArray(prev) ? [] : prev?.gone || []).filter(file => !viewerIgnoresPath(file.path));
  const pm = new Map(pf.map(f => [f.path, f]));
  const gm = new Map(pg.map(g => [g.path, g]));
  const chg = Object.create(null), seen = new Set(), counts = { added: 0, modified: 0, removed: 0 };
  const nn = v => (v == null ? null : v);
  for (const c of cur) {
    seen.add(c.path);
    const o = pm.get(c.path);
    let flag = null;
    if (!o) {
      const g = gm.get(c.path);
      if (g) { if (!sameSig(g, c)) flag = { k: 'mod', at: now, so: g.size, sm: nn(g.mtime) }; }   // 刪掉又出現：和「刪除前看過的版本」比
      else flag = { k: 'new', at: now };
    } else if (o.ch && o.ch.k === 'new') {
      flag = { k: 'new', at: sameSig(o, c) ? o.ch.at : now };   // 還沒看過的新檔案：維持「新」；又被改了就算這次的變動
    } else {
      const sv = o.ch ? { size: o.ch.so, mtime: o.ch.sm } : o;   // 沒有 ch = 上次記下的版本就是看過的版本（舊資料也相容）
      if (!sameSig(sv, c)) flag = { k: 'mod', at: o.ch && sameSig(o, c) ? o.ch.at : now, so: sv.size, sm: nn(sv.mtime) };
    }
    if (flag) { chg[c.path] = flag; if (flag.k === 'new') counts.added++; else counts.modified++; }
  }
  const gone = [];
  for (const o of pf) {
    if (seen.has(o.path)) continue;
    if (o.ch && o.ch.k === 'new') continue;   // 從沒看過的新檔案又被刪了：不用提
    const sv = o.ch ? { size: o.ch.so, mtime: o.ch.sm } : o;
    gone.push({ path: o.path, size: sv.size, mtime: nn(sv.mtime), at: now });
    counts.removed++;
  }
  for (const g of pg) if (!seen.has(g.path)) gone.push(g);
  counts.removed = gone.length;
  return { chg, gone, counts };
}

registerPlugin('viewer', {
  main: true,
  menuOrder: 6,
  label: '檔案瀏覽',
  menuIcon: "folder",
  icon: null,
  mode: 'viewer',
  order: 2,
  favicon(canvas, ctx) {
    ctx.save();
    ctx.scale(canvas.width / 24, canvas.height / 24);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(viewerFolderPath));
    ctx.restore();
  },
  currentAction: 'home',
  open: null,
  render: null,
  storageKeys: ['site-viewer-location'],
  loadData(key) {
    return AppStorage.load(this.storageKeys, key) || [];
  },
  saveData(arr, key) {
    AppStorage.save(this.storageKeys, arr, key);
  },
  getDataCount(key) {
    return this.loadData(key).length;
  },
  async load() {
    //await loadPluginCss('viewer');
    //this.init();
	
	const subCssList = ['viewer', 'viewer-help', 'viewer-setting', 'about'];
	const subPlugins = ['viewer-help', 'viewer-setting', 'viewer-search'];
	
	await Promise.all([
        ...subCssList.map(name => loadPluginCss(name)),
        ...subPlugins.map(name => loadPluginScript(name)),
        loadPluginScript('viewer-archive'),
        loadPluginScript('viewer-text'),
        loadPluginScript('viewer-media')
    ]);
	
	// 主插件先建立 DOM
    const content = await this.init();
	
	// 子插件再加入內容
    for (const name of subPlugins) {
        const sub = window.plugins[name];

        if (sub && typeof sub.load === 'function') {
            await sub.load(content);
        }
    }
  },
  async init() {
    const content = document.createElement('section');
    content.id = 'siteViewer';
    content.dataset.pluginContent = 'viewer';
    content.innerHTML = `
      <div class="empty viewer-start">
        <div>
          <div class="viewer-start-intro">
            <div class="viewer-start-icon" aria-hidden="true">${resolveIcon("folder", '#38bdf8', 64)}</div>
            <h1>拖曳資料夾或壓縮檔到這裡</h1>
            <p>支援資料夾，以及 .zip / .tar / .tar.gz / .tgz / .gz（不用先解壓）。<br>載入後在右側目錄單擊即可預覽，雙擊會開成分頁。</p>
            <div class="viewer-start-actions">
              <button class="btn primary" type="button">選擇資料夾</button>
              <button class="btn" type="button">選擇壓縮檔（.tgz / .zip）</button>
            </div>
            <div class="about-link">
              <button class="btn" type="button" data-viewer-about>ⓘ 關於這個檢視器（功能、快捷鍵）</button>
            </div>
          </div>
          <p class="viewer-start-status" role="status" hidden></p>
          <div class="recent viewer-recents" hidden>
            <div class="viewer-recent-list"></div>
          </div>
          <input type="file" webkitdirectory multiple hidden>
          <input type="file" accept=".tgz,.tar.gz,.tar,.zip,.gz" hidden>
        </div>
      </div>
      <div class="viewer-workspace" hidden>
        <div class="viewer-preview">
          <div class="viewer-tab-bar">
            <button class="viewer-tab-scroll viewer-tab-scroll-prev" type="button" aria-label="向左捲動分頁" title="向左捲動分頁" hidden>‹</button>
            <div class="viewer-tabs" aria-label="開啟的檔案"></div>
            <button class="viewer-tab-scroll viewer-tab-scroll-next" type="button" aria-label="向右捲動分頁" title="向右捲動分頁" hidden>›</button>
            <div class="tabs-allwrap" hidden>
              <button class="tabs-all" type="button" aria-expanded="false" aria-label="所有分頁"></button>
            </div>
            <section class="tabmenu" aria-label="所有分頁" hidden>
              <input type="search" aria-label="篩選分頁" placeholder="篩選分頁…">
              <div class="tm-bar"><span></span><button class="btn" type="button">排序：開啟順序</button></div>
              <div class="tm-list"></div>
            </section>
          </div>
          <div class="viewer-source-summary" role="status" hidden></div>
          <div class="viewer-file-info" hidden>
            <span class="viewer-file-path"></span><button class="btn viewer-pdf-open" type="button" hidden>在新分頁開啟</button><span class="viewer-file-meta"></span>
            <select class="viewer-encoding" aria-label="文字編碼" hidden></select>
            <button class="btn viewer-find-source" type="button" aria-keyshortcuts="Control+Shift+F Meta+Shift+F" title="在此檔案搜尋（Ctrl+Shift+F）" hidden>在此檔案搜尋</button>
            <button class="btn viewer-copy-source" type="button" hidden>複製內容</button>
            <button class="btn viewer-wrap-source" type="button" aria-pressed="false" hidden>換行</button>
            <button class="btn viewer-text-mode" type="button" hidden>格式化檢視</button>
            <div class="viewer-font-tools" hidden>
              <button class="btn" type="button" aria-label="縮小文字">A−</button>
              <button class="btn" type="button" aria-label="放大文字">A+</button>
            </div>
          </div>
          <div class="viewer-explorer" hidden></div>
          <div class="viewer-source-pane"><pre class="viewer-file-text" tabindex="0">從右側目錄選擇檔案。</pre>
            <div class="viewer-file-find" role="search" aria-label="在此檔案搜尋" hidden>
              <input type="search" aria-label="在此檔案搜尋" placeholder="搜尋此檔案…" autocomplete="off">
              <span role="status"></span>
              <button class="btn" type="button" data-find-prev aria-label="上一筆">↑</button>
              <button class="btn" type="button" data-find-next aria-label="下一筆">↓</button>
              <button class="btn" type="button" data-find-close aria-label="關閉檔內搜尋">✕</button>
            </div>
          </div>
          <dialog class="viewer-go-line" aria-label="跳到行號">
            <form>
              <input type="text" aria-label="跳到行號" placeholder="跳到行號…" autocomplete="off">
              <p class="viewer-go-line-hint" role="status"></p>
            </form>
          </dialog>
          <dialog class="viewer-quick-open" aria-label="快速開啟檔案">
            <form method="dialog">
              <input type="search" aria-label="快速開啟檔案" placeholder="輸入檔名，或 檔名:行號" autocomplete="off">
              <div class="viewer-quick-results" role="listbox" aria-label="符合的檔案"></div>
            </form>
          </dialog>
          <div class="viewer-formatted" tabindex="0" hidden></div>
          <div class="viewer-playing" hidden>
            <div class="viewer-playing-bar"><span></span><button class="btn" type="button">停止播放</button></div>
          </div>
          <section class="viewer-search" aria-label="全文搜尋" hidden>
            <div class="viewer-search-resizer" role="separator" aria-label="調整搜尋面板高度" aria-orientation="horizontal" tabindex="0"></div>
            <form class="viewer-search-form">
              <div class="viewer-search-query">
                <input type="search" aria-label="搜尋整個資料夾" placeholder="搜尋整個資料夾：空白分隔多組關鍵字，&quot;雙引號&quot; 表示片語" required>
                <button class="btn" type="submit">搜尋</button>
                <button class="btn viewer-search-history-toggle" type="button" aria-label="搜尋紀錄" title="最近搜尋紀錄" aria-expanded="false">紀錄</button>
                <button class="btn" type="button" data-close-search aria-label="關閉搜尋">×</button>
              </div>
              <div class="viewer-search-history" hidden>
                <div class="viewer-search-history-head"><strong>最近搜尋 <span class="viewer-search-history-count"></span></strong><button class="btn viewer-search-history-clear" type="button">清除全部</button></div>
                <div class="viewer-search-history-list"></div>
              </div>
              <div class="viewer-search-options">
                <label><input name="fuzzy" type="checkbox" checked> 模糊（容忍錯字、縮寫）</label>
                <label><input name="caseSensitive" type="checkbox"> 區分大小寫</label>
                <label>符合 <select name="mode"><option value="all">全部關鍵字</option><option value="any">任一關鍵字</option></select></label>
                <label>上下文 <select name="context"><option value="0">0</option><option value="1">±1</option><option value="2" selected>±2</option><option value="3">±3</option><option value="5">±5</option></select> 行</label>
                <span role="status"></span>
              </div>
            </form>
            <div class="viewer-search-results"><div class="viewer-search-hint">輸入關鍵字開始搜尋。<br>用<strong>空白</strong>分隔多組關鍵字，用 <strong>"雙引號"</strong> 表示一整個片語。<br>模糊比對會容忍打錯字與縮寫（例如 <code>replicsa</code>、<code>kfk</code>）。</div></div>
          </section>
          <footer class="viewer-note" hidden>
            <div class="viewer-note-row">
              <strong class="viewer-note-title"><span class="viewer-note-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2.5h10v8.5l-3 3H3z"/><path d="M10 14v-3h3M5.5 6h5M5.5 8.5h3"/></svg></span>備註</strong><span class="viewer-note-summary"></span>
              <button class="btn" type="button" aria-expanded="false">＋ 添加備註</button>
            </div>
            <textarea aria-label="檔案備註" rows="3" placeholder="輸入備註，會自動儲存" hidden></textarea>
          </footer>
        </div>
        <div class="viewer-splitter" role="separator" aria-label="調整目錄寬度" aria-orientation="vertical" tabindex="0"></div>
        <aside class="viewer-directory" aria-label="目錄">
          <input class="viewer-tree-filter" type="search" aria-label="篩選檔名" placeholder="篩選檔名">
          <div class="viewer-change-panel" hidden>
            <div class="viewer-change-heading"><div class="viewer-change-title"><span aria-hidden="true">${resolveIcon('git-compare')}</span><strong>重新載入的變動</strong></div><span class="viewer-change-summary"></span><button class="viewer-change-close" type="button" aria-label="關閉異動操作面板" title="關閉異動操作面板">×</button></div>
            <div class="viewer-change-stats" aria-label="異動統計"><div class="viewer-change-stat" data-kind="new"><strong>0</strong><span>新增</span></div><div class="viewer-change-stat" data-kind="mod"><strong>0</strong><span>修改</span></div><div class="viewer-change-stat" data-kind="del"><strong>0</strong><span>刪除</span></div></div>
            <div class="viewer-change-actions">
              <button class="btn" type="button" aria-pressed="false" title="切換只看異動"><span>${resolveIcon('changeFilter')}</span><span>只看異動</span></button>
              <button class="btn" type="button" aria-label="上一個異動" title="上一個異動（Shift+F8）"><span>${resolveIcon('changePrevious')}</span><span>上一個</span></button>
              <button class="btn" type="button" aria-label="下一個異動" title="下一個異動（F8）"><span>${resolveIcon('changeNext')}</span><span>下一個</span></button>
              <button class="btn" type="button" title="全部標為已看過"><span>${resolveIcon('changeMarkAll')}</span><span>全部已看</span></button>
            </div>
            <button class="btn viewer-change-return" type="button" hidden>← 返回目前檔案</button>
          </div>
          <div class="viewer-tree"></div>
          <div class="viewer-tree viewer-deleted-tree" hidden aria-label="已刪除檔案目錄"></div>
        </aside>
      </div>`;

    const status = content.querySelector('[role="status"]');
    const workspace = content.querySelector('.viewer-workspace');
    const directory = content.querySelector('.viewer-tree');
    const deletedDirectory = content.querySelector('.viewer-deleted-tree');
    const returnDeleted = content.querySelector('.viewer-change-return');
    const filter = content.querySelector('.viewer-tree-filter');
    const changePanel = content.querySelector('.viewer-change-panel');
    const [changeFilter, previousChange, nextChange, markAll] = changePanel.querySelectorAll('.viewer-change-actions button');
    changePanel.querySelector('.viewer-change-close').addEventListener('click', () => {
      // 關閉面板時同步退出異動篩選，避免隱藏面板後仍顯示異動專用樹。
      selectedChangeKinds.clear();
      setChangeMode('normal');
      changePanelOpened = false;
      changePanel.hidden = true;
    });
    let changePanelOpened = false;
    function revealChangePanel() {
      changePanelOpened = true;
      changePanel.hidden = false;
    }
    const thisFolderIcon = resolveIcon("folder", 'yellow');
	const thisFolderOpenIcon = resolveIcon("folderOpen", 'yellow');
    const start = content.querySelector('.viewer-start');
    const tabs = content.querySelector('.viewer-tabs');
    const tabScrollPrev = content.querySelector('.viewer-tab-scroll-prev');
    const tabScrollNext = content.querySelector('.viewer-tab-scroll-next');
    let tabScrollObserver;
    function updateTabScrollButtons() {
      const max = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
      const overflow = max > 2;
      tabScrollPrev.hidden = !overflow;
      tabScrollNext.hidden = !overflow;
      tabScrollPrev.disabled = tabs.scrollLeft <= 1;
      tabScrollNext.disabled = tabs.scrollLeft >= max - 1;
    }
    function ensureActiveTabVisible() {
      const active = tabs.querySelector('[aria-pressed="true"]');
      if (!active) return;
      const tab = active.closest('span');
      if (!tab) return;
      const left = tab.offsetLeft - tabs.offsetLeft;
      const right = left + tab.offsetWidth;
      if (left < tabs.scrollLeft) tabs.scrollTo({left, behavior:'smooth'});
      else if (right > tabs.scrollLeft + tabs.clientWidth)
        tabs.scrollTo({left:right - tabs.clientWidth, behavior:'smooth'});
    }
    tabScrollPrev.addEventListener('click', () => tabs.scrollBy({left:-Math.max(120, tabs.clientWidth * .65),behavior:'smooth'}));
    tabScrollNext.addEventListener('click', () => tabs.scrollBy({left:Math.max(120, tabs.clientWidth * .65),behavior:'smooth'}));
    tabs.addEventListener('scroll', updateTabScrollButtons, {passive:true});
    tabs.addEventListener('wheel', event => {
      if (tabs.scrollWidth <= tabs.clientWidth + 2) return;
      if (event.ctrlKey || event.metaKey) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;
      event.preventDefault();
      tabs.scrollLeft += delta * (event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? tabs.clientWidth : 1);
    }, {passive:false});
    if (typeof ResizeObserver !== 'undefined') {
      tabScrollObserver = new ResizeObserver(updateTabScrollButtons);
      tabScrollObserver.observe(tabs);
    }

    const preview = content.querySelector('.viewer-file-text');
    const fileInfo = content.querySelector('.viewer-file-info');
    const explorer = content.querySelector('.viewer-explorer');
    explorer.tabIndex = 0;
    explorer.setAttribute('aria-label', '檔案總管');
    // 點擊檔案之間的空白區，鍵盤控制權仍交給檔案總管。
    explorer.addEventListener('pointerdown', event => {
      if (event.target.closest('button, input, select, textarea, a')) return;
      // 點擊空白處時，讓已選取的縮圖接收鍵盤事件；不可只聚焦外層 explorer，
      // 因為方向鍵的 keydown 監聽器綁在內層 viewer-explorer-grid。
      const grid = explorer.querySelector('.viewer-explorer-grid');
      const selected = [...(grid?.querySelectorAll('.viewer-explorer-tile') || [])]
        .find(tile => tile.getAttribute('aria-selected') === 'true')
        || grid?.querySelector('.viewer-explorer-tile');
      if (selected) {
        event.preventDefault();
        selected.focus({preventScroll:true});
      } else {
        explorer.focus({preventScroll:true});
      }
    });
    let explorerFolders = new Map();
    let explorerFolder = '';
    const viewerBackHistory = [];
    let viewerHistoryReady = false;
    let viewerHistoryRestoring = false;
    function viewerLocation() {
      return explorerVisible
        ? { kind:'explorer', folder:explorerFolder, selected:explorerSelectedName }
        : currentFile ? { kind:'preview', path:currentFile.path, live:viewingLive } : null;
    }
    function rememberViewerLocation(nextKind, nextPath) {
      if (!viewerHistoryReady || viewerHistoryRestoring) return;
      const current = viewerLocation();
      if (!current) return;
      if (current.kind === nextKind && (nextKind === 'explorer' ? current.folder : current.path) === nextPath) return;
      viewerBackHistory.push(current);
      if (viewerBackHistory.length > 100) viewerBackHistory.shift();
    }
    let explorerVisible = false;
    let explorerSelectedName = '';
    let explorerScrollTop = 0;
    let explorerObserver;
    const explorerUrls = new Set();
    const explorerVideos = /\.(?:mp4|m4v|mov|webm|ogv|mkv|avi|wmv|mpeg|mpg|3gp)$/i;
    const getExplorerSettings = () => window.viewerSetting?.get?.() || { imageThumbnails: true, videoThumbnails: false };
    const videoJobs = new Set();
    let explorerGeneration = 0;
    const explorerImages = /\.(?:png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i;

    function releaseExplorerImages() {
      explorerGeneration++;
      explorerObserver?.disconnect();
      explorerObserver = undefined;
      for (const cancel of videoJobs) cancel();
      videoJobs.clear();
      for (const url of explorerUrls) URL.revokeObjectURL(url);
      explorerUrls.clear();
      explorer.replaceChildren();
    }
    function hideExplorer() {
      if (!explorerVisible) return;
      explorerScrollTop = explorer.querySelector('.viewer-explorer-grid')?.scrollTop || 0;
      explorerSelectedName = explorer.querySelector('.viewer-explorer-tile[aria-selected="true"]')?.title || explorerSelectedName;
      explorerVisible = false;
      explorer.hidden = true;
      releaseExplorerImages();
    }
    // 檔案總管與右側樹狀目錄共用選取狀態；不觸發檔案預覽。
    function selectExplorerTree(path, isFolder) {
      directory.querySelectorAll('summary[data-explorer-selected="true"]').forEach(node => node.removeAttribute('data-explorer-selected'));
      selectedButton?.removeAttribute('aria-current');
      selectedButton = undefined;
      const node = isFolder
        ? Array.from(directory.querySelectorAll('details[data-folder]')).find(item => item.dataset.folder === path)?.querySelector(':scope > summary')
        : treeEntries.get(path)?.button;
      if (!node) return;
      if (isFolder) node.dataset.explorerSelected = 'true';
      else { selectedButton = node; node.setAttribute('aria-current', 'true'); }
      // 資料夾本身由 summary 的原生單擊切換；僅自動展開其父層。
      for (let parent = (isFolder ? node.parentElement.parentElement : node).closest('details'); parent; parent = parent.parentElement.closest('details')) parent.open = true;
      node.scrollIntoView({block:'nearest'});
    }
    function showExplorer(path = explorerFolder) {
      const folder = explorerFolders.get(path);
      if (!folder) return;
      rememberViewerLocation('explorer', path);
      ++previewVersion;
      showSource();
      explorerVisible = true;
      if (path !== explorerFolder) { explorerSelectedName = ''; explorerScrollTop = 0; }
      explorerFolder = path;
      selectExplorerTree(path, true);
      explorer.hidden = false;
      preview.hidden = true;
      formatted.hidden = true;
      fileInfo.hidden = true;
      note.hidden = true;
      releaseExplorerImages();

      const bar = document.createElement('div');
      bar.className = 'viewer-explorer-bar';
      const back = document.createElement('button');
      back.type = 'button'; back.className = 'btn'; back.textContent = '↑ 上一層';
      back.disabled = !path || (path.indexOf('/') === -1 && explorerFolders.get('')?.folders.size === 1 && !explorerFolders.get('')?.files.length);
      back.addEventListener('click', () => {
        const parent = path.split('/').slice(0, -1).join('/');
        // 單一來源的最上層就是來源資料夾本身，不返回虛擬「全部檔案」。
        if (!parent && explorerFolders.get('')?.folders.size === 1 && !explorerFolders.get('')?.files.length) return;
        showExplorer(parent);
      });
      const title = document.createElement('strong');
      title.textContent = path || '全部檔案'; title.title = title.textContent;
      const counts = document.createElement('span');
      counts.className = 'viewer-explorer-counts';
      counts.textContent = `${folder.folders.size} 個目錄 · ${folder.files.length} 個檔案`;
      bar.append(back, title, counts);
      const grid = document.createElement('div'); grid.className = 'viewer-explorer-grid';
      grid.style.gap = getExplorerSettings().thumbnailGap + 'px';
      explorer.style.setProperty('--viewer-explorer-size', (getExplorerSettings().thumbnailSize || 128) + 'px');
      explorer.style.setProperty('--viewer-explorer-gap', getExplorerSettings().thumbnailGap + 'px');
      explorer.append(bar, grid);
      const settings = getExplorerSettings();
      // 影片縮圖限制同時解碼數量，避免大型資料夾同時啟動大量 video。
      const pendingVideos = [];
      let activeVideos = 0;
      const MAX_VIDEO_JOBS = 2;
      const processVideoQueue = () => {
        while (activeVideos < MAX_VIDEO_JOBS && pendingVideos.length) {
          const job = pendingVideos.shift();
          if (job.generation !== explorerGeneration || !explorerVisible) continue;
          activeVideos++;
          createVideoThumbnail(job.file, job.thumb, job.generation)
            .finally(() => { activeVideos--; processVideoQueue(); });
        }
      };
      async function createVideoThumbnail(file, thumb, generation) {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;
        const url = URL.createObjectURL(file);
        explorerUrls.add(url);
        let finished = false;
        let timer;
        let resolveDone;
        const done = new Promise(resolve => { resolveDone = resolve; });
        const cleanup = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          video.removeAttribute('src');
          video.load();
          URL.revokeObjectURL(url);
          explorerUrls.delete(url);
          videoJobs.delete(cleanup);
          resolveDone();
        };
        videoJobs.add(cleanup);
        const capture = () => {
          if (finished || generation !== explorerGeneration || !video.videoWidth || !video.videoHeight) { cleanup(); return; }
          try {
            const canvas = document.createElement('canvas');
            const ratio = Math.min(1, 256 / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
            canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = document.createElement('img');
            image.alt = '';
            image.src = canvas.toDataURL('image/jpeg', 0.72);
            thumb.replaceChildren(image);
            thumb.classList.add('viewer-explorer-video-thumb');
          } catch { /* 不支援擷取時保留影片圖示 */ }
          cleanup();
        };
        video.addEventListener('loadedmetadata', () => {
          if (finished) return;
          const target = Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(1, video.duration / 2) : 0;
          if (target > 0) {
            try { video.currentTime = target; } catch { capture(); }
          } else if (video.readyState >= 2) capture();
        }, {once:true});
        video.addEventListener('seeked', capture, {once:true});
        video.addEventListener('loadeddata', () => {
          if (!finished && video.currentTime === 0) capture();
        }, {once:true});
        video.addEventListener('error', cleanup, {once:true});
        timer = setTimeout(cleanup, 7000);
        video.src = url;
        return done;
      }
      explorerObserver = new IntersectionObserver(records => {
        for (const record of records) {
          if (!record.isIntersecting) continue;
          const target = record.target;
          explorerObserver?.unobserve(target);
          const file = target._viewerFile;
          if (!file || !explorerVisible) continue;
          if (target._viewerVideo) {
            pendingVideos.push({file, thumb: target, generation: explorerGeneration});
            processVideoQueue();
          } else {
            const url = URL.createObjectURL(file);
            explorerUrls.add(url);
            target.addEventListener('load', () => { URL.revokeObjectURL(url); explorerUrls.delete(url); }, {once:true});
            target.addEventListener('error', () => { URL.revokeObjectURL(url); explorerUrls.delete(url); }, {once:true});
            target.src = url;
          }
        }
      }, { root: grid, rootMargin: '160px' });
      const makeTile = (name, folderTile, action, file) => {
        const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'viewer-explorer-tile';
        tile.title = name;
        const thumb = document.createElement('span'); thumb.className = 'viewer-explorer-thumb';
        if (folderTile) thumb.textContent = '📁';
        else if (file && settings.imageThumbnails && explorerImages.test(name)) {
          const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img._viewerFile = file;
          thumb.append(img); explorerObserver.observe(img);
        } else if (file && settings.videoThumbnails && explorerVideos.test(name)) {
          thumb.innerHTML = viewerFileSvg(name);
          thumb._viewerFile = file;
          thumb._viewerVideo = true;
          explorerObserver.observe(thumb);
        } else thumb.innerHTML = viewerFileSvg(name);
        const label = document.createElement('span'); label.className = 'viewer-explorer-name'; label.textContent = name;
        tile.append(thumb, label);
        tile.addEventListener('click', () => {
          grid.querySelector('.viewer-explorer-tile[aria-selected="true"]')?.removeAttribute('aria-selected');
          tile.setAttribute('aria-selected', 'true');
          explorerSelectedName = name;
          const selectedPath = path ? path + '/' + name : name;
          selectExplorerTree(selectedPath, folderTile);
        });
        tile.addEventListener('dblclick', action);
        grid.append(tile);
      };
      const cmp = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'}).compare;
      for (const name of [...folder.folders.keys()].sort(cmp)) {
        const childPath = path ? path + '/' + name : name;
        makeTile(name, true, () => showExplorer(childPath));
      }
      for (const entry of [...folder.files].sort((a,b) => cmp(a.file.name,b.file.name))) {
        makeTile(entry.file.name, false, () => {
          if (pinned.has(entry)) openFile(entry, false);
          else openFile(entry);
        }, entry.file);
      }
      // 縮圖鍵盤導覽：依實際 DOM 座標判斷上下列，不寫死欄數。
      const tiles = () => [...grid.querySelectorAll('.viewer-explorer-tile')];
      const chooseTile = tile => {
        if (!tile) return;
        tile.focus({preventScroll:true});
        tile.click();
        tile.scrollIntoView({block:'nearest', inline:'nearest'});
      };
      grid.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter'].includes(event.key)) return;
        const items = tiles();
        const current = event.target.closest('.viewer-explorer-tile')
          || items.find(tile => tile.getAttribute('aria-selected') === 'true')
          || items[0];
        const index = items.indexOf(current);
        if (index < 0) return;
        event.preventDefault();
        if (event.key === 'Enter') { current.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); return; }
        if (event.key === 'Home') { chooseTile(items[0]); return; }
        if (event.key === 'End') { chooseTile(items.at(-1)); return; }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          chooseTile(items[index + (event.key === 'ArrowLeft' ? -1 : 1)]);
          return;
        }
        const rect = current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const candidates = items.filter(item => {
          if (item === current) return false;
          const r = item.getBoundingClientRect();
          const y = r.top + r.height / 2;
          return event.key === 'ArrowDown' ? y > cy + rect.height / 3 : y < cy - rect.height / 3;
        });
        candidates.sort((a,b) => {
          const score = item => {
            const r = item.getBoundingClientRect();
            return Math.abs(r.top+r.height/2-cy)*100 + Math.abs(r.left+r.width/2-cx);
          };
          return score(a)-score(b);
        });
        chooseTile(candidates[0]);
      });
      if (!grid.childElementCount) {
        const empty = document.createElement('p'); empty.textContent = '這個資料夾沒有檔案。'; grid.append(empty);
      }
      const selectedTile = [...grid.querySelectorAll('.viewer-explorer-tile')]
        .find(tile => tile.title === explorerSelectedName);
      // 進入檔案總管時，預設讓第一個項目有明確焦點；重繪時保留既有選取。
      const focusedTile = selectedTile || grid.querySelector('.viewer-explorer-tile');
      if (focusedTile) {
        focusedTile.setAttribute('aria-selected', 'true');
        explorerSelectedName = focusedTile.title;
        focusedTile.focus({preventScroll:true});
      }
      grid.scrollTop = explorerScrollTop;
      renderTabs();
      saveSession();
    }
    content.addEventListener('viewer-settings-change', () => {
      if (explorerVisible) showExplorer(explorerFolder);
    });
    const filePath = fileInfo.querySelector('.viewer-file-path');
    // 路徑導覽：目錄可點擊，檔名維持純文字。
    function renderFileBreadcrumb(path) {
      filePath.replaceChildren();
      const parts = String(path || '').split('/').filter(Boolean);
      parts.forEach((part, index) => {
        if (index) {
          const separator = document.createElement('span');
          separator.className = 'viewer-path-separator';
          separator.textContent = '/';
          separator.setAttribute('aria-hidden', 'true');
          filePath.appendChild(separator);
        }
        if (index < parts.length - 1) {
          const folderPath = parts.slice(0, index + 1).join('/');
          const link = document.createElement('button');
          link.type = 'button';
          link.className = 'viewer-path-folder';
          link.textContent = part;
          link.title = '前往檔案總管：' + folderPath;
          link.addEventListener('click', () => {
            if (explorerFolders.has(folderPath)) {
              showExplorer(folderPath);
              renderTabs();
              saveSession();
            }
          });
          filePath.appendChild(link);
        } else {
          const filename = document.createElement('span');
          filename.className = 'viewer-path-filename';
          filename.textContent = part;
          filePath.appendChild(filename);
        }
      });
      filePath.title = path;
    }

    const fileMeta = fileInfo.querySelector('.viewer-file-meta');
    const pdfOpenButton = fileInfo.querySelector('.viewer-pdf-open');
    const pdfTabUrls = new Set();
    window.addEventListener('pagehide', () => {
      for (const url of pdfTabUrls) URL.revokeObjectURL(url);
      pdfTabUrls.clear();
    });
    const fileTypes = {
      js: ['JS', 'JavaScript', 'js'], mjs: ['JS', 'JavaScript', 'js'], cjs: ['JS', 'JavaScript', 'js'],
      ts: ['TS', 'TypeScript', 'ts'], tsx: ['TSX', 'TypeScript', 'ts'], jsx: ['JSX', 'JavaScript', 'js'],
      json: ['{}', 'JSON', 'markup'], html: ['#', 'HTML', 'markup'], htm: ['#', 'HTML', 'markup'],
      css: ['CSS', 'CSS', 'ts'], md: ['M↓', 'Markdown', 'docs'], png: ['▧', 'PNG', 'media'],
      jpg: ['▧', 'JPEG', 'media'], jpeg: ['▧', 'JPEG', 'media'], svg: ['▧', 'SVG', 'media'],
      gif: ['▧', 'GIF', 'media'], webp: ['▧', 'WebP', 'media'], pdf: ['PDF', 'PDF', 'media'],
      yaml: ['Y', 'YAML', 'data'], yml: ['Y', 'YAML', 'data'], csv: ['▦', 'CSV', 'docs'],
      sh: ['›_', 'Shell', 'docs'], ps1: ['›_', 'PowerShell', 'ts'], py: ['PY', 'Python', 'ts'],
      txt: ['▤', '純文字', 'file'], log: ['▤', '日誌', 'file'], xml: ['<>', 'XML', 'markup'],
      scss: ['S', 'SCSS', 'media'], less: ['#', 'Less', 'ts'], toml: ['T', 'TOML', 'data'],
      ini: ['⚙', 'INI', 'data'], env: ['⚙', '環境設定', 'data'], tsv: ['▦', 'TSV', 'docs'],
      sql: ['DB', 'SQL', 'data'], zip: ['▣', 'ZIP', 'archive'], gz: ['▣', 'Gzip', 'archive'],
      tgz: ['▣', 'TGZ', 'archive'], tar: ['▣', 'Tar', 'archive'], rar: ['▣', 'RAR', 'archive'],
      '7z': ['▣', '7z', 'archive'], mp3: ['♪', 'MP3', 'media'], wav: ['♪', 'WAV', 'media'],
      flac: ['♪', 'FLAC', 'media'], mp4: ['▶', 'MP4', 'media'], mkv: ['▶', 'MKV', 'media'],
      webm: ['▶', 'WebM', 'media'], ico: ['▧', 'ICO', 'media'], avif: ['▧', 'AVIF', 'media'],
      bat: ['›_', 'Batch', 'docs'], cmd: ['›_', 'CMD', 'docs'], java: ['J', 'Java', 'markup'],
      cs: ['C#', 'C#', 'data'], cpp: ['C+', 'C++', 'ts'], c: ['C', 'C', 'ts'], h: ['H', 'C 標頭', 'ts'],
      go: ['Go', 'Go', 'ts'], rs: ['Rs', 'Rust', 'markup'], rb: ['Rb', 'Ruby', 'git'], php: ['P', 'PHP', 'data'],
    };

    function fileType(name) {
      if (/^\.git(?:ignore|attributes|modules)$/i.test(name)) return ['◆', 'Git', 'git'];
      if (/^claude\.md$/i.test(name)) return ['✳', 'Markdown', 'markup'];
      const extension = name.match(/\.([^.]+)$/)?.[1].toLowerCase() || '';
      return Object.hasOwn(fileTypes, extension) ? fileTypes[extension] :
        [extension.slice(0, 4).toUpperCase() || '▤', extension.toUpperCase() || '檔案', 'file'];
    }

    const viewerSvgTypes = Object.create(null);
    const viewerSvgGroups = [
      ['js',       '#E4C34B', 'js mjs cjs jsx'],
      ['ts',       '#78AEDA', 'ts tsx'],
      ['html',     '#D78A53', 'html htm'],
      ['xml',      '#D6A34E', 'xml'],
      ['java',     '#D78A53', 'java'],
      ['php',      '#A9A1D6', 'php'],
      ['cs',       '#78AEDA', 'cs'],
      ['cshtml',   '#B87CA9', 'cshtml'],
      ['css',      '#6EACDC', 'css scss less'],
      ['json',     '#D6A34E', 'json yaml yml toml'],
      ['md',       '#6CB8A2', 'md'],
      ['image',    '#B87CA9', 'png jpg jpeg svg gif webp ico avif'],
      ['pdf',      '#D47A60', 'pdf'],
      ['csv',      '#6CB8A2', 'csv tsv'],
      ['terminal', '#8FB9D7', 'sh ps1 bat cmd'],
      ['html',     '#78AEDA', 'py'],
      ['pdf',      '#9DA7B1', 'txt log'],
      ['ini',      '#A9A1D6', 'ini env'],
      ['sql',      '#D6A34E', 'sql'],
      ['zip',      '#B99A67', 'zip gz tgz tar rar 7z'],
      ['music',    '#B87CA9', 'mp3 wav flac'],
      ['video',    '#B87CA9', 'mp4 mkv webm'],
      ['html',     '#78AEDA', 'cs cpp c h go rs rb'],
      ['git',      '#D47A60', 'gitignore gitattributes gitmodules']
    ];
    for (const [shape, color, extensions] of viewerSvgGroups) {
		for (const ext of extensions.split(' ').filter(Boolean)) {
			viewerSvgTypes[ext] = { shape, color };
		}
	}
    // 明確對應特殊檔名；其餘名稱一律從副檔名辨識。
	function viewerFileSvg(filename) {
		const lower = String(filename).toLowerCase();
		const ext = lower.match(/\.([^.]+)$/)?.[1] || '';

		const icon = viewerSvgTypes[ext] || {
			shape: 'file',
			color: '#9DA7B1'
		};

		const shape = icon.shape.startsWith('ext-')
			? icon.shape
			: 'ext-' + icon.shape;

		return resolveIcon(shape, icon.color);
	}

    // 防止新增 fileTypes 時忘記 SVG 對應（開發期間可由 console 看見）。
    for (const ext of Object.keys(fileTypes)) {
      if (!viewerSvgTypes[ext]) console.warn('Viewer SVG 未定義副檔名:', ext);
    }
    const note = content.querySelector('.viewer-note');
    const noteButton = note.querySelector('button');
    const noteInput = note.querySelector('textarea');
    const noteSummary = note.querySelector('.viewer-note-summary');
    const splitter = content.querySelector('.viewer-splitter');
    const sidebarWidthKey = 'site-viewer-sidebar-width';
    const pinned = new Set();
    let loadVersion = 0;
    let previewVersion = 0;
    let currentFile;
    let liveFile;
    let viewingLive = true;
    let activeRecent;
    let initialized = false;
    let selectedButton;
    let treeCursor;
    let changesOnly = false;
    let deletedChanges = [];
    let changeMode = 'normal'; // normal | selected (multi-select change kinds)
    const selectedChangeKinds = new Set();
    const modeFilters = { normal: '', selected: '' };
    let treeEntries = new Map();
    let sessionSource;
    const locationKey = 'site-viewer-location';
    const removedRecords = new Set();

    function readSessionValue(key) {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch {
        return null;
      }
    }

    function writeSessionValue(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn('無法儲存 Viewer 工作狀態:', error);
      }
    }

    function noteKey() {
      return 'site-viewer-note:' + JSON.stringify([sessionSource, currentFile.path]);
    }

    function updateNoteSummary() {
      const hasText = !!noteInput.value.trim();
      noteSummary.textContent = hasText ? noteInput.value.trim().split('\n')[0] : '這個檔案還沒有備註';
      noteButton.textContent = !noteInput.hidden ? '收合' : hasText ? '編輯備註' : '＋ 添加備註';
      noteButton.setAttribute('aria-expanded', String(!noteInput.hidden));
    }

    function renderNote() {
      note.hidden = !currentFile || !sessionSource;
      noteInput.hidden = true;
      noteInput.value = note.hidden ? '' : readSessionValue(noteKey()) || '';
      updateNoteSummary();
    }

    noteButton.addEventListener('click', () => {
      noteInput.hidden = !noteInput.hidden;
      updateNoteSummary();
      if (!noteInput.hidden) noteInput.focus();
    });
    noteInput.addEventListener('input', () => {
      if (!currentFile || !sessionSource) return;
      writeSessionValue(noteKey(), noteInput.value);
      updateNoteSummary();
    });
    noteInput.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      directory.focus({ preventScroll: true });
    });

    function resizeDirectory(width) {
      const available = workspace.clientWidth;
      if (!available) return;
      const min = Math.min(160, available * .3);
      const max = Math.max(min, available - 160);
      const size = Math.round(Math.max(min, Math.min(max, width)));
      workspace.style.setProperty('--viewer-directory-width', size + 'px');
      splitter.setAttribute('aria-valuemin', String(Math.round(min)));
      splitter.setAttribute('aria-valuemax', String(Math.round(max)));
      splitter.setAttribute('aria-valuenow', String(size));
      writeSessionValue(sidebarWidthKey, size);
    }

    const savedWidth = readSessionValue(sidebarWidthKey);
    if (Number.isFinite(savedWidth)) workspace.style.setProperty('--viewer-directory-width', savedWidth + 'px');
    splitter.addEventListener('pointerdown', event => {
      if (event.button === 0) splitter.setPointerCapture(event.pointerId);
    });
    splitter.addEventListener('pointermove', event => {
      if (splitter.hasPointerCapture(event.pointerId)) {
        resizeDirectory(workspace.getBoundingClientRect().right - event.clientX);
      }
    });
    splitter.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const width = splitter.nextElementSibling.getBoundingClientRect().width;
      resizeDirectory(width + (event.key === 'ArrowLeft' ? 16 : -16));
    });

    let sourceLine = 0;
    let sourceLineCount = 0;
    function selectSourceLine(index, reveal = false, center = false) {
      if (!sourceLineCount) return;
      sourceLine = Math.max(0, Math.min(sourceLineCount - 1, index));
      if (preview.classList.contains('viewer-wrapped')) {
        preview.querySelector('.viewer-wrapped-line.current')?.classList.remove('current');
        const line = preview.children[sourceLine];
        if (!line) return;
        line.classList.add('current');
        if (reveal && !preview.hidden) {
          const bounds = line.getBoundingClientRect();
          const top = bounds.top - preview.getBoundingClientRect().top;
          if (center) preview.scrollTop += top - (preview.clientHeight - bounds.height) / 2;
          else if (top < 0) preview.scrollTop += top;
          else if (top + bounds.height > preview.clientHeight) preview.scrollTop += top + bounds.height - preview.clientHeight;
        }
        return;
      }
      const code = preview.querySelector('.viewer-source-code');
      if (!code) return;
      code.closest('.viewer-code-contents').style.setProperty('--viewer-active-line', String(sourceLine));
      if (!reveal) return;
      const lineHeight = parseFloat(getComputedStyle(code).lineHeight);
      const top = code.getBoundingClientRect().top - preview.getBoundingClientRect().top + sourceLine * lineHeight;
      if (center) preview.scrollTop += top - (preview.clientHeight - lineHeight) / 2;
      else if (top < 0) preview.scrollTop += top;
      else if (top + lineHeight > preview.clientHeight) preview.scrollTop += top + lineHeight - preview.clientHeight;
    }

    preview.addEventListener('click', event => {
      if (window.getSelection()?.type === 'Range') return;
      const row = event.target.closest('.viewer-wrapped-line');
      if (row) {
        selectSourceLine(Number(row.dataset.index));
        preview.focus({ preventScroll: true });
        return;
      }
      const code = preview.querySelector('.viewer-source-code');
      if (!code || !sourceLineCount || window.getSelection()?.type === 'Range') return;
      const lineHeight = parseFloat(getComputedStyle(code).lineHeight);
      selectSourceLine(Math.floor((event.clientY - code.getBoundingClientRect().top) / lineHeight));
      preview.focus({ preventScroll: true });
    });

    preview.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      if (sourceLineCount) selectSourceLine(sourceLine + direction, true);
      else preview.scrollTop += parseFloat(getComputedStyle(preview).lineHeight) * direction;
    });

    let previewPreferences = new Map();
    let pendingRestoreTabs = [];

    function rememberPreview(entry, updates) {
      previewPreferences.set(entry.path, { ...previewPreferences.get(entry.path), ...updates });
      saveSession();
    }

    function saveSession() {
      if (!sessionSource || workspace.hidden) return;
      writeSessionValue('site-viewer-session:' + sessionSource, {
        tabs: [...Array.from(pinned, entry => ({ path: entry.path, pinned: true })), ...pendingRestoreTabs],
        active: currentFile?.path,
        live: liveFile?.path,
        viewingLive,
        previews: [...previewPreferences],
        expanded: Array.from(directory.querySelectorAll('details[data-folder][open]'), folder => folder.dataset.folder),
        filter: modeFilters.normal,
        explorer: explorerVisible,
        explorerFolder,
        explorerSelectedName,
        explorerScrollTop: explorerVisible ? (explorer.querySelector('.viewer-explorer-grid')?.scrollTop || 0) : explorerScrollTop,
      });
    }

    directory.addEventListener('toggle', event => {
      if (event.target.matches('details[data-folder]')) saveSession();
    }, true);

    // Build a single virtual tree for any combination of added/modified/deleted files.
    function buildDeletedTree() {
      deletedDirectory.replaceChildren();
      const root = { folders: new Map(), files: [] };
      const add = (path, kind) => {
        const parts = path.split('/');
        const name = parts.pop();
        let node = root;
        for (const part of parts) {
          if (!node.folders.has(part)) node.folders.set(part, { folders: new Map(), files: [] });
          node = node.folders.get(part);
        }
        node.files.push({ name, path, kind });
      };
      for (const entry of treeEntries.values()) {
        if (entry.change?.k && selectedChangeKinds.has(entry.change.k)) add(entry.path, entry.change.k);
      }
      if (selectedChangeKinds.has('del')) for (const file of deletedChanges) add(file.path, 'del');
      const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;
      function render(node, host, prefix) {
        const ul = document.createElement('ul');
        for (const [name, child] of [...node.folders].sort(([a],[b]) => compare(a,b))) {
          const li = document.createElement('li');
          const details = document.createElement('details');
          details.dataset.deletedFolder = prefix + name;
          details.open = true;
          const summary = document.createElement('summary');
          const folderIcon = document.createElement('span');
          folderIcon.className = 'viewer-tree-icon';
          folderIcon.innerHTML = `<span class="viewer-folder-closed">${thisFolderIcon}</span><span class="viewer-folder-open">${thisFolderOpenIcon}</span>`;
          const label = document.createElement('span');
          label.className = 'viewer-tree-name';
          label.textContent = name;
          summary.append(folderIcon, label);
          details.appendChild(summary);
          render(child, details, prefix + name + '/');
          li.appendChild(details);
          ul.appendChild(li);
        }
        for (const file of node.files.sort((a,b) => compare(a.name,b.name))) {
          const li = document.createElement('li');
          li.dataset.deletedPath = file.path;
          const row = document.createElement('div');
          row.className = 'viewer-deleted-file';
          row.dataset.changeKind = file.kind;
          row.title = file.path + (file.kind === 'del' ? '（檔案已刪除，無法預覽）' : '（點擊開啟）');
          const icon = document.createElement('span');
          icon.className = 'viewer-tree-file-icon';
          icon.innerHTML = viewerFileSvg(file.name);
          const name = document.createElement('span');
          name.className = 'viewer-tree-name';
          name.textContent = file.name;
          const tag = document.createElement('span');
          tag.className = 'viewer-tree-change viewer-deleted-tag';
          tag.dataset.change = file.kind;
          tag.textContent = ({new:'新',mod:'改',del:'刪'})[file.kind];
          row.append(icon,name,tag);
          if (file.kind !== 'del') {
            row.tabIndex = 0;
            row.setAttribute('role', 'button');
            const open = () => treeEntries.get(file.path)?.button?.click();
            row.addEventListener('click', open);
            row.addEventListener('keydown', event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
            });
          }
          li.appendChild(row);
          ul.appendChild(li);
        }
        host.appendChild(ul);
      }
      render(root, deletedDirectory, '');
    }

    function setChangeMode(mode) {
      if (mode !== 'normal' && mode !== 'selected') return;
      if (mode === 'selected' && !selectedChangeKinds.size) mode = 'normal';
      if (changeMode !== mode) {
        modeFilters[changeMode] = filter.value;
        changeMode = mode;
        filter.value = modeFilters[mode];
      }
      const selected = mode === 'selected';
      directory.hidden = selected;
      deletedDirectory.hidden = !selected;
      returnDeleted.hidden = !selected;
      returnDeleted.textContent = '← 返回目前檔案';
      filter.placeholder = selected ? '篩選異動檔名' : '篩選檔名';
      changePanel.querySelectorAll('.viewer-change-stat').forEach(card => {
        card.setAttribute('aria-pressed', String(selected && selectedChangeKinds.has(card.dataset.kind)));
      });
      changeFilter.setAttribute('aria-pressed', String(selected && ['new','mod','del'].every(k => selectedChangeKinds.has(k) || !changePanel.querySelector(`.viewer-change-stat[data-kind="${k}"]`)?.classList.contains('is-available'))));
      if (selected) buildDeletedTree();
      filterTree();
      saveSession();
    }

    changePanel.querySelectorAll('.viewer-change-stat').forEach(card => {
      const activate = () => {
        if (!card.classList.contains('is-available')) return;
        const kind = card.dataset.kind;
        if (selectedChangeKinds.has(kind)) selectedChangeKinds.delete(kind);
        else selectedChangeKinds.add(kind);
        setChangeMode(selectedChangeKinds.size ? 'selected' : 'normal');
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
      });
    });
    returnDeleted.addEventListener('click', () => {
      selectedChangeKinds.clear();
      setChangeMode('normal');
    });

    function filterTree() {
      const query = filter.value.trim().toLocaleLowerCase();
      if (changeMode === 'selected') {
        deletedDirectory.querySelectorAll('[data-deleted-path]').forEach(row => {
          row.hidden = !row.dataset.deletedPath.toLocaleLowerCase().includes(query);
        });
        [...deletedDirectory.querySelectorAll('details[data-deleted-folder]')].reverse().forEach(folder => {
          const visible = !!folder.querySelector('[data-deleted-path]:not([hidden])');
          folder.parentElement.hidden = !visible;
          if (query && visible) folder.open = true;
        });
        return;
      }
      directory.querySelectorAll('[data-file-path]').forEach(row => {
        row.hidden = (changesOnly && !treeEntries.get(row.dataset.filePath)?.change) ||
          !row.dataset.filePath.toLocaleLowerCase().includes(query);
      });
      directory.querySelectorAll('details[data-folder]').forEach(folder => {
        const filtering = !!query || changesOnly;
        folder.parentElement.hidden = filtering && !folder.querySelector('[data-file-path]:not([hidden])');
        if (filtering && !folder.parentElement.hidden) folder.open = true;
      });
    }

    filter.addEventListener('input', () => {
      modeFilters[changeMode] = filter.value;
      filterTree();
      if (changeMode === 'normal') saveSession();
    });

    function refreshChangeBadges() {
      const counts = new Map();
      let added = 0;
      let modified = 0;
      for (const entry of treeEntries.values()) {
        entry.badge.textContent = entry.change ? (entry.change.k === 'new' ? '新' : '改') : '';
        entry.badge.dataset.change = entry.change?.k || '';
        if (!entry.change) continue;
        if (entry.change.k === 'new') added++;
        else modified++;
        const parts = entry.path.split('/');
        parts.pop();
        while (parts.length) {
          const path = parts.join('/');
          counts.set(path, (counts.get(path) || 0) + 1);
          parts.pop();
        }
      }
      directory.querySelectorAll('details[data-folder]').forEach(folder => {
        folder.firstElementChild.querySelector('.viewer-tree-change').textContent = counts.get(folder.dataset.folder) || '';
      });
      const unseen = added + modified;
      if (!unseen) changesOnly = false;
      changePanel.hidden = !changePanelOpened;
      const totalChanges = added + modified + deletedChanges.length;
      changePanel.querySelector('.viewer-change-summary').textContent = `共 ${totalChanges} 項`;
      changePanel.querySelector('[data-kind="new"] strong').textContent = added;
      changePanel.querySelector('[data-kind="mod"] strong').textContent = modified;
      changePanel.querySelector('[data-kind="del"] strong').textContent = deletedChanges.length;
      const available = { new: added, mod: modified, del: deletedChanges.length };
      changePanel.querySelectorAll('.viewer-change-stat').forEach(card => {
        const count = available[card.dataset.kind];
        card.tabIndex = count ? 0 : -1;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `切換${({new:'新增',mod:'修改',del:'刪除'})[card.dataset.kind]}的 ${count} 個檔案篩選`);
        card.setAttribute('aria-pressed', String(changeMode === 'selected' && selectedChangeKinds.has(card.dataset.kind)));
        card.classList.toggle('is-available', count > 0);
      });
      for (const kind of [...selectedChangeKinds]) if (!available[kind]) selectedChangeKinds.delete(kind);
      if (changeMode === 'selected' && !selectedChangeKinds.size) setChangeMode('normal');
      buildDeletedTree();
      changeFilter.disabled = !(added + modified + deletedChanges.length);
      previousChange.disabled = nextChange.disabled = !unseen;
      changeFilter.setAttribute('aria-pressed', String(changeMode === 'selected' && ['new','mod','del'].every(k => selectedChangeKinds.has(k) || !available[k])));
      filterTree();
    }

    function toggleChangesOnly() {
      if (workspace.hidden || changeFilter.disabled) return;
      const available = new Set();
      if ([...treeEntries.values()].some(e => e.change?.k === 'new')) available.add('new');
      if ([...treeEntries.values()].some(e => e.change?.k === 'mod')) available.add('mod');
      if (deletedChanges.length) available.add('del');
      const allSelected = changeMode === 'selected' && [...available].every(k => selectedChangeKinds.has(k));
      selectedChangeKinds.clear();
      if (!allSelected) for (const kind of available) selectedChangeKinds.add(kind);
      setChangeMode(allSelected ? 'normal' : 'selected');
    }

    changeFilter.addEventListener('click', toggleChangesOnly);
    previousChange.addEventListener('click', () => jumpChange(-1));
    nextChange.addEventListener('click', () => jumpChange(1));
    function markAllChangesSeen() {
      for (const entry of treeEntries.values()) entry.change = undefined;
      deletedChanges = [];
      directory.querySelector('[data-viewer-deleted]')?.remove();
      if (activeRecent?.snapshot) {
        for (const file of activeRecent.snapshot.files) delete file.ch;
        activeRecent.snapshot.gone = [];
        saveRecent(activeRecent);
      }
      refreshChangeBadges();
	  if (typeof renderToolbar === 'function') renderToolbar();
    }
    function confirmMarkAllChangesSeen() {
      const count = [...treeEntries.values()].filter(entry => entry.change).length + deletedChanges.length;
      if (!count) return;
      if (typeof window.confirmAction !== 'function') {
        console.warn('Viewer: guard.js 的 confirmAction 尚未載入，未執行全部已看。');
        return;
      }
      window.confirmAction({
        message: `確定將全部 ${count} 項異動標記為已看？此操作無法復原。`,
        cancelText: '取消',
        confirmText: '全部標為已看'
      }, markAllChangesSeen);
    }
    markAll.addEventListener("click", confirmMarkAllChangesSeen);

    function jumpChange(direction) {
      if (workspace.hidden) return;
      const rows = Array.from(directory.querySelectorAll('[data-file-path]:not([hidden])'));
      if (!rows.some(row => treeEntries.get(row.dataset.filePath)?.change)) {
        showStatus('目前沒有符合條件的異動。');
        return;
      }
      let index = rows.findIndex(row => row.dataset.filePath === currentFile?.path);
      if (index < 0 && direction < 0) index = 0;
      do {
        index = (index + direction + rows.length) % rows.length;
      } while (!treeEntries.get(rows[index].dataset.filePath)?.change);
      const entry = treeEntries.get(rows[index].dataset.filePath);
      openFile(entry);
      revealFile(entry);
    }

    window.addEventListener('keydown', event => {
      if (window.viewMode === 'viewer' && !workspace.hidden &&
          event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
          event.key === 'ArrowLeft' && !content.querySelector('dialog[open]')) {
        event.preventDefault();
        event.stopPropagation();
        while (viewerBackHistory.length) {
          const previous = viewerBackHistory.pop();
          if (previous.kind === 'explorer' && !explorerFolders.has(previous.folder)) continue;
          const entry = previous.kind === 'preview' ? treeEntries.get(previous.path) : null;
          if (previous.kind === 'preview' && !entry) continue;
          viewerHistoryRestoring = true;
          try {
            if (previous.kind === 'explorer') {
              explorerSelectedName = previous.selected || '';
              showExplorer(previous.folder);
            } else openFile(entry, previous.live);
          } finally { viewerHistoryRestoring = false; }
          break;
        }
        return;
      }
      if (window.viewMode === 'viewer' && !workspace.hidden && event.key === 'F6' &&
          !event.altKey && !event.ctrlKey && !event.metaKey && !content.querySelector('dialog[open]')) {
        event.preventDefault();
        if (workspace.querySelector('.viewer-directory').contains(document.activeElement)) {
          if (explorerVisible) {
            const tile = explorer.querySelector('.viewer-explorer-tile[aria-selected="true"]') || explorer.querySelector('.viewer-explorer-tile');
            (tile || explorer).focus({ preventScroll: true });
          } else (formatted.hidden ? preview : formatted).focus();
        }
        else {
          const rows = visibleTreeControls();
          const target = rows.includes(treeCursor) ? treeCursor :
            rows.includes(selectedButton) ? selectedButton : rows[0];
          (target || filter).focus();
        }
        return;
      }
      if (window.viewMode !== 'viewer' || workspace.hidden || event.key !== 'F8' || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      jumpChange(event.shiftKey ? -1 : 1);
    });

    function visibleTreeControls() {
      return Array.from(directory.querySelectorAll('li > details > summary, li > button')).filter(control => {
        if (control.closest('[hidden]')) return false;
        const parentFolder = control.closest('li').parentElement.closest('details');
        for (let folder = parentFolder; folder; folder = folder.parentElement.closest('details')) {
          if (!folder.open) return false;
        }
        return true;
      });
    }

    directory.addEventListener('focusin', event => {
      if (!event.target.matches('li > details > summary, li > button')) return;
      treeCursor?.removeAttribute('data-tree-cursor');
      treeCursor = event.target;
      treeCursor.dataset.treeCursor = '';
    });

    directory.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const controls = visibleTreeControls();
      const index = controls.indexOf(event.target);
      if (index < 0) return;
      const folder = event.target.matches('summary') ? event.target.parentElement : null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        moveTreeCursor(controls[index + (event.key === 'ArrowDown' ? 1 : -1)]);
      } else if (event.key === 'Enter' && !folder) {
        const entry = treeEntries.get(event.target.closest('[data-file-path]')?.dataset.filePath);
        if (!entry) return;
        pinFile(entry);
        preview.focus({ preventScroll: true });
      } else if (event.key === 'ArrowRight' && folder) {
        if (!folder.open) folder.open = true;
        else {
          const next = controls[index + 1];
          if (next && folder.contains(next)) moveTreeCursor(next);
        }
      } else if (event.key === 'ArrowLeft') {
        if (folder?.open) folder.open = false;
        else moveTreeCursor(event.target.closest('li').parentElement.closest('details')?.firstElementChild);
      } else {
        return;
      }
      event.preventDefault();
    });

    function moveTreeCursor(control) {
      if (!control) return;
      control.focus();
      const entry = treeEntries.get(control.closest('[data-file-path]')?.dataset.filePath);
      // 檔案總管顯示時，樹狀目錄方向鍵只移動焦點，不切換成檔案預覽。
      if (entry && explorerVisible) {
        entry.button?.click();
        control.focus({preventScroll:true});
      } else if (entry) openFile(entry);
    }

    const tabMenu = content.querySelector('.tabmenu');
    const tabMenuButton = content.querySelector('.tabs-all');
    const tabMenuFilter = tabMenu.querySelector('input');
    const tabMenuSort = tabMenu.querySelector('.tm-bar button');
    const tabMenuList = tabMenu.querySelector('.tm-list');
    const tabRecency = new WeakMap();
    let tabVisit = 0;
    let recentTabsFirst = false;

    function closeTabMenu(returnFocus = false) {
      tabMenu.hidden = true;
      tabMenuButton.setAttribute('aria-expanded', 'false');
      if (returnFocus && !tabMenuButton.parentElement.hidden) tabMenuButton.focus();
    }

    function closeFixedTab(entry) {
      pinned.delete(entry);
      if (!viewingLive && currentFile === entry) {
        const fallback = liveFile || Array.from(pinned).at(-1);
        if (fallback) openFile(fallback, fallback === liveFile);
        else showExplorer(explorerFolders.has(explorerFolder) ? explorerFolder : '');
      } else {
        renderTabs();
        saveSession();
      }
    }

    function renderTabMenu() {
      const items = [...(liveFile ? [{ entry: liveFile, live: true }] : []),
        ...Array.from(pinned, entry => ({ entry, live: false }))];
      tabMenuButton.parentElement.hidden = !items.length;
      tabMenuButton.textContent = '▾ ' + items.length;
      tabMenuButton.setAttribute('aria-label', '所有分頁，共 ' + items.length + ' 個');
      if (!items.length) closeTabMenu();
      if (tabMenu.hidden) return;
      if (recentTabsFirst) items.sort((a, b) => (tabRecency.get(b.entry) || 0) - (tabRecency.get(a.entry) || 0));
      const query = tabMenuFilter.value.trim().toLowerCase();
      const visible = items.filter(({ entry }) => entry.path.toLowerCase().includes(query));
      tabMenu.querySelector('.tm-bar span').textContent = query
        ? visible.length + ' / ' + items.length + ' 個分頁' : items.length + ' 個分頁';
      tabMenuList.replaceChildren();
      for (const { entry, live } of visible) {
        const selected = !explorerVisible && currentFile === entry && viewingLive === live;
        const row = document.createElement('div');
        row.className = 'tm-item';
        row.classList.toggle('sel', selected);
        row.classList.toggle('preview', live);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tm-main';
        button.title = entry.path;
        if (selected) button.setAttribute('aria-current', 'true');
        const dot = document.createElement('span');
        dot.className = 'tm-dot';
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = selected ? '●' : '';
        const name = document.createElement('strong');
        name.className = 'qo-name';
        name.textContent = entry.file.name;
        const path = document.createElement('span');
        path.className = 'tm-path';
        path.textContent = '/' + entry.path.split('/').slice(0, -1).join('/');
        button.append(dot, name, path);
        button.addEventListener('click', async () => {
          closeTabMenu();
          await openFile(entry, live);
          if (currentFile !== entry) return;
          revealFile(entry);
          (formatted.hidden ? preview : formatted).focus({ preventScroll: true });
        });
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'x';
        close.textContent = '×';
        close.setAttribute('aria-label', '關閉 ' + entry.path);
        close.addEventListener('click', () => {
          if (live) {
            liveFile = undefined;
            if (viewingLive) {
              const fallback = Array.from(pinned).at(-1);
              if (fallback) openFile(fallback, false);
              else showExplorer(explorerFolders.has(explorerFolder) ? explorerFolder : '');
            } else {
              renderTabs();
              saveSession();
            }
          } else closeFixedTab(entry);
          if (!tabMenu.hidden) tabMenuFilter.focus({ preventScroll: true });
        });
        row.append(button, close);
        tabMenuList.append(row);
      }
      if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'tm-empty';
        empty.textContent = '找不到符合的分頁。';
        tabMenuList.append(empty);
      }
    }

    tabMenuButton.addEventListener('click', () => {
      if (!tabMenu.hidden) {
        closeTabMenu(true);
        return;
      }
      tabMenu.hidden = false;
      tabMenuButton.setAttribute('aria-expanded', 'true');
      tabMenuFilter.value = '';
      renderTabMenu();
      tabMenuFilter.focus();
    });
    tabMenuFilter.addEventListener('input', renderTabMenu);
    tabMenuSort.addEventListener('click', () => {
      recentTabsFirst = !recentTabsFirst;
      tabMenuSort.textContent = recentTabsFirst ? '排序：最近使用' : '排序：開啟順序';
      renderTabMenu();
    });
    tabMenu.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      closeTabMenu(true);
    });
    document.addEventListener('pointerdown', event => {
      if (!tabMenu.hidden && !tabMenu.contains(event.target) && !tabMenuButton.contains(event.target)) closeTabMenu();
    });

    // 獨立分頁拖曳排序：預覽分頁固定在最左側，不參與排序。
    let draggedViewerTab = null;
    let dropViewerTab = null;
    let dropViewerAfter = false;

    function clearViewerTabDrag() {
      tabs.querySelectorAll('.viewer-tab-dragging, .viewer-tab-drop-before, .viewer-tab-drop-after')
        .forEach(tab => tab.classList.remove('viewer-tab-dragging', 'viewer-tab-drop-before', 'viewer-tab-drop-after'));
      draggedViewerTab = null;
      dropViewerTab = null;
      dropViewerAfter = false;
    }

    tabs.addEventListener('dragstart', event => {
      const tab = event.target.closest('.viewer-fixed-tab');
      if (!tab || !tabs.contains(tab) || event.target.closest('button[aria-label^="關閉 "]')) {
        event.preventDefault();
        return;
      }
      draggedViewerTab = tab;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', tab.dataset.viewerTabPath);
      tab.classList.add('viewer-tab-dragging');
    });

    tabs.addEventListener('dragover', event => {
      if (!draggedViewerTab) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const target = event.target.closest('.viewer-fixed-tab');
      tabs.querySelectorAll('.viewer-tab-drop-before, .viewer-tab-drop-after')
        .forEach(tab => tab.classList.remove('viewer-tab-drop-before', 'viewer-tab-drop-after'));
      const fixedTabs = [...tabs.querySelectorAll('.viewer-fixed-tab')];
      dropViewerTab = target && tabs.contains(target) ? target : fixedTabs.at(-1);
      if (!dropViewerTab || dropViewerTab === draggedViewerTab) return;
      dropViewerAfter = !target || event.clientX >= dropViewerTab.getBoundingClientRect().left + dropViewerTab.offsetWidth / 2;
      dropViewerTab.classList.add(dropViewerAfter ? 'viewer-tab-drop-after' : 'viewer-tab-drop-before');
    });

    tabs.addEventListener('drop', event => {
      if (!draggedViewerTab) return;
      event.preventDefault();
      const from = draggedViewerTab.dataset.viewerTabPath;
      const to = dropViewerTab?.dataset.viewerTabPath;
      const after = dropViewerAfter;
      clearViewerTabDrag();
      if (!to || from === to) return;
      const ordered = [...pinned];
      const fromIndex = ordered.findIndex(entry => entry.path === from);
      if (fromIndex < 0) return;
      const [moved] = ordered.splice(fromIndex, 1);
      const targetIndex = ordered.findIndex(entry => entry.path === to);
      if (targetIndex < 0) return;
      ordered.splice(targetIndex + (after ? 1 : 0), 0, moved);
      pinned.clear();
      ordered.forEach(entry => pinned.add(entry));
      renderTabs();
      saveSession();
    });

    tabs.addEventListener('dragend', clearViewerTabDrag);

    function renderTabs() {
      tabs.replaceChildren();
      if (liveFile) {
        const tab = document.createElement('span');
        tab.className = 'viewer-live-tab';
        const live = document.createElement('button');
        live.type = 'button';
        live.className = 'btn';
        live.textContent = liveFile.file.name;
        live.title = liveFile.path;
        live.setAttribute('aria-pressed', String(!explorerVisible && viewingLive));
        live.addEventListener('click', () => {
          openFile(liveFile);
          revealFile(liveFile);
          preview.focus({ preventScroll: true });
        });
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn';
        close.textContent = '×';
        close.setAttribute('aria-label', '關閉預覽並回到起始畫面');
        close.addEventListener('click', () => {
          const wasActive = !explorerVisible && viewingLive && currentFile === liveFile;
          liveFile = undefined;
          if (wasActive) {
            const fallback = Array.from(pinned).at(-1);
            if (fallback) openFile(fallback, false);
            else showExplorer(explorerFolders.has(explorerFolder) ? explorerFolder : '');
          } else renderTabs();
        });
        tab.append(live, close);
        tabs.appendChild(tab);
      }
      for (const entry of pinned) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = entry.file.name;
        button.title = entry.path;
        button.setAttribute('aria-pressed', String(!explorerVisible && !viewingLive && entry === currentFile));
        button.addEventListener('click', () => {
          openFile(entry, false);
          revealFile(entry);
          preview.focus({ preventScroll: true });
        });
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn';
        close.textContent = '×';
        close.setAttribute('aria-label', '關閉 ' + entry.file.name);
        close.addEventListener('click', () => {
          closeFixedTab(entry);
          preview.focus({ preventScroll: true });
        });
        const tab = document.createElement('span');
        tab.className = 'viewer-fixed-tab';
        tab.dataset.viewerTabPath = entry.path;
        tab.draggable = true;
        tab.title = '拖曳可調整分頁順序';
        tab.append(button, close);
        tabs.appendChild(tab);
      }
      renderTabMenu();
      requestAnimationFrame(() => {
        updateTabScrollButtons();
        ensureActiveTabVisible();
      });
    }

    function pinFile(entry) {
      pinned.add(entry);
      if (liveFile === entry) liveFile = undefined;
      const opened = openFile(entry, false);
      renderTabs();
      saveSession();
      return opened;
    }

    function revealFile(entry) {
      const row = entry.button.closest('li');
      if (row.hidden || changeMode !== 'normal') {
        if (changeMode !== 'normal') { selectedChangeKinds.clear(); setChangeMode('normal'); }
        changesOnly = false;
        changeFilter.setAttribute('aria-pressed', 'false');
        filter.value = '';
        filter.dispatchEvent(new Event('input'));
      }
      for (let folder = row.closest('details'); folder; folder = folder.parentElement.closest('details')) {
        folder.open = true;
      }
      row.scrollIntoView({ block: 'nearest' });
    }

    const copySource = fileInfo.querySelector('.viewer-copy-source');
    const wrapSource = fileInfo.querySelector('.viewer-wrap-source');
    let wrapEnabled = false;
    let sourceContents;

    const findSource = fileInfo.querySelector('.viewer-find-source');
    const findBar = content.querySelector('.viewer-file-find');
    const findInput = findBar.querySelector('input');
    const findStatus = findBar.querySelector('[role="status"]');
    const findPrev = findBar.querySelector('[data-find-prev]');
    const findNext = findBar.querySelector('[data-find-next]');
    const matchLimit = 5000;
    const supportsFind = !!window.CSS?.highlights && typeof Highlight === 'function';
    let fileMatches = [];
    let fileMatchIndex = 0;
    let moreFileMatches = false;

    function selectFileMatch(index, reveal = true) {
      const count = fileMatches.length;
      findPrev.disabled = findNext.disabled = count < 2;
      fileMatchIndex = count ? (index + count) % count : 0;
      findStatus.textContent = count ? (fileMatchIndex + 1) + ' / ' + count + (moreFileMatches ? '+' : '') :
        findInput.value ? '無結果' : '';
      CSS.highlights.delete('viewer-file-current');
      if (!count) return;
      const range = fileMatches[fileMatchIndex];
      CSS.highlights.set('viewer-file-current', new Highlight(range));
      if (reveal) {
        const bounds = preview.getBoundingClientRect();
        const match = range.getBoundingClientRect();
        preview.scrollBy({
          top: match.top < bounds.top + findBar.offsetHeight || match.bottom > bounds.bottom
            ? match.top - bounds.top - preview.clientHeight / 2 : 0,
          left: match.left < bounds.left || match.right > bounds.right
            ? match.left - bounds.left - preview.clientWidth / 2 : 0
        });
      }
    }

    function updateFileFind(reveal = false, index = 0) {
      if (findBar.hidden) return;
      fileMatches = [];
      moreFileMatches = false;
      const query = findInput.value;
      const blocks = preview.querySelectorAll('.viewer-source-code, .viewer-wrapped-line > code');
      let remaining = displayedSource.replace(/\r\n?/g, '\n').length;
      if (query) {
        const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(literal, 'gi');
        for (const block of blocks) {
          if (remaining <= 0 || moreFileMatches) break;
          const text = block.textContent.slice(0, remaining);
          remaining -= text.length + 1;
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          let offset = 0;
          const nodeAt = position => {
            while (node && position > offset + node.length) {
              offset += node.length;
              node = walker.nextNode();
            }
            return node;
          };
          for (const match of text.matchAll(pattern)) {
            if (fileMatches.length === matchLimit) {
              moreFileMatches = true;
              break;
            }
            const range = document.createRange();
            const start = nodeAt(match.index);
            range.setStart(start, match.index - offset);
            const endIndex = match.index + match[0].length;
            const end = nodeAt(endIndex);
            range.setEnd(end, endIndex - offset);
            fileMatches.push(range);
          }
        }
      }
      CSS.highlights.set('viewer-file-matches', new Highlight(...fileMatches));
      selectFileMatch(Math.min(index, Math.max(0, fileMatches.length - 1)), reveal);
    }

    function closeFileFind(restoreFocus = false) {
      if (findBar.hidden) return;
      findBar.hidden = true;
      fileMatches = [];
      CSS.highlights.delete('viewer-file-matches');
      CSS.highlights.delete('viewer-file-current');
      if (restoreFocus) preview.focus({ preventScroll: true });
    }

    function openFileFind() {
      if (findSource.hidden) return;
      if (preview.hidden) formatButton.click();
      if (preview.hidden) return;
      const selection = window.getSelection();
      if (!selection.isCollapsed && preview.contains(selection.anchorNode) && preview.contains(selection.focusNode)) {
        const text = selection.toString();
        if (!/[\r\n]/.test(text)) findInput.value = text;
      }
      findBar.hidden = false;
      findInput.focus();
      findInput.select();
      updateFileFind(true);
    }

    findSource.addEventListener('click', openFileFind);
    findInput.addEventListener('input', () => updateFileFind(true));
    findPrev.addEventListener('click', () => selectFileMatch(fileMatchIndex - 1));
    findNext.addEventListener('click', () => selectFileMatch(fileMatchIndex + 1));
    findBar.querySelector('[data-find-close]').addEventListener('click', () => closeFileFind(true));
    findBar.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeFileFind(true);
      } else if (event.target === findInput && event.key === 'Enter') {
        event.preventDefault();
        selectFileMatch(fileMatchIndex + (event.shiftKey ? -1 : 1));
      }
    });

    function renderSourceLayout() {
      if (!sourceContents) return;
      const canWrap = sourceLineCount <= 20000;
      wrapSource.disabled = !canWrap;
      wrapSource.title = canWrap ? '' : '超過 20,000 行時保留橫向捲動。';
      const wrap = wrapEnabled && canWrap;
      wrapSource.setAttribute('aria-pressed', String(wrap));
      preview.classList.toggle('viewer-wrapped', wrap);
      if (!wrap) {
        preview.replaceChildren(sourceContents);
        selectSourceLine(sourceLine, true);
        updateFileFind(false, fileMatchIndex);
        return;
      }
      const code = sourceContents.querySelector('.viewer-source-code');
      const rows = document.createDocumentFragment();
      let column;
      let index = 0;
      function addRow() {
        const row = document.createElement('span');
        row.className = 'viewer-wrapped-line';
        row.dataset.index = String(index);
        const number = document.createElement('span');
        number.className = 'viewer-wrapped-number';
        number.setAttribute('aria-hidden', 'true');
        if (index < sourceLineCount) number.textContent = String(index + 1);
        column = document.createElement('code');
        row.append(number, column);
        rows.append(row);
        index++;
      }
      addRow();
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const classes = [];
        for (let parent = node.parentElement; parent && parent !== code; parent = parent.parentElement) {
          if (parent.className) classes.unshift(parent.className);
        }
        const parts = node.data.split('\n');
        for (const [partIndex, text] of parts.entries()) {
          if (partIndex) addRow();
          if (!text) continue;
          let target = column;
          for (const className of classes) {
            const token = document.createElement('span');
            token.className = className;
            target.append(token);
            target = token;
          }
          target.append(text);
        }
      }
      preview.replaceChildren(rows);
      selectSourceLine(sourceLine, true);
      updateFileFind(false, fileMatchIndex);
    }

    wrapSource.addEventListener('click', () => {
      wrapEnabled = !wrapEnabled;
      if (!formatted.hidden) formatButton.click();
      renderSourceLayout();
    });
    const fontTools = fileInfo.querySelector('.viewer-font-tools');
    let displayedSource = '';
    let sourceFontSize = 0;
    copySource.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(displayedSource);
        showToast('已複製內容。');
      } catch {
        showToast('無法複製內容。');
      }
    });
    for (const [index, button] of [...fontTools.querySelectorAll('button')].entries()) {
      button.addEventListener('click', () => {
        const size = sourceFontSize || parseFloat(getComputedStyle(preview).fontSize);
        sourceFontSize = Math.max(9, Math.min(32, size + (index ? 1 : -1)));
        preview.style.fontSize = sourceFontSize + 'px';
        selectSourceLine(sourceLine, true);
      });
    }

    const encodingPicker = content.querySelector('.viewer-encoding');
    const formatButton = content.querySelector('.viewer-text-mode');
    const goLine = content.querySelector('.viewer-go-line');
    const goLineInput = goLine.querySelector('input');
    const goLineHint = goLine.querySelector('.viewer-go-line-hint');
    window.addEventListener('keydown', event => {
      if (window.viewMode !== 'viewer' || workspace.hidden || !sourceLineCount ||
          !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey ||
          event.key.toLowerCase() !== 'g' || content.querySelector('dialog[open]')) return;
      event.preventDefault();
      goLineInput.value = '';
      goLineHint.textContent = '輸入行號（可加欄位，例如 120:8） · 這個檔案共 ' +
        sourceLineCount + ' 行 · Enter 跳轉 · Esc 取消';
      goLine.showModal();
      goLineInput.focus();
    });

    goLine.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const target = /^(\d+)(?::(\d+))?$/.exec(goLineInput.value.trim());
      const line = Number(target?.[1]);
      const column = Number(target?.[2] ?? 1);
      if (!target || line < 1 || line > sourceLineCount || !Number.isSafeInteger(column) || column < 1) {
        goLineHint.textContent = '請輸入 1 到 ' + sourceLineCount + ' 的行號，欄位從 1 開始。';
        return;
      }
      goLine.close();
      if (!formatted.hidden) formatButton.click();
      if (preview.hidden) return;
      preview.focus({ preventScroll: true });
      selectSourceLine(line - 1, true, true);
      const highlight = preview.querySelector('.viewer-wrapped-line.current, .viewer-current-line');
      if (highlight && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        highlight.getAnimations().filter(animation => animation.id === 'viewer-line-flash')
          .forEach(animation => animation.cancel());
        const flash = highlight.animate([
          { backgroundColor: 'color-mix(in srgb, var(--accent) 55%, transparent)' },
          { backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)' },
        ], { duration: 550, iterations: 2 });
        flash.id = 'viewer-line-flash';
      }
      if (!target[2]) return;
      const wrapped = preview.classList.contains('viewer-wrapped');
      const code = wrapped ? preview.children[line - 1]?.querySelector('code') : preview.querySelector('.viewer-source-code');
      if (!code) return;
      const rows = displayedSource.split(/\r\n|\r|\n/);
      let offset = Math.min(column - 1, rows[line - 1]?.length || 0);
      if (!wrapped) {
        for (let i = 0; i < line - 1; i++) offset += rows[i].length + 1;
      }
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (offset > node.length) {
          offset -= node.length;
          continue;
        }
        const range = document.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        const position = range.getBoundingClientRect();
        const bounds = preview.getBoundingClientRect();
        const gutter = preview.querySelector('.viewer-line-numbers')?.offsetWidth || 0;
        const right = bounds.left + preview.clientWidth;
        const bottom = bounds.top + preview.clientHeight;
        if (position.left < bounds.left + gutter) preview.scrollLeft -= bounds.left + gutter - position.left;
        else if (position.right > right) preview.scrollLeft += position.right - right + 8;
        if (position.top < bounds.top) preview.scrollTop -= bounds.top - position.top;
        else if (position.bottom > bottom) preview.scrollTop += position.bottom - bottom;
        break;
      }
    });

    const formatted = content.querySelector('.viewer-formatted');
    // 搜尋面板上緣拖曳：調整搜尋與預覽／檔案總管的高度比例。
    const searchResizer = content.querySelector('.viewer-search-resizer');
    const searchHeightKey = 'site-viewer-search-height';
    const searchPreview = content.querySelector('.viewer-preview');
    const savedSearchHeight = readSessionValue(searchHeightKey);
    if (Number.isFinite(savedSearchHeight) && savedSearchHeight > 0) {
      searchPanelHeight(savedSearchHeight);
    }
    function searchPanelHeight(height) {
      const available = searchPreview.clientHeight;
      if (!available) return;
      const min = Math.min(120, available * .45);
      const max = Math.max(min, available - Math.min(120, available * .45));
      const size = Math.round(Math.max(min, Math.min(max, height)));
      const panel = content.querySelector('.viewer-search');
      panel.style.flex = `0 0 ${size}px`;
      searchResizer.setAttribute('aria-valuemin', String(Math.round(min)));
      searchResizer.setAttribute('aria-valuemax', String(Math.round(max)));
      searchResizer.setAttribute('aria-valuenow', String(size));
      writeSessionValue(searchHeightKey, size);
    }
    // 使用拖曳起點的面板高度與滑鼠位移，避免第一次移動時跳到游標位置。
    let searchResizeStart = null;
    searchResizer.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const panel = content.querySelector('.viewer-search');
      searchResizeStart = {
        pointerId: event.pointerId,
        y: event.clientY,
        height: panel.getBoundingClientRect().height
      };
      searchResizer.setPointerCapture(event.pointerId);
    });
    searchResizer.addEventListener('pointermove', event => {
      if (!searchResizeStart || event.pointerId !== searchResizeStart.pointerId ||
          !searchResizer.hasPointerCapture(event.pointerId)) return;
      const delta = searchResizeStart.y - event.clientY;
      if (Math.abs(delta) < 1) return;
      searchPanelHeight(searchResizeStart.height + delta);
    });
    const stopSearchResize = event => {
      if (searchResizeStart?.pointerId === event.pointerId) searchResizeStart = null;
    };
    searchResizer.addEventListener('pointerup', stopSearchResize);
    searchResizer.addEventListener('pointercancel', stopSearchResize);
    searchResizer.addEventListener('lostpointercapture', stopSearchResize);
    searchResizer.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const panel = content.querySelector('.viewer-search');
      searchPanelHeight(panel.getBoundingClientRect().height + (event.key === 'ArrowUp' ? 20 : -20));
    });
    const searchPanel = content.querySelector('.viewer-search');
    const searchForm = searchPanel.querySelector('form');
    const searchInput = searchForm.querySelector('input');
    const searchStatus = searchPanel.querySelector('[role="status"]');
    const searchResults = searchPanel.querySelector('.viewer-search-results');
    const searchHint = searchResults.firstElementChild.cloneNode(true);
    // 搜尋紀錄只在明確提交時寫入，不記錄即時輸入的中間字串。
    const searchHistoryKey = 'site-viewer-search-history';
    const searchHistoryPanel = searchPanel.querySelector('.viewer-search-history');
    const searchHistoryToggle = searchPanel.querySelector('.viewer-search-history-toggle');
    const searchHistoryList = searchPanel.querySelector('.viewer-search-history-list');
    const searchHistoryCount = searchPanel.querySelector('.viewer-search-history-count');
    const searchHistoryClear = searchPanel.querySelector('.viewer-search-history-clear');
    let searchHistory = [];
    try {
      const stored = JSON.parse(localStorage.getItem(searchHistoryKey) || '[]');
      if (Array.isArray(stored)) searchHistory = [...new Set(stored.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))].slice(0, 100);
    } catch (error) { console.warn('無法讀取搜尋紀錄:', error); }
    const searchHistoryStyle = document.createElement('style');
    searchHistoryStyle.textContent = `
      #siteViewer .viewer-search-query { position:relative; }
      #siteViewer .viewer-search-history { border:1px solid var(--border, #8296a8); border-radius:7px; margin:5px 0 8px; padding:8px; background:var(--panel, var(--bg, #222)); color:inherit; max-height:240px; overflow:auto; }
      #siteViewer .viewer-search-history[hidden] { display:none !important; }
      #siteViewer .viewer-search-history-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px; }
      #siteViewer .viewer-search-history-list { display:flex; flex-direction:column; gap:2px; }
      #siteViewer .viewer-search-history-item { display:flex; align-items:center; gap:5px; min-width:0; }
      #siteViewer .viewer-search-history-pick { flex:1; min-width:0; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #siteViewer .viewer-search-history-remove { flex:none; }
      #siteViewer .viewer-search-history-empty { padding:8px; opacity:.7; }
    `;
    content.append(searchHistoryStyle);
    function saveSearchHistory() {
      try { localStorage.setItem(searchHistoryKey, JSON.stringify(searchHistory)); }
      catch (error) { console.warn('無法儲存搜尋紀錄:', error); }
    }
    function renderSearchHistory() {
      searchHistoryCount.textContent = `(${searchHistory.length}/100)`;
      searchHistoryClear.disabled = !searchHistory.length;
      searchHistoryList.replaceChildren();
      if (!searchHistory.length) {
        const empty = document.createElement('div');
        empty.className = 'viewer-search-history-empty';
        empty.textContent = '尚無搜尋紀錄';
        searchHistoryList.append(empty);
        return;
      }
      for (const keyword of searchHistory) {
        const row = document.createElement('div');
        row.className = 'viewer-search-history-item';
        const pick = document.createElement('button');
        pick.type = 'button'; pick.className = 'btn viewer-search-history-pick';
        pick.textContent = keyword; pick.title = keyword;
        pick.addEventListener('click', () => {
          searchInput.value = keyword;
          rememberSearchKeyword(keyword);
          closeSearchHistory();
          submitSearch();
          searchInput.focus();
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'btn viewer-search-history-remove';
        remove.textContent = '×'; remove.title = '刪除此筆';
        remove.setAttribute('aria-label', '刪除搜尋紀錄：' + keyword);
        remove.addEventListener('click', () => {
          searchHistory = searchHistory.filter(item => item !== keyword);
          saveSearchHistory(); renderSearchHistory();
        });
        row.append(pick, remove);
        searchHistoryList.append(row);
      }
    }
    function rememberSearchKeyword(value) {
      const keyword = String(value || '').trim();
      if (!keyword) return;
      searchHistory = [keyword, ...searchHistory.filter(item => item !== keyword)].slice(0, 100);
      saveSearchHistory(); renderSearchHistory();
    }
    function closeSearchHistory() {
      searchHistoryPanel.hidden = true;
      searchHistoryToggle.setAttribute('aria-expanded', 'false');
    }
    searchHistoryToggle.addEventListener('click', () => {
      searchHistoryPanel.hidden = !searchHistoryPanel.hidden;
      searchHistoryToggle.setAttribute('aria-expanded', String(!searchHistoryPanel.hidden));
      if (!searchHistoryPanel.hidden) renderSearchHistory();
    });
    searchHistoryClear.addEventListener('click', () => {
      if (!searchHistory.length || !confirm('確定清除全部搜尋紀錄？')) return;
      searchHistory = []; saveSearchHistory(); renderSearchHistory();
    });
    searchPanel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !searchHistoryPanel.hidden) {
        event.preventDefault(); event.stopPropagation(); closeSearchHistory(); searchInput.focus();
      }
    });
    document.addEventListener('pointerdown', event => {
      if (!searchHistoryPanel.hidden && !searchHistoryPanel.contains(event.target) && !searchHistoryToggle.contains(event.target)) closeSearchHistory();
    });
    renderSearchHistory();

    function preferredEncoding(entry) {
      return previewPreferences.get(entry.path)?.encoding || '';
    }
    let renderTextVersion = 0;
    let activeMedia;
    let continuingMedia;
    let continuingEntry;
    let continuingAsked = false;
    const playing = content.querySelector('.viewer-playing');
    const mini = document.createElement('div');
    mini.className = 'viewer-mini';
    mini.hidden = true;
    content.append(mini);

    const miniTime = seconds => {
      if (!Number.isFinite(seconds)) return '0:00';
      const value = Math.max(0, Math.floor(seconds));
      return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
    };

    function stopContinuingMedia() {
      if (!continuingMedia) return;
      continuingMedia.miniCleanup?.();
      continuingMedia.dispose();
      continuingMedia.node.remove();
      continuingMedia = undefined;
      continuingEntry = undefined;
      mini.hidden = true;
      mini.replaceChildren();
      playing.hidden = true;
    }
    playing.querySelector('button').addEventListener('click', stopContinuingMedia);

    function renderMini(ask) {
      if (!continuingMedia) return;
      const media = continuingMedia;
      const element = media.node.matches?.('video, audio') ? media.node : media.node.querySelector?.('video, audio');
      const name = continuingEntry?.file?.name || '媒體';
      mini.replaceChildren();
      mini.hidden = false;
      mini.classList.toggle('asking', ask);
      const head = document.createElement('div');
      head.className = 'viewer-mini-head';
      const title = document.createElement('strong');
      title.className = 'viewer-mini-title';
      title.textContent = '♪ ' + name;
      const back = document.createElement('button');
      back.className = 'btn'; back.type = 'button'; back.textContent = '回到這個檔案';
      back.addEventListener('click', () => {
        if (continuingEntry) openFile(continuingEntry, false);
      });
      const close = document.createElement('button');
      close.className = 'btn'; close.type = 'button'; close.textContent = '✕';
      close.title = '停止並關閉';
      close.addEventListener('click', stopContinuingMedia);
      head.append(title, back, close);
      mini.append(head);
      if (ask) {
        const question = document.createElement('div');
        question.className = 'viewer-mini-question';
        const prompt = document.createElement('div');
        prompt.textContent = '「' + name + '」正在播放。切換到其他檔案後，要怎麼處理？';
        const buttons = document.createElement('div');
        buttons.className = 'viewer-mini-actions';
        for (const [label, action, primary] of [
          ['繼續播放', () => {}, true],
          ['暫停', () => { media.pause(); continuingAsked = false; }, false],
          ['停止', stopContinuingMedia, false],
        ]) {
          const button = document.createElement('button');
          button.className = primary ? 'btn primary' : 'btn';
          button.type = 'button'; button.textContent = label;
          button.addEventListener('click', () => {
            action();
            if (continuingMedia === media) {
              question.remove(); mini.classList.remove('asking');
            }
          });
          buttons.append(button);
        }
        question.append(prompt, buttons);
        mini.append(question);
      }
      if (element?.tagName === 'VIDEO') {
        const stage = document.createElement('div');
        stage.className = 'viewer-mini-video';
        stage.append(media.node);
        mini.append(stage);
      } else if (element) {
        // 音訊不需重複顯示原生控制列，仍要保留在 DOM 中。
        const host = document.createElement('div');
        host.hidden = true;
        host.append(media.node);
        mini.append(host);
      }
      const bar = document.createElement('div');
      bar.className = 'viewer-mini-bar';
      const play = document.createElement('button');
      play.className = 'btn'; play.type = 'button';
      const seek = document.createElement('input');
      seek.type = 'range'; seek.min = '0'; seek.max = '1000'; seek.value = '0';
      seek.setAttribute('aria-label', '播放進度');
      const time = document.createElement('span');
      time.className = 'viewer-mini-time';
      const volume = document.createElement('input');
      volume.type = 'range'; volume.min = '0'; volume.max = '100';
      volume.value = String(Math.round((element?.volume ?? 1) * 100));
      volume.setAttribute('aria-label', '音量');
      const paint = () => {
        if (continuingMedia !== media || !element) return;
        play.textContent = element.paused || element.ended ? '▶' : '⏸';
        const duration = Number.isFinite(element.duration) ? element.duration : 0;
        time.textContent = miniTime(element.currentTime) + (duration ? ' / ' + miniTime(duration) : '');
        if (document.activeElement !== seek) seek.value = duration ? String(Math.round(element.currentTime / duration * 1000)) : '0';
      };
      play.addEventListener('click', () => {
        if (element.paused || element.ended) media.resume(); else media.pause();
        paint();
      });
      seek.addEventListener('input', () => {
        if (Number.isFinite(element.duration) && element.duration > 0)
          element.currentTime = Number(seek.value) / 1000 * element.duration;
      });
      volume.addEventListener('input', () => {
        element.muted = false; element.volume = Number(volume.value) / 100;
      });
      // 綁定於播放器生命週期；重建小視窗時清理上一組監聽。
      media.miniCleanup?.();
      const controller = new AbortController();
      for (const event of ['play', 'pause', 'ended', 'timeupdate', 'durationchange'])
        element?.addEventListener(event, paint, { signal: controller.signal });
      media.miniCleanup = () => controller.abort();
      bar.append(play, seek, time, volume);
      mini.append(bar);
      paint();
    }

    function leavePlayingFile() {
      if (!activeMedia?.isPlaying?.()) return;
      stopContinuingMedia();
      continuingMedia = activeMedia;
      continuingEntry = currentFile;
      activeMedia = undefined;
      const ask = !continuingAsked;
      continuingAsked = true;
      renderMini(ask);
    }
    let searchVersion = 0;
    let searchTimer;

    encodingPicker.add(new Option('自動偵測', ''));
    if (typeof viewerText !== 'undefined') {
      for (const [value, label] of viewerText.encodings) encodingPicker.add(new Option(label, value));
    }

    function closeSearch() {
      clearTimeout(searchTimer);
      searchPanel.hidden = true;
      searchVersion++;
    }

    function openSearch() {
      searchPanel.hidden = false;
      searchInput.focus();
      searchInput.select();
    }
    // Toolbar 子插件透過事件呼叫現有搜尋介面，不重複實作搜尋功能。
    content.addEventListener('viewer-open-search', () => {
      if (searchPanel.hidden) openSearch();
      else closeSearch();
    });
    searchPanel.querySelector('[data-close-search]').addEventListener('click', () => {
      closeSearch();
      (currentFile ? (formatted.hidden ? preview : formatted) : filter).focus();
    });
    searchPanel.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      closeSearch();
      (currentFile ? (formatted.hidden ? preview : formatted) : filter).focus();
    });
    window.addEventListener('keydown', event => {
      if (window.viewMode !== 'viewer' || workspace.hidden || event.altKey ||
          !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'f' ||
          content.querySelector('dialog[open]')) return;
      event.preventDefault();
      if (event.shiftKey) {
        openFileFind();
        return;
      }
      openSearch();
    });

    function appendSearchText(node, text, ranges) {
      let offset = 0;
      for (const [start, end, fuzzy] of ranges) {
        node.append(text.slice(offset, start));
        const mark = document.createElement('mark');
        if (fuzzy) mark.className = 'viewer-fuzzy-hit';
        mark.textContent = text.slice(start, end);
        node.append(mark);
        offset = end;
      }
      node.append(text.slice(offset));
    }

    let searchJumpVersion = 0;
    async function jumpToSearchLine(entry, index, pin = false) {
      const version = ++searchJumpVersion;
      revealFile(entry);
      await (pin ? pinFile(entry) : openFile(entry));
      if (version !== searchJumpVersion || currentFile !== entry) return;
      if (mediaType(entry.file) === 'image/svg+xml' || entry.file.size > 1024 * 1024) {
        encodingPicker.hidden = false;
        rememberPreview(entry, { mode: 'source' });
        await renderText(entry, previewVersion, false, 8 * 1024 * 1024);
        if (version !== searchJumpVersion || currentFile !== entry) return;
      } else if (!formatted.hidden) {
        formatButton.click();
      }
      preview.focus({ preventScroll: true });
      selectSourceLine(index, true, true);
    }

    function appendSearchFile(entry, lines, scan, context, expanded) {
      const group = document.createElement('details');
      group.open = expanded;
      const summary = document.createElement('summary');
      const name = document.createElement('span');
      const total = document.createElement('span');
      name.textContent = entry.path;
      total.textContent = scan.hits.length + (scan.truncated ? '+' : '') + ' 處';
      summary.append(name, total);
      group.append(summary);
      const rowIndexes = new Set();
      for (const { line } of scan.hits.slice(0, 60)) {
        for (let i = Math.max(0, line - context); i <= Math.min(lines.length - 1, line + context); i++) rowIndexes.add(i);
      }
      // 僅在點選後，框住「被點選行 ± 上下文」，而不是預先框住所有命中區塊。
      const rows = new Map();
      function selectContext(index) {
        searchResults.querySelectorAll('.viewer-search-row.is-context-selected').forEach(node => {
          node.classList.remove('is-context-selected', 'is-context-first', 'is-context-last');
        });
        const start = Math.max(0, index - context);
        const end = Math.min(lines.length - 1, index + context);
        const selected = [];
        for (let i = start; i <= end; i++) {
          const row = rows.get(i);
          if (row) { row.classList.add('is-context-selected'); selected.push(row); }
        }
        if (selected.length) {
          selected[0].classList.add('is-context-first');
          selected[selected.length - 1].classList.add('is-context-last');
        }
      }
      for (const index of [...rowIndexes].sort((a, b) => a - b)) {
        const hit = scan.hmap.get(index);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'viewer-search-row';
        row.classList.toggle('viewer-search-hit', !!hit);
        const number = document.createElement('span');
        number.textContent = index + 1;
        const code = document.createElement('code');
        appendSearchText(code, lines[index], hit?.ranges || []);
        row.append(number, code);
        rows.set(index, row);
        row.addEventListener('click', event => {
          selectContext(index);
          if (event.detail <= 1) jumpToSearchLine(entry, index);
        });
        row.addEventListener('dblclick', event => {
          event.preventDefault();
          jumpToSearchLine(entry, index, true);
        });
        group.append(row);
      }
      if (scan.hits.length > 60) {
        const note = document.createElement('p');
        note.textContent = '顯示前 60 處命中與上下文。';
        group.append(note);
      }
      searchResults.append(group);
    }

    async function runSearch() {
      if (typeof viewerText === 'undefined' || typeof viewerText.scanText !== 'function') {
        searchStatus.textContent = '全文搜尋元件未載入，請重新載入頁面。';
        return;
      }
      const terms = viewerText.parseQuery(searchInput.value);
      if (!terms.length) {
        searchStatus.textContent = '';
        searchResults.replaceChildren(searchHint.cloneNode(true));
        return;
      }
      const options = new FormData(searchForm);
      const matcher = viewerText.makeMatcher(terms, { cs: options.has('caseSensitive'), fuzzy: options.has('fuzzy') });
      const requireAll = options.get('mode') === 'all';
      const context = Number(options.get('context'));
      const version = ++searchVersion;
      const files = treeEntries;
      const startTime = performance.now();
      searchStatus.textContent = '搜尋中…';
      searchResults.replaceChildren();
      let matchedFiles = 0;
      let count = 0;
      let skipped = 0;
      const maxBytes = 8 * 1024 * 1024;
      for (const entry of files.values()) {
        const type = mediaType(entry.file);
        if (type && type !== 'text/html' && type !== 'image/svg+xml') continue;
        if (entry.file.size > maxBytes) {
          skipped++;
          continue;
        }
        let result;
        try {
          result = await viewerText.read(entry.file, maxBytes, preferredEncoding(entry));
        } catch {
          skipped++;
        }
        if (version !== searchVersion || files !== treeEntries) return;
        if (!result) continue;
        const lines = result.text.split(/\r\n|\r|\n/);
        const scan = viewerText.scanText(lines, matcher, 3000 - count);
        if (!scan.hits.length || (requireAll && scan.termSet.size !== terms.length)) continue;
        appendSearchFile(entry, lines, scan, context, matchedFiles < 25);
        matchedFiles++;
        count += scan.hits.length;
        if (count === 3000) break;
      }
      const time = ((performance.now() - startTime) / 1000).toFixed(2);
      searchStatus.textContent = '找到 ' + matchedFiles + ' 個檔案、' + count + (count === 3000 ? '+' : '') + ' 行 · ' + time + ' 秒';
      if (skipped) searchStatus.textContent += ' · 略過 ' + skipped + ' 個檔案';
      if (!matchedFiles) searchResults.textContent = '找不到符合的內容。';
    }
    let searchHistoryIdleTimer;
    function scheduleSearchHistory() {
      clearTimeout(searchHistoryIdleTimer);
      searchHistoryIdleTimer = setTimeout(() => {
        if (searchInput.value.trim()) rememberSearchKeyword(searchInput.value);
      }, 1000);
    }
    searchInput.addEventListener('input', event => {
      if (event.isComposing) return;
      clearTimeout(searchTimer);
      searchVersion++;
      searchTimer = setTimeout(submitSearch, 180);
      scheduleSearchHistory();
    });
    searchInput.addEventListener('compositionend', () => {
      clearTimeout(searchTimer);
      searchVersion++;
      searchTimer = setTimeout(submitSearch, 180);
      scheduleSearchHistory();
    });
    searchInput.addEventListener('blur', () => {
      if (!searchHistoryIdleTimer) return;
      clearTimeout(searchHistoryIdleTimer);
      searchHistoryIdleTimer = null;
      if (searchInput.value.trim()) rememberSearchKeyword(searchInput.value);
    });
    searchForm.addEventListener('submit', event => {
      event.preventDefault();
      clearTimeout(searchHistoryIdleTimer);
      searchHistoryIdleTimer = null;
      rememberSearchKeyword(searchInput.value);
      closeSearchHistory();
      submitSearch();
    });
    searchForm.addEventListener('change', event => {
      if (event.target !== searchInput && searchInput.value.trim()) submitSearch();
    });

    function submitSearch() {
      clearTimeout(searchTimer);
      runSearch().catch(error => {
        searchStatus.textContent = '搜尋失敗，請重新搜尋。';
        console.warn('檔案全文搜尋失敗:', error);
      });
    }

    function renderJson(node, value, label) {
      if (value === null || typeof value !== 'object') {
        const line = document.createElement('div');
        line.textContent = label + ': ' + JSON.stringify(value);
        node.append(line);
        return;
      }
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      const children = Object.entries(value);
      summary.textContent = label + ' (' + children.length + ')';
      details.append(summary);
      details.addEventListener('toggle', () => {
        if (!details.open || details.childElementCount > 1) return;
        const branch = document.createElement('div');
        for (const [key, item] of children.slice(0, 2000)) renderJson(branch, item, key);
        if (children.length > 2000) branch.append('只顯示前 2000 個項目。');
        details.append(branch);
      });
      node.append(details);
      if (node === formatted) details.open = true;
    }

    function renderTable(text, extension) {
      const rows = viewerText.csvParse(text, extension === 'tsv' ? '\t' : viewerText.csvDetect(text));
      const [header, ...body] = rows.slice(0, 2001);
      if (!header) return;
      const table = document.createElement('table');
      const filter = document.createElement('input');
      filter.type = 'search';
      filter.setAttribute('aria-label', '篩選表格');
      filter.placeholder = '篩選表格';
      const headings = table.createTHead().insertRow();
      const tbody = table.createTBody();
      let sortColumn = -1;
      let direction = 1;
      const collator = new Intl.Collator(undefined, { numeric: true });
      function updateRows() {
        const query = filter.value.toLowerCase();
        const visible = body.filter(row => row.some(value => value.toLowerCase().includes(query)));
        if (sortColumn >= 0) visible.sort((a, b) => direction * collator.compare(a[sortColumn] || '', b[sortColumn] || ''));
        tbody.replaceChildren();
        for (const row of visible) {
          const tr = tbody.insertRow();
          for (const value of row) tr.insertCell().textContent = value;
        }
      }
      for (const [index, name] of header.entries()) {
        const th = document.createElement('th');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = name || '欄 ' + (index + 1);
        button.addEventListener('click', () => {
          direction = sortColumn === index ? -direction : 1;
          sortColumn = index;
          for (const cell of headings.cells) cell.removeAttribute('aria-sort');
          th.setAttribute('aria-sort', direction === 1 ? 'ascending' : 'descending');
          updateRows();
        });
        th.append(button);
        headings.append(th);
      }
      filter.addEventListener('input', updateRows);
      formatted.append(filter, table);
      if (rows.length > 2001) formatted.append('只顯示前 2000 筆資料。');
      updateRows();
    }

    function renderLog(text) {
      const filter = document.createElement('select');
      filter.setAttribute('aria-label', '日誌等級');
      for (const level of ['全部', 'ERROR', 'WARN', 'INFO', 'DEBUG', '其他']) filter.add(new Option(level));
      const output = document.createElement('pre');
      const sourceLines = text.split(/\r\n|\r|\n/);
      const lines = sourceLines.slice(0, 10000).map(line => {
        const level = /\b(FATAL|CRITICAL|ERROR|ERR|WARNING|WARN|INFO|DEBUG|TRACE)\b/i.exec(line)?.[1].toUpperCase();
        const label = { FATAL: 'ERROR', CRITICAL: 'ERROR', ERR: 'ERROR', WARNING: 'WARN', TRACE: 'DEBUG' }[level] || level || '其他';
        return { line, label };
      });
      function update() {
        const fragment = document.createDocumentFragment();
        for (const { line, label } of lines) {
          if (filter.value !== '全部' && filter.value !== label) continue;
          const row = document.createElement('span');
          row.dataset.level = label;
          row.textContent = line + '\n';
          fragment.append(row);
        }
        output.replaceChildren(fragment);
      }
      filter.addEventListener('change', update);
      formatted.append(filter, output);
      if (sourceLines.length > 10000) formatted.append('只顯示前 10,000 行。');
      update();
    }

    function showPreviewMessage(message) {
      closeFileFind();
      findSource.hidden = true;
      sourceLineCount = 0;
      displayedSource = '';
      sourceContents = undefined;
      preview.classList.remove('viewer-wrapped');
      copySource.hidden = true;
      wrapSource.hidden = true;
      fontTools.hidden = true;
      preview.classList.remove('viewer-numbered');
      preview.textContent = message;
    }

    function showNumberedSource(text, suffix, lines) {
      sourceLineCount = lines;
      sourceLine = 0;

      const gutter = document.createElement('span');
      gutter.className = 'viewer-line-numbers';
      gutter.setAttribute('aria-hidden', 'true');
      gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
      const code = document.createElement('code');
      code.className = 'viewer-source-code';
      code.textContent = text + suffix;
      const row = document.createElement('span');
      row.className = 'viewer-current-line';
      row.setAttribute('aria-hidden', 'true');
      row.hidden = !lines;
      const column = document.createElement('span');
      column.className = 'viewer-code-column';
      column.append(code, row);
      const contents = document.createElement('span');
      contents.className = 'viewer-code-contents';
      contents.append(gutter, column);
      preview.classList.add('viewer-numbered');
      sourceContents = contents;
      renderSourceLayout();
      return code;
    }

    function showSource() {
      activeMedia?.dispose();
      activeMedia = undefined;
      pdfOpenButton.hidden = true;
      pdfOpenButton.onclick = null;
      formatted.classList.remove('viewer-media-preview');
      formatted.hidden = true;
      formatted.replaceChildren();
      preview.hidden = false;
      formatButton.textContent = '格式化檢視';
    }

    function mediaType(file) {
      return typeof viewerMedia === 'undefined' ? '' : viewerMedia.typeOf(file);
    }

    function resolveHtmlFile(path, reference) {
      if (!reference || /^(?:[a-z][a-z\d+.-]*:|[\\/]{2}|#)/i.test(reference.trim())) return null;
      try {
        const root = path.split('/')[0];
        const base = 'https://viewer.invalid/' + path.split('/').map(encodeURIComponent).join('/');
        const relative = reference.trim().replace(/\\/g, '/');
        const url = new URL(relative.startsWith('/') ? '/' + encodeURIComponent(root) + relative : relative, base);
        if (url.origin !== 'https://viewer.invalid') return null;
        const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);
        if (parts[0] !== root || parts.some(part => /[\\/]/.test(part))) return null;
        return treeEntries.get(parts.join('/'))?.file;
      } catch {
        return null;
      }
    }

    async function renderMedia(file, type, valid) {
      const path = currentFile.path;
      const media = await viewerMedia.create(file, type, message => {
        if (valid() && !formatted.hidden && formatted.contains(media.node)) showStatus(message);
      }, reference => resolveHtmlFile(path, reference), (width, height) => {
        if (!valid()) return;
        const [, label] = fileType(file.name);
        fileMeta.textContent = label + ' · ' + width + ' × ' + height + ' · ' + formatFileSize(file.size);
      }, { path, files: [...treeEntries.keys()], getFile: async name => treeEntries.get(name)?.file });
      if (!valid()) {
        media.dispose();
        return;
      }
      activeMedia = media;
      // PDF 備用開啟按鈕固定顯示在檔案資訊列、檔案類型與大小之前。
      if (type === 'application/pdf') {
        pdfOpenButton.hidden = false;
        pdfOpenButton.onclick = () => {
          // 獨立 URL 避免切換預覽時 dispose() 撤銷 iframe 的 URL，連帶中斷新分頁。
          const tabUrl = URL.createObjectURL(file);
          pdfTabUrls.add(tabUrl);
          const tab = window.open(tabUrl, '_blank', 'noopener,noreferrer');
          if (!tab) {
            // 無法判斷 noopener 回傳 null 是否代表攔截，故不提前撤銷 URL。
            console.info('若瀏覽器未開啟 PDF，請允許此網站開啟新分頁。');
          }
        };
      }
      formatted.replaceChildren(media.node);
      formatted.classList.add('viewer-media-preview');
      const hadPreviewFocus = document.activeElement === preview;
      formatted.hidden = false;
      preview.hidden = true;
      // 原本焦點在文字預覽時，切換媒體後移交到媒體容器；目錄操作不搶焦點。
      if (hadPreviewFocus) formatted.focus({ preventScroll: true });
    }

    async function renderText(entry, version, showFormatted, limit = 1024 * 1024) {
      const renderVersion = ++renderTextVersion;
      const valid = () => version === previewVersion && renderVersion === renderTextVersion;
      showSource();
      formatButton.hidden = true;
      const result = await viewerText.read(entry.file, limit, preferredEncoding(entry));
      if (!valid()) return;
      if (!result) {
        showPreviewMessage('此檔案尚未支援預覽。');
        return;
      }
      const { text, encoding, guessed } = result;
      displayedSource = text;
      copySource.hidden = false;
      findSource.hidden = !supportsFind;
      wrapSource.hidden = false;
      fontTools.hidden = false;
      encodingPicker.hidden = encoding === 'utf-8' && !guessed && !preferredEncoding(entry);
      const truncated = entry.file.size > limit;
      const suffix = truncated ? '\n\n（只顯示前 1 MB）' : '';
      const extension = entry.file.name.toLowerCase().split('.').at(-1);
      const [, type] = fileType(entry.file.name);
      const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
      const lineCount = lines - (/\r\n$|[\r\n]$/.test(text) ? 1 : 0);
      fileMeta.textContent = [type, truncated ? '前 1 MB' : lineCount + ' 行', formatFileSize(entry.file.size), encoding.toUpperCase() + (guessed ? '（偵測）' : '')].join(' · ');
      const sourceCode = showNumberedSource(text.replace(/\r\n?/g, '\n'), suffix, lines);
      const typeOfPreview = mediaType(entry.file);
      const html = typeOfPreview === 'text/html';
      const svg = typeOfPreview === 'image/svg+xml';
      formatButton.hidden = html ? entry.file.size > 10 * 1024 * 1024 :
        !svg && (truncated || !['md', 'markdown', 'json', 'csv', 'tsv', 'log'].includes(extension));
      if (html || svg) formatButton.textContent = html ? 'HTML 預覽' : '圖片預覽';
      formatButton.onclick = async event => {
        if (!valid()) return;
        if (!formatted.hidden) {
          showSource();
          rememberPreview(entry, { mode: 'source' });
          if (svg) encodingPicker.hidden = false;
          if (html || svg) formatButton.textContent = html ? 'HTML 預覽' : '圖片預覽';
          return;
        }
        try {
          formatButton.disabled = true;
          if (html || svg) {
            closeFileFind();
            await renderMedia(entry.file, typeOfPreview, valid);
            if (valid()) {
              formatButton.textContent = '原始碼';
              if (svg) encodingPicker.hidden = true;
              if (event) rememberPreview(entry, { mode: 'preview', explicit: true });
            }
            return;
          }
          if (extension === 'md' || extension === 'markdown') {
            const fragment = await markdown(text);
            if (!valid()) return;
            formatted.append(fragment);
          } else if (extension === 'json') renderJson(formatted, JSON.parse(text), 'JSON');
          else if (extension === 'log') renderLog(text);
          else renderTable(text, extension);
          closeFileFind();
          formatted.hidden = false;
          preview.hidden = true;
          formatButton.textContent = '原始碼';
          if (event) rememberPreview(entry, { mode: 'preview', explicit: true });
        } catch {
          if (valid()) showStatus('無法產生格式化檢視。');
        } finally {
          formatButton.disabled = false;
        }
      };
      const preference = previewPreferences.get(entry.path);
      const savedMode = html && !preference?.explicit ? 'source' : preference?.mode;
      if ((showFormatted ?? (savedMode === 'preview')) && !formatButton.hidden) {
        await formatButton.onclick();
      }
      try {
        const html = await viewerText.highlight(entry.file.name, text.replace(/\r\n?/g, '\n'));
        if (html !== null && valid()) {
          sourceCode.innerHTML = html;
          if (suffix) sourceCode.append(suffix);
          if (preview.classList.contains('viewer-wrapped')) renderSourceLayout();
          else updateFileFind(false, fileMatchIndex);
        }
      } catch {
        // 高亮元件載入失敗時保留文字。
      }
    }

    encodingPicker.addEventListener('change', () => {
      if (!currentFile) return;
      const entry = currentFile;
      const version = previewVersion;
      rememberPreview(entry, { encoding: encodingPicker.value });
      renderText(entry, version).catch(() => {
        if (version === previewVersion) showPreviewMessage('無法讀取 ' + entry.path);
      });
    });

    function formatFileSize(size) {
      if (size < 1024) return size + ' B';
      const unit = size >= 1024 * 1024 ? 'MB' : 'KB';
      const value = size / (unit === 'MB' ? 1024 * 1024 : 1024);
      return value.toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + ' ' + unit;
    }

    async function openFile(entry, live = true, force = false) {
      if (entry) rememberViewerLocation('preview', entry.path);
      const wasExplorer = explorerVisible;
      hideExplorer();
      if (wasExplorer) force = true;
      if (live && entry) liveFile = entry;
      if (!force && entry === currentFile && live === viewingLive) return;
      if (entry !== currentFile) leavePlayingFile();
      viewingLive = live;
      directory.querySelectorAll('summary[data-explorer-selected="true"]').forEach(node => node.removeAttribute('data-explorer-selected'));
      selectedButton?.removeAttribute('aria-current');
      selectedButton = entry?.button;
      selectedButton?.setAttribute('aria-current', 'true');
      currentFile = entry;
      if (entry) tabRecency.set(entry, ++tabVisit);
      renderNote();
      saveSession();
      const version = ++previewVersion;
      renderTabs();
      fileInfo.hidden = !entry;
      const restoreMini = !!entry && continuingMedia && continuingEntry === entry;
      const restoredMedia = restoreMini ? continuingMedia : undefined;
      if (restoreMini) {
        continuingMedia = undefined;
        continuingEntry = undefined;
        restoredMedia.miniCleanup?.();
        mini.hidden = true;
        mini.replaceChildren();
      }
      showSource();
      if (restoreMini) {
        activeMedia = restoredMedia;
        formatted.replaceChildren(restoredMedia.node);
        formatted.classList.add('viewer-media-preview');
        formatted.hidden = false;
        preview.hidden = true;
      }
      formatButton.hidden = true;
      encodingPicker.hidden = true;
      encodingPicker.value = entry ? preferredEncoding(entry) || '' : '';
      if (!entry) {
        showPreviewMessage('從右側目錄選擇檔案。');
        return;
      }
      if (restoreMini) {
        renderFileBreadcrumb(entry.path);
        const [, label] = fileType(entry.file.name);
        fileMeta.textContent = label + ' · ' + formatFileSize(entry.file.size);
        return;
      }
      renderFileBreadcrumb(entry.path);
      const [, type] = fileType(entry.file.name);
      fileMeta.textContent = type + ' · ' + formatFileSize(entry.file.size);
      preview.scrollTop = 0;
      showPreviewMessage('正在讀取 ' + entry.path + '…');
      try {
        const type = mediaType(entry.file);
        const svgSource = type === 'image/svg+xml' && previewPreferences.get(entry.path)?.mode === 'source';
        if (type && type !== 'text/html' && !svgSource) {
          encodingPicker.hidden = true;
          await renderMedia(entry.file, type, () => version === previewVersion);
          if (type === 'image/svg+xml' && version === previewVersion) {
            formatButton.hidden = false;
            formatButton.textContent = '原始碼';
            formatButton.onclick = () => {
              encodingPicker.hidden = false;
              rememberPreview(entry, { mode: 'source' });
              renderText(entry, version, false).catch(() => showStatus('無法讀取 SVG 原始碼。'));
            };
          }
        } else await renderText(entry, version);
        if (version !== previewVersion) return;
      } catch {
        if (version === previewVersion) showPreviewMessage('無法讀取 ' + entry.path);
      }
    }

    function showFiles(entries, skipped = 0, gone = [], source, directories = [], pendingTabs = [], preservePreview = false) {
      changePanelOpened = false;
      changePanel.hidden = true;
      const session = source && readSessionValue('site-viewer-session:' + source);
      const kept = preservePreview && currentFile && session?.active === currentFile.path
        ? entries.find(entry => entry.path === currentFile.path &&
            entry.file.size === currentFile.file.size && entry.file.lastModified === currentFile.file.lastModified)
        : undefined;
      if (kept) {
        currentFile.file = kept.file;
        currentFile.change = kept.change;
        entries = entries.map(entry => entry === kept ? currentFile : entry);
      }
      pendingRestoreTabs = pendingTabs;
      previewPreferences = new Map(Array.isArray(session?.previews) ? session.previews : []);
      const expanded = Array.isArray(session?.expanded) ? new Set(session.expanded) : null;
      viewerHistoryReady = false;
      viewerBackHistory.length = 0;
      hideExplorer();
      explorerFolders = new Map();
      const root = { folders: new Map(), files: [] };
      explorerFolders.set('', root);
      searchVersion++;
      closeSearch();
      searchResults.replaceChildren(searchHint.cloneNode(true));
      searchStatus.textContent = '';
      treeEntries = new Map(entries.map(entry => [entry.path, entry]));
      changesOnly = false;
      if (changeMode !== 'normal') { selectedChangeKinds.clear(); setChangeMode('normal'); }
      selectedChangeKinds.clear();
      Object.keys(modeFilters).forEach(key => { modeFilters[key] = ''; });
      deletedChanges = gone;
      function ensureFolder(parts) {
        let node = root;
        let currentPath = '';
        for (const folder of parts) {
          currentPath = currentPath ? currentPath + '/' + folder : folder;
          if (!node.folders.has(folder)) {
            const child = { folders: new Map(), files: [] };
            node.folders.set(folder, child);
            explorerFolders.set(currentPath, child);
          }
          node = node.folders.get(folder);
        }
        return node;
      }
      for (const path of directories) ensureFolder(path.split('/'));
      for (const entry of entries) {
        const parts = entry.path.split('/');
        parts.pop();
        ensureFolder(parts).files.push(entry);
      }

      // 與獨立版相同：資料夾在前，名稱採自然排序。
      const compareNames = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;
      function renderNode(node, parent, prefix, depth = 0) {
        const list = document.createElement('ul');
        let count = node.files.length;
        for (const [name, child] of [...node.folders].sort(([a], [b]) => compareNames(a, b))) {
          const item = document.createElement('li');
          const details = document.createElement('details');
          const path = prefix + name;
          details.dataset.folder = path;
          const summary = document.createElement('summary');
          const folderIcon = document.createElement('span');
          folderIcon.className = 'viewer-tree-icon';
          folderIcon.setAttribute('aria-hidden', 'true');
          //folderIcon.innerHTML = thisFolderIcon;
		  folderIcon.innerHTML = `
			<span class="viewer-folder-closed">${thisFolderIcon}</span>
			<span class="viewer-folder-open">${thisFolderOpenIcon}</span>
		`;
          const label = document.createElement('span');
          label.className = 'viewer-tree-name';
          label.textContent = name;
          summary.title = path + '（雙擊開啟檔案總管）';
          summary.addEventListener('click', () => showExplorer(path));
          summary.addEventListener('dblclick', event => { event.preventDefault(); showExplorer(path); });
          summary.append(folderIcon, label);
          details.open = expanded ? expanded.has(path) : !prefix;
          details.appendChild(summary);
          const childCount = renderNode(child, details, path + '/', depth + 1);
          const badge = document.createElement('span');
          badge.className = 'viewer-tree-count';
          badge.textContent = childCount;
          const change = document.createElement('span');
          change.className = 'viewer-tree-change';
          summary.append(badge, change);
          count += childCount;
          item.appendChild(details);
          list.appendChild(item);
        }
        for (const entry of node.files.sort((a, b) => compareNames(a.file.name, b.file.name))) {
          const item = document.createElement('li');
          item.dataset.filePath = entry.path;
          const button = document.createElement('button');
          button.type = 'button';
          button.title = entry.path;
          const icon = document.createElement('span');
          icon.className = 'viewer-tree-file-icon';
          icon.setAttribute('aria-hidden', 'true');
          //const [glyph, , kind] = fileType(entry.file.name);
          //icon.textContent = glyph;
          const [, , kind] = fileType(entry.file.name);
          icon.innerHTML = viewerFileSvg(entry.file.name);
          icon.dataset.kind = kind;
          // 沿用原有容器位置，但不再顯示文字徽章的背景與邊框。
          const name = document.createElement('span');
          name.className = 'viewer-tree-name';
          name.textContent = entry.file.name;
          entry.badge = document.createElement('span');
          entry.badge.className = 'viewer-tree-change';
          button.append(icon, name, entry.badge);
          entry.button = button;
          button.addEventListener('click', () => {
            // 左側是檔案總管時，右側樹狀目錄只同步選取，不切換成預覽。
            if (explorerVisible) {
              selectExplorerTree(entry.path, false);
              const parentPath = entry.path.split('/').slice(0, -1).join('/');
              explorerSelectedName = entry.file.name;
              if (explorerFolder !== parentPath) {
                const treeButton = button;
                showExplorer(parentPath);
                treeButton.focus({preventScroll:true});
              }
              const tile = [...explorer.querySelectorAll('.viewer-explorer-tile')]
                .find(node => node.title === entry.file.name);
              explorer.querySelector('.viewer-explorer-tile[aria-selected="true"]')?.removeAttribute('aria-selected');
              tile?.setAttribute('aria-selected', 'true');
              tile?.scrollIntoView({block:'nearest', inline:'nearest'});
              return;
            }
            // 已開啟獨立 Sheet：直接切換，不覆寫原本的預覽 Sheet。
            if (pinned.has(entry)) openFile(entry, false);
            else openFile(entry);
          });
          button.addEventListener('dblclick', () => {
            pinFile(entry);
          });
          item.appendChild(button);
          list.appendChild(item);
        }
        parent.appendChild(list);
        return count;
      }

      directory.replaceChildren();
      treeCursor = undefined;
      filter.value = '';
      selectedButton = undefined;
      if (!kept) {
        ++previewVersion;
        showSource();
        currentFile = undefined;
        fileInfo.hidden = true;
        viewingLive = true;
        showPreviewMessage('從右側目錄選擇檔案。');
      }
      liveFile = undefined;
      pinned.clear();
      renderNode(root, directory, '');
      refreshChangeBadges();
      const loadStatus = workspace.querySelector('[role="status"]');
      loadStatus.textContent = skipped ? '略過 ' + skipped + ' 個無法讀取的項目' : '';
      loadStatus.hidden = !skipped;
      status.textContent = '';
      status.hidden = true;
      start.hidden = true;
      workspace.hidden = false;
      sessionSource = source;
      if (!kept) renderNote();
      writeSessionValue(locationKey, source || null);
      if (Array.isArray(session?.tabs)) {
        const byPath = new Map(entries.map(entry => [entry.path, entry]));
        for (const tab of session.tabs) {
          if (tab?.pinned && byPath.has(tab.path)) pinned.add(byPath.get(tab.path));
        }
        const active = byPath.get(session.active) || Array.from(pinned).at(-1);
        liveFile = byPath.get(session.live);
        if (kept) {
          selectedButton = currentFile.button;
          selectedButton.setAttribute('aria-current', 'true');
          renderTabs();
        } else if (active) openFile(active, session.viewingLive ?? !pinned.has(active));
        else renderTabs();
      } else renderTabs();
      // 單一來源資料夾時，直接進入該資料夾，不顯示額外的虛擬「全部檔案」層。
      // 多個來源時才保留「全部檔案」，讓使用者選擇來源。
      const sourceRoots = [...root.folders.keys()];
      const initialExplorerPath = root.files.length === 0 && sourceRoots.length === 1
        ? sourceRoots[0] : '';
      const restoredFolder = session?.explorerFolder;
      if (typeof restoredFolder === 'string' && explorerFolders.has(restoredFolder)) {
        explorerSelectedName = session.explorerSelectedName || '';
        explorerScrollTop = Number(session.explorerScrollTop) || 0;
      }
      showExplorer(typeof restoredFolder === 'string' && explorerFolders.has(restoredFolder) ? restoredFolder : initialExplorerPath);
      if (session?.explorer === false && currentFile) {
        openFile(currentFile, viewingLive, true);
      }
      viewerHistoryReady = true;
      if (typeof session?.filter === 'string' && session.filter) {
        filter.value = session.filter;
        filter.dispatchEvent(new Event('input'));
      }
	  // 目錄載入完成後，更新 Toolbar 按鈕顯示狀態
	  if (typeof renderToolbar === 'function') renderToolbar();
    }

    const scanNotice = document.createElement('div');
    scanNotice.className = 'viewer-scan-notice';
    scanNotice.setAttribute('role', 'status');
    scanNotice.hidden = true;
    workspace.querySelector('.viewer-preview').append(scanNotice);
    let scanNoticeTimer;

    function showScanNotice(message) {
      clearTimeout(scanNoticeTimer);
      scanNotice.textContent = message;
      scanNotice.hidden = false;
      scanNoticeTimer = setTimeout(() => { scanNotice.hidden = true; }, 4200);
    }

    function showStatus(message) {
      const target = workspace.hidden ? status : workspace.querySelector('[role="status"]');
      target.textContent = message;
      target.hidden = false;
    }

    function skipEntry(path, error, skipped) {
      skipped.push(path);
      console.warn('略過無法讀取的項目:', path, error);
    }

    async function readHandle(handle, parent, entries, skipped, directories, name = handle.name) {
      if (viewerIgnoredNames.has(handle.name)) return;
      const path = parent + name;
      try {
        if (handle.kind === 'file') {
          entries.push({ path, file: await handle.getFile() });
        } else if (handle.kind === 'directory') {
          directories.add(path);
          for await (const child of handle.values()) {
            await readHandle(child, path + '/', entries, skipped, directories);
          }
        }
      } catch (error) {
        skipEntry(path, error, skipped);
      }
    }

    function accessRecents(update) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('site-viewer', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('settings');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('settings', update ? 'readwrite' : 'readonly');
          const store = tx.objectStore('settings');
          const read = store.get('recent-folders');
          let records;
          read.onsuccess = () => {
            records = normalizeViewerRecents(read.result);
            if (!update) return;
            try {
              records = update(records);
              store.put(records, 'recent-folders');
            } catch (error) {
              reject(error);
              tx.abort();
            }
          };
          tx.oncomplete = () => { db.close(); resolve(records); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
    }

    function saveRecent(record) {
      const key = viewerSourceKey(record);
      const write = value => accessRecents(records => removedRecords.has(value.id) ? records : [
        value, ...records.filter(item => item.id !== value.id && viewerSourceKey(item) !== key),
      ]);
      return write(record)
        .catch(error => {
          if (!record.handles.length) throw error;
          console.warn('無法儲存資料夾憑證，改存文字快照:', error);
          return write({ ...record, handles: [] });
        })
        .catch(error => {
          console.warn('無法儲存資料夾憑證或檔案清單:', error);
          if (activeRecent === record) showStatus('已載入檔案，但無法儲存開啟清單。');
        })
        .then(records => { if (records) renderRecents(records); });
    }

    function fileIndex(entries) {
      return entries.map(({ path, file }) => ({ path, size: file.size, mtime: file.lastModified }));
    }

    async function captureTextSnapshot(entries) {
      const files = [];
      let remaining = 24 * 1024 * 1024;
      for (const { path, file } of entries) {
        if (file.size > 3 * 1024 * 1024 || file.size > remaining ||
            /^(image|audio|video)\/|^application\/pdf$/.test(file.type)) continue;
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (bytes.includes(0)) continue;
          files.push({ path, file: new Blob([bytes], { type: file.type }), mtime: file.lastModified });
          remaining -= file.size;
        } catch (error) {
          console.warn('略過無法建立快照的檔案:', path, error);
        }
      }
      return files;
    }

    function createSource(entries, handles, directories) {
      return {
        id: crypto.randomUUID(),
        label: sourceLabel(entries, directories),
        handles,
        identityVerified: handles.length > 0,
        savedAt: Date.now(),
        directories: [...directories],
        directoryCount: [...directories].filter(path => path.includes('/')).length,
        snapshot: { files: fileIndex(entries), gone: [] },
      };
    }

    async function rememberSource(entries, record) {
      activeRecent = record;
      if (record.handles.length) await saveRecent(record);
      record.cached = await captureTextSnapshot(entries);
      await saveRecent(record);
    }

    function sourceLabel(entries, directories = []) {
      const paths = [...directories, ...entries.map(entry => entry.path)];
      return [...new Set(paths.map(path => path.split('/')[0]))].join('、');
    }

    function snapshotEntries(record) {
      return (record.cached || []).filter(({ path }) => !viewerIgnoresPath(path)).map(({ path, file }) => ({
        path, file: new File([file], path.split('/').at(-1), { type: file.type }),
      }));
    }

    function restoreTextSnapshot(record) {
      if (!record.cached?.length && !record.directories?.length) return false;
      activeRecent = undefined;
      const entries = snapshotEntries(record);
      const directories = (record.directories || []).filter(path => !viewerIgnoresPath(path));
      showFiles(entries, 0, [], viewerSourceKey(record), directories);
      showStatus('已還原 ' + entries.length + ' 個文字檔（離線快照）。');
      return true;
    }

    async function restoreSavedView(record, version) {
      const source = viewerSourceKey(record);
      const session = readSessionValue('site-viewer-session:' + source);
      const tabs = Array.isArray(session?.tabs) ? session.tabs : [];
      const active = session?.active || session?.live || tabs.at(-1)?.path;
      if (!active || viewerIgnoresPath(active)) return false;
      const wanted = new Set([active, session?.live, ...tabs.map(tab => tab?.path)]);
      const previousFiles = new Map((record.snapshot?.files || []).map(file => [file.path, file]));
      const entries = (record.cached || []).filter(({ path }) => wanted.has(path) && !viewerIgnoresPath(path))
        .map(({ path, file, mtime }) => ({
          path,
          file: new File([file], path.split('/').at(-1), {
            type: file.type,
            lastModified: mtime ?? previousFiles.get(path)?.mtime ?? 0,
          }),
        }));
      if (!entries.some(entry => entry.path === active)) {
        const used = new Set();
        const roots = new Map(record.handles.map(handle => [uniqueRootName(handle.name, used), handle]));
        const parts = active.split('/');
        let handle = roots.get(parts.shift());
        if (!handle) return false;
        try {
          while (parts.length > 1) handle = await handle.getDirectoryHandle(parts.shift());
          if (parts.length) handle = await handle.getFileHandle(parts[0]);
          entries.push({ path: active, file: await handle.getFile() });
        } catch {
          return false;
        }
      }
      if (version !== loadVersion) return false;
      const available = new Set(entries.map(entry => entry.path));
      activeRecent = undefined;
      showFiles(entries, 0, [], source, [], tabs.filter(tab => tab?.pinned && !available.has(tab.path)));
      return true;
    }

    async function openRecent(record, auto = false) {
		window.plugins.viewer.currentAction = 'list';
      const version = ++loadVersion;
      const { handles } = record;
      if (!handles.length) {
        if (!restoreTextSnapshot(record)) showStatus('這筆紀錄沒有可還原的文字檔。');
        return;
      }
      const entries = [];
      const skipped = [];
      const directories = new Set();
      const options = { mode: 'read' };
      if (auto) {
        const permissions = await Promise.all(handles.map(handle => handle.queryPermission(options).catch(() => 'denied')));
        if (version !== loadVersion) return;
        if (permissions.some(permission => permission !== 'granted')) {
          showStatus('請從開啟清單選擇「' + (record.label || handles.map(handle => handle.name).join('、')) + '」重新授權，接續上次的工作。');
          return;
        }
      }
      const restoredEarly = auto && await restoreSavedView(record, version);
      if (version !== loadVersion) return;
      if (!restoredEarly) showStatus('正在讀取資料夾…');
      if (restoredEarly && !document.hidden) {
        // 先讓已還原的預覽有一次繪製機會，再開始磁碟掃描。
        await new Promise(resolve => {
          const timeout = setTimeout(resolve, 100);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            clearTimeout(timeout);
            resolve();
          }));
        });
        if (version !== loadVersion) return;
      }
      const rootNames = new Set();
      for (const handle of handles) {
        const name = uniqueRootName(handle.name, rootNames);
        try {
          if (!auto && await handle.queryPermission(options) !== 'granted' &&
              await handle.requestPermission(options) !== 'granted') {
            skipped.push(handle.name);
            continue;
          }
          await readHandle(handle, '', entries, skipped, directories, name);
        } catch (error) {
          skipEntry(handle.name, error, skipped);
        }
      }
      if (version !== loadVersion) return;
      if (!entries.length && skipped.length) {
        if (!restoreTextSnapshot(record)) showStatus('無法重新開啟資料夾。請重新拖入或選擇資料夾。');
        return;
      }
      activeRecent = skipped.length ? undefined : record;
      if (skipped.length) {
        showFiles(entries, skipped.length, [], viewerSourceKey(record), directories);
        return;
      }
      const files = fileIndex(entries);
      const { chg, gone, counts } = record.snapshot
        ? viewerDiffIndex(record.snapshot, files, Date.now())
        : { chg: Object.create(null), gone: [] };
      for (const file of files) if (chg[file.path]) file.ch = chg[file.path];
      for (const entry of entries) entry.change = chg[entry.path];
      record.snapshot = { files, gone };
      record.directories = [...directories];
      record.directoryCount = record.directories.filter(path => path.includes('/')).length;
      record.savedAt = Date.now();
      const resumeSearch = restoredEarly && !searchPanel.hidden;
      showFiles(entries, 0, gone, viewerSourceKey(record), directories, [], restoredEarly);
      if (resumeSearch) {
        searchPanel.hidden = false;
        if (searchInput.value.trim()) submitSearch();
      }
      if (auto && window.viewMode === 'viewer') {
        const name = record.label || handles.map(handle => handle.name).join('、');
        const changes = counts && [
          counts.added && '新增 ' + counts.added,
          counts.modified && '修改 ' + counts.modified,
          counts.removed && '刪除 ' + counts.removed,
        ].filter(Boolean).join('、');
        const result = changes ? '這次重讀：' + changes + '。' :
          counts ? '自上次開啟後沒有變動。' : '已建立變動比對基準。';
        const unread = Object.keys(chg).length || gone.length ? '目錄已標出異動（按「全部標為已看過」才清除）。' : '';
        showScanNotice('已從磁碟重新讀取「' + name + '」的 ' + files.length + ' 個檔案。\n' + result + unread);
      }
      record.cached = await captureTextSnapshot(entries);
      if (version !== loadVersion) return;
      saveRecent(record);
    }

    function renderRecents(records) {
      const recent = content.querySelector('.viewer-recents');
      const list = recent.querySelector('.viewer-recent-list');
      list.replaceChildren();
      const labels = records.map(record => record.label || record.handles.map(handle => handle.name).join('、'));
      const labelCounts = new Map();
      for (const label of labels) labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      const labelPositions = new Map();
      for (const record of records) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rc-main';
        const name = record.label || record.handles.map(handle => handle.name).join('、');
        const title = document.createElement('span');
        title.className = 'rc-name';
        title.textContent = name;
        const meta = document.createElement('span');
        meta.className = 'rc-meta';
        const location = document.createElement('span');
        location.className = 'rc-meta';
        location.textContent = '相對路徑：' + (record.directories || [])
          .filter(path => !path.includes('/')).map(path => path + '/').join('、');
        if (!location.textContent.endsWith('/')) {
          location.textContent = '相對路徑：' + (record.label || name);
        }
        if (labelCounts.get(name) > 1) {
          const position = (labelPositions.get(name) || 0) + 1;
          labelPositions.set(name, position);
          location.textContent += ' · 同名來源 ' + position;
        }
        location.title = '瀏覽器未提供完整磁碟路徑';
        const files = record.snapshot?.files?.filter(file => !viewerIgnoresPath(file.path));
        const directoryCount = record.directories?.filter(path => path.includes('/') && !viewerIgnoresPath(path)).length;
        const paths = files?.map(file => file.path.split('/').slice(0, 2));
        const top = [...new Set(paths?.map(([, child]) => child).filter(Boolean))];
        const hint = top.slice(0, 4).join(', ') + (top.length > 4 ? '…' : '');
        const counts = [
          files ? files.length + ' 個檔案' : '',
          Number.isInteger(directoryCount) ? directoryCount + ' 個資料夾' : '',
        ].filter(Boolean).join('，');
        meta.textContent = [
          counts,
          hint,
          record.savedAt ? new Date(record.savedAt).toLocaleString('zh-TW') : '',
        ].filter(Boolean).join(' · ') || '開啟後更新檔案資訊';
        meta.title = meta.textContent;
        const permission = document.createElement('span');
        permission.className = 'rc-perm';
        permission.textContent = record.cached?.length ? '文字快照，可離線開啟' : '沒有可用的授權或文字快照';
        if (record.handles.length) {
          permission.textContent = '確認授權狀態…';
          Promise.all(record.handles.map(async handle => handle.queryPermission({ mode: 'read' })))
            .then(states => {
              const state = states.every(value => value === 'granted') ? 'granted' :
                states.includes('denied') ? 'denied' : 'prompt';
              permission.dataset.state = state;
              permission.textContent = {
                granted: '已授權，可以直接開啟',
                denied: '授權已被拒絕，可重新選擇資料夾',
                prompt: '開啟時需要授權',
              }[state];
            })
            .catch(() => {
              permission.dataset.state = 'invalid';
              permission.textContent = '憑證無法使用，可重新選擇資料夾';
            });
        }
        const initial = document.createElement('span');
        initial.className = 'rc-initial';
        initial.setAttribute('aria-hidden', 'true');
        const [first] = name.trim();
        initial.textContent = first?.toLocaleUpperCase() || '·';
        const details = document.createElement('span');
        details.className = 'rc-details';
        details.append(title, location, meta, permission);
        button.append(initial, details);
        button.addEventListener('click', () => openRecent(record));
        const row = document.createElement('div');
        row.className = 'rc';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'rc-x';
        remove.title = '從開啟清單移除';
        remove.setAttribute('aria-label', '從開啟清單移除 ' + name);
        remove.textContent = '✕';
        remove.addEventListener('click', async () => {
          remove.disabled = true;
          removedRecords.add(record.id);
          const key = viewerSourceKey(record);
          try {
            const next = await accessRecents(items => items.filter(item => viewerSourceKey(item) !== key));
            if (readSessionValue(locationKey) === key) writeSessionValue(locationKey, null);
            renderRecents(next);
          } catch (error) {
            removedRecords.delete(record.id);
            remove.disabled = false;
            console.warn('無法移除開啟清單項目:', error);
            showStatus('無法移除「' + name + '」。');
          }
        });
        row.append(button, remove);
        list.appendChild(row);
      }
      const hasRecords = records.length > 0;
      recent.hidden = !hasRecords;
      content.querySelector('.viewer-start-intro').hidden = hasRecords;
    }

    function uniqueRootName(name, used) {
      let label = name;
      for (let suffix = 2; used.has(label); suffix++) label = name + ' (' + suffix + ')';
      used.add(label);
      return label;
    }

    async function readEntry(entry, parent, entries, skipped, directories, name = entry.name) {
      if (viewerIgnoredNames.has(entry.name)) return;
      const path = parent + name;
      try {
        if (entry.isFile) {
          const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
          entries.push({ path, file });
        } else if (entry.isDirectory) {
          directories.add(path);
          const reader = entry.createReader();
          while (true) {
            const children = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
            if (!children.length) break;
            for (const child of children) await readEntry(child, path + '/', entries, skipped, directories);
          }
        }
      } catch (error) {
        skipEntry(path, error, skipped);
      }
    }

    async function openArchive(file, version) {
      showStatus('正在讀取「' + file.name + '」…');
      try {
        if (typeof readViewerArchive !== 'function') throw new Error('無法載入壓縮檔讀取元件。');
        const { entries, directories } = await readViewerArchive(file);
        if (version !== loadVersion) return;
        const record = createSource(entries, [], directories);
        activeRecent = undefined;
        showFiles(entries, 0, [], viewerSourceKey(record), directories);
        rememberSource(entries, record).catch(console.warn);
      } catch (error) {
        if (version === loadVersion) showStatus('無法開啟「' + file.name + '」。' + error.message);
      }
    }

    function captureDropItem(item) {
      // 瀏覽器只允許在 drop 事件內取得來源，必須在第一次 await 前呼叫。
      const source = {};
      try {
        source.handleRequest = item.getAsFileSystemHandle?.().catch(() => null);
      } catch (error) {
        console.warn('無法取得拖曳來源憑證:', error);
      }
      source.entry = item.webkitGetAsEntry?.();
      if (!source.entry || source.entry.isFile) source.file = item.getAsFile();
      return source;
    }

    const isFileDrag = event => Array.from(event.dataTransfer.types).includes('Files');
    content.addEventListener('dragover', event => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      content.classList.add('viewer-dragging');
    });
    content.addEventListener('dragleave', event => {
      if (!content.contains(event.relatedTarget)) content.classList.remove('viewer-dragging');
    });
    content.addEventListener('drop', async event => {
      content.classList.remove('viewer-dragging');
      if (!isFileDrag(event)) return;
      event.preventDefault();
      const version = ++loadVersion;
      const sources = Array.from(event.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(captureDropItem);
      if (!sources.length) {
        for (const file of event.dataTransfer.files) sources.push({ file });
      }
      const archive = sources.length === 1 && sources[0].file;
      if (archive && typeof viewerArchivePattern !== 'undefined' && viewerArchivePattern.test(archive.name)) {
        await openArchive(archive, version);
        return;
      }
      const entries = [];
      const skipped = [];
      const folders = [];
      const directories = new Set();
      const rootNames = new Set();
      showStatus('正在讀取檔案…');
      for (const { handleRequest, entry, file } of sources) {
        const handle = await handleRequest;
        if (version !== loadVersion) return;
        if (viewerIgnoredNames.has(handle?.name || entry?.name || file?.name)) continue;
        const name = uniqueRootName(handle?.name || entry?.name || file?.name || '未命名', rootNames);
        const before = entries.length;
        const handleSkipped = [];
        if (handle) await readHandle(handle, '', entries, handleSkipped, directories, name);
        if (handle?.kind === 'directory' && directories.has(name) && !handleSkipped.length) {
          folders.push(handle);
        }
        if (entries.length === before && entry) {
          await readEntry(entry, '', entries, skipped, directories, name);
        } else {
          skipped.push(...handleSkipped);
        }
        if (entries.length === before && file && !entry && handle?.kind !== 'directory') {
          entries.push({ path: name, file });
        }
      }
      if (version !== loadVersion) return;
      if (entries.length || directories.size) {
        activeRecent = undefined;
        const completeFolderGroup = folders.length === sources.length;
        const handles = completeFolderGroup ? folders : [];
        const record = createSource(entries, handles, directories);
        let gone = [];
        if (handles.length) {
          const records = await accessRecents().catch(() => []);
          const previous = await findViewerSource(records, handles);
          if (version !== loadVersion) return;
          if (previous) {
            const previousKey = viewerSourceKey(previous);
            record.id = previous.id;
            const session = readSessionValue('site-viewer-session:' + previousKey);
            if (previousKey !== record.id && session) {
              writeSessionValue('site-viewer-session:' + record.id, session);
            }
            if (previous.snapshot) {
              const diff = viewerDiffIndex(previous.snapshot, record.snapshot.files, Date.now());
              gone = diff.gone;
              record.snapshot.gone = gone;
              for (const file of record.snapshot.files) if (diff.chg[file.path]) file.ch = diff.chg[file.path];
              for (const entry of entries) entry.change = diff.chg[entry.path];
            }
          }
        }
        showFiles(entries, skipped.length, gone, viewerSourceKey(record), directories);
        rememberSource(entries, record).catch(console.warn);
      } else if (skipped.length || !sources.length) {
        showStatus('沒有讀到可用的檔案。若來源是遠端桌面或傳檔工具，請先存到本機，或用「選擇資料夾」。');
      } else {
        showStatus('沒有可顯示的檔案。');
      }
    });
    const buttons = content.querySelectorAll('.viewer-start-actions button');
    const pickers = content.querySelectorAll('input[type="file"]');
    const actions = [
      { name: 'viewer-folder', label: '選擇資料夾', order: 10 },
      { name: 'viewer-archive', label: '選擇壓縮檔', order: 20 },
    ];
/**
    const about = content.querySelector('.viewer-about');
    const aboutBody = about.querySelector('.about-body');
    const aboutToc = about.querySelector('.about-toc');
    aboutBody.querySelectorAll('h2').forEach(heading => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'about-toc-item';
      button.textContent = heading.textContent;
      button.addEventListener('click', () => {
        aboutBody.scrollTop += heading.getBoundingClientRect().top - aboutBody.getBoundingClientRect().top;
        aboutBody.focus({ preventScroll: true });
      });
      aboutToc.appendChild(button);
    });
    content.querySelector('[data-viewer-about]').addEventListener('click', () => {
      about.showModal();
      aboutBody.scrollTop = 0;
    });
**/
    actions.forEach(({ name, label, order }, index) => {
      const picker = pickers[index];
      const open = () => picker.click();
      buttons[index].addEventListener('click', open);
      picker.addEventListener('change', () => {
        const file = picker.files[0];
        if (!file) return;

        const version = ++loadVersion;
        if (name === 'viewer-folder') {
          activeRecent = undefined;
          const entries = Array.from(picker.files, file => ({ path: file.webkitRelativePath || file.name, file }))
            .filter(({ path }) => !viewerIgnoresPath(path));
          showFiles(entries, 0, [], viewerSourceKey({ handles: [], label: sourceLabel(entries) }));
          const directories = new Set();
          for (const { path } of entries) {
            const parts = path.split('/');
            for (let depth = 1; depth < parts.length; depth++) {
              directories.add(parts.slice(0, depth).join('/'));
            }
          }
          rememberSource(entries, createSource(entries, [], directories)).catch(console.warn);
        } else {
          openArchive(file, version);
        }
        picker.value = '';
      });

      registerPlugin(name, {
        mode: 'viewer',
        label,
        order,
        icon: index === 0
			? 'folderOpen'
			: 'fileArchive',
        open,
      });
    });

    // 快速開啟：Toolbar 與 Ctrl+P 共用入口；圖示由 icons.js 管理。
    const quickDialog = content.querySelector('.viewer-quick-open');
    const quickInput = quickDialog.querySelector('input');
    const quickResults = quickDialog.querySelector('.viewer-quick-results');
    let quickMatches = [], quickSelected = 0;
    function quickSearch() {
      const query = quickInput.value.trim().replace(/:(\d+)(?::\d+)?$/, '').toLowerCase();
      const terms = query.split(/\s+/).filter(Boolean);
      quickMatches = [...treeEntries.values()].filter(entry => terms.every(term => entry.path.toLowerCase().includes(term))).slice(0, 100);
      quickSelected = 0;
      quickRender();
    }
    function quickRender() {
      quickResults.replaceChildren();
      quickMatches.forEach((entry, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(index === quickSelected));
        const name = document.createElement('strong');
        name.textContent = entry.path.split('/').pop();
        const folder = document.createElement('small');
        folder.textContent = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '';
        button.append(name, folder);
        button.addEventListener('click', () => quickAccept(index));
        quickResults.append(button);
      });
    }
    async function quickAccept(index = quickSelected) {
      const entry = quickMatches[index];
      if (!entry) return;
      const line = /:(\d+)(?::\d+)?$/.exec(quickInput.value.trim());
      quickDialog.close();
      await openFile(entry);
      if (line && sourceLineCount) selectSourceLine(Number(line[1]) - 1, true, true);
    }
    function openQuickFile() {
      if (window.viewMode !== 'viewer' || workspace.hidden || quickDialog.open) return;
      quickInput.value = '';
      quickSearch();
      quickDialog.showModal();
      quickInput.focus();
    }
    quickInput.addEventListener('input', quickSearch);
    quickInput.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!quickMatches.length) return;
        quickSelected = (quickSelected + (event.key === 'ArrowDown' ? 1 : -1) + quickMatches.length) % quickMatches.length;
        quickRender();
        quickResults.children[quickSelected]?.scrollIntoView({block:'nearest'});
      } else if (event.key === 'Enter') { event.preventDefault(); quickAccept(); }
    });
    window.addEventListener('keydown', event => {
      if (window.viewMode !== 'viewer' || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'p') return;
      event.preventDefault();
      openQuickFile();
    });
    registerPlugin('viewer-quick-open', {
      mode: 'viewer', label: '快速開啟', order: 23,
      icon: 'viewerQuickOpen',
      hideToolbar() { return window.plugins.viewer.currentAction === 'home'; },
      open: openQuickFile,
    });

    registerPlugin('viewer-changes', {
      mode: 'viewer',
      label: '異動紀錄',
      order: 25,
      icon: 'viewerHistory',
      hideToolbar() {
        if (window.plugins.viewer.currentAction === 'home') return true;
        return !Array.from(directory.querySelectorAll('[data-file-path]')).some(row =>
          treeEntries.get(row.dataset.filePath)?.change
        );
      },
      showCount() {
        return [...treeEntries.values()].filter(e => e.change).length + deletedChanges.length;
      },
      delay: 500,
      maxDisplay: 99,
      children: [
        { label: '切換只看異動', icon: resolveIcon('changeFilter'), open: () => { revealChangePanel(); toggleChangesOnly(); } },
        { label: '上一個異動（Shift+F8）', icon: resolveIcon('changePrevious'), open: () => { revealChangePanel(); jumpChange(-1); } },
        { label: '下一個異動（F8）', icon: resolveIcon('changeNext'), open: () => { revealChangePanel(); jumpChange(1); } },
        { label: '全部標為已看過', icon: resolveIcon('changeMarkAll'), open: () => { revealChangePanel(); confirmMarkAllChangesSeen(); } }
      ],
    });

    function goHome() {
      changePanelOpened = false;
      changePanel.hidden = true;
      ++loadVersion;
      saveSession();
      writeSessionValue(locationKey, null);
      activeMedia?.pause?.();
      continuingMedia?.pause?.();
      workspace.hidden = true;
      status.textContent = '';
      status.hidden = true;
      start.hidden = false;
	  window.plugins.viewer.currentAction = 'home';
	  if (typeof renderToolbar === 'function') renderToolbar();
    }

    registerPlugin('viewer-home', {
      mode: 'viewer',
      label: '回到起始畫面',
      order: 5,
      icon: 'viewerHome',
      open: goHome,
    });

    new MutationObserver(() => {
      if (window.viewMode !== 'viewer') {
        activeMedia?.pause?.();
        continuingMedia?.pause?.();
      }
    }).observe(content, { attributes: true, attributeFilter: ['style'] });

    this.render = (wrapper) => {
      content.classList.remove('viewer-dragging');
      content.style.display = '';
      wrapper.appendChild(content);	
      if (!initialized) {
        initialized = true;
        accessRecents().then(records => {
          renderRecents(records);
          const source = readSessionValue(locationKey);
          const record = source && records.find(item => viewerSourceKey(item) === source);
          if (record && window.viewerSetting?.get().autoOpen !== false && loadVersion === 0 && window.viewMode === 'viewer') {
            return openRecent(record, true);
          }
        }).catch(console.warn);
		
		
      }
    };

	return content;
  },
});
