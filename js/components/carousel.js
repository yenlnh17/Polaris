/**
 * Carousel component.
 * Usage: new Carousel(el, { autoplay, interval, loop, perView, maxDots })
 * perView: max items on desktop; auto-scales lg:max / sm:2 / mobile:1
 * maxDots: max visible dots (windowed when _pages > maxDots)
 */

export class Carousel {
  constructor(el, opts = {}) {
    this.el      = el;
    this.track   = el.querySelector('.carousel__track');
    this.slides  = [...el.querySelectorAll('.carousel__slide')];
    this.dotsEl  = el.querySelector('.carousel__dots');
    this.prevBtn = el.querySelector('.carousel__btn--prev');
    this.nextBtn = el.querySelector('.carousel__btn--next');

    this.opts = {
      autoplay: opts.autoplay ?? true,
      interval: opts.interval ?? 4000,
      loop:     opts.loop     ?? true,
      swipe:    opts.swipe    ?? true,
      perView:  opts.perView  ?? 1,
      maxDots:  opts.maxDots  ?? 5,
    };

    this.current = 0;
    this.total   = this.slides.length;
    this._timer  = null;
    this._startX = null;

    if (this.total < 2) return;

    this._effectivePerView = this._getEffectivePerView();
    this._pages            = Math.ceil(this.total / this._effectivePerView);

    this._buildDots();
    this._bindEvents();
    this._goTo(0);
    if (this.opts.autoplay) this._startAutoplay();
  }

  _getEffectivePerView() {
    const max = this.opts.perView;
    if (max <= 1) return 1;
    if (max >= 3 && window.matchMedia('(min-width: 1024px)').matches) return max;
    if (max >= 2 && window.matchMedia('(min-width: 640px)').matches)  return Math.min(2, max);
    return 1;
  }

  _buildDots() {
    if (!this.dotsEl) return;
    this.dotsEl.innerHTML = '';
    const visibleDots = Math.min(this._pages, this.opts.maxDots);
    for (let i = 0; i < visibleDots; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel__dot';
      this.dotsEl.appendChild(dot);
    }
  }

  // Windowed dots: window of maxDots slides centered on current page
  _updateDots(pageIndex) {
    const dots = this.dotsEl?.querySelectorAll('.carousel__dot');
    if (!dots?.length) return;

    const dotCount   = dots.length;
    const half       = Math.floor(dotCount / 2);
    let   windowStart = pageIndex - half;
    windowStart = Math.max(0, Math.min(windowStart, this._pages - dotCount));

    const activeDotIndex = pageIndex - windowStart;

    dots.forEach((dot, i) => {
      const targetPage = windowStart + i;
      const isActive   = i === activeDotIndex;
      const isEdge     = (i === 0 && windowStart > 0) ||
                         (i === dotCount - 1 && windowStart + dotCount < this._pages);

      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-label',   `Slide ${targetPage + 1}`);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      dot.style.opacity   = isEdge ? '0.35' : '1';
      dot.style.transform = isEdge ? 'scale(0.65)' : '';
      dot.onclick = () => this._goTo(targetPage * this._effectivePerView);
    });
  }

  _bindEvents() {
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());

    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    this.el.addEventListener('mouseenter', () => this._stopAutoplay());
    this.el.addEventListener('mouseleave', () => { if (this.opts.autoplay) this._startAutoplay(); });
    this.el.addEventListener('focusin',    () => this._stopAutoplay());
    this.el.addEventListener('focusout',   () => { if (this.opts.autoplay) this._startAutoplay(); });

    if (this.opts.swipe) {
      this.track.addEventListener('pointerdown', (e) => { this._startX = e.clientX; });
      this.track.addEventListener('pointerup',   (e) => {
        if (this._startX === null) return;
        const dx = e.clientX - this._startX;
        if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
        this._startX = null;
      });
    }

    this._resizeObserver = new ResizeObserver(() => {
      const newPerView = this._getEffectivePerView();
      if (newPerView === this._effectivePerView) return;
      this._effectivePerView = newPerView;
      this._pages            = Math.ceil(this.total / newPerView);
      const page = Math.round(this.current / newPerView);
      this.current = page * newPerView;
      this._buildDots();
      this._goTo(this.current);
    });
    this._resizeObserver.observe(this.el);
  }

  _goTo(index) {
    const pv      = this._effectivePerView;
    const snapped = Math.round(index / pv) * pv;

    if (this.opts.loop) {
      this.current = ((snapped % this.total) + this.total) % this.total;
    } else {
      this.current = Math.max(0, Math.min(snapped, (this._pages - 1) * pv));
    }

    this.track.style.transform = `translateX(${-(this.current * 100 / pv)}%)`;

    const pageIndex = Math.round(this.current / pv);
    this._updateDots(pageIndex);

    if (this.prevBtn && !this.opts.loop) this.prevBtn.disabled = this.current === 0;
    if (this.nextBtn && !this.opts.loop) this.nextBtn.disabled = this.current >= (this._pages - 1) * pv;

    this.slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', (i >= this.current && i < this.current + pv) ? 'false' : 'true');
    });
  }

  next() { this._goTo(this.current + this._effectivePerView); }
  prev() { this._goTo(this.current - this._effectivePerView); }

  _startAutoplay() {
    this._stopAutoplay();
    this._timer = setInterval(() => this.next(), this.opts.interval);
  }

  _stopAutoplay() {
    clearInterval(this._timer);
    this._timer = null;
  }

  destroy() {
    this._stopAutoplay();
    this._resizeObserver?.disconnect();
  }
}
