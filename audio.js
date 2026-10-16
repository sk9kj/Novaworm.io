/* NOVAWORM — sons synthétisés (WebAudio), aucun fichier audio externe. */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
let ctx = null, master, sg, mg, lastEat = 0, step = 0, timer = null, combo = 0, lastEatT = 0;
const S = () => SN.Store.data.settings;

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (root.AudioContext || root.webkitAudioContext)();
    master = ctx.createGain(); const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    sg = ctx.createGain(); sg.connect(master); mg = ctx.createGain(); mg.connect(master);
    apply(); music();
  } catch (e) { ctx = null; }
}
function apply() {
  if (!ctx) return; const s = S();
  master.gain.value = s.vol; sg.gain.value = s.sfx ? 1 : 0; mg.gain.value = s.music ? .3 : 0;
}
function tone(f, d, type, v, slide, delay, dest) {
  if (!ctx) return;
  const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v == null ? .2 : v, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(dest || sg); o.start(t); o.stop(t + d + .03);
}
function noise(d, v, f, delay, dest) {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, n, ctx.sampleRate), a = buf.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + (delay || 0);
  src.buffer = buf; fl.type = 'lowpass'; fl.frequency.value = f || 1200; g.gain.value = v || .3;
  src.connect(fl); fl.connect(g); g.connect(dest || sg); src.start(t);
}
const NOTES = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3];
const PAT = [0, 2, 4, 2, 5, 4, 2, 3, 0, 2, 4, 6, 5, 4, 2, 1];
/* Musique adaptative : calme au menu, plus rythmée en partie, puis de plus en plus rapide, grave et tendue
   à mesure que la tempête se referme (k = 0 → 1 : zone pleine → zone minuscule). */
const mood = { kind: 'menu', k: 0, hit: false };
const MINOR = [110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7];
const SPAT = [0, 0, 3, 0, 4, 0, 3, 5, 0, 0, 3, 0, 6, 5, 4, 3];
function beat() {
  const m = mood, i = step++;
  if (m.kind === 'storm') {
    const k = m.k, ms = 275 - 155 * k - (m.hit ? 12 : 0), j = i % 16, tr = Math.pow(2, Math.floor(k * 6) / 12), f = MINOR[SPAT[j]] * tr, d = ms / 1000;
    tone(f, d * 1.5, 'sawtooth', .06 + .05 * k, 0, 0, mg);                        // basse qui pulse
    if (j % (k > .5 ? 2 : 4) === 0) tone(130, .2, 'sine', .22 + .08 * k, -95, 0, mg);   // grosse caisse (plus fréquente)
    if (k > .25 && j % 2 === 1) noise(.05, .05 + .05 * k, 6500, 0, mg);              // charleston
    if (k > .4) tone(MINOR[SPAT[(j + 4) % 16]] * 4 * tr, d * .8, 'square', .03 + .03 * k, 0, 0, mg);   // arpège aigu
    if (m.hit && j % 4 === 2) tone(880, .1, 'square', .06, 0, 0, mg);                // alerte quand on est dans la tempête
    return ms;
  }
  const p = i % PAT.length;
  tone(NOTES[PAT[p]], .5, 'triangle', .12, 0, 0, mg);
  if (p % 4 === 0) tone(NOTES[PAT[p]] / 2, .9, 'sine', .16, 0, 0, mg);
  if (m.kind === 'play') {                                                        // en partie : un peu plus de rythme
    if (p % 4 === 0) tone(110, .16, 'sine', .14, -70, 0, mg);
    if (p % 2 === 1) noise(.04, .035, 6000, 0, mg);
    return 215;
  }
  return 260;
}
function music() {
  if (timer || !ctx) return;
  const loop = () => { let ms = 260; if (S().music && ctx) { try { ms = beat(); } catch (e) {} } timer = setTimeout(loop, ms); };
  timer = setTimeout(loop, 0);
}

SN.Sfx = {
  init, apply,
  setMood(kind, k, hit) { mood.kind = kind; mood.k = Math.max(0, Math.min(1, k || 0)); mood.hit = !!hit; },
  get mood() { return mood; },
  click() { tone(660, .06, 'square', .06, 200); },
  eat() {
    const n = performance.now(); if (n - lastEat < 45) return; lastEat = n;
    combo = n - lastEatT < 400 ? Math.min(combo + 1, 12) : 0; lastEatT = n;
    tone(480 + combo * 38, .09, 'sine', .11, 160);
  },
  kill() { tone(520, .12, 'triangle', .2, 300); tone(780, .18, 'triangle', .2, 300, .1); },
  die() { noise(.7, .5, 900); tone(220, .6, 'sawtooth', .2, -170); },
  pop() { noise(.18, .12, 1800); },
  buy() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', .16, 0, i * .07)); },
  rankUp() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'triangle', .2, 0, i * .1)); },
  beep(hi) { tone(hi ? 880 : 440, hi ? .35 : .15, 'square', .12); },
  warn() { tone(330, .22, 'sawtooth', .13, -110); tone(330, .22, 'sawtooth', .13, -110, .28); },
  error() { tone(180, .18, 'sawtooth', .12, -40); }
};
})(window);
