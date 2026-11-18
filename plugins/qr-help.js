(() => {
  'use strict';

  const source = document.currentScript?.src || new URL('plugins/qr-help.js', document.baseURI);
  let dialog;

  registerPlugin('qr-help', {
    icon: 'help',
    label: '教學',
    mode: 'qr',
    order: 99,
    open() {
      dialog ??= MdDialog.create({
        id: 'qr-help-dialog',
        icon: 'help',
        title: '使用說明',
        subtitle: '查看操作方式。',
        searchLabel: '搜尋教學',
        dataUrl: new URL('../md/generated/qr-help-data.js', source),
        dataKey: 'qrHelpMarkdown'
      });
      dialog.open();
    }
  });
})();
