/* NOVAWORM — boucle de jeu, caméra, entrées, HUD, fin de partie. */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
const $ = (s) => document.querySelector(s);
const cv = $('#game'), c = cv.getContext('2d');
const P = new SN.Particles();
let W = 0, H = 0, dpr = 1;
const st = {
  mode: 'menu', world: null, demo: null, cam: { x: 0, y: 0, s: .5 }, a: 0, boost: false, key: false, mx: 0, my: 0, has: false,
  paused: false, cd: 0, t: 0, last: 0, fps: 60, shake: 0, matchT: 0, over: false, endT: 0, kind: 'free', hudT: 0, mapT: 0, feed: [], demoT: 0, follow: null
};
const RANKED = { total: 12, secs: 180 };

function resize() {
  dpr = Math.min(2, root.devicePixelRatio || 1); W = root.innerWidth; H = root.innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
}
root.addEventListener('resize', resize); resize();

/* ---------- entrées ---------- */
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointermove', e => { st.mx = e.clientX; st.my = e.clientY; st.has = true; });
cv.addEventListener('pointerdown', e => {
  st.mx = e.clientX; st.my = e.clientY; st.has = true;
  if (e.pointerType === 'mouse' && e.button === 0) st.boost = true;
  try { cv.setPointerCapture(e.pointerId); } catch (x) {}
});
root.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') st.boost = false; });
root.addEventListener('keydown', e => {
  if (e.code === 'Space' && st.mode === 'play') { st.key = true; e.preventDefault(); }
  if (e.code === 'Escape' && st.mode === 'play' && !st.over) togglePause();
});
root.addEventListener('keyup', e => { if (e.code === 'Space') st.key = false; });
root.addEventListener('blur', () => { st.key = false; st.boost = false; });
const bb = $('#h-boost');
bb.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); st.boost = true; });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => bb.addEventListener(ev, () => { st.boost = false; }));
$('#h-pause').addEventListener('click', () => { SN.Sfx.click(); togglePause(); });

/* ---------- démarrage / arrêt ---------- */
function loadoutFn() { return SN.randomLoadout(); }
function newDemo() { st.demo = new SN.World({ radius: 1800, bots: 14, skill: .7, loadoutFn }); st.follow = null; }

function start(kind) {
  const D = SN.Store.data;
  st.kind = kind; st.over = false; st.endT = 0; st.matchT = 0; st.paused = false; st.feed = []; P.p.length = 0; st.shake = 0;
  if (kind === 'online') {
    const w = new SN.OnlineMatch(D.name, D.loadout, D.pid);
    SN.UI.toast('Connexion au serveur…');
    return w.connect().then(() => { st.world = w; begin(); }).catch(err => { SN.UI.toast('Connexion impossible : ' + err.message, 'bad'); SN.UI.go('menu'); });
  }
  let w;
  if (kind === 'ranked') {
    const ri = SN.rankIndex(D.ranked.elo);
    w = new SN.World({ radius: 2400, bots: RANKED.total - 1, respawn: false, ranked: true, skill: .3 + ri * .12, orbArea: 8000, loadoutFn, storm: true });
    st.cd = 3.99;
  } else {
    w = new SN.World({ radius: 3500, bots: D.settings.bots, skill: .6, loadoutFn }); st.cd = 0;
  }
  w.addHuman('me', D.name, D.loadout); st.world = w; begin();
}
function begin() {
  st.mode = 'play'; st.a = 0; st.has = false; st.cdInt = -1;
  const me = st.world.me; if (me) { st.cam.x = me.x; st.cam.y = me.y; st.cam.s = .9; }
  SN.UI.go(null); $('#hud').hidden = false; $('#overlay').hidden = true; $('#h-ranked').hidden = st.kind !== 'ranked';
  document.body.classList.add('playing'); SN.Sfx.init(); SN.Sfx.setMood('play');
}
function stop() {
  if (st.world && st.world.close) st.world.close();
  st.mode = 'menu'; st.world = null; st.paused = false; $('#hud').hidden = true; $('#overlay').hidden = true; $('#h-count').hidden = true;
  document.body.classList.remove('playing'); SN.Sfx.setMood('menu');
}
function togglePause() {
  if (st.mode !== 'play' || st.over) return;
  st.paused = !st.paused; const ov = $('#overlay');
  if (!st.paused) { ov.hidden = true; return; }
  const online = st.kind === 'online';
  ov.hidden = false;
  ov.innerHTML = '<div class="modal card"><h2>' + (online ? 'MENU' : 'PAUSE') + '</h2><p class="muted">' + (st.kind === 'ranked' ? 'Quitter = défaite classée.' : online ? 'La partie en ligne continue.' : 'Partie en pause.') + '</p>' +
    '<div class="row"><button class="btn primary" data-act="resume">Reprendre</button><button class="btn" data-act="quit">Quitter</button></div></div>';
  if (online) st.paused = false;
}
function quit() {
  if (st.kind === 'ranked' && !st.over && st.world) {
    if (!root.confirm('Abandonner un match classé compte comme une défaite. Quitter ?')) return;
    finish(RANKED.total, true); return;
  }
  stop(); SN.UI.go('menu');
}

