// Viewer 設定：正式插件註冊；左側分類、右側設定內容。
(() => {
  'use strict';
  const KEY = 'site-viewer-thumbnail-settings';
  const defaults = Object.freeze({ imageThumbnails: true, videoThumbnails: false, thumbnailGap: 12, thumbnailSize: 88, autoOpen: true, diffSyntaxHighlight: true, ...viewerDiffDefaults });
  const diffLimitFields = {
    diffHighlightMaxLines: ['語法高亮行數上限', '新舊兩版合計的行數。'],
    diffHighlightMaxChars: ['語法高亮字元數上限', '每版各自計算，換行統一後計數。'],
    diffMaxLines: ['逐行比對行數上限', '新舊兩版合計的行數。'],
    diffMaxCells: ['逐行比對計算上限', '移除相同的開頭與結尾後，剩餘舊版行數乘以剩餘新版行數。']
  };
  const diffLimitKeys = Object.keys(diffLimitFields);
  const read = () => {
    try {
      const saved = JSON.parse(AccountStorage.getItem(KEY) || '{}');
      return { autoOpen: typeof saved.autoOpen === 'boolean'
          ? saved.autoOpen
          : AccountStorage.getItem('site-viewer-auto-open') !== 'false',
        diffSyntaxHighlight: saved.diffSyntaxHighlight !== false,
        ...Object.fromEntries(diffLimitKeys.map(key => [
          key, Number.isSafeInteger(saved[key]) && saved[key] > 0 ? saved[key] : defaults[key]
        ])),
        imageThumbnails: saved.imageThumbnails !== false, videoThumbnails: saved.videoThumbnails === true, thumbnailGap: Number.isFinite(Number(saved.thumbnailGap)) ? Math.max(4, Math.min(40, Number(saved.thumbnailGap))) : 12,
        thumbnailSize: Number.isFinite(Number(saved.thumbnailSize)) && Number(saved.thumbnailSize) >= 80
          ? Math.max(80, Math.min(200, Number(saved.thumbnailSize)))
          : Math.max(80, Math.min(200, Number(AccountStorage.getItem('site-viewer-explorer-size')) || 88)) };
    } catch { return { ...defaults }; }
  };
  const write = value => { AccountStorage.setItem(KEY, JSON.stringify(value)); };
  window.viewerSetting = { get: read };

  registerPlugin('viewer-setting', {
    icon: 'setting',
    label: '檔案瀏覽設定',
    mode: 'viewer',
    order: 98,
    open() {
      if (!this.dialog) return;
      this.refreshSettings();
      this.dialog.showModal();
    },
    load(content) {
      if (!content) throw new Error('viewer-setting: 找不到主插件 DOM');
      const dialog = document.createElement('dialog');
      dialog.className = 'viewer-setting-dialog';
      dialog.setAttribute('aria-label', '檔案瀏覽設定');
      dialog.innerHTML = `
        <form class="viewer-setting-box">
          <header class="viewer-setting-header">
            <div class="viewer-setting-heading">
              <span class="viewer-setting-heading-icon" aria-hidden="true">${resolveIcon('setting')}</span>
              <div><h2 class="viewer-setting-title">檔案瀏覽設定</h2><p>管理上次開啟的資料夾與檔案縮圖</p></div>
            </div>
            <button type="button" class="viewer-setting-close" aria-label="關閉設定">✕</button>
          </header>
          <div class="viewer-setting-layout">
            <nav class="viewer-setting-nav" aria-label="設定分類">
              <button type="button" class="viewer-setting-nav-item active" aria-current="page" data-setting-page="thumbnails"><svg class="viewer-setting-nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="14" height="14" rx="2"/><path d="m10 13 3-3 2 2 2-2 2 3"/><path d="M3 8v11a2 2 0 0 0 2 2h11"/><circle cx="16" cy="7" r="1"/></svg><span>縮圖設定</span></button>
              <button type="button" class="viewer-setting-nav-item" data-setting-page="data">${resolveIcon('folder')}<span>資料設定</span></button>
            </nav>
            <section class="viewer-setting-content" aria-label="設定內容" tabindex="0">
              <div class="viewer-setting-page" data-setting-panel="thumbnails">
                <h2 id="viewer-setting-thumbnail-title">縮圖設定</h2>
                <div class="viewer-setting-option">
                  <label><input type="checkbox" name="imageThumbnails"><span class="viewer-setting-option-text"><strong>顯示圖片縮圖</strong><small>顯示 JPG、PNG、WebP 等圖片的預覽。</small></span></label>
                </div>
                <div class="viewer-setting-option">
                  <label><input type="checkbox" name="videoThumbnails"><span class="viewer-setting-option-text"><strong>顯示影片縮圖</strong><small>擷取影片影格作為縮圖，可能增加載入時間；不支援的格式仍顯示原本圖示。</small></span></label>
                </div>
                <div class="viewer-setting-option viewer-setting-spacing">
                  <div class="viewer-setting-option-text"><strong>縮圖大小</strong><small>調整檔案總管縮圖尺寸。</small></div>
                  <div class="viewer-setting-spacing-control"><input type="range" name="thumbnailSize" min="80" max="200" step="8" value="88" aria-label="縮圖大小"><output>88px</output><button type="button" class="viewer-setting-reset" data-reset="thumbnailSize" title="恢復預設 88px">↺ 重置</button></div>
                </div>
                <div class="viewer-setting-option viewer-setting-spacing">
                  <div class="viewer-setting-option-text"><strong>縮圖間距</strong><small>調整檔案總管中各個縮圖之間的距離。</small></div>
                  <div class="viewer-setting-spacing-control"><input type="range" name="thumbnailGap" min="4" max="40" step="2" value="12" aria-label="縮圖間距"><output>12px</output><button type="button" class="viewer-setting-reset" data-reset="thumbnailGap" title="恢復預設 12px">↺ 重置</button></div>
                </div>
              </div>
              <div class="viewer-setting-page" data-setting-panel="data">
                <h2 id="viewer-setting-data-title">資料設定</h2>
                <div class="viewer-setting-option">
                  <label><input type="checkbox" name="diffSyntaxHighlight" checked><span class="viewer-setting-option-text"><strong>文字版本比對的語法高亮</strong><small>適用於支援的格式。超過下方高亮上限時，仍會顯示可計算的差異。</small></span></label>
                </div>
                ${diffLimitKeys.map(key => {
                  const [label, description] = diffLimitFields[key];
                  return `<div class="viewer-setting-option">
                    <label><span class="viewer-setting-option-text"><strong>${label}</strong><small>${description}</small></span>
                      <input type="number" name="${key}" min="1" max="${Number.MAX_SAFE_INTEGER}" step="1" required>
                    </label>
                  </div>`;
                }).join('')}
                <div class="viewer-setting-option viewer-setting-spacing-control">
                  <button type="button" class="viewer-setting-reset" data-reset-diff-limits>↺ 恢復比對上限預設值</button>
                </div>
                <div class="viewer-setting-option">
                  <label><input type="checkbox" name="autoOpen" checked><span class="viewer-setting-option-text"><strong>重新整理時還原上次的資料夾</strong><small>需要授權時會先提示。</small></span></label>
                </div>
              </div>
            </section>
          </div>
          <footer class="viewer-setting-footer"><span class="setting-unsaved viewer-setting-unsaved" aria-live="polite"></span><button type="button" class="viewer-setting-done">套用設定 <span aria-hidden="true">✓</span></button></footer>
        </form>`;
      content.append(dialog);
      this.dialog = dialog;
      const settingsContent = dialog.querySelector('.viewer-setting-content');
      const pages = [...dialog.querySelectorAll('[data-setting-panel]')];
      const navButtons = [...dialog.querySelectorAll('[data-setting-page]')];
      const pageOffset = page => settingsContent.scrollTop +
        page.getBoundingClientRect().top - settingsContent.getBoundingClientRect().top;

      function syncNavigation() {
        const { scrollTop, scrollHeight, clientHeight } = settingsContent;
        const atBottom = scrollTop > 0 && scrollHeight - scrollTop - clientHeight <= 2;
        const current = atBottom ? pages.at(-1) : pages.findLast(page => pageOffset(page) <= scrollTop + 2) || pages[0];
        for (const button of navButtons) {
          const active = button.dataset.settingPage === current.dataset.settingPanel;
          button.classList.toggle('active', active);
          if (active) button.setAttribute('aria-current', 'page');
          else button.removeAttribute('aria-current');
        }
      }

      for (const button of navButtons) {
        button.addEventListener('click', () => {
          const page = pages.find(item => item.dataset.settingPanel === button.dataset.settingPage);
          settingsContent.scrollTo({
            top: pageOffset(page),
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
          });
        });
      }
      settingsContent.addEventListener('scroll', syncNavigation, { passive: true });
      const controls = Object.fromEntries(['autoOpen', 'imageThumbnails', 'videoThumbnails', 'diffSyntaxHighlight', ...diffLimitKeys].map(k => [k, dialog.querySelector('[name="' + k + '"]')]));
      this.controls = controls;
      const gapInput = dialog.querySelector('[name="thumbnailGap"]');
      const gapOutput = gapInput.nextElementSibling;
      this.gapInput = gapInput;
      this.gapOutput = gapOutput;
      const sizeInput = dialog.querySelector('[name="thumbnailSize"]');
      const sizeOutput = sizeInput.nextElementSibling;
      const title = dialog.querySelector('.viewer-setting-title');
      const unsaved = dialog.querySelector('.viewer-setting-unsaved');
      const apply = dialog.querySelector('.viewer-setting-done');
      let baseline = read();
      let edited = false;

      const currentValue = () => ({
        autoOpen: controls.autoOpen.checked,
        diffSyntaxHighlight: controls.diffSyntaxHighlight.checked,
        ...Object.fromEntries(diffLimitKeys.map(key => [key, controls[key].valueAsNumber])),
        imageThumbnails: controls.imageThumbnails.checked,
        videoThumbnails: controls.videoThumbnails.checked,
        thumbnailGap: Number(gapInput.value),
        thumbnailSize: Number(sizeInput.value)
      });
      const syncEdited = () => {
        const value = currentValue();
        const changed = Object.keys(baseline).some(key => value[key] !== baseline[key]);
        if (changed !== edited) {
          edited = changed;
          if (changed) markEdited(title);
          else clearEdited(title);
        }
        unsaved.textContent = changed ? '● 尚未套用變更' : '';
      };
      const refresh = () => {
        baseline = read();
        controls.autoOpen.checked = baseline.autoOpen;
        controls.diffSyntaxHighlight.checked = baseline.diffSyntaxHighlight;
        for (const key of diffLimitKeys) controls[key].value = baseline[key];
        controls.imageThumbnails.checked = baseline.imageThumbnails;
        controls.videoThumbnails.checked = baseline.videoThumbnails;
        sizeInput.value = String(baseline.thumbnailSize);
        sizeOutput.textContent = baseline.thumbnailSize + 'px';
        gapInput.value = String(baseline.thumbnailGap);
        gapOutput.textContent = baseline.thumbnailGap + 'px';
        syncEdited();
      };
      this.refreshSettings = refresh;

      // 編輯期間只更新表單暫存值；不寫入 localStorage、不更新檔案總管。
      sizeInput.addEventListener('input', () => { sizeOutput.textContent = sizeInput.value + 'px'; syncEdited(); });
      gapInput.addEventListener('input', () => {
        gapOutput.textContent = gapInput.value + 'px';
        syncEdited();
      });
      dialog.querySelectorAll('.viewer-setting-reset').forEach(button => {
        button.addEventListener('click', () => {
          const key = button.dataset.reset;
          const input = key === 'thumbnailSize' ? sizeInput : gapInput;
          const output = key === 'thumbnailSize' ? sizeOutput : gapOutput;
          input.value = String(defaults[key]);
          output.textContent = input.value + 'px';
          syncEdited();
        });
      });
      dialog.querySelector('[data-reset-diff-limits]').addEventListener('click', () => {
        for (const key of diffLimitKeys) controls[key].value = defaults[key];
        syncEdited();
      });
      for (const key of diffLimitKeys) controls[key].addEventListener('input', syncEdited);
      dialog.addEventListener('change', event => {
        if (event.target.matches('input[type="checkbox"], input[type="range"]')) syncEdited();
      });
      const closeSettings = () => {
        if (!edited) { dialog.close(); return; }
        // 與工具列設定共用 guard.js 的未儲存變更確認流程。
        confirmLeave(true, () => { dialog.close(); refresh(); });
      };
      dialog.querySelector('.viewer-setting-close').addEventListener('click', closeSettings);
      dialog.addEventListener('click', event => {
        if (event.target === dialog) closeSettings();
      });
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeSettings();
      });
      dialog.querySelector('form').addEventListener('submit', event => event.preventDefault());
      apply.addEventListener('click', () => {
        for (const key of diffLimitKeys) {
          if (!controls[key].reportValidity()) return;
        }
        const value = currentValue();
        try {
          write(value);
          content.dispatchEvent(new CustomEvent('viewer-settings-change', { detail: value }));
          dialog.close();
          refresh();
        } catch (error) {
          console.error('Viewer 設定套用失敗:', error);
        }
      });
      refresh();
    }
  });
})();
