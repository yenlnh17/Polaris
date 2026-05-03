/**
 * Carousel component.
 * Usage: new Carousel(el, { autoplay: true, interval: 4000, loop: true })
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
      autoplay:  opts.autoplay  ?? true,
      interval:  opts.interval  ?? 4000,
      loop:      opts.loop      ?? true,
      swipe:     opts.swipe     ?? true,
      perView:   opts.perView   ?? 1
    };

    this.current  = 0;
    this.total    = this.slides.length;
    this._timer   = null;
    this._startX  = null;

    if (this.total < 2) return;

    this._buildDots();
    this._bindEvents();
    this._goTo(0);
    if (this.opts.autoplay) this._startAutoplay();
  }

  _buildDots() {
    if (!this.dotsEl) return;
    this.dotsEl.innerHTML = '';
    this.slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => this._goTo(i));
      this.dotsEl.appendChild(dot);
    });
  }

  _bindEvents() {
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());

    // Keyboard
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    // Pause on hover
    this.el.addEventListener('mouseenter', () => this._stopAutoplay());
    this.el.addEventListener('mouseleave', () => { if (this.opts.autoplay) this._startAutoplay(); });
    this.el.addEventListener('focusin', () => this._stopAutoplay());
    this.el.addEventListener('focusout', () => { if (this.opts.autoplay) this._startAutoplay(); });

    // Touch / swipe
    if (this.opts.swipe) {
      this.track.addEventListener('pointerdown', (e) => { this._startX = e.clientX; });
      this.track.addEventListener('pointerup', (e) => {
        if (this._startX === null) return;
        const dx = e.clientX - this._startX;
        if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
        this._startX = null;
      });
    }
  }

  _goTo(index) {
    if (this.opts.loop) {
      this.current = (index + this.total) % this.total;
    } else {
      this.current = Math.max(0, Math.min(index, this.total - 1));
    }

    const offset = -(this.current * 100);
    this.track.style.transform = `translateX(${offset}%)`;

    // Update dots
    this.dotsEl?.querySelectorAll('.carousel__dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === this.current);
      dot.setAttribute('aria-current', i === this.current ? 'true' : 'false');
    });

    // Update buttons
    if (this.prevBtn && !this.opts.loop) this.prevBtn.disabled = this.current === 0;
    if (this.nextBtn && !this.opts.loop) this.nextBtn.disabled = this.current === this.total - 1;

    // Aria
    this.slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i !== this.current ? 'true' : 'false');
    });
  }

  next() { this._goTo(this.current + 1); }
  prev() { this._goTo(this.current - 1); }

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
  }
}
