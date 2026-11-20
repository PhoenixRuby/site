// 1. 直接在這裡管理版號，每次更新網站只要改這裡即可
const CACHE_NAME = 'site3-f2b463bcc5ffa733'; 

const FILES = ['./', './index.htm', './manifest.json', './icon-192.png', './icon-512.png', './/css/about.css', './/css/base-sort.css', './/css/base.css', './/css/bookmark-editor.css', './/css/bookmark-export.css', './/css/bookmark-guest.css', './/css/bookmark-import.css', './/css/bookmark-search.css', './/css/bookmark-searchcontent.css', './/css/bookmark-setting.css', './/css/bookmark.css', './/css/card-export.css', './/css/card-import.css', './/css/card-totp.css', './/css/card.css', './/css/chat.css', './/css/guard.css', './/css/guest-diff-collection.css', './/css/guest-diff.css', './/css/guest-upload.css', './/css/guide.css', './/css/icon.css', './/css/img.css', './/css/md.css', './/css/network-help.css', './/css/network.css', './/css/qr-scan.css', './/css/qr.css', './/css/setting.css', './/css/viewer-help.css', './/css/viewer-setting.css', './/css/viewer.css', './/image/icon/color/icons.svg', './/image/icon/mono/about.svg', './/image/icon/mono/add.svg', './/image/icon/mono/book.svg', './/image/icon/mono/bookmark.svg', './/image/icon/mono/broken.svg', './/image/icon/mono/cancel.svg', './/image/icon/mono/card.svg', './/image/icon/mono/changeFilter.svg', './/image/icon/mono/changeMarkAll.svg', './/image/icon/mono/changeNext.svg', './/image/icon/mono/changePrevious.svg', './/image/icon/mono/chat.svg', './/image/icon/mono/cicd.svg', './/image/icon/mono/cloudOutline.svg', './/image/icon/mono/cloudfullupload.svg', './/image/icon/mono/compare.svg', './/image/icon/mono/computer.svg', './/image/icon/mono/copy.svg', './/image/icon/mono/db.svg', './/image/icon/mono/edit.svg', './/image/icon/mono/export.svg', './/image/icon/mono/ext-cs.svg', './/image/icon/mono/ext-cshtml.svg', './/image/icon/mono/ext-css.svg', './/image/icon/mono/ext-csv.svg', './/image/icon/mono/ext-file.svg', './/image/icon/mono/ext-git.svg', './/image/icon/mono/ext-html.svg', './/image/icon/mono/ext-image.svg', './/image/icon/mono/ext-ini.svg', './/image/icon/mono/ext-java.svg', './/image/icon/mono/ext-js.svg', './/image/icon/mono/ext-json.svg', './/image/icon/mono/ext-md.svg', './/image/icon/mono/ext-music.svg', './/image/icon/mono/ext-network.svg', './/image/icon/mono/ext-palette.svg', './/image/icon/mono/ext-pdf.svg', './/image/icon/mono/ext-php.svg', './/image/icon/mono/ext-sql.svg', './/image/icon/mono/ext-terminal.svg', './/image/icon/mono/ext-ts.svg', './/image/icon/mono/ext-video.svg', './/image/icon/mono/ext-xml.svg', './/image/icon/mono/ext-zip.svg', './/image/icon/mono/fileArchive.svg', './/image/icon/mono/folder.svg', './/image/icon/mono/folderOpen.svg', './/image/icon/mono/help.svg', './/image/icon/mono/img.svg', './/image/icon/mono/import.svg', './/image/icon/mono/key.svg', './/image/icon/mono/link.svg', './/image/icon/mono/logout.svg', './/image/icon/mono/mainmenu.svg', './/image/icon/mono/menu.svg', './/image/icon/mono/network.svg', './/image/icon/mono/pause.svg', './/image/icon/mono/play.svg', './/image/icon/mono/qr.svg', './/image/icon/mono/save.svg', './/image/icon/mono/saveLocal.svg', './/image/icon/mono/scan.svg', './/image/icon/mono/seachbookmark.svg', './/image/icon/mono/search.svg', './/image/icon/mono/searchcontent.svg', './/image/icon/mono/setting.svg', './/image/icon/mono/sort.svg', './/image/icon/mono/ssh.svg', './/image/icon/mono/user.svg', './/image/icon/mono/viewerHistory.svg', './/image/icon/mono/viewerHome.svg', './/image/icon/mono/viewerQuickOpen.svg', './/image/icon/mono/wsl.svg', './/js/account-storage.js', './/js/base.js', './/js/counterup.js', './/js/crypto-export.js', './/js/guard.js', './/js/guest-diff-collection.js', './/js/guest-diff-data.js', './/js/guest-diff-panel.js', './/js/icon.js', './/js/md.js', './/js/nicescroll.js', './/js/priority-sort-dialog.js', './/js/sw.js', './/js/theme.js', './/libs/atom-one-dark.min.css', './/libs/atom-one-light.min.css', './/libs/codemirror.min.css', './/libs/codemirror.min.js', './/libs/fflate.umd.js', './/libs/highlight.11.9.0.min.js', './/libs/highlightjs-line-numbers.min.js', './/libs/jsQR.1.4.0.js', './/libs/marked.15.0.12.min.js', './/libs/mermaid.min.js', './/libs/mode/clike/clike.min.js', './/libs/mode/css/css.min.js', './/libs/mode/htmlmixed/htmlmixed.min.js', './/libs/mode/javascript/javascript.min.js', './/libs/mode/markdown/markdown.min.js', './/libs/mode/properties/properties.js', './/libs/mode/python/python.min.js', './/libs/mode/shell/shell.min.js', './/libs/mode/sql/sql.min.js', './/libs/mode/xml/xml.min.js', './/libs/mode/yaml/yaml.min.js', './/libs/purify.min.js', './/libs/qrcode.min.js', './/libs/theme/eclipse.min.css', './/libs/theme/material-darker.min.css', './/libs/zxing-wasm.js', './/libs/zxing.0.21.3.min.js', './/md/generated/about-data.js', './/md/generated/bookmark-help-data.js', './/md/generated/card-help-data.js', './/md/generated/img-help-data.js', './/md/generated/qr-help-data.js', './/md/generated/viewer-help-data.js', './/modules/chat.js', './/modules/guide.js', './/plugins/about.js', './/plugins/bookmark-add.js', './/plugins/bookmark-data.js', './/plugins/bookmark-editor.js', './/plugins/bookmark-export.js', './/plugins/bookmark-guest.js', './/plugins/bookmark-help.js', './/plugins/bookmark-import.js', './/plugins/bookmark-search.js', './/plugins/bookmark-searchcontent.js', './/plugins/bookmark-setting.js', './/plugins/bookmark-sort.js', './/plugins/bookmark.js', './/plugins/card-export.js', './/plugins/card-help.js', './/plugins/card-import.js', './/plugins/card-setting.js', './/plugins/card-sort.js', './/plugins/card-totp.js', './/plugins/card.js', './/plugins/google-drive.js', './/plugins/img-export.js', './/plugins/img-help.js', './/plugins/img-import.js', './/plugins/img-sort.js', './/plugins/img.js', './/plugins/md.js', './/plugins/network-help.js', './/plugins/network.js', './/plugins/qr-help.js', './/plugins/qr-scan.js', './/plugins/qr-sort.js', './/plugins/qr.js', './/plugins/setting.js', './/plugins/viewer-archive.js', './/plugins/viewer-help.js', './/plugins/viewer-media.js', './/plugins/viewer-search.js', './/plugins/viewer-setting.js', './/plugins/viewer-text.js', './/plugins/viewer.js'];

// 安裝階段：快取核心檔案並立即接管
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// 啟動階段：清除非當前版號的所有舊快取
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME)
              .map(key => caches.delete(key))
        )
      )
    ])
  );
});

// 攔截請求：快取優先，沒有才走網路並寫入快取
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(res => {
      if (res) {
        return res;
      }
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
