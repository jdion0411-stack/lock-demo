/* Start the companion YouTube video when the Marine inspection plays. */
(() => {
  'use strict';
  const marine = document.getElementById('homepage-featured-marine');
  const frame = document.getElementById('homepage-additional-youtube');
  if (!marine || !frame) return;
  let player, ready = false, requested = false;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Play both videos';
  retry.hidden = true;
  retry.style.cssText = 'display:none;margin:10px auto;padding:10px 18px;border:1px solid #b99b57;border-radius:20px;background:#102b3d;color:#f3d386;cursor:pointer';
  frame.insertAdjacentElement('afterend', retry);
  const showRetry = () => { retry.hidden = false; retry.style.display = 'block'; };
  const hideRetry = () => { retry.hidden = true; retry.style.display = 'none'; };
  function startCompanion() {
    requested = true;
    if (!ready) return;
    try {
      if (player.getPlayerState() === 0) player.seekTo(0, true);
      player.playVideo();
    } catch (_) { showRetry(); }
  }
  marine.addEventListener('play', startCompanion);
  retry.addEventListener('click', () => {
    startCompanion();
    if (marine.paused) {
      const play = marine.play();
      if (play && play.catch) play.catch(showRetry);
    }
  });
  function initialize() {
    if (player || !window.YT || !window.YT.Player) return;
    player = new window.YT.Player(frame, {
      events: {
        onReady: () => {
          ready = true;
          if (requested && !marine.paused) startCompanion();
        },
        onStateChange: event => { if (event.data === 1) hideRetry(); },
        onAutoplayBlocked: showRetry,
        onError: showRetry
      }
    });
  }
  const url = new URL(frame.src, location.href);
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('origin', location.origin);
  frame.loading = 'eager';
  frame.src = url.toString();
  if (window.YT && window.YT.Player) initialize();
  else {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      try { if (typeof previous === 'function') previous(); }
      finally { initialize(); }
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const api = document.createElement('script');
      api.src = 'https://www.youtube.com/iframe_api';
      api.onerror = showRetry;
      document.head.appendChild(api);
    }
  }
})();