/* ---------- fin de partie ---------- */
function finish(place, forfeit) {
  if (st.over) return; st.over = true;
  const w = st.world, me = w.me, D = SN.Store.data;
  const res = { mode: st.kind === 'ranked' ? 'ranked' : st.kind, score: me ? Math.floor(me.mass) : (w.meInfo ? w.meInfo.m : 0), kills: me ? (me.kills || 0) : (w.meInfo ? w.meInfo.k : 0), place: place || 1, total: RANKED.total, secs: Math.round(st.matchT) };
  if (st.kind === 'online') res.mode = 'online';
  const out = st.kind === 'online' ? { coins: 0, milestones: 0, delta: 0 } : SN.Progress.finish(res);
  if (st.kind === 'online') { SN.Store.data.coins += (out.coins = Math.min(300, Math.floor(res.score / 8) + res.kills * 6)); SN.Store.save(); SN.Net.submit({ pid: D.pid, name: D.name, elo: D.ranked.elo, score: res.score, mode: 'online', kills: res.kills }); }
  SN.Sfx.setMood('menu'); st.endT = forfeit ? 0 : 1.1; st.res = { res, out, forfeit };
  if (forfeit) showResult();
}
function showResult() {
  $('#hud').hidden = true; SN.UI.showResult(st.res.res, st.res.out, st.kind, st.res.forfeit);
}

/* ---------- boucle ---------- */
function frame(ts) {
  requestAnimationFrame(frame);
  if (!SN.Store || !SN.Store.data) return;
  const now = ts / 1000; let dt = Math.min(.1, now - (st.last || now)); st.last = now; st.t = now;
  st.fps += (1 / Math.max(dt, .001) - st.fps) * .05;
  const q = SN.Store.data.settings.quality;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (st.mode === 'play') updatePlay(dt, q);
  else if (SN.UI.cur === 'menu') updateDemo(dt, q);
  else c.clearRect(0, 0, W, H);
  SN.UI.tick(now, dt);
  const f = $('#h-fps'); if (SN.Store.data.settings.fps) { f.hidden = false; f.textContent = Math.round(st.fps) + ' FPS'; } else f.hidden = true;
}

function updateDemo(dt, q) {
  if (!st.demo) newDemo();
  const w = st.demo, n = Math.ceil(dt / .0334);
  for (let i = 0; i < n; i++) w.step(dt / n);
  w.events.length = 0;
  if (!st.follow || !st.follow.alive || (st.demoT -= dt) < 0) {
    st.demoT = 10; const a = w.snakes.filter(s => s.alive).sort((x, y) => y.mass - x.mass); st.follow = a[Math.floor(Math.random() * Math.min(4, a.length))];
  }
  const f = st.follow; if (f) { st.cam.x += (f.x - st.cam.x) * Math.min(1, dt * 3); st.cam.y += (f.y - st.cam.y) * Math.min(1, dt * 3); }
  st.cam.s = Math.max(.42, Math.min(1.1, Math.min(W, H) / 760)) * .75;
  SN.Render.drawWorld(c, W * 1, H * 1, w, st.cam, st.t, { quality: q, particles: null });
}

