registerPlugin('bookmark-searchcontent', {
  icon: 'searchcontent',
  label: '內文搜尋',
  order: 6, 
  mode: 'bookmark',
  hideToolbar: true,

  load: function() {
	this.init();
  },
  open() {
    if (typeof window.bmOpenSearchContent === 'function') window.bmOpenSearchContent();
  },
  init(){

    // ── DOM ──────────────────────────────────────────────────────────
    var el = document.createElement('div');
    el.innerHTML =
      `<div class="bmsc-bg" id="bmscBg">
        <div class="bmsc-topbar">
          <div class="bmsc-tag-wrap" id="bmscTagWrap">
            <input class="bmsc-input" id="bmscInput" placeholder="搜尋備註內文...">
          </div>
          <span class="bmsc-count" id="bmscCount"></span>
          <button class="bmsc-close" id="bmscClose">關閉</button>
        </div>
        <div class="bmsc-body" id="bmscBody">
          <div class="bmsc-list" id="bmscList"></div>
          <div class="bmsc-splitter" id="bmscListSplitter"></div>
          <div class="bmsc-preview" id="bmscPreview">
            <div class="bmsc-preview-placeholder">← 點擊左側結果預覽內文</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el.firstElementChild);

    var bmscBg          = document.getElementById('bmscBg');
    var bmscTagWrap     = document.getElementById('bmscTagWrap');
    var bmscInput       = document.getElementById('bmscInput');
    var bmscCount       = document.getElementById('bmscCount');
    var bmscBody        = document.getElementById('bmscBody');
    var bmscList        = document.getElementById('bmscList');
    var bmscListSplitter= document.getElementById('bmscListSplitter');
    var bmscPreview     = document.getElementById('bmscPreview');

    document.getElementById('bmscClose').addEventListener('click', closePanel);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && bmscBg.classList.contains('open')) closePanel();
    });

    // ── Tag input ─────────────────────────────────────────────────────
    var searchTags = [];

    function renderTags() {
      bmscTagWrap.querySelectorAll('.bmsc-stag').forEach(function(t) { t.remove(); });
      searchTags.forEach(function(tag, idx) {
        var chip = document.createElement('span');
        chip.className = 'bmsc-stag bmsc-stag-c' + (idx <= 9 ? idx : 'x');
        chip.innerHTML = AppUtils.escHtml(tag) + '<span class="bmsc-stag-x" data-idx="' + idx + '">&times;</span>';
        bmscTagWrap.insertBefore(chip, bmscInput);
      });
      bmscTagWrap.querySelectorAll('.bmsc-stag-x').forEach(function(x) {
        x.addEventListener('mousedown', function(e) {
          e.preventDefault();
          searchTags.splice(parseInt(x.dataset.idx), 1);
          renderTags();
          doSearch();
        });
      });
      bmscInput.placeholder = searchTags.length > 0 ? '' : '搜尋備註內文...';
    }

    function commitInputAsTag() {
      var val = bmscInput.value.trim();
      if (!val) return;
      if (searchTags.indexOf(val) === -1) searchTags.push(val);
      bmscInput.value = '';
      renderTags();
      doSearch();
    }

    bmscTagWrap.addEventListener('click', function(e) {
      if (e.target !== bmscInput) bmscInput.focus();
    });

    bmscInput.addEventListener('keydown', function(e) {
      if (e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        commitInputAsTag();
      } else if (e.key === 'Backspace' && bmscInput.value === '' && searchTags.length > 0) {
        searchTags.pop();
        renderTags();
        doSearch();
      }
    });

    bmscInput.addEventListener('input', function() {
      var val = bmscInput.value;
      if (val.indexOf(',') !== -1) {
        val.split(',').forEach(function(part) {
          part = part.trim();
          if (part && searchTags.indexOf(part) === -1) searchTags.push(part);
        });
        bmscInput.value = '';
        renderTags();
      }
      doSearch();
    });

    // ── List splitter drag ────────────────────────────────────────────
    bmscListSplitter.addEventListener('mousedown', function(e) {
      e.preventDefault();
      bmscListSplitter.classList.add('dragging');
      var startX = e.clientX;
      var startW = bmscList.getBoundingClientRect().width;
      var bodyW  = bmscBody.getBoundingClientRect().width;

      function onMove(e) {
        var newW = Math.max(120, Math.min(bodyW * 0.6, startW + (e.clientX - startX)));
        bmscList.style.width = newW + 'px';
      }
      function onUp() {
        bmscListSplitter.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // ── Helpers ───────────────────────────────────────────────────────

    function highlightText(text, tags, clsPrefix) {
      if (!tags || tags.length === 0) return AppUtils.escHtml(text);
      var lower = text.toLowerCase();
      var ranges = [];
      tags.forEach(function(tag, idx) {
        var q = tag.toLowerCase(), i = lower.indexOf(q);
        while (i !== -1) {
          ranges.push({ s: i, e: i + tag.length, idx: idx });
          i = lower.indexOf(q, i + 1);
        }
      });
      if (ranges.length === 0) return AppUtils.escHtml(text);
      ranges.sort(function(a, b) { return a.s - b.s; });
      var out = '', p = 0;
      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i];
        if (r.s < p) continue; // skip overlap, first tag wins
        var cls = clsPrefix + '-' + (r.idx <= 9 ? r.idx : 'x');
        out += AppUtils.escHtml(text.substring(p, r.s)) +
               '<span class="' + cls + '">' + AppUtils.escHtml(text.substring(r.s, r.e)) + '</span>';
        p = r.e;
      }
      return out + AppUtils.escHtml(text.substring(p));
    }

    // ── State ─────────────────────────────────────────────────────────
    var activeHitEl    = null;
    var renderVisible  = false;   // 渲染預覽預設隱藏
    var curFav         = null;
    var curTargetLine  = 1;
    var curRawBody     = null;
    var curRenderBody  = null;
    var curPvSplitter  = null;
    var curRenderPane  = null;

    function open() {
      searchTags = [];
      bmscInput.value = '';
      renderTags();
      bmscCount.textContent = '';
      bmscList.innerHTML = '';
      bmscPreview.innerHTML = '<div class="bmsc-preview-placeholder">← 點擊左側結果預覽內文</div>';
      activeHitEl = null;
      renderVisible = false;
      curFav = null;
      bmscBg.classList.add('open');
      setTimeout(function() { bmscInput.focus(); }, 80);
    }

    function closePanel() {
      bmscBg.classList.remove('open');
    }

    // ── Search ────────────────────────────────────────────────────────
    function doSearch() {
      var allTags = searchTags.slice();
      var partial = bmscInput.value.trim();
      if (partial) allTags.push(partial);

      bmscList.innerHTML = '';
      bmscPreview.innerHTML = '<div class="bmsc-preview-placeholder">← 點擊左側結果預覽內文</div>';
      activeHitEl = null;
      curFav = null;

      if (allTags.length === 0) { bmscCount.textContent = ''; return; }

      var bmData = window.bmGetData();
      var totalHits = 0;

      bmData.favorites.forEach(function(fav) {
        if (!fav.content) return;
        var lines = fav.content.split('\n');
        var hits = [];
        lines.forEach(function(line, i) {
          var matched = allTags.every(function(tag) {
            return line.toLowerCase().indexOf(tag.toLowerCase()) !== -1;
          });
          if (matched) hits.push({ lineNum: i + 1, lineText: line });
        });
        if (hits.length === 0) return;
        totalHits += hits.length;

        var group = document.createElement('div');
        group.className = 'bmsc-group';

        var groupTitle = document.createElement('div');
        groupTitle.className = 'bmsc-group-title';
        groupTitle.innerHTML = '📄 ' + AppUtils.escHtml(fav.title || '（無標題）') +
          ' <span style="font-weight:400;color:var(--muted)">(' + hits.length + ')</span>';
        group.appendChild(groupTitle);

        hits.forEach(function(hit) {
          var hitEl = document.createElement('div');
          hitEl.className = 'bmsc-hit';
          hitEl.innerHTML = '<span class="bmsc-hit-line">' + hit.lineNum + '</span>' +
            highlightText(hit.lineText, allTags, 'bmsc-hl');

          hitEl.addEventListener('click', function() {
            if (activeHitEl) activeHitEl.classList.remove('active');
            hitEl.classList.add('active');
            activeHitEl = hitEl;
            showPreview(fav, allTags, hit.lineNum);
          });
          group.appendChild(hitEl);
        });

        groupTitle.addEventListener('click', function() {
          var firstHit = group.querySelector('.bmsc-hit');
          if (firstHit) firstHit.click();
        });

        bmscList.appendChild(group);
      });

      bmscCount.textContent = totalHits > 0 ? totalHits + ' 筆結果' : '找不到符合內容';
      if (totalHits === 0) {
        bmscList.innerHTML = '<div class="bmsc-empty">找不到符合的備註內容</div>';
      }
    }

    // ── Preview ───────────────────────────────────────────────────────
    function showPreview(fav, tags, targetLineNum) {
      // Same note: just shift the target highlight and scroll from current position
      if (curFav && curFav.id === fav.id && curRawBody) {
        var lineEls = curRawBody.querySelectorAll('.bmsc-raw-line');
        lineEls.forEach(function(el, i) {
          var lineNum = i + 1;
          if (lineNum === curTargetLine) {
            el.classList.remove('bmsc-raw-target');
            if (el.dataset.matched === '1') el.classList.add('bmsc-raw-matched');
          }
          if (lineNum === targetLineNum) {
            el.classList.remove('bmsc-raw-matched');
            el.classList.add('bmsc-raw-target');
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        });
        curTargetLine = targetLineNum;
        return;
      }

      // 保留 renderVisible 狀態（不因點擊新結果而重置）
      bmscPreview.innerHTML = '';
      curFav = fav;
      curTargetLine = targetLineNum;
      var getThemeName = window.bmGetThemeName;

      // ── 標題列（固定）──────────────────────────────────────────────
      var info = document.createElement('div');
      info.className = 'bmsc-pv-info';

      var infoMain = document.createElement('div');
      infoMain.className = 'bmsc-pv-info-main';

      var titleEl = document.createElement('div');
      titleEl.className = 'bmsc-pv-title';
      titleEl.textContent = fav.title || '（無標題）';
      infoMain.appendChild(titleEl);

      if ((fav.themeIds || []).length > 0 && getThemeName) {
        var themesEl = document.createElement('div');
        themesEl.className = 'bmsc-pv-themes';
        fav.themeIds.forEach(function(tid) {
          var name = getThemeName(tid);
          if (!name) return;
          var chip = document.createElement('span');
          chip.className = 'bmsc-pv-theme';
          chip.textContent = name;
          themesEl.appendChild(chip);
        });
        infoMain.appendChild(themesEl);
      }
      info.appendChild(infoMain);

      var infoBtns = document.createElement('div');
      infoBtns.className = 'bmsc-pv-info-btns';

      var renderToggle = document.createElement('button');
      renderToggle.className = 'bmsc-pv-render-toggle' + (renderVisible ? ' on' : '');
      renderToggle.textContent = '渲染預覽';
      infoBtns.appendChild(renderToggle);

      const exportBtn = document.createElement('button');
      exportBtn.type = 'button';
      exportBtn.className = 'bm-reader-pane-hd-btn';
      exportBtn.innerHTML = '<span data-icon="export" aria-hidden="true"></span> 匯出 HTML';
      exportBtn.addEventListener('click', async () => {
        exportBtn.disabled = true;
        try {
          await window.plugins.bookmark.exportHtml([{ ...fav }]);
          showToast('已匯出 HTML');
        } catch (_) {
          showToast('HTML 匯出失敗，請再試一次');
        } finally {
          exportBtn.disabled = false;
        }
      });
      infoBtns.appendChild(exportBtn);

      var openBtn = document.createElement('button');
      openBtn.className = 'bmsc-pv-open-btn';
      openBtn.textContent = '進入筆記 →';
      openBtn.addEventListener('click', function() {
        closePanel();
        if (typeof window.bmOpenReader === 'function') {
          var bmData = window.bmGetData();
          var notesList = bmData.favorites.filter(function(f) { return f.content; });
          window.bmOpenReader(fav.title, fav.content, fav.notionId, fav.codeLang, fav.id, notesList);
        }
      });
      infoBtns.appendChild(openBtn);
      info.appendChild(infoBtns);
      bmscPreview.appendChild(info);

      // ── 面板區（左:原文  右:渲染預覽）──────────────────────────────
      var panesEl = document.createElement('div');
      panesEl.className = 'bmsc-panes';
      bmscPreview.appendChild(panesEl);

      // 原文面板（左，主要，常駐顯示）
      var rawPane = document.createElement('div');
      rawPane.className = 'bmsc-pane';
      rawPane.style.flex = '1';

      var rawLabel = document.createElement('div');
      rawLabel.className = 'bmsc-pane-label';
      rawLabel.textContent = '原文';
      rawPane.appendChild(rawLabel);

      var rawBody = document.createElement('div');
      rawBody.className = 'bmsc-pane-body';
      rawPane.appendChild(rawBody);
      panesEl.appendChild(rawPane);
      curRawBody = rawBody;

      // 面板間分割線（渲染面板顯示時才出現）
      var pvSplitter = document.createElement('div');
      pvSplitter.className = 'bmsc-pv-splitter';
      pvSplitter.style.display = renderVisible ? 'block' : 'none';
      panesEl.appendChild(pvSplitter);
      curPvSplitter = pvSplitter;

      // 渲染預覽面板（右，預設隱藏）
      var renderPane = document.createElement('div');
      renderPane.className = 'bmsc-pane';
      renderPane.style.width = '45%';
      renderPane.style.flexShrink = '0';
      renderPane.style.display = renderVisible ? 'flex' : 'none';

      var renderLabel = document.createElement('div');
      renderLabel.className = 'bmsc-pane-label';
      renderLabel.textContent = '渲染預覽';
      renderPane.appendChild(renderLabel);

      var renderBody = document.createElement('div');
      renderBody.className = 'bmsc-pane-body bm-reader-inner';
      renderPane.appendChild(renderBody);
      panesEl.appendChild(renderPane);
      curRenderPane  = renderPane;
      curRenderBody  = renderBody;

      // ── 建立原文行 ──────────────────────────────────────────────────
      var lines = (fav.content || '').split('\n');
      var rawTargetEl = null;
      lines.forEach(function(line, i) {
        var lineNum = i + 1;
        var isMatch = tags.every(function(tag) {
          return line.toLowerCase().indexOf(tag.toLowerCase()) !== -1;
        });
        var isTarget = lineNum === targetLineNum;
        var span = document.createElement('span');
        span.className = 'bmsc-raw-line' +
          (isTarget ? ' bmsc-raw-target' : isMatch ? ' bmsc-raw-matched' : '');
        if (isMatch) span.dataset.matched = '1';
        span.innerHTML = '<span class="bmsc-raw-ln">' + lineNum + '</span>' +
          '<span class="bmsc-raw-text">' + (isMatch
            ? highlightText(line, tags, 'bmsc-raw-hl')
            : (AppUtils.escHtml(line) || '&#8203;')) + '</span>';
        rawBody.appendChild(span);
        if (isTarget) rawTargetEl = span;
      });

      // scroll 原文到目標行
      if (rawTargetEl) {
        setTimeout(function() {
          rawTargetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 30);
      }

      // ── 渲染（若已開啟則立刻載入）──────────────────────────────────
      if (renderVisible && typeof window.bmRenderContent === 'function') {
        window.bmRenderContent(renderBody, fav.content || '');
      }

      // ── 渲染預覽 toggle ─────────────────────────────────────────────
      renderToggle.addEventListener('click', function() {
        renderVisible = !renderVisible;
        renderToggle.classList.toggle('on', renderVisible);
        renderPane.style.display = renderVisible ? 'flex' : 'none';
        pvSplitter.style.display = renderVisible ? 'block' : 'none';
        if (renderVisible && !renderBody.children.length && typeof window.bmRenderContent === 'function') {
          window.bmRenderContent(renderBody, curFav ? curFav.content || '' : '');
        }
      });

      // ── 渲染面板 splitter 拖曳 ──────────────────────────────────────
      pvSplitter.addEventListener('mousedown', function(e) {
        e.preventDefault();
        pvSplitter.classList.add('dragging');
        var startX = e.clientX;
        var startW = renderPane.getBoundingClientRect().width;
        var totalW = panesEl.getBoundingClientRect().width;

        function onMove(e) {
          var dx = startX - e.clientX;
          var newW = Math.max(80, Math.min(totalW - 80, startW + dx));
          renderPane.style.width = newW + 'px';
        }
        function onUp() {
          pvSplitter.classList.remove('dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    window.bmOpenSearchContent = open;
  }
});
