// kepta.kitchen: the Write to Us form. Any link marked data-contact opens it
// (without this script those links simply go to /support#write, which shows
// the address). The message goes only to kepta.kitchen/api/contact, which
// hands it to Resend for delivery to support@kepta.kitchen. No tracking, no
// cookies. Ported from effortzero.app's contact dialog.
(function () {
  if (!window.HTMLDialogElement) return; // very old browsers keep the plain link

  var ADDRESS = 'support@kepta.kitchen';
  var GMAIL = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + ADDRESS + '&su=Kepta';
  var TOPICS = ['A problem in the app', 'Food dates', 'An idea', 'Kepta Plus', 'My account', 'Something else'];
  var EMAIL_RE = /^[A-Za-z0-9_%+'-]+(?:\.[A-Za-z0-9_%+'-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

  var css =
    '.kc-dialog{border:0;padding:0;background:transparent;max-width:none;max-height:none;width:100%;height:100%;margin:0;overflow:auto;}' +
    '.kc-dialog::backdrop{background:rgba(20,30,26,.45);}' +
    '.kc-card{box-sizing:border-box;width:min(520px,calc(100% - 32px));margin:max(24px,6vh) auto 24px;background:#fff;color:#1c1c1a;' +
    'border-radius:16px;box-shadow:0 18px 50px rgba(15,40,30,.25);padding:22px 22px 18px;font:inherit;font-size:16px;line-height:1.5;}' +
    // The pages balance their paragraphs (text-wrap: balance), which squeezes
    // the sheet's one-line notes into short lines; the sheet wraps plainly.
    '.kc-card p,.kc-card label,.kc-card legend{text-wrap:wrap;max-width:none;}' +
    '.kc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}' +
    '.kc-title{margin:0;font-size:1.45rem;line-height:1.25;color:#0F6E56;outline:none;}' +
    '.kc-close{flex:none;width:44px;height:44px;margin:-8px -8px 0 0;border:0;border-radius:999px;background:transparent;color:#55554f;cursor:pointer;font-size:24px;line-height:1;}' +
    '.kc-close:hover{background:#F1F0EA;color:#1c1c1a;}' +
    '.kc-legend{padding:0;font-size:.9rem;color:#55554f;}' +
    '.kc-legend span{color:#8a8a82;}' +
    '.kc-topics{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}' +
    '.kc-topic{position:relative;}' +
    '.kc-topic input{position:absolute;opacity:0;width:1px;height:1px;}' +
    '.kc-topic span{display:inline-block;padding:7px 13px;border:1.5px solid #cfe0d9;border-radius:999px;font-size:.9rem;color:#1c1c1a;cursor:pointer;background:#fff;}' +
    '.kc-topic input:checked+span{background:#E7F2EE;border-color:#0F6E56;color:#0F6E56;font-weight:600;}' +
    '.kc-topic input:focus-visible+span{outline:2px solid #0F6E56;outline-offset:2px;}' +
    '.kc-row{display:grid;gap:12px;margin-top:16px;}' +
    '@media (min-width:560px){.kc-row{grid-template-columns:1fr 1fr;}}' +
    '.kc-label{display:block;font-size:.9rem;color:#55554f;}' +
    '.kc-field{display:block;box-sizing:border-box;width:100%;margin-top:4px;padding:10px 12px;border:1.5px solid #d8d6cf;border-radius:10px;' +
    'font:inherit;font-size:16px;color:#1c1c1a;background:#FBFBF8;outline:none;}' +
    '.kc-field:focus{border-color:#0F6E56;box-shadow:0 0 0 3px rgba(15,110,86,.15);background:#fff;}' +
    '.kc-field[aria-invalid="true"]{border-color:#B42318;}' +
    'textarea.kc-field{min-height:7.5rem;resize:vertical;}' +
    '.kc-msg{margin-top:12px;}' +
    '.kc-hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;}' +
    '.kc-err{min-height:1.5em;margin:10px 0 0;font-size:.92rem;color:#B42318;}' +
    '.kc-send{margin-top:6px;display:inline-flex;align-items:center;justify-content:center;height:46px;padding:0 26px;border:0;border-radius:999px;' +
    'background:linear-gradient(135deg,#0F6E56,#0B5A46);color:#fff;font:inherit;font-weight:600;font-size:1rem;cursor:pointer;}' +
    '.kc-send[aria-disabled="true"]{opacity:.7;cursor:default;}' +
    // Other ways to reach us (the encue.app pattern): the address as text, a
    // Copy pill that turns into Copied for 2 s, and Open in Gmail on computers
    // or Open in Mail on phones. Nothing here depends on a mail app.
    '.kc-other{margin:16px 0 0;padding-top:12px;border-top:1px solid #ECEBE5;}' +
    '.kc-other-h{margin:0;font-size:.85rem;color:#6b6b64;}' +
    '.kc-addr{margin:2px 0 0;font-weight:600;color:#1c1c1a;word-break:break-all;}' +
    '.kc-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}' +
    '.kc-pill{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border:1.5px solid #cfe0d9;border-radius:999px;' +
    'background:#fff;color:#0F6E56;font:inherit;font-size:.9rem;font-weight:600;text-decoration:none;cursor:pointer;transition:background-color .15s ease,color .15s ease,border-color .15s ease;}' +
    '.kc-pill:hover{border-color:#0F6E56;}' +
    '.kc-pill.is-copied{background:#0F6E56;border-color:#0F6E56;color:#fff;}' +
    '.kc-pill:focus-visible{outline:2px solid #0F6E56;outline-offset:2px;}' +
    // A mouse (a computer) gets Open in Gmail; touch (a phone or tablet) gets
    // Open in Mail, whatever the window width.
    '.kc-gmail{display:none;}' +
    '@media (hover:hover) and (pointer:fine){.kc-gmail{display:inline-flex;}.kc-mail{display:none;}}' +
    '@media (prefers-reduced-motion:reduce){.kc-pill{transition:none;}}' +
    '.kc-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}' +
    '.kc-sent{font-size:1.1rem;margin:16px 0 0;outline:none;}' +
    '.kc-sent-to{margin:4px 0 0;color:#55554f;overflow-wrap:anywhere;}' +
    // The moving green ring (encue.app's cursor ring in Kepta green): a 1.5 px
    // ring brightest under the pointer follows it around the pill's edge, and
    // the pill leans a few pixels toward it. Mouse only; touch and Reduce
    // Motion keep the plain pills.
    '@media (hover:hover) and (pointer:fine){' +
      '.kc-ring{position:relative;--ring-c1:#0F6E56;--ring-c2:#3FA37E;--ring-c3:rgba(15,110,86,.12);}' +
      '.kc-ring.kc-ring-light{--ring-c1:#ffffff;--ring-c2:#B9EBD6;--ring-c3:rgba(255,255,255,.25);}' +
      '.kc-ring::before{content:"";position:absolute;inset:-1.5px;border-radius:inherit;padding:1.5px;pointer-events:none;opacity:0;z-index:2;' +
      'transition:opacity .2s ease;background:radial-gradient(160px circle at var(--mouse-x,50%) var(--mouse-y,50%),var(--ring-c1),var(--ring-c2) 45%,var(--ring-c3) 75%);' +
      '-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);' +
      '-webkit-mask-composite:xor;mask-composite:exclude;}' +
      '.kc-ring:hover::before,.kc-ring.is-hot::before{opacity:1;}' +
    '}' +
    '@media (prefers-reduced-motion:reduce){.kc-ring::before{display:none;}}' +
    '.kc-done{margin-top:20px;height:44px;padding:0 22px;border:1.5px solid #0F6E56;border-radius:999px;background:#fff;color:#0F6E56;font:inherit;font-weight:600;cursor:pointer;}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var dialog = document.createElement('dialog');
  dialog.className = 'kc-dialog';
  dialog.setAttribute('aria-labelledby', 'kc-title');
  var topicsHtml = TOPICS.map(function (t) {
    return '<label class="kc-topic"><input type="radio" name="topic" value="' + t + '"><span>' + t + '</span></label>';
  }).join('');
  dialog.innerHTML =
    '<div class="kc-card">' +
      '<div class="kc-head"><h2 class="kc-title" id="kc-title" tabindex="-1">Write to Us</h2>' +
      '<button type="button" class="kc-close" aria-label="Close">&times;</button></div>' +
      '<div class="kc-body"></div>' +
      '<div class="kc-other"><p class="kc-other-h">Or email us</p><p class="kc-addr">' + ADDRESS + '</p>' +
        '<div class="kc-pills"><button type="button" class="kc-pill kc-copy">Copy</button>' +
        '<a class="kc-pill kc-gmail" href="' + GMAIL.replace(/&/g, '&amp;') + '" target="_blank" rel="noopener noreferrer">Open in Gmail</a>' +
        '<a class="kc-pill kc-mail" href="mailto:' + ADDRESS + '?subject=Kepta" data-no-copy>Open in Mail</a></div>' +
        '<span class="kc-sr" role="status" aria-live="polite"></span></div>' +
    '</div>';
  var formHtml =
    '<form class="kc-form" novalidate>' +
      '<fieldset style="margin:16px 0 0;border:0;padding:0;"><legend class="kc-legend">What is it about? <span>(optional)</span></legend>' +
      '<div class="kc-topics">' + topicsHtml + '</div></fieldset>' +
      '<div class="kc-row">' +
        '<label class="kc-label">Name<input class="kc-field" name="name" autocomplete="name" maxlength="100" required></label>' +
        '<label class="kc-label">Email<input class="kc-field" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required></label>' +
      '</div>' +
      '<label class="kc-label kc-msg">Message<textarea class="kc-field" name="message" rows="5" maxlength="5000" required></textarea></label>' +
      '<div class="kc-hp" aria-hidden="true"><label>Leave empty<input name="kk_hp" tabindex="-1" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore></label></div>' +
      '<p class="kc-err" id="kc-err" aria-live="polite"></p>' +
      '<button type="submit" class="kc-send">Send</button>' +
    '</form>';
  document.body.appendChild(dialog);

  var body = dialog.querySelector('.kc-body');
  var title = dialog.querySelector('.kc-title');
  body.innerHTML = formHtml;
  var form = body.querySelector('form');
  var sentBox = null;
  var openedAt = 0;      // when a fresh form first opened (the server's fill-time check)
  var status = 'idle';   // idle | sending | sent | failed
  var unseen = false;    // an answer that landed while the sheet was closed
  var opener = null;

  function field(name) { return form.querySelector('[name="' + name + '"]'); }
  function errLine() { return form.querySelector('.kc-err'); }

  function setInvalid(names) {
    ['name', 'email', 'message'].forEach(function (n) {
      var el = field(n);
      if (names.indexOf(n) >= 0) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'kc-err'); }
      else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
    });
    var words = names.map(function (f) { return f === 'email' ? 'a valid email' : f === 'name' ? 'your name' : 'a message'; });
    var text = !words.length ? '' : words.length === 1 ? words[0] : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
    errLine().textContent = text ? 'Please add ' + text + '.' : '';
  }

  // The way out is always the Or email us block right under Send: the
  // address, Copy, and Open in Gmail or Open in Mail.
  function showFailed(unavailable) {
    errLine().textContent = unavailable
      ? 'The form is resting right now. Please email us with the address below.'
      : "That didn't go through. Try again, or email us with the address below.";
  }

  var copyBtn = dialog.querySelector('.kc-copy');
  var copySaid = dialog.querySelector('.kc-other .kc-sr');
  var copyTimer = null;
  function copyFallback(text) {
    var box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.top = '-1000px';
    box.style.opacity = '0';
    dialog.appendChild(box); // inside the dialog: the page behind it is inert
    box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    dialog.removeChild(box);
    return ok;
  }
  function copied(ok) {
    clearTimeout(copyTimer);
    if (ok) {
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('is-copied');
      copySaid.textContent = '';
      setTimeout(function () { copySaid.textContent = 'Email address copied'; }, 50);
      copyTimer = setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-copied'); }, 2000);
    } else {
      // Copying refused: select the address so a long press or Ctrl+C takes it.
      var addr = dialog.querySelector('.kc-addr');
      var range = document.createRange();
      range.selectNodeContents(addr);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copySaid.textContent = 'Address selected: ' + ADDRESS;
    }
  }
  copyBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ADDRESS).then(function () { copied(true); }, function () { copied(copyFallback(ADDRESS)); });
    } else {
      copied(copyFallback(ADDRESS));
    }
  });
  dialog.addEventListener('close', function () {
    clearTimeout(copyTimer);
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('is-copied');
    copySaid.textContent = '';
  });

  function setSending(on) {
    var b = form.querySelector('.kc-send');
    b.setAttribute('aria-disabled', on ? 'true' : 'false');
    b.textContent = on ? 'Sending...' : 'Send';
  }

  function showSent(email) {
    form.hidden = true;
    sentBox = document.createElement('div');
    sentBox.setAttribute('role', 'status');
    sentBox.innerHTML = '<p class="kc-sent" tabindex="-1">Sent. Thank you.</p><p class="kc-sent-to"></p><button type="button" class="kc-done">Done</button>';
    sentBox.querySelector('.kc-sent-to').textContent = 'We will reply to ' + email + '.';
    sentBox.querySelector('.kc-done').addEventListener('click', close);
    body.appendChild(sentBox);
    if (typeof ringDone === 'function') ringDone(sentBox);
    if (dialog.open) sentBox.querySelector('.kc-sent').focus();
  }

  function freshForm() {
    if (sentBox) { sentBox.remove(); sentBox = null; }
    form.reset();
    form.hidden = false;
    setInvalid([]);
    setSending(false);
    status = 'idle';
    openedAt = 0;
  }

  function open(fromEl) {
    if (dialog.open) return;
    opener = fromEl || document.activeElement;
    var focusSent = false;
    if (unseen) {
      unseen = false;
      focusSent = status === 'sent';
    } else {
      // A finished message starts fresh; an unsent draft (and its clock) is kept.
      if (status === 'sent') freshForm();
      if (status === 'failed') { status = 'idle'; }
      if (status === 'idle') setInvalid([]);
    }
    if (!openedAt) openedAt = performance.now();
    dialog.showModal();
    if (focusSent && sentBox) sentBox.querySelector('.kc-sent').focus();
    else title.focus();
  }

  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', function () {
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
  });
  dialog.querySelector('.kc-close').addEventListener('click', close);

  // Only a press that starts AND ends on the dimmed area closes the sheet.
  var downOut = false;
  dialog.addEventListener('pointerdown', function (e) { downOut = !e.target.closest('.kc-card'); });
  dialog.addEventListener('click', function (e) {
    if (downOut && !e.target.closest('.kc-card')) close();
    downOut = false;
  });

  function settle() { if (!dialog.open) unseen = true; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (status === 'sending') return;
    var get = function (k) { var el = form.elements[k]; return el ? String(el.value || '').trim() : ''; };
    var picked = form.querySelector('input[name="topic"]:checked');
    var payload = {
      topic: picked ? picked.value : '',
      name: get('name'),
      email: get('email'),
      message: get('message'),
      kk_hp: form.elements.kk_hp ? form.elements.kk_hp.value : '',
      ms: Math.round(performance.now() - openedAt),
    };
    var bad = [];
    if (!payload.name) bad.push('name');
    if (!EMAIL_RE.test(payload.email)) bad.push('email');
    if (!payload.message) bad.push('message');
    setInvalid(bad);
    if (bad.length) { field(bad[0]).focus(); return; }

    status = 'sending';
    setSending(true);
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined,
    }).then(function (res) {
      clearTimeout(timer);
      setSending(false);
      if (res.ok) { settle(); status = 'sent'; showSent(payload.email); return; }
      if (res.status === 422) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          var fields = (data && data.fields) || [];
          settle(); status = 'idle'; setInvalid(fields);
          if (fields.length && dialog.open) field(fields[0]).focus();
        });
      }
      settle(); status = 'failed'; showFailed(res.status === 503);
    }).catch(function () {
      clearTimeout(timer);
      setSending(false);
      settle(); status = 'failed'; showFailed(false);
    });
  });

  // Any data-contact link opens the sheet.
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest('[data-contact]') : null;
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
  // The support address anywhere on the page opens the sheet too, like
  // effortzero.app (a mail app may not be set up). The links keep their mailto
  // in the HTML, so without this script they still open a mail app. Capture
  // runs before email.js, which then leaves the handled click alone. The
  // address inside the sheet ("Prefer your own email app?") keeps its mailto
  // and the copy bubble. Modifier and middle clicks behave as normal links.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
    if (!link || dialog.contains(link)) return;
    if (link.getAttribute('href').replace(/^mailto:/i, '').split('?')[0].toLowerCase() !== ADDRESS) return;
    e.preventDefault();
    open(link);
  }, true);

  // The moving green ring on every pill in the sheet and on the page's Write to
  // Us button.
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ring(el, hoverOn, light) {
    if (!fine || still || !el) return;
    el.classList.add('kc-ring');
    if (light) el.classList.add('kc-ring-light');
    var target = hoverOn || el;
    target.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mouse-x', x + 'px');
      el.style.setProperty('--mouse-y', y + 'px');
      if (hoverOn) el.classList.add('is-hot');
      var dx = (x / r.width - 0.5) * 2, dy = (y / r.height - 0.5) * 2;
      el.style.transition = 'transform 60ms linear';
      el.style.transform = 'translate(' + (dx * 4).toFixed(1) + 'px,' + (dy * 2).toFixed(1) + 'px)';
    });
    target.addEventListener('mouseleave', function () {
      el.classList.remove('is-hot');
      el.style.transition = 'transform 250ms ease-out';
      el.style.transform = 'translate(0px,0px)';
    });
  }
  Array.prototype.forEach.call(dialog.querySelectorAll('.kc-topic'), function (label) { ring(label.querySelector('span'), label); });
  Array.prototype.forEach.call(dialog.querySelectorAll('.kc-pill'), function (p) { ring(p); });
  ring(dialog.querySelector('.kc-send'), null, true);
  Array.prototype.forEach.call(document.querySelectorAll('.write-btn'), function (b) { ring(b, null, true); });
  // Done is drawn after a send, so it gets the ring when it appears.
  var ringDone = function (box) { var d = box && box.querySelector('.kc-done'); if (d) ring(d); };

  // /support#write opens it straight away.
  if (location.hash === '#write') open(null);
})();
