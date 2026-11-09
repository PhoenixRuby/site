# ARCHITECTURE.md — 專案架構藍圖

> **用途**：每次改造前先讀此文件，快速掌握全局。改造完若動到架構則更新此文件。
> **最後更新**：2026-05-29

---

## 1. 目錄結構

```
tools/
├── site.htm                 # 唯一入口 HTML（26 行）
├── CLAUDE.md                # Claude 工作指引
├── ARCHITECTURE.md          # ← 你正在讀的這份
├── css/
│   └── base.css             # 全域樣式 + CSS 變數（深淺色主題）
├── js/
│   ├── nicescroll.js        # 自訂捲軸元件 NiceScroll
│   ├── base.js              # 核心：plugin registry、toolbar、mode 切換、工具函式
│   ├── edit-guard.js        # 編輯防護（markEdited / confirmLeave）
│   ├── card-icons.js        # Card 用 SVG path data 對照表（CARD_ICONS）
│   └── about.js             # 關於頁面（嵌入 CLAUDE.md / ARCHITECTURE.md 內容）
├── modules/                 # 模態對話框模組（registerModal）
│   ├── chat.js
│   ├── cicd.js
│   └── wsl.js
├── plugins/                 # 插件系統（registerPlugin）— 19 個檔案
│   ├── bookmark.js          # 主插件：書籤管理
│   ├── bookmark-sort.js     # 子插件：排序
│   ├── bookmark-export.js   # 子插件：匯出
│   ├── bookmark-import.js   # 子插件：匯入
│   ├── bookmark-search.js   # 子插件：Ctrl+F 搜尋
│   ├── card.js              # 主插件：卡片儀表板
│   ├── card-sort.js
│   ├── card-export.js
│   ├── card-import.js
│   ├── card-totp.js         # 子插件：TOTP 產生器
│   ├── img.js               # 主插件：文壓圖
│   ├── img-sort.js
│   ├── img-export.js
│   ├── img-import.js
│   ├── qr.js                # 主插件：QR Code
│   ├── qr-sort.js
│   ├── qr-scan.js           # 子插件：QR 解碼
│   ├── network.js           # 主插件：Network 請求收集
│   └── network-help.js      # 子插件：教學
└── image/                   # 圖片資源（目前空）
```

---

## 2. 啟動流程

```
site.htm 載入
  ├─ <head> 內嵌 script：讀 localStorage(appTheme)，設定 data-theme
  ├─ 載入 CSS：base.css + highlight.js 主題 CDN
  ├─ 載入 JS（順序）：nicescroll.js → base.js → edit-guard.js
  └─ base.js DOMContentLoaded:
       1. initPlugins()：動態建立 <script src="plugins/{name}.js">
          載入 KNOWN_PLUGINS 陣列中全部 18 個插件（平行載入）
       2. 每個插件腳本執行 registerPlugin(name, obj) 註冊到 window.plugins
       3. 依序呼叫每個 plugin.init()
       4. renderToolbar()
       5. new NiceScroll('html')
       6. switchMode(viewMode) 渲染初始模式
```

**關鍵 DOM 節點**：
- `#card-wrapper`：所有模式的主內容容器
- `#toolbar`：工具列
- `#toast`：Toast 通知元素

---

## 3. 插件系統

### 3.1 註冊格式

```javascript
registerPlugin('name', {
  main: true/false,        // 是否為主模式（顯示在主選單）
  menuOrder: Number,       // 主選單排序
  menuIcon: 'SVG string',  // 主選單圖示
  mode: 'string',          // 所屬模式（card/bookmark/qr/img/network）
  icon: 'SVG string',      // 工具列按鈕圖示
  label: '中文名',          // 工具列標籤
  order: Number,           // 工具列排序
  favicon: fn(canvas,ctx), // 動態 favicon 繪製
  init() { ... },          // 初始化（載入後呼叫一次）
  open() { ... },          // 點擊工具列按鈕時觸發
  render(wrapper) { ... }, // 渲染到 #card-wrapper（主插件用）
});
```

