(() => {
  'use strict';

  const source = document.currentScript?.src || new URL('plugins/about.js', document.baseURI);

  function splitAboutMarkdown(text) {
    const documents = text.split(/^---[ \t]*\r?\n(?:[ \t]*\r?\n)*(?=# (?:CLAUDE\.md|ARCHITECTURE\.md)\b)/m);
    if (documents.length !== 3 ||
        !documents[1].startsWith('# CLAUDE.md') ||
        !documents[2].startsWith('# ARCHITECTURE.md')) {
      throw new Error('about: about.md 缺少 Claude 指引或架構藍圖的文件標題');
    }
    const titles = ['關於', 'Claude 指引', '架構藍圖'];
    return {
      sections: documents.map((text, index) => ({
        title: titles[index],
        heading: index ? titles[index] : '',
        text: text.trim()
      }))
    };
  }

  registerPlugin('about', {
    main: false,
    menuOrder: null,
    menuIcon: null,
    mode: null,
    icon: 'about',
    label: '關於',
    order: 20,
    toolbarPosition: 'bottom',
    initialized: false,
    open: null,
    close: null,
    render: null,
    async load() {
      if (this.initialized) return;
      await loadPluginCss('about');
      this.init();
      this.initialized = true;
    },
    init() {
      Object.assign(this, MdDialog.create({
        id: 'aboutBg',
        icon: this.icon,
        title: '關於此工具',
        subtitle: '查看工具介紹、使用指引與架構藍圖。',
        searchLabel: '搜尋關於內容',
        dataUrl: new URL('../md/generated/about-data.js', source),
        dataKey: 'aboutMarkdown',
        headingClass: 'global-about-section-title',
        parse: splitAboutMarkdown
      }));
    }
  });
})();
