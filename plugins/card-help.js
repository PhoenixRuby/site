(() => {
  'use strict';

  const source = document.currentScript?.src || new URL('plugins/card-help.js', document.baseURI);
  let dialog;

  registerPlugin('card-help', {
    icon: 'help',
    label: '教學',
    mode: 'card',
    order: 99,
    open() {
      dialog ??= MdDialog.create({
        id: 'cardHelpModalBg',
        icon: 'help',
        title: '卡片使用說明',
        subtitle: '查看卡片新增、編輯、預覽與儲存方式。',
        searchLabel: '搜尋卡片教學',
        placeholder: '搜尋教學，例如「預覽」',
        dataUrl: new URL('../md/generated/card-help-data.js', source),
        dataKey: 'cardHelpMarkdown'
      });
      dialog.open();
    }
  });
})();
