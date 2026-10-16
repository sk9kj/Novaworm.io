/* NOVAWORM — moteur de simulation (sans DOM). Utilisé par le navigateur (mode hors ligne)
   ET par le serveur Node (mode en ligne) : une seule logique de jeu pour les deux. */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
const TAU = Math.PI * 2, hyp = Math.hypot;
const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const rnd = (a, b) => a + Math.random() * (b - a);
const CELL = 250;
const NAMES = ['Nova','Zigzag','Lumi','Cobra','Pixel','Vipère','Orion','Mamba','Éclair','Spectre','Kiwi','Turbo','Nimbus','Rubis','Fusion','Glitch','Yuki','Draco','Plasma','Lynx','Mistral','Comète','Onyx','Zéphyr','Bulle','Atlas','Néon','Volt','Sirocco','Aurora','Hydra','Tango','Jade','Quartz','Ombre','Flash','Mirage','Kraken','Cosmo','Pepito'];
const Cfg = SN.Cfg = { base: 175, boost: 335, maxSegs: 520, minBoostMass: 12 };
/* Tempête façon battle royale : le cercle sûr attend (w s), puis se referme (s s) vers un NOUVEAU centre (r = rayon). */
const PH = SN.STORM_PHASES = [
  { w: 18, s: 14, r: 1650 }, { w: 14, s: 13, r: 1050 }, { w: 12, s: 12, r: 620 },
  { w: 10, s: 10, r: 340 },  { w: 8,  s: 14, r: 150 },  { w: 6,  s: 20, r: 50 }
];
const radiusOf = m => Math.min(46, 8 + 0.62 * Math.sqrt(m));
const segsOf = m => Math.min(Cfg.maxSegs, Math.floor(8 + 0.28 * m));
const orbR = v => 3 + Math.sqrt(v) * 2.2;
let uid = 1;
SN.orbRadius = orbR;

class Snake {
  constructor(o) {
    this.id = o.id; this.name = o.name || 'Serpent'; this.bot = !!o.bot; this.human = !!o.human;
    this.loadout = o.loadout || {}; this.skill = o.skill == null ? .6 : o.skill;
    this.mass = o.mass || 10; this.x = o.x; this.y = o.y; this.angle = o.angle || 0; this.target = this.angle;
    this.alive = true; this.inStorm = false; this.stormRate = 0; this.speed = Cfg.base; this.kills = 0; this.protect = 2.2; this.dropAcc = 0; this.boosting = false; this.want = false;
    this.hue = Math.random() * 360; this.next = Math.random() * .2; this.aiAngle = this.angle; this.aiBoost = false; this.wander = 0;
    this.place = 0; this.deathTime = 0;
    this.r = radiusOf(this.mass); this.sp = this.r * .65; this.segs = [];
    const n = segsOf(this.mass);
    for (let i = 0; i < n; i++) this.segs.push({ x: this.x - Math.cos(this.angle) * i * this.sp, y: this.y - Math.sin(this.angle) * i * this.sp });
    this.ext = n * this.sp + this.r;
  }
  get score() { return Math.floor(this.mass); }
}

class World {
  constructor(o) {
    o = o || {};
    this.opt = o; this.R0 = o.radius || 3500; this.R = this.R0; this.time = 0;
    this.snakes = []; this.byId = new Map(); this.events = []; this.grid = new Map(); this.orbCount = 0; this.orbSeq = 1;
    this.respawns = []; this.playerId = null; this.ranked = !!o.ranked; this.canRespawn = o.respawn !== false;
    this.skill = o.skill == null ? .6 : o.skill; this.shrink = o.shrink || null; this.purgeT = 0; this._tmp = [];
    this.loadoutFn = o.loadoutFn || (() => ({}));
    this.orbArea = o.orbArea || 9500;
    this.zone = null; this.next = null; this.storm = null; if (o.storm) this.initStorm();
    const tgt = this.orbTarget();
    for (let i = 0; i < tgt; i++) this.randomOrb();
    for (let i = 0; i < (o.bots || 0); i++) this.addBot();
  }
  orbTarget() { const r = this.zone ? this.zone.r : this.R; return Math.min(5200, Math.floor(Math.PI * r * r / this.orbArea)); }