function updatePlay(dt, q) {
  const w = st.world, me = w.me;
  if (!st.paused) {
    if (st.cd > 0) {
      const ci = Math.ceil(st.cd); if (ci !== st.cdInt) { st.cdInt = ci; SN.Sfx.beep(false); }
      st.cd -= dt; const el = $('#h-count'); el.hidden = st.cd <= 0; el.textContent = st.cd > 0 ? Math.ceil(st.cd) : '';
      if (st.cd <= 0) { SN.Sfx.beep(true); el.hidden = true; }
    } else {
      if (st.has) { const vx = st.mx - W / 2, vy = st.my - H / 2; if (vx * vx + vy * vy > 150) st.a = Math.atan2(vy, vx); }   // petite zone morte autour de la tête, comme Slither
      if (!st.over) w.setInput(st.a, st.boost || st.key);
      const n = Math.ceil(dt / .0334);
      if (w.online) w.step(dt); else for (let i = 0; i < n; i++) w.step(dt / n);
      handleEvents(w); st.matchT += dt;
      checkEnd(w, me);
    }
  }
  /* caméra */
  const m = w.me;
  if (m && m.alive !== false) {
    const sz = Math.max(.42, Math.min(1.05, 1.05 - (m.r - 9) * .016)), dev = Math.max(.62, Math.min(1.25, Math.min(W, H) / 760));
    const target = sz * dev * (m.boosting ? .96 : 1);
    st.cam.s += (target - st.cam.s) * Math.min(1, dt * 2.5); st.cam.x = m.x; st.cam.y = m.y;
  }
  st.shake = Math.max(0, st.shake - dt * 1.6);
  const cam = { x: st.cam.x + (Math.random() - .5) * st.shake * 14, y: st.cam.y + (Math.random() - .5) * st.shake * 14, s: st.cam.s };
  const list = SN.Render.drawWorld(c, W, H, w, cam, st.t, { quality: q, particles: null });
  /* particules : émises pour les serpents visibles, dessinées dans le repère monde */
  for (const s of list) SN.Render.emitFx(P, s, dt, st.t, q);
  P.update(dt);
  c.save(); c.translate(W / 2, H / 2); c.scale(cam.s, cam.s); c.translate(-cam.x, -cam.y); P.draw(c); c.restore();
  drawZoneArrow(w, m, cam);
  /* HUD */
  st.hudT -= dt; if (st.hudT <= 0) { st.hudT = .25; updateHud(w); }
  st.mapT -= dt; if (st.mapT <= 0) { st.mapT = .1; drawMap(w); }
  if (st.over && st.endT > 0) { st.endT -= dt; if (st.endT <= 0) showResult(); }
}

function handleEvents(w) {
  const me = w.me;
  for (const e of w.events) {
    if (e.t === 'eat') SN.Sfx.eat();
    else if (e.t === 'storm') { SN.Sfx.warn(); SN.UI.toast(e.stage === 'shrink' ? '⚠ La zone se referme !' : 'Nouvelle zone : rejoins le cercle blanc', e.stage === 'shrink' ? 'bad' : ''); }
    else if (e.t === 'death') {
      const dx = e.x - st.cam.x, dy = e.y - st.cam.y, near = Math.hypot(dx, dy) < 1400;
      if (near) {
        for (let k = 0; k < 24; k++) { const a = Math.random() * 6.283, sp = 60 + Math.random() * 160; P.add('dot', e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, Math.cos(a) * sp, Math.sin(a) * sp, .6 + Math.random() * .7, 3 + Math.random() * 4, 'hsl(' + (e.hue | 0) + ',100%,62%)'); }
        P.add('ring', e.x, e.y, 0, 0, .6, e.r * 4, '#fff');
      }
      if (e.id === w.playerId) { SN.Sfx.die(); st.shake = .7; }
      else if (e.killer === w.playerId) { SN.Sfx.kill(); st.shake = .25; }
      else if (near) SN.Sfx.pop();
      if (e.kname) { st.feed.unshift({ txt: (e.killer === w.playerId ? '<b>Toi</b>' : esc(e.kname)) + ' ➜ ' + (e.id === w.playerId ? '<b>toi</b>' : esc(e.name)), t: 5 }); st.feed.length = Math.min(st.feed.length, 4); }
      if (!w.online && st.kind === 'free' && e.id === w.playerId) finish(1);
    }
  }
  w.events.length = 0;
}
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function checkEnd(w, me) {
  if (st.over) return;
  if (w.online) { if (w.dead || w.closed) finish(1); return; }
  if (st.kind === 'ranked') {
    if (me && !me.alive) { finish(me.place || RANKED.total); return; }
    if (w.aliveCount() <= 1 && me && me.alive) { finish(1); return; }
    if (w.time >= RANKED.secs) {
      const a = w.snakes.filter(s => s.alive).sort((x, y) => y.mass - x.mass);
      finish(Math.max(1, a.findIndex(s => s.id === w.playerId) + 1));
    }
  }
}

