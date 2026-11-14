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
  const pause = rotator.querySelector('[data-slide-pause]');
  const modal = document.getElementById('work-player');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const interval = Math.max(4000, Number(rotator.dataset.interval) || 8000);
  let current = 0;
  let timer;
  let userPaused = false;

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
    if (document.hidden || userPaused || reducedMotion?.matches || modal?.open) return;
    if (rotator.matches(':hover') || rotator.querySelector(':focus-visible')) return;
    show(current + 1);
  }

  function restart() {
    if (timer !== undefined) window.clearInterval(timer);
    timer = window.setInterval(autoAdvance, interval);
  }

  pause?.addEventListener('click', () => {
    userPaused = !userPaused;
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', userPaused ? '自動切り替えを再開' : '自動切り替えを一時停止');
    pause.title = pause.getAttribute('aria-label');
    pause.textContent = userPaused ? '▶' : 'Ⅱ';
    restart();
  });
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
