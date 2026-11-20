/* CIRCUITO · Música de fondo
   Se genera en el navegador con Web Audio: es original, no usa archivos ni tiene derechos de autor.
   Cada sección de la revista tiene su propio tema (acordes, tempo y brillo) y el cambio entre temas es suave. */
(function (w) {
  'use strict';

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Cada tema: tempo, brillo del filtro, percusión suave y cuatro acordes [bajo, [notas del acorde]]
  var MOODS = {
    inicio:   { bpm: 78, bright: 1500, hat: 0, kick: 0, arp: 1, prog: [[36, [55, 59, 62, 64]], [45, [55, 59, 60, 64]], [41, [57, 60, 64, 67]], [43, [55, 60, 62, 67]]] },
    empresa:  { bpm: 80, bright: 1400, hat: 0, kick: 0, arp: 1, prog: [[38, [53, 57, 60, 64]], [43, [53, 57, 59, 62]], [46, [53, 57, 58, 62]], [36, [52, 55, 60, 64]]] },
    producto: { bpm: 84, bright: 1900, hat: 1, kick: 0, arp: 1, prog: [[43, [54, 59, 62, 66]], [40, [54, 59, 62, 67]], [36, [55, 59, 64, 67]], [38, [54, 57, 62, 66]]] },
    impacto:  { bpm: 86, bright: 2000, hat: 1, kick: 1, arp: 1, prog: [[41, [57, 60, 64, 65]], [40, [55, 60, 64, 67]], [38, [57, 60, 62, 65]], [34, [57, 60, 62, 65]]] },
    video:    { bpm: 92, bright: 2400, hat: 1, kick: 1, arp: 1, prog: [[45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [36, [55, 60, 64, 67]], [43, [55, 59, 62, 67]]] },
    ventas:   { bpm: 88, bright: 2100, hat: 1, kick: 1, arp: 1, prog: [[40, [55, 59, 62, 66]], [45, [55, 59, 61, 64]], [40, [55, 59, 62, 66]], [47, [54, 57, 59, 62]]] },
    cierre:   { bpm: 72, bright: 1200, hat: 0, kick: 0, arp: 2, prog: [[41, [57, 60, 64, 67]], [40, [55, 59, 62, 67]], [38, [57, 60, 64, 65]], [36, [55, 59, 62, 64]]] }
  };
  var ARP = [0, 1, 2, 3, 4, 3, 2, 1];
  var VOL = 0.55;

  function impulse(ctx, secs) {
    var len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return b;
  }
  function noise(ctx) {
    var b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function Engine(ctx, dest) {
    this.ctx = ctx;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.master.connect(comp); comp.connect(dest || ctx.destination);
    // reverberación
    this.rev = ctx.createConvolver(); this.rev.buffer = impulse(ctx, 2.8);
    var rg = ctx.createGain(); rg.gain.value = 0.32; this.rev.connect(rg); rg.connect(this.master);
    // eco
    this.dly = ctx.createDelay(2); this.dly.delayTime.value = 0.54;
    var fb = ctx.createGain(); fb.gain.value = 0.3; var dg = ctx.createGain(); dg.gain.value = 0.2;
    this.dly.connect(fb); fb.connect(this.dly); this.dly.connect(dg); dg.connect(this.master);
    // filtro del colchón de acordes
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 1500; this.lp.Q.value = 0.4;
    this.lp.connect(this.master); this.lp.connect(this.rev);
    this.dry = ctx.createGain(); this.dry.gain.value = 1; this.dry.connect(this.master);
    this.noise = noise(ctx);
    this.mood = MOODS.inicio; this.next = null; this.step = 0; this.bar = 0; this.t = ctx.currentTime + 0.1; this.ch = this.mood.prog[0];
  }
  Engine.prototype.eighth = function () { return 60 / this.mood.bpm / 2; };
  Engine.prototype.schedule = function (until) {
    while (this.t < until) { this.tick(this.t); this.t += this.eighth(); this.step++; }
  };
  Engine.prototype.tick = function (t) {
    var s = this.step % 8, m = this.mood;
    if (s === 0) {
      if (this.next) {
        this.mood = m = this.next; this.next = null; this.bar = 0;
        this.lp.frequency.setTargetAtTime(m.bright, t, 0.8);
        this.dly.delayTime.setTargetAtTime(60 / m.bpm * 0.75, t, 0.2);
      }
      this.ch = m.prog[this.bar % m.prog.length]; this.bar++;
      this.pad(t, this.ch[1], this.eighth() * 8);
    }
    if (s === 0 || s === 4 || (m.kick && s === 6)) this.bass(t, this.ch[0]);
    if (s % m.arp === 0) { var n = this.ch[1], k = ARP[s]; this.pluck(t, k < 4 ? n[k] : n[0] + 12); }
    if (m.hat && s % 2 === 1) this.hat(t, s === 7 ? 0.035 : 0.022);
    if (m.kick && (s === 0 || s === 4)) this.kick(t);
  };
  Engine.prototype.pad = function (t, notes, dur) {
    var c = this.ctx;
    notes.forEach(function (n) {
      [-7, 7].forEach(function (det) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = mtof(n); o.detune.value = det;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 1.0);
        g.gain.setValueAtTime(0.03, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
        o.connect(g); g.connect(this.lp); o.start(t); o.stop(t + dur + 1.5);
      }, this);
    }, this);
  };
  Engine.prototype.pluck = function (t, n) {
    var c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = mtof(n + 12);
    f.type = 'lowpass'; f.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.075, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f); f.connect(g); g.connect(this.dry); g.connect(this.dly); o.start(t); o.stop(t + 0.55);
  };
  Engine.prototype.bass = function (t, n) {
    var c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    g.connect(this.dry);
    [['sine', 0, 1], ['triangle', 12, 0.35]].forEach(function (v) {
      var o = c.createOscillator(), og = c.createGain();
      o.type = v[0]; o.frequency.value = mtof(n + v[1]); og.gain.value = v[2];
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.95);
    });
  };
  Engine.prototype.hat = function (t, v) {
    var c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 7500;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t, Math.random() * 0.5, 0.08);
  };
  Engine.prototype.kick = function (t) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.35);
  };

  // Control de la música para la revista
  var M = { eng: null, ctx: null, timer: null, playing: false, mood: 'inicio' };
  M.start = function (ctx) {
    if (!ctx) return;
    if (!this.eng) { this.ctx = ctx; this.eng = new Engine(ctx); this.eng.mood = MOODS[this.mood]; this.eng.ch = this.eng.mood.prog[0]; }
    var e = this.eng, now = ctx.currentTime;
    if (e.t < now + 0.05) { e.t = now + 0.08; e.step = 0; }
    e.master.gain.cancelScheduledValues(now); e.master.gain.setTargetAtTime(VOL, now, 0.9);
    this.playing = true;
    if (!this.timer) this.timer = setInterval(function () { e.schedule(ctx.currentTime + 0.35); }, 80);
    e.schedule(now + 0.35);
  };
  M.stop = function () {
    if (!this.eng || !this.playing) return;
    var self = this, now = this.ctx.currentTime;
    this.playing = false;
    this.eng.master.gain.cancelScheduledValues(now); this.eng.master.gain.setTargetAtTime(0, now, 0.35);
    setTimeout(function () { if (!self.playing && self.timer) { clearInterval(self.timer); self.timer = null; } }, 1800);
  };
  M.setMood = function (name) {
    if (!MOODS[name] || name === this.mood) return;
    this.mood = name;
    if (this.eng) this.eng.next = MOODS[name];
  };
  M.Engine = Engine; M.MOODS = MOODS; M.VOL = VOL;
  w.CircuitoMusica = M;
})(window);
