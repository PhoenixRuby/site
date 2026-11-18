/* =============================================
   NiceScroll
   ============================================= */
class NiceScroll {
  constructor(selector, options = {}) {
    this.container = document.querySelector(selector);
    if (!this.container) return;
    this.options = Object.assign({ smoothScroll: true }, options);
    this.velocity = 0;
    this.isScrolling = false;
    this.setupContainer();
    this.createScrollbar();
    this.addEvents();
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
    var scrollRatio = this.container.scrollTop / (contentHeight - visibleHeight);
    var scrollbarMaxTop = visibleHeight - this.scrollbar.clientHeight;
    this.scrollbar.style.top = (this.container.scrollTop + scrollRatio * scrollbarMaxTop) + 'px';
  }
  addEvents() {
    var self = this;
    var isDragging = false;
    var startY, startScrollTop, animationFrame, scrollTimeout;
    var isHtml = this.container === document.documentElement;
    var scrollEl = isHtml ? window : this.container;

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
    if (isHtml) { window.addEventListener('scroll', scrollHandler); document.addEventListener('scroll', scrollHandler); }
    else { scrollEl.addEventListener('scroll', scrollHandler); }

    var wheelHandler = function(e) {
      if (!self.options.smoothScroll) return;
      var el = e.target;
      while (el && el !== document.body) {
        var ov = window.getComputedStyle(el).overflowY;
        if (el.scrollHeight > el.clientHeight && (ov === 'auto' || ov === 'scroll')) return;
        el = el.parentElement;
      }
      self.velocity += e.deltaY * 0.2;
      if (!self.isScrolling) self.startSmoothScroll();
    };
    if (isHtml) { window.addEventListener('wheel', wheelHandler, { passive: false }); document.addEventListener('wheel', wheelHandler, { passive: false }); }
    else { scrollEl.addEventListener('wheel', wheelHandler, { passive: false }); }

    this.scrollbar.addEventListener('mousedown', function(e) {
      isDragging = true;
      startY = e.clientY;
      startScrollTop = isHtml ? window.scrollY : self.container.scrollTop;
      document.body.style.userSelect = 'none';
      self.scrollbar.setAttribute('data-scroll', 'mousedown');
    });
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var deltaY = e.clientY - startY;
      var contentHeight = document.documentElement.scrollHeight - window.innerHeight;
      var scrollbarMaxTop = window.innerHeight - self.scrollbar.clientHeight;
      var scrollAmount = (deltaY / scrollbarMaxTop) * contentHeight;
      if (isHtml) window.scrollTo(0, startScrollTop + scrollAmount);
      else self.container.scrollTop = startScrollTop + scrollAmount;
    });
    document.addEventListener('mouseup', function() {
      if (isDragging) { isDragging = false; document.body.style.userSelect = ''; self.scrollbar.removeAttribute('data-scroll'); }
    });
    window.addEventListener('resize', function() { self.updateScrollbar(); });
    var observerTarget = self.container === document.documentElement ? document.body : self.container;
    var observer = new MutationObserver(function() { self.updateScrollbar(); });
    observer.observe(observerTarget, { childList: true, subtree: true });
  }
  startSmoothScroll() {
    var self = this;
    this.isScrolling = true;
    var step = function() {
      if (Math.abs(self.velocity) < 0.1) { self.velocity = 0; self.isScrolling = false; return; }
      self.container.scrollTop += self.velocity;
      self.velocity *= 0.55;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
