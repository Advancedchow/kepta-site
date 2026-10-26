// kepta.kitchen: the only script on the site. The page is complete without it;
// this only adds the Rule 3 count-up where the browser supports it and the
// visitor has not asked for reduced motion.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var els = document.querySelectorAll('[data-count-to]');
  Array.prototype.forEach.call(els, function (el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (!(target > 0)) return;
    var finalText = el.textContent;

    // Only count when the figure starts below the fold, so nobody sees it jump backwards.
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return;

    el.textContent = '$0.00';
    var done = false;
    function finish() { done = true; el.textContent = finalText; }
    window.addEventListener('beforeprint', finish);

    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || done) return;
      io.disconnect();
      var start = null, ms = 900;
      function step(t) {
        if (done) return;
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / ms);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = '$' + (target * eased).toFixed(2);
        if (p < 1) requestAnimationFrame(step); else finish();
      }
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
  });
})();