### 3.2 主插件 → 子插件依賴圖

```
card ─┬─ card-sort
      ├─ card-export
      ├─ card-import
      └─ card-totp

bookmark ─┬─ bookmark-sort
           ├─ bookmark-export
           ├─ bookmark-import
           └─ bookmark-search

img ─┬─ img-sort
     ├─ img-export
     └─ img-import

qr ─┬─ qr-sort
    └─ qr-scan

network ── network-help
```

### 3.3 modules vs plugins

| 特性 | plugins | modules |
|------|---------|---------|
| 註冊 | `registerPlugin()` | `registerModal()` |
| 存放 | `window.plugins` | `window.modalModules` |
| 位置 | `plugins/` 目錄 | `modules/` 目錄 |
| 用途 | 主畫面模式 + 工具列按鈕 | 彈窗式對話框（chat/cicd/wsl） |

---

## 4. 各主插件資料模型

### 4.1 bookmark（書籤）

**localStorage key**: `bookmarkData`

```javascript
{
  themes: [
    { id: 'all', name: '全部收藏', icon: '⭐' },  // 固定存在，不可刪除
    { id: 'theme_1234', name: '工作', icon: '📌' }
  ],
  favorites: [
    {
      id: 'fav_1234',
      themeIds: ['theme_1234', 'theme_5678'],  // 所屬主題 ID 陣列（可多選）
      title: '標題',
      url: 'https://...',        // 類型=網址時
      content: '# Markdown...',  // 類型=筆記時
      thumbnail: 'data:image/jpeg;base64,...',
      notionUrl: 'https://notion.so/...',  // 選填
      notionId: 'a1b2c3...',              // 從 notionUrl 擷取的 32 位 hex
      codeLang: 'auto'                    // 語法高亮語言
    }
  ]
}
```

**其他 localStorage keys**：
- `bookmarkTheme`：目前選中的主題 ID
- `bookmarkTabPos`：頁籤位置（top/bottom/left/right）
- `bookmarkTabOverflow`：溢出模式（scroll/dropdown/wrap）

**全域函式**：
| 函式 | 用途 |
|------|------|
| `window.renderBookmarks()` | 重繪整個書籤 UI |
| `window.bmGetData()` | 取得 bmData 物件 |
| `window.bmSaveData()` | 存到 localStorage |
| `window.bmLoadData()` | 從 localStorage 載入 |
| `window.bmEscHtml(s)` | HTML 跳脫 |
| `window.bmGetVisibleFavorites()` | 取得目前主題的書籤 |
| `window.bmGetCurrentThemeId()` | 取得目前主題 ID |
| `window.bmSetCurrentThemeId(id)` | 設定目前主題 ID 並存到 localStorage |
| `window.bmOpenReader(title, content, notionId, codeLang, favId)` | 開啟閱讀面板 |
| `window.bmGetThemeName(themeId)` | 取得主題名稱 |
| `window.bmShowLinkConfirm(url)` | 外部連結確認彈窗 |

### 4.2 card（卡片）

**localStorage key**: `site_data`

```javascript
[
  {
    name: '網站名',
    icon: 'icon-key',
    type: 'PIC/UAT/PROD/LOCAL',
    group: '群組名',
    items: [ { label: '標籤', value: '值', secret: true/false } ],
    links: [ { label: '連結名', url: 'https://...' } ]
  }
]
```

**全域函式**：`window.data`, `window.renderGrid()`, `window.saveData()`, `window.loadData()`, `window.openEditCardModal()`, `window.resolveIconSrc()`

### 4.3 img（文壓圖）

**localStorage key**: `imgStampData`

**全域函式**：`window.isLoadStamps()`, `window.isSaveStamps()`, `window.isRenderGallery()`, `window.isEscHtml()`

### 4.4 qr（QR Code）

**localStorage key**: `qrCodeData`

**全域函式**：`window.qrLoadData()`, `window.qrSaveData()`, `window.qrRenderGallery()`, `window.qrEscHtml()`

