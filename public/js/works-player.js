// Load external players only when a visitor clicks a video.
(() => {
  const modal = document.getElementById('work-player');
  if (!modal) return;
  const player = document.getElementById('work-player-content');
  const title = document.getElementById('work-player-title');
  const external = document.getElementById('work-player-link');

  function showX(url) {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'twitter-video';
    blockquote.setAttribute('data-dnt', 'true');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.textContent = 'Xで動画を見る';
    blockquote.append(anchor);
    player.append(blockquote);

    const render = () => {
      if (window.twttr && window.twttr.widgets) {
        if (typeof window.twttr.ready === 'function') {
          window.twttr.ready(() => window.twttr.widgets.load(player));
        } else {
          window.twttr.widgets.load(player);
        }
      }
    };

    if (window.twttr && window.twttr.widgets) return render();
    const existing = document.querySelector('script[data-x-widgets]');
    if (existing) { existing.addEventListener('load', render, { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://platform.x.com/widgets.js';
    script.async = true;
    script.dataset.xWidgets = '1';
    script.addEventListener('load', render, { once: true });
    document.head.append(script);
    // If X is blocked by the browser, the original post link remains available.
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('a.js-work-play');
    if (!trigger || typeof modal.showModal !== 'function') return;
    const url = trigger.getAttribute('href');
    if (!url) return;
    const kind = trigger.dataset.videoPlatform;
    if (kind !== 'youtube' && kind !== 'x') return;

    event.preventDefault();
    player.replaceChildren();
    title.textContent = trigger.dataset.videoTitle || '動画';
    external.href = url;
    modal.showModal();

    if (kind === 'youtube') {
      const id = trigger.dataset.videoId;
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) return;
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0';
      iframe.title = title.textContent;
      iframe.setAttribute('allow', 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      player.append(iframe);
    } else {
      showX(url);
    }
  });

  modal.addEventListener('close', () => player.replaceChildren());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
})();
