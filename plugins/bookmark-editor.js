/* Two-step add/edit wizard; shares bookmark-data and original data format. */
registerPlugin('bookmark-editor', {
  mode: 'bookmark', hideToolbar: true,
  load() {
    if (this.root) return;
    const el = document.createElement('dialog');
    el.id = 'bmEditModalBg';
    el.className = 'app-dialog';
    el.innerHTML = `<div class="bm-edit-modal app-dialog-panel-medium" aria-labelledby="bmEditTitle">
      <header class="app-modal-header">
        <span class="app-modal-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V22l-6-4-6 4V4.5Z"/><path d="M9 9h6M12 6v6"/></svg></span>
        <div class="app-modal-header-info">
          <h2 class="app-modal-header-title" id="bmEditTitle">新增書籤</h2>
          <div class="app-modal-header-subtitle" id="bmEditHeaderSubtitle">選擇主題並建立書籤</div>
        </div>
        <button type="button" class="app-modal-header-close" id="bmEditCloseBtn" aria-label="關閉">✕</button>
      </header>
      <div class="bm-wizard-status"><span id="bmWizardStepLabel">選擇主題與自訂圖案</span><small id="bmWizardSubtitle">步驟 1 / 2</small></div>
      <div class="bm-wizard-progress" role="progressbar" aria-label="新增書籤進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span class="bm-wizard-progress-fill"></span></div>
      <div class="bm-wizard-body app-dialog-body" id="bmWizardBody">
        <section id="bmWizardStep1" class="bm-wizard-cols">
          <div class="bm-wizard-panel"><div class="bm-wizard-label">選擇主題 <small>可多選</small></div><div id="bmEditThemeList" class="bm-theme-checklist"></div><div id="bmThemeWarning" class="bm-theme-warning" role="status" aria-live="polite" hidden>⚠ 尚未選擇主題。請至少勾選一個主題，或在下方建立新主題。</div>
            <div class="bm-wizard-add-theme"><input id="bmNewThemeName" placeholder="輸入新主題名稱"><button type="button" id="bmNewThemeBtn">＋ 新增</button></div><small>新增主題後自動勾選；儲存書籤時才會寫入。</small></div>
          <div class="bm-wizard-panel"><div class="bm-wizard-label">自訂圖案</div><div id="bmPasteArea" class="bm-paste-area" tabindex="0">Ctrl+V 貼上圖片，或點擊選擇檔案</div><input id="bmThumbFile" type="file" accept="image/*" hidden><div class="bm-field"><label>圖片網址（選填）</label><input id="bmImageUrl" type="url" placeholder="https://example.com/image.png"></div><small>若未設定圖案，網址模式可使用自動擷取。</small></div>
        </section>
        <section id="bmWizardStep2" hidden>
          <div class="bm-field"><label>類型</label><div class="bm-type-toggle"><button type="button" id="bmTypeUrl">網址</button><button type="button" id="bmTypeNote">筆記</button></div></div>
          <div class="bm-field"><label>標題</label><input id="bmEditTitleInput" placeholder="輸入書籤標題"></div>
          <div class="bm-field" id="bmUrlField"><label>網址 URL</label><div class="bm-url-row"><input id="bmEditUrl" placeholder="https://example.com"><button type="button" class="bm-fetch-btn" id="bmFetchBtn">自動擷取</button></div></div>
          <div id="bmNoteField"><div class="bm-field"><label>Notion 原始網址（用於內部連結比對，選填）</label><input id="bmEditNotionUrl" placeholder="https://www.notion.so/..."></div>
            <div class="bm-field"><label>程式碼語法高亮</label><select id="bmEditCodeLang"><option value="auto">Auto（自動偵測）</option><option value="javascript">JavaScript</option><option value="css">CSS</option><option value="csharp">C#</option><option value="bash">WSL / Bash</option><option value="python">Python</option><option value="markdown">Markdown</option><option value="html">HTML</option><option value="json">JSON</option><option value="sql">SQL</option><option value="typescript">TypeScript</option><option value="xml">XML</option><option value="yaml">YAML</option><option value="ini">Config / INI</option><option value="plaintext">純文字（不高亮）</option></select></div>
            <div class="bm-field"><label>筆記內容（支援 Markdown）</label><textarea id="bmEditContent" rows="13" placeholder="貼上 Notion 筆記或 Markdown 內容..."></textarea></div></div>
        </section>
      </div><footer class="app-dialog-footer"><button type="button" class="btn-reset" id="bmWizardBack">取消</button><button type="button" class="btn-confirm" id="bmWizardNext">下一步 →</button></footer>
    </div>`;
    document.body.appendChild(el);
    this.root = el;
    this.$ = id => el.querySelector('#' + id);
    this.step = 1; this.pendingThemes = []; this.thumbnail = null; this.id = null; this.type = 'url'; this.dirty = false;
    this.$('bmEditCloseBtn').onclick = () => this.close();
    el.addEventListener('click', e => { if (e.target === el) this.close(); });
    el.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    el.addEventListener('input', () => { this.dirty = true; });
    el.addEventListener('change', () => { this.dirty = true; });
    this.$('bmWizardBack').onclick = () => { if (this.step === 2) this.showStep(1); else this.close(); };
    this.$('bmWizardNext').onclick = () => { if (this.step === 1) { if (!this.updateThemeWarning(false)) return; this.showStep(2); } else this.save(); };
    this.$('bmTypeUrl').onclick = () => this.setType('url');
    this.$('bmTypeNote').onclick = () => this.setType('note');
    this.$('bmNewThemeBtn').onclick = () => this.addTheme();
    this.$('bmEditThemeList').addEventListener('change', () => this.updateThemeWarning(false));
    this.$('bmNewThemeName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.addTheme(); } });
    this.$('bmPasteArea').onclick = () => this.$('bmThumbFile').click();
    this.$('bmThumbFile').onchange = e => { this.readFile(e.target.files[0]); e.target.value = ''; };
    this.$('bmPasteArea').addEventListener('paste', e => this.handlePaste(e));
    el.addEventListener('paste', e => { if (this.step === 1 && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) this.handlePaste(e); });
    this.$('bmImageUrl').onchange = () => { const v = this.$('bmImageUrl').value.trim(); if (v) { this.thumbnail = v; this.showThumb(); } };
    this.$('bmFetchBtn').onclick = () => this.fetchInfo();
  },
  toast(msg) { if (typeof showToast === 'function') showToast(msg); else alert(msg); },
  showStep(n) {
    this.step = n;
    this.$('bmWizardStep1').hidden = n !== 1;
    this.$('bmWizardStep2').hidden = n !== 2;
    this.$('bmWizardSubtitle').textContent = `步驟 ${n} / 2`;
    this.$('bmWizardStepLabel').textContent = n === 1 ? '選擇主題與自訂圖案' : '填寫書籤內容';
    this.$('bmWizardBody').scrollTop = 0;
    this.$('bmWizardBack').textContent = n === 1 ? '取消' : '← 上一步';
    this.$('bmWizardNext').textContent = n === 1 ? '下一步 →' : (this.id ? '儲存變更' : '儲存書籤');
    this.root.classList.toggle('bm-step-two', n === 2);
    this.updateThemeWarning(false);
    this.root.querySelector('.bm-wizard-progress').setAttribute('aria-valuenow', n === 1 ? '50' : '100');
  },
  setType(type) {
    this.type = type;
    this.$('bmTypeUrl').classList.toggle('active', type === 'url');
    this.$('bmTypeNote').classList.toggle('active', type === 'note');
    this.$('bmUrlField').hidden = type !== 'url';
    this.$('bmNoteField').hidden = type !== 'note';
    this.dirty = true;
  },
  renderThemes(checked) {
    const list = this.$('bmEditThemeList'); list.replaceChildren();
    const themes = [...window.plugins['bookmark-data'].get().themes, ...this.pendingThemes];
    themes.filter(t => t.id !== 'all').forEach(t => {
      const label = document.createElement('label'); label.className = 'bm-theme-check-item';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = t.id; cb.checked = checked.includes(t.id);
      label.append(cb, document.createTextNode((t.icon ? t.icon + ' ' : '') + t.name)); list.append(label);
    });
    if (!list.children.length) { const p = document.createElement('small'); p.textContent = '尚無主題，可在下方建立'; list.append(p); }
  },
  updateThemeWarning(showIfEmpty) {
    const hasTheme = this.checkedThemes().length > 0;
    // No warning is necessary: the disabled Next button conveys the requirement.
    this.$('bmThemeWarning').hidden = true;
    this.$('bmEditThemeList').classList.remove('bm-theme-required');
    const next = this.$('bmWizardNext');
    next.disabled = this.step === 1 && !hasTheme;
    next.title = next.disabled ? '請先選擇或新增至少一個主題' : '';
    return hasTheme;
  },
  addTheme() {
    const name = this.$('bmNewThemeName').value.trim(); if (!name) return;
    const data = window.plugins['bookmark-data'].get();
    if ([...data.themes, ...this.pendingThemes].some(t => t.name === name)) { this.toast('主題名稱已存在'); return; }
    const selected = this.checkedThemes();
    const t = { id: 'theme_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name, icon: '📌' };
    this.pendingThemes.push(t); this.renderThemes([...selected, t.id]); this.updateThemeWarning(false); this.$('bmNewThemeName').value = ''; this.dirty = true;
  },
  checkedThemes() { return [...this.$('bmEditThemeList').querySelectorAll('input:checked')].map(c => c.value); },
  showThumb() {
    const area = this.$('bmPasteArea'); area.replaceChildren();
    if (!this.thumbnail) { area.textContent = 'Ctrl+V 貼上圖片，或點擊選擇檔案'; return; }
    const img = document.createElement('img'); img.src = this.thumbnail; img.alt = '縮圖預覽';
    img.onerror = () => { area.textContent = '圖片無法預覽，點擊可重新選擇'; }; area.append(img);
  },
  readFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader(); reader.onload = () => {
      const img = new Image(); img.onload = () => {
        const canvas = document.createElement('canvas'); const scale = Math.min(1, 420 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        this.thumbnail = canvas.toDataURL('image/jpeg', .82); this.$('bmImageUrl').value = ''; this.showThumb(); this.dirty = true;
      }; img.src = reader.result;
    }; reader.readAsDataURL(file);
  },
  handlePaste(e) { const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (item) { e.preventDefault(); e.stopPropagation(); this.readFile(item.getAsFile()); } },
  async fetchInfo() {
    let url = this.$('bmEditUrl').value.trim(); if (!url) { this.toast('請先輸入 URL'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    this.$('bmEditUrl').value = url; const btn = this.$('bmFetchBtn'); btn.disabled = true; btn.textContent = '擷取中...';
    try {
      const res = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url)); const json = await res.json();
      if (json.status !== 'success' || !json.data) throw new Error('no data');
      if (json.data.title && !this.$('bmEditTitleInput').value) this.$('bmEditTitleInput').value = json.data.title;
      if (json.data.image?.url && !this.thumbnail) {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { try { const canvas = document.createElement('canvas'); const scale = Math.min(1, 420 / Math.max(img.width, img.height)); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); this.thumbnail = canvas.toDataURL('image/jpeg', .82); this.showThumb(); } catch (_) {} };
        img.src = json.data.image.url;
      }
      this.dirty = true; this.toast('已擷取網站資訊');
    } catch (_) { this.toast('擷取失敗，請手動輸入'); }
    finally { btn.disabled = false; btn.textContent = '自動擷取'; }
  },
  open(options = {}) {
    if (!this.root) this.load();
    const fav = options.id ? window.plugins['bookmark-data'].get().favorites.find(f => f.id === options.id) : null;
    if (options.id && !fav) return;
    this.id = fav?.id || null; this.pendingThemes = []; this.thumbnail = fav?.thumbnail || null;
    this.$('bmEditTitle').textContent = fav ? '編輯書籤' : '新增書籤';
    this.$('bmEditHeaderSubtitle').textContent = fav ? '修改書籤內容與所屬主題' : '選擇主題並建立書籤';
    this.$('bmEditTitleInput').value = fav?.title || '';
    this.$('bmEditUrl').value = fav?.url || '';
    this.$('bmEditContent').value = fav?.content || '';
    this.$('bmEditNotionUrl').value = fav?.notionUrl || '';
    this.$('bmEditCodeLang').value = fav?.codeLang || 'auto';
    this.$('bmImageUrl').value = this.thumbnail && !this.thumbnail.startsWith('data:') ? this.thumbnail : '';
    const current = window.bmGetCurrentThemeId?.();
    this.renderThemes(fav?.themeIds || (current && current !== 'all' ? [current] : []));
    this.updateThemeWarning(false);
    this.showThumb(); this.setType(fav?.content ? 'note' : 'url'); this.showStep(1); this.dirty = false;
    this.root.showModal();
  },
  close() {
    const done = () => { this.root.close(); this.dirty = false; };
    if (this.dirty && typeof confirmLeave === 'function') confirmLeave(true, done);
    else if (this.dirty && !confirm('放棄尚未儲存的修改？')) return;
    else done();
  },
  async save() {
    const submit = this.$('bmWizardNext');
    if (submit.disabled) return;
    if (!this.updateThemeWarning(true)) {
      this.showStep(1);
      this.updateThemeWarning(true);
      this.$('bmEditThemeList').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.toast('請至少選擇一個主題，或建立新主題');
      return;
    }
    let title = this.$('bmEditTitleInput').value.trim(); let url = ''; let content = null;
    if (this.type === 'url') { url = this.$('bmEditUrl').value.trim(); if (!url) { this.toast('請輸入 URL'); return; } if (!/^https?:\/\//i.test(url)) url = 'https://' + url; if (!title) title = url; }
    else { content = this.$('bmEditContent').value; if (!content && !title) { this.toast('請輸入筆記內容或標題'); return; } if (!title) title = content.split('\n')[0].replace(/^#+\s*/, '').slice(0,30) || '未命名筆記'; }
    const notionUrl = this.type === 'note' ? this.$('bmEditNotionUrl').value.trim() : '';
    const notionId = window.bmExtractNotionId?.(notionUrl) || undefined;
    if (content) content = window.bmReplaceNotionLinks?.(content, notionId) || content;
    submit.disabled = true;
    try {
      await window.plugins['bookmark-data'].save({ id: this.id, title, url, content, thumbnail: this.thumbnail, themeIds: this.checkedThemes(), notionUrl: notionUrl || undefined, notionId, codeLang: this.type === 'note' ? this.$('bmEditCodeLang').value : undefined, newThemes: this.pendingThemes });
    } catch (error) {
      this.toast('書籤未儲存：' + error.message);
      return;
    } finally {
      submit.disabled = false;
    }
    this.dirty = false; this.root.close(); this.toast(this.id ? '書籤已更新' : '書籤已新增');
  }
});
