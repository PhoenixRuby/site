/* Shared presentation shell. Storage, identity, archiving and content belong to each mode. */
const GuestDiffPanel = (() => {
  let dialogId = 0;
  const pinMarkup = (prefix = 'guest-diff') => `<div class="guest-diff-pin-options ${prefix}-pin-options">
    <label class="${prefix}-pin"><input type="checkbox" role="switch"> 釘選以歸檔</label>
    <label class="${prefix}-keep" hidden><input type="checkbox" role="switch" checked> 歸檔後保留訪客原檔</label>
  </div>`;

  function createShell({ mode, noun, prefix = mode + '-guest', sideClass = prefix + '-side', sideHTML = '', archive = false }) {
    const panel = document.createElement('section');
    const titleId = mode + 'GuestTitle';
    const sideId = mode + 'GuestSide';
    panel.className = `guest-diff-panel ${prefix}-panel`;
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', titleId);
    panel.innerHTML = `<div class="guest-diff-divider ${prefix}-divider" role="separator" tabindex="0"
        aria-label="調整上下區域比例" aria-controls="app-content" aria-orientation="horizontal" aria-valuemin="22" aria-valuemax="70" aria-valuenow="46"></div>
      <header class="app-modal-header guest-diff-header ${prefix}-header">
        <div class="guest-diff-heading ${prefix}-heading">
          <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('compare')}</span>
          <div class="app-modal-header-info"><h2 class="app-modal-header-title" id="${titleId}">發現訪客未歸檔項目</h2>
            <p class="app-modal-header-subtitle">釘選要歸檔的${noun}</p></div>
        </div>
        <div class="guest-diff-actions ${prefix}-actions"><div class="guest-diff-filters ${prefix}-filters" role="group" aria-label="篩選未歸檔${noun}">
          <button type="button" data-filter="all">全部 <span>0</span></button>
          <button type="button" data-filter="selected">已釘選 <span>0</span></button>
          <button type="button" data-filter="unselected">未釘選 <span>0</span></button>
        </div></div>
        <div class="guest-diff-header-controls ${prefix}-header-controls">
          ${archive ? '<button type="button" data-archive hidden>歸檔至本機</button>' : ''}
          <button type="button" class="${prefix}-upload" data-upload hidden>上傳至雲端</button>
          <button type="button" class="app-modal-header-close" aria-label="關閉訪客差異">×</button>
        </div>
      </header>
      <div class="guest-diff-split ${prefix}-split">
        <div class="guest-diff-list ${prefix}-list"><div class="${prefix}-grid"></div><p class="${prefix}-empty" data-empty hidden>這個篩選下沒有${noun}。</p></div>
        <div class="guest-diff-side-divider ${prefix}-side-divider" role="separator" tabindex="0"
          aria-label="調整右側明細寬度" aria-controls="${sideId}" aria-orientation="vertical" aria-valuemin="26" aria-valuemax="55" aria-valuenow="33"></div>
        <div class="guest-diff-side ${sideClass}" id="${sideId}" hidden>${sideHTML}</div>
      </div>`;
    return { panel, list: panel.querySelector('.guest-diff-list'), split: panel.querySelector('.guest-diff-split'),
      side: panel.querySelector('.guest-diff-side'), divider: panel.querySelector('.guest-diff-divider'),
      sideDivider: panel.querySelector('.guest-diff-side-divider') };
  }

  class Controller {
    constructor(options) {
      Object.assign(this, options);
      this.opened = false;
      this.closing = false;
      this.upperShare = 46;
      this.sideShare = 100 / 3;
      this.scrolls = new Map();
      this.events = new AbortController();
      const { signal } = this.events;
      this.panel.querySelector('.app-modal-header-close').addEventListener('click', () => this.close(), { signal });
      this.bindDivider(this.divider, 'upper');
      this.bindDivider(this.sideDivider, 'side');
      this.modeObserver = new MutationObserver(() => {
        if (window.viewMode !== this.mode) {
          this.cancelAnimations();
          if (this.closing) { this.closing = false; this.opened = false; }
          this.layout(false);
          this.onModeExit?.();
        } else if (this.opened) this.layout(true);
      });
      this.modeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-view-mode'] });
      document.addEventListener('wheel', event => {
        if (!this.opened || this.panel.hidden || window.viewMode !== this.mode || event.ctrlKey || event.metaKey ||
            event.shiftKey || event.defaultPrevented || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
            event.target.closest?.('dialog, [role="dialog"]')) return;
        event.stopPropagation();
      }, { passive: true, signal });
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || event.defaultPrevented || !this.opened || window.viewMode !== this.mode ||
            document.querySelector('dialog[open]')) return;
        if (this.onEscape?.()) return;
        if (event.target.closest?.('[role="menu"]')) return;
        event.preventDefault(); this.close();
      }, { signal });
    }
    get wrapper() { return document.getElementById('app-content'); }
    get listScroll() { return this.scrolls.get(this.list); }
    get animating() { return Boolean(this.panelAnimation); }
    motion() { return !matchMedia('(prefers-reduced-motion: reduce)').matches; }
    layout(visible) {
      visible = visible && window.viewMode === this.mode && (this.isAvailable?.() ?? true);
      const wrapper = this.wrapper;
      if (!this.panel.isConnected) wrapper.after(this.panel);
      this.panel.hidden = !visible;
      if (this.compareClass) wrapper.classList.toggle(this.compareClass, visible);
      if (visible) {
        wrapper.style.setProperty('--guest-diff-upper', this.upperShare + 'dvh');
        wrapper.dataset.guestDiffMode = this.mode;
        wrapper.classList.add('guest-diff-active');
        this.attachScrolls();
      } else {
        this.cancelAnimations();
        if (wrapper.dataset.guestDiffMode === this.mode) {
          delete wrapper.dataset.guestDiffMode;
          wrapper.classList.remove('guest-diff-active');
        }
        this.destroyScrolls();
      }
    }
    open(render) {
      if (this.isAvailable?.() === false) return;
      const box = this.wrapper.getBoundingClientRect();
      const style = getComputedStyle(this.wrapper);
      const position = { left: box.left + (parseFloat(style.paddingLeft) || 0),
        right: box.right - (parseFloat(style.paddingRight) || 0),
        top: box.top + window.scrollY + (parseFloat(style.paddingTop) || 0) };
      this.opened = true;
      this.layout(true);
      render?.();
      const compare = this.wrapper.getBoundingClientRect();
      for (const [edge, distance] of Object.entries({ left: position.left - compare.left,
        right: compare.right - position.right, top: position.top - compare.top - window.scrollY })) {
        this.wrapper.style.setProperty('--guest-diff-padding-' + edge, Math.max(0, distance) + 'px');
      }
      this.slidePanel(true, () => { this.attachScrolls(); this.onResize?.(); });
    }
    close() {
      if (!this.opened || this.closing) return;
      this.closing = true;
      this.beforeClose?.();
      this.slidePanel(false, () => {
        this.closing = false; this.opened = false; this.layout(false); this.onClose?.();
        window.niceScroll?.updateScrollbar?.();
        if (!this.wrapper.hasAttribute('tabindex')) this.wrapper.tabIndex = -1;
        this.wrapper.focus({ preventScroll: true });
      });
    }
    slidePanel(opening, finish) {
      const box = this.wrapper.getBoundingClientRect();
      const fullHeight = this.panel.getBoundingClientRect().bottom - box.top;
      const from = !opening || this.panelAnimation ? box.height : fullHeight;
      this.panelAnimation?.cancel(); this.panelAnimation = undefined;
      this.destroyScrolls();
      if (!this.motion() || typeof this.wrapper.animate !== 'function') {
        this.panel.classList.remove('is-sliding'); finish(); return;
      }
      this.panel.classList.add('is-sliding');
      const animation = this.wrapper.animate([{ height: from + 'px' }, { height: (opening ? box.height : fullHeight) + 'px' }],
        { duration: 220, easing: 'ease-in-out', fill: 'forwards' });
      this.panelAnimation = animation;
      animation.finished.then(() => {
        if (this.panelAnimation !== animation) return;
        this.panelAnimation = undefined; animation.cancel(); this.panel.classList.remove('is-sliding'); finish();
      }, () => {});
    }
    cancelAnimations() {
      this.panelAnimation?.cancel(); this.sideAnimation?.cancel();
      this.panelAnimation = this.sideAnimation = undefined;
      this.panel.classList.remove('is-sliding');
      if (this.sideVisible === false) {
        this.side.hidden = true; this.split.classList.remove('has-reader'); this.clearSide?.();
      }
    }
    destroyScrolls() {
      for (const scroll of this.scrolls.values()) scroll.destroy();
      this.scrolls.clear();
    }
    destroySideScrolls() {
      for (const target of this.sideScrollTargets?.() ?? []) {
        this.scrolls.get(target)?.destroy(); this.scrolls.delete(target);
      }
    }
    attachScrolls() {
      if (this.panel.hidden || this.panelAnimation || typeof NiceScroll !== 'function') return;
      const targets = [this.wrapper, this.list, ...(!this.side.hidden && !this.sideAnimation ? this.sideScrollTargets?.() ?? [] : [])];
      for (const target of targets) {
        let scroll = this.scrolls.get(target);
        if (scroll && !scroll.scrollbar.isConnected) { scroll.destroy(); scroll = undefined; }
        if (!scroll) { scroll = new NiceScroll(target); this.scrolls.set(target, scroll); }
        scroll.updateScrollbar();
      }
    }
    renderSide(visible, render, { clear = () => {}, animate = true } = {}) {
      this.sideVisible = visible;
      this.clearSide = clear;
      const wasOpen = !this.side.hidden;
      const wasAnimating = Boolean(this.sideAnimation);
      const transform = getComputedStyle(this.side).transform;
      this.sideAnimation?.cancel(); this.sideAnimation = undefined;
      this.destroySideScrolls();
      const finishClose = () => {
        this.side.hidden = true; this.split.classList.remove('has-reader'); clear();
        this.attachScrolls(); this.onResize?.();
      };
      if (!visible) {
        if (!wasOpen || !animate || this.panel.hidden || !this.motion() || typeof this.side.animate !== 'function') { finishClose(); return; }
        this.animateSide([{ transform }, { transform: 'translateX(100%)' }], 'ease-in', finishClose);
        return;
      }
      this.side.hidden = false; this.split.classList.add('has-reader'); render();
      if ((!wasOpen || wasAnimating) && animate && !this.panel.hidden && this.motion() && typeof this.side.animate === 'function') {
        this.animateSide([{ transform: wasOpen ? transform : 'translateX(100%)' }, { transform: 'translateX(0)' }], 'ease-out', () => this.attachScrolls());
      }
      this.attachScrolls();
      if (!wasOpen) this.onResize?.();
    }
    animateSide(frames, easing, finish) {
      const animation = this.side.animate(frames, { duration: 220, easing, fill: 'forwards' });
      this.sideAnimation = animation;
      animation.finished.then(() => {
        if (this.sideAnimation !== animation) return;
        this.sideAnimation = undefined; animation.cancel(); finish();
      }, () => {});
    }
    resizeUpper(value) {
      this.upperShare = Math.round(Math.min(70, Math.max(22, value)));
      this.wrapper.style.setProperty('--guest-diff-upper', this.upperShare + 'dvh');
      this.divider.setAttribute('aria-valuenow', String(this.upperShare));
      this.attachScrolls(); this.onResize?.();
    }
    resizeSide(value) {
      this.sideShare = Math.min(55, Math.max(26, value));
      this.split.style.setProperty('--guest-diff-side-share', String(this.sideShare / 100));
      this.sideDivider.setAttribute('aria-valuenow', String(Math.round(this.sideShare)));
      this.attachScrolls(); this.onResize?.();
    }
    bindDivider(node, kind) {
      let drag;
      const side = kind === 'side';
      const { signal } = this.events;
      node.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        const available = side ? this.split.clientWidth - node.offsetWidth : window.innerHeight;
        if (available <= 0) return;
        event.preventDefault(); node.focus(); node.setPointerCapture(event.pointerId); node.classList.add('is-dragging');
        drag = { id: event.pointerId, position: side ? event.clientX : event.clientY, share: side ? this.sideShare : this.upperShare, available };
      }, { signal });
      node.addEventListener('pointermove', event => {
        if (drag?.id !== event.pointerId) return;
        const delta = ((side ? event.clientX : event.clientY) - drag.position) * 100 / drag.available;
        if (side) this.resizeSide(drag.share - delta); else this.resizeUpper(drag.share + delta);
      }, { signal });
      node.addEventListener('lostpointercapture', event => {
        if (drag?.id !== event.pointerId) return;
        drag = undefined; node.classList.remove('is-dragging');
      }, { signal });
      node.addEventListener('keydown', event => {
        const values = side ? { ArrowLeft: this.sideShare + 4, ArrowRight: this.sideShare - 4, Home: 26, End: 55 }
          : { ArrowUp: this.upperShare - 4, ArrowDown: this.upperShare + 4, Home: 22, End: 70 };
        if (!Object.hasOwn(values, event.key)) return;
        event.preventDefault(); if (side) this.resizeSide(values[event.key]); else this.resizeUpper(values[event.key]);
      }, { signal });
    }
    updateFilters(total, selected, filter) {
      const counts = { all: total, selected, unselected: total - selected };
      for (const button of this.panel.querySelectorAll('[data-filter]')) {
        button.querySelector('span').textContent = counts[button.dataset.filter];
        button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
      }
    }
    destroy() {
      this.opened = false; this.closing = false;
      this.cancelAnimations(); this.layout(false); this.events.abort(); this.modeObserver.disconnect(); this.panel.remove();
    }
  }

  function createDialog({ title, panelClass = '', bodyClass = '', bodyHTML = '', footerHTML = '', icon,
    scroll = false, restoreFocus, onClose }) {
    const dialog = document.createElement('dialog'); dialog.className = 'app-dialog';
    const id = 'guestDiffDialogTitle' + ++dialogId; dialog.setAttribute('aria-labelledby', id);
    dialog.innerHTML = `<section class="app-dialog-panel-medium ${panelClass}">
      <header class="app-modal-header">${icon ? `<span class="app-modal-header-icon" aria-hidden="true">${resolveIcon(icon)}</span>` : ''}
        <h2 class="app-modal-header-title" id="${id}"></h2>
        <button type="button" class="app-modal-header-close" aria-label="關閉">×</button></header>
      <div class="app-dialog-body ${bodyClass}">${bodyHTML}</div>
      <footer class="app-dialog-footer">${footerHTML}<button type="button" class="btn-reset">關閉</button></footer></section>`;
    dialog.querySelector('h2').textContent = title;
    const body = dialog.querySelector('.app-dialog-body');
    let niceScroll;
    const close = () => ModalManager.closeDialog(dialog);
    dialog.querySelector('.app-modal-header-close').onclick = close;
    dialog.querySelector('.btn-reset').onclick = close;
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => {
      niceScroll?.destroy(); dialog.remove(); onClose?.(); restoreFocus?.();
    }, { once: true });
    return { dialog, body, close, updateScroll: () => niceScroll?.updateScrollbar(), show() {
      document.body.append(dialog); ModalManager.showDialog(dialog, close);
      if (scroll && typeof NiceScroll === 'function') {
        body.classList.add('guest-diff-dialog-scroll'); niceScroll = new NiceScroll(body);
      }
    } };
  }

  function createPinControls({ pinned, keep, busy, onPin, onKeep }) {
    const footer = document.createElement('footer'); footer.innerHTML = pinMarkup();
    const pin = footer.querySelector('.guest-diff-pin input');
    const keepLabel = footer.querySelector('.guest-diff-keep');
    const keepInput = keepLabel.querySelector('input');
    pin.checked = pinned; pin.disabled = busy;
    keepLabel.hidden = !pinned; keepInput.checked = keep; keepInput.disabled = busy || !pinned;
    pin.onchange = () => onPin(pin.checked);
    keepInput.onchange = () => onKeep(keepInput.checked);
    return footer;
  }
  return { createShell, create: options => new Controller(options), createDialog, pinMarkup, createPinControls };
})();
