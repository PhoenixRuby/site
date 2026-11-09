registerPlugin('bookmark-search', {
  icon: window.CARD_ICONS.search,
  label: '搜尋',
  order: 5, mode: 'bookmark',
  hideToolbar: true,

  init: function() {

    // ── CSS ──────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = '\
      .bm-search-bg{position:fixed;inset:0;z-index:350;display:flex;align-items:flex-start;justify-content:center;padding-top:60px;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(2px)}\
      .bm-search-bg.open{opacity:1;pointer-events:all}\
      .bm-search-box{background:var(--surface);border:1px solid var(--accent);border-radius:12px;width:min(560px,92vw);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(-10px) scale(.98);transition:transform .25s cubic-bezier(.22,1,.36,1)}\
      .bm-search-bg.open .bm-search-box{transform:translateY(0) scale(1)}\
      .bm-search-header{display:flex;align-items:flex-start;border-bottom:1px solid var(--border)}\
      .bm-tag-input-wrap{flex:1;display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:10px 12px;cursor:text;min-height:46px}\
      .bm-stag{display:inline-flex;align-items:center;gap:2px;padding:2px 6px 2px 10px;border-radius:5px;background:rgba(81,203,238,.15);border:1px solid var(--accent);color:var(--accent);font-size:12px;white-space:nowrap;flex-shrink:0}\
      .bm-stag-x{cursor:pointer;opacity:.55;font-size:15px;line-height:1;padding:0 2px;margin-left:1px}\
      .bm-stag-x:hover{opacity:1}\
      .bm-search-input{border:none;background:transparent;color:var(--text);font-size:14px;outline:none;font-family:inherit;min-width:80px;flex:1;padding:2px 4px}\
      .bm-search-selall{padding:8px 12px;border:none;background:transparent;color:var(--accent);cursor:pointer;font-size:12px;white-space:nowrap;flex-shrink:0;align-self:center}\
      .bm-search-selall:hover{text-decoration:underline}\
      .bm-search-results{flex:1;overflow-y:auto;padding:0;max-height:50vh}\
      .bm-search-item{padding:8px 16px;cursor:pointer;font-size:13px;color:var(--text-dim);display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--surface2);user-select:none}\
      .bm-search-item:last-child{border-bottom:none}\
      .bm-search-item:hover{background:var(--surface2)}\
      .bm-search-item.selected{background:rgba(81,203,238,.08)}\
      .bm-search-item input[type=checkbox]{accent-color:var(--accent);width:16px;height:16px;cursor:pointer;flex-shrink:0}\
      .bm-search-item-body{flex:1;min-width:0}\
      .bm-search-item-title{line-height:1.4;word-break:break-word}\
      .bm-search-item-meta{font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
      .bm-search-highlight{color:var(--accent);font-weight:600}\
      .bm-search-selected-bar{padding:8px 16px;border-bottom:1px solid var(--border);background:var(--surface2);display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-dim);flex-wrap:wrap}\
      .bm-search-selected-bar .bm-sel-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;background:var(--surface3);color:var(--accent);font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
      .bm-search-selected-bar .bm-sel-chip .bm-sel-x{cursor:pointer;opacity:.6;font-size:13px;margin-left:2px}\
      .bm-search-selected-bar .bm-sel-chip .bm-sel-x:hover{opacity:1}\
      .bm-search-selected-bar .bm-sel-more{font-size:11px;color:var(--muted)}\
      .bm-search-footer{padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap}\
      .bm-search-count{font-size:11px;color:var(--muted);margin-right:auto}\
      .bm-search-action-btn{padding:8px 14px;border-radius:8px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-size:12px;white-space:nowrap}\
      .bm-search-action-btn:hover{background:rgba(81,203,238,.1)}\
      .bm-search-action-btn:disabled{opacity:.4;cursor:not-allowed}\
      .bm-search-action-btn.primary{border:none;background:var(--accent);color:#0f0f0f;font-weight:600}\
      .bm-search-action-btn.primary:hover{opacity:.88}\
      .bm-search-empty{padding:24px 16px;text-align:center;color:var(--muted);font-size:13px}\
      .bm-search-fields{display:flex;gap:12px;padding:8px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap}\
      .bm-search-fields label{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-dim);cursor:pointer;user-select:none}\
      .bm-search-fields input[type=checkbox]{accent-color:var(--accent);width:13px;height:13px;cursor:pointer}\
      .bm-search-item-themes{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}\
      .bm-search-theme-tag{font-size:10px;padding:1px 7px;border-radius:5px;border:1px solid var(--border);color:var(--muted);background:var(--surface2)}\
      .bm-search-item-badges{display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end}\
      .bm-search-badge{font-size:10px;padding:1px 7px;border-radius:5px;border:1px solid var(--border);color:var(--muted);background:var(--surface2)}\
      .bm-search-badge.lit{border-color:var(--accent);color:var(--accent);background:rgba(81,203,238,.1);font-weight:600}\
      .bm-search-save-row{display:flex;gap:8px;align-items:center;width:100%}\
      .bm-search-save-input{padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);font-size:13px;outline:none;flex:1}\
      .bm-search-save-input:focus{border-color:var(--accent)}\
      .bm-search-theme-select{padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);font-size:12px;outline:none;max-width:200px}\
      .bm-search-theme-select:focus{border-color:var(--accent)}\
    ';
    document.head.appendChild(style);

    // ── DOM ──────────────────────────────────────────────────────────
    var el = document.createElement('div');
    el.innerHTML = '<div class="bm-search-bg" id="bmSearchBg"><div class="bm-search-box">' +
      '<div class="bm-search-header">' +
        '<div class="bm-tag-input-wrap" id="bmTagInputWrap">' +
          '<input class="bm-search-input" id="bmSearchInput" placeholder="搜尋書籤...">' +
        '</div>' +
        '<button class="bm-search-selall" id="bmSearchSelAll" style="display:none">全選</button>' +
      '</div>' +
      '<div class="bm-search-fields">' +
        '<label><input type="checkbox" id="bsFieldTitle" checked>標題</label>' +
        '<label><input type="checkbox" id="bsFieldTheme" checked>主題</label>' +
        '<label><input type="checkbox" id="bsFieldUrl" checked>URL</label>' +
        '<label><input type="checkbox" id="bsFieldNote" checked>備註</label>' +
      '</div>' +
      '<div class="bm-search-selected-bar" id="bmSearchSelBar" style="display:none"></div>' +
      '<div class="bm-search-results" id="bmSearchResults"></div>' +
      '<div class="bm-search-footer">' +
        '<span class="bm-search-count" id="bmSearchCount"></span>' +
        '<button class="bm-search-action-btn" id="bmSearchAddExisting" disabled>加入已有主題</button>' +
        '<button class="bm-search-action-btn" id="bmSearchNewTheme" disabled>存為新頁籤</button>' +
      '</div>' +
      '</div></div>';
    document.body.appendChild(el.firstElementChild);

    var bmSearchBg      = document.getElementById('bmSearchBg');
    var bmTagInputWrap  = document.getElementById('bmTagInputWrap');
    var bmSearchInput   = document.getElementById('bmSearchInput');
    var bmSearchResults = document.getElementById('bmSearchResults');
    var bmSearchCount   = document.getElementById('bmSearchCount');
    var bmSearchSelAll  = document.getElementById('bmSearchSelAll');
    var bmSearchSelBar  = document.getElementById('bmSearchSelBar');
    var bmSearchNewTheme    = document.getElementById('bmSearchNewTheme');
    var bmSearchAddExisting = document.getElementById('bmSearchAddExisting');

    var selectedFavIds = new Set();
    var currentSearchMatches = [];
    var searchTags = [];   // committed tag strings

    // ── Tag management ────────────────────────────────────────────────
    function renderTags() {
      // Remove existing tag chips, keep the input
      bmTagInputWrap.querySelectorAll('.bm-stag').forEach(function(t) { t.remove(); });
      searchTags.forEach(function(tag, idx) {
        var chip = document.createElement('span');
        chip.className = 'bm-stag';
        chip.innerHTML = escHtml(tag) + '<span class="bm-stag-x" data-idx="' + idx + '">&times;</span>';
        bmTagInputWrap.insertBefore(chip, bmSearchInput);
      });
      bmTagInputWrap.querySelectorAll('.bm-stag-x').forEach(function(x) {
        x.addEventListener('mousedown', function(e) {
          e.preventDefault();
          searchTags.splice(parseInt(x.dataset.idx), 1);
          renderTags();
          doSearch();
        });
      });
      // Update placeholder
      bmSearchInput.placeholder = searchTags.length > 0 ? '' : '搜尋書籤...';
    }

    function commitInputAsTag() {
      var val = bmSearchInput.value.trim();
      if (!val) return;
      if (searchTags.indexOf(val) === -1) searchTags.push(val);
      bmSearchInput.value = '';
      renderTags();
      doSearch();
    }

    bmTagInputWrap.addEventListener('click', function(e) {
      if (e.target !== bmSearchInput) bmSearchInput.focus();
    });

    bmSearchInput.addEventListener('keydown', function(e) {
      if (e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        commitInputAsTag();
      } else if (e.key === 'Backspace' && bmSearchInput.value === '' && searchTags.length > 0) {
        searchTags.pop();
        renderTags();
        doSearch();
      }
    });

    // comma typed as input char (some IME scenarios)
    bmSearchInput.addEventListener('input', function() {
      var val = bmSearchInput.value;
      if (val.indexOf(',') !== -1) {
        val.split(',').forEach(function(part) {
          part = part.trim();
          if (part && searchTags.indexOf(part) === -1) searchTags.push(part);
        });
        bmSearchInput.value = '';
        renderTags();
        doSearch();
      } else {
        doSearch();
      }
    });

    // ── Close / open ─────────────────────────────────────────────────
    function closeSearch() {
      bmSearchBg.classList.remove('open');
      searchTags = [];
      bmSearchInput.value = '';
      renderTags();
      bmSearchResults.innerHTML = '';
      bmSearchCount.textContent = '';
      selectedFavIds = new Set();
      currentSearchMatches = [];
      hideActionRows();
      updateSelectionUI();
    }

    bindPopup(bmSearchBg, closeSearch);

    function openSearch() {
      searchTags = [];
      selectedFavIds = new Set();
      currentSearchMatches = [];
      bmSearchInput.value = '';
      renderTags();
      bmSearchResults.innerHTML = '<div class="bm-search-empty">輸入關鍵字搜尋書籤</div>';
      bmSearchCount.textContent = '';
      hideActionRows();
      updateSelectionUI();
      bmSearchBg.classList.add('open');
      setTimeout(function() { bmSearchInput.focus(); }, 100);
    }

    function hideActionRows() {
      bmSearchBg.querySelectorAll('.bm-search-save-row').forEach(function(r) { r.remove(); });
    }

    // ── Selection UI ─────────────────────────────────────────────────
    function updateSelectionUI() {
      var count = selectedFavIds.size;
      bmSearchNewTheme.disabled = count === 0;
      bmSearchAddExisting.disabled = count === 0;

      if (count === 0) {
        bmSearchSelBar.style.display = 'none';
        bmSearchSelBar.innerHTML = '';
        return;
      }

      bmSearchSelBar.style.display = 'flex';
      bmSearchSelBar.innerHTML = '';
      var bmData = window.bmGetData();
      var label = document.createElement('span');
      label.textContent = '已選 ' + count + ' 筆：';
      label.style.flexShrink = '0';
      bmSearchSelBar.appendChild(label);

      var MAX_CHIPS = 5;
      var shown = 0;
      selectedFavIds.forEach(function(favId) {
        if (shown >= MAX_CHIPS) return;
        var fav = bmData.favorites.find(function(f) { return f.id === favId; });
        if (!fav) return;
        var chip = document.createElement('span');
        chip.className = 'bm-sel-chip';
        chip.innerHTML = escHtml(fav.title) + '<span class="bm-sel-x" data-fav-id="' + escHtml(favId) + '">&times;</span>';
        bmSearchSelBar.appendChild(chip);
        shown++;
      });
      if (count > MAX_CHIPS) {
        var more = document.createElement('span');
        more.className = 'bm-sel-more';
        more.textContent = '...還有 ' + (count - MAX_CHIPS) + ' 筆';
        bmSearchSelBar.appendChild(more);
      }

      bmSearchSelBar.querySelectorAll('.bm-sel-x').forEach(function(x) {
        x.addEventListener('click', function(e) {
          e.stopPropagation();
          selectedFavIds.delete(x.dataset.favId);
          updateSelectionUI();
          syncCheckboxes();
        });
      });
    }

    function syncCheckboxes() {
      bmSearchResults.querySelectorAll('.bm-search-item').forEach(function(item) {
        var cb = item.querySelector('input[type=checkbox]');
        if (!cb) return;
        var checked = selectedFavIds.has(cb.dataset.favId);
        cb.checked = checked;
        item.classList.toggle('selected', checked);
      });
      updateSelectAllBtn();
    }

    function updateSelectAllBtn() {
      if (currentSearchMatches.length === 0) { bmSearchSelAll.style.display = 'none'; return; }
      bmSearchSelAll.style.display = '';
      var allSelected = currentSearchMatches.every(function(m) { return selectedFavIds.has(m.fav.id); });
      bmSearchSelAll.textContent = allSelected ? '取消全選' : '全選';
    }

    // ── Helpers ───────────────────────────────────────────────────────
    function escHtml(s) {
      return window.bmEscHtml ? window.bmEscHtml(s) : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // highlight all tag occurrences in text (merged ranges)
    function highlightMulti(text, tags) {
      if (!tags || tags.length === 0) return escHtml(text);
      var lower = text.toLowerCase();
      var ranges = [];
      tags.forEach(function(tag) {
        var q = tag.toLowerCase();
        var i = lower.indexOf(q);
        while (i !== -1) { ranges.push([i, i + tag.length]); i = lower.indexOf(q, i + 1); }
      });
      if (ranges.length === 0) return escHtml(text);
      ranges.sort(function(a,b) { return a[0]-b[0]; });
      var merged = [ranges[0].slice()];
      for (var i = 1; i < ranges.length; i++) {
        var last = merged[merged.length-1];
        if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
        else merged.push(ranges[i].slice());
      }
      var result = '', pos = 0;
      merged.forEach(function(r) {
        result += escHtml(text.substring(pos, r[0])) + '<span class="bm-search-highlight">' + escHtml(text.substring(r[0], r[1])) + '</span>';
        pos = r[1];
      });
      return result + escHtml(text.substring(pos));
    }

    // ── Search logic ─────────────────────────────────────────────────
    function doSearch() {
      var bmData = window.bmGetData();
      var getThemeName = window.bmGetThemeName;
      hideActionRows();

      // all active tags + partial input text
      var allTags = searchTags.slice();
      var partial = bmSearchInput.value.trim();
      if (partial) allTags.push(partial);

      if (allTags.length === 0) {
        bmSearchResults.innerHTML = '<div class="bm-search-empty">輸入關鍵字搜尋書籤</div>';
        bmSearchCount.textContent = '';
        currentSearchMatches = [];
        bmSearchSelAll.style.display = 'none';
        return;
      }

      var fTitle = document.getElementById('bsFieldTitle').checked;
      var fTheme = document.getElementById('bsFieldTheme').checked;
      var fUrl   = document.getElementById('bsFieldUrl').checked;
      var fNote  = document.getElementById('bsFieldNote').checked;

      currentSearchMatches = [];
      bmData.favorites.forEach(function(f) {
        var mTitle = false, mUrl = false, mNote = false, mThemeIds = [];

        allTags.forEach(function(tag) {
          var q = tag.toLowerCase();
          if (fTitle && f.title   && f.title.toLowerCase().indexOf(q)   !== -1) mTitle = true;
          if (fUrl   && f.url     && f.url.toLowerCase().indexOf(q)     !== -1) mUrl   = true;
          if (fNote  && f.content && f.content.toLowerCase().indexOf(q) !== -1) mNote  = true;
          if (fTheme && getThemeName) {
            (f.themeIds || []).forEach(function(tid) {
              var name = getThemeName(tid);
              if (name && name.toLowerCase().indexOf(q) !== -1 && mThemeIds.indexOf(tid) === -1) mThemeIds.push(tid);
            });
          }
        });

        if (mTitle || mUrl || mNote || mThemeIds.length > 0) {
          currentSearchMatches.push({ fav: f, mTitle: mTitle, mUrl: mUrl, mNote: mNote, mThemeIds: mThemeIds });
        }
      });

      bmSearchResults.innerHTML = '';
      if (currentSearchMatches.length === 0) {
        bmSearchResults.innerHTML = '<div class="bm-search-empty">找不到符合的書籤</div>';
        bmSearchCount.textContent = '0 筆結果';
        bmSearchSelAll.style.display = 'none';
        return;
      }

      bmSearchCount.textContent = currentSearchMatches.length + ' 筆結果';

      currentSearchMatches.forEach(function(match) {
        var fav = match.fav;
        var item = document.createElement('div');
        item.className = 'bm-search-item';
        if (selectedFavIds.has(fav.id)) item.classList.add('selected');

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.favId = fav.id;
        cb.checked = selectedFavIds.has(fav.id);

        var body = document.createElement('div');
        body.className = 'bm-search-item-body';

        // 標題
        var titleDiv = document.createElement('div');
        titleDiv.className = 'bm-search-item-title';
        titleDiv.innerHTML = match.mTitle ? highlightMulti(fav.title, allTags) : escHtml(fav.title);
        body.appendChild(titleDiv);

        // 主題標籤列
        if ((fav.themeIds || []).length > 0 && getThemeName) {
          var themesDiv = document.createElement('div');
          themesDiv.className = 'bm-search-item-themes';
          fav.themeIds.forEach(function(tid) {
            var name = getThemeName(tid);
            if (!name) return;
            var tag = document.createElement('span');
            tag.className = 'bm-search-theme-tag';
            tag.innerHTML = match.mThemeIds.indexOf(tid) !== -1 ? highlightMulti(name, allTags) : escHtml(name);
            themesDiv.appendChild(tag);
          });
          body.appendChild(themesDiv);
        }

        item.appendChild(cb);
        item.appendChild(body);

        // URL / 備註 badges
        var hasBadge = (fav.url && fav.url.trim()) || fav.content;
        if (hasBadge) {
          var badgesDiv = document.createElement('div');
          badgesDiv.className = 'bm-search-item-badges';
          if (fav.url && fav.url.trim()) {
            var urlBadge = document.createElement('span');
            urlBadge.className = 'bm-search-badge' + (match.mUrl ? ' lit' : '');
            urlBadge.textContent = 'URL';
            badgesDiv.appendChild(urlBadge);
          }
          if (fav.content) {
            var noteBadge = document.createElement('span');
            noteBadge.className = 'bm-search-badge' + (match.mNote ? ' lit' : '');
            noteBadge.textContent = '備註';
            badgesDiv.appendChild(noteBadge);
          }
          item.appendChild(badgesDiv);
        }

        cb.addEventListener('change', function(e) {
          e.stopPropagation();
          if (cb.checked) selectedFavIds.add(fav.id);
          else selectedFavIds.delete(fav.id);
          item.classList.toggle('selected', cb.checked);
          updateSelectionUI();
          updateSelectAllBtn();
        });

        item.addEventListener('click', function(e) {
          if (e.target.tagName === 'INPUT') return;
          if (e.target.classList.contains('bm-stag-x')) return;
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        });

        bmSearchResults.appendChild(item);
      });

      updateSelectAllBtn();
      updateSelectionUI();
    }

    ['bsFieldTitle','bsFieldTheme','bsFieldUrl','bsFieldNote'].forEach(function(id) {
      document.getElementById(id).addEventListener('change', doSearch);
    });

    bmSearchSelAll.addEventListener('click', function() {
      var allSelected = currentSearchMatches.every(function(m) { return selectedFavIds.has(m.fav.id); });
      currentSearchMatches.forEach(function(m) {
        if (allSelected) selectedFavIds.delete(m.fav.id);
        else selectedFavIds.add(m.fav.id);
      });
      syncCheckboxes();
      updateSelectionUI();
    });

    // ── Save as new theme ────────────────────────────────────────────
    bmSearchNewTheme.addEventListener('click', function() {
      if (selectedFavIds.size === 0) return;
      hideActionRows();
      var footer = bmSearchNewTheme.parentElement;
      var row = document.createElement('div');
      row.className = 'bm-search-save-row';
      var nameInput = document.createElement('input');
      nameInput.className = 'bm-search-save-input';
      nameInput.placeholder = '輸入新頁籤名稱...';
      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'bm-search-action-btn primary';
      confirmBtn.textContent = '確定';
      row.appendChild(nameInput);
      row.appendChild(confirmBtn);
      footer.appendChild(row);
      nameInput.focus();

      function doSave() {
        var name = nameInput.value.trim();
        if (!name) { showToast('請輸入頁籤名稱'); return; }
        var bmData = window.bmGetData();
        var newThemeId = 'theme_' + Date.now();
        bmData.themes.push({ id: newThemeId, name: name, icon: '🔍' });
        selectedFavIds.forEach(function(favId) {
          var fav = bmData.favorites.find(function(f) { return f.id === favId; });
          if (!fav) return;
          if (!fav.themeIds) fav.themeIds = [];
          if (fav.themeIds.indexOf(newThemeId) === -1) fav.themeIds.push(newThemeId);
        });
        window.bmSaveData();
        closeSearch();
        window.bmSetCurrentThemeId(newThemeId);
        window.renderBookmarks();
        showToast('已建立新頁籤「' + name + '」（' + selectedFavIds.size + ' 筆）');
      }

      confirmBtn.addEventListener('click', doSave);
      nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSave(); });
    });

    // ── Add to existing theme ────────────────────────────────────────
    bmSearchAddExisting.addEventListener('click', function() {
      if (selectedFavIds.size === 0) return;
      hideActionRows();
      var bmData = window.bmGetData();
      var footer = bmSearchAddExisting.parentElement;
      var row = document.createElement('div');
      row.className = 'bm-search-save-row';
      var sel = document.createElement('select');
      sel.className = 'bm-search-theme-select';
      bmData.themes.forEach(function(t) {
        if (t.id === 'all') return;
        var opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = (t.icon ? t.icon + ' ' : '') + t.name;
        sel.appendChild(opt);
      });
      if (sel.options.length === 0) { showToast('尚無可用主題，請先新增'); return; }
      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'bm-search-action-btn primary';
      confirmBtn.textContent = '加入';
      row.appendChild(sel);
      row.appendChild(confirmBtn);
      footer.appendChild(row);
      sel.focus();

      confirmBtn.addEventListener('click', function() {
        var themeId = sel.value;
        if (!themeId) return;
        var added = 0;
        selectedFavIds.forEach(function(favId) {
          var fav = bmData.favorites.find(function(f) { return f.id === favId; });
          if (!fav) return;
          if (!fav.themeIds) fav.themeIds = [];
          if (fav.themeIds.indexOf(themeId) === -1) { fav.themeIds.push(themeId); added++; }
        });
        window.bmSaveData();
        closeSearch();
        window.renderBookmarks();
        var themeName = window.bmGetThemeName(themeId);
        showToast('已加入「' + themeName + '」（' + added + ' 筆新增）');
      });
    });

    // ── Search launcher (Ctrl+F) ──────────────────────────────────────
    var launcherStyle = document.createElement('style');
    launcherStyle.textContent = '\
      .bm-launcher-bg{position:fixed;inset:0;z-index:360;display:flex;align-items:flex-start;justify-content:center;padding-top:120px;opacity:0;pointer-events:none;transition:opacity .15s;backdrop-filter:blur(2px)}\
      .bm-launcher-bg.open{opacity:1;pointer-events:all}\
      .bm-launcher-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;display:flex;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(-8px) scale(.97);transition:transform .2s cubic-bezier(.22,1,.36,1)}\
      .bm-launcher-bg.open .bm-launcher-box{transform:translateY(0) scale(1)}\
      .bm-launcher-btn{display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 28px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s;min-width:120px}\
      .bm-launcher-btn:hover{border-color:var(--accent);background:rgba(81,203,238,.08)}\
      .bm-launcher-btn-icon{font-size:26px;line-height:1}\
      .bm-launcher-btn-label{font-size:13px;color:var(--text-dim);white-space:nowrap}\
    ';
    document.head.appendChild(launcherStyle);

    var launcherEl = document.createElement('div');
    launcherEl.innerHTML = '<div class="bm-launcher-bg" id="bmLauncherBg">' +
      '<div class="bm-launcher-box">' +
        '<button class="bm-launcher-btn" id="bmLaunchTagSearch">' +
          '<span class="bm-launcher-btn-icon">🏷️</span>' +
          '<span class="bm-launcher-btn-label">搜尋主題 / 標題</span>' +
        '</button>' +
        '<button class="bm-launcher-btn" id="bmLaunchContentSearch">' +
          '<span class="bm-launcher-btn-icon">📄</span>' +
          '<span class="bm-launcher-btn-label">搜尋備註內文</span>' +
        '</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(launcherEl.firstElementChild);

    var bmLauncherBg = document.getElementById('bmLauncherBg');

    function openLauncher() {
      bmLauncherBg.classList.add('open');
    }
    function closeLauncher() {
      bmLauncherBg.classList.remove('open');
    }

    bindPopup(bmLauncherBg, closeLauncher);

    document.getElementById('bmLaunchTagSearch').addEventListener('click', function() {
      closeLauncher();
      openSearch();
    });

    document.getElementById('bmLaunchContentSearch').addEventListener('click', function() {
      closeLauncher();
      if (typeof window.bmOpenSearchContent === 'function') window.bmOpenSearchContent();
    });

    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'f' && viewMode === 'bookmark' && !document.querySelector('.bm-reader-bg')) {
        e.preventDefault();
        if (bmLauncherBg.classList.contains('open')) { closeLauncher(); return; }
        closeLauncher();
        openLauncher();
      }
    });
  }
});
