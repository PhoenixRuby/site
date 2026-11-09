registerPlugin('bookmark-searchcontent', {
  icon: null,
  label: '內文搜尋',
  order: 6, mode: 'bookmark',
  hideToolbar: true,

  init: function() {

    // ── CSS ──────────────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = '\
      .bmsc-bg{position:fixed;inset:0;z-index:355;display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .2s;background:var(--bg)}\
      .bmsc-bg.open{opacity:1;pointer-events:all}\
      .bmsc-topbar{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0}\
      .bmsc-tag-wrap{flex:1;display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:6px 10px;cursor:text;min-height:38px;border-radius:8px;background:var(--surface2)}\
      .bmsc-stag{display:inline-flex;align-items:center;gap:2px;padding:2px 6px 2px 10px;border-radius:5px;font-size:12px;white-space:nowrap;flex-shrink:0}\
      .bmsc-stag-c0{background:rgba(81,203,238,.15);border:1px solid #51cbee;color:#51cbee}\
      .bmsc-stag-c1{background:rgba(245,166,35,.15);border:1px solid #f5a623;color:#f5a623}\
      .bmsc-stag-c2{background:rgba(126,211,33,.15);border:1px solid #7ed321;color:#7ed321}\
      .bmsc-stag-c3{background:rgba(233,30,140,.15);border:1px solid #e91e8c;color:#e91e8c}\
      .bmsc-stag-c4{background:rgba(200,184,0,.15);border:1px solid #c8b800;color:#c8b800}\
      .bmsc-stag-c5{background:rgba(155,89,182,.15);border:1px solid #9b59b6;color:#9b59b6}\
      .bmsc-stag-c6{background:rgba(231,76,60,.15);border:1px solid #e74c3c;color:#e74c3c}\
      .bmsc-stag-c7{background:rgba(26,188,156,.15);border:1px solid #1abc9c;color:#1abc9c}\
      .bmsc-stag-c8{background:rgba(52,152,219,.15);border:1px solid #3498db;color:#3498db}\
      .bmsc-stag-c9{background:rgba(122,184,0,.15);border:1px solid #7ab800;color:#7ab800}\
      .bmsc-stag-cx{background:rgba(180,180,180,.15);border:1px solid #aaa;color:#aaa}\
      .bmsc-stag-x{cursor:pointer;opacity:.55;font-size:15px;line-height:1;padding:0 2px;margin-left:1px}\
      .bmsc-stag-x:hover{opacity:1}\
      .bmsc-input{border:none;background:transparent;color:var(--text);font-size:13px;outline:none;font-family:inherit;min-width:80px;flex:1;padding:1px 2px}\
      .bmsc-input:hover,.bmsc-input:focus{border:none;box-shadow:none;outline:none}\
      .bmsc-count{font-size:12px;color:var(--muted);white-space:nowrap}\
      .bmsc-close{padding:6px 13px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:13px;font-family:inherit}\
      .bmsc-close:hover{border-color:var(--accent);color:var(--accent)}\
      .bmsc-body{display:flex;flex:1;overflow:hidden}\
      .bmsc-list{width:280px;min-width:120px;flex-shrink:0;overflow-y:auto;background:var(--surface);\
        scrollbar-width:thin;scrollbar-color:var(--border) transparent}\
      .bmsc-list::-webkit-scrollbar{width:4px}\
      .bmsc-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}\
      .bmsc-splitter{width:5px;flex-shrink:0;background:var(--border);cursor:col-resize;transition:background .15s}\
      .bmsc-splitter:hover,.bmsc-splitter.dragging{background:var(--accent)}\
      .bmsc-group{border-bottom:1px solid var(--surface2)}\
      .bmsc-group-title{padding:10px 14px 6px;font-size:12px;font-weight:600;color:var(--accent);cursor:pointer;display:flex;align-items:center;gap:6px;user-select:none}\
      .bmsc-group-title:hover{background:var(--surface2)}\
      .bmsc-hit{padding:5px 14px 5px 26px;font-size:12px;color:var(--text-dim);cursor:pointer;line-height:1.5;border-left:2px solid transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
      .bmsc-hit:hover{background:var(--surface2);border-left-color:var(--accent)}\
      .bmsc-hit.active{background:rgba(81,203,238,.08);border-left-color:var(--accent);color:var(--text)}\
      .bmsc-hit-line{color:var(--muted);font-size:11px;margin-right:6px}\
      .bmsc-hl{color:var(--accent);font-weight:600}\
      .bmsc-empty{padding:32px 16px;text-align:center;color:var(--muted);font-size:13px}\
      .bmsc-preview{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}\
      .bmsc-preview-placeholder{display:flex;align-items:center;justify-content:center;flex:1;color:var(--muted);font-size:13px}\
      .bmsc-pv-info{flex-shrink:0;display:flex;align-items:flex-start;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border);background:var(--surface)}\
      .bmsc-pv-info-main{flex:1;min-width:0}\
      .bmsc-pv-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
      .bmsc-pv-themes{display:flex;flex-wrap:wrap;gap:5px}\
      .bmsc-pv-theme{font-size:11px;padding:2px 8px;border-radius:5px;border:1px solid var(--border);color:var(--muted);background:var(--surface2)}\
      .bmsc-pv-info-btns{display:flex;align-items:center;gap:7px;flex-shrink:0}\
      .bmsc-pv-render-toggle{padding:4px 11px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;font-family:inherit;white-space:nowrap;transition:border-color .15s,color .15s,background .15s}\
      .bmsc-pv-render-toggle:hover{border-color:var(--accent);color:var(--accent)}\
      .bmsc-pv-render-toggle.on{border-color:var(--accent);color:var(--accent);background:rgba(81,203,238,.1)}\
      .bmsc-pv-open-btn{padding:4px 13px;border-radius:6px;border:none;background:var(--accent);color:#0f0f0f;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}\
      [data-theme="dark"] .bmsc-pv-open-btn{color:#fff}\
      @media(prefers-color-scheme:dark){[data-theme="system"] .bmsc-pv-open-btn{color:#fff}}\
      .bmsc-pv-open-btn:hover{opacity:.88}\
      .bmsc-panes{flex:1;display:flex;overflow:hidden}\
      .bmsc-pv-splitter{width:5px;flex-shrink:0;background:var(--border);cursor:col-resize;display:none;transition:background .15s}\
      .bmsc-pv-splitter:hover,.bmsc-pv-splitter.dragging{background:var(--accent)}\
      .bmsc-pane{display:flex;flex-direction:column;overflow:hidden;min-width:0}\
      .bmsc-pane-label{flex-shrink:0;padding:5px 16px;font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;background:var(--surface);border-bottom:1px solid var(--surface2)}\
      .bmsc-pane-body{flex:1;overflow-y:auto;padding:16px;\
        scrollbar-width:thin;scrollbar-color:var(--border) transparent}\
      .bmsc-pane-body::-webkit-scrollbar{width:4px}\
      .bmsc-pane-body::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}\
      .bmsc-raw-line{display:flex;gap:10px;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.75;color:var(--text-dim);border-left:2px solid transparent;margin:0 -6px;padding:1px 6px;border-radius:2px}\
      .bmsc-raw-ln{flex-shrink:0;min-width:2.5em;text-align:right;color:var(--muted);font-size:11px;opacity:.5;user-select:none;line-height:1.75}\
      .bmsc-raw-text{flex:1;min-width:0;word-break:break-word}\
      .bmsc-raw-line.bmsc-raw-matched{background:rgba(81,203,238,.07);border-left-color:var(--accent)}\
      .bmsc-raw-line.bmsc-raw-target{background:rgba(81,203,238,.18);border-left-color:var(--accent)}\
      .bmsc-hl-0,.bmsc-raw-hl-0{background:rgba(81,203,238,.25);color:#51cbee;border-radius:2px;font-weight:600}\
      .bmsc-hl-1,.bmsc-raw-hl-1{background:rgba(245,166,35,.22);color:#f5a623;border-radius:2px;font-weight:600}\
      .bmsc-hl-2,.bmsc-raw-hl-2{background:rgba(126,211,33,.22);color:#7ed321;border-radius:2px;font-weight:600}\
      .bmsc-hl-3,.bmsc-raw-hl-3{background:rgba(233,30,140,.22);color:#e91e8c;border-radius:2px;font-weight:600}\
      .bmsc-hl-4,.bmsc-raw-hl-4{background:rgba(245,230,66,.28);color:#c8b800;border-radius:2px;font-weight:600}\
      .bmsc-hl-5,.bmsc-raw-hl-5{background:rgba(155,89,182,.22);color:#9b59b6;border-radius:2px;font-weight:600}\
      .bmsc-hl-6,.bmsc-raw-hl-6{background:rgba(231,76,60,.22);color:#e74c3c;border-radius:2px;font-weight:600}\
      .bmsc-hl-7,.bmsc-raw-hl-7{background:rgba(26,188,156,.22);color:#1abc9c;border-radius:2px;font-weight:600}\
      .bmsc-hl-8,.bmsc-raw-hl-8{background:rgba(52,152,219,.22);color:#3498db;border-radius:2px;font-weight:600}\
      .bmsc-hl-9,.bmsc-raw-hl-9{background:rgba(200,245,66,.22);color:#7ab800;border-radius:2px;font-weight:600}\
      .bmsc-hl-x,.bmsc-raw-hl-x{background:rgba(180,180,180,.2);color:#aaa;border-radius:2px;font-weight:600}\
    ';
    document.head.appendChild(style);

    // ── DOM ──────────────────────────────────────────────────────────
    var el = document.createElement('div');
    el.innerHTML =
      '<div class="bmsc-bg" id="bmscBg">' +
        '<div class="bmsc-topbar">' +
          '<div class="bmsc-tag-wrap" id="bmscTagWrap">' +
            '<input class="bmsc-input" id="bmscInput" placeholder="搜尋備註內文...">' +
          '</div>' +
          '<span class="bmsc-count" id="bmscCount"></span>' +
          '<button class="bmsc-close" id="bmscClose">關閉</button>' +
        '</div>' +
        '<div class="bmsc-body" id="bmscBody">' +
          '<div class="bmsc-list" id="bmscList"></div>' +
          '<div class="bmsc-splitter" id="bmscListSplitter"></div>' +
          '<div class="bmsc-preview" id="bmscPreview">' +
            '<div class="bmsc-preview-placeholder">← 點擊左側結果預覽內文</div>' +
          '</div>' +
        '</div>' +
      '</div>';
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
        chip.innerHTML = escHtml(tag) + '<span class="bmsc-stag-x" data-idx="' + idx + '">&times;</span>';
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
    function escHtml(s) {
      return window.bmEscHtml ? window.bmEscHtml(s)
        : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function highlightText(text, tags, clsPrefix) {
      if (!tags || tags.length === 0) return escHtml(text);
      var lower = text.toLowerCase();
      var ranges = [];
      tags.forEach(function(tag, idx) {
        var q = tag.toLowerCase(), i = lower.indexOf(q);
        while (i !== -1) {
          ranges.push({ s: i, e: i + tag.length, idx: idx });
          i = lower.indexOf(q, i + 1);
        }
      });
      if (ranges.length === 0) return escHtml(text);
      ranges.sort(function(a, b) { return a.s - b.s; });
      var out = '', p = 0;
      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i];
        if (r.s < p) continue; // skip overlap, first tag wins
        var cls = clsPrefix + '-' + (r.idx <= 9 ? r.idx : 'x');
        out += escHtml(text.substring(p, r.s)) +
               '<span class="' + cls + '">' + escHtml(text.substring(r.s, r.e)) + '</span>';
        p = r.e;
      }
      return out + escHtml(text.substring(p));
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
        groupTitle.innerHTML = '📄 ' + escHtml(fav.title || '（無標題）') +
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
            : (escHtml(line) || '&#8203;')) + '</span>';
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
