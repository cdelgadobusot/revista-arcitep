/* CIRCUITO · Entrada a la revista
   Las páginas no están escritas en la página web: viajan cifradas en contenido.enc y solo se arman en el navegador
   cuando una persona mantiene presionado el botón de entrada. Quien lee el enlace sin abrirlo en un navegador
   (buscadores y herramientas de IA que leen enlaces) solo ve esta portada y el aviso legal. */
(function () {
  'use strict';

  var HOLD = 1100;
  var intro = document.getElementById('intro');
  var btn = document.getElementById('hold');
  var lbl = btn.querySelector('.lbl');
  var err = document.getElementById('lockerr');
  var ENC = btn.getAttribute('data-enc');
  var JS = btn.getAttribute('data-js').split('|');
  var KA = 'qkk9Vtxu5B2uq4rBf7Ea1R', KB = '=UohXxHKXN4J3sL16v5ebL';
  var file = null, state = 'idle', timer = null;

  // ------------------------------------------------------------ Protección: sin copiar, arrastrar, imprimir ni guardar
  ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, true);
  });
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var k = (e.key || '').toLowerCase();
    if (k === 's' || k === 'p' || k === 'u' || k === 'c' || k === 'x' || k === 'a') e.preventDefault();
  }, true);

  // ------------------------------------------------------------ Contenido
  function msg(t) { err.textContent = t || ''; }
  function getFile() {
    if (file) return Promise.resolve(file);
    return fetch(ENC).then(function (r) {
      if (!r.ok) throw new Error('red');
      return r.arrayBuffer();
    }).then(function (b) { file = b; return b; }, function () { throw new Error('red'); });
  }
  getFile().catch(function () {});   // se descarga mientras tanto (sigue cifrado)
  function rev(s) { return s.split('').reverse().join(''); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function decrypt(buf) {
    // contenido.enc = 'CIR2' (4) + vector inicial (12) + datos cifrados (AES-256-GCM) con su etiqueta
    return crypto.subtle.importKey('raw', unb64(rev(KA) + rev(KB)), { name: 'AES-GCM' }, false, ['decrypt']).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 4, 12) }, k, new Uint8Array(buf, 16));
    });
  }
  function loadScripts(list) {
    return list.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (ok, ko) {
          var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.body.appendChild(s);
        });
      });
    }, Promise.resolve());
  }
  function mount(plain) {
    var n = new DataView(plain).getUint32(0);
    var meta = JSON.parse(new TextDecoder().decode(new Uint8Array(plain, 4, n)));
    var base = 4 + n, html = meta.book;
    meta.imgs.forEach(function (im) {
      var url = URL.createObjectURL(new Blob([new Uint8Array(plain, base + im[2], im[3])], { type: im[1] }));
      html = html.split(im[0]).join(url);
    });
    document.getElementById('book').innerHTML = html;
    document.getElementById('toclist').innerHTML = meta.toc;
    return loadScripts(JS);
  }
  function open() {
    var stage = 'red';
    getFile().then(function (buf) { stage = 'abrir'; return decrypt(buf); }).then(mount).then(function () {
      // revista.js ya escucha el clic en la portada: abre la revista con su música
      if (!intro.classList.contains('gone')) intro.click();
    }).catch(function () {
      state = 'idle'; btn.classList.remove('ok'); lbl.textContent = 'Mantén presionado para abrir';
      msg(stage === 'red' ? 'No se pudo cargar la revista. Revisa tu conexión y vuelve a intentarlo.'
        : 'La revista no terminó de abrir. Recarga la página y vuelve a intentarlo.');
      file = null;
    });
  }

  // ------------------------------------------------------------ Comprobación humana: mantener presionado
  function start(e) {
    if (state !== 'idle') return;
    if (e.type === 'pointerdown') {
      if (e.button > 0) return;
      try { btn.setPointerCapture(e.pointerId); } catch (x) {}
    }
    e.preventDefault();
    if (!window.crypto || !crypto.subtle) { msg('Este navegador no puede abrir la revista. Usa Chrome, Edge, Safari o Firefox actualizados.'); return; }
    state = 'holding'; msg('');
    btn.classList.remove('shake'); btn.classList.add('holding');
    timer = setTimeout(function () {
      state = 'opening'; btn.classList.remove('holding'); btn.classList.add('ok');
      lbl.textContent = 'Abriendo…';
      open();
    }, HOLD);
  }
  function cancel() {
    if (state !== 'holding') return;
    clearTimeout(timer); state = 'idle'; btn.classList.remove('holding');
    msg('Mantén el botón presionado un segundo, hasta que se llene.');
    void btn.offsetWidth; btn.classList.add('shake');
  }
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('lostpointercapture', cancel);
  btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
  btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') cancel(); });
  // El clic suelto del botón no abre nada por sí solo
  btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
})();
