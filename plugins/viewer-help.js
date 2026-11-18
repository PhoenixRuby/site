(() => {
  'use strict';

  const source = document.currentScript?.src || new URL('plugins/viewer-help.js', document.baseURI);

  registerPlugin('viewer-help', {
    icon: 'help',
    label: '教學',
    mode: 'viewer', 
    order: 99, 
    open: null,
    close: null,
    load(content) {
      if (!content) {
        throw new Error('viewer-help: 找不到主插件 DOM');
      }
      this.init(content);
    },

    init(content) {
      Object.assign(this, MdDialog.create({
        id: 'vwHelpModalBg',
        icon: this.icon,
        title: '關於這個檢視器',
        subtitle: '查看檔案開啟方式、檢視功能與快捷鍵。',
        searchLabel: '搜尋教學內容',
        placeholder: '搜尋教學，例如「授權」',
        dialogClass: 'viewer-about',
        contentClass: 'viewer-help-content',
        sectionClass: 'viewer-help-section',
        dataUrl: new URL('../md/generated/viewer-help-data.js', source),
        dataKey: 'viewerHelpMarkdown'
      }));
      content.querySelector('[data-viewer-about]')?.addEventListener('click', this.open);
    }
  });
})();
