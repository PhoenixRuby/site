/* =============================================
   NiceScroll
   ============================================= */
class NiceScroll {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!this.container) return;
    this.options = Object.assign({ smoothScroll: true }, options);
    this.velocity = 0;
    this.isScrolling = false;
    this.events = new AbortController();
    this.setupContainer();
    this.createScrollbar();
    this.addEvents();
  }
  destroy() {
    if (!this.events || this.events.signal.aborted) return;
    this.events.abort();
    this.scrollbar.remove();
    this.container.classList.remove('nice-scroll-container');
    this.velocity = 0;
    this.isScrolling = false;
  }
  setupContainer() {
    this.container.classList.add('nice-scroll-container');
  }
  createScrollbar() {
    this.scrollbar = document.createElement('div');
    this.scrollbar.classList.add('nice-scrollbar');
    if (this.options.cursorWidth) this.scrollbar.style.width = this.options.cursorWidth;
    if (this.options.cursorColor) this.scrollbar.style.background = this.options.cursorColor;
    if (this.options.cursorBorderRadius) this.scrollbar.style.borderRadius = this.options.cursorBorderRadius;
    if (this.options.zIndex) this.scrollbar.style.zIndex = this.options.zIndex;
    if (this.container === document.documentElement) {
      document.body.appendChild(this.scrollbar);
    } else {
      this.container.appendChild(this.scrollbar);
    }
    this.updateScrollbar();
  }
  updateScrollbar() {
    var contentHeight = this.container.scrollHeight;
    var visibleHeight = this.container === document.documentElement ? window.innerHeight : this.container.clientHeight;
    var scrollbarHeight = Math.max((visibleHeight / contentHeight) * visibleHeight, 30);
    if (contentHeight > visibleHeight) {
      this.scrollbar.style.height = scrollbarHeight + 'px';
      this.scrollbar.style.display = 'block';
    } else {
      this.scrollbar.style.display = 'none';
    }
    this.syncScrollbarPosition();
  }
  syncScrollbarPosition() {
    var contentHeight = this.container.scrollHeight;
    var visibleHeight = this.container === document.documentElement ? window.innerHeight : this.container.clientHeight;
    var scrollRatio = this.container.scrollTop / Math.max(1, contentHeight - visibleHeight);
    var scrollbarMaxTop = visibleHeight - this.scrollbar.clientHeight;
    this.scrollbar.style.top = (this.container.scrollTop + scrollRatio * scrollbarMaxTop) + 'px';
    if (this.container !== document.documentElement) {
      this.scrollbar.style.transform = 'translateX(' + this.container.scrollLeft + 'px)';
    }
  }
  addEvents() {
    var self = this;
    var isDragging = false;
    var startY, startScrollTop, animationFrame, scrollTimeout;
    var isHtml = this.container === document.documentElement;
    var scrollEl = isHtml ? window : this.container;
    var signal = this.events.signal;

    var hideTimeout;
    var scrollHandler = function() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(function() { self.syncScrollbarPosition(); });
      self.scrollbar.style.opacity = '1';
      self.scrollbar.setAttribute('data-scroll', 'mousedown');
      clearTimeout(scrollTimeout);
      clearTimeout(hideTimeout);
      scrollTimeout = setTimeout(function() {
        self.scrollbar.removeAttribute('data-scroll');
        hideTimeout = setTimeout(function() { self.scrollbar.style.opacity = ''; }, 600);
      }, 150);
    };
    scrollEl.addEventListener('scroll', scrollHandler, { signal });
    if (isHtml) document.addEventListener('scroll', scrollHandler, { signal });

    var wheelHandler = function(e) {
      if (!self.options.smoothScroll || e.defaultPrevented || !e.cancelable ||
          e.ctrlKey || e.metaKey || e.shiftKey ||
          !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // A nested scrollable element owns its wheel events.
      var el = e.target instanceof Element ? e.target : e.target?.parentElement;
      while (el && el !== self.container) {
        var overflow = window.getComputedStyle(el).overflowY;
        if (el.scrollHeight > el.clientHeight && /^(auto|scroll|overlay)$/.test(overflow)) return;
        el = el.parentElement;
      }
      if (el !== self.container) return;

      var viewportStyle = window.getComputedStyle(self.container);
      var overflow = viewportStyle.overflowY;
      if (overflow === 'hidden' || overflow === 'clip') return;
      if (isHtml && overflow === 'visible' &&
          /^(hidden|clip)$/.test(window.getComputedStyle(document.body).overflowY)) return;

      var height = isHtml ? window.innerHeight : self.container.clientHeight;
      var maxTop = Math.max(0, self.container.scrollHeight - height);
      var top = self.container.scrollTop;
      if (maxTop === 0 || (e.deltaY < 0 ? top <= 0 : top >= maxTop - 0.5)) return;

      var lineHeight = parseFloat(viewportStyle.lineHeight) || 16;
      var unit = e.deltaMode === 1 ? lineHeight : e.deltaMode === 2 ? height : 1;
      e.preventDefault();
      var distance = e.deltaY * unit;
      if (self.velocity * distance < 0) self.velocity = 0;
      self.velocity += distance;
      if (!self.isScrolling) self.startSmoothScroll();
    };
    scrollEl.addEventListener('wheel', wheelHandler, { passive: false, signal });

    this.scrollbar.addEventListener('mousedown', function(e) {
      isDragging = true;
      startY = e.clientY;
      startScrollTop = isHtml ? window.scrollY : self.container.scrollTop;
      document.body.style.userSelect = 'none';
      self.scrollbar.setAttribute('data-scroll', 'mousedown');
    }, { signal });
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var deltaY = e.clientY - startY;
      var height = isHtml ? window.innerHeight : self.container.clientHeight;
      var contentHeight = self.container.scrollHeight - height;
      var scrollbarMaxTop = height - self.scrollbar.clientHeight;
      if (scrollbarMaxTop <= 0) return;
      var scrollAmount = (deltaY / scrollbarMaxTop) * contentHeight;
      if (isHtml) window.scrollTo(0, startScrollTop + scrollAmount);
      else self.container.scrollTop = startScrollTop + scrollAmount;
    }, { signal });
    function stopDrag() {
      if (isDragging) { isDragging = false; document.body.style.userSelect = ''; self.scrollbar.removeAttribute('data-scroll'); }
    }
    document.addEventListener('mouseup', stopDrag, { signal });
    window.addEventListener('resize', function() { self.updateScrollbar(); }, { signal });
    var observerTarget = self.container === document.documentElement ? document.body : self.container;
    var observer = new MutationObserver(function() { self.updateScrollbar(); });
    observer.observe(observerTarget, { childList: true, subtree: true });
    var resizeObserver = !isHtml && typeof ResizeObserver === 'function'
      ? new ResizeObserver(function() { self.updateScrollbar(); })
      : null;
    resizeObserver?.observe(self.container);
    signal.addEventListener('abort', function() {
      stopDrag();
      cancelAnimationFrame(animationFrame);
      clearTimeout(scrollTimeout);
      clearTimeout(hideTimeout);
      observer.disconnect();
      resizeObserver?.disconnect();
    }, { once: true });
  }
  startSmoothScroll() {
    const container = this.container;
    const isHtml = container === document.documentElement;
    const glideTime = 115;

    this.isScrolling = true;
    let previousTime = performance.now();
    let lastScrollTop = container.scrollTop;
    let position = lastScrollTop;

    const step = time => {
      if (this.events.signal.aborted) return;
      const elapsed = Math.max(0, time - previousTime);
      previousTime = time;
      if (elapsed === 0) {
        requestAnimationFrame(step);
        return;
      }

      const height = isHtml ? window.innerHeight : container.clientHeight;
      const maxTop = Math.max(0, container.scrollHeight - height);
      if (container.scrollTop !== lastScrollTop) position = container.scrollTop;

      const remaining = this.velocity;
      const distance = Math.abs(remaining) <= 1
        ? remaining
        : remaining * (1 - Math.exp(-elapsed / glideTime));
      position = Math.max(0, Math.min(maxTop, position + distance));
      container.scrollTo({ top: position, behavior: 'instant' });
      lastScrollTop = container.scrollTop;

      this.velocity -= distance;
      if (position <= 0 || position >= maxTop || this.velocity === 0) {
        this.velocity = 0;
        this.isScrolling = false;
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
