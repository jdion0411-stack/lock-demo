/* Start the companion YouTube video when the Marine inspection plays. */
(() => {
  'use strict';
  const marine = document.getElementById('homepage-featured-marine');
  const frame = document.getElementById('homepage-additional-youtube');
  if (!marine || !frame) return;
  let player, ready = false, requested = false, failed = false;
  let readinessTimer, apiTag;
  const original = new URL(frame.src, location.href);
  const videoId = original.pathname.split('/').pop();
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Play both videos';
  retry.hidden = true;
  retry.style.cssText = 'display:none;margin:10px auto;padding:10px 18px;border:1px solid #b99b57;border-radius:20px;background:#102b3d;color:#f3d386;cursor:pointer';
  frame.insertAdjacentElement('afterend', retry);
  const fallback = document.createElement('a');
  fallback.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId);
  fallback.target = '_blank';
  fallback.rel = 'noopener';
  fallback.textContent = 'Watch on YouTube';
  fallback.style.cssText = 'display:block;text-align:center;margin:10px auto;color:#f3d386;font:14px/1.5 Arial,sans-serif';
  retry.insertAdjacentElement('afterend', fallback);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.style.cssText = 'text-align:center;margin:8px auto;color:#f3d386;font:14px/1.5 Arial,sans-serif';
  fallback.insertAdjacentElement('afterend', status);
  const blocked = () => { showRetry(); status.textContent = 'Tap Play both videos to allow playback.'; };
  const fail = () => {
    failed = true;
    showRetry();
    retry.textContent = 'Reload and play both videos';
    status.textContent = 'YouTube could not load here. Retry the player or watch on YouTube.';
  };
  const showRetry = () => { retry.hidden = false; retry.style.display = 'block'; };
  const hideRetry = () => { retry.hidden = true; retry.style.display = 'none'; };
  function startCompanion() {
    requested = true;
    if (!ready) { showRetry(); return; }
    try {
      if (player.getPlayerState() === 0) player.seekTo(0, true);
      player.playVideo();
    } catch (_) { showRetry(); }
  }
  marine.addEventListener('play', startCompanion);
  retry.addEventListener('click', () => {
    if (failed || !ready) {
      failed = false;
      ready = false;
      status.textContent = 'Reloading YouTube…';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.src = url.toString();
      armTimeout();
      if (!player) { if (window.YT && window.YT.Player) initialize(); else loadApi(); }
    }
    startCompanion();
    if (marine.paused) {
      const play = marine.play();
      if (play && play.catch) play.catch(showRetry);
    }
  });
  function initialize() {
    if (player || !window.YT || !window.YT.Player) return;
    player = new window.YT.Player(frame, {
      host: url.origin,
      events: {
        onReady: () => {
          ready = true;
          failed = false;
          clearTimeout(readinessTimer);
          status.textContent = '';
          if (requested && !marine.paused) startCompanion();
        },
        onStateChange: event => { if (event.data === 1) { hideRetry(); status.textContent = ''; } },
        onAutoplayBlocked: blocked,
        onError: fail
      }
    });
  }
  const url = new URL(frame.src, location.href);
  url.hostname = 'www.youtube-nocookie.com';
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('widget_referrer', location.origin + '/');
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  url.searchParams.set('origin', location.origin);
  frame.loading = 'eager';
  if (frame.src !== url.toString()) frame.src = url.toString();
  function armTimeout() {
    clearTimeout(readinessTimer);
    readinessTimer = setTimeout(() => {
      if (!ready) {
        failed = true;
        showRetry();
        retry.textContent = 'Reload and play both videos';
        status.textContent = 'Player taking too long? Retry here or watch on YouTube.';
      }
    }, 15000);
  }
  armTimeout();
  if (window.YT && window.YT.Player) initialize();
  else {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      try { if (typeof previous === 'function') previous(); }
      finally { initialize(); }
    };
    loadApi();
  }
  function loadApi() {
    if (apiTag || document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
    apiTag = document.createElement('script');
    apiTag.src = 'https://www.youtube.com/iframe_api';
    apiTag.referrerPolicy = 'strict-origin-when-cross-origin';
    apiTag.onerror = () => { apiTag.remove(); apiTag = null; fail(); };
    document.head.appendChild(apiTag);
  }
})();
