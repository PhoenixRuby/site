/* Optional HTML helper only. No SVG nodes or sprites are inserted into the DOM. */
(function (global) {
  'use strict';
  const generatedColors = new Set();
  const safeName = /^[A-Za-z][A-Za-z0-9_-]*$/;
  const safeHex = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  function resolveIcon(value, color = null) {
    if (typeof value !== 'string') return '';
    const icon = value.trim();
    if (!icon) return '';
    // Trusted legacy HTML (including <svg>) is passed through during migration.
    if (icon.startsWith('<')) return value;
    // Accept legacy 'color:name' calls, but output the unified data-svgicon.
    const name = icon.startsWith('color:') ? icon.slice(6) : icon;
    if (!safeName.test(name)) { console.warn('[Icon] Invalid name:', icon); return ''; }
    let attr = '';
    if (typeof color === 'string') {
      const c = color.trim();
      if (safeHex.test(c)) {
        const hex = c.toLowerCase();
        if (!generatedColors.has(hex)) {
          const style = document.createElement('style');
          style.textContent = `[data-svgicon][data-svgcolor="${hex}"]{color:${hex}}`;
          document.head.appendChild(style);
          generatedColors.add(hex);
        }
        attr = ` data-svgcolor="${hex}"`;
      } else if (safeName.test(c)) {
        attr = ` data-svgcolor="${c}"`;
      } else if (c) {
        console.warn('[Icon] Unsupported color:', c);
      }
    }
    return `<span data-svgicon="${name}"${attr}></span>`;
  }
  global.resolveIcon = resolveIcon;
})(window);
