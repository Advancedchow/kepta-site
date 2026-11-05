// kepta.kitchen: the Write to Us form. Any link marked data-contact opens it
// (without this script those links simply go to /support#write, which shows
// the address). The message goes only to kepta.kitchen/api/contact, which
// hands it to Resend for delivery to support@kepta.kitchen. No tracking, no
// cookies. Ported from effortzero.app's contact dialog.
(function () {
  if (!window.HTMLDialogElement) return; // very old browsers keep the plain link

  var ADDRESS = 'support@kepta.kitchen';
  var TOPICS = ['A problem in the app', 'An idea', 'Kepta Plus', 'Something else'];
  var EMAIL_RE = /^[A-Za-z0-9_%+'-]+(?:\.[A-Za-z0-9_%+'-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

  var css =
    '.kc-dialog{border:0;padding:0;background:transparent;max-width:none;max-height:none;width:100%;height:100%;margin:0;overflow:auto;}' +
    '.kc-dialog::backdrop{background:rgba(20,30,26,.45);}' +
    '.kc-card{box-sizing:border-box;width:min(520px,calc(100% - 32px));margin:max(24px,6vh) auto 24px;background:#fff;color:#1c1c1a;' +
    'border-radius:16px;box-shadow:0 18px 50px rgba(15,40,30,.25);padding:22px 22px 18px;font:inherit;font-size:16px;line-height:1.5;}' +
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
    '.kc-note{margin:16px 0 0;padding-top:12px;border-top:1px solid #ECEBE5;font-size:.92rem;color:#6b6b64;}' +
    '.kc-note a,.kc-err a{color:#0F6E56;}' +
    '.kc-sent{font-size:1.1rem;margin:16px 0 0;outline:none;}' +
    '.kc-sent-to{margin:4px 0 0;color:#55554f;overflow-wrap:anywhere;}' +
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
      '<p class="kc-note">Prefer your own email app? <a href="mailto:' + ADDRESS + '">' + ADDRESS + '</a></p>' +
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

  function showFailed(unavailable) {
    var line = errLine();
    line.textContent = '';
    line.appendChild(document.createTextNode(unavailable
      ? 'The form is resting right now. Please write to '
      : "That didn't go through. Try again, or write to "));
    var a = document.createElement('a');
    a.href = 'mailto:' + ADDRESS;
    a.textContent = ADDRESS;
    line.appendChild(a);
    line.appendChild(document.createTextNode('.'));
  }

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
  // /support#write opens it straight away.
  if (location.hash === '#write') open(null);
})();
