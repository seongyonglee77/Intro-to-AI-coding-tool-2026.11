/* ==========================================================================
   deck.js — scroller slide engine for talks (no dependencies, works from file://)
   Modes (URL):  (none) deck · ?presenter=1 · ?script=1 · ?embed=1 · ?print=1
   Body config:  data-theme data-logo data-total data-title data-author data-event
                 data-steps="off" (show builds at once) data-click="on" (click advances)
   Slide:        <section class="slide [cover|divider|closing|dark|full]" data-title data-time="min">
   Animation:    data-anim="up|down|left|right|zoom|pop|growy|growx|fade|none"  data-step="n"
                 data-count="61" data-type  .hub .loop (auto-drawn)  .demo[data-src]
   Notes:        <aside class="notes"><div data-n="guide|script|bridge|skip|qa|tips|terms|ko">…</div></aside>
   ========================================================================== */
(function () {
  'use strict';
  var D = document, W = window, body = D.body, root = D.documentElement;
  var Q = new URLSearchParams(location.search);
  var MODE = Q.has('presenter') ? 'presenter' : Q.has('script') ? 'script' : Q.has('embed') ? 'embed' : Q.has('print') ? 'print' : 'deck';
  var deck = D.getElementById('deck');
  var CFG = body.dataset;
  var S = [];                       // slide records
  var cur = 0, dir = 1, moving = false, navRaf = 0, lastY = 0, scrollRaf = 0, hudTimer = 0;
  var stepsOn = !(CFG.steps === 'off' || Q.get('steps') === 'all');
  var motionOn = !(Q.get('motion') === '0' || (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches));
  var presWin = null;
  var timer = { running: false, t0: 0, acc: 0, shown: false };
  var lang = (CFG.lang || 'en');

  /* ---------- helpers ------------------------------------------------------ */
  function $(sel, ctx) { return (ctx || D).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || D).querySelectorAll(sel)); }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(min) { var s = Math.round(min * 60), m = Math.floor(s / 60); s = s % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function fmtS(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  if (!motionOn) body.classList.add('nomotion');
  body.classList.add('mode-' + MODE);
  if (CFG.theme) root.setAttribute('data-theme', CFG.theme);
  if (CFG.title) D.title = CFG.title;
  if (CFG.lang) root.setAttribute('lang', CFG.lang);

  /* ---------- default auto-animation map ---------------------------------- */
  var AUTO = [
    ['.head > .kicker', 'up'], ['.head > .title', 'up'], ['.head > .sub', 'up'],
    ['.take', 'up'], ['.src', 'fade'],
    ['.cards > .card', 'up'], ['.flow > .node', 'up'], ['.chev > .step', 'left'],
    ['.vs > .side', 'up'], ['.vs > .mid', 'pop'],
    ['.stats > .stat', 'up'], ['.statrow > .it', 'left'],
    ['.bars', 'none'], ['.hbars', 'none'], ['.ring', 'none'],
    ['.tbl tbody tr', 'up'],
    ['.hub .core', 'pop'], ['.hub .sat', 'pop'], ['.hub svg.spokes', 'fade'],
    ['.loop .n', 'pop'], ['.loop .mid', 'fade'], ['.loop svg.arcs', 'fade'],
    ['.ladder > .rung', 'growy'], ['.tl .pt', 'up'], ['.strip > div', 'up'], ['.matrix > .q', 'zoom'],
    ['.chat > .msg', 'up'], ['.term .ln', 'fade'],
    ['.bul > li', 'left'], ['.chk > li', 'left'],
    ['.prompt', 'up'], ['.quote', 'left'], ['.note', 'up'], ['.shot', 'zoom'],
    ['.rule', 'left'], ['.pill', 'pop'], ['.bubble', 'pop'], ['.ava', 'pop'],
    ['.cover .event', 'up'], ['.cover .ttl', 'up'], ['.cover .who', 'up'],
    ['.divider .lab', 'up'], ['.divider .ttl', 'up'], ['.divider .desc', 'up'], ['.divider .dur', 'pop'],
    ['.closing .ttl', 'up'], ['.closing .msg2', 'up'], ['.closing .who', 'up'],
    ['.demo', 'zoom']
  ];

  /* ---------- parse & wrap slides ------------------------------------------ */
  function parse() {
    var els = $$(':scope > .slide', deck);
    var sec = 0, secName = '', secLabel = '', clock = 0;
    els.forEach(function (el, i) {
      var type = el.classList.contains('cover') ? 'cover' : el.classList.contains('divider') ? 'divider' : el.classList.contains('closing') ? 'closing' : 'content';
      if (type === 'content') el.classList.add('content');
      var notes = $(':scope > aside.notes', el);
      var title = el.dataset.title || txt($('.title,.ttl,h1,h2', el));
      var tmin = el.dataset.time !== undefined ? parseFloat(el.dataset.time) : ({ cover: 0.5, divider: 0.5, closing: 1, content: 2 })[type];
      if (type === 'divider') { sec++; secName = title; secLabel = txt($('.num', el)) || ('0' + sec); }
      if (type === 'cover') { secName = ''; }
      var rec = {
        el: el, i: i, type: type, title: title, time: tmin, start: clock, sec: sec, secName: secName, secLabel: secLabel,
        notes: notes, step: 0, maxStep: 0, anims: [], visited: false, drawn: false,
        kicker: txt($('.kicker,.event,.lab', el)), take: txt($('.take', el)), src: txt($('.src', el))
      };
      clock += tmin;
      var stage = D.createElement('div'); stage.className = 'stage';
      Array.prototype.slice.call(el.childNodes).forEach(function (n) { if (n !== notes) stage.appendChild(n); });
      el.appendChild(stage);
      if (type === 'divider') el.insertAdjacentHTML('afterbegin', '<div class="sp1"></div><div class="sp3"></div>');
      else el.insertAdjacentHTML('afterbegin', '<div class="spine"></div>');
      if (CFG.logo) {
        var isDark = el.matches('.dark,.cover,.divider,.closing'), im = D.createElement('img');
        im.className = 'logo'; im.alt = '';
        if (isDark && CFG.logoDark) im.src = CFG.logoDark; else { im.src = CFG.logo; if (isDark) im.classList.add('inv'); }
        el.appendChild(im);
      }
      if (notes) notes.hidden = true;
      S.push(rec);
    });
    S.totalPlan = clock;
  }

  /* ---------- live demo (iframe) frames ----------------------------------- */
  function buildDemos() {
    $$('.demo').forEach(function (d) {
      if (d.dataset.built) return; d.dataset.built = '1';
      d.classList.add('win');
      var src = d.dataset.src || '', poster = d.dataset.poster || '', label = d.dataset.label || src.split('/').pop();
      d.innerHTML =
        '<div class="wb"><span class="dots"><i></i><i></i><i></i></span><span class="url">' + esc(label) + '</span>' +
        '<span class="live-tag">LIVE</span>' +
        (src && src.indexOf('data:') !== 0 ? '<button class="open" type="button">Open ↗</button>' : '') + '</div>' +
        '<div class="vp">' + (poster ? '<img alt="" src="' + esc(poster) + '">' : '') +
        '<iframe title="' + esc(label) + '" data-src="' + esc(src) + '" allow="clipboard-write"></iframe>' +
        (src && MODE !== 'embed' ? '<button class="go" type="button"><svg class="ic fill"><use href="#i-play"/></svg>Launch live sample</button>' : '') + '</div>';
      var go = $('.go', d), op = $('.open', d);
      if (go) go.addEventListener('click', function () { launchDemo(d); });
      if (op) op.addEventListener('click', function () { W.open(src, '_blank'); });
    });
  }
  function launchDemo(d) {
    var f = $('iframe', d); if (!f.getAttribute('src')) f.setAttribute('src', f.dataset.src);
    d.classList.add('live');
    setTimeout(function () { try { f.focus(); f.contentWindow.focus(); } catch (e) {} }, 250);
  }
  function exitDemo() {
    var any = false;
    $$('.demo.live').forEach(function (d) { d.classList.remove('live'); any = true; });
    if (any) { try { W.focus(); D.activeElement && D.activeElement.blur && D.activeElement.blur(); } catch (e) {} }
    return any;
  }
  function toggleDemo() {
    var d = $('.demo', S[cur].el); if (!d) return;
    if (d.classList.contains('live')) exitDemo(); else launchDemo(d);
  }

  /* ---------- animation registry ------------------------------------------ */
  function prepAnims() {
    S.forEach(function (rec) {
      var el = rec.el;
      AUTO.forEach(function (pair) {
        if (!pair[1]) return;
        $$(pair[0], el).forEach(function (n) {
          if (n.hasAttribute('data-anim') || n.hasAttribute('data-step')) return;
          var p = n.parentElement && n.parentElement.closest('[data-anim]:not([data-anim="none"]),[data-step]');
          if (p && el.contains(p)) return;
          n.setAttribute('data-anim', pair[1]);
        });
      });
      var list = $$('[data-anim],[data-step],[data-count],[data-type]', el);
      var k0 = 0, gk = {};
      rec.anims = list.map(function (n) {
        var gate = 0, a = n;
        while (a && a !== el) { if (a.dataset && a.dataset.step) gate = Math.max(gate, parseInt(a.dataset.step, 10) || 0); a = a.parentElement; }
        var delay;
        if (n.dataset.d !== undefined) delay = parseInt(n.dataset.d, 10);
        else if (gate === 0) { delay = Math.min(140 + k0 * 70, 1100); k0++; }
        else { gk[gate] = (gk[gate] || 0); delay = Math.min(gk[gate] * 80, 480); gk[gate]++; }
        if (n.hasAttribute('data-count')) { n._cnt = true; n.textContent = cntText(n, 0); }
        if (n.hasAttribute('data-type')) { n._full = n.getAttribute('data-text') || n.textContent; n.textContent = ''; }
        n.style.setProperty('--dl', delay + 'ms');
        if (n.classList.contains('bars') || n.classList.contains('hbars')) {
          $$('.bar,.hb', n).forEach(function (b, bi) { b.style.setProperty('--bd', (0.25 + bi * 0.12) + 's'); });
        }
        return { n: n, gate: gate, on: false };
      });
      rec.maxStep = rec.anims.reduce(function (m, a) { return Math.max(m, a.gate); }, 0);
    });
  }
  function cntText(n, k) {
    var end = parseFloat(n.dataset.count), dec = parseInt(n.dataset.dec || '0', 10);
    var v = end * k, s = v.toFixed(dec);
    if (n.dataset.sep) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (n.dataset.pad) s = ('00000' + s).slice(-parseInt(n.dataset.pad, 10));
    return (n.dataset.prefix || '') + s + (n.dataset.suffix || '');
  }
  function runCount(n) {
    if (!motionOn || MODE === 'print') { n.textContent = cntText(n, 1); return; }
    cancelAnimationFrame(n._raf); var t0 = performance.now(), dur = 1300;
    (function tick(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); n.textContent = cntText(n, e); if (k < 1) n._raf = requestAnimationFrame(tick); })(t0);
  }
  function runType(n) {
    clearInterval(n._iv); var full = n._full, i = 0;
    if (!motionOn || MODE === 'print') { n.textContent = full; return; }
    n.classList.add('cur'); n._iv = setInterval(function () { i += 1; n.textContent = full.slice(0, i); if (i >= full.length) { clearInterval(n._iv); n.classList.remove('cur'); } }, 20);
  }
  function runRing(n) {
    var end = parseFloat(n.dataset.pct || '0'), t0 = performance.now(), dur = 1300, b = $('b', n);
    cancelAnimationFrame(n._raf);
    (function tick(t) { var k = motionOn ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3), v = end * e; n.style.setProperty('--pct', v.toFixed(1)); if (b) b.textContent = Math.round(v) + '%'; if (k < 1) n._raf = requestAnimationFrame(tick); })(t0);
  }
  function applyState(rec) {
    var inView = rec.el.classList.contains('in') || MODE === 'print';
    var st = stepsOn ? rec.step : 1e9;
    rec.anims.forEach(function (a) {
      var vis = inView && st >= a.gate, n = a.n;
      if (vis === a.on) return;
      a.on = vis;
      n.classList.toggle('on', vis);
      if (vis) {
        if (n._cnt) runCount(n);
        if (n._full !== undefined) runType(n);
        if (n.classList.contains('ring')) runRing(n);
      } else {
        if (n._cnt) { cancelAnimationFrame(n._raf); n.textContent = cntText(n, 0); }
        if (n._full !== undefined) { clearInterval(n._iv); n.textContent = ''; n.classList.remove('cur'); }
        if (n.classList.contains('ring')) { cancelAnimationFrame(n._raf); n.style.setProperty('--pct', 0); }
      }
    });
  }

  /* ---------- diagrams drawn from layout (hub spokes, loop arcs) ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function drawDiagrams(rec) {
    $$('.hub', rec.el).forEach(function (h) {
      var old = $('svg.spokes', h); if (old) old.remove();
      var core = $('.core', h); if (!core) return;
      var svg = D.createElementNS(NS, 'svg'); svg.setAttribute('class', 'spokes');
      svg.setAttribute('viewBox', '0 0 ' + h.offsetWidth + ' ' + h.offsetHeight);
      var cx = core.offsetLeft + core.offsetWidth / 2, cy = core.offsetTop + core.offsetHeight / 2;
      $$('.sat', h).forEach(function (s) {
        var l = D.createElementNS(NS, 'line');
        l.setAttribute('x1', cx); l.setAttribute('y1', cy); l.setAttribute('x2', s.offsetLeft); l.setAttribute('y2', s.offsetTop);
        svg.appendChild(l);
      });
      h.insertBefore(svg, h.firstChild);
      svg.setAttribute('data-anim', 'fade'); svg.style.setProperty('--dl', '100ms');
      if (!rec.anims.some(function (a) { return a.n === svg; })) rec.anims.push({ n: svg, gate: 0, on: false });
    });
    $$('.loop', rec.el).forEach(function (L) {
      var old = $('svg.arcs', L); if (old) old.remove();
      var nodes = $$('.n', L); if (nodes.length < 2) return;
      var W_ = L.offsetWidth, H_ = L.offsetHeight, cx = W_ / 2, cy = H_ / 2;
      var cs = getComputedStyle(L);
      var r = parseFloat(cs.getPropertyValue('--r')) || 230;
      var rx = parseFloat(cs.getPropertyValue('--rx')) || r, ry = parseFloat(cs.getPropertyValue('--ry')) || r;
      var svg = D.createElementNS(NS, 'svg'); svg.setAttribute('class', 'arcs'); svg.setAttribute('viewBox', '0 0 ' + W_ + ' ' + H_);
      svg.innerHTML = '<defs><marker id="ah' + rec.i + '" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1l8 4-8 4z" fill="currentColor"/></marker></defs>';
      var angs = nodes.map(function (n) { return parseFloat(getComputedStyle(n).getPropertyValue('--a')) || 0; });
      function pt(a) { var t = a * Math.PI / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; }
      function inside(p, n) { var mx = 14; return Math.abs(p[0] - n.offsetLeft) < n.offsetWidth / 2 + mx && Math.abs(p[1] - n.offsetTop) < n.offsetHeight / 2 + mx; }
      nodes.forEach(function (n, i) {
        var j = (i + 1) % nodes.length, a0 = angs[i], a1 = angs[j]; while (a1 <= a0) a1 += 360;
        var s = a0, e = a1, a;
        for (a = a0; a <= a1; a += 0.5) { if (!inside(pt(a), n)) { s = a; break; } }
        for (a = a1; a >= a0; a -= 0.5) { if (!inside(pt(a), nodes[j])) { e = a; break; } }
        if (e - s < 4) return;
        var p0 = pt(s), p1 = pt(e - 1.5), large = (e - s) > 180 ? 1 : 0;
        var path = D.createElementNS(NS, 'path');
        path.setAttribute('d', 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + rx + ' ' + ry + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1));
        path.setAttribute('marker-end', 'url(#ah' + rec.i + ')');
        svg.appendChild(path);
      });
      L.insertBefore(svg, L.firstChild);
      svg.setAttribute('data-anim', 'fade'); svg.style.setProperty('--dl', '200ms');
      if (!rec.anims.some(function (a) { return a.n === svg; })) rec.anims.push({ n: svg, gate: 0, on: false });
    });
    rec.drawn = true;
  }

  /* ---------- fit / scroll / current slide -------------------------------- */
  function fit() {
    var w = deck.clientWidth, h = deck.clientHeight;
    root.style.setProperty('--s', Math.min(w / 1920, h / 1080).toFixed(5));
  }
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      var h = deck.clientHeight, y = deck.scrollTop;
      for (var k = 0; k < S.length; k++) {
        var r = S[k], p = (r.el.offsetTop - y) / h;
        if (p > -1.05 && p < 1.05) {
          r.el.style.setProperty('--p', p.toFixed(4)); r.el.style.setProperty('--a', Math.min(1, Math.abs(p)).toFixed(4)); r.near = true;
          if (Math.abs(p) >= 0.999 && r.el.classList.contains('in') && k !== cur) leave(r);
        } else if (r.near) {
          r.el.style.setProperty('--p', p > 0 ? 1 : -1); r.el.style.setProperty('--a', 1); r.near = false;
          if (r.el.classList.contains('in') && k !== cur) leave(r);
        }
      }
      if (!moving) {
        var idx = Math.max(0, Math.min(S.length - 1, Math.round(y / h)));
        if (idx !== cur) { arrive(idx, y >= lastY ? 1 : -1); }
      }
      lastY = y;
      root.style.setProperty('--prog', S.length > 1 ? (y / h / (S.length - 1)).toFixed(4) : 0);
    });
  }
  function leave(r) { r.el.classList.remove('in'); applyState(r); $$('.demo.live', r.el).forEach(function (d) { d.classList.remove('live'); }); }
  function arrive(i, d) {
    var prev = S[cur]; dir = d || 1; cur = i;
    var r = S[i];
    if (!r.drawn) drawDiagrams(r);
    if (dir < 0) r.step = r.maxStep; else if (!r.visited) r.step = 0;
    r.visited = true;
    r.el.classList.add('in'); applyState(r);
    if (prev && prev !== r && Math.abs(prev.i - i) > 1) leave(prev);
    ui(); broadcast();
  }
  function smoothTo(y, dur) {
    cancelAnimationFrame(navRaf);
    var y0 = deck.scrollTop, t0 = performance.now();
    if (!motionOn || Math.abs(y - y0) < 2) { deck.scrollTop = y; moving = false; return; }
    moving = true; deck.classList.add('moving');
    (function tick(t) {
      var k = Math.min(1, (t - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      deck.scrollTop = y0 + (y - y0) * e;
      if (k < 1) navRaf = requestAnimationFrame(tick);
      else { deck.scrollTop = y; deck.classList.remove('moving'); moving = false; onScroll(); }
    })(t0);
  }
  function go(i) {
    i = Math.max(0, Math.min(S.length - 1, i)); if (i === cur) return;
    exitDemo();
    var d = i > cur ? 1 : -1, n = Math.abs(i - cur);
    arrive(i, d);
    smoothTo(S[i].el.offsetTop, Math.min(950, 620 + 90 * n));
  }
  function next() {
    var r = S[cur];
    if (stepsOn && r.step < r.maxStep) { r.step++; applyState(r); ui(); broadcast(); return; }
    go(cur + 1);
  }
  function prev() {
    var r = S[cur];
    if (stepsOn && r.step > 0) { r.step--; applyState(r); ui(); broadcast(); return; }
    go(cur - 1);
  }
  function setState(i, st) {          // used by presenter/embed sync
    if (i !== cur) { exitDemo(); var d = i > cur ? 1 : -1; arrive(i, d); smoothTo(S[i].el.offsetTop, 650); }
    if (st !== undefined && st !== null) { S[i].step = Math.max(0, Math.min(S[i].maxStep, st)); applyState(S[i]); ui(); }
  }

  /* ---------- notes ------------------------------------------------------- */
  var NLAB = {
    guide: ['Slide guide', '슬라이드 안내'], script: ['Script', '발표 대본'], bridge: ['Bridge', '연결 멘트'],
    skip: ['If short on time', '시간 부족 시'], qa: ['Likely questions', '예상 질문'], tips: ['Delivery tips', '전달 팁'],
    terms: ['Terms', '용어'], ko: ['KO summary', '한국어 요약'], clicks: ['Clicks', '클릭 순서']
  };
  var NORDER = ['guide', 'clicks', 'script', 'bridge', 'skip', 'qa', 'tips', 'terms', 'ko'];
  function notesParts(rec) {
    var out = {};
    if (rec.notes) $$(':scope > [data-n]', rec.notes).forEach(function (n) { out[n.dataset.n] = (out[n.dataset.n] || '') + n.innerHTML; });
    return out;
  }
  function notesHTML(rec, opt) {
    opt = opt || {};
    var parts = notesParts(rec), h = '';
    var startMin = rec.start, endMin = rec.start + rec.time;
    h += '<div class="nmeta"><span><b>Slide</b> ' + (rec.i + 1) + '/' + S.length + '</span>' +
      (rec.secName ? '<span><b>Part</b> ' + esc(rec.secLabel) + ' ' + esc(rec.secName) + '</span>' : '') +
      (rec.maxStep ? '<span><b>Clicks</b> ' + rec.maxStep + '</span>' : '') + '</div>';
    var keys = NORDER.filter(function (k) { return parts[k]; });
    Object.keys(parts).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    if (!keys.length) h += '<p class="nonotes">No notes for this slide.</p>';
    keys.forEach(function (k) {
      var lab = NLAB[k] || [k, ''];
      h += '<div class="nsec" data-k="' + k + '"><h4>' + lab[0] + (lab[1] ? '<span>' + lab[1] + '</span>' : '') + '</h4>' + parts[k] + '</div>';
    });
    return h;
  }

  /* ---------- chrome: rail, hud, dock, overlays --------------------------- */
  var elRail, elHud, elDock, elDockB, elDockT, elIdx, elHelp, elLaser, nfs = 17;
  function buildChrome() {
    var bt = D.createElement('div'); bt.className = 'bar-top'; body.appendChild(bt);
    elRail = D.createElement('nav'); elRail.className = 'rail'; elRail.setAttribute('aria-label', 'Slides');
    var many = S.length > 45;
    S.forEach(function (r) {
      if (many && r.type === 'content') return;
      var b = D.createElement('button'); b.type = 'button'; b.dataset.i = r.i; b.dataset.tip = (r.i + 1) + '. ' + r.title;
      if (r.type === 'divider') b.className = 'sec';
      b.addEventListener('click', function () { go(r.i); });
      elRail.appendChild(b);
    });
    body.appendChild(elRail);
    elHud = D.createElement('div'); elHud.className = 'hud';
    elHud.innerHTML = '<span class="pg"></span><span class="sc"></span><span class="timer"></span><button type="button" data-a="tp">▶/❚❚</button><button type="button" data-a="tr">reset</button>';
    body.appendChild(elHud);
    elHud.addEventListener('click', function (e) { var a = e.target.dataset && e.target.dataset.a; if (a === 'tp') timerToggle(); if (a === 'tr') timerReset(); });
    elDock = D.createElement('aside'); elDock.className = 'dock';
    elDock.innerHTML = '<div class="dock-h"><div class="t"></div><button type="button" data-a="m" title="Smaller text">A−</button><button type="button" data-a="p" title="Larger text">A+</button><button type="button" data-a="x" title="Close (N)">×</button></div><div class="dock-b"></div>';
    body.appendChild(elDock);
    elDockT = $('.t', elDock); elDockB = $('.dock-b', elDock);
    elDock.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.a;
      if (a === 'x') toggleDock(false);
      if (a === 'p') { nfs = Math.min(30, nfs + 2); elDock.style.setProperty('--nfs', nfs + 'px'); }
      if (a === 'm') { nfs = Math.max(13, nfs - 2); elDock.style.setProperty('--nfs', nfs + 'px'); }
    });
    elIdx = D.createElement('div'); elIdx.className = 'ov'; elIdx.innerHTML = '<button class="x" type="button">Close (Esc)</button><h2></h2><div class="grid"></div>'; body.appendChild(elIdx);
    elIdx.addEventListener('click', function (e) { if (e.target.classList.contains('x')) elIdx.classList.remove('open'); });
    elHelp = D.createElement('div'); elHelp.className = 'ov help'; body.appendChild(elHelp);
    elHelp.innerHTML = '<button class="x" type="button">Close (Esc)</button><h2>Keyboard</h2><div class="cols"><table>' +
      '<tr><td>→ ↓ Space PgDn</td><td>Next click / slide</td></tr><tr><td>← ↑ PgUp</td><td>Previous click / slide</td></tr>' +
      '<tr><td>Home / End</td><td>First / last slide</td></tr><tr><td>number + Enter</td><td>Jump to slide</td></tr>' +
      '<tr><td>G</td><td>Slide index (jump by title)</td></tr><tr><td>D</td><td>Launch / leave live sample on this slide</td></tr><tr><td>Esc</td><td>Close overlay / leave live sample</td></tr></table>' +
      '<table><tr><td>N</td><td>Notes panel (guide + script)</td></tr><tr><td>P</td><td>Presenter window (2nd screen)</td></tr>' +
      '<tr><td>S</td><td>Full script document (print / .md)</td></tr><tr><td>T</td><td>Timer vs. plan (Shift+T reset)</td></tr>' +
      '<tr><td>B</td><td>Builds on / off (show everything)</td></tr><tr><td>L</td><td>Laser pointer</td></tr>' +
      '<tr><td>H</td><td>Hide / show interface</td></tr><tr><td>F</td><td>Fullscreen</td></tr></table></div>';
    elHelp.addEventListener('click', function (e) { if (e.target.classList.contains('x')) elHelp.classList.remove('open'); });
    elLaser = D.createElement('div'); elLaser.className = 'laser'; body.appendChild(elLaser);
    D.addEventListener('mousemove', function (e) { elLaser.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; hudPing(); }, { passive: true });
  }
  function hudPing() { body.classList.add('hud-on'); clearTimeout(hudTimer); hudTimer = setTimeout(function () { body.classList.remove('hud-on'); }, 2600); }
  function ui() {
    var r = S[cur]; if (!r || !elRail) return;
    $$('button', elRail).forEach(function (b) { b.classList.toggle('on', +b.dataset.i === cur); });
    body.classList.toggle('tone-dark', r.el.matches('.dark,.cover,.divider,.closing'));
    body.classList.toggle('tone-light', !r.el.matches('.dark,.cover,.divider,.closing'));
    $('.pg', elHud).innerHTML = '<b>' + (cur + 1) + '</b> / ' + S.length;
    $('.sc', elHud).textContent = (timer.shown && r.secName) ? (r.secLabel + ' · ' + r.secName) : '';
    timerTick();
    if (elDockT) {
      elDockT.innerHTML = '<small>' + esc(r.kicker || r.type) + '</small>' + esc(r.title);
      elDockB.innerHTML = notesHTML(r); elDockB.scrollTop = 0;
    }
    hudPing();
    if (history.replaceState && MODE === 'deck') history.replaceState(null, '', '#' + (cur + 1));
    if (MODE === 'presenter') presUpdate();
  }
  function toggleDock(on) {
    on = on === undefined ? !body.classList.contains('dock-open') : on;
    var w = Math.round(Math.min(Math.max(W.innerWidth * 0.3, 380), 560));
    root.style.setProperty('--dock', on ? w + 'px' : '0px');
    body.classList.toggle('dock-open', on);
    var n = 0; (function f() { fit(); if (++n < 24) requestAnimationFrame(f); })();   // follow the css transition
    setTimeout(function () { deck.scrollTop = S[cur].el.offsetTop; }, 400);
  }
  function openIndex() {
    var h2 = $('h2', elIdx), g = $('.grid', elIdx); h2.textContent = (CFG.title || D.title) + ' — slide index';
    g.innerHTML = '';
    S.forEach(function (r) {
      var b = D.createElement('button'); b.className = 'gcard' + (r.i === cur ? ' cur' : '') + (r.type === 'divider' ? ' sec' : ''); b.type = 'button';
      b.innerHTML = '<div class="n">' + (r.i + 1) + (r.secName && r.type !== 'divider' ? ' · ' + esc(r.secLabel) : '') + '</div><div class="t">' + esc(r.title) + '</div><div class="m">' + fmt(r.start) + ' · ' + r.time + ' min' + (r.notes ? ' · notes' : '') + '</div>';
      b.addEventListener('click', function () { elIdx.classList.remove('open'); go(r.i); });
      g.appendChild(b);
    });
    elIdx.classList.add('open');
    var c = $('.gcard.cur', g); if (c) c.scrollIntoView({ block: 'center' });
  }

  /* ---------- timer -------------------------------------------------------- */
  function elapsed() { return timer.acc + (timer.running ? (performance.now() - timer.t0) / 1000 : 0); }
  function timerToggle() {
    if (timer.running) { timer.acc = elapsed(); timer.running = false; } else { timer.t0 = performance.now(); timer.running = true; }
    timerTick();
  }
  function timerReset() { timer.acc = 0; timer.running = false; timerTick(); }
  function timerTick() {
    if (!elHud) return;
    var t = $('.timer', elHud), r = S[cur], e = elapsed(), plan = r.start * 60, diff = e - plan, cls = '';
    if (timer.shown) {
      if (diff > 45) cls = 'late'; else if (diff < -45) cls = 'early';
      var ds = (diff >= 0 ? '+' : '−') + fmtS(Math.abs(diff));
      t.innerHTML = '⏱ ' + fmtS(e) + ' <span style="opacity:.7">plan ' + fmtS(plan) + '</span> <span class="' + cls + '">' + (timer.running || e > 0 ? ds + (diff >= 0 ? ' behind' : ' ahead') : '') + '</span> <span style="opacity:.6">/ ' + fmtS((CFG.total ? parseFloat(CFG.total) : S.totalPlan) * 60) + '</span>';
    } else t.textContent = '';
    $$('button', elHud).forEach(function (b) { b.style.display = timer.shown ? '' : 'none'; });
  }
  function timerShow(on) { timer.shown = on === undefined ? !timer.shown : on; body.classList.toggle('timer-on', timer.shown); if (timer.shown && !timer.running && elapsed() === 0) timerToggle(); timerTick(); }
  setInterval(function () { if (timer.shown) timerTick(); }, 1000);

  /* ---------- presenter window sync --------------------------------------- */
  function post(w, msg) { try { w && !w.closed && w.postMessage(msg, '*'); } catch (e) {} }
  var remote = false;               // true while applying a state that came from the other window (no echo)
  function broadcast() {
    var m = { deck: 'state', i: cur, step: S[cur] ? S[cur].step : 0, steps: stepsOn };
    if (MODE === 'deck' && !remote) post(presWin, m);
    if (MODE === 'presenter') { if (pv.synced && !remote) post(W.opener, { deck: 'cmd', cmd: 'goto', i: cur, step: S[cur].step }); presFrames(); }
  }
  function openPresenter() {
    var u = location.href.split('#')[0].split('?')[0] + '?presenter=1';
    presWin = W.open(u, 'deck_presenter', 'width=1400,height=880');
    setTimeout(broadcast, 800);
  }
  W.addEventListener('message', function (e) {
    var m = e.data; if (!m || typeof m !== 'object') return;
    if (m.deck === 'key') {                             // from a live sample iframe
      if (m.key === 'Escape') exitDemo();
      else if (m.key === 'PageDown') { exitDemo(); next(); } else if (m.key === 'PageUp') { exitDemo(); prev(); }
    } else if (m.deck === 'state' && MODE === 'presenter') {
      stepsOn = m.steps !== false; remote = true; setState(m.i, m.step); remote = false; pv.synced = true; presUpdate();
    } else if (m.deck === 'cmd' && MODE === 'deck') {
      remote = true;
      if (m.cmd === 'goto') setState(m.i, m.step); else if (m.cmd === 'next') next(); else if (m.cmd === 'prev') prev();
      remote = false;
    } else if (m.deck === 'hello' && MODE === 'deck') { presWin = e.source; broadcast(); }
    else if (m.deck === 'embed' && MODE === 'embed') embedShow(m.i, m.step);
  });

  /* ---------- embed mode (previews inside the presenter window) ---------- */
  function embedShow(i, st) {
    S.forEach(function (r) { r.el.classList.remove('target'); if (r.i !== i) { r.el.classList.remove('in'); applyState(r); } });
    var r = S[Math.max(0, Math.min(S.length - 1, i))]; if (!r) return;
    r.el.classList.add('target', 'in'); stepsOn = true;
    if (!r.drawn) drawDiagrams(r);
    r.step = st === undefined ? 0 : st; applyState(r); cur = r.i;
  }

  /* ---------- presenter view ---------------------------------------------- */
  var pv = {};
  function buildPresenter() {
    deck.style.display = 'none';
    var el = D.createElement('div'); el.className = 'pv';
    var u = location.href.split('#')[0].split('?')[0] + '?embed=1';
    el.innerHTML =
      '<div class="pv-top"><b class="pv-ttl"></b><span class="pv-time"></span><span class="pv-plan"></span><span class="sp"></span>' +
      '<button data-a="tp">▶/❚❚ timer</button><button data-a="tr">reset</button><button data-a="prev">◀ Prev</button><button data-a="next">Next ▶</button><button data-a="np">A+</button><button data-a="nm">A−</button></div>' +
      '<div class="pv-main"><div class="pv-left"><div class="pv-label">Now</div><div class="pv-fr cur"><iframe src="' + u + '" title="current"></iframe></div><div class="pv-notes"></div></div>' +
      '<div class="pv-right"><div class="pv-label">Next</div><div class="pv-fr nxt"><iframe src="' + u + '" title="next"></iframe></div><div class="pv-nexttitle"></div><div class="pv-label" style="margin-top:14px">Agenda</div><div class="pv-agenda"></div></div></div>';
    body.appendChild(el);
    pv.el = el; pv.cur = $('.pv-fr.cur iframe', el); pv.nxt = $('.pv-fr.nxt iframe', el);
    pv.notes = $('.pv-notes', el); pv.ag = $('.pv-agenda', el); pv.nt = $('.pv-nexttitle', el);
    $('.pv-ttl', el).textContent = CFG.title || D.title;
    el.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.a;
      if (a === 'tp') timerToggle(); if (a === 'tr') timerReset(); if (a === 'prev') prev(); if (a === 'next') next();
      if (a === 'np') { nfs = Math.min(34, nfs + 2); pv.notes.style.setProperty('--nfs', nfs + 'px'); }
      if (a === 'nm') { nfs = Math.max(13, nfs - 2); pv.notes.style.setProperty('--nfs', nfs + 'px'); }
      var ag = e.target.closest && e.target.closest('[data-g]'); if (ag) setStateAndSend(+ag.dataset.g);
    });
    S.forEach(function (r, i) {
      var b = D.createElement('button'); b.type = 'button'; b.dataset.g = i; b.className = r.type === 'divider' ? 'sec' : '';
      b.innerHTML = '<span>' + (i + 1) + '</span>' + esc(r.title) + '<em>' + fmt(r.start) + '</em>'; pv.ag.appendChild(b);
    });
    pv.cur.addEventListener('load', presFrames); pv.nxt.addEventListener('load', presFrames);
    if (W.opener) post(W.opener, { deck: 'hello' }); else pv.synced = true;
  }
  function setStateAndSend(i) { setState(i, 0); broadcast(); }
  function presFrames() {
    if (!pv.cur) return;
    post(pv.cur.contentWindow, { deck: 'embed', i: cur, step: S[cur].step });
    var n = Math.min(S.length - 1, cur + 1), st = S[cur].step < S[cur].maxStep ? S[cur].step + 1 : 0;
    if (S[cur].step < S[cur].maxStep) post(pv.nxt.contentWindow, { deck: 'embed', i: cur, step: st });
    else post(pv.nxt.contentWindow, { deck: 'embed', i: n, step: 0 });
  }
  function presUpdate() {
    if (!pv.el) return;
    var r = S[cur], n = S[Math.min(S.length - 1, cur + 1)];
    pv.notes.innerHTML = notesHTML(r); pv.notes.scrollTop = 0;
    pv.nt.innerHTML = (r.step < r.maxStep) ? '<b>Next click</b> on this slide (' + (r.step + 1) + '/' + r.maxStep + ')' : '<b>' + (n.i + 1) + '. ' + esc(n.title) + '</b><span>' + fmt(n.start) + ' · ' + n.time + ' min</span>';
    $$('button', pv.ag).forEach(function (b) { b.classList.toggle('on', +b.dataset.g === cur); });
    var on = $('button.on', pv.ag); if (on) on.scrollIntoView({ block: 'nearest' });
    presFrames();
  }
  function presTick() {
    if (!pv.el) return;
    var e = elapsed(), r = S[cur], diff = e - r.start * 60;
    $('.pv-time', pv.el).textContent = '⏱ ' + fmtS(e) + (timer.running ? '' : ' (paused)');
    var p = $('.pv-plan', pv.el); p.textContent = 'plan ' + fmtS(r.start * 60) + ' → ' + fmtS((r.start + r.time) * 60) + '  ·  ' + (e > 0 ? ((diff >= 0 ? '+' : '−') + fmtS(Math.abs(diff)) + (diff >= 0 ? ' behind' : ' ahead')) : '');
    p.className = 'pv-plan ' + (diff > 45 ? 'late' : diff < -45 ? 'early' : '');
  }
  setInterval(function () { if (MODE === 'presenter') presTick(); }, 500);

  /* ---------- script document --------------------------------------------- */
  function buildScript() {
    deck.style.display = 'none'; body.classList.add('script');
    var wrap = D.createElement('div'); wrap.className = 'sv';
    var total = CFG.total || S.totalPlan;
    var h = '<div class="sv-bar"><button onclick="print()">Print / save as PDF</button><button id="svmd">Download .md</button></div>' +
      '<h1>' + esc(CFG.title || D.title) + '</h1><p class="sv-meta">' + esc(CFG.author || '') + (CFG.event ? ' · ' + esc(CFG.event) : '') + ' · ' + S.length + ' slides</p>';
    h += '<h2>Slides</h2><table class="sv-toc"><tr><th>#</th><th>Slide</th></tr>';
    S.forEach(function (r) { h += '<tr class="' + (r.type === 'divider' ? 'sec' : '') + '"><td>' + (r.i + 1) + '</td><td>' + esc(r.title) + '</td></tr>'; });
    h += '</table>';
    S.forEach(function (r) {
      h += '<section class="sv-s"><h3><span>' + (r.i + 1) + '</span> ' + esc(r.title) + '</h3>' + notesHTML(r).replace(/class="nmeta"/, 'class="nmeta svm"');
      var on = [r.kicker, r.take].filter(Boolean); if (on.length) h += '<p class="sv-on"><b>On slide:</b> ' + esc(on.join('  ·  ')) + '</p>';
      h += '</section>';
    });
    wrap.innerHTML = h; body.appendChild(wrap);
    $('#svmd').addEventListener('click', function () {
      var md = '# ' + (CFG.title || D.title) + '\n\n' + (CFG.author || '') + (CFG.event ? ' — ' + CFG.event : '') + '\n\n';
      S.forEach(function (r) {
        md += '## ' + (r.i + 1) + '. ' + r.title + '\n\n';
        var p = notesParts(r), t = D.createElement('div');
        NORDER.concat(Object.keys(p)).filter(function (k, ix, a) { return p[k] && a.indexOf(k) === ix; }).forEach(function (k) {
          t.innerHTML = p[k]; md += '**' + (NLAB[k] ? NLAB[k][0] : k) + '**\n\n' + t.innerText.trim().replace(/\n{3,}/g, '\n\n') + '\n\n';
        });
      });
      var a = D.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'speaker-script.md'; a.click();
    });
  }

  /* ---------- keyboard ----------------------------------------------------- */
  var numBuf = '', numTimer = 0;
  W.addEventListener('keydown', function (e) {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, anyOv = elIdx && (elIdx.classList.contains('open') || elHelp.classList.contains('open'));
    if (MODE === 'script') return;
    if (k === 'Escape') { if (anyOv) { elIdx.classList.remove('open'); elHelp.classList.remove('open'); } else exitDemo(); return; }
    if (anyOv) return;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' && !e.shiftKey || k === 'Enter' && !numBuf) { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === ' ' && e.shiftKey || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(S.length - 1); }
    else if (/^[0-9]$/.test(k)) { numBuf += k; clearTimeout(numTimer); numTimer = setTimeout(function () { numBuf = ''; }, 1800); hudNum(); }
    else if (k === 'Enter' && numBuf) { go(parseInt(numBuf, 10) - 1); numBuf = ''; }
    else {
      var c = k.toLowerCase();
      if (MODE === 'presenter') { if (c === 't') timerToggle(); return; }
      if (c === 'n') toggleDock();
      else if (c === 'p') openPresenter();
      else if (c === 's') W.open(location.href.split('#')[0].split('?')[0] + '?script=1', '_blank');
      else if (c === 'g') openIndex();
      else if (c === 't') { if (e.shiftKey) timerReset(); else timerShow(); }
      else if (c === 'b') { stepsOn = !stepsOn; S.forEach(applyState); ui(); }
      else if (c === 'l') body.classList.toggle('laser-on');
      else if (c === 'h') body.classList.toggle('noui');
      else if (c === 'd') toggleDemo();
      else if (c === 'f') { if (D.fullscreenElement) D.exitFullscreen(); else root.requestFullscreen && root.requestFullscreen(); }
      else if (k === '?' || c === '/') elHelp.classList.toggle('open');
    }
  });
  function hudNum() { $('.sc', elHud).textContent = 'go to: ' + numBuf + ' ↵'; hudPing(); }
  D.addEventListener('click', function (e) {
    if (CFG.click === 'on' && MODE === 'deck') {
      if (e.target.closest('a,button,input,textarea,select,iframe,.demo,.dock,.ov,.rail,.hud')) return;
      next();
    }
  });

  /* ---------- init --------------------------------------------------------- */
  function init() {
    parse(); buildDemos(); prepAnims();
    if (MODE === 'script') { buildScript(); return; }
    if (MODE === 'print') {
      body.classList.add('print'); stepsOn = false;
      S.forEach(function (r) { r.el.classList.add('in'); drawDiagrams(r); applyState(r); });
      $$('.demo', deck).forEach(function (d) { var g = $('.go', d); if (g) g.remove(); });
      return;
    }
    fit();
    if (MODE === 'embed') {
      body.classList.add('embed'); W.addEventListener('resize', fit);
      if ('ResizeObserver' in W) new ResizeObserver(fit).observe(deck);
      embedShow(parseInt((location.hash || '#1').slice(1), 10) - 1 || 0, 0);
      return;
    }
    buildChrome();
    if (MODE === 'presenter') {
      buildPresenter(); body.classList.add('presenter');
      arrive(0, 1); return;
    }
    W.addEventListener('resize', function () { fit(); deck.scrollTop = S[cur].el.offsetTop; });
    if ('ResizeObserver' in W) new ResizeObserver(function () { fit(); }).observe(deck);
    deck.addEventListener('scroll', onScroll, { passive: true });
    var start = Math.max(0, Math.min(S.length - 1, (parseInt((location.hash || '').slice(1), 10) || 1) - 1));
    S.forEach(function (r) { drawDiagrams(r); });
    deck.scrollTop = S[start].el.offsetTop; lastY = deck.scrollTop;
    cur = -1; arrive(start, 1);
    onScroll();
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { S.forEach(function (r) { drawDiagrams(r); }); });
    W.addEventListener('hashchange', function () { var i = (parseInt((location.hash || '').slice(1), 10) || 1) - 1; if (i !== cur) go(i); });
    var savedSteps = stepsOn;
    W.addEventListener('beforeprint', function () { savedSteps = stepsOn; stepsOn = false; body.classList.add('print'); S.forEach(function (r) { r.el.classList.add('in'); applyState(r); }); });
    W.addEventListener('afterprint', function () { stepsOn = savedSteps; body.classList.remove('print'); S.forEach(function (r) { if (r.i !== cur) leave(r); else applyState(r); }); });
    if (Q.get('timer') === '1') timerShow(true);
    if (Q.get('notes') === '1') toggleDock(true);
  }
  W.DECK = { go: go, next: next, prev: prev, slides: S, get cur() { return cur; }, get step() { return S[cur].step; }, mode: MODE, fit: fit, drawDiagrams: drawDiagrams, applyState: applyState };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
