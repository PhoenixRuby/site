(function() {
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  root.setAttribute('data-theme', localStorage.getItem('appTheme') || 'system');

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.id = 'hljs-theme';

  function updateHighlightTheme() {
    const theme = root.getAttribute('data-theme');
    const dark = theme === 'dark' || (theme !== 'light' && systemTheme.matches);
    const href = 'libs/atom-one-' + (dark ? 'dark' : 'light') + '.min.css';
    if (stylesheet.getAttribute('href') !== href) stylesheet.href = href;
  }

  updateHighlightTheme();
  document.head.append(stylesheet);
  new MutationObserver(updateHighlightTheme).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  systemTheme.addEventListener('change', updateHighlightTheme);
})();
