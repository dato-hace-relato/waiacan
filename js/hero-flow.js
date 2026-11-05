/*
  WAIACAN — hero animation: "from complexity to clarity".
  Tangled lines (business complexity) flow in from the left, run straight through the yellow
  WAIACAN bulb, get ordered inside it, and leave as parallel lines carrying yellow nodes
  (working solutions).

  - Desktop: a full-hero canvas behind the text; the "gate" is the bulb (.hero-visual img).
    The tangled part stays faint so the text keeps its contrast.
  - Phones (hero bulb hidden): a band under the call to action with its own small bulb.
  - Reduced motion: one still frame. Paused when the hero is off screen or the tab is hidden.
  No dependencies; plain canvas 2D.
*/
(function () {
  var root = document.querySelector('.hero-flow');
  if (!root) return;
  var canvas = root.querySelector('canvas');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  var hero = root.closest('.hero');
  var deskIcon = document.querySelector('.hero-visual img');
  var bandIcon = root.querySelector('.hero-flow-icon');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LINES = 14;
  var YELLOW = '255, 180, 0';
  var CHAOS = '184, 192, 204';   // muted blue-gray for the tangled side
  var ORDER = '245, 245, 245';   // soft white for the ordered side

  // Fixed pseudo-random values per line, so the drawing is stable between frames and loads.
  function rnd(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }
  var lines = [];
  for (var i = 0; i < LINES; i++) {
    lines.push({
      start: 0.08 + 0.84 * rnd(i, 1),          // where the line enters on the left (0-1 of height)
      f1: 0.006 + 0.010 * rnd(i, 2), f2: 0.013 + 0.016 * rnd(i, 3),
      p1: 6.28 * rnd(i, 4), p2: 6.28 * rnd(i, 5),
      s1: 0.25 + 0.35 * rnd(i, 6), s2: 0.2 + 0.3 * rnd(i, 7),
      pulse: rnd(i, 8), speed: 0.10 + 0.08 * rnd(i, 9)
    });
  }

  var W = 0, H = 0, dpr = 1, gate = null, mobile = false;

  function ease(u) { return u * u * (3 - 2 * u); }      // smoothstep

  function measure() {
    var r = root.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var icon = deskIcon && deskIcon.offsetParent ? deskIcon : bandIcon;
    mobile = icon === bandIcon;
    var ir = icon.getBoundingClientRect();
    // The bulb's round part spans ~8%-92% of the image width and is centered at ~42% of its height.
    gate = {
      x0: ir.left - r.left + ir.width * 0.08,
      x1: ir.right - r.left - ir.width * 0.08,
      cx: ir.left - r.left + ir.width * 0.5,
      cy: ir.top - r.top + ir.height * 0.42,
      spread: ir.height * 0.42
    };
  }

  function draw(t) {
    if (!gate) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = mobile ? 1.1 : 1.2;
    ctx.lineCap = 'round';

    var spacing = gate.spread / (LINES - 1);
    var chaosAmp = H * (mobile ? 0.28 : 0.22);

    // One continuous line per strand: tangled on the left, straightened *inside* the bulb
    // (it's fully ordered at the bulb's center), then ordered lines fanning gently to the right.
    // Color goes from faint blue-gray (behind the text) to soft white as the lines pass the bulb.
    var gl = ctx.createLinearGradient(0, 0, W, 0);
    var at = function (x) { return Math.max(0, Math.min(1, x / W)); };
    gl.addColorStop(0, 'rgba(' + CHAOS + ', ' + (mobile ? 0.18 : 0.07) + ')');
    gl.addColorStop(at(gate.x0 * 0.65), 'rgba(' + CHAOS + ', ' + (mobile ? 0.3 : 0.16) + ')');
    gl.addColorStop(at(gate.x0), 'rgba(' + CHAOS + ', 0.5)');
    gl.addColorStop(at(gate.cx), 'rgba(' + ORDER + ', 0.6)');
    gl.addColorStop(1, 'rgba(' + ORDER + ', 0.45)');
    ctx.strokeStyle = gl;

    var run = Math.max(1, W - gate.cx);              // ordered stretch, from the bulb's center
    var fan = function (x) { return 1 + 0.45 * ease(Math.min(1, x / (run * 0.7))); };
    var step = 5;
    for (var i = 0; i < LINES; i++) {
      var L = lines[i];
      var off = i - (LINES - 1) / 2;
      var gy = gate.cy + off * spacing;               // ordered height at the bulb's center
      var sy = H * L.start;                            // messy start height
      ctx.beginPath();
      for (var x = 0; x <= gate.cx; x += step) {
        var u = 1 - x / gate.cx;                       // 1 at the left edge, 0 at the bulb's center
        var e = ease(Math.min(1, u * 1.1));
        var wave = Math.sin(x * L.f1 + t * L.s1 + L.p1) * 0.6 + Math.sin(x * L.f2 - t * L.s2 + L.p2) * 0.4;
        var y = gy + (sy - gy) * e + chaosAmp * e * wave;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (x = 0; x <= run; x += 8) ctx.lineTo(gate.cx + x, gate.cy + off * spacing * fan(x));
      ctx.stroke();
    }

    // Yellow nodes: born at the bulb's center and travelling out to the edge along the ordered lines.
    ctx.fillStyle = 'rgb(' + YELLOW + ')';
    ctx.shadowColor = 'rgba(' + YELLOW + ', 0.7)';
    for (i = 0; i < LINES; i++) {
      off = i - (LINES - 1) / 2;
      L = lines[i];
      var p = (L.pulse + t * L.speed) % 1;
      var px = p * run;
      ctx.globalAlpha = Math.min(1, p * 8, (1 - p) * 4);   // appear inside the bulb, fade at the edge
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(gate.cx + px, gate.cy + off * spacing * fan(px), mobile ? 2.4 : 3, 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
  }

  var running = false, visible = true, start = performance.now(), raf = 0;
  function frame(now) {
    raf = 0;
    if (!running) return;
    draw((now - start) / 1000);
    raf = requestAnimationFrame(frame);
  }
  function setRunning(on) {
    running = on && visible && !document.hidden && !reduceMotion;
    if (running && !raf) raf = requestAnimationFrame(frame);
  }

  function refresh() {
    measure();
    draw((performance.now() - start) / 1000);
  }

  refresh();
  window.addEventListener('resize', refresh);
  // Layout shifts (web fonts, the hero title resizing) move the symbol; re-measure when they settle.
  if (window.ResizeObserver) new ResizeObserver(refresh).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      setRunning(true);
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { setRunning(true); });
  setRunning(true);
})();
