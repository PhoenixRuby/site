(() => {
  'use strict';

  const source = document.currentScript?.src || new URL('plugins/bookmark-help.js', document.baseURI);
  let dialog;

  registerPlugin('bookmark-help', {
    icon: 'help',
    label: '教學',
    mode: 'bookmark',
    order: 99,
    open() {
      dialog ??= MdDialog.create({
        id: 'bookmark-help-dialog',
        icon: 'help',
        title: '使用說明',
        subtitle: '查看操作方式。',
        searchLabel: '搜尋教學',
        dataUrl: new URL('../md/generated/bookmark-help-data.js', source),
        dataKey: 'bookmarkHelpMarkdown'
      });
      dialog.open();
    }
  });
})();
