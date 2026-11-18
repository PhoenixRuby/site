registerPlugin('card-sort', {
  icon: 'sort',
  label: '排序',
  mode: 'card',
  order: 6,
  requiresData: 'sort',
  open: null,

  load() {
    this.open = createPrioritySortDialog({
      id: 'cardSort',
      title: '排序卡片',
      availableLabel: '可選卡片',
      searchLabel: '搜尋卡片',
      titleLabel: '名稱',
      secondaryLabel: 'Icon',
      emptySecondary: '無 Icon',
      insufficient: '卡片不足，無需排序',
      getItems() {
        const ids = new Set(window.currentOrder.filter(id => Number.isInteger(id) && id > 0 && id <= window.data.length));
        window.data.forEach((_, index) => ids.add(index + 1));
        return Array.from(ids, id => {
          const card = window.data[id - 1];
          const icon = card.icon || '';
          return { id, title: card.title, secondary: icon.startsWith('data:') ? '自訂圖片' : icon };
        });
      },
      apply(ids) {
        window.plugins.card.applyCardOrder(ids);
        window.renderGrid();
      }
    });
    window.openSortModal = this.open;
  }
});
