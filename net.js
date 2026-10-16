/* NOVAWORM — couche réseau (optionnelle). Sans serveur configuré, le jeu reste 100 % hors ligne.
   Le serveur Node (server.js) fournit : API classement (REST) + arène multijoueur (WebSocket). */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
const S = () => SN.Store.data.settings;

function parse(url) {
  url = (url || '').trim(); if (!url) return null;
  if (!/^[a-z]+:\/\//i.test(url)) url = (root.location && root.location.protocol === 'https:' ? 'https://' : 'http://') + url;
  const u = new URL(url), https = u.protocol === 'https:' || u.protocol === 'wss:';
  return { http: (https ? 'https://' : 'http://') + u.host, ws: (https ? 'wss://' : 'ws://') + u.host + '/ws' };
}
const Net = {
  origin: null,                                  // rempli si la page est servie par server.js
  base() { return parse(S().server) || (this.origin ? parse(this.origin) : null); },
  configured() { return !!this.base(); },
  async probe() {
    if (!/^https?:/.test(root.location.protocol)) return;
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 1500);
      const r = await fetch('/api/health', { signal: ctl.signal }); const j = await r.json();
      if (j && j.game === 'novaworm') this.origin = root.location.origin;
    } catch (e) { /* pas de serveur : hors ligne */ }
  },
  async health() {
    const b = this.base(); if (!b) return { ok: false, err: 'Aucun serveur configuré' };
    try { const ctl = new AbortController(); setTimeout(() => ctl.abort(), 4000); const r = await fetch(b.http + '/api/health', { signal: ctl.signal }); const j = await r.json(); return { ok: j.game === 'novaworm', info: j }; }
    catch (e) { return { ok: false, err: 'Serveur injoignable' }; }
  },
  async leaderboard(scope, ids) {
    const b = this.base(); if (!b) return { ok: false, off: true };
    try {
      const r = await fetch(b.http + '/api/leaderboard?scope=' + scope + (ids && ids.length ? '&ids=' + encodeURIComponent(ids.join(',')) : ''));
      if (!r.ok) throw 0; return { ok: true, rows: (await r.json()).rows };
    } catch (e) { return { ok: false, err: 'Serveur injoignable' }; }
  },
  async submit(p) {
    const b = this.base(); if (!b) return;
    try { await fetch(b.http + '/api/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); } catch (e) {}
  }
};

/* Réplique côté client d'un monde hébergé par le serveur : même interface que SN.World pour Game/Render. */
class OnlineMatch {
  constructor(name, loadout, pid) {
    this.name = name; this.loadout = loadout; this.pid = pid; this.playerId = null; this.online = true;
    this.snakes = []; this.map = new Map(); this.info = new Map(); this.orbs = []; this.events = []; this.R = 3000; this.time = 0;
    this.lb = []; this.meInfo = null; this.sent = 0; this.dead = false;
  }
  connect() {
    const b = Net.base(); if (!b) return Promise.reject(new Error('Aucun serveur configuré'));
    return new Promise((res, rej) => {
      let done = false; const ws = this.ws = new WebSocket(b.ws);
      const to = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) {} rej(new Error('Délai dépassé')); } }, 6000);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', pid: this.pid, name: this.name, loadout: this.loadout }));
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'hello') { this.playerId = m.id; this.R = m.R; if (!done) { done = true; clearTimeout(to); res(this); } }
        else if (m.t === 's') this.onSnap(m);
        else if (m.t === 'full') { if (!done) { done = true; clearTimeout(to); rej(new Error('Serveur plein')); } }
      };
      ws.onerror = () => { if (!done) { done = true; clearTimeout(to); rej(new Error('Connexion impossible')); } };
      ws.onclose = () => { this.closed = true; };
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
  onSnap(m) {
    this.R = m.R; this.time = m.tm; this.meInfo = m.me; if (m.lb) this.lb = m.lb;
    for (const i of m.info) this.info.set(i[0], { name: i[1], loadout: i[2], bot: !!i[3] });
    const seen = new Set();
    for (const e of m.sn) {
      const id = e[0]; seen.add(id); let s = this.map.get(id);
      if (!s) { const inf = this.info.get(id) || { name: '?', loadout: {}, bot: false }; s = { id, name: inf.name, loadout: inf.loadout, bot: inf.bot, segs: [], tgt: [], alive: true, human: !inf.bot }; this.map.set(id, s); this.snakes.push(s); }
      const f = e[6], n = f.length / 2;
      s.tgt = f; s.mass = e[4]; s.angle = e[3]; s.boosting = !!e[5]; s.protect = e[7] ? 1 : 0; s.r = Math.min(46, 8 + .62 * Math.sqrt(e[4])); s.alive = true;
      while (s.segs.length < n) { const i = s.segs.length; s.segs.push({ x: f[Math.min(i, n - 1) * 2], y: f[Math.min(i, n - 1) * 2 + 1] }); }
      while (s.segs.length > n) s.segs.pop();
      s.ext = n * s.r * .65 + s.r; s.x = s.segs[0].x; s.y = s.segs[0].y;
    }
    for (let i = this.snakes.length - 1; i >= 0; i--) { const s = this.snakes[i]; if (!seen.has(s.id)) { this.snakes.splice(i, 1); this.map.delete(s.id); } }
    this.orbs = m.o.map(q => ({ id: q[0], x: q[1], y: q[2], v: q[3], h: q[4] }));
    if (m.ev) for (const e of m.ev) this.events.push(e);
    if (m.me && !m.me.a) this.dead = true;
  }
  step(dt) {
    const k = Math.min(1, dt * 14);
    for (const s of this.snakes) {
      const f = s.tgt, g = s.segs;
      for (let i = 0; i < g.length; i++) { g[i].x += (f[i * 2] - g[i].x) * k; g[i].y += (f[i * 2 + 1] - g[i].y) * k; }
      s.x = g[0].x; s.y = g[0].y;
    }
  }
  setInput(a, b) {
    const n = performance.now(); if (n - this.sent < 45 || !this.ws || this.ws.readyState !== 1) return; this.sent = n;
    this.ws.send(JSON.stringify({ t: 'in', a: +a.toFixed(3), b: b ? 1 : 0 }));
  }
  get me() { const s = this.map.get(this.playerId); if (s) return s; return null; }
  visibleOrbs(x0, y0, x1, y1) { return this.orbs.filter(o => o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1); }
  leaderboard(n) { return this.lb.slice(0, n || 10).map(r => ({ id: r.id, name: r.name, score: r.score, bot: r.bot, me: r.id === this.playerId })); }
  rankOf() { return this.meInfo ? this.meInfo.r : 0; }
  aliveCount() { return this.meInfo ? this.meInfo.n : 0; }
}

SN.Net = Net; SN.OnlineMatch = OnlineMatch;
})(window);