### 4.5 network（Network 請求）

**localStorage keys**: `requestCollector_ps`, `requestCollector_bash`

---

## 5. 核心工具函式（js/base.js）

| 函式 | 用途 |
|------|------|
| `registerPlugin(name, obj)` | 註冊插件到 `window.plugins` |
| `registerModal(name, obj)` | 註冊模態模組到 `window.modalModules` |
| `bindPopup(bgEl, onClose)` | 彈窗管理：點背景關閉 + ESC 鍵 + .close-btn |
| `showToast(msg)` | 底部 Toast 通知（2 秒自動消失） |
| `switchMode(mode)` | 切換檢視模式，清理舊 UI，呼叫 render |
| `renderToolbar()` | 建構工具列按鈕 |
| `applyTheme()` | 套用主題到 `<html data-theme>` |
| `escapeHtml(s)` / `esc(s)` | HTML 跳脫 |
| `makeCard(item, type)` | 共用卡片建構器（wsl/cicd 模組用） |

### js/edit-guard.js

| 函式 | 用途 |
|------|------|
| `markEdited(titleEl)` | 在標題旁顯示「已修改」徽章 |
| `clearEdited(titleEl)` | 隱藏徽章 |
| `confirmLeave(edited, onLeave)` | 若已修改則跳確認對話框 |

---

## 6. CSS 設計系統

### 6.1 CSS 自訂屬性（深色主題為預設）

```css
--bg: #000000          /* 頁面背景 */
--surface: #1e1e1e     /* 卡片/面板背景 */
--surface2: #2a2a2a    /* 次要表面 */
--surface3: #383838    /* 第三層表面 */
--border: #555         /* 邊框 */
--accent: #51cbee      /* 主色（藍綠） */
--accent2: #b497ff     /* 副色（紫） */
--accent3: #e8ff47     /* 第三色（黃綠） */
--text: #fff143        /* 主要文字（亮黃） */
--text-dim: #e0e0e0    /* 次要文字 */
--muted: #999          /* 低調文字 */
--radius: 14px         /* 圓角 */
--success: #00a854     /* 成功色 */
--danger: #e53935      /* 危險色 */
```

### 6.2 主題切換

- `data-theme="dark"` / `"light"` / `"system"`
- 淺色主題覆蓋上述變數（如 `--bg: #e8ecf0`）
- system 模式使用 `@media(prefers-color-scheme:...)` 自動切換

### 6.3 工具列定位

body class 控制工具列位置：`tb-right`（預設）/ `tb-left` / `tb-top` / `tb-bottom`

localStorage key: `toolbarPos`

---

## 7. 常用 UI 模式

### 7.1 彈窗 / Modal

```javascript
// HTML 結構
<div id="xxxBg">              // 背景遮罩（position:fixed; inset:0）
  <div class="xxx-modal">     // 內容區塊
    <div class="modal-header">
      <h2>標題</h2>
      <button class="close-btn">✕</button>
    </div>
    // ...內容...
  </div>
</div>

// CSS 慣例
#xxxBg { opacity:0; pointer-events:none; transition:opacity .3s; z-index:300 }
#xxxBg.open { opacity:1; pointer-events:all }
.xxx-modal { transform:translateY(20px) scale(.97); transition:transform .35s }
#xxxBg.open .xxx-modal { transform:translateY(0) scale(1) }

// JS 慣例
bindPopup(bg, closeCallback);  // 自動處理 ESC + 點背景 + .close-btn
bg.classList.add('open');      // 開啟
bg.classList.remove('open');   // 關閉
```

**z-index 層級**：一般 Modal 300、確認框 400、連結確認 500

### 7.2 徽章 / Badge

```css
/* 小型計數徽章 */
font-size:10px; background:var(--surface2); padding:1px 6px; border-radius:8px; color:var(--muted)

/* 語言標籤 */
font-size:11px; padding:2px 10px; border-radius:6px; background:var(--surface2);
color:var(--accent); border:1px solid var(--border)
```

