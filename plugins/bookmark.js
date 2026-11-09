registerPlugin('bookmark', {
  main: true,
  menuOrder: 2,
  menuIcon: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  icon: null,
  label: '書籤',
  mode: 'bookmark',
  favicon: function(canvas, ctx) {
    ctx.beginPath();
    ctx.moveTo(8, 4); ctx.lineTo(24, 4); ctx.lineTo(24, 28); ctx.lineTo(16, 22); ctx.lineTo(8, 28); ctx.closePath();
    ctx.fill();
  },

  init() {
    // ── Data ─────────────────────────────────────────────────────────
    const BM_STORAGE_KEY = 'bookmarkData';
    const BM_THEME_KEY = 'bookmarkTheme';
    const BM_TAB_POS_KEY = 'bookmarkTabPos';
    const BM_TAB_OVERFLOW_KEY = 'bookmarkTabOverflow';
    let bmData = { themes: [{ id: 'all', name: '全部收藏', icon: '⭐' }], favorites: [] };
    let currentThemeId = localStorage.getItem(BM_THEME_KEY) || 'all';
    let tabPosition = localStorage.getItem(BM_TAB_POS_KEY) || 'top';
    let tabOverflow = localStorage.getItem(BM_TAB_OVERFLOW_KEY) || 'scroll';
    var _tabScrollNeedsFocus = true;
    var _currentSidebar = null;

    function loadBmData() {
      try {
        const saved = localStorage.getItem(BM_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.themes && parsed.favorites) {
            if (!parsed.themes.find(t => t.id === 'all')) {
              parsed.themes.unshift({ id: 'all', name: '全部收藏', icon: '⭐' });
            }
            parsed.favorites.forEach(function(f) {
              if (!f.themeIds) {
                f.themeIds = f.themeId ? [f.themeId] : [];
                delete f.themeId;
              }
            });
            bmData = parsed;
            return;
          }
        }
      } catch (e) { }
      bmData = { themes: [{ id: 'all', name: '全部收藏', icon: '⭐' }], favorites: [] };
    }

    function saveBmData() {
      localStorage.setItem(BM_STORAGE_KEY, JSON.stringify(bmData));
      if (typeof renderToolbar === 'function') renderToolbar();
    }

    loadBmData();

    // ── CSS ──────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      /* Theme sidebar - mirrors toolbar style, always on toolbar's inner side */
      .bm-sidebar{position:fixed;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;z-index:99;background:var(--surface);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
      .bm-sidebar::-webkit-scrollbar{width:4px}
      .bm-sidebar::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
      .bm-sidebar button{min-height:36px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--text-dim);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:flex-start;gap:6px;padding:6px 10px;transition:background .15s,color .15s;white-space:nowrap;position:relative}
      .bm-sb-left .bm-sidebar button,.bm-sb-right .bm-sidebar button,.bm-sidebar.bm-sb-left button,.bm-sidebar.bm-sb-right button{width:100%}
      .bm-sidebar button:hover{background:var(--surface2);color:var(--accent)}
      .bm-sidebar button.active{color:var(--accent);background:var(--bg);z-index:2;overflow:visible}
      .bm-sidebar button.active::after{content:'';position:absolute;background:var(--bg);z-index:3}
      /* right sidebar: line on LEFT. 3 borders: top+bottom+right. Push right to touch line */
      .bm-sb-right button.active{border-radius:0;margin-left:-6px;margin-right:-6px;padding-left:16px;padding-right:16px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);border-right:1px solid var(--border);left:-5px}
      .bm-sb-right button.active::after{left:-10px;top:-1px;bottom:-1px;width:12px}
      /* left sidebar: line on RIGHT. 3 borders: top+bottom+left. Push left to touch line */
      .bm-sb-left button.active{border-radius:0;margin-left:-6px;margin-right:-6px;padding-left:16px;padding-right:16px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);border-left:1px solid var(--border);right:-5px}
      .bm-sb-left button.active::after{right:-10px;top:-1px;bottom:-1px;width:12px}
      /* top sidebar: line on BOTTOM. 3 borders: left+right+top. Push down to touch line */
      .bm-sb-top button.active{border-radius:0;margin-top:-6px;margin-bottom:-6px;padding-top:12px;padding-bottom:12px;border-left:1px solid var(--border);border-right:1px solid var(--border);border-top:1px solid var(--border);top:5px}
      .bm-sb-top button.active::after{bottom:-10px;left:-1px;right:-1px;height:12px}
      /* bottom sidebar: line on TOP. 3 borders: left+right+bottom. Push up to touch line */
      .bm-sb-bottom button.active{border-radius:0;margin-top:-6px;margin-bottom:-6px;padding-top:12px;padding-bottom:12px;border-left:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);bottom:5px}
      .bm-sb-bottom button.active::after{top:-10px;left:-1px;right:-1px;height:12px}
      .bm-sidebar .bm-tab-count{font-size:10px;margin-left:auto;background:var(--surface2);padding:1px 6px;border-radius:8px;color:var(--muted)}
      .bm-sidebar .bm-tab-gear{min-height:36px;justify-content:center;margin-top:auto;border-top:1px solid var(--border);border-radius:8px;font-size:16px}

      /* Sidebar positions (independent from toolbar) */
      /* Vertical sidebar (left/right) */
      .bm-sidebar.bm-sb-right{top:0;right:0;bottom:0;width:140px;padding:12px 6px}
      .bm-sidebar.bm-sb-right::after{content:'';position:absolute;left:0;top:0;bottom:0;width:0;border-left:1px solid var(--border)}
      .bm-sidebar.bm-sb-left{top:0;left:0;bottom:0;width:140px;padding:12px 6px}
      .bm-sidebar.bm-sb-left::after{content:'';position:absolute;right:0;top:0;bottom:0;width:0;border-right:1px solid var(--border)}
      /* Horizontal sidebar (top/bottom) */
      .bm-sidebar.bm-sb-top,.bm-sidebar.bm-sb-bottom{left:0;right:0;height:auto;flex-direction:row;width:auto;padding:0;overflow:visible}
      .bm-sidebar.bm-sb-top{top:0}
      .bm-sidebar.bm-sb-bottom{bottom:0}
      .bm-sidebar.bm-sb-top::after{content:'';position:absolute;left:0;right:0;bottom:0;height:0;border-bottom:1px solid var(--border)}
      .bm-sidebar.bm-sb-bottom::after{content:'';position:absolute;left:0;right:0;top:0;height:0;border-top:1px solid var(--border)}
      .bm-tab-scroll{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;padding:6px 4px;gap:2px;min-width:0;scroll-behavior:smooth;scrollbar-width:none}
      .bm-tab-scroll::-webkit-scrollbar{display:none}
      .bm-tab-scroll button{width:auto;white-space:nowrap;flex-shrink:0}
      .bm-tab-arrow{display:flex;align-items:center;justify-content:center;width:24px;flex-shrink:0;border:none;background:var(--surface);color:var(--text-dim);cursor:pointer;font-size:14px;padding:0;transition:color .15s,opacity .15s}
      .bm-tab-arrow:hover{color:var(--accent)}
      .bm-tab-arrow.disabled{opacity:.2;cursor:default;pointer-events:none}
      .bm-tab-fixed{display:flex;align-items:center;gap:6px;padding:4px 6px;flex-shrink:0;border-left:1px solid var(--border);overflow:visible}
      .bm-tab-fixed .bm-tab-gear{margin-top:0;border-top:none;border-radius:8px;min-width:36px;width:36px;min-height:36px;padding:0}
      .bm-sidebar.bm-sb-bottom button{width:auto;white-space:nowrap}
      .bm-sidebar.bm-sb-bottom .bm-tab-gear{margin-top:0;margin-left:auto;border-top:none;border-left:1px solid var(--border);border-radius:8px;min-width:36px;width:36px;padding:0}

      /* Offset sidebar to avoid toolbar overlap — set dynamically by JS */

      /* Body padding for sidebar */
      /* Body padding for sidebar — set dynamically by JS */

      /* Tab overflow modes for horizontal (top/bottom) */
      .bm-sidebar.bm-overflow-scroll .bm-tab-scroll{overflow-x:auto}
      .bm-sidebar.bm-overflow-dropdown .bm-tab-scroll{overflow:hidden}
      .bm-sidebar.bm-overflow-dropdown .bm-tab-select{display:block}
      .bm-sidebar.bm-overflow-wrap{position:relative !important;top:auto !important;bottom:auto !important;left:auto !important;right:auto !important}
      .bm-sidebar.bm-overflow-wrap .bm-tab-scroll{flex-wrap:wrap;overflow:visible}
      /* Wrap mode: active has full border, no ::after extending */
      /* Horizontal modes: active button must not change size */
      .bm-sidebar.bm-overflow-scroll button.active,.bm-sidebar.bm-overflow-dropdown button.active,.bm-sidebar.bm-overflow-wrap button.active{border:1px solid var(--accent) !important;border-radius:8px !important;margin:0 !important;padding:6px 10px !important;top:auto !important;bottom:auto !important;left:auto !important;right:auto !important;z-index:auto !important;overflow:hidden !important}
      .bm-sidebar.bm-overflow-scroll button.active::after,.bm-sidebar.bm-overflow-dropdown button.active::after,.bm-sidebar.bm-overflow-wrap button.active::after{display:none !important}
      /* Dropdown: visible buttons show, overflow select at end */
      .bm-tab-select{display:none;padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text-dim);font-size:12px;cursor:pointer;flex-shrink:0;min-width:60px}
      .bm-tab-overflow-btn{display:none;align-items:center;gap:4px;padding:4px 6px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--text-dim);cursor:pointer;font-size:14px;flex-shrink:0;min-width:36px;height:36px;justify-content:center;box-sizing:border-box}
      .bm-tab-overflow-btn:hover{background:var(--surface2);color:var(--accent)}
      .bm-tab-overflow-badge{font-size:10px;min-width:16px;height:16px;border-radius:8px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600}
      .bm-tab-overflow-popup{position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;min-width:160px;box-shadow:0 4px 16px rgba(0,0,0,.3);z-index:500;display:none}
      .bm-tab-overflow-popup.open{display:block}
      .bm-tab-overflow-popup button{display:block;width:100%;padding:8px 14px;background:none;border:none;color:var(--text-dim);text-align:left;cursor:pointer;font-size:12px;white-space:nowrap}
      .bm-tab-overflow-popup button:hover{background:var(--surface2);color:var(--text)}
      .bm-tab-overflow-popup button.active{color:var(--accent);font-weight:600}
      .bm-tab-settings-bg{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(4px)}
      .bm-tab-settings-bg.open{opacity:1;pointer-events:all}
      .bm-tab-settings{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;width:min(280px,85vw);display:flex;flex-direction:column;gap:14px}
      .bm-tab-settings h3{font-size:13px;color:var(--accent3);margin:0;display:flex;align-items:center;justify-content:space-between}
      .bm-overflow-section{display:flex;flex-direction:column;gap:6px}
      .bm-overflow-label{font-size:12px;color:var(--text-dim)}
      .bm-overflow-group{display:flex;gap:6px}
      .bm-overflow-btn{flex:1;padding:8px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;transition:border-color .15s,color .15s}
      .bm-overflow-btn:hover:not(.disabled){border-color:var(--accent);color:var(--accent)}
      .bm-overflow-btn.active{border-color:var(--accent);color:var(--accent);background:rgba(81,203,238,.1)}
      .bm-overflow-btn.disabled{opacity:.35;cursor:not-allowed}
      .bm-tab{padding:10px 20px;cursor:pointer;white-space:nowrap;color:var(--text-dim);border-bottom:3px solid transparent;font-size:14px;transition:color .15s;user-select:none;position:relative}
      .bm-tab:hover{color:var(--text)}
      .bm-tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}
      .bm-tab .bm-count{font-size:11px;background:var(--surface2);padding:1px 6px;border-radius:8px;margin-left:6px}

      /* Bookmark grid */
      .bm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;width:100%}
      .bm-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s}
      .bm-card{transition:transform .2s, box-shadow .2s, opacity .2s}
      .bm-card:hover{transform:translateY(-4px);box-shadow:0 8px 20px rgba(0,0,0,.3)}
      .bm-card.bm-drag-over{border-color:var(--accent);box-shadow:0 0 12px rgba(81,203,238,.3)}
      .bm-card.bm-flip{transition:transform .35s cubic-bezier(.4,0,.2,1)}
      @keyframes bm-zoom-in{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
      .bm-card.bm-enter{animation:bm-zoom-in .3s cubic-bezier(.34,1.56,.64,1) both}
      .bm-card-thumb{height:140px;background:var(--surface2);display:flex;align-items:center;justify-content:center;overflow:hidden}
      .bm-card-thumb img{width:100%;height:100%;object-fit:cover}
      .bm-card-thumb .bm-no-thumb{font-size:48px;color:var(--text-dim);opacity:.3}
      .bm-card-body{padding:12px}
      .bm-card-title{font-size:13px;font-weight:500;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}
      .bm-card-url{font-size:11px;color:var(--text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

      /* Empty state */
      .bm-empty{text-align:center;padding:60px 20px;color:var(--text-dim);min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%}
      .bm-empty-icon{margin-bottom:12px;color:var(--text-dim);opacity:.5}
      .bm-empty-icon svg{width:48px;height:48px}

      /* Context menu */
      .bm-ctx-menu{position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;z-index:500;min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,.4)}
      .bm-ctx-menu button{display:block;width:100%;padding:8px 16px;background:none;border:none;color:var(--text-dim);text-align:left;cursor:pointer;font-size:13px}
      .bm-ctx-menu button:hover{background:var(--surface2);color:var(--text)}

      /* Add/Edit modal */
      #bmEditModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}
      #bmEditModalBg.open{opacity:1;pointer-events:all}
      .bm-edit-modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:min(520px,94vw);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:16px;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}
      #bmEditModalBg.open .bm-edit-modal{transform:translateY(0) scale(1)}
      .bm-field{display:flex;flex-direction:column;gap:4px}
      .bm-field label{font-size:12px;color:var(--text-dim);font-family:'IBM Plex Mono',monospace}
      .bm-field input,.bm-field select{padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);font-size:13px;outline:none}
      .bm-field input:focus,.bm-field select:focus{border-color:var(--accent)}
      .bm-url-row{display:flex;gap:6px;align-items:center}
      .bm-url-row input{flex:1}
      .bm-fetch-btn{padding:8px 14px;border-radius:8px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-size:12px;white-space:nowrap;transition:background .15s}
      .bm-fetch-btn:hover{background:rgba(81,203,238,.1)}
      .bm-fetch-btn:disabled{opacity:.5;cursor:not-allowed}
      .bm-type-toggle{display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden}
      .bm-type-toggle button{flex:1;padding:6px 12px;border:none;background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;transition:background .15s,color .15s}
      .bm-type-toggle button.active{background:var(--accent);color:#fff}
      .bm-reader-bg{position:fixed;inset:0;z-index:200;background:var(--bg);display:flex;flex-direction:column;overflow:hidden}
      .bm-reader-header{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
      .bm-reader-header .bm-hdr-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}
      .bm-reader-header .bm-hdr-btn:hover{background:var(--surface2);color:var(--text)}
      .bm-reader-header .bm-hdr-btn:hover svg{color:var(--text)}
      .bm-reader-header .bm-hdr-btn.active{color:var(--accent);border-color:var(--accent)}
      .bm-reader-header .bm-hdr-btn svg{width:14px;height:14px;flex-shrink:0}
      .bm-reader-header .bm-hdr-back{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;white-space:nowrap;transition:background .15s,color .15s}
      .bm-reader-header .bm-hdr-back:hover{background:var(--surface2);color:var(--text)}
      .bm-reader-header .bm-hdr-back kbd{font-size:11px;padding:1px 5px;border-radius:4px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-family:inherit;pointer-events:none}
	  .bm-reader-header .bm-hdr-back:hover kbd {background: var(--border);color: #fff;}
	  .bm-reader-header .bm-hdr-mainmenu {margin-left: auto;display: inline-flex;align-items: center;justify-content: center;}
	  .bm-reader-header .bm-hdr-btn:hover {background: var(--accent);color: #fff;border-color: var(--accent);}
      .bm-reader-title{flex:1;font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bm-reader-content{flex:1;overflow:auto;padding:0;width:100%;position:relative;scrollbar-width:none}
      .bm-reader-content::-webkit-scrollbar{display:none}
      .bm-reader-inner{padding:24px 40px;line-height:1.8;color:var(--text-dim);font-size:15px}
      .bm-reader-inner h1,.bm-reader-inner h2,.bm-reader-inner h3{color:var(--text);margin:1.2em 0 .6em}
      .bm-reader-inner h1{font-size:1.8em;border-bottom:1px solid var(--border);padding-bottom:.3em}
      .bm-reader-inner h2{font-size:1.4em}
      .bm-reader-inner a{color:var(--accent)}
      .bm-reader-inner code{background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:.9em}
      .bm-reader-inner pre{background:var(--bm-code-bg,#0d1117);border:1px solid var(--border);border-radius:8px;padding:16px;overflow-x:auto;position:relative}
      .bm-reader-inner pre .bm-code-copy{position:absolute;top:6px;right:6px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);font-size:11px;cursor:pointer;opacity:0;transition:opacity .2s,background .15s,color .15s;z-index:1;font-family:inherit}
      .bm-reader-inner pre:hover .bm-code-copy{opacity:1}
      .bm-reader-inner pre .bm-code-copy:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
      .bm-reader-inner pre .bm-code-copy.copied{background:var(--success);color:#fff;border-color:var(--success);opacity:1}
      .bm-reader-inner pre code{background:none;padding:0}
      .bm-reader-inner pre code.hljs{padding:0;background:transparent}
      [data-theme="dark"] .bm-reader-inner,
      [data-theme="dark"] .bm-reader-inner pre{--bm-code-bg:#0d1117}
      [data-theme="light"] .bm-reader-inner,
      [data-theme="light"] .bm-reader-inner pre{--bm-code-bg:#f6f8fa}
      @media(prefers-color-scheme:light){[data-theme="system"] .bm-reader-inner,[data-theme="system"] .bm-reader-inner pre{--bm-code-bg:#f6f8fa}}
      @media(prefers-color-scheme:dark){[data-theme="system"] .bm-reader-inner,[data-theme="system"] .bm-reader-inner pre{--bm-code-bg:#0d1117}}
      .bm-reader-lang-badge{font-size:11px;padding:2px 10px;border-radius:6px;background:var(--surface2);color:var(--accent);border:1px solid var(--border);white-space:nowrap;font-weight:500;letter-spacing:.3px}
      .bm-reader-actions{display:flex;gap:6px;flex-shrink:0}
      .bm-reader-inner pre code{display:block}
      .bm-reader-inner .hljs-ln{border-collapse:collapse}
      .bm-reader-inner .hljs-ln td{border:none}
      .bm-reader-inner td.hljs-ln-numbers{user-select:none;-webkit-user-select:none;text-align:right;color:var(--bm-ln-color,#636d83);padding-right:16px;padding-left:12px;white-space:nowrap;vertical-align:top;border-right:1px solid var(--bm-ln-border,#3e4451)}
      [data-theme="dark"] .bm-reader-inner{--bm-ln-color:#636d83;--bm-ln-border:#3e4451}
      [data-theme="light"] .bm-reader-inner{--bm-ln-color:#999;--bm-ln-border:#d0d7de}
      @media(prefers-color-scheme:light){[data-theme="system"] .bm-reader-inner{--bm-ln-color:#999;--bm-ln-border:#d0d7de}}
      @media(prefers-color-scheme:dark){[data-theme="system"] .bm-reader-inner{--bm-ln-color:#636d83;--bm-ln-border:#3e4451}}
      .bm-reader-inner .hljs-ln-code{padding-left:16px;white-space:pre-wrap;word-break:break-all}
      .bm-reader-inner.bm-editing{display:flex;flex-direction:column;height:100%;padding:0!important}
      .bm-reader-inner.bm-editing .bm-reader-editor{flex:1;min-height:0;overflow:hidden}
      .bm-reader-inner .CodeMirror{height:100%;font-size:14px;line-height:1.7;font-family:'IBM Plex Mono',Consolas,monospace}
      .bm-reader-inner .CodeMirror-gutters{border-right:1px solid var(--bm-ln-border,#3e4451)}
      .bm-reader-inner blockquote{border-left:3px solid var(--accent);padding-left:16px;color:var(--muted);margin:1em 0}
      .bm-reader-inner img{max-width:100%;border-radius:8px}
      .bm-reader-inner table:not(.hljs-ln){border-collapse:collapse;width:100%}
      .bm-reader-inner th,.bm-reader-inner td:not(.hljs-ln-numbers):not(.hljs-ln-code){border:1px solid var(--border);padding:8px 12px;text-align:left}
      .bm-reader-inner th{background:var(--surface2)}
      /* Reader nav */
      .bm-reader-nav{display:flex;align-items:center;gap:4px;flex-shrink:0}
      .bm-reader-nav-btn{padding:4px 10px!important;font-size:16px!important;line-height:1}
      .bm-reader-nav-btn:disabled{opacity:.3;cursor:default!important}
      .bm-reader-counter{font-size:11px;color:var(--muted);white-space:nowrap;min-width:36px;text-align:center}
      /* Reader body (list + content) */
      .bm-reader-body{display:flex;flex:1;overflow:hidden;min-height:0}
      /* Left note list */
      .bm-reader-list{width:220px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid var(--border);background:var(--surface);overflow:hidden;transition:width .2s}
      .bm-reader-list.bm-list-hidden{width:0;border-right:none}
      .bm-reader-list-search{padding:7px 8px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:4px}
      .bm-reader-list-search input{flex:1;min-width:0;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 7px;color:var(--text);font-size:12px;outline:none}
      .bm-reader-list-search .bm-list-search-icon{flex-shrink:0;color:var(--muted);display:flex;align-items:center;pointer-events:none}
      .bm-reader-list-search .bm-list-search-icon svg{width:14px;height:14px}
      .bm-reader-list-close{flex-shrink:0;width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
      .bm-reader-list-close:hover{background:var(--surface2);color:var(--text)}
      /* Edge strip to open list when hidden */
      .bm-reader-list-tab{width:3px;overflow:hidden;flex-shrink:0;display:none;align-items:center;justify-content:center;background:var(--border);cursor:pointer;transition:width .15s,background .15s,color .15s;color:var(--muted)}
      .bm-reader-list-tab.bm-tab-visible{display:flex}
      .bm-reader-list-tab:hover{width:20px;background:var(--surface2);color:var(--accent)}
      .bm-reader-list-tab svg{width:10px;height:10px;flex-shrink:0;pointer-events:none;opacity:0;transition:opacity .15s}
      .bm-reader-list-tab:hover svg{opacity:1}
      .bm-reader-list-items{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
      .bm-reader-list-item{padding:7px 10px;font-size:12px;color:var(--text-dim);cursor:pointer;display:flex;align-items:center;gap:6px;border-left:2px solid transparent;position:relative}
      .bm-reader-list-item:hover{background:var(--surface2);color:var(--text)}
      .bm-reader-list-item.active{color:var(--accent);border-left-color:var(--accent);background:var(--bg)}
      .bm-reader-list-item.active-right{border-right:2px solid #f97316;background:var(--bg)}
      .bm-reader-list-item.active.active-right{border-right:2px solid #f97316}
      .bm-reader-list-item .bm-list-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bm-reader-list-item .bm-list-split-btn{opacity:0;font-size:11px;padding:2px 5px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);flex-shrink:0;cursor:pointer}
      .bm-reader-list-item:hover .bm-list-split-btn{opacity:1}
      .bm-reader-list-item .bm-list-split-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
      .bm-list-highlight{background:var(--accent);color:#fff;border-radius:2px;padding:0 1px}
      .bm-reader-list-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-bottom:1px solid var(--border);flex-shrink:0}
      .bm-list-tab{padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--text-dim);font-size:11px;cursor:pointer;transition:background .12s,color .12s}
      .bm-list-tab:hover{background:var(--surface2);color:var(--text)}
      .bm-list-tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
      .bm-list-tab-label{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--accent);font-weight:600}
      .bm-list-tab-reset{padding:0 4px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:12px;line-height:1}
      .bm-list-theme-tags{display:flex;gap:2px;flex-shrink:0;overflow:hidden;max-width:70px}
      .bm-list-theme-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bm-reader-pane-lang-badge{font-size:10px;padding:1px 7px;border-radius:5px;background:var(--surface2);color:var(--accent);border:1px solid var(--border);white-space:nowrap;flex-shrink:0}
      /* Main area (left pane + resizer + right pane) */
      .bm-reader-main{flex:1;display:flex;overflow:hidden;min-width:0}
      /* Per-pane wrapper */
      .bm-reader-pane{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
      /* Per-pane mini-header (only visible in split mode) */
      .bm-reader-pane-hd{display:flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;min-height:32px}
      .bm-reader-pane-hd.bm-pane-active{background:var(--surface);border-bottom:2px solid var(--accent)}
      .bm-reader-right .bm-reader-pane-hd.bm-pane-active{border-bottom-color:#f97316}
      .bm-reader-pane-hd.bm-pane-inactive{background:var(--bg);opacity:.7}
      .bm-reader-pane-hd-title{flex:1;font-size:12px;font-weight:600;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bm-reader-pane-hd.bm-pane-active .bm-reader-pane-hd-title{color:var(--text)}
      .bm-reader-pane-hd-actions{display:flex;gap:4px;flex-shrink:0}
      .bm-reader-pane-hd-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:11px;white-space:nowrap;transition:background .15s,color .15s}
      .bm-reader-pane-hd-btn:hover{background:var(--surface2);color:var(--text)}
      .bm-reader-pane-hd-btn svg{width:12px;height:12px}
      .bm-reader-pane-close{width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;flex-shrink:0}
      .bm-reader-pane-close:hover{background:var(--surface2);color:var(--text)}
      .bm-reader-pane-nav{display:flex;align-items:center;gap:1px;flex-shrink:0}
      .bm-reader-pane-nav button{padding:2px 8px;font-size:14px;border-radius:4px;border:none;background:transparent;color:var(--text-dim);cursor:pointer;line-height:1.2;transition:color .12s,background .12s}
      .bm-reader-pane-nav button:hover{background:var(--surface2);color:var(--text)}
      .bm-reader-pane-nav button:disabled{opacity:.25;pointer-events:none}
      .bm-reader-pane-nav span{font-size:10px;color:var(--muted);min-width:30px;text-align:center}
      /* Draggable resizer */
      .bm-reader-resizer{width:5px;flex-shrink:0;background:var(--border);cursor:col-resize;transition:background .15s;display:none}
      .bm-reader-resizer:hover,.bm-reader-resizer.dragging{background:var(--accent)}
      .bm-reader-resizer.bm-split-show{display:block}
      .bm-resizer-swap{position:fixed;width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;z-index:210;transition:background .15s,color .15s,border-color .15s;white-space:nowrap}
      .bm-resizer-swap:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
      /* Find-in-note bar */
      .bm-find-bar{position:fixed;display:none;align-items:center;gap:4px;padding:5px 8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.25);z-index:250}
      .bm-find-bar input{width:160px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 7px;color:var(--text);font-size:12px;outline:none}
      .bm-find-bar input:focus{border-color:var(--accent)}
      .bm-find-counter{font-size:11px;color:var(--muted);white-space:nowrap;min-width:40px;text-align:center}
      .bm-find-nav{padding:2px 7px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:13px;line-height:1.4;transition:background .12s,color .12s}
      .bm-find-nav:hover{background:var(--surface2);color:var(--text)}
      .bm-find-close{padding:2px 5px;border-radius:4px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:14px}
      .bm-find-close:hover{color:var(--text)}
      mark.bm-find-match{background:rgba(255,200,0,.4);color:inherit;border-radius:2px;padding:0 1px}
      mark.bm-find-current{background:#f97316;color:#fff;border-radius:2px;padding:0 1px}
      /* Right split pane */
      .bm-reader-right{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
      .bm-reader-right.bm-pane-hidden{display:none}
      .bm-reader-right-close{padding:3px 8px!important;font-size:13px!important}
      /* Command palette */
      .bm-reader-cmd-bg{position:fixed;inset:0;z-index:700;display:flex;align-items:flex-end;justify-content:flex-start;padding:0 0 12px 24px;pointer-events:none}
      .bm-reader-cmd{display:flex;align-items:center;background:var(--surface);border:1px solid var(--accent);border-radius:6px;padding:4px 10px;gap:6px;pointer-events:all;min-width:220px}
      .bm-reader-cmd-prefix{color:var(--accent);font-size:14px;font-family:monospace;font-weight:600}
      .bm-reader-cmd input{background:transparent;border:none;outline:none;color:var(--text);font-size:13px;font-family:monospace;flex:1;min-width:120px}
      .bm-reader-cmd-hint{font-size:11px;color:var(--muted)}
      .bm-mermaid-block{text-align:center;padding:16px 0;overflow-x:auto}
      .bm-mermaid-block svg{max-width:100%;height:auto}
      .bm-mermaid-error{border:1px dashed var(--danger);color:var(--danger);font-size:12px}
      .bm-paste-area{border:1.5px dashed var(--border);border-radius:8px;padding:12px;text-align:center;cursor:pointer;color:var(--text-dim);font-size:11px;transition:border-color .2s;min-height:60px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px}
      .bm-paste-area:hover{border-color:var(--accent)}
      .bm-paste-area img{max-width:100%;max-height:120px;border-radius:6px;object-fit:contain}
      .bm-btn-save{background:var(--accent);color:#fff;border:none;padding:12px;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px}
      .bm-btn-save:hover{opacity:.88}

      /* Theme add modal */
      #bmThemeModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}
      #bmThemeModalBg.open{opacity:1;pointer-events:all}
      .bm-theme-modal{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:min(400px,90vw);transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:16px}
      #bmThemeModalBg.open .bm-theme-modal{transform:translateY(0) scale(1)}

      /* Delete confirm modal */
      #bmConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:400}
      #bmConfirmBg.open{opacity:1;pointer-events:all}
      .bm-confirm{background:var(--surface);border:1px solid var(--danger);border-radius:12px;padding:24px;width:min(400px,90vw);display:flex;flex-direction:column;gap:16px}
      .bm-confirm-msg{font-size:14px;color:var(--text-dim);line-height:1.5;text-align:center}
      .bm-confirm-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
      .bm-confirm-card-name{font-size:14px;font-weight:500;color:var(--text)}
      .bm-confirm-card-url{font-size:11px;color:var(--text-dim);word-break:break-all}
      .bm-confirm-card-theme{font-size:11px;color:var(--accent2)}
      .bm-confirm-actions{display:flex;gap:10px}
      .bm-confirm-actions button{flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;transition:opacity .15s}
      .bm-confirm-cancel{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border) !important}
      .bm-confirm-cancel:hover{opacity:.8}
      .bm-confirm-delete{background:var(--danger);color:#fff}
      .bm-confirm-delete:hover{opacity:.85}
      /* Link confirm modal */
      #bmLinkConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:500}
      #bmLinkConfirmBg.open{opacity:1;pointer-events:all}
      .bm-link-confirm{background:var(--surface);border:1px solid var(--accent);border-radius:12px;padding:24px;width:min(440px,90vw);display:flex;flex-direction:column;gap:16px}
      .bm-link-confirm-url{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--accent);word-break:break-all;line-height:1.5}

      /* Theme delete confirm modal */
      #bmThemeConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:400}
      #bmThemeConfirmBg.open{opacity:1;pointer-events:all}

      /* Theme rename modal */
      #bmThemeRenameBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}
      #bmThemeRenameBg.open{opacity:1;pointer-events:all}

      /* Sort/Export/Import CSS moved to bookmark-sort.js, bookmark-export.js, bookmark-import.js */

      /* Theme checkbox list (edit modal) */
      .bm-theme-checklist{display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;padding:4px 0}
      .bm-theme-check-item{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;font-size:13px;color:var(--text-dim);user-select:none}
      .bm-theme-check-item:hover{background:var(--surface2)}
      .bm-theme-check-item input[type=checkbox]{accent-color:var(--accent);width:16px;height:16px;cursor:pointer}

      /* Card tag labels */
      .bm-card-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
      .bm-tag{font-size:10px;padding:2px 8px;border-radius:6px;background:var(--surface2);color:var(--accent);border:1px solid var(--border);white-space:nowrap}

      /* Search CSS moved to bookmark-search.js */
    `;
    document.head.appendChild(style);

    // ── Helper: escape HTML ──────────────────────────────────────────
    function escHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Helper: compress image ───────────────────────────────────────
    function compressThumb(dataUrl, cb) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var MAX = 420;
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    }

    // ── Helper: get theme name by id ─────────────────────────────────
    function getThemeName(themeId) {
      var t = bmData.themes.find(function (th) { return th.id === themeId; });
      return t ? t.name : '未分類';
    }

    // ── Helper: get favorites for current view ───────────────────────
    function getVisibleFavorites() {
      if (currentThemeId === 'all') return bmData.favorites;
      return bmData.favorites.filter(function (f) { return f.themeIds && f.themeIds.indexOf(currentThemeId) !== -1; });
    }

    // ── Sidebar layout calculator (init-level, shared with openTabSettings) ──
    function applySidebarLayout() {
      var sidebar = _currentSidebar;
      if (!sidebar) return;
      var tb = document.getElementById('toolbar');
      var tbW = 0, tbH = 0, tbPos = 'right';
      if (tb) {
        var tbRect = tb.getBoundingClientRect();
        tbW = tbRect.width;
        tbH = tbRect.height;
        tbPos = document.body.classList.contains('tb-right') ? 'right'
              : document.body.classList.contains('tb-left') ? 'left'
              : document.body.classList.contains('tb-top') ? 'top'
              : document.body.classList.contains('tb-bottom') ? 'bottom' : 'right';
      }
      // Reset sidebar offsets first
      sidebar.style.top = '';
      sidebar.style.bottom = '';
      sidebar.style.left = '';
      sidebar.style.right = '';
      if (tbPos === 'right') sidebar.style.right = tbW + 'px';
      else if (tbPos === 'left') sidebar.style.left = tbW + 'px';
      else if (tbPos === 'top') sidebar.style.top = tbH + 'px';
      else if (tbPos === 'bottom') sidebar.style.bottom = tbH + 'px';

      // Reset body padding
      document.body.style.paddingTop = '';
      document.body.style.paddingBottom = '';
      document.body.style.paddingLeft = '';
      document.body.style.paddingRight = '';

      var sbRect = sidebar.getBoundingClientRect();
      if (tabPosition === 'right' || tabPosition === 'left') {
        var totalSide = tbW + sbRect.width;
        if (tabPosition === 'right') document.body.style.paddingRight = totalSide + 'px';
        else document.body.style.paddingLeft = totalSide + 'px';
      } else if (tabPosition === 'top' || tabPosition === 'bottom') {
        var totalVert = (tbPos === 'top' || tbPos === 'bottom') ? tbH + sbRect.height : sbRect.height;
        if (tabPosition === 'top') document.body.style.paddingTop = totalVert + 'px';
        else document.body.style.paddingBottom = totalVert + 'px';
      }
    }

    // ── Context menu ─────────────────────────────────────────────────
    var activeCtxMenu = null;

    function removeCtxMenu() {
      if (activeCtxMenu) {
        activeCtxMenu.remove();
        activeCtxMenu = null;
      }
    }

    document.addEventListener('click', function () { removeCtxMenu(); });

    function showBookmarkCtxMenu(x, y, favId) {
      removeCtxMenu();
      var menu = document.createElement('div');
      menu.className = 'bm-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var editBtn = document.createElement('button');
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        openEditBookmark(favId);
      });

      var copyBtn = document.createElement('button');
      copyBtn.textContent = '複製';
      copyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        var src = bmData.favorites.find(function (f) { return f.id === favId; });
        if (!src) return;
        var clone = JSON.parse(JSON.stringify(src));
        clone.id = 'fav_' + Date.now();
        var base = clone.title.replace(/-copy\(\d+\)$/, '');
        var n = 1;
        while (bmData.favorites.some(function (f) { return f.title === base + '-copy(' + n + ')'; })) n++;
        clone.title = base + '-copy(' + n + ')';
        bmData.favorites.push(clone);
        saveBmData();
        renderBookmarks();
        showToast('書籤已複製');
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = '刪除';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        showDeleteConfirm(favId);
      });

      menu.appendChild(editBtn);
      menu.appendChild(copyBtn);
      menu.appendChild(deleteBtn);
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;

      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    function openTabSettings() {
      var existing = document.getElementById('bmTabSettingsBg');
      if (existing) existing.remove();

      var bg = document.createElement('div');
      bg.className = 'bm-tab-settings-bg open';
      bg.id = 'bmTabSettingsBg';
      bg.innerHTML = '<div class="bm-tab-settings">' +
        '<div class="modal-header"><h2>' + window.CARD_ICONS.setting + '頁籤設定</h2><button class="close-btn" id="bmTabSettingsClose">✕</button></div>' +
        '<div class="pos-picker">' +
          '<button class="pos-top bm-tab-pos-btn' + (tabPosition === 'top' ? ' active' : '') + '" data-pos="top">⬆ 置頂</button>' +
          '<button class="pos-left bm-tab-pos-btn' + (tabPosition === 'left' ? ' active' : '') + '" data-pos="left">⬅ 靠左</button>' +
          '<div class="pos-picker-screen"></div>' +
          '<button class="pos-right bm-tab-pos-btn' + (tabPosition === 'right' ? ' active' : '') + '" data-pos="right">靠右 ➡</button>' +
          '<button class="pos-bottom bm-tab-pos-btn' + (tabPosition === 'bottom' ? ' active' : '') + '" data-pos="bottom">⬇ 置底</button>' +
        '</div>' +
        '<div class="bm-overflow-section">' +
          '<span class="bm-overflow-label">頁籤溢出</span>' +
          '<div class="bm-overflow-group">' +
            '<button class="bm-overflow-btn" data-of="scroll">捲動</button>' +
            '<button class="bm-overflow-btn" data-of="dropdown">下拉選單</button>' +
            '<button class="bm-overflow-btn" data-of="wrap">多行</button>' +
          '</div>' +
        '</div>' +
      '</div>';

      document.body.appendChild(bg);

      bindPopup(bg, function() { bg.remove(); });

      function updateOverflowUI() {
        var isHz = (tabPosition === 'top' || tabPosition === 'bottom');
        var section = bg.querySelector('.bm-overflow-section');
        if (section) {
          section.querySelectorAll('.bm-overflow-btn').forEach(function(b) {
            b.disabled = !isHz;
            b.classList.toggle('disabled', !isHz);
            b.classList.remove('active');
            b.style.borderColor = '';
            b.style.color = '';
          });
          if (!isHz) {
            tabOverflow = 'scroll';
            localStorage.setItem(BM_TAB_OVERFLOW_KEY, tabOverflow);
          }
          var activeBtn = section.querySelector('.bm-overflow-btn[data-of="' + tabOverflow + '"]');
          if (activeBtn) { activeBtn.classList.add('active'); activeBtn.style.borderColor = 'var(--accent)'; activeBtn.style.color = 'var(--accent)'; }
        }
      }

      bg.querySelectorAll('.bm-tab-pos-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          tabPosition = btn.dataset.pos;
          bg.querySelectorAll('.bm-tab-pos-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          updateOverflowUI();
        });
      });

      bg.querySelectorAll('.bm-overflow-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (btn.disabled) return;
          tabOverflow = btn.dataset.of;
          updateOverflowUI();
        });
      });
      updateOverflowUI();

      // Apply button
      var applyBtn = document.createElement('button');
      applyBtn.textContent = '套用';
      applyBtn.className = 'tb-apply-btn';
      bg.querySelector('.bm-tab-settings').appendChild(applyBtn);
      applyBtn.addEventListener('click', function() {
        localStorage.setItem(BM_TAB_POS_KEY, tabPosition);
        localStorage.setItem(BM_TAB_OVERFLOW_KEY, tabOverflow);
        bg.remove();
        renderBookmarks();
        // 等 render + layout 完全穩定後，補算一次 sidebar 位置與 body padding
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            applySidebarLayout();
          });
        });
      });
    }

    function showThemeCtxMenu(x, y, themeId) {
      removeCtxMenu();
      if (themeId === 'all') return;

      var menu = document.createElement('div');
      menu.className = 'bm-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var renameBtn = document.createElement('button');
      renameBtn.textContent = '重新命名';
      renameBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        openRenameTheme(themeId);
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = '刪除主題';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCtxMenu();
        showThemeDeleteConfirm(themeId);
      });

      menu.appendChild(renameBtn);
      menu.appendChild(deleteBtn);
      menu.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;

      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    // ── renderBookmarks ──────────────────────────────────────────────
    function capturePositions() {
      var map = {};
      document.querySelectorAll('.bm-card[data-fav-id]').forEach(function(el) {
        var r = el.getBoundingClientRect();
        map[el.dataset.favId] = { top: r.top, left: r.left };
      });
      return map;
    }

    function animateFlip(oldPositions) {
      document.querySelectorAll('.bm-card[data-fav-id]').forEach(function(el) {
        var id = el.dataset.favId;
        var old = oldPositions[id];
        if (!old) return;
        var now = el.getBoundingClientRect();
        var dx = old.left - now.left;
        var dy = old.top - now.top;
        if (dx === 0 && dy === 0) return;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        el.style.transition = 'none';
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            el.classList.add('bm-flip');
            el.style.transform = '';
            el.style.transition = '';
            el.addEventListener('transitionend', function handler() {
              el.classList.remove('bm-flip');
              el.removeEventListener('transitionend', handler);
            });
          });
        });
      });
    }

    var _animateEntry = false;
    var _prevFavIds = new Set();
    function renderBookmarks() {
      loadBmData();
      if (typeof renderToolbar === 'function') renderToolbar();
      if (currentThemeId !== 'all' && !bmData.themes.find(function(t) { return t.id === currentThemeId; })) {
        currentThemeId = 'all';
        localStorage.setItem(BM_THEME_KEY, currentThemeId);
      }
      var wrapper = document.getElementById('card-wrapper');
      var oldPositions = capturePositions();
      wrapper.innerHTML = '';

      var oldSidebar = document.getElementById('bmSidebar');
      if (oldSidebar) {
        _tabScrollNeedsFocus = false;
        oldSidebar.remove();
      }

      if (bmData.favorites.length === 0) {
        _currentSidebar = null;
        document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
        document.body.style.paddingTop = ''; document.body.style.paddingBottom = ''; document.body.style.paddingLeft = ''; document.body.style.paddingRight = '';
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'bm-empty';
        emptyDiv.innerHTML = '<div class="bm-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div><div>尚無書籤</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div>';
        wrapper.appendChild(emptyDiv);
        return;
      }

      // Build sidebar (fixed, like toolbar)
      var sidebar = document.createElement('div');
      var isHorizontal = (tabPosition === 'top' || tabPosition === 'bottom');
      sidebar.className = 'bm-sidebar bm-sb-' + tabPosition + (isHorizontal ? ' bm-overflow-' + tabOverflow : '');
      sidebar.id = 'bmSidebar';

      // Build theme buttons
      var tabContainer = isHorizontal ? document.createElement('div') : sidebar;
      if (isHorizontal) tabContainer.className = 'bm-tab-scroll';

      bmData.themes.forEach(function (theme) {
        var btn = document.createElement('button');
        if (theme.id === currentThemeId) btn.classList.add('active');
        var count = theme.id === 'all'
          ? bmData.favorites.length
          : bmData.favorites.filter(function (f) { return f.themeIds && f.themeIds.indexOf(theme.id) !== -1; }).length;
        btn.innerHTML = escHtml(theme.icon ? theme.icon + ' ' : '') + escHtml(theme.name) +
          '<span class="bm-tab-count">' + count + '</span>';
        btn.dataset.themeId = theme.id;
        btn.addEventListener('click', function () {
          if (currentThemeId === theme.id) return;
          _prevFavIds = new Set();
          document.querySelectorAll('.bm-card[data-fav-id]').forEach(function(c) {
            _prevFavIds.add(c.dataset.favId);
          });
          _animateEntry = true;
          currentThemeId = theme.id;
          localStorage.setItem(BM_THEME_KEY, currentThemeId);
          // Update active class without rebuilding sidebar
          tabContainer.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          // Update counts
          tabContainer.querySelectorAll('button').forEach(function(b, idx) {
            var t = bmData.themes[idx];
            if (!t) return;
            var c = t.id === 'all' ? bmData.favorites.length : bmData.favorites.filter(function(f) { return f.themeIds && f.themeIds.indexOf(t.id) !== -1; }).length;
            var badge = b.querySelector('.bm-tab-count');
            if (badge) badge.textContent = c;
          });
          renderBookmarkContent();
        });
        btn.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          showThemeCtxMenu(e.clientX, e.clientY, theme.id);
        });
        tabContainer.appendChild(btn);
      });

      if (isHorizontal) {
        // Left arrow
        var arrowLeft = document.createElement('button');
        arrowLeft.className = 'bm-tab-arrow';
        arrowLeft.innerHTML = '◀';
        arrowLeft.addEventListener('click', function() {
          tabContainer.scrollLeft -= 120;
        });

        // Right arrow
        var arrowRight = document.createElement('button');
        arrowRight.className = 'bm-tab-arrow';
        arrowRight.innerHTML = '▶';
        arrowRight.addEventListener('click', function() {
          tabContainer.scrollLeft += 120;
        });

        function updateArrows() {
          arrowLeft.classList.toggle('disabled', tabContainer.scrollLeft <= 0);
          arrowRight.classList.toggle('disabled', tabContainer.scrollLeft >= tabContainer.scrollWidth - tabContainer.clientWidth - 1);
        }
        tabContainer.addEventListener('scroll', updateArrows);
        tabContainer.addEventListener('wheel', function(e) {
          e.preventDefault();
          e.stopPropagation();
          tabContainer.scrollLeft += (e.deltaY || e.deltaX);
        }, { passive: false });

        if (tabOverflow === 'scroll') {
          sidebar.appendChild(arrowLeft);
        }
        sidebar.appendChild(tabContainer);
        if (tabOverflow === 'scroll') {
          sidebar.appendChild(arrowRight);
        }

        // Only on first render (page load): scroll active tab into view
        setTimeout(function() {
          if (_tabScrollNeedsFocus) {
            _tabScrollNeedsFocus = false;
            tabContainer.style.scrollBehavior = 'auto';
            var activeBtn = tabContainer.querySelector('button.active');
            if (activeBtn) {
              var cw = tabContainer.clientWidth;
              var maxScroll = tabContainer.scrollWidth - cw;
              if (activeBtn.offsetLeft + activeBtn.offsetWidth > cw) {
                tabContainer.scrollLeft = maxScroll;
              }
            }
            tabContainer.style.scrollBehavior = '';
          }
          updateArrows();
        }, 50);

        // Fixed right section: dropdown select + gear
        var fixedSection = document.createElement('div');
        fixedSection.className = 'bm-tab-fixed';

        var overflowBtn = null;
        var overflowPopup = null;
        if (tabOverflow === 'dropdown') {
          overflowBtn = document.createElement('button');
          overflowBtn.className = 'bm-tab-overflow-btn';
          overflowBtn.innerHTML = window.CARD_ICONS.menu + '<span class="bm-tab-overflow-badge">0</span>';
          overflowPopup = document.createElement('div');
          overflowPopup.className = 'bm-tab-overflow-popup';
          overflowBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var rect = overflowBtn.getBoundingClientRect();
            overflowPopup.style.top = (rect.bottom + 4) + 'px';
            overflowPopup.style.right = (window.innerWidth - rect.right) + 'px';
            overflowPopup.classList.toggle('open');
          });
          document.addEventListener('click', function() { overflowPopup.classList.remove('open'); });
          fixedSection.appendChild(overflowBtn);
          document.body.appendChild(overflowPopup);
        }

        var gearBtn = document.createElement('button');
        gearBtn.className = 'bm-tab-gear';
        gearBtn.innerHTML = window.CARD_ICONS.setting;
        gearBtn.addEventListener('click', function(e) { e.stopPropagation(); openTabSettings(); });
        fixedSection.appendChild(gearBtn);

        sidebar.appendChild(fixedSection);
      } else {
        // Vertical: gear at bottom
        var gearBtn = document.createElement('button');
        gearBtn.className = 'bm-tab-gear';
        gearBtn.innerHTML = window.CARD_ICONS.setting;
        gearBtn.addEventListener('click', function(e) { e.stopPropagation(); openTabSettings(); });
        sidebar.appendChild(gearBtn);
        var overflowSel = null;
      }

      if (isHorizontal && tabOverflow === 'wrap') {
        wrapper.appendChild(sidebar);
        document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
        document.body.classList.add('bm-active');
      } else {
        document.body.appendChild(sidebar);
        document.body.classList.remove('bm-active', 'bm-pos-top', 'bm-pos-bottom', 'bm-pos-left', 'bm-pos-right');
        document.body.classList.add('bm-active', 'bm-pos-' + tabPosition);
      }

      // ── 儲存 sidebar 參照，雙層 rAF 確保 layout 完全穩定後才計算 ──
      _currentSidebar = sidebar;
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          applySidebarLayout();
        });
      });

      // Dropdown mode: detect overflowing buttons, move to popup menu
      if (overflowBtn && overflowPopup && isHorizontal) {
        function recalcDropdown() {
          var themeButtons = tabContainer.querySelectorAll('button');
          themeButtons.forEach(function(btn) { btn.style.display = ''; });
          overflowPopup.innerHTML = '';
          overflowBtn.style.display = '';

          var containerWidth = tabContainer.clientWidth;
          var overflowCount = 0;
          themeButtons.forEach(function(btn, i) {
            if (btn.offsetLeft + btn.offsetWidth > containerWidth) {
              btn.style.display = 'none';
              var theme = bmData.themes[i];
              if (theme) {
                var menuItem = document.createElement('button');
                menuItem.textContent = (theme.icon || '') + ' ' + theme.name;
                if (theme.id === currentThemeId) menuItem.classList.add('active');
                menuItem.addEventListener('click', function(e) {
                  e.stopPropagation();
                  overflowPopup.classList.remove('open');
                  currentThemeId = theme.id;
                  localStorage.setItem(BM_THEME_KEY, currentThemeId);
                  _animateEntry = true;
                  renderBookmarks();
                });
                overflowPopup.appendChild(menuItem);
                overflowCount++;
              }
            }
          });
          if (overflowCount === 0) {
            overflowBtn.style.display = 'none';
            overflowPopup.classList.remove('open');
          } else {
            overflowBtn.style.display = 'flex';
            overflowBtn.querySelector('.bm-tab-overflow-badge').textContent = overflowCount;
          }
        }
        requestAnimationFrame(recalcDropdown);
        var _dropdownResizeObs = new ResizeObserver(function() { recalcDropdown(); });
        _dropdownResizeObs.observe(tabContainer);
      }

      if (isHorizontal && tabOverflow === 'scroll') {
        new ResizeObserver(function() { updateArrows(); }).observe(tabContainer);
      }

      renderBookmarkContent();
    }

    function renderBookmarkContent() {
      var readerBg = document.querySelector('.bm-reader-bg');
      if (readerBg && readerBg.style.display === 'none') {
        readerBg.style.removeProperty('display');
      }
      var wrapper = document.getElementById('card-wrapper');
      var oldPositions = capturePositions();
      // Clear only bookmark grid content, not sidebar
      var oldGrid = wrapper.querySelector('.bm-grid');
      if (oldGrid) oldGrid.remove();
      var oldEmpty = wrapper.querySelector('.bm-empty');
      if (oldEmpty) oldEmpty.remove();

      var visibleFavs = getVisibleFavorites();

      if (visibleFavs.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'bm-empty';
        emptyDiv.innerHTML = '<div class="bm-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div><div>尚無書籤</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增書籤</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div>';
        wrapper.appendChild(emptyDiv);
        return;
      }

      var grid = document.createElement('div');
      grid.className = 'bm-grid';

      var dragSrcId = null;

      visibleFavs.forEach(function (fav) {
        var card = document.createElement('div');
        card.className = 'bm-card';
        card.draggable = true;
        card.dataset.favId = fav.id;

        var thumbDiv = document.createElement('div');
        thumbDiv.className = 'bm-card-thumb';
        if (fav.thumbnail) {
          var img = document.createElement('img');
          img.src = fav.thumbnail;
          img.alt = fav.title;
          img.onerror = function () {
            thumbDiv.innerHTML = '<div class="bm-no-thumb">🌐</div>';
          };
          thumbDiv.appendChild(img);
        } else {
          thumbDiv.innerHTML = '<div class="bm-no-thumb">🌐</div>';
        }

        var body = document.createElement('div');
        body.className = 'bm-card-body';
        body.innerHTML = '<div class="bm-card-title">' + escHtml(fav.title) + '</div>' +
          '<div class="bm-card-url">' + (fav.content ? '📝 筆記' : escHtml(fav.url)) + '</div>';

        var favThemes = fav.themeIds || [];
        var showTags = [];
        if (currentThemeId === 'all' && favThemes.length > 0) {
          showTags = favThemes;
        } else if (currentThemeId !== 'all' && favThemes.length >= 2) {
          showTags = favThemes.filter(function(tid) { return tid !== currentThemeId; });
        }
        if (showTags.length > 0) {
          var tagsDiv = document.createElement('div');
          tagsDiv.className = 'bm-card-tags';
          showTags.forEach(function(tid) {
            var span = document.createElement('span');
            span.className = 'bm-tag';
            span.textContent = getThemeName(tid);
            tagsDiv.appendChild(span);
          });
          body.appendChild(tagsDiv);
        }

        card.appendChild(thumbDiv);
        card.appendChild(body);

        card.addEventListener('click', function () {
          if (fav.content) {
            var notesList = getVisibleFavorites().filter(function(f) { return f.content; });			
            openReader(fav.title, fav.content, fav.notionId, fav.codeLang, fav.id, notesList);
          } else if (fav.url) {
            window.open(fav.url, '_blank');
          }
        });

        card.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          showBookmarkCtxMenu(e.clientX, e.clientY, fav.id);
        });

        card.addEventListener('dragstart', function (e) {
          dragSrcId = fav.id;
          card.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', function () {
          card.style.opacity = '';
          grid.querySelectorAll('.bm-card').forEach(function (c) { c.classList.remove('bm-drag-over'); });
        });
        card.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          grid.querySelectorAll('.bm-card').forEach(function (c) { c.classList.remove('bm-drag-over'); });
          card.classList.add('bm-drag-over');
        });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          card.classList.remove('bm-drag-over');
          if (!dragSrcId || dragSrcId === fav.id) return;
          var srcIdx = bmData.favorites.findIndex(function (f) { return f.id === dragSrcId; });
          var dstIdx = bmData.favorites.findIndex(function (f) { return f.id === fav.id; });
          if (srcIdx === -1 || dstIdx === -1) return;
          var moved = bmData.favorites.splice(srcIdx, 1)[0];
          bmData.favorites.splice(dstIdx, 0, moved);
          saveBmData();
          renderBookmarks();
        });

        grid.appendChild(card);
      });

      wrapper.appendChild(grid);

      if (_animateEntry) {
        _animateEntry = false;
        var newIdx = 0;
        grid.querySelectorAll('.bm-card').forEach(function(c) {
          var id = c.dataset.favId;
          if (_prevFavIds.has(id) && oldPositions[id]) {
            var now = c.getBoundingClientRect();
            var old = oldPositions[id];
            var dx = old.left - now.left;
            var dy = old.top - now.top;
            if (dx !== 0 || dy !== 0) {
              c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
              c.style.transition = 'none';
              requestAnimationFrame(function() { requestAnimationFrame(function() {
                c.classList.add('bm-flip');
                c.style.transform = '';
                c.style.transition = '';
                c.addEventListener('transitionend', function h() { c.classList.remove('bm-flip'); c.removeEventListener('transitionend', h); });
              }); });
            }
          } else {
            c.style.animationDelay = (newIdx * 50) + 'ms';
            c.classList.add('bm-enter');
            c.addEventListener('animationend', function h() { c.classList.remove('bm-enter'); c.style.animationDelay = ''; c.removeEventListener('animationend', h); });
            newIdx++;
          }
        });
        _prevFavIds = new Set();
      } else {
        animateFlip(oldPositions);
      }
    }

    // ── Reader panel ──────────────────────────────────────────────────
    function extractNotionId(str) {
      if (!str) return null;
      var m = str.match(/([a-f0-9]{32})/);
      return m ? m[1] : null;
    }

    function slugify(text) {
      return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, '');
    }

    function replaceNotionLinks(md, selfNotionId) {
      return md.replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]*notion\.so[^\s)]*)\)/g, function(match, text, href) {
        var hrefId = extractNotionId(href);
        if (!hrefId) return match;

        if (selfNotionId && hrefId === selfNotionId) {
          return '[' + text + '](#' + slugify(text) + ')';
        }

        var found = bmData.favorites.find(function(f) {
          if (!f.content) return false;
          if (f.notionId === hrefId) return true;
          if (f.url && extractNotionId(f.url) === hrefId) return true;
          if (f.title && f.title === text) return true;
          return false;
        });
        if (found) return '[' + text + '](#bm:' + found.id + ')';
        return match;
      });
    }

    var readerScroll = null;
    var currentReaderNotionId = null;
    var currentReaderCodeLang = 'auto';

    function getLangLabel(codeLang) {
      var map = {auto:'Auto',javascript:'JavaScript',typescript:'TypeScript',css:'CSS',csharp:'C#',bash:'WSL / Bash',python:'Python',markdown:'Markdown',html:'HTML',json:'JSON',sql:'SQL',xml:'XML',yaml:'YAML',ini:'Config / INI',plaintext:'Text'};
      return map[codeLang] || codeLang || 'Auto';
    }

    function highlightReaderCode(container, codeLang) {
      if (!window.hljs) return;
      var blocks = container.querySelectorAll('pre code');
      if (blocks.length === 0) return;
      blocks.forEach(function(block) {
        block.removeAttribute('data-highlighted');
        var hasLangClass = Array.from(block.classList).some(function(c) { return /^language-/.test(c); });
        if (codeLang && codeLang !== 'auto' && codeLang !== 'plaintext') {
          if (!hasLangClass) block.className = 'language-' + codeLang;
          hljs.highlightElement(block);
        } else if (codeLang === 'plaintext') {
          block.classList.add('hljs');
        } else {
          hljs.highlightElement(block);
        }
      });
    }

    function detectLangFromTitle(title) {
      if (!title) return null;
      var ext = (title.match(/\.([a-zA-Z0-9]+)$/) || [])[1];
      if (!ext) {
        // 無副檔名但整個名稱是已知 config 檔
        var known = { pg_hba: 'ini', pgpass: 'ini', dockerfile: 'ini', makefile: 'bash', gemfile: 'ruby', procfile: 'ini' };
        return known[title.toLowerCase()] || null;
      }
      var map = {
        js: 'javascript', mjs: 'javascript', cjs: 'javascript',
        ts: 'typescript', tsx: 'typescript',
        py: 'python', pyw: 'python',
        cs: 'csharp',
        css: 'css', scss: 'css', less: 'css',
        html: 'html', htm: 'html',
        xml: 'xml', svg: 'xml', xsl: 'xml',
        json: 'json', jsonc: 'json',
        sql: 'sql',
        sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
        yaml: 'yaml', yml: 'yaml',
        md: 'markdown', mdx: 'markdown',
        conf: 'ini', cfg: 'ini', ini: 'ini', env: 'ini', toml: 'ini',
        txt: 'plaintext', log: 'plaintext'
      };
      return map[ext.toLowerCase()] || null;
    }

    function detectLangFromContent(content) {
      if (!content) return 'auto';
      var trimmed = content.trim();

      // 整個內容就是單一 code block → 返回該語言
      var singleFence = trimmed.match(/^```(\w+)\n[\s\S]*?```\s*$/);
      if (singleFence) return singleFence[1] || 'auto';

      var sample = content.substring(0, 3000);

      // Config / INI（先於 markdown，避免 # 注釋被誤判為標題）
      if (/^(local|host|hostssl|hostnossl|hostgssenc|hostnogssenc)\s+\S/m.test(sample)) return 'ini';
      if (/^\[[\w\s.-]+\]/m.test(sample) && /^[\w.-]+\s*=\s*\S/m.test(sample)) return 'ini';

      // Markdown 特徵計分
      var mdScore = 0;
      // # 標題：只有非全大寫的才算真正標題（全大寫通常是 config 注釋）
      if (/^#{1,6}\s+(?![A-Z_\s]+$)\S/m.test(sample)) mdScore += 3;
      if (/^\s*[-*]\s+/m.test(sample)) mdScore += 2;
      if (/\[.+?\]\(.+?\)/.test(sample)) mdScore += 2;
      if (/```/.test(sample)) mdScore += 2;
      if (/\*\*.+?\*\*|__.+?__/.test(sample)) mdScore += 1;
      if (/^>\s/m.test(sample)) mdScore += 1;
      if (mdScore >= 3) return 'markdown';

      if (/\bSELECT\b.*\bFROM\b/i.test(sample) || /\bINSERT\s+INTO\b/i.test(sample) || /\bCREATE\s+TABLE\b/i.test(sample)) return 'sql';
      if (/\busing\s+System\b/.test(sample) || /\bnamespace\s+\w/.test(sample) || /\bpublic\s+(class|void|static|async)\b/.test(sample)) return 'csharp';
      if (/\bdef\s+\w+\s*\(/.test(sample) || (/\bimport\s+\w+/.test(sample) && /:\s*$/m.test(sample))) return 'python';
      if (/\binterface\s+\w+|:\s*(string|number|boolean|void|any|never)\b/.test(sample)) return 'typescript';
      if (/\bfunction\s*[\w]*\s*\(/.test(sample) || /\bconst\s+\w+\s*=/.test(sample) || /\bconsole\.log\b/.test(sample) || /=>\s*\{/.test(sample)) return 'javascript';
      if (/^\s*[\w-]+\s*:\s*[^;{]+;/m.test(sample) && /\{[\s\S]*?\}/.test(sample) && /@media|\.[\w-]+\s*\{|#[\w-]+\s*\{/.test(sample)) return 'css';
      if (/^\s*<\?xml/.test(sample) || (/^\s*<[\w:]+[\s>]/.test(sample) && /<\/[\w:]+>/.test(sample))) return 'xml';
      if (/^\s*<[\w!]/.test(sample) && /<\/\w+>/.test(sample)) return 'html';
      if (/^\s*\{[\s\S]*?"[\w]+"/.test(sample) || /^\s*\[[\s\S]*?\{/.test(sample)) return 'json';
      if (/^\s*[$#]\s|^\s*(sudo|apt|yum|dnf|chmod|chown|grep|awk|sed|curl|wget)\s/m.test(sample)) return 'bash';
      if (/^[\w-]+:\s+\S/m.test(sample) && /^---/m.test(sample)) return 'yaml';
      // 大量 # 注釋行且無 markdown inline 語法 → config
      if (/^#/m.test(sample) && !/\[.+?\]\(.+?\)|\*\*.+?\*\*/.test(sample) && /^[\w.-]+\s*[=:]/m.test(sample)) return 'ini';
      return 'auto';
    }

    function applyHljsLineNumbers(container) {
      if (!window.hljs || !window.hljs.lineNumbersBlock) return;
      var blocks = container.querySelectorAll('pre code');
      blocks.forEach(function(block) {
        hljs.lineNumbersBlock(block);
      });
    }

    function getCodeText(codeEl) {
      var table = codeEl.querySelector('.hljs-ln');
      if (table) {
        var lines = [];
        table.querySelectorAll('.hljs-ln-code').forEach(function(td) {
          lines.push(td.innerText);
        });
        return lines.join('\n');
      }
      return codeEl.innerText;
    }

    function addCodeCopyButtons(container) {
      container.querySelectorAll('pre').forEach(function(pre) {
        if (pre.querySelector('.bm-code-copy')) return;
        var codeEl = pre.querySelector('code');
        if (!codeEl) return;
        var btn = document.createElement('button');
        btn.className = 'bm-code-copy';
        btn.textContent = 'Copy';
        btn.addEventListener('click', function() {
          var text = getCodeText(codeEl).trim();
          navigator.clipboard.writeText(text).then(function() {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function() {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 1800);
          });
        });
        pre.appendChild(btn);
      });
    }

    function renderAndHighlight(container, content, codeLang) {
      var effectiveLang = codeLang;
      if (effectiveLang === 'auto') effectiveLang = detectLangFromTitle(currentReaderTitle) || detectLangFromContent(content);

      var isMarkdown = (effectiveLang === 'markdown' || effectiveLang === 'auto');

      if (isMarkdown) {
        var rendered = replaceNotionLinks(content, currentReaderNotionId);
        if (window.marked) {
          container.innerHTML = window.marked.parse(rendered);
        } else {
          container.innerHTML = '<pre>' + escHtml(content) + '</pre>';
        }
        var mermaidJobs = [];
        container.querySelectorAll('pre code.language-mermaid').forEach(function(code) {
          var pre = code.parentElement;
          var source = code.textContent;
          var wrapper = document.createElement('div');
          wrapper.className = 'bm-mermaid-block';
          pre.parentNode.replaceChild(wrapper, pre);
          mermaidJobs.push({ wrapper: wrapper, source: source });
        });
        highlightReaderCode(container, effectiveLang);
        applyHljsLineNumbers(container);
        addCodeCopyButtons(container);
        if (mermaidJobs.length > 0) renderMermaidJobs(mermaidJobs);
        container.querySelectorAll('a[href]').forEach(function(a) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.addEventListener('click', function(e) {
            e.preventDefault();
            window.bmShowLinkConfirm(a.href);
          });
        });
      } else {
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        if (effectiveLang === 'plaintext') {
          code.classList.add('hljs', 'nohighlight');
        } else {
          code.className = 'language-' + effectiveLang;
        }
        code.textContent = content;
        pre.appendChild(code);
        container.innerHTML = '';
        container.appendChild(pre);
        if (effectiveLang !== 'plaintext') {
          highlightReaderCode(container, effectiveLang);
        }
        applyHljsLineNumbers(container);
      }

      return effectiveLang;
    }

    var currentReaderFavId = null;
    var currentReaderContent = null;
    var currentReaderTitle = null;

    function openReader(title, content, notionId, codeLang, favId, notesList) {
      currentReaderNotionId = notionId || null;
      currentReaderCodeLang = codeLang || 'auto';
      currentReaderFavId = favId || null;
      currentReaderContent = content;
      currentReaderTitle = title || null;

      var readerNotes = notesList || bmData.favorites.filter(function(f) { return f.content; });
      var readerListOpen = false;
      var readerListTabFilter = currentThemeId || 'all';
      var readerRightFavId = null;
      var readerRightContent = null;
      var readerRightScroll = null;
      var activePaneId = 'left'; // 'left' | 'right'

      function getNoteIndex(favId) {
        var id = favId !== undefined ? favId : currentReaderFavId;
        return readerNotes.findIndex(function(f) { return f.id === id; });
      }
	  
      var readerBg = document.querySelector('.bm-reader-bg');
      if (readerBg){
        readerBg.style.removeProperty('display');
      }

      loadMarked(function() {
      loadHljs(function() {
        var effectiveLang = currentReaderCodeLang;
        if (effectiveLang === 'auto') effectiveLang = detectLangFromTitle(currentReaderTitle) || detectLangFromContent(content);
        var badgeLabel = getLangLabel(effectiveLang !== 'auto' ? effectiveLang : 'auto');
        var readerLeftEffectiveLang = effectiveLang;
        var readerRightEffectiveLang = 'auto';

        var reader = document.createElement('div');
        reader.className = 'bm-reader-bg';

        // ── Shared inline icons ──────────────────────────────────────────
        var ICO_MENU = (window.CARD_ICONS && window.CARD_ICONS.menu) ||
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
        var ICO_COPY =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        var ICO_EDIT = (window.CARD_ICONS && window.CARD_ICONS.edit) ||
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        var ICO_SEARCH = (window.CARD_ICONS && window.CARD_ICONS.search) ||
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
        var ICO_CHEVRON_RIGHT =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

        function buildPaneNav(favId, btnPrevId, btnNextId, counterId) {
          var idx = getNoteIndex(favId);
          var total = readerNotes.length;
          if (total <= 1) return '<div class="bm-reader-pane-nav"></div>';
          return '<div class="bm-reader-pane-nav">' +
            '<button id="' + btnPrevId + '" title="上一則" ' + (idx <= 0 ? 'disabled' : '') + '>&#8592;</button>' +
            '<span id="' + counterId + '">' + (idx + 1) + '/' + total + '</span>' +
            '<button id="' + btnNextId + '" title="下一則" ' + (idx >= total - 1 ? 'disabled' : '') + '>&#8594;</button>' +
          '</div>';
        }

        function buildHeader() {
          var listActiveClass = readerListOpen ? ' active' : '';
          return '<div class="bm-reader-header">' +
            '<button class="bm-hdr-btn bm-hdr-back" id="bmReaderBack" title="返回 (Esc)">← <kbd>Esc</kbd></button>' +
            '<button class="bm-hdr-btn' + listActiveClass + '" id="bmReaderListBtn" title="筆記清單 (Shift+; → menu)">' + ICO_MENU + ' 筆記清單</button>' +
			'<button class="bm-hdr-btn bm-hdr-mainmenu" id="bmReaderMainMenu" title="主選單">' + window.CARD_ICONS.mainmenu + '</button>' +
          '</div>';
        }

        function buildLeftPaneHd() {
          var isSplit = !!readerRightFavId;
          var activeClass = isSplit ? (activePaneId === 'left' ? ' bm-pane-active' : ' bm-pane-inactive') : '';
          return '<div class="bm-reader-pane-hd' + activeClass + '" id="bmReaderLeftPaneHd">' +
            buildPaneNav(currentReaderFavId, 'bmReaderPrevL', 'bmReaderNextL', 'bmReaderCounterL') +
            '<span class="bm-reader-pane-hd-title">' + escHtml(currentReaderTitle || '') + '</span>' +
            '<span class="bm-reader-pane-lang-badge">' + escHtml(getLangLabel(readerLeftEffectiveLang)) + '</span>' +
            '<div class="bm-reader-pane-hd-actions">' +
              '<button class="bm-reader-pane-hd-btn" id="bmPaneLCopy" title="複製">' + ICO_COPY + ' 複製</button>' +
              '<button class="bm-reader-pane-hd-btn" id="bmPaneLEdit" title="編輯">' + ICO_EDIT + ' 編輯</button>' +
            '</div>' +
            '<button class="bm-reader-pane-close" id="bmReaderLeftClose" title="' + (isSplit ? '關閉左側' : '關閉') + '">✕</button>' +
          '</div>';
        }

        function buildRightPaneHd() {
          if (!readerRightFavId) return '';
          var rightFav = readerNotes.find(function(f) { return f.id === readerRightFavId; }) ||
                         bmData.favorites.find(function(f) { return f.id === readerRightFavId; });
          var rightTitle = rightFav ? (rightFav.title || '') : '';
          var activeClass = activePaneId === 'right' ? ' bm-pane-active' : '';
          return '<div class="bm-reader-pane-hd' + activeClass + '" id="bmReaderRightPaneHd">' +
            buildPaneNav(readerRightFavId, 'bmReaderPrevR', 'bmReaderNextR', 'bmReaderCounterR') +
            '<span class="bm-reader-pane-hd-title" id="bmReaderRightTitle">' + escHtml(rightTitle) + '</span>' +
            '<span class="bm-reader-pane-lang-badge">' + escHtml(getLangLabel(readerRightEffectiveLang)) + '</span>' +
            '<div class="bm-reader-pane-hd-actions">' +
              '<button class="bm-reader-pane-hd-btn" id="bmPaneRCopy" title="複製右側內容">' + ICO_COPY + ' 複製</button>' +
              '<button class="bm-reader-pane-hd-btn" id="bmPaneREdit" title="編輯">' + ICO_EDIT + ' 編輯</button>' +
            '</div>' +
            '<button class="bm-reader-pane-close" id="bmReaderRightClose" title="關閉右側">✕</button>' +
          '</div>';
        }

        reader.innerHTML =
          buildHeader() +
          '<div class="bm-reader-body">' +
            '<div class="bm-reader-list bm-list-hidden" id="bmReaderList">' +
              '<div class="bm-reader-list-search">' +
                '<input id="bmReaderSearch" placeholder="搜尋筆記..." autocomplete="off">' +
                '<span class="bm-list-search-icon">' + ICO_SEARCH + '</span>' +
                '<button class="bm-reader-list-close" id="bmReaderListClose" title="關閉清單">✕</button>' +
              '</div>' +
              '<div class="bm-reader-list-tabs" id="bmReaderListTabs"></div>' +
              '<div class="bm-reader-list-items" id="bmReaderListItems"></div>' +
            '</div>' +
            '<div class="bm-reader-list-tab bm-tab-visible" id="bmReaderListTab" title="開啟筆記清單">' + ICO_CHEVRON_RIGHT + '</div>' +
            '<div class="bm-reader-main">' +
              '<div class="bm-reader-pane" id="bmReaderLeftPane">' +
                buildLeftPaneHd() +
                '<div class="bm-reader-content" id="bmReaderContent"><div class="bm-reader-inner" id="bmReaderInner"></div></div>' +
              '</div>' +
              '<div class="bm-reader-resizer" id="bmReaderResizer"></div>' +
              '<div class="bm-reader-right bm-pane-hidden" id="bmReaderRight">' +
                buildRightPaneHd() +
                '<div class="bm-reader-content" id="bmReaderRightContent"><div class="bm-reader-inner" id="bmReaderRightInner"></div></div>' +
              '</div>' +
            '</div>' +
          '</div>';

        // Swap button: lives directly on reader (position:fixed context) so it can sit at the top of the resizer bar
        var swapBtnEl = document.createElement('button');
        swapBtnEl.id = 'bmResizerSwap';
        swapBtnEl.className = 'bm-resizer-swap';
        swapBtnEl.title = '互換左右';
        swapBtnEl.textContent = '⇄';
        swapBtnEl.style.display = 'none';
        reader.appendChild(swapBtnEl);
        swapBtnEl.addEventListener('click', function(e){ e.stopPropagation(); doSwapPanes(); });

        function positionSwapBtn() {
          var resizerEl = document.getElementById('bmReaderResizer');
          var headerEl = reader.querySelector('.bm-reader-header');
          if (!resizerEl || !headerEl || !readerRightFavId) { swapBtnEl.style.display = 'none'; return; }
          var rRect = resizerEl.getBoundingClientRect();
          var hRect = headerEl.getBoundingClientRect();
          swapBtnEl.style.display = 'flex';
          swapBtnEl.style.left = (rRect.left + rRect.width / 2) + 'px';
          swapBtnEl.style.top = (hRect.top + 13) + 'px';
          swapBtnEl.style.transform = 'translateX(-50%)';
        }

        document.body.appendChild(reader);

        var innerEl = document.getElementById('bmReaderInner');
        renderAndHighlight(innerEl, content, effectiveLang);

        var contentEl = document.getElementById('bmReaderContent');
        contentEl.style.overflow = 'auto';
        contentEl.style.scrollbarWidth = 'none';
        if (typeof NiceScroll === 'function') {
          readerScroll = new NiceScroll('#bmReaderContent');
        }

        var isEditing = false;
        var editingPane = null;
        var cmEditor = null;
        var readerEdited = false;
        function getLeftTitleEl() { return reader.querySelector('#bmReaderLeftPaneHd .bm-reader-pane-hd-title'); }
        var readerTitleEl = null; // unused; use getLeftTitleEl() instead

        // ── Rebuild header + pane headers ───────────────────────────────
        function refreshHeader() {
          var oldHeader = reader.querySelector('.bm-reader-header');
          var tmpDiv = document.createElement('div');
          tmpDiv.innerHTML = buildHeader();
          reader.replaceChild(tmpDiv.firstElementChild, oldHeader);
          bindHeaderBtns();
          refreshPaneHeaders();
        }

        function refreshPaneHeaders() {
          var isSplit = !!readerRightFavId;
          // Left pane header
          var oldL = document.getElementById('bmReaderLeftPaneHd');
          var tmpL = document.createElement('div');
          tmpL.innerHTML = buildLeftPaneHd();
          var newL = tmpL.firstElementChild;
          if (oldL) oldL.parentNode.replaceChild(newL, oldL);
          // Right pane header
          var rightEl = document.getElementById('bmReaderRight');
          if (isSplit && rightEl) {
            var oldR = document.getElementById('bmReaderRightPaneHd');
            var tmpR = document.createElement('div');
            tmpR.innerHTML = buildRightPaneHd();
            var newR = tmpR.firstElementChild;
            if (oldR) { oldR.parentNode.replaceChild(newR, oldR); }
            else { rightEl.insertBefore(newR, rightEl.firstChild); }
          }
          bindPaneNavBtns();
        }

        // ── Load note into main pane ─────────────────────────────────────
        function loadNote(fav) {
          confirmLeave(readerEdited, function() {
            findL.close();
            if (isEditing) { isEditing = false; cmEditor = null; }
            readerEdited = false;
            currentReaderNotionId = fav.notionId || null;
            currentReaderCodeLang = fav.codeLang || 'auto';
            currentReaderFavId = fav.id;
            currentReaderContent = fav.content;
            currentReaderTitle = fav.title || null;
            var lang = currentReaderCodeLang;
            if (lang === 'auto') lang = detectLangFromTitle(currentReaderTitle) || detectLangFromContent(currentReaderContent);
            readerLeftEffectiveLang = lang;
            innerEl.classList.remove('bm-editing');
            renderAndHighlight(innerEl, currentReaderContent, lang);
            contentEl.scrollTop = 0;
            if (readerScroll) readerScroll.updateScrollbar();
            refreshHeader();
            refreshListHighlight();
          });
        }

        // ── Navigate prev / next (pane-aware) ───────────────────────────
        function navNote(delta) {
          if (activePaneId === 'right' && readerRightFavId) {
            var ridx = getNoteIndex(readerRightFavId);
            var rnext = readerNotes[ridx + delta];
            if (rnext) loadRightNote(rnext);
          } else {
            var idx = getNoteIndex();
            var next = readerNotes[idx + delta];
            if (next) loadNote(next);
          }
        }

        // ── Right split pane ─────────────────────────────────────────────
        function loadRightNote(fav) {
          findR.close();
          readerRightFavId = fav.id;
          readerRightContent = fav.content;
          var rightInner = document.getElementById('bmReaderRightInner');
          var rightContent = document.getElementById('bmReaderRightContent');
          if (!rightInner) return;
          var lang = fav.codeLang || 'auto';
          if (lang === 'auto') lang = detectLangFromTitle(fav.title) || detectLangFromContent(fav.content);
          readerRightEffectiveLang = lang;
          rightInner.innerHTML = '';
          renderAndHighlight(rightInner, fav.content, lang);
          rightContent.scrollTop = 0;
          if (readerRightScroll) readerRightScroll.updateScrollbar();
          refreshPaneHeaders();
          refreshListHighlight();
        }

        function openRightPane(fav) {
          readerRightFavId = fav.id;
          readerRightContent = fav.content;
          activePaneId = 'right';
          var rightEl = document.getElementById('bmReaderRight');
          var resizerEl = document.getElementById('bmReaderResizer');
          rightEl.classList.remove('bm-pane-hidden');
          if (resizerEl) resizerEl.classList.add('bm-split-show');
          // Remove old pane header and inject fresh one
          var oldHd = document.getElementById('bmReaderRightPaneHd');
          if (oldHd) oldHd.remove();
          var tmpR = document.createElement('div');
          tmpR.innerHTML = buildRightPaneHd();
          rightEl.insertBefore(tmpR.firstElementChild, rightEl.firstChild);
          bindPaneNavBtns();
          // Render content
          var rightInner = document.getElementById('bmReaderRightInner');
          var rightContent = document.getElementById('bmReaderRightContent');
          var lang = fav.codeLang || 'auto';
          if (lang === 'auto') lang = detectLangFromTitle(fav.title) || detectLangFromContent(fav.content);
          readerRightEffectiveLang = lang;
          rightInner.innerHTML = '';
          renderAndHighlight(rightInner, fav.content, lang);
          rightContent.style.overflow = 'auto';
          rightContent.style.scrollbarWidth = 'none';
          if (typeof NiceScroll === 'function') {
            if (readerRightScroll) readerRightScroll.destroy();
            readerRightScroll = new NiceScroll('#bmReaderRightContent');
          }
          // Refresh left pane header (show nav + active state)
          refreshHeader();
          positionSwapBtn();
          refreshListHighlight();
        }

        function closeRightPane() {
          var wasRightActive = activePaneId === 'right';
          readerRightFavId = null;
          activePaneId = 'left';
          var rightEl = document.getElementById('bmReaderRight');
          var resizerEl = document.getElementById('bmReaderResizer');
          rightEl.classList.add('bm-pane-hidden');
          if (resizerEl) resizerEl.classList.remove('bm-split-show');
          if (readerRightScroll) { readerRightScroll.destroy(); readerRightScroll = null; }
          // Reset flex widths
          var leftPane = document.getElementById('bmReaderLeftPane');
          if (leftPane) leftPane.style.flex = '';
          refreshHeader();
          positionSwapBtn();
        }

        // ── Bind per-pane nav buttons ────────────────────────────────────
        function bindPaneNavBtns() {
          var pL = document.getElementById('bmReaderPrevL');
          var nL = document.getElementById('bmReaderNextL');
          var pR = document.getElementById('bmReaderPrevR');
          var nR = document.getElementById('bmReaderNextR');
          if (pL) pL.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(); var f=readerNotes[i-1]; if(f) loadNote(f); });
          if (nL) nL.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(); var f=readerNotes[i+1]; if(f) loadNote(f); });
          if (pR) pR.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(readerRightFavId); var f=readerNotes[i-1]; if(f) loadRightNote(f); });
          if (nR) nR.addEventListener('click', function(e){ e.stopPropagation(); var i=getNoteIndex(readerRightFavId); var f=readerNotes[i+1]; if(f) loadRightNote(f); });
          // Pane click to set active
          var leftPane = document.getElementById('bmReaderLeftPane');
          var rightPane = document.getElementById('bmReaderRight');
          if (leftPane) leftPane.addEventListener('mousedown', function(){ if(readerRightFavId && activePaneId!=='left'){ activePaneId='left'; refreshPaneHeaders(); } }, true);
          if (rightPane) rightPane.addEventListener('mousedown', function(){ if(readerRightFavId && activePaneId!=='right'){ activePaneId='right'; refreshPaneHeaders(); } }, true);
          // Close right pane
          var closeRBtn = document.getElementById('bmReaderRightClose');
          if (closeRBtn) closeRBtn.addEventListener('click', function(e){ e.stopPropagation(); closeRightPane(); });
          // Close left pane (swap right→main, hide right)
          var closeLBtn = document.getElementById('bmReaderLeftClose');
          if (closeLBtn) closeLBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!readerRightFavId) { doClose(); return; }
            var rightFav = readerNotes.find(function(f){ return f.id === readerRightFavId; }) ||
                           bmData.favorites.find(function(f){ return f.id === readerRightFavId; });
            if (rightFav) loadNote(rightFav);
            closeRightPane();
          });
          // Left pane copy / edit
          var paneLCopy = document.getElementById('bmPaneLCopy');
          if (paneLCopy) paneLCopy.addEventListener('click', function(e){
            e.stopPropagation();
            navigator.clipboard.writeText(currentReaderContent).then(function(){ showToast('已複製左側內容'); });
          });
          var paneLEdit = document.getElementById('bmPaneLEdit');
          if (paneLEdit) paneLEdit.addEventListener('click', function(e){ e.stopPropagation(); enterEditMode('left'); });
          // Right pane copy / edit
          var paneRCopy = document.getElementById('bmPaneRCopy');
          if (paneRCopy) paneRCopy.addEventListener('click', function(e){
            e.stopPropagation();
            navigator.clipboard.writeText(readerRightContent || '').then(function(){ showToast('已複製右側內容'); });
          });
          var paneREdit = document.getElementById('bmPaneREdit');
          if (paneREdit) paneREdit.addEventListener('click', function(e){ e.stopPropagation(); enterEditMode('right'); });
        }

        // ── Note list sidebar ────────────────────────────────────────────
        function buildListTabs() {
          var tabsEl = document.getElementById('bmReaderListTabs');
          if (!tabsEl) return;
          var seenIds = {};
          readerNotes.forEach(function(f) {
            (f.themeIds || []).forEach(function(tid) { seenIds[tid] = true; });
          });
          var themes = bmData.themes.filter(function(t) { return seenIds[t.id]; });
          if (!themes.length) { tabsEl.style.display = 'none'; return; }
          tabsEl.style.display = '';

          if (readerListTabFilter !== 'all') {
            // Show label for the active theme; tapping it resets to 'all'
            var activeTheme = bmData.themes.find(function(t) { return t.id === readerListTabFilter; });
            var label = activeTheme ? activeTheme.name : '全部';
            tabsEl.innerHTML = '<span class="bm-list-tab-label">' + escHtml(label) +
              ' <button class="bm-list-tab-reset" title="顯示全部">✕</button></span>';
            tabsEl.querySelector('.bm-list-tab-reset').addEventListener('click', function() {
              readerListTabFilter = 'all';
              buildListTabs();
              buildListItems((document.getElementById('bmReaderSearch') || {}).value || '');
            });
          } else {
            // Show all tabs
            var html = '<button class="bm-list-tab active" data-tab="all">全部</button>';
            themes.forEach(function(t) {
              html += '<button class="bm-list-tab" data-tab="' + escHtml(t.id) + '">' + escHtml(t.name) + '</button>';
            });
            tabsEl.innerHTML = html;
            tabsEl.querySelectorAll('.bm-list-tab').forEach(function(btn) {
              btn.addEventListener('click', function() {
                readerListTabFilter = this.dataset.tab;
                buildListTabs();
                buildListItems((document.getElementById('bmReaderSearch') || {}).value || '');
              });
            });
          }
        }

        function buildListItems(filter) {
          var listEl = document.getElementById('bmReaderListItems');
          if (!listEl) return;
          listEl.innerHTML = '';
          var q = (filter || '').toLowerCase();
          var showAll = readerListTabFilter === 'all';
          var notes = showAll ? readerNotes : readerNotes.filter(function(f) {
            return (f.themeIds || []).indexOf(readerListTabFilter) !== -1;
          });
          notes.forEach(function(f) {
            if (q && f.title && f.title.toLowerCase().indexOf(q) === -1) return;
            var item = document.createElement('div');
            var isLeft = f.id === currentReaderFavId;
            var isRight = f.id === readerRightFavId;
            item.className = 'bm-reader-list-item' + (isLeft ? ' active' : '') + (isRight ? ' active-right' : '');
            var titleText = escHtml(f.title || '（無標題）');
            if (q && f.title) {
              var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
              titleText = escHtml(f.title).replace(re, '<mark class="bm-list-highlight">$1</mark>');
            }
            var themeTagsHtml = '';
            if (showAll && f.themeIds && f.themeIds.length) {
              themeTagsHtml = '<span class="bm-list-theme-tags">' +
                f.themeIds.map(function(tid) {
                  return '<span class="bm-list-theme-tag">' + escHtml(getThemeName(tid)) + '</span>';
                }).join('') + '</span>';
            }
            item.innerHTML = '<span class="bm-list-title">' + titleText + '</span>' +
              themeTagsHtml +
              '<button class="bm-list-split-btn" title="並排開啟">⇌</button>';
            item.querySelector('.bm-list-title').addEventListener('click', function() {
              if (activePaneId === 'right' && readerRightFavId) loadRightNote(f);
              else loadNote(f);
            });
            item.querySelector('.bm-list-split-btn').addEventListener('click', function(e) {
              e.stopPropagation();
              openRightPane(f);
            });
            listEl.appendChild(item);
          });
        }
        function refreshListHighlight() {
          var items = document.querySelectorAll('.bm-reader-list-item');
          items.forEach(function(item) {
            item.classList.toggle('active', false);
          });
          var q = (document.getElementById('bmReaderSearch') || {}).value || '';
          buildListItems(q);
        }
        function toggleList() {
          readerListOpen = !readerListOpen;
          var listEl = document.getElementById('bmReaderList');
          var tabEl = document.getElementById('bmReaderListTab');
          listEl.classList.toggle('bm-list-hidden', !readerListOpen);
          if (tabEl) tabEl.classList.toggle('bm-tab-visible', !readerListOpen);
          if (readerListOpen) {
            buildListTabs();
            buildListItems('');
            var si = document.getElementById('bmReaderSearch');
            if (si) si.focus();
          }
          var btn = document.getElementById('bmReaderListBtn');
          if (btn) btn.classList.toggle('active', readerListOpen);
        }


        // ── Command palette ──────────────────────────────────────────────
        var cmdBg = document.createElement('div');
        cmdBg.className = 'bm-reader-cmd-bg';
        cmdBg.style.display = 'none';
        cmdBg.innerHTML =
          '<div class="bm-reader-cmd">' +
            '<span class="bm-reader-cmd-prefix">:</span>' +
            '<input id="bmReaderCmdInput" autocomplete="off" spellcheck="false" placeholder="輸入指令（menu）">' +
            '<span class="bm-reader-cmd-hint">Enter 執行 · Esc 關閉</span>' +
          '</div>';
        document.body.appendChild(cmdBg);

        function openCmd() {
          cmdBg.style.display = 'flex';
          var inp = document.getElementById('bmReaderCmdInput');
          if (inp) { inp.value = ''; inp.focus(); }
        }
        function closeCmd() {
          cmdBg.style.display = 'none';
        }
        function execCmd(val) {
          var v = val.trim().toLowerCase();
          closeCmd();
          if (v === 'menu' || v === 'm') { toggleList(); return; }
          if (v === 'next' || v === 'n') { navNote(1); return; }
          if (v === 'prev' || v === 'p') { navNote(-1); return; }
          if (v === 'close' || v === 'q') { doClose(); return; }
          if (v === 'copy') { navigator.clipboard.writeText(currentReaderContent).then(function() { showToast('已複製'); }); return; }
          showToast('未知指令：' + val);
        }
        cmdBg.addEventListener('click', function(e) { if (e.target === cmdBg) closeCmd(); });

        // ── Edit mode ────────────────────────────────────────────────────
        function enterEditMode(pane) {
          if (isEditing) return;
          isEditing = true;
          editingPane = pane || (readerRightFavId ? activePaneId : 'left');
          var isSplit = !!readerRightFavId;
          var isRight = editingPane === 'right';

          var editContent = isRight ? readerRightContent : currentReaderContent;
          var editFavId  = isRight ? readerRightFavId   : currentReaderFavId;
          var editInnerEl = isRight ? document.getElementById('bmReaderRightInner') : innerEl;
          var editLang = isRight ? 'auto' : currentReaderCodeLang;
          if (editLang === 'auto') {
            var ef = bmData.favorites.find(function(f){ return f.id === editFavId; });
            if (ef) editLang = detectLangFromTitle(ef.title) || detectLangFromContent(editContent);
          }
          var editTitleEl = isRight
            ? reader.querySelector('#bmReaderRightPaneHd .bm-reader-pane-hd-title')
            : getLeftTitleEl();

          // Place save/cancel in the pane header actions slot
          var saveCancelHtml =
            '<button class="bm-reader-pane-hd-btn" id="bmReaderSave" style="background:var(--accent);color:#fff;border-color:var(--accent)">儲存</button>' +
            '<button class="bm-reader-pane-hd-btn" id="bmReaderCancel">取消</button>';
          var hdEl = document.getElementById(isRight ? 'bmReaderRightPaneHd' : 'bmReaderLeftPaneHd');
          var actionsEl = hdEl ? hdEl.querySelector('.bm-reader-pane-hd-actions') : null;
          if (actionsEl) actionsEl.innerHTML = saveCancelHtml;

          editInnerEl.classList.add('bm-editing');
          editInnerEl.innerHTML = '';
          var editorWrap = document.createElement('div');
          editorWrap.className = 'bm-reader-editor';
          editInnerEl.appendChild(editorWrap);

          loadCodeMirror(editLang, function() {
            if (!window.CodeMirror) {
              editorWrap.innerHTML = '<textarea style="width:100%;height:100%;background:#282c34;color:#abb2bf;border:none;padding:16px;font-family:monospace;font-size:14px;resize:none">' + escHtml(editContent) + '</textarea>';
              return;
            }
            cmEditor = CodeMirror(editorWrap, {
              value: editContent,
              mode: getCmMode(editLang),
              theme: isDarkMode() ? 'material-darker' : 'eclipse',
              lineNumbers: true, tabSize: 2, indentWithTabs: false, lineWrapping: true, scrollbarStyle: 'native'
            });
            cmEditor.focus();
            cmEditor.on('change', function() { readerEdited = true; if (editTitleEl) markEdited(editTitleEl); });
          });

          document.getElementById('bmReaderSave').addEventListener('click', function() {
            var val = cmEditor ? cmEditor.getValue() : editContent;
            var fav = bmData.favorites.find(function(f) { return f.id === editFavId; });
            if (fav) {
              fav.content = val;
              if (isRight) readerRightContent = val; else currentReaderContent = val;
              // If the other pane shows the same note, sync its content too
              if (isRight && currentReaderFavId === editFavId) {
                currentReaderContent = val;
              } else if (!isRight && readerRightFavId === editFavId) {
                readerRightContent = val;
              }
              saveBmData();
              readerEdited = false;
              if (editTitleEl) clearEdited(editTitleEl);
              showToast('已儲存');
            }
            exitEditMode();
          });

          document.getElementById('bmReaderCancel').addEventListener('click', function() {
            confirmLeave(readerEdited, function() {
              readerEdited = false;
              if (editTitleEl) clearEdited(editTitleEl);
              exitEditMode();
            });
          });
        }

        function exitEditMode() {
          var wasRight = editingPane === 'right';
          isEditing = false;
          editingPane = null;
          cmEditor = null;
          var isSplit = !!readerRightFavId;
          var editInnerEl = wasRight ? document.getElementById('bmReaderRightInner') : innerEl;
          var editContent = wasRight ? readerRightContent : currentReaderContent;
          var editFavId   = wasRight ? readerRightFavId   : currentReaderFavId;
          var eLang = wasRight ? 'auto' : currentReaderCodeLang;
          if (eLang === 'auto') {
            var ef = bmData.favorites.find(function(f){ return f.id === editFavId; });
            if (ef) eLang = detectLangFromTitle(ef.title) || detectLangFromContent(editContent);
          }
          if (editInnerEl) {
            editInnerEl.classList.remove('bm-editing');
            renderAndHighlight(editInnerEl, editContent, eLang);
          }
          if (!wasRight) {
            if (readerScroll) readerScroll.updateScrollbar();
            // If right pane shows the same note, re-render it too
            if (readerRightFavId === editFavId) {
              var ri = document.getElementById('bmReaderRightInner');
              if (ri) { ri.innerHTML = ''; renderAndHighlight(ri, readerRightContent, eLang); }
              if (readerRightScroll) readerRightScroll.updateScrollbar();
            }
          } else {
            if (readerRightScroll) readerRightScroll.updateScrollbar();
            // If left pane shows the same note, re-render it too
            if (currentReaderFavId === editFavId) {
              innerEl.innerHTML = '';
              renderAndHighlight(innerEl, currentReaderContent, eLang);
              if (readerScroll) readerScroll.updateScrollbar();
            }
          }
          // Restore action buttons via pane header rebuild
          refreshPaneHeaders();
          bindPaneNavBtns();
        }

        // ── Close reader ─────────────────────────────────────────────────
        function doClose() {
          confirmLeave(readerEdited, function() {
            readerEdited = false;
            document.removeEventListener('keydown', keyHandler);
            window.removeEventListener('resize', onWindowResize);
            reader.remove();
            cmdBg.remove();
            readerScroll = null;
            if (readerRightScroll) { readerRightScroll.destroy(); readerRightScroll = null; }
          });
        }

        function doSwapPanes() {
          if (!readerRightFavId) return;
          var tmpId = currentReaderFavId, tmpContent = currentReaderContent,
              tmpTitle = currentReaderTitle, tmpNotionId = currentReaderNotionId,
              tmpLang = currentReaderCodeLang, tmpEffLang = readerLeftEffectiveLang;
          currentReaderFavId = readerRightFavId;
          currentReaderContent = readerRightContent;
          var rightFav = readerNotes.find(function(f){ return f.id === readerRightFavId; }) ||
                         bmData.favorites.find(function(f){ return f.id === readerRightFavId; });
          currentReaderTitle = rightFav ? (rightFav.title || '') : '';
          currentReaderNotionId = rightFav ? (rightFav.notionId || null) : null;
          currentReaderCodeLang = rightFav ? (rightFav.codeLang || 'auto') : 'auto';
          readerLeftEffectiveLang = readerRightEffectiveLang;
          readerRightFavId = tmpId;
          readerRightContent = tmpContent;
          readerRightEffectiveLang = tmpEffLang;
          findL.close(); findR.close();
          innerEl.innerHTML = '';
          renderAndHighlight(innerEl, currentReaderContent, readerLeftEffectiveLang);
          var rightInner = document.getElementById('bmReaderRightInner');
          if (rightInner) { rightInner.innerHTML = ''; renderAndHighlight(rightInner, readerRightContent, readerRightEffectiveLang); }
          refreshHeader();
          refreshListHighlight();
        }

        // ── Find in note (one instance per pane) ────────────────────────
        function makeFindInstance(pane) {
          var innerIdStr  = pane === 'right' ? 'bmReaderRightInner'   : 'bmReaderInner';
          var contentIdStr = pane === 'right' ? 'bmReaderRightContent' : 'bmReaderContent';
          var matches = [], idx = -1;

          var bar = document.createElement('div');
          bar.className = 'bm-find-bar';
          bar.innerHTML =
            '<input class="bm-find-input" placeholder="搜尋..." autocomplete="off" spellcheck="false">' +
            '<span class="bm-find-counter"></span>' +
            '<button class="bm-find-nav" title="上一個 (Shift+Enter)">↑</button>' +
            '<button class="bm-find-nav" title="下一個 (Enter)">↓</button>' +
            '<button class="bm-find-close" title="關閉 (Esc)">✕</button>';
          bar.style.display = 'none';
          reader.appendChild(bar);

          var inp     = bar.querySelector('.bm-find-input');
          var counter = bar.querySelector('.bm-find-counter');
          var navBtns = bar.querySelectorAll('.bm-find-nav');
          var closeBtn = bar.querySelector('.bm-find-close');

          function getInnerEl()   { return document.getElementById(innerIdStr); }
          function getContentEl() { return document.getElementById(contentIdStr); }

          function reposition() {
            var cEl = getContentEl();
            if (!cEl) return;
            var r = cEl.getBoundingClientRect();
            bar.style.top  = (r.top + 6) + 'px';
            bar.style.left = (r.right - bar.offsetWidth - 8) + 'px';
          }

          function clearHighlights() {
            var el = getInnerEl();
            if (!el) return;
            el.querySelectorAll('mark.bm-find-match').forEach(function(m) {
              m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
            });
            el.normalize();
          }

          function runFind(term) {
            clearHighlights();
            matches = []; idx = -1;
            if (!term.trim()) { counter.textContent = ''; return; }
            var el = getInnerEl();
            if (!el) return;
            var re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            var nodes = [], node;
            while ((node = walker.nextNode())) {
              var p = node.parentElement, skip = false;
              while (p) { if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') { skip = true; break; } p = p.parentElement; }
              if (!skip) nodes.push(node);
            }
            nodes.forEach(function(tn) {
              var text = tn.nodeValue;
              re.lastIndex = 0;
              if (!re.test(text)) return;
              re.lastIndex = 0;
              var frag = document.createDocumentFragment(), last = 0, m2;
              while ((m2 = re.exec(text)) !== null) {
                if (m2.index > last) frag.appendChild(document.createTextNode(text.slice(last, m2.index)));
                var mark = document.createElement('mark');
                mark.className = 'bm-find-match';
                mark.textContent = m2[0];
                frag.appendChild(mark);
                matches.push(mark);
                last = m2.index + m2[0].length;
              }
              if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
              tn.parentNode.replaceChild(frag, tn);
            });
            if (matches.length) { idx = 0; scrollTo(0); }
            counter.textContent = matches.length ? '1/' + matches.length : '無結果';
          }

          function nav(delta) {
            if (!matches.length) return;
            idx = (idx + delta + matches.length) % matches.length;
            scrollTo(idx);
            counter.textContent = (idx + 1) + '/' + matches.length;
          }

          function scrollTo(i) {
            matches.forEach(function(m, j) { m.classList.toggle('bm-find-current', j === i); });
            if (matches[i]) matches[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
          }

          function open() {
            bar.style.display = 'flex';
            reposition();
            inp.select(); inp.focus();
          }

          function close() {
            bar.style.display = 'none';
            clearHighlights();
            matches = []; idx = -1;
            counter.textContent = '';
          }

          inp.addEventListener('input', function() { runFind(this.value); });
          inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? nav(-1) : nav(1); }
            if (e.key === 'Escape') { e.preventDefault(); close(); }
          });
          navBtns[0].addEventListener('click', function() { nav(-1); });
          navBtns[1].addEventListener('click', function() { nav(1); });
          closeBtn.addEventListener('click', close);

          return { open: open, close: close, clearHighlights: clearHighlights, reposition: reposition, isOpen: function() { return bar.style.display !== 'none'; } };
        }

        var findL = makeFindInstance('left');
        var findR = makeFindInstance('right');

        function openFindBar() {
          var isRight = readerRightFavId && activePaneId === 'right';
          if (isRight) findR.open(); else findL.open();
        }
        function closeFindBar() { findL.close(); findR.close(); }

        // ── Bind header buttons ──────────────────────────────────────────
        function bindHeaderBtns() {
          var backBtn = document.getElementById('bmReaderBack');
          if (backBtn) backBtn.addEventListener('click', doClose);
          var listBtn = document.getElementById('bmReaderListBtn');
          if (listBtn) listBtn.addEventListener('click', toggleList);
          // List sidebar close btn
          var listCloseBtn = document.getElementById('bmReaderListClose');
          if (listCloseBtn) listCloseBtn.addEventListener('click', function() { if (readerListOpen) toggleList(); });
          // Edge tab to open list
          var tabEl = document.getElementById('bmReaderListTab');
          if (tabEl) {
            tabEl.classList.toggle('bm-tab-visible', !readerListOpen);
            tabEl.addEventListener('click', toggleList);
          }
		  // 主選單
		  
          var mainMenuBtn = document.getElementById('bmReaderMainMenu');
          if (mainMenuBtn) mainMenuBtn.addEventListener('click', function() {
            toggleMainMenu(null, function(name) {
                var readerBg = document.querySelector('.bm-reader-bg');
                if (readerBg && name !== 'bookmark') {
                    readerBg.style.display = 'none';
                }
            });
          });
          }
        bindHeaderBtns();
        bindPaneNavBtns();

        // ── Resizer drag ─────────────────────────────────────────────────
        (function() {
          var resizerEl = document.getElementById('bmReaderResizer');
          if (!resizerEl) return;
          var dragging = false, startX = 0, startLeftW = 0, startRightW = 0;
          resizerEl.addEventListener('mousedown', function(e) {
            dragging = true;
            startX = e.clientX;
            var leftPane = document.getElementById('bmReaderLeftPane');
            var rightPane = document.getElementById('bmReaderRight');
            startLeftW = leftPane ? leftPane.offsetWidth : 0;
            startRightW = rightPane ? rightPane.offsetWidth : 0;
            resizerEl.classList.add('dragging');
            document.body.style.userSelect = 'none';
            e.preventDefault();
          });
          document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            var dx = e.clientX - startX;
            var leftPane = document.getElementById('bmReaderLeftPane');
            var rightPane = document.getElementById('bmReaderRight');
            var total = startLeftW + startRightW;
            var newLeft = Math.max(200, Math.min(total - 200, startLeftW + dx));
            var newRight = total - newLeft;
            if (leftPane) { leftPane.style.flex = 'none'; leftPane.style.width = newLeft + 'px'; }
            if (rightPane) { rightPane.style.flex = 'none'; rightPane.style.width = newRight + 'px'; }
            positionSwapBtn();
          });
          document.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false;
            resizerEl.classList.remove('dragging');
            document.body.style.userSelect = '';
            // Store ratio for proportional resize
            var lp = document.getElementById('bmReaderLeftPane');
            var rp = document.getElementById('bmReaderRight');
            if (lp && rp && lp.style.width) {
              var total = lp.offsetWidth + rp.offsetWidth;
              if (total > 0) splitRatio = lp.offsetWidth / total;
            }
            positionSwapBtn();
          });
        })();

        // ── Search in list ───────────────────────────────────────────────
        document.getElementById('bmReaderSearch').addEventListener('input', function() {
          buildListItems(this.value);
        });

        // ── Keyboard shortcuts ───────────────────────────────────────────
        function keyHandler(e) {
          if (cmdBg.style.display !== 'none') return;
          // Ctrl+F: open find bar
          if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openFindBar(); return; }
          var tag = document.activeElement && document.activeElement.tagName;
          var inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);
          if (isEditing) {
            if (e.key === 'Escape') {
              e.preventDefault();
              var cancelBtn = document.getElementById('bmReaderCancel');
              if (cancelBtn) cancelBtn.click();
            }
            return;
          }

          // Shift+; → command palette
          if (e.shiftKey && e.key === ':') { e.preventDefault(); openCmd(); return; }

          if (inInput) return;

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navNote(1); return; }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navNote(-1); return; }
          if (e.key === 'Escape') {
            if (readerRightFavId) {
              // split: close active pane
              if (activePaneId === 'right') {
                closeRightPane();
              } else {
                var rightFav = readerNotes.find(function(f){ return f.id === readerRightFavId; }) ||
                               bmData.favorites.find(function(f){ return f.id === readerRightFavId; });
                if (rightFav) loadNote(rightFav);
                closeRightPane();
              }
            } else {
              doClose();
            }
            return;
          }
        }
        document.addEventListener('keydown', keyHandler);

        // ── Window resize: re-proportion split panes ─────────────────────
        var splitRatio = 0.5; // track left-pane fraction after manual drag
        function onWindowResize() {
          positionSwapBtn();
          if (findL.isOpen()) findL.reposition();
          if (findR.isOpen()) findR.reposition();
          if (!readerRightFavId) return;
          var leftPane = document.getElementById('bmReaderLeftPane');
          var rightPane = document.getElementById('bmReaderRight');
          var resizerEl = document.getElementById('bmReaderResizer');
          if (!leftPane || !rightPane) return;
          if (!leftPane.style.width) return; // still flex, no resize needed
          var resizerW = resizerEl ? resizerEl.offsetWidth : 5;
          var container = leftPane.parentElement;
          var newTotal = container.offsetWidth - resizerW;
          var newLeft = Math.round(splitRatio * newTotal);
          var newRight = newTotal - newLeft;
          leftPane.style.width = newLeft + 'px';
          rightPane.style.width = newRight + 'px';
        }
        window.addEventListener('resize', onWindowResize);

        // ── Inline note links (existing logic) ──────────────────────────
        innerEl.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href') || '';
          var match = null;
          if (href.indexOf('#bm:') === 0) {
            var bmId = href.substring(4);
            match = bmData.favorites.find(function(f) { return f.id === bmId && f.content; });
          }
          if (!match) {
            match = bmData.favorites.find(function(f) {
              return f.content && f.url && href.indexOf(f.url) !== -1;
            });
          }
          if (!match && href.indexOf('notion.so') !== -1) {
            match = bmData.favorites.find(function(f) {
              if (!f.content || !f.url) return false;
              var hrefId = href.replace(/.*[-/]([a-f0-9]{32}).*/, '$1');
              var favId2 = f.url.replace(/.*[-/]([a-f0-9]{32}).*/, '$1');
              return hrefId.length === 32 && hrefId === favId2;
            });
          }
          if (match) {
            e.preventDefault();
            loadNote(match);
          }
        });

        // ── Bind cmd input (after DOM) ───────────────────────────────────
        var cmdInput = document.getElementById('bmReaderCmdInput');
        if (cmdInput) {
          cmdInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { execCmd(this.value); e.preventDefault(); }
            if (e.key === 'Escape') { closeCmd(); e.preventDefault(); }
          });
        }
      });
      });
    }

    // ── Delete confirmation modal ────────────────────────────────────
    var confirmWrapper = document.createElement('div');
    confirmWrapper.innerHTML = '<div id="bmConfirmBg"><div class="bm-confirm"><div class="bm-confirm-msg">確定要刪除這個書籤？</div><div class="bm-confirm-card" id="bmConfirmCard"></div><div class="bm-confirm-actions"><button class="bm-confirm-cancel" id="bmConfirmCancel">取消</button><button class="bm-confirm-delete" id="bmConfirmDelete">刪除</button></div></div></div>';
    document.body.appendChild(confirmWrapper.firstElementChild);

    var bmConfirmBg = document.getElementById('bmConfirmBg');
    var pendingDeleteId = null;

    function showDeleteConfirm(favId) {
      pendingDeleteId = favId;
      var fav = bmData.favorites.find(function (f) { return f.id === favId; });
      var cardEl = document.getElementById('bmConfirmCard');
      if (!fav) { cardEl.innerHTML = ''; bmConfirmBg.classList.add('open'); return; }
      cardEl.innerHTML =
        '<div class="bm-confirm-card-name">' + escHtml(fav.title) + '</div>' +
        '<div class="bm-confirm-card-url">' + escHtml(fav.url) + '</div>' +
        '<div class="bm-confirm-card-theme">主題: ' + escHtml((fav.themeIds || []).map(getThemeName).join(', ') || '無') + '</div>';
      bmConfirmBg.classList.add('open');
    }

    var closeBmConfirm = function() { bmConfirmBg.classList.remove('open'); pendingDeleteId = null; };
    bindPopup(bmConfirmBg, closeBmConfirm);
    document.getElementById('bmConfirmCancel').addEventListener('click', closeBmConfirm);
    document.getElementById('bmConfirmDelete').addEventListener('click', function () {
      bmConfirmBg.classList.remove('open');
      if (!pendingDeleteId) return;
      bmData.favorites = bmData.favorites.filter(function (f) { return f.id !== pendingDeleteId; });
      pendingDeleteId = null;
      saveBmData();
      renderBookmarks();
      showToast('書籤已刪除');
    });

    // ── Theme delete confirmation ────────────────────────────────────
    var themeConfirmWrapper = document.createElement('div');
    themeConfirmWrapper.innerHTML = '<div id="bmThemeConfirmBg"><div class="bm-confirm"><div class="bm-confirm-msg" id="bmThemeConfirmMsg">確定要刪除這個主題？</div><div class="bm-confirm-actions"><button class="bm-confirm-cancel" id="bmThemeConfirmCancel">取消</button><button class="bm-confirm-delete" id="bmThemeConfirmDelete">刪除</button></div></div></div>';
    document.body.appendChild(themeConfirmWrapper.firstElementChild);

    var bmThemeConfirmBg = document.getElementById('bmThemeConfirmBg');
    var pendingDeleteThemeId = null;

    function showThemeDeleteConfirm(themeId) {
      pendingDeleteThemeId = themeId;
      var theme = bmData.themes.find(function (t) { return t.id === themeId; });
      var count = bmData.favorites.filter(function (f) { return f.themeIds && f.themeIds.indexOf(themeId) !== -1; }).length;
      var msg = document.getElementById('bmThemeConfirmMsg');
      msg.textContent = '確定要刪除主題「' + (theme ? theme.name : '') + '」？';
      if (count > 0) {
        msg.textContent += ' 該主題下有 ' + count + ' 個書籤將移除此主題標記。';
      }
      bmThemeConfirmBg.classList.add('open');
    }

    var closeBmThemeConfirm = function() { bmThemeConfirmBg.classList.remove('open'); pendingDeleteThemeId = null; };
    bindPopup(bmThemeConfirmBg, closeBmThemeConfirm);
    document.getElementById('bmThemeConfirmCancel').addEventListener('click', closeBmThemeConfirm);
    document.getElementById('bmThemeConfirmDelete').addEventListener('click', function () {
      bmThemeConfirmBg.classList.remove('open');
      if (!pendingDeleteThemeId) return;
      bmData.themes = bmData.themes.filter(function (t) { return t.id !== pendingDeleteThemeId; });
      bmData.favorites.forEach(function (f) {
        if (f.themeIds) {
          var idx = f.themeIds.indexOf(pendingDeleteThemeId);
          if (idx !== -1) f.themeIds.splice(idx, 1);
        }
      });
      pendingDeleteThemeId = null;
      if (currentThemeId !== 'all' && !bmData.themes.find(function (t) { return t.id === currentThemeId; })) {
        currentThemeId = 'all';
        localStorage.setItem(BM_THEME_KEY, currentThemeId);
      }
      saveBmData();
      renderBookmarks();
      showToast('主題已刪除');
    });

    // ── Link open confirmation ────────────────────────────────────
    var linkConfirmEl = document.createElement('div');
    linkConfirmEl.innerHTML = '<div id="bmLinkConfirmBg"><div class="bm-link-confirm"><div class="bm-confirm-msg">即將另開以下網址</div><div class="bm-link-confirm-url" id="bmLinkConfirmUrl"></div><div class="bm-confirm-actions"><button class="bm-confirm-cancel" id="bmLinkConfirmCancel">取消</button><button id="bmLinkConfirmOpen" style="flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;background:var(--accent);color:#fff">開啟</button></div></div></div>';
    document.body.appendChild(linkConfirmEl.firstElementChild);
    var bmLinkConfirmBg = document.getElementById('bmLinkConfirmBg');
    var pendingLinkUrl = null;

    window.bmShowLinkConfirm = function(url) {
      pendingLinkUrl = url;
      document.getElementById('bmLinkConfirmUrl').textContent = url;
      bmLinkConfirmBg.classList.add('open');
    };
    var closeBmLinkConfirm = function() { bmLinkConfirmBg.classList.remove('open'); pendingLinkUrl = null; };
    bindPopup(bmLinkConfirmBg, closeBmLinkConfirm);
    document.getElementById('bmLinkConfirmCancel').addEventListener('click', closeBmLinkConfirm);
    document.getElementById('bmLinkConfirmOpen').addEventListener('click', function() {
      bmLinkConfirmBg.classList.remove('open');
      if (pendingLinkUrl) window.open(pendingLinkUrl, '_blank', 'noopener,noreferrer');
      pendingLinkUrl = null;
    });

    // ── Theme rename modal ───────────────────────────────────────────
    var renameWrapper = document.createElement('div');
    renameWrapper.innerHTML = '<div id="bmThemeRenameBg"><div class="bm-theme-modal"><div class="modal-header"><h2>重新命名主題</h2><button class="close-btn" id="bmRenameCloseBtn">✕</button></div><div class="bm-field"><label>主題名稱</label><input id="bmRenameInput" type="text" placeholder="輸入新名稱"></div><div class="bm-field"><label>Icon (emoji)</label><input id="bmRenameIconInput" type="text" placeholder="例如: 📁" maxlength="4"></div><button class="bm-btn-save" id="bmRenameSaveBtn">儲存</button></div></div>';
    document.body.appendChild(renameWrapper.firstElementChild);

    var bmThemeRenameBg = document.getElementById('bmThemeRenameBg');
    var renamingThemeId = null;

    function openRenameTheme(themeId) {
      renamingThemeId = themeId;
      var theme = bmData.themes.find(function (t) { return t.id === themeId; });
      document.getElementById('bmRenameInput').value = theme ? theme.name : '';
      document.getElementById('bmRenameIconInput').value = theme ? (theme.icon || '') : '';
      bmThemeRenameBg.classList.add('open');
    }

    bindPopup(bmThemeRenameBg, function() { bmThemeRenameBg.classList.remove('open'); });
    document.getElementById('bmRenameSaveBtn').addEventListener('click', function () {
      if (!renamingThemeId) return;
      var newName = document.getElementById('bmRenameInput').value.trim();
      var newIcon = document.getElementById('bmRenameIconInput').value.trim();
      if (!newName) { showToast('請輸入主題名稱'); return; }
      var theme = bmData.themes.find(function (t) { return t.id === renamingThemeId; });
      if (theme) {
        theme.name = newName;
        theme.icon = newIcon;
      }
      bmThemeRenameBg.classList.remove('open');
      renamingThemeId = null;
      saveBmData();
      renderBookmarks();
      showToast('主題已更新');
    });

    // ── Add/Edit bookmark modal ──────────────────────────────────────
    var editWrapper = document.createElement('div');
    editWrapper.innerHTML = `
      <div id="bmEditModalBg">
        <div class="bm-edit-modal">
		  <div class="modal-header">
          <h2 id="bmEditTitle">新增書籤</h2>
		  <button class="close-btn" id="bmEditCloseBtn">✕</button>
		  </div>
          <div class="bm-field">
            <label>主題（可多選）</label>
            <div id="bmEditThemeList" class="bm-theme-checklist"></div>
          </div>
          <div class="bm-field">
            <label>類型</label>
            <div class="bm-type-toggle">
              <button id="bmTypeUrl" class="active">網址</button>
              <button id="bmTypeNote">筆記</button>
            </div>
          </div>
          <div class="bm-field" id="bmUrlField">
            <label>URL</label>
            <div class="bm-url-row">
              <input id="bmEditUrl" type="text" placeholder="https://...">
              <button class="bm-fetch-btn" id="bmFetchBtn">自動擷取</button>
            </div>
          </div>
          <div class="bm-field" id="bmNoteField" style="display:none">
            <label>Notion 原始網址（用於內部連結比對，選填）</label>
            <input id="bmEditNotionUrl" type="text" placeholder="https://www.notion.so/..." style="width:100%;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);border-radius:8px;padding:8px 10px;font-size:12px;margin-bottom:8px">
            <label>筆記內容（支援 Markdown）</label>
            <textarea id="bmEditContent" rows="8" placeholder="貼上 Notion 筆記或 Markdown 內容..." style="width:100%;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);border-radius:8px;padding:10px;font-size:13px;resize:vertical;font-family:'IBM Plex Mono',monospace"></textarea>
            <label style="margin-top:8px">程式碼語法高亮</label>
            <select id="bmEditCodeLang" style="width:100%;border:1px solid var(--border);background:var(--surface2);color:var(--text-dim);border-radius:8px;padding:8px 10px;font-size:12px">
              <option value="auto">Auto（自動偵測）</option>
              <option value="javascript">JavaScript</option>
              <option value="css">CSS</option>
              <option value="csharp">C#</option>
              <option value="bash">WSL / Bash</option>
              <option value="python">Python</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
              <option value="sql">SQL</option>
              <option value="typescript">TypeScript</option>
              <option value="xml">XML</option>
              <option value="yaml">YAML</option>
              <option value="ini">Config / INI</option>
              <option value="plaintext">純文字（不高亮）</option>
            </select>
          </div>
          <div class="bm-field">
            <label>標題</label>
            <input id="bmEditTitleInput" type="text" placeholder="網站名稱">
          </div>
          <div class="bm-field">
            <label>縮圖</label>
            <div id="bmPasteArea" class="bm-paste-area" tabindex="0">Ctrl+V 貼上圖片，或點擊選擇檔案</div>
            <input type="file" id="bmThumbFile" accept="image/*" style="display:none">
          </div>
          <button class="bm-btn-save" id="bmEditSaveBtn">儲存</button>
        </div>
      </div>
    `;
    document.body.appendChild(editWrapper.firstElementChild);

    var bmEditModalBg = document.getElementById('bmEditModalBg');
    var bmEditUrl = document.getElementById('bmEditUrl');
    var bmEditContent = document.getElementById('bmEditContent');
    var bmEditCodeLang = document.getElementById('bmEditCodeLang');
    var bmEditNotionUrl = document.getElementById('bmEditNotionUrl');
    var bmEditTitleInput = document.getElementById('bmEditTitleInput');
    var bmPasteArea = document.getElementById('bmPasteArea');
    var bmThumbFile = document.getElementById('bmThumbFile');
    var bmEditThemeList = document.getElementById('bmEditThemeList');
    var bmFetchBtn = document.getElementById('bmFetchBtn');
    var bmEditSaveBtn = document.getElementById('bmEditSaveBtn');
    var bmUrlField = document.getElementById('bmUrlField');
    var bmNoteField = document.getElementById('bmNoteField');
    var bmTypeUrl = document.getElementById('bmTypeUrl');
    var bmTypeNote = document.getElementById('bmTypeNote');
    var editingFavId = null;
    var thumbValue = null;
    var editType = 'url';
    var bmEditEdited = false;
    var bmEditTitleEl = document.getElementById('bmEditTitle');

    function closeBmEdit() {
      confirmLeave(bmEditEdited, function() {
        bmEditEdited = false;
        clearEdited(bmEditTitleEl);
        bmEditModalBg.classList.remove('open');
      });
    }
    bindPopup(bmEditModalBg, closeBmEdit);

    function bmMarkEdit() { bmEditEdited = true; markEdited(bmEditTitleEl); }
    bmEditUrl.addEventListener('input', bmMarkEdit);
    bmEditContent.addEventListener('input', bmMarkEdit);
    bmEditTitleInput.addEventListener('input', bmMarkEdit);
    bmEditNotionUrl.addEventListener('input', bmMarkEdit);
    bmEditCodeLang.addEventListener('change', bmMarkEdit);
    bmEditThemeList.addEventListener('change', bmMarkEdit);

    function setEditType(type) {
      editType = type;
      bmTypeUrl.classList.toggle('active', type === 'url');
      bmTypeNote.classList.toggle('active', type === 'note');
      bmUrlField.style.display = type === 'url' ? '' : 'none';
      bmNoteField.style.display = type === 'note' ? '' : 'none';
    }
    bmTypeUrl.addEventListener('click', function() { setEditType('url'); });
    bmTypeNote.addEventListener('click', function() { setEditType('note'); });

    // Load marked.js for markdown rendering
    var markedLoaded = false;
    function loadMarked(cb) {
      if (markedLoaded && window.marked) { cb(); return; }
      var s = document.createElement('script');
      s.src = 'libs/marked.15.0.12.min.js';
      s.onload = function() {
        markedLoaded = true;
        if (window.marked) {
          window.marked.use({
            renderer: {
              heading(token) {
                var raw = token.text || '';
                var level = token.depth;
                var id = slugify(raw);
                return '<h' + level + ' id="' + id + '">' + raw + '</h' + level + '>';
              }
            }
          });
        }
        cb();
      };
      s.onerror = function() { cb(); };
      document.head.appendChild(s);
    }

    function isDarkMode() {
      var t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function applyHljsTheme() {
      var dark = isDarkMode();
      var link = document.getElementById('hljs-theme');
      if (link) link.href = 'libs/atom-one-' + (dark ? 'dark' : 'light') + '.min.css';
    }
    new MutationObserver(function() { applyHljsTheme(); }).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

    var hljsLoaded = false;
    function loadHljsLineNumbers(cb) {
      if (window.hljs && window.hljs.lineNumbersBlock) { cb(); return; }
      var s = document.createElement('script');
      s.src = 'libs/highlightjs-line-numbers.min.js';
      s.onload = function() { cb(); };
      s.onerror = function() { cb(); };
      document.head.appendChild(s);
    }
    function loadHljs(cb) {
      if (window.hljs && window.hljs.lineNumbersBlock) { hljsLoaded = true; applyHljsTheme(); cb(); return; }
      if (hljsLoaded) { cb(); return; }
      applyHljsTheme();
      if (window.hljs) {
        hljsLoaded = true;
        loadHljsLineNumbers(cb);
        return;
      }
      var s = document.createElement('script');
      s.src = 'libs/highlight.11.9.0.min.js';
      s.onload = function() { hljsLoaded = true; loadHljsLineNumbers(cb); };
      s.onerror = function() { hljsLoaded = true; cb(); };
      document.head.appendChild(s);
    }

    var mermaidLoaded = false;
    function getMermaidConfig() {
      var s = getComputedStyle(document.documentElement);
      var get = function(v) { return s.getPropertyValue(v).trim(); };
      var dark = isDarkMode();
      return {
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          background:          get('--bg'),
          mainBkg:             get('--surface2'),
          nodeBorder:          get('--border'),
          clusterBkg:          get('--surface'),
          clusterBorder:       get('--border'),
          primaryColor:        get('--surface2'),
          primaryTextColor:    get('--text-dim'),
          primaryBorderColor:  get('--border'),
          secondaryColor:      get('--surface3'),
          secondaryTextColor:  get('--text-dim'),
          tertiaryColor:       get('--surface'),
          tertiaryTextColor:   get('--text-dim'),
          lineColor:           get('--accent'),
          edgeLabelBackground: get('--surface2'),
          titleColor:          get('--text'),
          textColor:           get('--text-dim'),
          labelColor:          get('--text-dim'),
          fontFamily:          'Consolas,"Microsoft JhengHei",monospace',
          fontSize:            '14px',
          actorBkg:            get('--surface2'),
          actorBorder:         get('--accent'),
          actorTextColor:      get('--text-dim'),
          actorLineColor:      get('--border'),
          signalColor:         get('--accent'),
          signalTextColor:     get('--text-dim'),
          activationBkgColor:  get('--surface3'),
          activationBorderColor: get('--accent'),
          labelBoxBkgColor:    get('--surface2'),
          labelBoxBorderColor: get('--border'),
          labelTextColor:      get('--text-dim'),
          loopTextColor:       get('--text-dim'),
          noteBkgColor:        dark ? '#3a3010' : '#fffbe6',
          noteTextColor:       dark ? '#fff143' : '#5a4a00',
          noteBorderColor:     get('--accent3'),
          fillType0: get('--surface2'), fillType1: get('--surface3'),
          fillType2: get('--surface'),  fillType3: get('--surface2'),
          fillType4: get('--surface3'), fillType5: get('--surface'),
          fillType6: get('--surface2'), fillType7: get('--surface3'),
          pie1: get('--accent'),  pie2: get('--accent2'), pie3: get('--accent3'),
          pie4: get('--success'), pie5: get('--danger'),
          pie6: get('--accent'),  pie7: get('--accent2'),
          pie8: get('--accent3')
        }
      };
    }
    function loadMermaid(cb) {
      if (mermaidLoaded && window.mermaid) { cb(); return; }
      var s = document.createElement('script');
      s.src = 'libs/mermaid.min.js';
      s.onload = function() { mermaidLoaded = true; cb(); };
      s.onerror = function() { cb(); };
      document.head.appendChild(s);
    }

    var _mermaidId = 0;
    function renderMermaidJobs(jobs) {
      loadMermaid(function() {
        if (!window.mermaid) return;
        window.mermaid.initialize(getMermaidConfig());
        jobs.forEach(function(job) {
          var id = 'bm-mermaid-' + (++_mermaidId);
          job.wrapper.id = id;
          try {
            window.mermaid.render(id + '-svg', job.source).then(function(result) {
              job.wrapper.innerHTML = result.svg;
            }).catch(function() {
              job.wrapper.innerHTML = '<pre class="bm-mermaid-error"><code>' + escHtml(job.source) + '</code></pre>';
            });
          } catch (e) {
            job.wrapper.innerHTML = '<pre class="bm-mermaid-error"><code>' + escHtml(job.source) + '</code></pre>';
          }
        });
      });
    }

    var CM_CDN = 'libs/';
    var cmCoreLoaded = false;
    var cmModeLoaded = {};

    function getCmMode(codeLang) {
      var map = {
        javascript: 'javascript',
        typescript: {name:'javascript', typescript:true},
        json: {name:'javascript', json:true},
        css: 'css',
        csharp: 'text/x-csharp',
        bash: 'shell',
        python: 'python',
        markdown: 'markdown',
        html: 'htmlmixed',
        sql: 'sql',
        xml: 'xml',
        yaml: 'yaml',
        ini: 'properties'
      };
      return map[codeLang] || null;
    }

    function getCmModeFiles(codeLang) {
      var map = {
        javascript: ['mode/javascript/javascript.min.js'],
        typescript: ['mode/javascript/javascript.min.js'],
        json: ['mode/javascript/javascript.min.js'],
        css: ['mode/css/css.min.js'],
        csharp: ['mode/clike/clike.min.js'],
        bash: ['mode/shell/shell.min.js'],
        python: ['mode/python/python.min.js'],
        markdown: ['mode/xml/xml.min.js','mode/markdown/markdown.min.js'],
        html: ['mode/xml/xml.min.js','mode/javascript/javascript.min.js','mode/css/css.min.js','mode/htmlmixed/htmlmixed.min.js'],
        sql: ['mode/sql/sql.min.js'],
        xml: ['mode/xml/xml.min.js'],
        yaml: ['mode/yaml/yaml.min.js'],
        ini: ['mode/properties/properties.js']
      };
      return map[codeLang] || [];
    }

    function loadScriptSeq(urls, idx, cb) {
      if (idx >= urls.length) { cb(); return; }
      var url = urls[idx];
      if (cmModeLoaded[url]) { loadScriptSeq(urls, idx + 1, cb); return; }
      var s = document.createElement('script');
      s.src = url;
      s.onload = function() { cmModeLoaded[url] = true; loadScriptSeq(urls, idx + 1, cb); };
      s.onerror = function() { cmModeLoaded[url] = true; loadScriptSeq(urls, idx + 1, cb); };
      document.head.appendChild(s);
    }

    function loadCodeMirror(codeLang, cb) {
      if (cmCoreLoaded && window.CodeMirror) {
        var files = getCmModeFiles(codeLang).map(function(f) { return CM_CDN + f; });
        loadScriptSeq(files, 0, cb);
        return;
      }
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CM_CDN + 'codemirror.min.css';
      document.head.appendChild(link);
      var darkTheme = document.createElement('link');
      darkTheme.rel = 'stylesheet';
      darkTheme.href = CM_CDN + 'theme/material-darker.min.css';
      document.head.appendChild(darkTheme);
      var lightTheme = document.createElement('link');
      lightTheme.rel = 'stylesheet';
      lightTheme.href = CM_CDN + 'theme/eclipse.min.css';
      document.head.appendChild(lightTheme);
      var s = document.createElement('script');
      s.src = CM_CDN + 'codemirror.min.js';
      s.onload = function() {
        cmCoreLoaded = true;
        var files = getCmModeFiles(codeLang).map(function(f) { return CM_CDN + f; });
        loadScriptSeq(files, 0, cb);
      };
      s.onerror = function() { cmCoreLoaded = true; cb(); };
      document.head.appendChild(s);
    }

    function populateThemeCheckboxes(checkedIds) {
      bmEditThemeList.innerHTML = '';
      var hasThemes = false;
      bmData.themes.forEach(function (t) {
        if (t.id === 'all') return;
        hasThemes = true;
        var label = document.createElement('label');
        label.className = 'bm-theme-check-item';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = t.id;
        if (checkedIds && checkedIds.indexOf(t.id) !== -1) cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode((t.icon ? t.icon + ' ' : '') + t.name));
        bmEditThemeList.appendChild(label);
      });
      if (!hasThemes) {
        bmEditThemeList.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:4px 8px">(請先新增主題)</div>';
      }
    }

    function getCheckedThemeIds() {
      var ids = [];
      bmEditThemeList.querySelectorAll('input[type=checkbox]:checked').forEach(function(cb) {
        ids.push(cb.value);
      });
      return ids;
    }

    function resetEditForm() {
      editingFavId = null;
      thumbValue = null;
      bmEditUrl.value = '';
      bmEditContent.value = '';
      bmEditCodeLang.value = 'auto';
      bmEditNotionUrl.value = '';
      bmEditTitleInput.value = '';
      bmPasteArea.innerHTML = 'Ctrl+V 貼上圖片，或點擊選擇檔案';
      setEditType('url');
      populateThemeCheckboxes([]);
    }

    function handleThumbFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        compressThumb(e.target.result, function (compressed) {
          thumbValue = compressed;
          bmPasteArea.innerHTML = '<img src="' + compressed + '">';
          bmMarkEdit();
        });
      };
      reader.readAsDataURL(file);
    }

    bmPasteArea.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          handleThumbFile(items[i].getAsFile());
          e.preventDefault();
          return;
        }
      }
    });

    document.addEventListener('paste', function (e) {
      if (!bmEditModalBg.classList.contains('open')) return;
      if (document.activeElement === bmEditContent || document.activeElement === bmEditUrl ||
          document.activeElement === bmEditNotionUrl || document.activeElement === bmEditTitleInput) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          handleThumbFile(items[i].getAsFile());
          e.preventDefault();
          return;
        }
      }
    });

    bmPasteArea.addEventListener('click', function () { bmThumbFile.click(); });
    bmThumbFile.addEventListener('change', function () {
      if (bmThumbFile.files[0]) handleThumbFile(bmThumbFile.files[0]);
      bmThumbFile.value = '';
    });

    // Auto-fetch via Microlink
    bmFetchBtn.addEventListener('click', function () {
      var url = bmEditUrl.value.trim();
      if (!url) { showToast('請先輸入 URL'); return; }
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      bmEditUrl.value = url;
      bmFetchBtn.disabled = true;
      bmFetchBtn.textContent = '擷取中...';

      fetch('https://api.microlink.io/?url=' + encodeURIComponent(url))
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json.status === 'success' && json.data) {
            if (json.data.title && !bmEditTitleInput.value) {
              bmEditTitleInput.value = json.data.title;
            }
            if (json.data.image && json.data.image.url && !thumbValue) {
              var img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = function () {
                var canvas = document.createElement('canvas');
                var MAX = 420;
                var w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                  if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                  else { w = Math.round(w * MAX / h); h = MAX; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                try {
                  thumbValue = canvas.toDataURL('image/jpeg', 0.82);
                  bmPasteArea.innerHTML = '<img src="' + thumbValue + '">';
                } catch (e) {
                  // CORS issues — ignore
                }
              };
              img.onerror = function () { /* ignore */ };
              img.src = json.data.image.url;
            }
            showToast('已擷取網站資訊');
          } else {
            showToast('無法擷取，請手動輸入');
          }
        })
        .catch(function () {
          showToast('擷取失敗');
        })
        .finally(function () {
          bmFetchBtn.disabled = false;
          bmFetchBtn.textContent = '自動擷取';
        });
    });

    function openAddBookmark() {
      resetEditForm();
      document.getElementById('bmEditTitle').innerHTML = window.CARD_ICONS.add + '新增書籤';
      bmEditEdited = false; clearEdited(bmEditTitleEl);
      var preChecked = (currentThemeId && currentThemeId !== 'all') ? [currentThemeId] : [];
      populateThemeCheckboxes(preChecked);
      bmEditModalBg.classList.add('open');
    }

    function openEditBookmark(favId) {
      resetEditForm();
      var fav = bmData.favorites.find(function (f) { return f.id === favId; });
      if (!fav) return;
      editingFavId = favId;
      if (fav.content) {
        setEditType('note');
        bmEditContent.value = fav.content;
        bmEditCodeLang.value = fav.codeLang || 'auto';
        bmEditNotionUrl.value = fav.notionUrl || '';
        bmEditUrl.value = '';
      } else {
        setEditType('url');
        bmEditUrl.value = fav.url || '';
      }
      bmEditTitleInput.value = fav.title || '';
      thumbValue = fav.thumbnail || null;
      if (thumbValue) {
        bmPasteArea.innerHTML = '<img src="' + thumbValue + '">';
      }
      populateThemeCheckboxes(fav.themeIds || []);

      document.getElementById('bmEditTitle').innerHTML = window.CARD_ICONS.edit + '編輯書籤';
      bmEditEdited = false; clearEdited(bmEditTitleEl);
      bmEditModalBg.classList.add('open');
    }

    bmEditSaveBtn.addEventListener('click', function () {
      var title = bmEditTitleInput.value.trim();
      var themeIds = getCheckedThemeIds();
      var url = '';
      var content = null;

      if (editType === 'url') {
        url = bmEditUrl.value.trim();
        if (!url) { showToast('請輸入 URL'); return; }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        if (!title) title = url;
      } else {
        content = bmEditContent.value;
        if (!content && !title) { showToast('請輸入筆記內容或標題'); return; }
        if (!title) title = content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 30) || '未命名筆記';
      }
      var notionUrl = editType === 'note' ? bmEditNotionUrl.value.trim() : '';
      var notionId = extractNotionId(notionUrl) || null;
      var codeLang = editType === 'note' ? bmEditCodeLang.value : undefined;

      if (content) content = replaceNotionLinks(content, notionId);

      if (editingFavId) {
        var fav = bmData.favorites.find(function (f) { return f.id === editingFavId; });
        if (fav) {
          fav.url = url;
          fav.title = title;
          fav.thumbnail = thumbValue;
          fav.themeIds = themeIds;
          fav.content = content;
          fav.notionUrl = notionUrl || undefined;
          fav.notionId = notionId || undefined;
          fav.codeLang = codeLang || undefined;
          delete fav.themeId;
        }
        showToast('書籤已更新');
      } else {
        var newFav = {
          id: 'fav_' + Date.now(),
          themeIds: themeIds,
          title: title,
          url: url,
          content: content,
          thumbnail: thumbValue
        };
        if (notionUrl) newFav.notionUrl = notionUrl;
        if (notionId) newFav.notionId = notionId;
        if (codeLang) newFav.codeLang = codeLang;
        bmData.favorites.push(newFav);
        showToast('書籤已新增');
      }

      saveBmData();
      bmEditEdited = false;
      clearEdited(bmEditTitleEl);
      bmEditModalBg.classList.remove('open');
      renderBookmarks();
    });

    // ── Add theme modal ──────────────────────────────────────────────
    var themeWrapper = document.createElement('div');
    themeWrapper.innerHTML = `
      <div id="bmThemeModalBg">
        <div class="bm-theme-modal">
          <div class="modal-header">
          <h2>` + window.CARD_ICONS.add + `新增主題</h2><button class="close-btn" id="bmThemeCloseBtn">✕</button>
          </div>
          <div class="bm-field">
            <label>主題名稱</label>
            <input id="bmThemeNameInput" type="text" placeholder="例如: 工作、學習">
          </div>
          <button class="bm-btn-save" id="bmThemeSaveBtn">新增</button>
        </div>
      </div>
    `;
    document.body.appendChild(themeWrapper.firstElementChild);

    var bmThemeModalBg = document.getElementById('bmThemeModalBg');

    function openAddTheme() {
      document.getElementById('bmThemeNameInput').value = '';
      bmThemeModalBg.classList.add('open');
    }

    document.getElementById('bmThemeCloseBtn').addEventListener('click', function () {
      bmThemeModalBg.classList.remove('open');
    });
    bmThemeModalBg.addEventListener('click', function (e) {
      if (e.target === bmThemeModalBg) bmThemeModalBg.classList.remove('open');
    });
    document.getElementById('bmThemeSaveBtn').addEventListener('click', function () {
      var name = document.getElementById('bmThemeNameInput').value.trim();
      if (!name) { showToast('請輸入主題名稱'); return; }
      bmData.themes.push({
        id: 'theme_' + Date.now(),
        name: name,
        icon: '📌'
      });
      saveBmData();
      bmThemeModalBg.classList.remove('open');
      renderBookmarks();
      showToast('主題已新增');
    });

    /* Sort/Export/Import code moved to bookmark-sort.js, bookmark-export.js, bookmark-import.js */
    // ── Register bm-add (stays internal — depends on currentThemeId closure) ──
    registerPlugin('bm-add', {
      icon: window.CARD_ICONS.add,
      get label() { return currentThemeId === 'all' ? '新增主題' : '新增書籤'; },
      order: 10, mode: 'bookmark',
      open: function() {
        if (currentThemeId === 'all') openAddTheme();
        else openAddBookmark();
      }
    });

    // ── Expose globals for sub-plugins ────────────────────────────
    window.renderBookmarks = renderBookmarks;
    window.bmGetData = function() { return bmData; };
    window.bmSaveData = saveBmData;
    window.bmLoadData = loadBmData;
    window.bmEscHtml = escHtml;
    window.bmGetVisibleFavorites = getVisibleFavorites;
    window.bmGetCurrentThemeId = function() { return currentThemeId; };
    window.bmSetCurrentThemeId = function(id) { currentThemeId = id; localStorage.setItem(BM_THEME_KEY, id); };
    window.bmOpenReader = openReader;
    window.bmGetThemeName = getThemeName;
    window.bmRenderContent = function(container, content, onDone) {
      loadMarked(function() {
        loadHljs(function() {
          renderAndHighlight(container, content, 'auto');
          if (typeof onDone === 'function') onDone();
        });
      });
    };
  }
});