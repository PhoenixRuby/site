/* Bookmark data operations. Keeps the existing bookmarkData schema. */
registerPlugin('bookmark-data', {
  mode: 'bookmark', hideToolbar: true,
  load() {},
  get() { return window.bmGetData(); },
  commit() { window.bmSaveData(); window.renderBookmarks(); },
  save(input) {
    // Data-layer validation prevents unclassified bookmarks from other callers.
    const ids = Array.isArray(input.themeIds) ? [...new Set(input.themeIds.filter(id => typeof id === 'string' && id !== 'all'))] : [];
    const data = this.get();
    const pending = Array.isArray(input.newThemes) ? input.newThemes : [];
    const allowed = new Set([...data.themes, ...pending].filter(t => t.id !== 'all').map(t => t.id));
    if (!ids.length || ids.some(id => !allowed.has(id))) throw new Error('請至少選擇一個有效主題');
    input = { ...input, themeIds: ids };
    const editing = input.id && data.favorites.find(f => f.id === input.id);
    const fav = editing || { id: 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) };
    const fields = ['themeIds','title','url','content','thumbnail','notionUrl','notionId','codeLang'];
    fields.forEach(key => { fav[key] = input[key]; });
    delete fav.themeId;
    if (!editing) data.favorites.push(fav);
    if (Array.isArray(input.newThemes) && input.newThemes.length) data.themes.push(...input.newThemes);
    this.commit();
    return fav;
  },
  remove(id) {
    const data = this.get();
    const index = data.favorites.findIndex(f => f.id === id);
    if (index < 0) return false;
    data.favorites.splice(index, 1);
    this.commit();
    return true;
  }
});
