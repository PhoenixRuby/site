registerPlugin('img-sort', {
  icon: 'sort',
  label: '排序',
  mode: 'img',
  order: 15,
  requiresData: 'sort',
  open: null,

  load() {
    let stamps = [];
    this.open = createPrioritySortDialog({
      id: 'isSort',
      title: '排序母片',
      availableLabel: '可選母片',
      searchLabel: '搜尋母片',
      titleLabel: '名稱',
      secondaryLabel: '文字數',
      emptySecondary: '無文字',
      insufficient: '母片不足，無需排序',
      getItems() {
        stamps = window.isLoadStamps();
        return stamps.map((stamp, id) => ({
          id,
          title: stamp.name,
          secondary: (stamp.texts || []).length + ' 個文字'
        }));
      },
      apply(ids) {
        window.isSaveStamps(ids.map(id => stamps[id]));
        window.isRenderGallery();
      }
    });
  }
});
