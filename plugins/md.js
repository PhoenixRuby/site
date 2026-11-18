(() => {
  'use strict';

  function loadMarkdown(dataUrl, dataKey) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = dataUrl.href;
      script.onload = () => {
        script.remove();
        resolve(globalThis[dataKey]);
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('無法載入 ' + dataUrl.href));
      };
      document.head.appendChild(script);
    });
  }

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function renderMarkdown(text) {
    try {
      return await markdown(text);
    } catch (error) {
      console.error('Markdown 渲染失敗:', error);
      return element('pre', text);
    }
  }

  async function renderSection({ text, heading }, sectionClass, headingClass) {
    const section = element('section');
    section.className = sectionClass;
    if (heading) {
      const title = element('h2', heading);
      title.className = headingClass;
      section.append(title);
    }
    const content = element('div');
    content.className = 'about-md';
    section.append(content);

    // Render the Markdown inside each disclosure with the shared renderer.
    const parts = text.split(/^<details>[ \t]*\n<summary>([^\n]*?)<\/summary>[ \t]*\n([\s\S]*?)^<\/details>[ \t]*$/gm);
    for (let index = 0; index < parts.length; index += 3) {
      const body = parts[index].trim();
      if (body) content.append(await renderMarkdown(body));
      if (index + 1 >= parts.length) break;

      const details = element('details');
      const summary = element('summary');
      const action = element('span');
      action.className = 'viewer-help-details-action';
      action.setAttribute('aria-hidden', 'true');
      action.append(element('span', '展開說明'), element('span', '收合說明'));
      summary.append(element('span', parts[index + 1]), action);
      details.append(summary, await renderMarkdown(parts[index + 2].trim()));
      content.append(details);
    }
    return section;
  }

  function splitByHeading(text) {
    const parts = text.replace(/\r\n?/g, '\n').split(/^##[ \t]+([^\n]+)$/m);
    if (parts.length < 3) throw new Error('找不到 Markdown 章節');

    const sections = [];
    for (let index = 1; index < parts.length; index += 2) {
      const title = parts[index].trim();
      sections.push({ title, heading: title, text: parts[index + 1] });
    }
    const [title, ...intro] = parts[0].trim().split('\n');
    return { title: title.replace(/^#[ \t]+/, ''), subtitle: intro.join('\n').trim(), sections };
  }

  function create(options) {
    const {
      id, icon, title, subtitle, dataUrl, dataKey,
      dialogClass, contentClass, sectionClass = 'global-about-section',
      headingClass = '',
      searchLabel = '搜尋說明', placeholder = searchLabel,
      parse = splitByHeading
    } = options;
    const helpWrap = document.createElement('div');
    helpWrap.innerHTML = `
      <dialog class="app-dialog md-dialog">
        <div class="global-about-modal app-dialog-panel-medium">
          <header class="app-modal-header">
            <span class="app-modal-header-icon" aria-hidden="true"></span>
            <div class="app-modal-header-info">
              <h2 class="app-modal-header-title"></h2>
              <p class="app-modal-header-subtitle"></p>
            </div>
            <button type="button" class="app-modal-header-close" data-md-close aria-label="關閉">✕</button>
          </header>
          <div class="app-dialog-body global-about-split">
            <nav class="global-about-toc" aria-label="章節"></nav>
            <div class="md-content">
              <div class="md-search" role="search">
                <input type="search" autocomplete="off">
                <span class="md-search-count" role="status"></span>
              </div>
              <div class="global-about-body md-body" tabindex="0">
                <p class="md-search-empty" hidden>找不到符合的說明。</p>
                <p class="md-load-status" role="status" hidden></p>
                <article class="md-sections"></article>
              </div>
            </div>
          </div>
          <footer class="app-dialog-footer">
            <button type="button" class="btn-confirm" data-md-close>關閉</button>
          </footer>
        </div>
      </dialog>`;

    const dialog = helpWrap.firstElementChild;
    dialog.id = id;
    if (dialogClass) dialog.classList.add(dialogClass);
    if (contentClass) dialog.querySelector('.md-content').classList.add(contentClass);
    const heading = dialog.querySelector('.app-modal-header-title');
    const description = dialog.querySelector('.app-modal-header-subtitle');
    heading.id = id + '-title';
    description.id = id + '-subtitle';
    heading.textContent = title;
    description.textContent = subtitle;
    dialog.setAttribute('aria-labelledby', heading.id);
    dialog.setAttribute('aria-describedby', description.id);
    dialog.querySelector('.app-modal-header-icon').innerHTML = resolveIcon(icon);
    document.body.appendChild(dialog);
    const body = dialog.querySelector('.global-about-body');
    const toc = dialog.querySelector('.global-about-toc');
    const article = body.querySelector('.md-sections');
    const status = body.querySelector('.md-load-status');
    let sections = [];
    let tocItems = [];
    let loading = null;
    const search = dialog.querySelector('.md-search input');
    const resultCount = dialog.querySelector('.md-search-count');
    const empty = dialog.querySelector('.md-search-empty');
    search.setAttribute('aria-label', searchLabel);
    search.placeholder = placeholder;
    function createTocItem(section, label) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'global-about-toc-item';
      button.textContent = label;
      button.addEventListener('click', () => {
        const top = body.scrollTop + section.getBoundingClientRect().top - body.getBoundingClientRect().top;
        body.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        body.focus({ preventScroll: true });
      });
      return button;
    }

    let frame = 0;
    function updateActive() {
      frame = 0;
      const visible = sections.filter(section => !section.hidden);
      const { scrollTop, scrollHeight, clientHeight } = body;
      const line = body.getBoundingClientRect().top + clientHeight * 0.25;
      let active = visible[0];
      if (scrollTop > 5) {
        if (scrollHeight - scrollTop - clientHeight <= 5) active = visible.at(-1);
        else active = visible.findLast(section => section.getBoundingClientRect().top <= line) || active;
      }
      tocItems.forEach((button, index) => {
        const selected = sections[index] === active;
        button.classList.toggle('on', selected);
        if (selected) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
      });
    }

    const expandedBeforeSearch = new Map();
    function filterSections() {
      const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let matches = 0;
      sections.forEach((section, index) => {
        const text = (tocItems[index].textContent + ' ' + section.textContent).toLocaleLowerCase();
        const visible = terms.every(term => text.includes(term));
        section.hidden = tocItems[index].hidden = !visible;
        if (visible) matches++;
        for (const details of section.querySelectorAll('details')) {
          if (!terms.length) {
            if (expandedBeforeSearch.has(details)) details.open = expandedBeforeSearch.get(details);
            continue;
          }
          if (!expandedBeforeSearch.has(details)) expandedBeforeSearch.set(details, details.open);
          const detailText = details.textContent.toLocaleLowerCase();
          details.open = expandedBeforeSearch.get(details) || (visible && terms.some(term => detailText.includes(term)));
        }
      });
      if (!terms.length) expandedBeforeSearch.clear();
      empty.hidden = matches > 0;
      resultCount.textContent = terms.length ? matches + ' 個相關章節' : '';
      body.scrollTop = 0;
      updateActive();
    }
    search.addEventListener('input', filterSections);
    search.addEventListener('search', filterSections);
    body.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(updateActive);
    }, { passive: true });

    async function loadContent() {
      search.disabled = true;
      empty.hidden = true;
      status.hidden = false;
      status.textContent = '正在載入說明…';
      try {
        const data = await loadMarkdown(dataUrl, dataKey);
        if (typeof data !== 'string') throw new Error('找不到 ' + dataKey + ' 資料');
        const documentData = parse(data);
        const renderedSections = await Promise.all(documentData.sections.map(
          section => renderSection(section, sectionClass, headingClass)
        ));
        const renderedToc = renderedSections.map(
          (section, index) => createTocItem(section, documentData.sections[index].title)
        );
        if (documentData.title) heading.textContent = documentData.title;
        if (documentData.subtitle) description.textContent = documentData.subtitle;
        article.replaceChildren(...renderedSections);
        toc.replaceChildren(...renderedToc);
        sections = renderedSections;
        tocItems = renderedToc;
        status.hidden = true;
        search.disabled = false;
        if (dialog.open) filterSections();
      } catch (error) {
        console.error(id + ': 無法載入說明', error);
        status.textContent = '無法載入說明。請關閉視窗後重新開啟。';
      } finally {
        loading = null;
      }
    }

    function open() {
      if (dialog.open) return;
      ModalManager.showDialog(dialog, close);
      search.value = '';
      if (sections.length) filterSections();
      else if (!loading) loading = loadContent();
    }
    function close() {
      ModalManager.closeDialog(dialog);
    }

    dialog.querySelectorAll('[data-md-close]').forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    return { open, close };
  }

  globalThis.MdDialog = { create };
})();
