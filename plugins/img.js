registerPlugin('img', {
  main: true,
  menuOrder: 3,
  label: '文壓圖',
  menuIcon: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  icon: window.CARD_ICONS.add,
  label: '文壓圖',
  mode: 'img',
  order: 12,
  favicon: function(canvas, ctx) {
    ctx.strokeStyle = '#ffd100'; ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 24, 24);
    ctx.beginPath(); ctx.arc(11, 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(14, 16); ctx.lineTo(22, 22); ctx.lineTo(28, 18); ctx.lineTo(28, 28); ctx.lineTo(4, 28); ctx.closePath(); ctx.fill();
  },
  open: null,

  init() {
    var STORAGE_KEY = 'imgStampData';
    function loadStamps() {
      try { var d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(d)) return d; } catch (e) {}
      return [];
    }
    function saveStamps(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); if (typeof renderToolbar === 'function') renderToolbar(); }
    function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    var stamps = loadStamps();
    var FONT_LIST = ['sans-serif','serif','monospace','Arial','Times New Roman','Courier New','Georgia','Verdana','Impact','Comic Sans MS','Microsoft JhengHei','Noto Sans TC'];

    // ── CSS ───────────────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = [
      '.is-modal-bg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:200}',
      '.is-modal-bg.open{opacity:1;pointer-events:all}',
      '.is-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;width:min(960px,95vw);max-height:92vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:16px;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '.is-modal-bg.open .is-modal{transform:translateY(0) scale(1)}',

      /* toolbar */
      '.is-toolbar{display:flex;gap:6px;align-items:center}',
      '.is-toolbar .is-tb-btn{padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;transition:background .15s,color .15s,border-color .15s}',
      '.is-toolbar .is-tb-btn:hover{background:var(--surface2);color:var(--text);border-color:var(--accent)}',
      '.is-toolbar .is-tb-btn svg{width:14px;height:14px}',

      /* gallery */
      '#isContent{width:100%}',
      '.is-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;width:100%}',
      '.is-gallery-item{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s}',
      '.is-gallery-item:hover{transform:translateY(-4px);box-shadow:0 8px 20px rgba(0,0,0,.3)}',
      '.is-gallery-item.is-drag-over{border-color:var(--accent);box-shadow:0 0 12px rgba(81,203,238,.3)}',
      '.is-gallery-thumb{height:140px;background:var(--surface2);display:flex;align-items:center;justify-content:center;overflow:hidden}',
      '.is-gallery-thumb img{width:100%;height:100%;object-fit:cover}',
      '.is-gallery-thumb .is-no-thumb{font-size:48px;color:var(--text-dim);opacity:.3}',
      '.is-gallery-body{padding:12px}',
      '.is-gallery-name{font-size:13px;font-weight:500;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}',
      '.is-gallery-meta{font-size:11px;color:var(--text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.is-gallery-empty{grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.is-gallery-empty-icon{margin-bottom:12px;color:var(--text-dim);opacity:.5}',
      '.is-gallery-empty-icon svg{width:48px;height:48px}',

      /* editor popup modal */
      '#isEditorModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:200}',
      '#isEditorModalBg.open{opacity:1;pointer-events:all}',
      '.is-editor{display:flex;flex-direction:column;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;width:min(960px,95vw);max-height:92vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '#isEditorModalBg.open .is-editor{transform:translateY(0) scale(1)}',
      '.is-editor-name{padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:14px;font-weight:500;outline:none;width:100%;box-sizing:border-box}',
      '.is-editor-name:focus{border-color:var(--accent)}',
      '.is-editor-name::placeholder{color:var(--text-dim);font-weight:400}',

      '.is-canvas-wrap{position:relative;background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:crosshair;display:flex;align-items:center;justify-content:center;min-height:200px}',
      '.is-canvas-wrap canvas{max-width:100%;max-height:50vh;display:block}',
      '.is-canvas-empty{color:var(--text-dim);font-size:13px;padding:40px;text-align:center}',

      '.is-text-list{display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '.is-text-row{display:flex;gap:6px;align-items:center;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;flex-wrap:wrap}',
      '.is-text-row input[type="text"]{flex:1;min-width:100px;padding:5px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;outline:none}',
      '.is-text-row input[type="text"]:focus{border-color:var(--accent)}',
      '.is-text-row input[type="number"]{width:52px;padding:5px 4px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;outline:none;text-align:center}',
      '.is-text-row input[type="color"]{width:28px;height:28px;border:none;background:none;cursor:pointer;padding:0}',
      '.is-text-row select{padding:4px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;max-width:110px;outline:none}',
      '.is-text-row select:focus{border-color:var(--accent)}',
      '.is-text-row .is-del-text{background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:0 4px;line-height:1}',

      '.is-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.is-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:13px;transition:background .15s,color .15s,border-color .15s}',
      '.is-btn:hover{background:var(--surface2);color:var(--text);border-color:var(--accent)}',
      '.is-btn-primary{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}',
      '.is-btn-primary:hover{opacity:.88}',
      '.is-btn-danger{color:var(--danger);border-color:var(--danger)}',
      '.is-btn-danger:hover{background:rgba(239,83,80,.1)}',

      '.is-output{display:none;flex-direction:column;gap:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px}',
      '.is-output.open{display:flex}',
      '.is-output img{max-width:100%;max-height:200px;object-fit:contain;border-radius:6px}',
      '.is-b64-box{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--text-dim);font-family:monospace;word-break:break-all;max-height:80px;overflow-y:auto;cursor:pointer;transition:border-color .15s;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '.is-b64-box:hover{border-color:var(--accent)}',

      '.is-drop-overlay{position:absolute;inset:0;background:rgba(81,203,238,.08);border:2px dashed var(--accent);border-radius:8px;display:none;align-items:center;justify-content:center;color:var(--accent);font-size:14px;z-index:10;pointer-events:none}',
      '.is-drop-overlay.show{display:flex}',

      /* context menu */
      '.is-ctx-menu{position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;z-index:500;min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,.4)}',
      '.is-ctx-menu button{display:block;width:100%;padding:8px 16px;background:none;border:none;color:var(--text-dim);text-align:left;cursor:pointer;font-size:13px}',
      '.is-ctx-menu button:hover{background:var(--surface2);color:var(--text)}',

      /* delete confirm */
      '#isConfirmBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;z-index:400}',
      '#isConfirmBg.open{opacity:1;pointer-events:all}',
      '.is-confirm{background:var(--surface);border:1px solid var(--danger);border-radius:12px;padding:24px;width:min(400px,90vw);display:flex;flex-direction:column;gap:16px}',
      '.is-confirm-msg{font-size:14px;color:var(--text-dim);line-height:1.5;text-align:center}',
      '.is-confirm-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px}',
      '.is-confirm-card img{width:48px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0}',
      '.is-confirm-card-body{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.is-confirm-card-name{font-size:14px;font-weight:500;color:var(--text)}',
      '.is-confirm-card-meta{font-size:11px;color:var(--text-dim)}',
      '.is-confirm-actions{display:flex;gap:10px}',
      '.is-confirm-actions button{flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;transition:opacity .15s}',
      '.is-confirm-cancel{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border) !important}',
      '.is-confirm-cancel:hover{opacity:.8}',
      '.is-confirm-delete{background:var(--danger);color:#fff}',
      '.is-confirm-delete:hover{opacity:.85}',

      /* export/import popup (shared) */
      '.is-popup-bg{position:fixed;inset:0;backdrop-filter:blur(4px);z-index:300;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s}',
      '.is-popup-bg.open{opacity:1;pointer-events:all}',
      '.is-popup{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;width:min(520px,94vw);max-height:80vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '.is-popup-bg.open .is-popup{transform:translateY(0) scale(1)}',
      '.is-popup-hint{font-size:12px;color:var(--text-dim)}',
      '.is-popup-list{display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#555 #1e1e1e}',
      '.is-popup-row{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s,background .15s;user-select:none}',
      '.is-popup-row:hover{border-color:#444;background:rgba(255,255,255,.03)}',
      '.is-popup-row.selected{border-color:var(--accent);background:rgba(81,203,238,.06)}',
      '.is-popup-row input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0}',
      '.is-popup-row-thumb{width:48px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0;background:var(--surface)}',
      '.is-popup-row-info{flex:1;min-width:0}',
      '.is-popup-row-name{font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.is-popup-row-meta{font-size:10px;color:var(--text-dim);margin-top:2px}',
      '.is-popup-row-label{font-size:10px;font-weight:600;margin-top:2px}',
      '.is-popup-footer{display:flex;gap:8px}',
      '.is-popup-footer button{flex:1;padding:10px;border-radius:8px;font-size:13px;cursor:pointer;border:none;transition:opacity .15s}',
      '.is-popup-cancel{background:var(--surface2);color:var(--text-dim);border:1px solid var(--border) !important}',
      '.is-popup-confirm{background:var(--accent);color:#fff;font-weight:600}',
      '.is-popup-confirm:hover{opacity:.88}',
      '.is-popup-confirm:disabled{opacity:.4;cursor:not-allowed}',
      '.is-popup-quick{display:flex;gap:6px;font-size:12px}',
      '.is-popup-quick button{padding:4px 10px;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:11px;transition:border-color .15s,color .15s}',
      '.is-popup-quick button:hover{border-color:var(--accent);color:var(--accent)}',
      /* import-specific */
      '.is-imp-new{border-color:var(--success)}',
      '.is-imp-new .is-popup-row-label{color:var(--success)}',
      '.is-imp-dup{border-color:#ff9800}',
      '.is-imp-dup .is-popup-row-label{color:#ff9800}',
      '.is-imp-overwrite{border-color:var(--accent) !important}',
      '.is-imp-overwrite .is-popup-row-label{color:var(--accent) !important}',
      '.is-imp-skipped{border-color:var(--border) !important}',
      '.is-imp-skipped .is-popup-row-label{color:var(--text-dim) !important}',
      '.is-imp-action{display:flex;gap:4px;flex-shrink:0}',
      '.is-imp-action button{padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-dim);transition:background .15s}',
      '.is-imp-action button.active-add{border-color:var(--success);color:var(--success);background:rgba(0,168,84,.1)}',
      '.is-imp-action button.active-over{border-color:var(--accent);color:var(--accent);background:rgba(81,203,238,.1)}',
      '.is-imp-action button.active-skip{border-color:#ff9800;color:#ff9800;background:rgba(255,152,0,.1)}',
      '.is-imp-drop{border:2px dashed var(--border);border-radius:10px;padding:30px 20px;text-align:center;cursor:pointer;color:var(--text-dim);font-size:13px;transition:border-color .2s,background .2s}',
      '.is-imp-drop:hover,.is-imp-drop.drag-over{border-color:var(--accent);background:rgba(0,229,255,.04)}',
      /* import popup — wider modal + grid list */
      '#isImpBg .is-popup{width:min(92vw,1600px)}',
      '#isImpBg .is-popup-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));max-height:60vh;overflow-y:auto}',
      '.is-imp-dup-file{border-color:#e040fb !important}',
      '.is-imp-dup-file .is-popup-row-label{color:#e040fb !important}',
      /* full-page drag overlay */
      '#imgImportDropOverlay{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s}',
      '#imgImportDropOverlay.active{opacity:1;pointer-events:all}',
      '.img-drop-overlay-inner{border:3px dashed var(--accent);border-radius:16px;padding:48px 64px;color:var(--accent);font-size:1.4rem;font-weight:600;background:rgba(0,0,0,.6);pointer-events:none;text-align:center}'
    ].join('\n');
    document.head.appendChild(style);

    // ── HTML ──────────────────────────────────────────────────
    var contentEl = document.createElement('div');
    contentEl.id = 'isContent';
    contentEl.setAttribute('data-plugin-content', '');
    contentEl.style.display = 'none';
    contentEl.innerHTML =
      '<div class="is-gallery" id="isGallery"></div>';
    document.body.appendChild(contentEl);

    // ── Editor popup modal (參考 bookmark.js bmEditModalBg) ───
    var editorModalEl = document.createElement('div');
    editorModalEl.id = 'isEditorModalBg';
    editorModalEl.innerHTML =
      '<div class="is-editor" id="isEditor">' +
        '<div class="modal-header">' +
          '<h2 id="isEditorTitle"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>新增母片</h2>' +
          '<button class="close-btn" id="isEditorClose">✕</button>' +
        '</div>' +
        '<input class="is-editor-name" id="isEditorName" type="text" placeholder="輸入母片名稱...">' +
        '<div class="is-canvas-wrap" id="isCanvasWrap">' +
          '<div class="is-canvas-empty" id="isCanvasEmpty">拖曳 / 貼上 / 點擊下方按鈕上傳圖片</div>' +
          '<canvas id="isCanvas" style="display:none"></canvas>' +
          '<div class="is-drop-overlay" id="isDropOverlay">放開以載入圖片</div>' +
        '</div>' +
        '<div class="is-text-list" id="isTextList"></div>' +
        '<div class="is-actions">' +
          '<button class="is-btn" id="isUploadBtn">上傳圖片</button>' +
          '<button class="is-btn is-btn-primary" id="isExportBtn">輸出</button>' +
          '<button class="is-btn" id="isSaveBtn">儲存</button>' +
          '<button class="is-btn is-btn-danger" id="isDeleteBtn" style="display:none">刪除母片</button>' +
        '</div>' +
        '<div class="is-output" id="isOutput">' +
          '<img id="isOutputImg">' +
          '<div style="display:flex;gap:8px">' +
            '<button class="is-btn" id="isDownloadBtn">下載圖片</button>' +
            '<button class="is-btn" id="isCopyB64Btn">複製 Base64</button>' +
          '</div>' +
          '<div class="is-b64-box" id="isB64Box" title="點擊複製"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(editorModalEl);

    var confirmEl = document.createElement('div');
    confirmEl.innerHTML = '<div id="isConfirmBg"><div class="is-confirm">' +
      '<div class="is-confirm-msg">確定要刪除這個母片？</div>' +
      '<div class="is-confirm-card" id="isConfirmCard"></div>' +
      '<div class="is-confirm-actions">' +
        '<button class="is-confirm-cancel" id="isConfirmCancel">取消</button>' +
        '<button class="is-confirm-delete" id="isConfirmOk">刪除</button>' +
      '</div></div></div>';
    document.body.appendChild(confirmEl.firstElementChild);

    var isConfirmBg = document.getElementById('isConfirmBg');
    var pendingDeleteIdx = null;

    function showDeleteConfirm(idx) {
      pendingDeleteIdx = idx;
      var s = stamps[idx];
      var cardEl = document.getElementById('isConfirmCard');
      if (!s) { cardEl.innerHTML = ''; isConfirmBg.classList.add('open'); return; }
      cardEl.innerHTML =
        (s.image ? '<img src="' + s.image + '">' : '') +
        '<div class="is-confirm-card-body">' +
          '<div class="is-confirm-card-name">' + escHtml(s.name) + '</div>' +
          '<div class="is-confirm-card-meta">' + (s.texts || []).length + ' 個文字</div>' +
        '</div>';
      isConfirmBg.classList.add('open');
    }

    bindPopup(isConfirmBg, function() { isConfirmBg.classList.remove('open'); pendingDeleteIdx = null; });
    document.getElementById('isConfirmOk').addEventListener('click', function() {
      isConfirmBg.classList.remove('open');
      if (pendingDeleteIdx === null) return;
      stamps.splice(pendingDeleteIdx, 1);
      saveStamps(stamps);
      pendingDeleteIdx = null;
      if (currentStampIdx >= 0) { showGallery(); }
      else { renderGallery(); }
      showToast('母片已刪除');
    });

    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // ── Refs ──────────────────────────────────────────────────
    var galleryEl      = document.getElementById('isGallery');
    var editorModalBg  = document.getElementById('isEditorModalBg');
    var editorEl       = document.getElementById('isEditor');
    var editorTitle    = document.getElementById('isEditorTitle');
    var editorName     = document.getElementById('isEditorName');
    editorName.addEventListener('input', function() { edited = true; markEdited(editorTitle); });
    var canvasWrap     = document.getElementById('isCanvasWrap');
    var canvasEmpty = document.getElementById('isCanvasEmpty');
    var canvas      = document.getElementById('isCanvas');
    var ctx         = canvas.getContext('2d');
    var dropOverlay = document.getElementById('isDropOverlay');
    var textListEl  = document.getElementById('isTextList');
    var exportBtn   = document.getElementById('isExportBtn');
    var saveBtn     = document.getElementById('isSaveBtn');
    var deleteBtn   = document.getElementById('isDeleteBtn');
    var uploadBtn   = document.getElementById('isUploadBtn');
    var outputArea  = document.getElementById('isOutput');
    var outputImg   = document.getElementById('isOutputImg');
    var downloadBtn = document.getElementById('isDownloadBtn');
    var copyB64Btn  = document.getElementById('isCopyB64Btn');
    var b64Box      = document.getElementById('isB64Box');

    // ── State ─────────────────────────────────────────────────
    var currentStampIdx = -1;
    var baseImage = null;
    var baseImageData = null;
    var texts = [];
    var dragIdx = -1, dragOffX = 0, dragOffY = 0, isDragging = false, hoverIdx = -1;
    var lastOutputB64 = '';
    var viewMode = 'gallery'; // 'gallery' | 'editor'
    var edited = false;

    // ── View switching ────────────────────────────────────────
    function showGallery() {
      confirmLeave(edited, function() {
        viewMode = 'gallery';
        edited = false;
        clearEdited(editorTitle);
        editorModalBg.classList.remove('open');
        renderGallery();
      });
    }

    var SVG_ADD  = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    var SVG_EDIT = '<svg viewBox="0 0 528.899 528.899" width="18" height="18" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" style="vertical-align:middle;margin-right:6px"><path d="M328.883 89.125l107.59 107.589-272.34 272.34L56.604 361.465 328.883 89.125zM518.113 63.177l-47.981-47.981c-18.543-18.543-48.653-18.543-67.259 0l-45.961 45.961 107.59 107.59 53.611-53.611c12.582-12.582 12.582-35.776 0-48.158zM0.3 512.69c-1.958 8.812 5.998 16.708 14.811 14.565l119.891-29.069L27.473 390.597 0.3 512.69z"/></svg>';

    function showEditor(mode) {
	  viewMode = 'editor';
  
	  if (mode === 'new') {
		editorTitle.innerHTML = SVG_ADD + '新增母片';
	  } else {
		editorTitle.innerHTML = SVG_EDIT + '編輯母片';
	  }
	  
	  outputArea.classList.remove('open');
	  editorModalBg.classList.add('open');
    }

    bindPopup(editorModalBg, showGallery);

    // ── Context menu ─────────────────────────────────────────
    var activeCtxMenu = null;
    function removeCtxMenu() {
      if (activeCtxMenu) { activeCtxMenu.remove(); activeCtxMenu = null; }
    }
    document.addEventListener('click', function() { removeCtxMenu(); });

    function showStampCtxMenu(x, y, idx) {
      removeCtxMenu();
      var menu = document.createElement('div');
      menu.className = 'is-ctx-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      var editBtn = document.createElement('button');
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function(e) { e.stopPropagation(); removeCtxMenu(); openStampEditor(idx); });

      var copyBtn = document.createElement('button');
      copyBtn.textContent = '複製';
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation(); removeCtxMenu();
        var src = stamps[idx];
        if (!src) return;
        var clone = JSON.parse(JSON.stringify(src));
        clone.id = 'stamp_' + Date.now();
        var base = clone.name.replace(/-copy\(\d+\)$/, '');
        var n = 1;
        while (stamps.some(function(s) { return s.name === base + '-copy(' + n + ')'; })) n++;
        clone.name = base + '-copy(' + n + ')';
        stamps.push(clone);
        saveStamps(stamps);
        renderGallery();
        showToast('母片已複製');
      });

      var delBtn = document.createElement('button');
      delBtn.textContent = '刪除';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation(); removeCtxMenu();
        showDeleteConfirm(idx);
      });

      menu.appendChild(editBtn);
      menu.appendChild(copyBtn);
      menu.appendChild(delBtn);
      menu.addEventListener('click', function(e) { e.stopPropagation(); });
      document.body.appendChild(menu);
      activeCtxMenu = menu;

      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    // ── Gallery ───────────────────────────────────────────────
    function renderGallery() {
      stamps = loadStamps();
      galleryEl.innerHTML = '';
      if (stamps.length === 0) {
        galleryEl.innerHTML = '<div class="is-gallery-empty"><div class="is-gallery-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div>尚無母片</div><div style="font-size:12px;margin-top:4px">點擊工具列 <kbd style="background:var(--surface);border:1px solid var(--border);border-bottom-width:3px;border-radius:4px;padding:1px 6px;font-size:11px;color:var(--text)">+</kbd> 按鈕新增</div><div style="font-size:12px;margin-top:6px;color:var(--text-dim)">或拖曳 JSON 檔至畫面快速匯入</div></div>';
        return;
      }
      var dragSrcIdx = null;
      stamps.forEach(function(s, i) {
        var card = document.createElement('div');
        card.className = 'is-gallery-item';
        card.draggable = true;
        var textCount = (s.texts || []).length;

        var thumbDiv = document.createElement('div');
        thumbDiv.className = 'is-gallery-thumb';
        if (s.image) {
          var img = document.createElement('img');
          img.src = s.image;
          img.alt = s.name;
          img.onerror = function() { thumbDiv.innerHTML = '<div class="is-no-thumb">🖼️</div>'; };
          thumbDiv.appendChild(img);
        } else {
          thumbDiv.innerHTML = '<div class="is-no-thumb">🖼️</div>';
        }

        var body = document.createElement('div');
        body.className = 'is-gallery-body';
        body.innerHTML = '<div class="is-gallery-name">' + escHtml(s.name) + '</div>' +
          '<div class="is-gallery-meta">' + textCount + ' 個文字</div>';

        card.appendChild(thumbDiv);
        card.appendChild(body);
        card.addEventListener('click', function() { openStampEditor(i); });
        card.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          showStampCtxMenu(e.clientX, e.clientY, i);
        });

        card.addEventListener('dragstart', function(e) {
          dragSrcIdx = i;
          card.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', function() {
          card.style.opacity = '';
          galleryEl.querySelectorAll('.is-gallery-item').forEach(function(c) { c.classList.remove('is-drag-over'); });
        });
        card.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          galleryEl.querySelectorAll('.is-gallery-item').forEach(function(c) { c.classList.remove('is-drag-over'); });
          card.classList.add('is-drag-over');
        });
        card.addEventListener('drop', function(e) {
          e.preventDefault();
          card.classList.remove('is-drag-over');
          if (dragSrcIdx === null || dragSrcIdx === i) return;
          var moved = stamps.splice(dragSrcIdx, 1)[0];
          stamps.splice(i, 0, moved);
          saveStamps(stamps);
          renderGallery();
        });

        galleryEl.appendChild(card);
      });
    }

    // ── Open editor ───────────────────────────────────────────
    function openStampEditor(idx) {
      var s = stamps[idx];
      if (!s) return;
      currentStampIdx = idx;
      texts = JSON.parse(JSON.stringify(s.texts || []));
      baseImageData = s.image;
      deleteBtn.style.display = '';
      edited = false; clearEdited(editorTitle);
      showEditor('edit');
      editorName.value = s.name;
      renderTextList();
      loadImageFromData(s.image, function(img) {
        baseImage = img;
        canvas.style.display = 'block';
        canvasEmpty.style.display = 'none';
        redraw();
      });
    }

    function openNewEditor() {
      currentStampIdx = -1;
      baseImage = null;
      baseImageData = null;
      texts = [];
      lastOutputB64 = '';
      canvas.style.display = 'none';
      canvasEmpty.style.display = 'block';
      textListEl.innerHTML = '';
      deleteBtn.style.display = 'none';
      edited = false; clearEdited(editorTitle);
      showEditor('new');
      editorName.value = '';
    }

    // ── Canvas helpers ────────────────────────────────────────
    function scaleRatio() {
      if (!baseImage) return 1;
      return canvas.width / canvas.getBoundingClientRect().width;
    }

    function buildFont(t) {
      return (t.bold ? 'bold ' : '') + t.fontSize + 'px ' + (t.fontFamily || 'sans-serif');
    }

    function redraw(showOverlay) {
      if (!baseImage) return;
      canvas.width = baseImage.naturalWidth;
      canvas.height = baseImage.naturalHeight;
      ctx.drawImage(baseImage, 0, 0);
      texts.forEach(function(t, i) {
        ctx.font = buildFont(t);
        ctx.fillStyle = t.color;
        ctx.textBaseline = 'top';
        ctx.fillText(t.content || '', t.x, t.y);
        if (showOverlay !== false && i === hoverIdx) {
          var w = ctx.measureText(t.content || ' ').width;
          var h = t.fontSize * 1.2;
          ctx.save();
          ctx.strokeStyle = 'rgba(81,203,238,0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(t.x - 4, t.y - 4, w + 8, h + 8);
          ctx.fillStyle = 'rgba(81,203,238,0.08)';
          ctx.fillRect(t.x - 4, t.y - 4, w + 8, h + 8);
          ctx.restore();
        }
      });
    }

    function hitTest(mx, my) {
      var ratio = scaleRatio();
      var rx = mx * ratio, ry = my * ratio;
      for (var i = texts.length - 1; i >= 0; i--) {
        var t = texts[i];
        ctx.font = buildFont(t);
        var w = ctx.measureText(t.content || ' ').width;
        var h = t.fontSize * 1.2;
        if (rx >= t.x && rx <= t.x + w && ry >= t.y && ry <= t.y + h) return i;
      }
      return -1;
    }

    function loadImageFromData(dataUrl, cb) {
      var img = new Image();
      img.onload = function() { cb(img); };
      img.onerror = function() { showToast('圖片載入失敗'); };
      img.src = dataUrl;
    }

    function compressImage(dataUrl, maxSize, cb) {
      var img = new Image();
      img.onload = function() {
        var c = document.createElement('canvas');
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    }

    function handleNewImage(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        compressImage(e.target.result, 1920, function(compressed) {
          baseImageData = compressed;
          edited = true; markEdited(editorTitle);
          loadImageFromData(compressed, function(img) {
            baseImage = img;
            canvas.style.display = 'block';
            canvasEmpty.style.display = 'none';
            redraw();
          });
        });
      };
      reader.readAsDataURL(file);
    }

    // ── Text list ─────────────────────────────────────────────
    function renderTextList() {
      textListEl.innerHTML = '';
      texts.forEach(function(t, i) {
        var row = document.createElement('div');
        row.className = 'is-text-row';

        var inp = document.createElement('input');
        inp.type = 'text'; inp.value = t.content; inp.placeholder = '輸入文字...';
        inp.addEventListener('input', function() { t.content = inp.value; edited = true; markEdited(editorTitle); redraw(); });

        var fontSel = document.createElement('select');
        fontSel.title = '字型';
        FONT_LIST.forEach(function(f) {
          var opt = document.createElement('option');
          opt.value = f; opt.textContent = f; opt.style.fontFamily = f;
          if (f === (t.fontFamily || 'sans-serif')) opt.selected = true;
          fontSel.appendChild(opt);
        });
        fontSel.addEventListener('change', function() { t.fontFamily = fontSel.value; edited = true; markEdited(editorTitle); redraw(); });

        var sizeInp = document.createElement('input');
        sizeInp.type = 'number'; sizeInp.value = t.fontSize; sizeInp.min = 8; sizeInp.max = 200; sizeInp.title = '文字大小';
        sizeInp.addEventListener('input', function() { t.fontSize = parseInt(sizeInp.value) || 24; edited = true; markEdited(editorTitle); redraw(); });

        var boldBtn = document.createElement('button');
        boldBtn.title = '粗體';
        boldBtn.textContent = 'B';
        boldBtn.style.cssText = 'padding:4px 8px;border-radius:5px;border:1px solid var(--border);background:' + (t.bold ? 'var(--accent)' : 'transparent') + ';color:' + (t.bold ? '#fff' : 'var(--text-dim)') + ';cursor:pointer;font-size:13px;font-weight:bold;min-width:28px;transition:background .15s,color .15s';
        boldBtn.addEventListener('click', function() {
          t.bold = !t.bold; edited = true; markEdited(editorTitle);
          boldBtn.style.background = t.bold ? 'var(--accent)' : 'transparent';
          boldBtn.style.color = t.bold ? '#0f0f0f' : 'var(--text-dim)';
          redraw();
        });

        var colorInp = document.createElement('input');
        colorInp.type = 'color'; colorInp.value = t.color; colorInp.title = '文字顏色';
        colorInp.addEventListener('input', function() { t.color = colorInp.value; edited = true; markEdited(editorTitle); redraw(); });

        var delBtn = document.createElement('button');
        delBtn.className = 'is-del-text'; delBtn.textContent = '✕'; delBtn.title = '刪除此文字';
        delBtn.addEventListener('click', function() { texts.splice(i, 1); edited = true; markEdited(editorTitle); renderTextList(); redraw(); });

        row.appendChild(inp);
        row.appendChild(fontSel);
        row.appendChild(sizeInp);
        row.appendChild(boldBtn);
        row.appendChild(colorInp);
        row.appendChild(delBtn);
        textListEl.appendChild(row);
      });
    }

    // ── Canvas interaction ────────────────────────────────────
    canvas.addEventListener('mousedown', function(e) {
      if (!baseImage) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var hit = hitTest(mx, my);
      if (hit >= 0) {
        dragIdx = hit;
        var ratio = scaleRatio();
        dragOffX = mx * ratio - texts[hit].x;
        dragOffY = my * ratio - texts[hit].y;
        isDragging = false;
        e.preventDefault();
      }
    });

    canvas.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (dragIdx >= 0) {
        isDragging = true;
        var ratio = scaleRatio();
        texts[dragIdx].x = Math.max(0, mx * ratio - dragOffX);
        texts[dragIdx].y = Math.max(0, my * ratio - dragOffY);
        redraw();
        return;
      }
      var hit = hitTest(mx, my);
      if (hit !== hoverIdx) {
        hoverIdx = hit;
        canvas.style.cursor = hit >= 0 ? 'move' : 'crosshair';
        redraw();
      }
    });

    canvas.addEventListener('mouseleave', function() {
      if (hoverIdx >= 0) { hoverIdx = -1; redraw(); }
    });

    document.addEventListener('mouseup', function() { if (isDragging) { edited = true; markEdited(editorTitle); } dragIdx = -1; isDragging = false; });

    canvas.addEventListener('click', function(e) {
      if (!baseImage || isDragging) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (hitTest(mx, my) >= 0) return;
      var ratio = scaleRatio();
      texts.push({ x: mx * ratio, y: my * ratio, content: '新文字', fontSize: 24, color: '#ffffff', fontFamily: 'sans-serif', bold: false });
      edited = true; markEdited(editorTitle);
      renderTextList();
      redraw();
      var rows = textListEl.querySelectorAll('.is-text-row');
      if (rows.length > 0) {
        var lastInput = rows[rows.length - 1].querySelector('input[type="text"]');
        if (lastInput) { lastInput.focus(); lastInput.select(); }
      }
    });

    // ── Drop / paste / file ───────────────────────────────────
    canvasWrap.addEventListener('dragover', function(e) { e.preventDefault(); dropOverlay.classList.add('show'); });
    canvasWrap.addEventListener('dragleave', function() { dropOverlay.classList.remove('show'); });
    canvasWrap.addEventListener('drop', function(e) {
      e.preventDefault(); dropOverlay.classList.remove('show');
      if (e.dataTransfer.files.length) handleNewImage(e.dataTransfer.files[0]);
    });

    document.addEventListener('paste', function(e) {
      var imgActive = window.viewMode === 'img';
      if (!imgActive || viewMode !== 'editor') return;
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        if (e.clipboardData.items[i].type.indexOf('image/') === 0) {
          handleNewImage(e.clipboardData.items[i].getAsFile());
          break;
        }
      }
    });

    uploadBtn.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      if (fileInput.files.length) handleNewImage(fileInput.files[0]);
      fileInput.value = '';
    });

    // ── Export image ──────────────────────────────────────────
    exportBtn.addEventListener('click', function() {
      if (!baseImage) { showToast('請先載入母片'); return; }
      var prev = hoverIdx; hoverIdx = -1;
      redraw(false);
      lastOutputB64 = canvas.toDataURL('image/png');
      hoverIdx = prev;
      outputImg.src = lastOutputB64;
      b64Box.textContent = lastOutputB64;
      outputArea.classList.add('open');
    });

    downloadBtn.addEventListener('click', function() {
      if (!lastOutputB64) return;
      var a = document.createElement('a');
      a.href = lastOutputB64; a.download = 'stamped_' + Date.now() + '.png'; a.click();
    });

    function copyB64() {
      if (!lastOutputB64) return;
      navigator.clipboard.writeText(lastOutputB64).then(function() { showToast('Base64 已複製到剪貼簿'); });
    }
    copyB64Btn.addEventListener('click', copyB64);
    b64Box.addEventListener('click', copyB64);

    // ── Save stamp ────────────────────────────────────────────
    saveBtn.addEventListener('click', function() {
      if (!baseImageData) { showToast('請先載入母片'); return; }
      var name = editorName.value.trim() || '母片 ' + (stamps.length + 1);
      if (currentStampIdx >= 0) {
        stamps[currentStampIdx].texts = JSON.parse(JSON.stringify(texts));
        stamps[currentStampIdx].image = baseImageData;
        stamps[currentStampIdx].name = name;
        saveStamps(stamps);
        edited = false; clearEdited(editorTitle);
        showToast('已儲存');
      } else {
        stamps.push({ id: 'stamp_' + Date.now(), name: name, image: baseImageData, texts: JSON.parse(JSON.stringify(texts)) });
        saveStamps(stamps);
        currentStampIdx = stamps.length - 1;
        deleteBtn.style.display = '';
        edited = false; clearEdited(editorTitle);
        showToast('母片已新增');
      }
    });

    // ── Delete stamp ──────────────────────────────────────────
    deleteBtn.addEventListener('click', function() {
      if (currentStampIdx < 0) return;
      showDeleteConfirm(currentStampIdx);
    });

    // ── Expose globals for sub-plugins ─────────────────────
    window.isLoadStamps = loadStamps;
    window.isSaveStamps = saveStamps;
    window.isRenderGallery = renderGallery;
    window.isEscHtml = escHtml;

    this.open = openNewEditor;

    this.render = function(wrapper) {
      stamps = loadStamps();
      contentEl.style.display = '';
      wrapper.appendChild(contentEl);
      showGallery();
    };
  }
});