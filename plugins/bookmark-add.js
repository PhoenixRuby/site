/* Toolbar entry for the two-step bookmark wizard. */
registerPlugin('bookmark-add', {
  icon: 'add', label: '新增書籤', order: 10, mode: 'bookmark',
  open() { window.plugins['bookmark-editor'].open(); },
  load() {}
});
