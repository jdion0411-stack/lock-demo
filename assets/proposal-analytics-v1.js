/* Proposal activity signals. These do not establish human identity or comprehension. */
(() => {
  'use strict';
  if (window.self !== window.top || window.__rhymeProposalAnalytics) return;
  window.__rhymeProposalAnalytics = true;
  const measurementId = 'G-7KW40PVYLH';
  const proposalPath = '/economic-blockade.html';
  const pdfPath = '/essays/economic-blockade.pdf';
  const isProposal = location.pathname === proposalPath;
  // Preserve the existing homepage configuration; initialize only on an untagged page.
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(tag);
  }
  function send(name, parameters = {}) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, {
      send_to: measurementId,
      proposal_id: 'fair_opportunity_access',
      ...parameters
    });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    // Distinct from enhanced-measurement file_download, so it isn't counted twice.
    if (url.pathname === pdfPath) {
      send('proposal_pdf_click', { file_name: pdfPath, file_extension: 'pdf', link_url: url.origin + url.pathname });
    } else if (!isProposal && url.pathname === proposalPath) {
      send('proposal_link_click', { link_url: url.origin + url.pathname });
    }
  }, { capture: true });
  if (!isProposal) return;
  send('proposal_open');
  const sentDepths = new Set();
  const sentTimes = new Set();
  let maximumDepth = 0;
  let activeSeconds = 0;
  let lastActivity = performance.now();
  let previousTick = lastActivity;
  let engagedSent = false;
  const isVisible = () => document.visibilityState === 'visible' && document.hasFocus();
  function maybeEngaged() {
    if (!engagedSent && activeSeconds >= 60 && maximumDepth >= 25) {
      engagedSent = true;
      send('proposal_engaged_visit', { active_seconds: 60, percent_scrolled: maximumDepth });
    }
  }
  function noteActivity() { lastActivity = performance.now(); }
  for (const name of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(name, noteActivity, { passive: true });
  }
  window.addEventListener('scroll', () => {
    noteActivity();
    if (!isVisible()) return;
    const height = document.documentElement.scrollHeight;
    if (height <= window.innerHeight) return;
    const depth = Math.min(100, Math.round((window.scrollY + window.innerHeight) / height * 100));
    maximumDepth = Math.max(maximumDepth, depth);
    for (const threshold of [25, 50, 75, 90]) {
      if (depth >= threshold && !sentDepths.has(threshold)) {
        sentDepths.add(threshold);
        send('proposal_scroll_' + threshold, { percent_scrolled: threshold });
      }
    }
    maybeEngaged();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { previousTick = performance.now(); });
  window.addEventListener('focus', () => { previousTick = performance.now(); noteActivity(); });
  setInterval(() => {
    const now = performance.now();
    const elapsed = (now - previousTick) / 1000;
    previousTick = now;
    // Ignore suspension gaps and pause after 60 seconds without interaction.
    if (!isVisible() || elapsed <= 0 || elapsed > 5 || now - lastActivity > 60000) return;
    activeSeconds += elapsed;
    for (const threshold of [30, 60, 180, 300]) {
      if (activeSeconds >= threshold && !sentTimes.has(threshold)) {
        sentTimes.add(threshold);
        send('proposal_active_' + threshold + 's', { active_seconds: threshold });
      }
    }
    maybeEngaged();
  }, 1000);
})();
