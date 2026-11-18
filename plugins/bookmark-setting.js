// 書籤頁籤設定：參照 viewer-setting 的正式子插件、dialog、暫存與離開確認。
(() => {
  'use strict';
  const POSITIONS = ['top', 'left', 'right', 'bottom'];
  const OVERFLOWS = ['scroll', 'dropdown', 'wrap'];
  const normalize = value => ({
    position: POSITIONS.includes(value?.position) ? value.position : 'top',
    overflow: OVERFLOWS.includes(value?.overflow) ? value.overflow : 'scroll'
  });

  registerPlugin('bookmark-setting', {
    icon: 'setting',
    label: '頁籤設定',
    mode: 'bookmark',
    order: 98,
    open(options) {
      if (!options) {
        const bookmark = window.plugins?.['bookmark'];
        if (!bookmark) return console.error('Bookmark 插件尚未註冊');
        options = {
          position: bookmark.loadData('bookmarkTabPos') || 'top',
          overflow: bookmark.loadData('bookmarkTabOverflow') || 'scroll',
          onApply(next) {
            bookmark.saveData(next.position, 'bookmarkTabPos');
            bookmark.saveData(next.overflow, 'bookmarkTabOverflow');
            bookmark.applyTabSettings?.(next);
          }
        };
      }
      if (!this.dialog) this.load();
      if (this.dialog.open) return;
      this.onApply = options?.onApply;
      this.baseline = normalize(options || {});
      this.draft = { ...this.baseline };
      this.refreshSettings();
      this.dialog.showModal();
    },
    load(content) {
      if (this.dialog?.isConnected) return;
      const dialog = document.createElement('dialog');
      dialog.className = 'bookmark-setting-dialog app-dialog';
      dialog.setAttribute('aria-label', '頁籤設定');
      dialog.innerHTML = `
        <form class="bookmark-setting-box tb-settings app-dialog-panel-medium" method="dialog">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('setting')}</span>
            <div class="app-modal-header-info"><h2 class="app-modal-header-title bookmark-setting-title">頁籤設定</h2><p class="app-modal-header-subtitle">自訂書籤頁籤的位置與顯示方式</p></div>
            <button type="button" class="app-modal-header-close bookmark-setting-close" aria-label="關閉設定">✕</button>
          </header>
          <div class="setting-content app-dialog-body">
            <section class="setting-section">
              <div class="setting-section-title"><span>頁籤位置</span><small>選擇頁籤所在的畫面邊緣</small></div>
              <div class="setting-position-layout">
                <div class="setting-position-grid" role="group" aria-label="頁籤位置">
                  <button type="button" class="setting-pos setting-pos-top" data-pos="top">↑ 上方</button>
                  <button type="button" class="setting-pos setting-pos-left" data-pos="left">← 左側</button>
                  <div class="setting-position-preview" aria-hidden="true"><span class="setting-preview-bar"></span><span class="setting-preview-line"></span><span class="setting-preview-line short"></span></div>
                  <button type="button" class="setting-pos setting-pos-right" data-pos="right">右側 →</button>
                  <button type="button" class="setting-pos setting-pos-bottom" data-pos="bottom">↓ 下方</button>
                </div>
              </div>
            </section>
            <section class="setting-section">
              <div class="setting-section-title"><span>頁籤溢出</span><small>上方或下方頁籤過多時的呈現方式</small></div>
              <div class="setting-segments bookmark-setting-overflow" role="group" aria-label="頁籤溢出">
                <button type="button" class="setting-segment" data-of="scroll">捲動</button>
                <button type="button" class="setting-segment" data-of="dropdown">下拉選單</button>
                <button type="button" class="setting-segment" data-of="wrap">多行</button>
              </div>
              <small class="bookmark-setting-hint" hidden>左右側頁籤不使用水平溢出模式</small>
            </section>
          </div>
          <footer class="app-dialog-footer">
            <span class="bookmark-setting-unsaved setting-unsaved" aria-live="polite"></span>
            <button type="button" class="bookmark-setting-done setting-apply btn-confirm">套用設定 <span aria-hidden="true">✓</span></button>
          </footer>
        </form>`;
      (content || document.body).appendChild(dialog);
      this.dialog = dialog;
      const title = dialog.querySelector('.bookmark-setting-title');
      const unsaved = dialog.querySelector('.bookmark-setting-unsaved');
      const changed = () => this.draft.position !== this.baseline.position ||
        ((['top','bottom'].includes(this.draft.position) ? this.draft.overflow : 'scroll') !==
         (['top','bottom'].includes(this.baseline.position) ? this.baseline.overflow : 'scroll'));
      const sync = () => {
        const dirty = changed();
        if (dirty && typeof markEdited === 'function') markEdited(title);
        else if (!dirty && typeof clearEdited === 'function') clearEdited(title);
        unsaved.textContent = dirty ? '● 尚未套用變更' : '';
      };
      const preview = dialog.querySelector('.setting-position-preview');
      this.refreshSettings = () => {
        preview.dataset.position = this.draft.position;
        dialog.querySelectorAll('[data-pos]').forEach(button => {
          const active = button.dataset.pos === this.draft.position;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        const horizontal = ['top','bottom'].includes(this.draft.position);
        dialog.querySelectorAll('[data-of]').forEach(button => {
          button.disabled = !horizontal;
          const active = horizontal && button.dataset.of === this.draft.overflow;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        dialog.querySelector('.bookmark-setting-hint').hidden = horizontal;
        sync();
      };
      dialog.querySelectorAll('[data-pos]').forEach(button => button.addEventListener('click', () => {
        this.draft.position = button.dataset.pos;
        this.refreshSettings();
      }));
      dialog.querySelectorAll('[data-of]').forEach(button => button.addEventListener('click', () => {
        if (button.disabled) return;
        this.draft.overflow = button.dataset.of;
        this.refreshSettings();
      }));
      const close = () => {
        if (!changed()) { dialog.close(); return; }
        const discard = () => { dialog.close(); this.draft = { ...this.baseline }; this.refreshSettings(); };
        if (typeof confirmLeave === 'function') confirmLeave(true, discard);
        else if (window.confirm('設定尚未套用，確定放棄變更？')) discard();
      };
      dialog.querySelector('.bookmark-setting-close').addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
      dialog.querySelector('form').addEventListener('submit', event => event.preventDefault());
      dialog.querySelector('.bookmark-setting-done').addEventListener('click', () => {
        const next = { position: this.draft.position,
          overflow: ['top','bottom'].includes(this.draft.position) ? this.draft.overflow : 'scroll' };
        try {
          if (typeof this.onApply === 'function') this.onApply(next);
          this.baseline = { ...next };
          this.draft = { ...next };
          dialog.close();
          this.refreshSettings();
        } catch (error) { console.error('書籤頁籤設定套用失敗:', error); }
      });
    }
  });
})();
