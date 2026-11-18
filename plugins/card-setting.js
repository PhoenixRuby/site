registerPlugin('card-setting', {
  mode: 'card',
  label: '卡片設定',
  icon: 'setting',
  order: 98,
  storageKeys: ['card_show_preview', 'card_preview_open'],

  showPreview() {
    return AppStorage.load(this.storageKeys, 'card_show_preview') !== false;
  },

  openPreviewByDefault() {
    return AppStorage.load(this.storageKeys, 'card_preview_open') !== false;
  },

  open() {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';
    dialog.setAttribute('aria-labelledby', 'cardSettingTitle');
    dialog.innerHTML = `
      <div class="app-dialog-panel-medium cm-setting-panel">
        <header class="app-modal-header">
          <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('setting')}</span>
          <div class="app-modal-header-info">
            <h2 class="app-modal-header-title" id="cardSettingTitle">卡片設定</h2>
            <p class="app-modal-header-subtitle">管理卡片新增與編輯時的顯示選項。</p>
          </div>
          <button type="button" class="app-modal-header-close" aria-label="關閉">✕</button>
        </header>
        <div class="app-dialog-body cm-setting-body">
          <aside class="cm-setting-sidebar" aria-label="設定分類">
            <div class="cm-setting-category" aria-current="true">
              ${resolveIcon('card', null, 16)}
              <span>卡片編輯</span>
            </div>
          </aside>
          <section class="cm-setting-group" aria-labelledby="cardEditSettingsTitle">
            <h3 id="cardEditSettingsTitle">卡片編輯</h3>
            <label class="cm-setting-option">
              <input type="checkbox" name="showCardPreview" aria-describedby="cardPreviewSettingHint">
              <span>
                <strong>顯示卡片預覽</strong>
                <small id="cardPreviewSettingHint">在新增或編輯卡片時顯示預覽區。</small>
              </span>
            </label>
            <fieldset class="cm-setting-preview-state">
              <legend>預覽初始狀態</legend>
              <label>
                <input type="radio" name="cardPreviewState" value="expanded">
                <span class="cm-setting-state-choice">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l-4 6 4 6m6-12 4 6-4 6"/></svg>
                  預設展開
                </span>
              </label>
              <label>
                <input type="radio" name="cardPreviewState" value="collapsed">
                <span class="cm-setting-state-choice">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l4 6-4 6m14-12-4 6 4 6"/></svg>
                  預設收合
                </span>
              </label>
            </fieldset>
          </section>
        </div>
        <footer class="app-dialog-footer">
          <button type="button" class="btn-confirm" data-card-setting-apply>套用設定 ✓</button>
        </footer>
      </div>`;
    const checkbox = dialog.querySelector('[name="showCardPreview"]');
    const state = dialog.querySelector('.cm-setting-preview-state');
    const expanded = state.querySelector('[value="expanded"]');
    const collapsed = state.querySelector('[value="collapsed"]');
    checkbox.checked = this.showPreview();
    expanded.checked = this.openPreviewByDefault();
    collapsed.checked = !expanded.checked;
    const updateStateControls = () => { state.disabled = !checkbox.checked; };
    checkbox.addEventListener('change', updateStateControls);
    updateStateControls();
    function close() {
      ModalManager.closeDialog(dialog);
      dialog.remove();
    }
    dialog.querySelector('.app-modal-header-close').addEventListener('click', close);
    dialog.querySelector('[data-card-setting-apply]').addEventListener('click', () => {
      AppStorage.save(this.storageKeys, checkbox.checked, 'card_show_preview');
      AppStorage.save(this.storageKeys, expanded.checked, 'card_preview_open');
      close();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });
    document.body.append(dialog);
    ModalManager.showDialog(dialog, close);
  }
});
