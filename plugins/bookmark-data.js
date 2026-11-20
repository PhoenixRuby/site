/* Bookmark data operations. Keeps the existing bookmarkData schema. */
registerPlugin('bookmark-data', {
  mode: 'bookmark', hideToolbar: true,
  load() {},
  guestContent(favorite, themes) {
    const { id, themeId, themeIds, ...content } = favorite;
    const groups = [...new Set(themeIds ?? (themeId ? [themeId] : []))]
      .filter(id => id !== 'all').map(id => {
        const theme = themes.find(theme => theme.id === id);
        if (!theme) throw new Error('訪客書籤缺少對應主題。');
        const { id: ignored, ...value } = theme;
        return value;
      });
    const stable = value => JSON.stringify(value, (_, item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
    return stable({ ...content, themes: groups.map(stable).sort() });
  },
  guestPlan(data, incoming) {
    if (!data || !Array.isArray(data.themes) || !Array.isArray(data.favorites)) {
      throw new Error('書籤資料格式不正確。');
    }
    const content = favorite => this.guestContent(favorite, data.themes);
    const saved = new Set(data.favorites.map(content));
    const rows = incoming.map(entry => {
      const matches = entry.card.id == null ? [] : data.favorites.flatMap((favorite, index) =>
        favorite.id === entry.card.id ? [index] : []);
      return { ...entry, found: matches[0] ?? -1, cloud: data.favorites[matches[0]],
        identical: saved.has(this.guestContent(entry.card, entry.themes)), canReplace: matches.length === 1 };
    });
    return {
      rows, cloudCardCount: data.favorites.length,
      build: choices => {
        const next = JSON.parse(JSON.stringify(data));
        const replaced = new Set();
        const ids = new Set(next.favorites.map(favorite => favorite.id));
        const names = new Set(next.favorites.map(favorite => favorite.title));
        let changed = 0;
        rows.forEach((row, index) => {
          const choice = choices[index];
          if (row.identical || !choice || choice === 'skip') return;
          if (!['add', 'copy', 'replace'].includes(choice)) throw new Error('訪客書籤選項無效。');
          if (choice === 'replace' && (!row.canReplace || replaced.has(row.found))) {
            throw new Error('同一個書籤 ID 只能覆蓋一次。');
          }
          const favorite = JSON.parse(JSON.stringify(row.card));
          favorite.themeIds = [...new Set(favorite.themeIds ?? (favorite.themeId ? [favorite.themeId] : []))]
            .filter(id => id !== 'all').map(id => {
              const source = row.themes.find(theme => theme.id === id);
              if (!source) throw new Error('訪客書籤缺少對應主題。');
              const themeContent = theme => { const { id, ...rest } = theme; return JSON.stringify(rest, Object.keys(rest).sort()); };
              let target = next.themes.find(theme => theme.id !== 'all' && themeContent(theme) === themeContent(source));
              if (!target) {
                target = { ...source };
                if (next.themes.some(theme => theme.id === target.id)) {
                  do { target.id = crypto.randomUUID(); } while (next.themes.some(theme => theme.id === target.id));
                }
                next.themes.push(target);
              }
              return target.id;
            });
          delete favorite.themeId;
          if (choice === 'replace') {
            replaced.add(row.found);
            next.favorites[row.found] = favorite;
          } else {
            const conflict = ids.has(favorite.id);
            if (choice === 'copy' || favorite.id == null || conflict) {
              do { favorite.id = crypto.randomUUID(); } while (ids.has(favorite.id));
            }
            if (choice === 'copy' || conflict) {
              const title = favorite.title || '未命名書籤';
              let suffix = 1;
              do { favorite.title = title + ' (' + suffix++ + ')'; } while (names.has(favorite.title));
            }
            next.favorites.push(favorite);
          }
          ids.add(favorite.id);
          names.add(favorite.title);
          changed++;
        });
        return changed ? next : null;
      }
    };
  },
  get() { return window.bmGetData(); },
  commit() { window.bmSaveData(); window.renderBookmarks(); },
  async save(input) {
    // Data-layer validation prevents unclassified bookmarks from other callers.
    const ids = Array.isArray(input.themeIds) ? [...new Set(input.themeIds.filter(id => typeof id === 'string' && id !== 'all'))] : [];
    const data = this.get();
    const pending = Array.isArray(input.newThemes) ? input.newThemes : [];
    const allowed = new Set([...data.themes, ...pending].filter(t => t.id !== 'all').map(t => t.id));
    if (!ids.length || ids.some(id => !allowed.has(id))) throw new Error('請至少選擇一個有效主題');
    input = { ...input, themeIds: ids };
    const editing = input.id && data.favorites.find(f => f.id === input.id);
    const fav = editing ? { ...editing } : { id: 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) };
    const fields = ['themeIds','title','url','content','thumbnail','notionUrl','notionId','codeLang'];
    fields.forEach(key => { fav[key] = input[key]; });
    delete fav.themeId;
    const favorites = editing ? data.favorites.map(item => item === editing ? fav : item) : [...data.favorites, fav];
    const themes = [...data.themes, ...pending];
    AccountStorage.setItem('bookmarkData', JSON.stringify({ ...data, favorites, themes }));
    await AccountStorage.flush();
    data.favorites = favorites;
    data.themes = themes;
    window.renderBookmarks();
    renderToolbar();
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
