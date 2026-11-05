// kepta.kitchen: makes the support email work even where a mailto link cannot.
// A mailto link only opens something when the device has a mail app set up
// (a Windows PC with no mail program, an iPhone without Apple Mail, and the
// browsers inside Instagram, LinkedIn or TikTok often do nothing). So a click on
// the address still tries the mail app, and it also copies the address and says
// so in a small bubble right above the link. No tracking, no cookies, nothing
// sent anywhere. Without this script the links work as plain mailto links.
(function () {
  var links = document.querySelectorAll('a[href^="mailto:"]');
  if (!links.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var style = document.createElement('style');
  style.textContent =
    'a[href^="mailto:"]:focus:not(:focus-visible){outline:none;}' +
    '.kepta-bubble{position:fixed;z-index:9999;box-sizing:border-box;max-width:calc(100vw - 16px);' +
    'background:#0F6E56;color:#fff;font:inherit;font-size:14px;line-height:1.3;font-weight:600;' +
    'padding:7px 11px;border-radius:8px;box-shadow:0 4px 14px rgba(15,40,30,.18);white-space:nowrap;' +
    'pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .15s ease,transform .15s ease;}' +
    '.kepta-bubble.is-on{opacity:1;transform:none;}' +
    '.kepta-bubble.is-still{transform:none;}' +
    '.kepta-bubble.is-plain{pointer-events:auto;-webkit-user-select:text;user-select:text;cursor:text;font-weight:500;}' +
    '.kepta-bubble svg{display:inline-block;vertical-align:-2px;margin-right:6px;}' +
    '.kepta-bubble::after{content:"";position:absolute;left:var(--arrow-x,50%);width:10px;height:10px;' +
    'margin-left:-5px;background:#0F6E56;transform:rotate(45deg);border-radius:2px;}' +
    '.kepta-bubble.is-above::after{bottom:-4px;}' +
    '.kepta-bubble.is-below::after{top:-4px;}' +
    '.kepta-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}';
  document.head.appendChild(style);

  var bubble = document.createElement('div');
  bubble.className = 'kepta-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  bubble.hidden = true;
  document.body.appendChild(bubble);

  var live = document.createElement('div');
  live.className = 'kepta-sr';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);

  var CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var hideTimer = null;
  var current = null;

  function hide() {
    clearTimeout(hideTimer);
    bubble.classList.remove('is-on');
    current = null;
    setTimeout(function () { if (!current) bubble.hidden = true; }, 160);
  }

  function place(link) {
    var r = link.getBoundingClientRect();
    // The address may wrap across two lines: point at its first line.
    var rects = link.getClientRects();
    var first = rects.length ? rects[0] : r;
    var vw = document.documentElement.clientWidth;
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight, gap = 10, edge = 8;
    var above = first.top - bh - gap >= edge;
    var top = above ? first.top - bh - gap : first.bottom + gap;
    var mid = first.left + first.width / 2;
    var left = Math.max(edge, Math.min(mid - bw / 2, vw - bw - edge));
    var arrow = Math.max(12, Math.min(mid - left, bw - 12));
    bubble.classList.toggle('is-above', above);
    bubble.classList.toggle('is-below', !above);
    bubble.style.top = Math.round(top) + 'px';
    bubble.style.left = Math.round(left) + 'px';
    bubble.style.setProperty('--arrow-x', Math.round(arrow) + 'px');
  }

  function show(link, copied, address) {
    clearTimeout(hideTimer);
    current = link;
    bubble.classList.remove('is-on');
    bubble.classList.toggle('is-plain', !copied);
    bubble.classList.toggle('is-still', reduce);
    if (copied) bubble.innerHTML = CHECK + 'Email copied';
    else bubble.textContent = address;
    bubble.hidden = false;
    place(link);
    // place() read the bubble's size, so the browser has already laid it out
    // without is-on: adding it now runs the fade and rise, again on every click.
    void bubble.offsetWidth;
    bubble.classList.add('is-on');
    live.textContent = '';
    setTimeout(function () {
      live.textContent = copied ? 'Email address copied: ' + address : 'Our email address is ' + address;
    }, 50);
    hideTimer = setTimeout(hide, copied ? 2500 : 6000);
  }

  function fallbackCopy(text) {
    var box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.top = '-1000px';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(box);
    return ok;
  }

  // The bubble follows its link if the page moves (a phone's toolbar settling,
  // a scroll) instead of vanishing early.
  var queued = false;
  function follow() {
    if (!current || queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; if (current) place(current); });
  }
  window.addEventListener('scroll', follow, { passive: true });
  window.addEventListener('resize', follow);

  // One listener for the whole page, so links added later (the Write to Us
  // sheet's own address) get the same help.
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href^="mailto:"]') : null;
    if (!link) return;
    // Never stop the link: the mail app still opens wherever it can.
    var address = link.getAttribute('href').replace(/^mailto:/i, '').split('?')[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address).then(
        function () { show(link, true, address); },
        function () { show(link, fallbackCopy(address), address); }
      );
    } else {
      show(link, fallbackCopy(address), address);
    }
  });
})();