### 7.3 卡片格線

```css
.bm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px }
.bm-card { background:var(--surface); border:1px solid var(--border); border-radius:10px;
           overflow:hidden; cursor:pointer }
```

### 7.4 Toast 通知

```javascript
showToast('訊息');  // 顯示 2 秒後自動消失
```

---

## 8. bookmark.js 內部結構（最大檔案，~2000 行）

```
init() {
  ├─ 資料層：loadBmData / saveBmData / bmData 物件
  ├─ CSS 注入（<style> 到 <head>）
  ├─ 工具函式：escHtml / compressThumb / getThemeName / getVisibleFavorites
  ├─ 右鍵選單：showBookmarkCtxMenu / showThemeCtxMenu
  ├─ 頁籤設定彈窗：openTabSettings
  ├─ renderBookmarks()：建構側邊欄 + 呼叫 renderBookmarkContent
  │   ├─ 側邊欄（.bm-sidebar）：主題按鈕、溢出處理、齒輪設定
  │   └─ 動態 body padding 計算
  ├─ renderBookmarkContent()：繪製書籤格線
  │   ├─ .bm-card 建構：縮圖 + 標題 + URL
  │   ├─ 拖曳排序（drag & drop）
  │   └─ 進場動畫（FLIP / zoom-in）
  ├─ Reader 面板：openReader / renderAndHighlight
  │   ├─ Markdown 渲染（marked.js CDN）
  │   ├─ 程式碼高亮（highlight.js CDN）
  │   ├─ 行號（highlightjs-line-numbers CDN）
  │   ├─ Mermaid 圖表（mermaid CDN）
  │   ├─ 編輯模式（CodeMirror CDN）
  │   └─ Notion 連結互轉
  ├─ 刪除確認彈窗：showDeleteConfirm
  ├─ 主題刪除確認：showThemeDeleteConfirm
  ├─ 外部連結確認：bmShowLinkConfirm
  ├─ 主題重新命名：openRenameTheme
  ├─ 新增/編輯書籤 Modal：openAddBookmark / openEditBookmark
  │   ├─ 類型切換（網址 / 筆記）
  │   ├─ 自動擷取（Microlink API）
  │   ├─ 縮圖貼上 / 上傳
  │   └─ 儲存邏輯
  ├─ 新增主題 Modal：openAddTheme
  ├─ CDN 載入器：loadMarked / loadHljs / loadMermaid / loadCodeMirror
  └─ 全域匯出：window.renderBookmarks / bmGetData / bmSaveData / ...
}
```

---

## 9. 子插件如何與主插件通信

子插件透過 `window.*` 全域函式與主插件通信，不直接存取內部變數。

```javascript
// 典型模式（以 bookmark-sort.js 為例）
var bmData = window.bmGetData();           // 讀取資料
var visible = window.bmGetVisibleFavorites(); // 取得篩選後清單
var themeId = window.bmGetCurrentThemeId();   // 取得狀態
// ... 修改 bmData.favorites 順序 ...
window.bmSaveData();                       // 寫回 localStorage
window.renderBookmarks();                  // 重繪 UI
```

---

## 10. 改造注意事項

1. **改 bookmark 資料模型**時，要同步更新：bookmark-sort.js、bookmark-export.js、bookmark-import.js
2. **改 card 資料模型**時，要同步更新：card-sort.js、card-export.js、card-import.js、card-totp.js
3. **新增插件**時，要加到 base.js 的 `KNOWN_PLUGINS` 陣列
4. **CSS 變數**定義在 base.css，插件 CSS 內嵌在各自的 init() 中
5. **Modal z-index**：一般 300、確認 400、最高 500，新增時注意層級
6. **localStorage**：每個主插件獨立 key，匯入匯出不自帶 key
7. **架構變更後**務必更新此文件
8. **改 CLAUDE.md 或 ARCHITECTURE.md** 後，同步更新 `js/about.js` 中嵌入的 DOCS 內容
