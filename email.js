// kepta.kitchen: makes the support email work even where a mailto link cannot.
// A mailto link only opens something when the device has a mail app set up
// (an iPhone without Apple Mail, a computer with no mail program, and the
// browsers inside Instagram, LinkedIn or TikTok often do nothing). So a tap on
// the address still tries the mail app, and it also copies the address and says
// so. No tracking, no cookies, nothing sent anywhere. Without this script the
// links work exactly as plain mailto links.
(function () {
  var links = document.querySelectorAll('a[href^="mailto:"]');
  if (!links.length) return;

  var style = document.createElement('style');
  style.textContent =
    'a[href^="mailto:"]{-webkit-user-select:all;user-select:all;}' +
    '.kepta-copied{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));' +
    'margin:0 auto;width:fit-content;max-width:440px;box-sizing:border-box;' +
    'background:#0F6E56;color:#fff;font:15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'padding:12px 16px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:9999;text-align:center;}' +
    '.kepta-copied[hidden]{display:none;}';
  document.head.appendChild(style);

  var note = document.createElement('div');
  note.className = 'kepta-copied';
  note.setAttribute('role', 'status');
  note.setAttribute('aria-live', 'polite');
  note.hidden = true;
  document.body.appendChild(note);
  var timer = null;

  function show(text) {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function () { note.hidden = true; }, 6000);
  }

  function fallbackCopy(text) {
    var box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.top = '-1000px';
    document.body.appendChild(box);
    box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(box);
    return ok;
  }

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function () {
      // Never stop the link: the mail app still opens wherever it can.
      var address = link.getAttribute('href').replace(/^mailto:/i, '').split('?')[0];
      var copied = 'Copied ' + address + '. If no email app opened, paste it into a new email.';
      var plain = 'Our email is ' + address + '. If no email app opened, write to it from any email.';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(
          function () { show(copied); },
          function () { show(fallbackCopy(address) ? copied : plain); }
        );
      } else {
        show(fallbackCopy(address) ? copied : plain);
      }
    });
  });
})();