  /* ----- tempête (zone mobile) ----- */
  initStorm() {
    this.zone = { x: 0, y: 0, r: this.R0 };
    this.storm = { i: 0, stage: 'wait', t: PH[0].w, from: null, done: false };
    this.pickNext();
  }
  pickNext() {                                   // le prochain cercle est entièrement inclus dans l'actuel, mais son centre est décalé
    const ph = PH[this.storm.i], z = this.zone, a = rnd(0, TAU), d = Math.sqrt(Math.random()) * Math.max(0, z.r - ph.r) * .92;
    this.next = { x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, r: ph.r };
  }
  stormLevel() { return this.zone ? Math.max(0, Math.min(1, 1 - (this.zone.r - 50) / (this.R0 - 50))) : 0; }   // 0 = zone pleine, 1 = zone minuscule
  stormStep(dt) {
    const S = this.storm; if (!S) return; const z = this.zone;
    if (!S.done) {
      S.t -= dt;
      if (S.stage === 'wait') {
        if (S.t <= 0) { S.stage = 'shrink'; S.t = PH[S.i].s; S.from = { x: z.x, y: z.y, r: z.r }; this.events.push({ t: 'storm', stage: 'shrink' }); }
      } else {
        const n = this.next, f = S.from, k = 1 - Math.max(0, S.t) / PH[S.i].s;
        z.x = f.x + (n.x - f.x) * k; z.y = f.y + (n.y - f.y) * k; z.r = f.r + (n.r - f.r) * k;
        if (S.t <= 0) {
          S.i++;
          if (S.i >= PH.length) { S.done = true; this.next = null; }
          else { S.stage = 'wait'; S.t = PH[S.i].w; this.pickNext(); this.events.push({ t: 'storm', stage: 'wait' }); }
        }
      }
    }
    const lv = this.stormLevel(), flat = 4 + 40 * Math.pow(lv, 1.5), pct = .01 + .04 * lv;   // plus la zone est petite, plus on perd de points par seconde
    for (const s of this.snakes) {
      if (!s.alive) continue;
      s.inStorm = hyp(s.x - z.x, s.y - z.y) > z.r;
      s.stormRate = s.inStorm ? flat + s.mass * pct : 0;
      if (s.inStorm) { s.mass -= s.stormRate * dt; if (s.mass < 6) { s.mass = 6; this.kill(s, null, 'storm'); } }
    }
  }