function updateHud(w) {
  const me = w.me, fmt = n => Math.round(n).toLocaleString('fr-FR');
  const mass = me ? me.mass : (w.meInfo ? w.meInfo.m : 0), kills = me && me.kills != null ? me.kills : (w.meInfo ? w.meInfo.k : 0);
  $('#h-score').textContent = fmt(mass); $('#h-kills').textContent = kills;
  const rk = w.rankOf(w.playerId), tot = w.aliveCount();
  $('#h-rank').textContent = rk ? rk + '/' + tot : '–';
  $('#h-lb').innerHTML = w.leaderboard(10).map(r => '<li class="' + (r.me ? 'me' : '') + '"><span>' + esc(r.name) + (r.bot ? ' <i class="bot">BOT</i>' : '') + '</span><b>' + fmt(r.score) + '</b></li>').join('');
  if (st.kind === 'ranked') {
    const left = Math.max(0, RANKED.secs - w.time); $('#h-timer').textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    $('#h-alive').textContent = w.aliveCount() + ' en vie';
    const S = w.storm, bn = $('#h-storm'), hit = !!me && me.alive && me.inStorm; bn.hidden = !S;
    $('#hud').classList.toggle('storm', hit);
    if (S && !st.over) { const shrunk = S.i > 0 || S.stage === 'shrink'; SN.Sfx.setMood(shrunk ? 'storm' : 'play', Math.min(1, w.stormLevel() + (S.stage === 'shrink' ? .08 : 0)), hit); }
    if (S) {
      const tl = Math.max(0, Math.ceil(S.t)), mm = Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0');
      bn.className = hit ? 'hit' : '';
      bn.textContent = hit ? '⚠ Tempête : −' + Math.round(me.stormRate) + ' pts/s · rejoins le cercle !' : S.done ? 'Zone finale' : S.stage === 'wait' ? '🟣 Zone ' + (S.i + 1) + ' · se referme dans ' + mm : '⚠ La zone se referme ! ' + mm;
    }
  }
  st.feed = st.feed.filter(f => (f.t -= .25) > 0);
  $('#h-feed').innerHTML = st.feed.map(f => '<div>' + f.txt + '</div>').join('');
  bb.classList.toggle('ready', !!me && me.mass > SN.Cfg.minBoostMass);
}
function drawMap(w) {
  const m = $('#minimap'), g = m.getContext('2d'), S = m.width, R = w.R, k = S / 2 / (w.R0 || R), Z = w.zone;
  g.clearRect(0, 0, S, S); g.fillStyle = Z ? 'rgba(110,50,190,.6)' : 'rgba(8,12,30,.7)'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 6.283); g.fill();
  if (Z) {
    g.fillStyle = 'rgba(8,12,30,.92)'; g.beginPath(); g.arc(S / 2 + Z.x * k, S / 2 + Z.y * k, Math.max(1.5, Z.r * k), 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(200,160,255,.95)'; g.lineWidth = 2; g.stroke();
    if (w.next) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.arc(S / 2 + w.next.x * k, S / 2 + w.next.y * k, Math.max(1.5, w.next.r * k), 0, 6.283); g.stroke(); g.setLineDash([]); }
  } else {
    g.strokeStyle = 'rgba(255,90,150,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2, S / 2, Math.max(2, R * k - 1), 0, 6.283); g.stroke();
  }
  const me = w.me;
  for (const s of w.snakes) { if (!s.alive || s === me) continue; g.fillStyle = 'rgba(160,190,255,.55)'; g.fillRect(S / 2 + s.x * k - 1, S / 2 + s.y * k - 1, 2, 2); }
  if (me) { g.fillStyle = '#fff'; g.beginPath(); g.arc(S / 2 + me.x * k, S / 2 + me.y * k, 3.2, 0, 6.283); g.fill(); }
}

/* flèche vers le prochain cercle sûr quand on est en dehors */
function drawZoneArrow(w, m, cam) {
  const Z = w.zone; if (!Z || !m || !m.alive) return;
  const N = w.next || Z, d = Math.hypot(N.x - m.x, N.y - m.y); if (d < N.r * .9 && !m.inStorm) return;
  const a = Math.atan2(N.y - m.y, N.x - m.x), rr = Math.min(W, H) * .2;
  c.save(); c.translate(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); c.rotate(a);
  c.globalAlpha = .55 + .35 * Math.sin(st.t * 6); c.fillStyle = m.inStorm ? '#ff5d8f' : '#d8c2ff';
  c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, 11); c.lineTo(-5, 0); c.lineTo(-10, -11); c.closePath(); c.fill(); c.restore();
}
SN.Game = {
  start, stop, quit, togglePause, get playing() { return st.mode === 'play'; }, get ranked() { return RANKED; },
  resume() { if (st.paused) togglePause(); },
  get world() { return st.world; }
};
requestAnimationFrame(frame);
})(window);
