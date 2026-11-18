registerPlugin('qr-sort', {
  icon: 'sort',
  label: '排序',
  mode: 'qr',
  order: 2,
  requiresData: 'sort',
  open: null,

  load() {
    let items = [];
    this.open = createPrioritySortDialog({
      id: 'qrSort',
      title: '排序 QR Code',
      availableLabel: '可選 QR Code',
      searchLabel: '搜尋 QR Code',
      titleLabel: '名稱',
      secondaryLabel: '內容',
      emptySecondary: '無內容',
      insufficient: 'QR Code 不足，無需排序',
      getItems() {
        items = window.qrLoadData();
        return items.map((item, id) => ({ id, title: item.name, secondary: item.text }));
      },
      apply(ids) {
        window.qrSaveData(ids.map(id => items[id]));
        window.qrRenderGallery();
      }
    });
  }
});
