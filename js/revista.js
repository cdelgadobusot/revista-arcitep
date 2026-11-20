/* CIRCUITO · Revista de ARCITEP · motor de la revista
   - Páginas que se pasan como un libro (StPageFlip)
   - Fondo de circuito animado que cambia de color por sección
   - Texto que se escribe solo, contadores, código que se teclea, sonido de página
   - Videos que arrancan solos y reels de Instagram en un visor
   - Música de fondo generada en el navegador, con un tema por sección (js/musica.js) */
(function () {
  'use strict';

  var BASE_W = 560, BASE_H = 792;
  var root = document.documentElement;
  var bookEl = document.getElementById('book');
  var pages = Array.prototype.slice.call(document.querySelectorAll('#book > .page'));
  var N = pages.length;

  // ---------------------------------------------------------------- Índice (se arma con las páginas que tienen data-toc)
  var tocList = document.getElementById('toclist');
  if (tocList && !tocList.children.length) {
    pages.forEach(function (p, i) {
      var t = p.getAttribute('data-toc'); if (!t) return;
      var li = document.createElement('li');
      li.innerHTML = '<a href="#p' + (i + 1) + '" data-go="' + i + '"><span>' + t + '</span><span>' + (i + 1) + '</span></a>';
      tocList.appendChild(li);
    });
  }

  // ---------------------------------------------------------------- Fotos: si un archivo falta, se oculta sin romper la página
  Array.prototype.forEach.call(document.querySelectorAll('.fig img, .pg img'), function (img) {
    img.addEventListener('error', function () { img.style.visibility = 'hidden'; });
  });

  // ---------------------------------------------------------------- Libro
  var stage = document.getElementById('stage'), wrap = document.getElementById('bookwrap');
  function fitWrap() {
    var r = stage.getBoundingClientRect(), cs = getComputedStyle(stage);
    var aw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = r.height;
    var ratio = BASE_W / BASE_H;
    var land = aw >= ah * ratio * 1.3;
    var w = land ? Math.min(aw, 2 * ah * ratio) : Math.min(aw, ah * ratio);
    wrap.style.width = Math.floor(w) + 'px';
  }
  fitWrap();
  var pf = new St.PageFlip(bookEl, {
    width: BASE_W, height: BASE_H, size: 'stretch',
    minWidth: 260, maxWidth: 1000, minHeight: 368, maxHeight: 1414,
    showCover: true, maxShadowOpacity: 0.5, mobileScrollSupport: false,
    usePortrait: true, flippingTime: 850, drawShadow: true, autoSize: true,
    clickEventForward: true, useMouseEvents: true, swipeDistance: 24, showPageCorners: true
  });
  pf.loadFromHTML(pages);

  function rescale() {
    try {
      var r = pf.getBoundsRect();
      var s = r.pageWidth / BASE_W;
      if (s > 0) root.style.setProperty('--s', s.toFixed(4));
    } catch (e) { /* aún sin medidas */ }
  }

  function visibleIdx() {
    var i = pf.getCurrentPageIndex();
    if (pf.getOrientation() === 'portrait') return [i];
    if (i === 0) return [0];
    var L = (i % 2 === 1) ? i : i - 1;
    var out = [L];
    if (L + 1 < N) out.push(L + 1);
    return out;
  }

  var current = [];
  var bg = null;
  var ui = {
    counter: document.getElementById('counter'),
    sec: document.getElementById('secname'),
    progress: document.getElementById('progress')
  };

  // Enciende una página una sola vez: sus animaciones arrancan y no se reinician mientras siga a la vista
  function turnOn(p) {
    if (p.classList.contains('on')) return;
    void p.offsetWidth; p.classList.add('on'); playPage(p);
  }
  function activate() {
    rescale();
    var vis = visibleIdx();
    pages.forEach(function (p, i) {
      if (vis.indexOf(i) !== -1) turnOn(p); else p.classList.remove('on');
    });
    current = vis;
    syncVideos(vis);
    var main = pages[vis[vis.length - 1]];
    if (MUS) MUS.setMood(MOOD[main.getAttribute('data-id')] || 'cierre');
    updateHold();
    var accent = main.getAttribute('data-accent') || '#4FA3FF';
    root.style.setProperty('--accent', accent);
    if (bg) bg.setAccent(accent);
    ui.sec.textContent = main.getAttribute('data-sec') || '';
    var a = vis[0] + 1, b = vis[vis.length - 1] + 1;
    ui.counter.textContent = (a === b ? a : a + '–' + b) + ' / ' + N;
    ui.progress.style.width = ((vis[vis.length - 1]) / (N - 1) * 100) + '%';
    try { history.replaceState(null, '', '#p' + a); } catch (e) {}
  }

  // Al empezar a pasar la hoja se encienden de una vez las páginas que van a aparecer:
  // así el contenido entra mientras gira la hoja y no se borra ni vuelve a aparecer al terminar.
  function preActivate() {
    var vis = visibleIdx(), L = vis[0], R = vis[vis.length - 1];
    var want = pf.getOrientation() === 'portrait' ? [L - 1, L + 1] : [R + 1, R + 2, L - 2, L - 1];
    want.forEach(function (i) { if (i >= 0 && i < N) turnOn(pages[i]); });
  }

  // ---------------------------------------------------------------- Música de fondo (un tema por sección)
  var MUS = window.CircuitoMusica || null, musicOn = true, musicHold = false, opened = false;
  try { musicOn = localStorage.getItem('circuito-musica') !== '0'; } catch (e) {}
  var MOOD = {
    portada: 'inicio', sumario: 'inicio', intro: 'inicio', bios: 'inicio', bios2: 'inicio',
    mision: 'empresa', plan: 'empresa', perfil: 'empresa', modelo: 'producto', ingresos: 'producto', marca: 'ventas',
    metodo: 'producto', ruta: 'producto', tarifas: 'producto', herramientas: 'producto', estructura: 'producto',
    formacion: 'impacto', impacto: 'impacto', competencias: 'impacto',
    video: 'video', video2: 'video',
    alcance: 'impacto', wro: 'impacto', personal: 'producto',
    zonas: 'ventas', promocion: 'ventas', embudo: 'ventas', venta: 'ventas', resenas: 'ventas', marketing: 'ventas', evaluacion: 'ventas'
  };
  var mBtn = document.getElementById('music');
  function paintMusic() {
    if (!mBtn) return;
    mBtn.style.opacity = musicOn ? '1' : '.45';
    mBtn.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    mBtn.title = musicOn ? 'Apagar la música' : 'Encender la música';
  }
  paintMusic();
  function musicSync() {
    if (!MUS || !actx) return;
    if (musicOn && !musicHold && opened && !document.hidden) MUS.start(actx); else MUS.stop();
  }
  // La música baja sola mientras suena un reel o un video con sonido
  function updateHold() {
    var h = !!(ig && ig.classList.contains('open'));
    Array.prototype.forEach.call(document.querySelectorAll('video'), function (v) { if (!v.paused && !v.muted) h = true; });
    musicHold = h; musicSync();
  }
  if (mBtn) mBtn.addEventListener('click', function () {
    musicOn = !musicOn; ensureAudio(); paintMusic(); musicSync();
    try { localStorage.setItem('circuito-musica', musicOn ? '1' : '0'); } catch (e) {}
  });
  document.addEventListener('visibilitychange', function () {
    if (!actx) return;
    if (document.hidden) { try { actx.suspend(); } catch (e) {} } else { try { actx.resume(); } catch (e) {} musicSync(); }
  });


  // ---------------------------------------------------------------- Videos: se reproducen solos al aparecer su página
  function syncVideos(vis) {
    pages.forEach(function (p, i) {
      var on = vis.indexOf(i) !== -1;
      Array.prototype.forEach.call(p.querySelectorAll('video'), function (v) {
        if (on) {
          if (!v.getAttribute('src') && v.getAttribute('data-src')) {
            v.setAttribute('src', v.getAttribute('data-src'));
            v.addEventListener('loadeddata', function () { v.parentNode.classList.add('has-video'); });
            v.addEventListener('error', function () { v.parentNode.classList.remove('has-video'); v.remove(); });
          }
          v.muted = v._unmuted ? false : true;
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        } else if (!v.paused) { v.pause(); }
      });
    });
  }
  document.addEventListener('click', function (e) {
    var m = e.target.closest ? e.target.closest('.mute') : null;
    if (!m) return;
    e.preventDefault(); e.stopPropagation();
    var v = m.parentNode.querySelector('video'); if (!v) return;
    v._unmuted = v.muted; v.muted = !v.muted;
    m.textContent = v.muted ? '🔇 Activar sonido' : '🔊 Silenciar';
    if (v.paused) v.play();
    updateHold();
  }, true);

  // ---------------------------------------------------------------- Reels de Instagram dentro de la revista
  var ig = document.getElementById('igbox'), igf = document.getElementById('igframe'), igl = document.getElementById('iglink');
  function openIG(code) {
    pages.forEach(function (p) { Array.prototype.forEach.call(p.querySelectorAll('video'), function (v) { v.pause(); }); });
    igf.src = 'https://www.instagram.com/reel/' + code + '/embed/';
    igl.href = 'https://www.instagram.com/reel/' + code + '/';
    ig.classList.add('open');
    updateHold();
  }
  function closeIG() { ig.classList.remove('open'); igf.src = 'about:blank'; syncVideos(current); updateHold(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-ig]') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    openIG(b.getAttribute('data-ig'));
  }, true);
  document.getElementById('igclose').onclick = closeIG;
  ig.addEventListener('click', function (e) { if (e.target === ig) closeIG(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ig.classList.contains('open')) closeIG(); });

  // ---------------------------------------------------------------- Animaciones por página
  function playPage(p) {
    // contadores
    Array.prototype.forEach.call(p.querySelectorAll('[data-count]'), function (el) {
      var to = parseFloat(el.getAttribute('data-count')), t0 = null, dur = 1300;
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      }
      el.textContent = '0'; requestAnimationFrame(step);
    });
    // donas
    Array.prototype.forEach.call(p.querySelectorAll('[data-donut]'), function (el) {
      var to = parseFloat(el.getAttribute('data-donut')), t0 = null, dur = 1400, lab = el.querySelector('span');
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = to * e;
        el.style.setProperty('--pv', v.toFixed(1));
        if (lab) lab.textContent = Math.round(v) + ' %';
        if (k < 1) requestAnimationFrame(step);
      }
      el.style.setProperty('--pv', 0); requestAnimationFrame(step);
    });
    // texto que se escribe solo
    Array.prototype.forEach.call(p.querySelectorAll('[data-type]'), function (el) { typeText(el, el.getAttribute('data-type')); });
    // código
    Array.prototype.forEach.call(p.querySelectorAll('[data-code]'), function (el) { typeCode(el); });
    // etiquetas que se "decodifican" letra por letra
    Array.prototype.forEach.call(p.querySelectorAll('.kicker'), function (el) { decode(el); });
  }

  var GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#';
  function decode(el) {
    if (el.children.length) return;
    var fin = el._txt || (el._txt = el.textContent);
    if (el._raf) cancelAnimationFrame(el._raf);
    var t0 = null, dur = 750;
    function f(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), n = Math.floor(fin.length * k), out = fin.slice(0, n);
      for (var i = n; i < fin.length; i++) out += /\s/.test(fin[i]) ? fin[i] : GLY.charAt(Math.floor(Math.random() * GLY.length));
      el.textContent = out;
      if (k < 1) el._raf = requestAnimationFrame(f); else el.textContent = fin;
    }
    el._raf = requestAnimationFrame(f);
  }

  // Citas destacadas: cada palabra en su propio span para que entren una a una
  Array.prototype.forEach.call(document.querySelectorAll('.pq'), function (el) {
    if (el.children.length) return;
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w, i) {
      return '<span class="w" style="--i:' + i + '">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
    }).join(' ');
  });

  function typeText(el, txt) {
    if (el._timer) clearInterval(el._timer);
    var i = 0; el.innerHTML = '<span class="caret"></span>';
    setTimeout(function () {
      el._timer = setInterval(function () {
        i++; el.innerHTML = txt.slice(0, i) + '<span class="caret"></span>';
        if (i >= txt.length) { clearInterval(el._timer); }
      }, 75);
    }, 700);
  }

  var CODE = [
    [['from ', 'kw'], ['pybricks.pupdevices '], ['import ', 'kw'], ['Motor']], [['\n']],
    [['from ', 'kw'], ['pybricks.parameters '], ['import ', 'kw'], ['Port, Direction']], [['\n']],
    [['from ', 'kw'], ['pybricks.robotics '], ['import ', 'kw'], ['DriveBase']], [['\n\n']],
    [['izq = '], ['Motor', 'fn'], ['(Port.A, Direction.COUNTERCLOCKWISE)\n']],
    [['der = '], ['Motor', 'fn'], ['(Port.B)\n']],
    [['robot = '], ['DriveBase', 'fn'], ['(izq, der,\n                 wheel_diameter='], ['56', 'nu'], [', axle_track='], ['112', 'nu'], [')\n\n']],
    [['# Un cuadrado de 30 cm de lado\n', 'cm']],
    [['for ', 'kw'], ['lado '], ['in ', 'kw'], ['range', 'fn'], ['('], ['4', 'nu'], ['):\n']],
    [['    robot.'], ['straight', 'fn'], ['('], ['300', 'nu'], [')   '], ['# avanza 300 mm\n', 'cm']],
    [['    robot.'], ['turn', 'fn'], ['('], ['90', 'nu'], [')        '], ['# gira 90 grados', 'cm']]
  ];
  var SEG = [];
  CODE.forEach(function (line) { line.forEach(function (s) { SEG.push(s); }); });
  var TOTAL = SEG.reduce(function (n, s) { return n + s[0].length; }, 0);
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function renderCode(k) {
    var out = '', left = k;
    for (var i = 0; i < SEG.length && left > 0; i++) {
      var t = SEG[i][0].slice(0, left); left -= t.length;
      out += SEG[i][1] ? '<span class="' + SEG[i][1] + '">' + esc(t) + '</span>' : esc(t);
    }
    return out + '<span class="caret"></span>';
  }
  function typeCode(el) {
    if (el._timer) clearInterval(el._timer);
    var k = 0; el.innerHTML = renderCode(0);
    el._timer = setInterval(function () {
      k += 3; el.innerHTML = renderCode(k);
      if (k >= TOTAL) clearInterval(el._timer);
    }, 28);
  }

  // ---------------------------------------------------------------- Sonido de página (sintetizado)
  var actx = null, soundOn = true;
  try { soundOn = localStorage.getItem('circuito-sonido') !== '0'; } catch (e) {}
  var sBtn = document.getElementById('sound');
  function paintSound() { sBtn.style.opacity = soundOn ? '1' : '.45'; sBtn.querySelector('.w').style.display = soundOn ? '' : 'none'; }
  paintSound();
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function flipSound() {
    if (!soundOn || !actx) return;
    var t = actx.currentTime, len = 0.32, sr = actx.sampleRate;
    var buf = actx.createBuffer(1, Math.floor(sr * len), sr), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) { d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6); }
    var src = actx.createBufferSource(); src.buffer = buf;
    var bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(700, t + len);
    var g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp); bp.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + len);
  }
  sBtn.addEventListener('click', function () {
    soundOn = !soundOn; ensureAudio(); paintSound();
    try { localStorage.setItem('circuito-sonido', soundOn ? '1' : '0'); } catch (e) {}
  });

  // ---------------------------------------------------------------- Eventos del libro
  var hint = document.getElementById('hint'), flips = 0;
  pf.on('flip', function () { activate(); if (++flips >= 1) hint.classList.add('off'); });
  pf.on('changeState', function (e) {
    if (e.data === 'flipping') flipSound();
    if (e.data === 'read') setTimeout(activate, 30); else preActivate();
  });
  pf.on('changeOrientation', function () { setTimeout(activate, 50); });
  pf.on('init', function () { setTimeout(activate, 30); });
  window.addEventListener('resize', function () { fitWrap(); try { pf.update(); } catch (e) {} setTimeout(activate, 120); });
  setTimeout(function () { hint.classList.add('off'); }, 12000);

  function go(i) {
    i = Math.max(0, Math.min(N - 1, i));
    // la página de destino se enciende antes de girar, para que no parpadee al llegar
    var t = pf.getOrientation() === 'portrait' || i === 0 ? [i] : (i % 2 === 1 ? [i, i + 1] : [i - 1, i]);
    t.forEach(function (k) { if (k >= 0 && k < N) turnOn(pages[k]); });
    pf.flip(i);
  }
  document.getElementById('prev').onclick = document.getElementById('prevS').onclick = function () { ensureAudio(); pf.flipPrev(); };
  document.getElementById('next').onclick = document.getElementById('nextS').onclick = function () { ensureAudio(); pf.flipNext(); };
  document.addEventListener('keydown', function (e) {
    if (ig.classList.contains('open')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { ensureAudio(); pf.flipNext(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { ensureAudio(); pf.flipPrev(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(N - 1);
    else if (e.key === 'Escape') toc.classList.remove('open');
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-go]') : null;
    if (a) { e.preventDefault(); ensureAudio(); toc.classList.remove('open'); go(parseInt(a.getAttribute('data-go'), 10)); }
  });

  var toc = document.getElementById('toc');
  document.getElementById('tocbtn').onclick = function () { toc.classList.add('open'); };
  document.getElementById('tocclose').onclick = function () { toc.classList.remove('open'); };
  toc.addEventListener('click', function (e) { if (e.target === toc) toc.classList.remove('open'); });

  document.getElementById('fs').onclick = function () {
    var d = document;
    if (!d.fullscreenElement) { (root.requestFullscreen || root.webkitRequestFullscreen || function () {}).call(root); }
    else { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    setTimeout(activate, 400);
  };

  // Pantalla de entrada
  var intro = document.getElementById('intro');
  function openMag() {
    ensureAudio();
    opened = true; musicSync();
    intro.classList.add('gone');
    current = []; activate();
    var m = /#p(\d+)/.exec(location.hash);
    if (m) { var t = parseInt(m[1], 10) - 1; if (t > 0) setTimeout(function () { pf.turnToPage(t); activate(); }, 300); }
  }
  intro.addEventListener('click', openMag);
  if (/[?&]directo/.test(location.search)) openMag();

  // ---------------------------------------------------------------- Fondo de circuito
  bg = (function () {
    var cv = document.getElementById('bg'), cx = cv.getContext('2d');
    var W, H, DPR, traces = [], pulses = [], dots = [];
    var col = [79, 163, 255], target = [79, 163, 255], mx = 0, my = 0, tmx = 0, tmy = 0;
    function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
    function build() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR; cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var G = 46, n = Math.round((W * H) / 26000);
      traces = []; pulses = []; dots = [];
      for (var k = 0; k < n; k++) {
        var x = Math.round(Math.random() * W / G) * G, y = Math.round(Math.random() * H / G) * G;
        var pts = [[x, y]], dir = Math.floor(Math.random() * 4), segs = 3 + Math.floor(Math.random() * 6);
        for (var s = 0; s < segs; s++) {
          if (Math.random() < 0.55) dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
          var L = G * (1 + Math.floor(Math.random() * 4));
          x += [L, 0, -L, 0][dir]; y += [0, L, 0, -L][dir];
          pts.push([x, y]);
        }
        var len = 0; for (var q = 1; q < pts.length; q++) len += Math.abs(pts[q][0] - pts[q - 1][0]) + Math.abs(pts[q][1] - pts[q - 1][1]);
        traces.push({ pts: pts, len: len, a: 0.05 + Math.random() * 0.08 });
        if (Math.random() < 0.6) pulses.push({ t: traces.length - 1, p: Math.random(), v: 0.0009 + Math.random() * 0.0018 });
      }
      for (var d = 0; d < 46; d++) dots.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.6, vy: -0.06 - Math.random() * 0.18, a: 0.15 + Math.random() * 0.35 });
    }
    function posAt(tr, f) {
      var dist = f * tr.len, pts = tr.pts;
      for (var i = 1; i < pts.length; i++) {
        var sl = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
        if (dist <= sl) { var k = sl ? dist / sl : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
        dist -= sl;
      }
      return pts[pts.length - 1];
    }
    function frame() {
      for (var c = 0; c < 3; c++) col[c] += (target[c] - col[c]) * 0.03;
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      var rgb = Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]);
      cx.clearRect(0, 0, W, H);
      var grd = cx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
      grd.addColorStop(0, '#062463'); grd.addColorStop(0.55, '#021446'); grd.addColorStop(1, '#000A2B');
      cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
      cx.save(); cx.translate(mx * 14, my * 10);
      cx.lineWidth = 1.4; cx.lineJoin = 'round';
      for (var i = 0; i < traces.length; i++) {
        var tr = traces[i];
        cx.strokeStyle = 'rgba(' + rgb + ',' + tr.a + ')';
        cx.beginPath(); cx.moveTo(tr.pts[0][0], tr.pts[0][1]);
        for (var j = 1; j < tr.pts.length; j++) cx.lineTo(tr.pts[j][0], tr.pts[j][1]);
        cx.stroke();
        var e = tr.pts[tr.pts.length - 1];
        cx.fillStyle = 'rgba(' + rgb + ',' + (tr.a * 2.2) + ')';
        cx.beginPath(); cx.arc(e[0], e[1], 2.6, 0, 6.283); cx.fill();
      }
      for (var p = 0; p < pulses.length; p++) {
        var pu = pulses[p], t = traces[pu.t];
        pu.p += pu.v * (1100 / Math.max(300, t.len)); if (pu.p > 1) pu.p = 0;
        var pos = posAt(t, pu.p);
        var g2 = cx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], 14);
        g2.addColorStop(0, 'rgba(' + rgb + ',.95)'); g2.addColorStop(1, 'rgba(' + rgb + ',0)');
        cx.fillStyle = g2; cx.beginPath(); cx.arc(pos[0], pos[1], 14, 0, 6.283); cx.fill();
      }
      cx.restore();
      for (var d = 0; d < dots.length; d++) {
        var o = dots[d]; o.y += o.vy; if (o.y < -4) { o.y = H + 4; o.x = Math.random() * W; }
        cx.fillStyle = 'rgba(255,255,255,' + o.a + ')'; cx.beginPath(); cx.arc(o.x + mx * 24, o.y + my * 18, o.r, 0, 6.283); cx.fill();
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', build);
    window.addEventListener('mousemove', function (e) { tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5; });
    build(); requestAnimationFrame(frame);
    return { setAccent: function (h) { target = hex(h); } };
  })();

  // Arranque
  setTimeout(activate, 60);
})();
