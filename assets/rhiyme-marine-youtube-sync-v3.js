/* The army timeline controls playback and seeking for both companion videos. */
(() => {
  'use strict';
  const army = document.getElementById('homepage-featured-marine');
  const frames = ['homepage-additional-youtube', 'homepage-second-companion-youtube']
    .map(id => document.getElementById(id)).filter(Boolean);
  if (!army || !frames.length) return;
  const entries = frames.map(frame => ({ frame, player: null, ready: false, failed: false, bufferTimer: null, lastTime: 0 }));
  let requested = false, hasStarted = false, apiTag, readinessTimer;
  let syncingUntil = 0;
  const samples = new Map();
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Play linked videos';
  retry.hidden = true;
  retry.style.cssText = 'display:none;margin:10px auto;padding:10px 18px;border:1px solid #b99b57;border-radius:20px;background:#102b3d;color:#f3d386;cursor:pointer';
  frames.at(-1).insertAdjacentElement('afterend', retry);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.style.cssText = 'text-align:center;margin:8px auto;color:#f3d386;font:14px/1.5 Arial,sans-serif';
  retry.insertAdjacentElement('afterend', status);
  function showRetry(message) {
    retry.hidden = false;
    retry.style.display = 'block';
    if (message) status.textContent = message;
  }
  function hideRetry() {
    retry.hidden = true;
    retry.style.display = 'none';
    status.textContent = '';
  }
  for (const entry of entries) {
    const url = new URL(entry.frame.src, location.href);
    url.hostname = 'www.youtube-nocookie.com';
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('origin', location.origin);
    url.searchParams.set('widget_referrer', location.origin + '/');
    entry.url = url;
    entry.frame.loading = 'eager';
    entry.frame.referrerPolicy = 'strict-origin-when-cross-origin';
    if (entry.frame.src !== url.toString()) entry.frame.src = url.toString();
    const recover = document.createElement('button');
    recover.type = 'button';
    recover.textContent = 'Resume this video';
    recover.hidden = true;
    recover.style.cssText = 'display:none;margin:10px auto;padding:10px 18px;border:1px solid #b99b57;border-radius:20px;background:#102b3d;color:#f3d386;cursor:pointer';
    recover.setAttribute('aria-label', 'Reload this video from its current playback position');
    entry.frame.insertAdjacentElement('afterend', recover);
    entry.recover = recover;
    recover.addEventListener('click', () => {
      if (!entry.ready || !entry.player) { showRetry('Tap Play linked videos to reload the player.'); return; }
      try {
        const time = Math.max(0, entry.player.getCurrentTime() || entry.lastTime || 0);
        entry.player.loadVideoById({ videoId: entry.url.pathname.split('/').pop(), startSeconds: time });
        entry.failed = false;
      } catch (_) { showRetry('Tap Play linked videos to retry playback.'); }
    });
  }
  function align(entry) {
    if (!entry.ready || !entry.player) return;
    let time = Math.max(0, Number(army.currentTime) || 0);
    try {
      const duration = entry.player.getDuration();
      if (duration > 0) time = Math.min(time, Math.max(0, duration - 0.1));
      entry.player.seekTo(time, true);
    } catch (_) { showRetry('Tap Play linked videos to retry playback.'); }
  }
  function seekAll() {
    syncingUntil = performance.now() + 1400;
    samples.clear();
    requested = true;
    entries.forEach(align);
  }
  function startAll() {
    const firstStart = !hasStarted;
    hasStarted = true;
    requested = true;
    for (const entry of entries) {
      if (!entry.ready) continue;
      if (firstStart) { syncingUntil = performance.now() + 1400; align(entry); }
      try { entry.player.playVideo(); }
      catch (_) { showRetry('Tap Play linked videos to allow playback.'); }
    }
  }
  army.addEventListener('play', startAll);
  // Seeking fires for backward and forward timeline changes, including reset to zero.
  // seeked applies the final position even when the army video stays paused.
  army.addEventListener('seeking', seekAll);
  army.addEventListener('seeked', seekAll);
  retry.addEventListener('click', () => {
    requested = true;
    for (const entry of entries) {
      if (entry.failed || !entry.ready) {
        entry.failed = false;
        entry.frame.src = entry.url.toString();
      }
    }
    if (!window.YT || !window.YT.Player) loadApi();
    else initialize();
    startAll();
    if (army.paused) {
      const result = army.play();
      if (result && result.catch) result.catch(() => showRetry('Tap the army video to start playback.'));
    }
    armTimeout();
  });
  function initialize() {
    if (!window.YT || !window.YT.Player) return;
    for (const entry of entries) {
      if (entry.player) continue;
      entry.player = new window.YT.Player(entry.frame, {
        host: entry.url.origin,
        events: {
          onReady: () => {
            entry.ready = true;
            entry.failed = false;
            if (entries.every(e => e.ready)) clearTimeout(readinessTimer);
            if (requested) {
              align(entry);
              if (!army.paused) entry.player.playVideo();
            }
          },
          onStateChange: event => {
            clearTimeout(entry.bufferTimer);
            if (entry.ready) entry.lastTime = entry.player.getCurrentTime() || entry.lastTime;
            if (event.data === 3) {
              entry.bufferTimer = setTimeout(() => {
                if (entry.player.getPlayerState() === 3) {
                  entry.recover.hidden = false;
                  entry.recover.style.display = 'block';
                }
              }, 10000);
            } else if (event.data === 1) {
              entry.recover.hidden = true;
              entry.recover.style.display = 'none';
              if (!hasStarted && performance.now() >= syncingUntil) {
                army.currentTime = Math.max(0, entry.player.getCurrentTime() || 0);
                seekAll();
                const result = army.play();
                if (result && result.catch) result.catch(() => showRetry('Tap the army video to start linked playback.'));
              } else if (army.paused && !document.hidden && performance.now() >= syncingUntil) {
                const result = army.play();
                if (result && result.catch) result.catch(() => {});
              }
              startAll();
            }
            if (entries.every(e => e.ready && !e.failed && e.player.getPlayerState() === 1)) hideRetry();
          },
          onAutoplayBlocked: () => showRetry('Tap Play linked videos to allow playback.'),
          onError: () => {
            entry.failed = true;
            entry.recover.hidden = false;
            entry.recover.style.display = 'block';
            showRetry('A YouTube video could not play here. Tap Play linked videos to retry.');
          }
        }
      });
    }
  }
  function armTimeout() {
    clearTimeout(readinessTimer);
    readinessTimer = setTimeout(() => {
      if (entries.some(e => !e.ready)) showRetry('Player taking too long? Tap Play linked videos to retry.');
    }, 15000);
  }
  function loadApi() {
    if (apiTag || document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
    apiTag = document.createElement('script');
    apiTag.src = 'https://www.youtube.com/iframe_api';
    apiTag.referrerPolicy = 'strict-origin-when-cross-origin';
    apiTag.onerror = () => {
      apiTag.remove();
      apiTag = null;
      showRetry('YouTube could not load. Tap Play linked videos to retry.');
    };
    document.head.appendChild(apiTag);
  }
  const previous = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    try { if (typeof previous === 'function') previous(); }
    finally { initialize(); }
  };
  // YouTube does not expose a seek event. Detect timeline jumps in either companion.
  setInterval(() => {
    const now = performance.now();
    for (const entry of entries) {
      if (!entry.ready || entry.failed || !entry.player) continue;
      try {
        const time = entry.player.getCurrentTime();
        const state = entry.player.getPlayerState();
        const previous = samples.get(entry);
        samples.set(entry, { time, now, state });
        if (!hasStarted || now < syncingUntil || !previous || state === 0 || state === -1) continue;
        const elapsed = (now - previous.now) / 1000;
        const delta = time - previous.time;
        const expected = previous.state === 1 ? elapsed : 0;
        if (delta < -0.7 || delta > expected + 1.6) {
          syncingUntil = now + 1400;
          samples.clear();
          army.currentTime = Math.max(0, time);
          entries.forEach(other => { if (other !== entry) align(other); });
          break;
        }
      } catch (_) {}
    }
  }, 250);
  armTimeout();
  if (window.YT && window.YT.Player) initialize();
  else loadApi();
})();
