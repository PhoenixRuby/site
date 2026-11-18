registerPlugin('bookmark-sort', {
  icon: 'sort',
  label: '排序',
  order: 50,
  mode: 'bookmark',
  hideToolbar: false,
  requiresData: 'sort',
  open: null,

  load() {
    this.open = createPrioritySortDialog({
      id: 'bmSort',
      title: '排序書籤',
      availableLabel: '可選書籤',
      searchLabel: '搜尋書籤',
      titleLabel: '標題',
      secondaryLabel: 'URL',
      emptySecondary: '無網址',
      insufficient: '書籤不足，無需排序',
      getItems() {
        return window.bmGetVisibleFavorites().map(function(fav) {
          return { id: fav.id, title: fav.title, secondary: fav.url };
        });
      },
      apply(ids) {
        var data = window.bmGetData();
        var themeId = window.bmGetCurrentThemeId();
        var favoritesById = new Map(data.favorites.map(function(fav) { return [fav.id, fav]; }));
        var reordered = ids.map(function(id) { return favoritesById.get(id); }).filter(Boolean);
        if (themeId === 'all') {
          data.favorites = reordered;
        } else {
          var other = data.favorites.filter(function(fav) { return !fav.themeIds || fav.themeIds.indexOf(themeId) === -1; });
          data.favorites = other.concat(reordered);
        }
        window.bmSaveData();
        window.renderBookmarks();
      }
    });
  }
});
