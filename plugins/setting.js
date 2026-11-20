/* Toolbar Settings — self-contained plugin */
(function () {
  'use strict';

  const icon = (name) => ({
    monitor: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  })[name];
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;

  registerPlugin('setting', {
    main: false,
    menuOrder: null,
    menuIcon: null,
    mode: null,
    icon: 'setting',
    label: '設定',
    order: 10,
    toolbarPosition: 'bottom',
    hideToolbar: false,
    requiresData: false,
    favicon: null,
    render: null,
    initialized: false,
    async load() {
      if (this.initialized) return;
      await loadPluginCss('setting');
      this.init();
      this.initialized = true;
    },
    init() {},
    open() { openSettingsDialog(); }
  });

  function openSettingsDialog() {
    if (document.getElementById('tbSettingsBg')) return;

    let pendingPos = tbPos;
    let pendingLabels = tbLabels;
    let pendingAlign = tbAlign;
    let pendingTheme = appTheme;
    let settingsEdited = false;

    const bg = document.createElement('dialog');
    bg.className = 'app-dialog';
    bg.setAttribute('aria-labelledby', 'tbSettingsTitle');
    bg.id = 'tbSettingsBg';
    bg.innerHTML = `
      <section class="tb-settings app-dialog-panel-medium">
        <header class="app-modal-header">
          <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('setting')}</span>
          <div class="app-modal-header-info">
            <h2 id="tbSettingsTitle" class="app-modal-header-title">工具列設定</h2>
            <p class="app-modal-header-subtitle">自訂工具列的外觀與位置</p>
          </div>
          <button type="button" class="app-modal-header-close" aria-label="關閉設定" autofocus>${svg('x')}</button>
        </header>
        <div class="setting-content app-dialog-body">
          <section class="setting-section">
            <div class="setting-section-title"><span>工具列位置</span><small>選擇停靠的畫面邊緣</small></div>
            <div class="setting-position-layout">
              <div class="setting-position-grid" role="group" aria-label="工具列位置">
                <button type="button" class="setting-pos setting-pos-top" data-pos="top">↑ 上方</button>
                <button type="button" class="setting-pos setting-pos-left" data-pos="left">← 左側</button>
                <div class="setting-position-preview" aria-hidden="true"><span class="setting-preview-bar"></span><span class="setting-preview-line"></span><span class="setting-preview-line short"></span></div>
                <button type="button" class="setting-pos setting-pos-right" data-pos="right">右側 →</button>
                <button type="button" class="setting-pos setting-pos-bottom" data-pos="bottom">↓ 下方</button>
              </div>
            </div>
          </section>
          <section class="setting-section setting-row">
            <div class="setting-section-title"><span>顯示按鈕名稱</span><small>在工具列圖示旁顯示文字</small></div>
            <button type="button" class="setting-switch" id="tbLabelSwitch" role="switch" aria-label="顯示按鈕名稱"><span></span></button>
          </section>
          <section class="setting-section">
            <div class="setting-section-title"><span>按鈕對齊</span><small>調整工具列按鈕的排列方式</small></div>
            <div class="setting-segments" role="group" aria-label="按鈕對齊">
              <button type="button" class="setting-segment" data-align="center">置中</button>
              <button type="button" class="setting-segment" data-align="start">靠上／靠左</button>
            </div>
          </section>
          <section class="setting-section">
            <div class="setting-section-title"><span>外觀主題</span><small>選擇偏好的顯示模式</small></div>
            <div class="setting-themes" role="group" aria-label="外觀主題">
              <button type="button" class="setting-theme" data-theme="system">${svg('monitor')}<span>系統</span></button>
              <button type="button" class="setting-theme" data-theme="light">${svg('sun')}<span>亮色</span></button>
              <button type="button" class="setting-theme" data-theme="dark">${svg('moon')}<span>暗色</span></button>
            </div>
          </section>
          <section class="setting-section" aria-labelledby="settingStorageTitle">
            <div class="setting-row">
              <div class="setting-section-title">
                <span id="settingStorageTitle">本機儲存空間</span>
                <small>目前站台共用的估計用量與配額</small>
              </div>
              <button type="button" class="setting-segment setting-storage-refresh">重新查詢</button>
            </div>
            <p class="setting-storage-status" role="status">讀取中…</p>
          </section>
        </div>
        <footer class="app-dialog-footer">
          <span class="setting-unsaved" aria-live="polite"></span>
          <button type="button" class="setting-apply btn-confirm">套用設定 ${svg('check')}</button>
        </footer>
      </section>`;
    document.body.appendChild(bg);
    const title = bg.querySelector('#tbSettingsTitle');
    const unsaved = bg.querySelector('.setting-unsaved');
    const apply = bg.querySelector('.setting-apply');
    const storageStatus = bg.querySelector('.setting-storage-status');
    const refreshStorage = bg.querySelector('.setting-storage-refresh');

    function formatStorageSize(bytes) {
      const gib = bytes >= 2 ** 30;
      return (bytes / (gib ? 2 ** 30 : 2 ** 20)).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) +
        (gib ? ' GiB' : ' MiB');
    }

    async function showStorageEstimate() {
      if (typeof navigator.storage?.estimate !== 'function') {
        storageStatus.textContent = '目前瀏覽器無法提供站台儲存估計值。';
        refreshStorage.disabled = true;
        return;
      }
      refreshStorage.disabled = true;
      storageStatus.textContent = '讀取中…';
      try {
        const { usage, quota } = await navigator.storage.estimate();
        const used = Number.isFinite(usage) ? formatStorageSize(usage) : '未知';
        const limit = Number.isFinite(quota) ? formatStorageSize(quota) : '未知';
        storageStatus.textContent = '已使用 ' + used + '，站台配額 ' + limit;
      } catch {
        storageStatus.textContent = '無法取得站台儲存估計值，可重新查詢。';
      } finally {
        refreshStorage.disabled = false;
      }
    }

    refreshStorage.addEventListener('click', showStorageEstimate);
    void showStorageEstimate();


    function sync() {
      bg.querySelectorAll('[data-pos]').forEach(btn => {
        const active = btn.dataset.pos === pendingPos;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      bg.querySelector('.setting-position-preview').dataset.position = pendingPos;
      const toggle = bg.querySelector('#tbLabelSwitch');
      toggle.classList.toggle('on', pendingLabels);
      toggle.setAttribute('aria-checked', String(pendingLabels));
      bg.querySelectorAll('[data-align]').forEach(btn => {
        const active = btn.dataset.align === pendingAlign;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      bg.querySelectorAll('[data-theme]').forEach(btn => {
        const active = btn.dataset.theme === pendingTheme;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      const changed = pendingPos !== tbPos || pendingLabels !== tbLabels || pendingAlign !== tbAlign || pendingTheme !== appTheme;
      if (changed !== settingsEdited) {
        settingsEdited = changed;
        if (changed) markEdited(title);
        else clearEdited(title);
      }
      unsaved.textContent = changed ? '● 尚未套用變更' : '';
    }

    function removeDialog() {
      ModalManager.closeDialog(bg);
      bg.remove();
    }
    function closeSettings() { confirmLeave(settingsEdited, removeDialog); }
    bg.addEventListener('click', e => { if (e.target === bg) closeSettings(); });
    bg.querySelector('.app-modal-header-close').addEventListener('click', closeSettings);
    bg.querySelectorAll('[data-pos]').forEach(btn => btn.addEventListener('click', () => { pendingPos = btn.dataset.pos; sync(); }));
    bg.querySelector('#tbLabelSwitch').addEventListener('click', () => { pendingLabels = !pendingLabels; sync(); });
    bg.querySelectorAll('[data-align]').forEach(btn => btn.addEventListener('click', () => { pendingAlign = btn.dataset.align; sync(); }));
    bg.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => { pendingTheme = btn.dataset.theme; sync(); }));
    apply.addEventListener('click', () => {
      tbPos = pendingPos;
      tbLabels = pendingLabels;
      tbAlign = pendingAlign;
      appTheme = pendingTheme;
      localStorage.setItem(TB_POS_KEY, tbPos);
      localStorage.setItem(TB_LABELS_KEY, tbLabels);
      localStorage.setItem(TB_ALIGN_KEY, tbAlign);
      localStorage.setItem(TB_THEME_KEY, appTheme);
      applyTheme();
      removeDialog();
      switchMode(viewMode);
    });
    sync();
    ModalManager.showDialog(bg, closeSettings);
  }
})();
