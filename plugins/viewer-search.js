// Viewer 全文搜尋工具列入口；搜尋功能仍由 viewer.js 負責。
(() => {
  'use strict';
  registerPlugin('viewer-search', {
    mode: 'viewer',
    label: '全文搜尋',
    icon: 'search',
    order: 24,
    hideToolbar() {
      return window.plugins.viewer?.currentAction === 'home';
    },
    open() {
      document.getElementById('siteViewer')?.dispatchEvent(new Event('viewer-open-search'));
    },
    load(content) {
      if (!content) throw new Error('viewer-search: 找不到主插件 DOM');
    }
  });
})();
