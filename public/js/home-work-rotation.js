// Show one large HOME work at a time. The 1-work layout needs no rotation.
(() => {
  const rotator = document.querySelector('.home-work-rotator');
  if (!rotator) return;
  const slides = Array.from(rotator.querySelectorAll('[data-featured-slide]'));
  if (slides.length < 2) return;

  const dots = Array.from(rotator.querySelectorAll('[data-slide-index]'));
  const counter = rotator.querySelector('[data-slide-count]');
  const previous = rotator.querySelector('[data-slide-prev]');
  const next = rotator.querySelector('[data-slide-next]');
  const modal = document.getElementById('work-player');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const interval = Math.max(4000, Number(rotator.dataset.interval) || 8000);
  let current = 0;
  let timer;

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => {
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
  }

  function autoAdvance() {
    if (document.hidden || reducedMotion?.matches || modal?.open) return;
    if (rotator.matches(':hover') || rotator.matches(':focus-within')) return;
    show(current + 1);
  }

  function restart() {
    if (timer !== undefined) window.clearInterval(timer);
    timer = window.setInterval(autoAdvance, interval);
  }

  previous?.addEventListener('click', () => { show(current - 1); restart(); });
  next?.addEventListener('click', () => { show(current + 1); restart(); });
  dots.forEach((dot) => dot.addEventListener('click', () => {
    const index = Number(dot.dataset.slideIndex);
    if (Number.isInteger(index) && index >= 0 && index < slides.length) {
      show(index);
      restart();
    }
  }));

  show(0);
  restart();
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();