  /* ----- orbes ----- */
  key(cx, cy) { return (cx + 64) * 256 + (cy + 64); }
  addOrb(x, y, v, h) {
    const o = { id: this.orbSeq++, x, y, v, h: h == null ? Math.random() * 360 : h };
    const k = this.key(Math.floor(x / CELL), Math.floor(y / CELL));
    let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
    a.push(o); this.orbCount++; return o;
  }
  randomOrb() {
    const z = this.zone || { x: 0, y: 0, r: this.R }, a = rnd(0, TAU), d = Math.sqrt(Math.random()) * z.r * .985, q = Math.random();
    this.addOrb(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, q < .82 ? 1 : q < .96 ? 2 + Math.floor(Math.random() * 2) : 6);
  }
  orbsInRect(x0, y0, x1, y1, out) {
    out = out || []; out.length = 0;
    const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cy0 = Math.floor(y0 / CELL), cy1 = Math.floor(y1 / CELL);
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const a = this.grid.get(this.key(cx, cy)); if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
    }
    return out;
  }
  visibleOrbs(x0, y0, x1, y1) { return this.orbsInRect(x0, y0, x1, y1, this._vis || (this._vis = [])); }

  /* ----- serpents ----- */
  spawnPoint() {
    let best = null, bd = -1;
    for (let k = 0; k < 14; k++) {
      const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * this.R * .8, x = Math.cos(a) * d, y = Math.sin(a) * d;
      let md = 1e9;
      for (const s of this.snakes) if (s.alive) md = Math.min(md, hyp(x - s.x, y - s.y) - s.ext * .3);
      if (md > bd) { bd = md; best = { x, y, angle: rnd(0, TAU) }; }
    }
    return best;
  }
  addSnake(o) { const s = new Snake(Object.assign({ id: 'b' + (uid++) }, o)); this.snakes.push(s); this.byId.set(s.id, s); return s; }
  addBot() {
    const sk = Math.min(1, Math.max(.15, this.skill + rnd(-.2, .2)));
    const nm = NAMES[Math.floor(Math.random() * NAMES.length)] + (Math.random() < .3 ? Math.floor(rnd(1, 99)) : '');
    return this.addSnake(Object.assign({ name: nm, bot: true, loadout: this.loadoutFn(), skill: sk, mass: rnd(10, this.opt.botMass || 18) }, this.spawnPoint()));
  }
  addHuman(id, name, loadout) {
    const old = this.byId.get(id); if (old) this.removeSnake(old);
    const s = this.addSnake(Object.assign({ id, name, loadout, human: true, mass: 10 }, this.spawnPoint()));
    if (!this.isServer) this.playerId = id;
    return s;
  }
  removeSnake(s) {
    if (s.alive) this.kill(s, null);
    const i = this.snakes.indexOf(s); if (i >= 0) this.snakes.splice(i, 1);
    this.byId.delete(s.id);
  }
  get me() { return this.playerId ? this.byId.get(this.playerId) : null; }
  setInput(a, b) { const p = this.me; if (p && p.alive) { p.target = a; p.want = !!b; } }
  aliveCount() { let n = 0; for (const s of this.snakes) if (s.alive) n++; return n; }
  leaderboard(n) {
    return this.snakes.filter(s => s.alive).sort((a, b) => b.mass - a.mass).slice(0, n || 10)
      .map(s => ({ id: s.id, name: s.name, score: Math.floor(s.mass), bot: s.bot, me: s.id === this.playerId }));
  }
  rankOf(id) { const a = this.snakes.filter(s => s.alive).sort((x, y) => y.mass - x.mass); return a.findIndex(s => s.id === id) + 1; }

  /* ----- boucle ----- */
  step(dt) {
    dt = Math.min(dt, .05); this.time += dt;
    if (this.shrink) {
      const s = this.shrink, t = this.time - s.delay;
      this.R = t <= 0 ? s.from : Math.max(s.to, s.from - (s.from - s.to) * Math.min(1, t / s.dur));
      this.purgeT -= dt;
      if (this.purgeT <= 0) { this.purgeT = 1.5; this.purgeOutside(); }
    }
    if (this.zone) { this.stormStep(dt); this.purgeT -= dt; if (this.purgeT <= 0) { this.purgeT = 1.5; this.purgeOutside(); } }
    for (const s of this.snakes) if (s.alive) this.updateSnake(s, dt);
    this.collide();
    for (let i = this.snakes.length - 1; i >= 0; i--) {
      const s = this.snakes[i];
      if (!s.alive && !s.human) { this.snakes.splice(i, 1); this.byId.delete(s.id); }
    }
    for (let i = this.respawns.length - 1; i >= 0; i--) if (this.time >= this.respawns[i]) { this.respawns.splice(i, 1); this.addBot(); }
    const need = this.orbTarget() - this.orbCount;
    for (let i = 0, n = Math.min(30, need); i < n; i++) this.randomOrb();
  }
  purgeOutside() {
    const z = this.zone || { x: 0, y: 0, r: this.R }, R2 = (z.r + 40) * (z.r + 40);
    for (const a of this.grid.values()) for (let i = a.length - 1; i >= 0; i--) {
      const o = a[i], ox = o.x - z.x, oy = o.y - z.y; if (ox * ox + oy * oy > R2) { a[i] = a[a.length - 1]; a.pop(); this.orbCount--; }
    }
  }
  updateSnake(s, dt) {
    if (s.bot) {
      s.next -= dt;
      if (s.next <= 0) { s.next = .09 + Math.random() * .06 + (1 - s.skill) * .15; this.think(s); }
      s.target = s.aiAngle; s.want = s.aiBoost;
    }
    s.protect = Math.max(0, s.protect - dt);
    const da = wrap(s.target - s.angle), m = 4.4 / (1 + s.r / 24) * dt;
    s.angle += Math.abs(da) < m ? da : Math.sign(da) * m;
    const boost = s.want && s.mass > Cfg.minBoostMass; s.boosting = boost;
    if (boost) {
      const loss = (3 + s.mass * .012) * dt; s.mass -= loss; s.dropAcc += loss;
      if (s.dropAcc >= 1.2) {
        s.dropAcc -= 1.2; const t = s.segs[s.segs.length - 1];
        this.addOrb(t.x + rnd(-4, 4), t.y + rnd(-4, 4), 1, s.hue).t = this.time + 1.6;
      }
    }
    s.speed += ((boost ? Cfg.boost : Cfg.base) - s.speed) * Math.min(1, dt * 7);   // accélération progressive, comme Slither
    const sp = s.speed;
    s.x += Math.cos(s.angle) * sp * dt; s.y += Math.sin(s.angle) * sp * dt;
    s.r = radiusOf(s.mass); s.sp = s.r * .65;
    const n = segsOf(s.mass), segs = s.segs;
    segs[0].x = s.x; segs[0].y = s.y;
    while (segs.length < n) { const t = segs[segs.length - 1]; segs.push({ x: t.x, y: t.y }); }
    while (segs.length > n) segs.pop();
    for (let i = 1; i < segs.length; i++) {
      const a = segs[i - 1], b = segs[i], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > s.sp) { const k = (d - s.sp) / d; b.x += dx * k; b.y += dy * k; }
    }
    s.ext = n * s.sp + s.r;
    this.eatOrbs(s, dt);
    if (s.mass > 20000) s.mass = 20000;
  }
  eatOrbs(s, dt) {
    const er = s.r + 16, mr = er + 70, reach = mr + 16, mv = this._mv || (this._mv = []); mv.length = 0;
    const cx0 = Math.floor((s.x - reach) / CELL), cx1 = Math.floor((s.x + reach) / CELL), cy0 = Math.floor((s.y - reach) / CELL), cy1 = Math.floor((s.y + reach) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const k = this.key(cx, cy), a = this.grid.get(k); if (!a) continue;
      for (let i = a.length - 1; i >= 0; i--) {
        const o = a[i], rr = er + orbR(o.v) * .6, dx = o.x - s.x, dy = o.y - s.y, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          s.mass += o.v; a[i] = a[a.length - 1]; a.pop(); this.orbCount--;
          if (s.human) this.events.push({ t: 'eat', id: s.id, v: o.v });
        } else if (d2 < mr * mr && !(o.t > this.time)) {          // aspiration : les orbes proches filent vers la tête
          const d = Math.sqrt(d2), st = Math.min(d, (240 + (mr - d) * 6) * dt);
          o.x -= dx / d * st; o.y -= dy / d * st;
          if (this.key(Math.floor(o.x / CELL), Math.floor(o.y / CELL)) !== k) { a[i] = a[a.length - 1]; a.pop(); mv.push(o); }
        }
      }
    }
    for (const o of mv) {
      const k = this.key(Math.floor(o.x / CELL), Math.floor(o.y / CELL)); let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); } a.push(o);
    }
  }
  collide() {
    const arr = this.snakes.filter(s => s.alive), R = this.R;
    for (const A of arr) {
      if (!A.alive) continue;
      if (hyp(A.x, A.y) > R - A.r * .4) { this.kill(A, null); continue; }
      if (A.protect > 0) continue;
      for (const B of arr) {
        if (B === A || !B.alive || B.protect > 0) continue;
        const dh = hyp(A.x - B.x, A.y - B.y);
        if (dh > B.ext + A.r + B.r) continue;
        if (dh < (A.r + B.r) * .8 && A.mass <= B.mass) { this.kill(A, B); break; }
        const lim = (A.r + B.r) * .8, l2 = lim * lim, sg = B.segs; let hit = false;
        for (let i = 1; i < sg.length; i++) {
          const dx = sg[i].x - A.x, dy = sg[i].y - A.y;
          if (dx * dx + dy * dy < l2) { hit = true; break; }
        }
        if (hit) { this.kill(A, B); break; }
      }
    }
  }
  kill(s, killer, cause) {
    if (!s.alive) return;
    if (this.ranked) s.place = this.aliveCount();
    s.alive = false; s.deathTime = this.time;
    if (killer) killer.kills++;
    const n = Math.min(80, Math.floor(s.segs.length / 1.5) + 4), per = s.mass * .8 / n;
    for (let j = 0; j < n; j++) {
      const sg = s.segs[Math.min(s.segs.length - 1, Math.floor(j / n * s.segs.length))];
      this.addOrb(sg.x + rnd(-1, 1) * s.r * .5, sg.y + rnd(-1, 1) * s.r * .5, Math.max(1, per * rnd(.7, 1.3)), s.hue + rnd(-25, 25));
    }
    this.events.push({ t: 'death', cause: cause || null, id: s.id, name: s.name, killer: killer ? killer.id : null, kname: killer ? killer.name : null, x: s.x, y: s.y, r: s.r, hue: s.hue, score: Math.floor(s.mass) });
    if (s.bot && this.canRespawn) this.respawns.push(this.time + rnd(2, 6));
  }

  /* ----- IA des bots ----- */
  danger(b, x, y) {
    const rr = b.r;
    if (hyp(x, y) > this.R - 60 - rr) return true;
    for (const S of this.snakes) {
      if (S === b || !S.alive) continue;
      const d = hyp(x - S.x, y - S.y);
      if (d > S.ext + rr + S.r + 30) continue;
      if (d < (rr + S.r) * 1.2 + (S.mass > b.mass ? 40 : 10)) return true;
      const lim = (rr + S.r) * .95 + 14, l2 = lim * lim, sg = S.segs;
      for (let i = 1; i < sg.length; i += 2) { const dx = sg[i].x - x, dy = sg[i].y - y; if (dx * dx + dy * dy < l2) return true; }
    }
    return false;
  }
  think(b) {
    const sk = b.skill; let ga = b.aiAngle, boost = false;
    const cr = hyp(b.x, b.y), rad = 240 + sk * 360;
    const near = this.orbsInRect(b.x - rad, b.y - rad, b.x + rad, b.y + rad, this._tmp);
    let best = null, bs = 0;
    for (const o of near) {
      const dx = o.x - b.x, dy = o.y - b.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
      let sc = (o.v + .6) / (d + 50);
      if (Math.abs(wrap(Math.atan2(dy, dx) - b.angle)) > 2.2) sc *= .35;
      if (sc > bs) { bs = sc; best = o; }
    }
    if (best) {
      ga = Math.atan2(best.y - b.y, best.x - b.x);
      if (best.v >= 5 && sk > .5 && b.mass > 25) boost = hyp(best.x - b.x, best.y - b.y) > 150;
    } else {
      b.wander = Math.max(-1.2, Math.min(1.2, b.wander + rnd(-.5, .5))); ga = b.angle + b.wander * .6;
    }
    let flee = false;
    if (this.zone) {                         // fuir la tempête : viser le centre du PROCHAIN cercle sûr
      const z = this.zone, n = this.next || z, dn = hyp(b.x - n.x, b.y - n.y), dz = hyp(b.x - z.x, b.y - z.y);
      if (dz > z.r * .88 || dn > n.r * .85) { flee = true; ga = Math.atan2(n.y - b.y, n.x - b.x) + rnd(-.25, .25); if (dz > z.r * .97 && b.mass > 22) boost = true; }
    } else if (cr > this.R * .82) ga = Math.atan2(-b.y, -b.x) + rnd(-.4, .4);
    if (!flee && sk > .4 && b.mass > 25) {            // chasse : couper la route d'un serpent plus petit
      let prey = null, pd = 520;
      for (const s of this.snakes) {
        if (s === b || !s.alive || s.protect > 0 || s.mass > b.mass * .75) continue;
        const d = hyp(s.x - b.x, s.y - b.y); if (d < pd) { pd = d; prey = s; }
      }
      if (prey) {
        ga = Math.atan2(prey.y + Math.sin(prey.angle) * pd * .5 - b.y, prey.x + Math.cos(prey.angle) * pd * .5 - b.x);
        boost = pd < 380 && sk > .6 && Math.random() < .6;
      }
    }
    const L = 70 + b.r * 3.2 + sk * 90, offs = [0, .35, -.35, .75, -.75, 1.2, -1.2, 1.8, -1.8, 2.6];
    let chosen = null;
    for (const off of offs) {
      const a = ga + off;
      if (!this.danger(b, b.x + Math.cos(a) * L, b.y + Math.sin(a) * L) && !this.danger(b, b.x + Math.cos(a) * L * .5, b.y + Math.sin(a) * L * .5)) { chosen = off; break; }
    }
    if (chosen === null) chosen = 1.8; if (chosen !== 0) boost = false;
    const a = ga + chosen + (Math.random() - .5) * (1 - sk) * .6;
    b.aiAngle = a; b.aiBoost = boost && b.mass > 18;
  }

  /* ----- réseau : instantané filtré autour d'un joueur (utilisé par server.js) ----- */
  snapshotFor(id, known, withLb) {
    const me = this.byId.get(id), cx = me ? me.x : 0, cy = me ? me.y : 0, VR = 1500, OR = 1150;
    const sn = [], info = [];
    for (const s of this.snakes) {
      if (!s.alive) continue;
      if (s !== me && hyp(s.x - cx, s.y - cy) - s.ext > VR) continue;
      const flat = []; for (const g of s.segs) flat.push(Math.round(g.x), Math.round(g.y));
      sn.push([s.id, Math.round(s.x), Math.round(s.y), +s.angle.toFixed(2), Math.round(s.mass), s.boosting ? 1 : 0, flat, s.protect > 0 ? 1 : 0]);
      if (!known.has(s.id)) { known.add(s.id); info.push([s.id, s.name, s.loadout, s.bot ? 1 : 0]); }
    }
    const o = this.orbsInRect(cx - OR, cy - OR, cx + OR, cy + OR, []).map(q => [q.id, Math.round(q.x), Math.round(q.y), Math.round(q.v * 10) / 10, Math.round(q.h)]);
    return { t: 's', tm: this.time, R: Math.round(this.R), me: me ? { a: me.alive ? 1 : 0, m: Math.floor(me.mass), k: me.kills, r: this.rankOf(id), n: this.aliveCount() } : null, sn, info, o, lb: withLb ? this.leaderboard(8) : undefined };
  }
}

SN.World = World; SN.Snake = Snake;
if (typeof module !== 'undefined' && module.exports) module.exports = SN;
})(typeof window !== 'undefined' ? window : globalThis);
