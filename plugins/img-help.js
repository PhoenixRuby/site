(() => {
  'use strict';

  const source = document.currentScript?.src || new URL('plugins/img-help.js', document.baseURI);
  let dialog;

  registerPlugin('img-help', {
    icon: 'help',
    label: '教學',
    mode: 'img',
    order: 99,
    open() {
      dialog ??= MdDialog.create({
        id: 'img-help-dialog',
        icon: 'help',
        title: '使用說明',
        subtitle: '查看操作方式。',
        searchLabel: '搜尋教學',
        dataUrl: new URL('../md/generated/img-help-data.js', source),
        dataKey: 'imgHelpMarkdown'
      });
      dialog.open();
    }
  });
})();
