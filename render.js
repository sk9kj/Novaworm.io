/* NOVAWORM — rendu Canvas 2D : serpents, cosmétiques, orbes, particules, aperçus. Graphismes 100 % originaux (formes vectorielles). */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
const TAU = Math.PI * 2;

/* ---------- couleurs ---------- */
const rgb = h => { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
const pal = new Map();
function palette(stops) {
  const k = stops.join(); let p = pal.get(k); if (p) return p;
  const c = stops.map(rgb); p = [];
  for (let i = 0; i < 64; i++) {
    const u = i / 63 * (c.length - 1), a = Math.min(c.length - 2, Math.floor(u)), f = u - a, x = c[a], y = c[a + 1];
    p.push('rgb(' + ((x[0] + (y[0] - x[0]) * f) | 0) + ',' + ((x[1] + (y[1] - x[1]) * f) | 0) + ',' + ((x[2] + (y[2] - x[2]) * f) | 0) + ')');
  }
  pal.set(k, p); return p;
}
function skinColor(sk, i, n, t) {
  switch (sk.mode) {
    case 'rainbow': return 'hsl(' + (((i * 9 + t * 60 * (sk.speed || 1)) % 360) | 0) + ',90%,' + ((58 + (sk.shim ? 8 * Math.sin(i * .5 + t * 4) : 0)) | 0) + '%)';
    case 'gradient': return palette(sk.colors)[Math.round(i / Math.max(1, n - 1) * 63)];
    case 'wave': { let u = (i / Math.max(1, n - 1) * 1.4 + t * .3) % 1; u = u < .5 ? u * 2 : 2 - u * 2; return palette(sk.colors)[Math.round(u * 63)]; }
    default: return sk.colors[Math.floor(i / 3) % sk.colors.length];
  }
}

/* ---------- petites formes ---------- */
const circ = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
function heart(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + s * .9);
  c.bezierCurveTo(x - s * 1.3, y - s * .1, x - s * .6, y - s, x, y - s * .35);
  c.bezierCurveTo(x + s * .6, y - s, x + s * 1.3, y - s * .1, x, y + s * .9); c.fill();
}
const eyeAt = (r, fn) => { fn(r * .42, -r * .5, -1); fn(r * .42, r * .5, 1); };

/* ---------- yeux (repère local : +x = devant) ---------- */
const EYES = {
  round(c, r) { eyeAt(r, (x, y) => { circ(c, x, y, r * .34, '#fff'); circ(c, x + r * .1, y, r * .17, '#111'); }); },
  cute(c, r) { eyeAt(r, (x, y) => { circ(c, x, y, r * .4, '#fff'); circ(c, x + r * .08, y, r * .27, '#111'); circ(c, x + r * .15, y - r * .08, r * .09, '#fff'); }); },
  angry(c, r) {
    eyeAt(r, (x, y, sd) => {
      circ(c, x, y, r * .34, '#fff'); circ(c, x + r * .1, y, r * .17, '#c1121f');
      c.strokeStyle = '#111'; c.lineWidth = r * .15; c.lineCap = 'round'; c.beginPath();
      c.moveTo(x + r * .42, y - sd * r * .3); c.lineTo(x - r * .3, y + sd * r * .45); c.stroke();
    });
  },
  sleepy(c, r) {
    eyeAt(r, (x, y) => {
      circ(c, x, y, r * .34, '#fff'); circ(c, x + r * .08, y, r * .15, '#111');
      c.fillStyle = 'rgba(20,24,40,.85)'; c.beginPath(); c.arc(x, y, r * .35, Math.PI / 2, Math.PI * 1.5); c.fill();
    });
  },
  dizzy(c, r) {
    eyeAt(r, (x, y) => {
      circ(c, x, y, r * .36, '#fff'); c.strokeStyle = '#111'; c.lineWidth = r * .1; c.lineCap = 'round'; c.beginPath();
      c.moveTo(x - r * .18, y - r * .18); c.lineTo(x + r * .18, y + r * .18); c.moveTo(x + r * .18, y - r * .18); c.lineTo(x - r * .18, y + r * .18); c.stroke();
    });
  },
  cool(c, r) {
    c.fillStyle = '#0b0b12'; eyeAt(r, (x, y) => { c.beginPath(); c.ellipse(x, y, r * .34, r * .4, 0, 0, TAU); c.fill(); });
    c.strokeStyle = '#0b0b12'; c.lineWidth = r * .14; c.beginPath(); c.moveTo(r * .42, -r * .2); c.lineTo(r * .42, r * .2); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = r * .07;
    eyeAt(r, (x, y) => { c.beginPath(); c.moveTo(x - r * .05, y - r * .2); c.lineTo(x + r * .12, y - r * .05); c.stroke(); });
  },
  cyclops(c, r) { circ(c, r * .42, 0, r * .56, '#fff'); circ(c, r * .52, 0, r * .27, '#111'); circ(c, r * .6, -r * .08, r * .08, '#fff'); },
  alien(c, r) {
    eyeAt(r, (x, y, sd) => { c.fillStyle = '#06060a'; c.beginPath(); c.ellipse(x, y, r * .42, r * .22, sd * .5, 0, TAU); c.fill(); circ(c, x + r * .1, y, r * .06, '#7cffb2'); });
  },
  heart(c, r) { c.fillStyle = '#ff4d8d'; eyeAt(r, (x, y) => heart(c, x, y, r * .3)); },
  laser(c, r) { eyeAt(r, (x, y) => { circ(c, x, y, r * .5, 'rgba(255,40,80,.35)'); circ(c, x, y, r * .28, '#ff2d55'); circ(c, x, y, r * .1, '#fff'); }); }
};

/* ---------- chapeaux ---------- */
const HATS = {
  cap(c, r) { circ(c, -r * .05, 0, r * .98, '#ef4444'); c.fillStyle = '#b91c1c'; c.beginPath(); c.ellipse(r * .85, 0, r * .45, r * .72, 0, -Math.PI / 2, Math.PI / 2); c.fill(); circ(c, -r * .05, 0, r * .16, '#fff'); },
  party(c, r, t) {
    const g = c.createLinearGradient(r * .5, 0, -r * 1.9, 0); g.addColorStop(0, '#f472b6'); g.addColorStop(1, '#a78bfa');
    c.fillStyle = g; c.beginPath(); c.moveTo(r * .5, -r * .8); c.lineTo(r * .5, r * .8); c.lineTo(-r * 1.9, 0); c.fill();
    c.strokeStyle = '#fde047'; c.lineWidth = r * .1; c.beginPath(); c.moveTo(-r * .2, -r * .5); c.lineTo(-r * .2, r * .5); c.moveTo(-r * .9, -r * .27); c.lineTo(-r * .9, r * .27); c.stroke();
    circ(c, -r * 1.9, 0, r * .28, '#fde047');
  },
  catears(c, r) {
    for (const sd of [-1, 1]) {
      c.fillStyle = '#1f2937'; c.beginPath(); c.moveTo(r * .35, sd * r * .45); c.lineTo(-r * .1, sd * r * 1.3); c.lineTo(-r * .6, sd * r * .35); c.fill();
      c.fillStyle = '#f9a8d4'; c.beginPath(); c.moveTo(r * .1, sd * r * .55); c.lineTo(-r * .1, sd * r * 1.0); c.lineTo(-r * .35, sd * r * .5); c.fill();
    }
  },
  headphones(c, r) {
    c.strokeStyle = '#111827'; c.lineWidth = r * .22; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -r * 1.05); c.lineTo(0, r * 1.05); c.stroke();
    for (const sd of [-1, 1]) { c.fillStyle = '#111827'; c.beginPath(); c.ellipse(0, sd * r * 1.08, r * .38, r * .27, 0, 0, TAU); c.fill(); c.strokeStyle = '#22d3ee'; c.lineWidth = r * .08; c.stroke(); }
  },
  tophat(c, r) {
    circ(c, 0, 0, r * 1.2, '#111827'); circ(c, 0, 0, r * .72, '#1f2937');
    c.strokeStyle = '#ef4444'; c.lineWidth = r * .16; c.beginPath(); c.arc(0, 0, r * .72, 0, TAU); c.stroke();
    circ(c, -r * .22, -r * .22, r * .2, 'rgba(255,255,255,.14)');
  },
  horns(c, r, t, col) {
    for (const sd of [-1, 1]) {
      c.fillStyle = col || '#ef4444'; c.beginPath(); c.moveTo(r * .15, sd * r * .45);
      c.quadraticCurveTo(r * .6, sd * r * 1.4, r * 1.2, sd * r * 1.2); c.quadraticCurveTo(r * .7, sd * r * .95, r * .55, sd * r * .45); c.fill();
    }
  },
  viking(c, r, t) { HATS.horns(c, r * 1.1, t, '#fef3c7'); circ(c, 0, 0, r * .98, '#9ca3af'); c.strokeStyle = '#6b7280'; c.lineWidth = r * .12; c.beginPath(); c.arc(0, 0, r * .98, 0, TAU); c.stroke(); circ(c, -r * .25, -r * .25, r * .22, 'rgba(255,255,255,.3)'); },
  wizard(c, r) {
    circ(c, 0, 0, r * 1.3, '#4c1d95');
    const g = c.createLinearGradient(r * .4, 0, -r * 2.3, 0); g.addColorStop(0, '#6d28d9'); g.addColorStop(1, '#312e81');
    c.fillStyle = g; c.beginPath(); c.moveTo(r * .45, -r * .85); c.lineTo(r * .45, r * .85); c.quadraticCurveTo(-r, r * .4, -r * 2.3, -r * .5); c.quadraticCurveTo(-r, -r * .3, r * .45, -r * .85); c.fill();
    c.fillStyle = '#fde047'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, rr = k % 2 ? r * .1 : r * .24; c.lineTo(-r * .7 + Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
  },
  crown(c, r) {
    c.fillStyle = '#fbbf24'; c.strokeStyle = '#f59e0b'; c.lineWidth = r * .06; c.beginPath();
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, rr = k % 2 ? r * .8 : r * 1.25; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.arc(0, 0, r * .55, 0, TAU, true); c.fill('evenodd'); c.stroke();
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(c, Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2, r * .1, k % 2 ? '#38bdf8' : '#ef4444'); }
  },
  halo(c, r, t) {
    c.lineWidth = r * .3; c.strokeStyle = 'rgba(253,230,138,.28)'; c.beginPath(); c.arc(-r * .15, 0, r * 1.25, 0, TAU); c.stroke();
    c.lineWidth = r * .15; c.strokeStyle = '#fde68a'; c.beginPath(); c.arc(-r * .15, 0, r * 1.25, 0, TAU); c.stroke();
  }
};

/* ---------- accessoires ---------- */
function dirAt(segs, i, fallback) { const a = segs[i], b = segs[i - 1]; return i > 0 && b ? Math.atan2(b.y - a.y, b.x - a.x) : fallback; }
const ACC_BACK = {
  scarf(c, s, t) {
    const r = s.r, g = s.segs; if (g.length < 6) return;
    c.strokeStyle = '#ef4444'; c.lineCap = 'butt'; c.lineWidth = r * 2.05; c.beginPath(); c.moveTo(g[1].x, g[1].y); for (let i = 2; i <= 3; i++) c.lineTo(g[i].x, g[i].y); c.stroke();
    c.strokeStyle = '#fca5a5'; c.lineWidth = r * .35; c.beginPath(); c.moveTo(g[1].x, g[1].y); c.lineTo(g[3].x, g[3].y); c.stroke();
    c.save(); c.translate(g[4].x, g[4].y); c.rotate(dirAt(g, 4, s.angle)); c.fillStyle = '#dc2626';
    const f = Math.sin(t * 8) * r * .3; c.beginPath(); c.moveTo(0, -r * .3); c.lineTo(-r * 1.8, -r * .9 + f); c.lineTo(-r * 1.7, -r * .35 + f); c.lineTo(0, 0); c.fill(); c.restore();
  },
  spikes(c, s) {
    const r = s.r, g = s.segs; c.fillStyle = '#e5e7eb'; c.strokeStyle = '#6b7280'; c.lineWidth = r * .06;
    for (let i = 3; i < Math.min(g.length, 26); i += 2) {
      c.save(); c.translate(g[i].x, g[i].y); c.rotate(dirAt(g, i, s.angle));
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(r * .3, sd * r * .75); c.lineTo(-r * .3, sd * r * .75); c.lineTo(-r * .1, sd * r * 1.5); c.closePath(); c.fill(); c.stroke(); }
      c.restore();
    }
  },
  wings(c, s, t) {
    const r = s.r, g = s.segs; if (g.length < 6) return; const fl = Math.sin(t * 6) * .25;
    c.save(); c.translate(g[4].x, g[4].y); c.rotate(dirAt(g, 4, s.angle));
    for (const sd of [-1, 1]) {
      c.fillStyle = 'rgba(255,255,255,.88)'; c.beginPath(); c.moveTo(0, sd * r * .5);
      c.quadraticCurveTo(-r * 1.2, sd * r * (2.4 + fl), -r * 2.8, sd * r * (1.9 + fl)); c.quadraticCurveTo(-r * 1.5, sd * r * .9, 0, sd * r * .5); c.fill();
      c.strokeStyle = 'rgba(148,163,184,.8)'; c.lineWidth = r * .06; c.beginPath(); c.moveTo(-r * .2, sd * r * .8); c.lineTo(-r * 2.2, sd * r * (1.8 + fl)); c.moveTo(-r * .4, sd * r * .7); c.lineTo(-r * 1.8, sd * r * (1.5 + fl)); c.stroke();
    }
    c.restore();
  },
  cape(c, s, t) {
    const r = s.r, g = s.segs; if (g.length < 5) return;
    c.save(); c.translate(g[2].x, g[2].y); c.rotate(dirAt(g, 2, s.angle));
    const w = Math.sin(t * 5) * r * .5;
    c.fillStyle = '#7f1d1d'; c.strokeStyle = '#fbbf24'; c.lineWidth = r * .1; c.beginPath(); c.moveTo(0, -r * .95); c.lineTo(0, r * .95);
    c.quadraticCurveTo(-r * 2, r * 1.2 + w, -r * 3.6, w * .5); c.quadraticCurveTo(-r * 2, -r * 1.2 + w, 0, -r * .95); c.fill(); c.stroke(); c.restore();
  }
};
const ACC_FRONT = {
  bowtie(c, s) {
    const r = s.r, g = s.segs; if (g.length < 3) return;
    c.save(); c.translate(g[1].x, g[1].y); c.rotate(dirAt(g, 1, s.angle));
    c.fillStyle = '#ef4444'; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(-r * .55, sd * r * .98); c.lineTo(r * .55, sd * r * .98); c.fill(); }
    circ(c, 0, 0, r * .24, '#b91c1c'); c.restore();
  },
  antenna(c, s, t) {
    const r = s.r, g = s.segs[0]; c.save(); c.translate(g.x, g.y); c.rotate(s.angle);
    c.strokeStyle = '#cbd5e1'; c.lineWidth = r * .1; c.lineCap = 'round';
    for (const sd of [-1, 1]) {
      c.beginPath(); c.moveTo(r * .5, sd * r * .4); c.lineTo(r * 1.6, sd * r * .95); c.stroke();
      circ(c, r * 1.6, sd * r * .95, r * .34, 'rgba(253,224,71,' + (.3 + .2 * Math.sin(t * 5)) + ')'); circ(c, r * 1.6, sd * r * .95, r * .2, '#fde047');
    }
    c.restore();
  }
};

/* ---------- motifs (par segment) ---------- */
function pattern(c, id, p, i, r, s, t) {
  switch (id) {
    case 'stripes': if (i % 3 === 0) circ(c, p.x, p.y, r, 'rgba(0,0,0,.28)'); break;
    case 'dots': circ(c, p.x, p.y, r * .38, 'rgba(255,255,255,.55)'); break;
    case 'rings': c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = r * .14; c.beginPath(); c.arc(p.x, p.y, r * .72, 0, TAU); c.stroke(); break;
    case 'checker': circ(c, p.x, p.y, r, i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.22)'); break;
    case 'scales': { const a = dirAt(s.segs, i, s.angle); for (const sd of [-1, 1]) circ(c, p.x + Math.cos(a + Math.PI / 2) * sd * r * .45, p.y + Math.sin(a + Math.PI / 2) * sd * r * .45, r * .3, 'rgba(0,0,0,.25)'); break; }
    case 'stars': if (i % 3 === 1) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, rr = k % 2 ? r * .13 : r * .42; c.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); } c.fill(); } break;
    case 'circuit': { const a = dirAt(s.segs, i, s.angle) + Math.PI / 2, k = r * .8; c.strokeStyle = 'rgba(103,232,249,' + (.5 + .4 * Math.sin(t * 4 - i * .5)) + ')'; c.lineWidth = r * .12; c.beginPath(); c.moveTo(p.x - Math.cos(a) * k, p.y - Math.sin(a) * k); c.lineTo(p.x + Math.cos(a) * k, p.y + Math.sin(a) * k); c.stroke(); break; }
  }
}

/* ---------- serpent ---------- */
function drawSnake(c, s, t, o) {
  const L = s.loadout || SN.DEFAULT_LOADOUT, sk = SN.item('skin', L.skin) || SN.item('skin', 'neon'), fx = SN.item('fx', L.fx) || {};
  const segs = s.segs, n = segs.length, r = s.r, sc = o.scale || 1, px = r * sc;
  if (!n) return;
  const step = px < 2.5 ? 3 : px < 4.5 ? 2 : 1, hi = px >= 4, low = o.quality === 'low';
  c.save();
  if (s.protect > 0) c.globalAlpha = .55 + .4 * Math.sin(t * 18);
  const ga = c.globalAlpha;
  if (!low) {
    let gc = fx.glow === 'rainbow' ? 'hsl(' + ((t * 90) % 360 | 0) + ',100%,60%)' : (fx.glow && fx.glow !== 'skin') ? fx.glow : (sk.mode === 'rainbow' ? 'hsl(' + ((t * 60) % 360 | 0) + ',90%,60%)' : sk.colors[Math.min(1, sk.colors.length - 1)]);
    const a = fx.glow ? .3 : (s.boosting ? .3 : .12);
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = gc;
    c.beginPath(); c.moveTo(segs[0].x, segs[0].y); for (let i = step; i < n; i += step) c.lineTo(segs[i].x, segs[i].y);
    c.globalAlpha = ga * a; c.lineWidth = r * 3.2; c.stroke(); c.globalAlpha = ga * a * 1.3; c.lineWidth = r * 2.3; c.stroke(); c.globalAlpha = ga;
  }
  for (let i = n - 1; i >= 1; i -= step) {
    const p = segs[i], rr = r * (i > n - 9 ? .55 + .45 * ((n - i) / 9) : 1);
    circ(c, p.x, p.y, rr, skinColor(sk, i, n, t));
    if (hi) { if (L.pattern && L.pattern !== 'none') pattern(c, L.pattern, p, i, rr, s, t); circ(c, p.x - rr * .2, p.y - rr * .25, rr * .5, 'rgba(255,255,255,.14)'); }
  }
  const back = ACC_BACK[L.acc]; if (back && hi) back(c, s, t);
  const h = segs[0]; circ(c, h.x, h.y, r * 1.06, skinColor(sk, 0, n, t)); circ(c, h.x - r * .2, h.y - r * .25, r * .55, 'rgba(255,255,255,.16)');
  c.save(); c.translate(h.x, h.y); c.rotate(s.angle);
  (EYES[L.eyes] || EYES.round)(c, r);
  const hat = HATS[L.hat]; if (hat) hat(c, r, t);
  c.restore();
  const front = ACC_FRONT[L.acc]; if (front && hi) front(c, s, t);
  c.restore();
  if (o.names && s.name && px > 3) {
    c.font = '600 ' + Math.max(11, 13 / sc) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.85)';
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 3 / sc; const ty = h.y - r * 1.9 - 6 / sc; c.strokeText(s.name, h.x, ty); c.fillText(s.name, h.x, ty);
  }
}

/* ---------- particules ---------- */
class Particles {
  constructor() { this.p = []; }
  add(type, x, y, vx, vy, life, size, col) { if (this.p.length > 520) return; this.p.push({ t: type, x, y, vx, vy, l: life, L: life, z: size, col }); }
  update(dt) {
    const a = this.p;
    for (let i = a.length - 1; i >= 0; i--) {
      const q = a[i]; q.l -= dt; if (q.l <= 0) { a[i] = a[a.length - 1]; a.pop(); continue; }
      if (q.t === 'void') { q.vx *= .94; q.vy *= .94; } else if (q.t === 'heart') q.vy -= 25 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
  }
  draw(c) {
    for (const q of this.p) {
      const a = Math.max(0, q.l / q.L); c.globalAlpha = a; c.fillStyle = q.col; c.strokeStyle = q.col;
      switch (q.t) {
        case 'heart': heart(c, q.x, q.y, q.z * .5); break;
        case 'bolt': c.lineWidth = 1.8; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + q.vx * .1, q.y + q.vy * .06); c.lineTo(q.x + q.vx * .16, q.y + q.vy * .18); c.stroke(); break;
        case 'ring': c.lineWidth = 3; c.beginPath(); c.arc(q.x, q.y, q.z * (1 - a) + 4, 0, TAU); c.stroke(); break;
        default: c.beginPath(); c.arc(q.x, q.y, q.z * (q.t === 'flame' ? a : .5 + a * .5), 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  }
}
const FXCOL = { spark: ['#fde047', '#fff7ae'], flame: ['#ff6a00', '#ffd166', '#ef233c'], ice: ['#e0f2fe', '#7dd3fc'], heart: ['#f472b6', '#fb7185'], bolt: ['#67e8f9', '#e0f2fe'], void: ['#a78bfa', '#7c3aed'] };
function emitFx(P, s, dt, t, q) {
  const segs = s.segs; if (!segs.length) return;
  const L = s.loadout || {}, fx = SN.item('fx', L.fx) || {}, sk = SN.item('skin', L.skin) || SN.item('skin', 'neon');
  let rate = 0; if (fx.p) rate += q === 'low' ? 6 : 14; if (s.boosting) rate += 22;
  let k = rate * dt, nE = Math.floor(k); if (Math.random() < k - nE) nE++;
  for (let j = 0; j < nE; j++) {
    const g = segs[Math.floor(Math.random() * Math.min(segs.length, 40))], a = Math.random() * TAU, sp = 25 + Math.random() * 55;
    let type = fx.p, col, life = .5 + Math.random() * .5, size = 2 + Math.random() * 3;
    if (type === 'rain') { col = 'hsl(' + Math.floor(Math.random() * 360) + ',100%,65%)'; type = 'dot'; }
    else if (type && FXCOL[type]) { const arr = FXCOL[type]; col = arr[Math.floor(Math.random() * arr.length)]; if (type === 'heart') size = 5 + Math.random() * 3; if (type === 'flame') size = 4 + Math.random() * 3; }
    if (!type || (s.boosting && Math.random() < .5)) { type = 'dot'; col = sk.mode === 'rainbow' ? 'hsl(' + Math.floor(Math.random() * 360) + ',90%,60%)' : sk.colors[0]; life = .35 + Math.random() * .3; }
    P.add(type, g.x + (Math.random() - .5) * s.r, g.y + (Math.random() - .5) * s.r, Math.cos(a) * sp, Math.sin(a) * sp, life, size, col);
  }
}

/* ---------- monde ---------- */
const spr = [];
function sprite(h) {
  const k = (((h / 15) | 0) % 24 + 24) % 24; if (spr[k]) return spr[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.18, 'hsl(' + k * 15 + ',100%,72%)'); gr.addColorStop(.45, 'hsla(' + k * 15 + ',100%,58%,.55)'); gr.addColorStop(1, 'hsla(' + k * 15 + ',100%,50%,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return spr[k] = cv;
}

function drawWorld(c, W, H, world, cam, t, o) {
  c.fillStyle = '#05070f'; c.fillRect(0, 0, W, H);   // la transformation (échelle dpr) est posée par game.js
  c.save(); c.translate(W / 2, H / 2); c.scale(cam.s, cam.s); c.translate(-cam.x, -cam.y);
  const vw = W / cam.s, vh = H / cam.s, x0 = cam.x - vw / 2, y0 = cam.y - vh / 2, x1 = x0 + vw, y1 = y0 + vh, R = world.R;
  const gr = c.createRadialGradient(0, 0, 0, 0, 0, R); gr.addColorStop(0, '#12183a'); gr.addColorStop(1, '#0a0f26');
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  /* grille de points */
  const sp = cam.s < .45 ? 140 : 70; c.fillStyle = 'rgba(140,170,255,.13)';
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  for (let gx = Math.floor(x0 / sp) * sp; gx < x1; gx += sp) for (let gy = Math.floor(y0 / sp) * sp; gy < y1; gy += sp) c.fillRect(gx - 1.5, gy - 1.5, 3, 3);
  c.restore();
  /* bord de l'arène */
  c.fillStyle = 'rgba(2,3,10,.72)'; c.beginPath(); c.rect(x0 - 60, y0 - 60, vw + 120, vh + 120); c.arc(0, 0, R, 0, TAU, true); c.fill('evenodd');
  const Z = world.zone;
  if (Z) {                                             // tempête : voile violet hors du cercle sûr, anneau lumineux, prochain cercle en pointillés blancs
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.arc(Z.x, Z.y, Math.max(1, Z.r), 0, TAU, true);
    c.fillStyle = 'rgba(122,48,210,' + (.36 + .05 * Math.sin(t * 3)) + ')'; c.fill('evenodd');
    c.beginPath(); c.arc(Z.x, Z.y, Math.max(1, Z.r), 0, TAU);
    c.strokeStyle = 'rgba(168,100,255,.28)'; c.lineWidth = 46; c.stroke();
    c.strokeStyle = 'rgba(200,160,255,.95)'; c.lineWidth = 9; c.stroke();
    const N = world.next;
    if (N) { c.beginPath(); c.arc(N.x, N.y, N.r, 0, TAU); c.setLineDash([46, 32]); c.lineDashOffset = -t * 30; c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 7; c.stroke(); c.setLineDash([]); }
  }
  c.strokeStyle = 'rgba(255,60,130,.25)'; c.lineWidth = 46; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,90,150,.95)'; c.lineWidth = 8; c.stroke();
  /* orbes */
  const orbs = world.visibleOrbs(x0 - 40, y0 - 40, x1 + 40, y1 + 40), R2 = R * R;
  for (let i = 0; i < orbs.length; i++) {
    const q = orbs[i]; if (q.x * q.x + q.y * q.y > R2) continue;
    const sz = (3 + Math.sqrt(q.v) * 2.2) * 3.4 * (1 + .1 * Math.sin(t * 3 + q.id));
    c.drawImage(sprite(q.h), q.x - sz / 2, q.y - sz / 2, sz, sz);
  }
  /* serpents (les plus gros dessous) */
  const list = world.snakes.filter(s => s.alive && Math.abs(s.x - cam.x) < vw / 2 + s.ext && Math.abs(s.y - cam.y) < vh / 2 + s.ext).sort((a, b) => a.mass - b.mass);
  for (const s of list) drawSnake(c, s, t, { scale: cam.s, quality: o.quality, names: true });
  if (o.particles) o.particles.draw(c);
  c.restore();
  return list;
}

/* ---------- aperçus (menu, boutique) ---------- */
function drawPreview(cv, L, t, o) {
  o = o || {};
  const dpr = Math.min(2, root.devicePixelRatio || 1), w = cv.clientWidth || 200, h = cv.clientHeight || 150;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const P = cv._P || (cv._P = new Particles()), dt = Math.min(.1, t - (cv._t || t)); cv._t = t;
  const focus = o.focus || 'full', n = focus === 'full' ? (o.n || 26) : 12, amp = o.amp || 16, r = 14, sp = r * .65, segs = [];
  for (let i = 0; i < n; i++) { const d = i * sp; segs.push({ x: -d, y: Math.sin(d * .05 - t * 3) * Math.min(d * .22, amp) }); }
  const s = { segs, r, angle: Math.atan2(segs[0].y - segs[1].y, segs[0].x - segs[1].x), loadout: L, boosting: !!o.boost, protect: 0, name: '' };
  c.save(); let k;
  if (focus === 'head') { k = Math.min(w, h) / (r * 4.2); c.translate(w * .55, h * .5); c.scale(k, k); }
  else if (focus === 'neck') { k = Math.min(w, h) / (r * 7); c.translate(w * .5, h * .5); c.scale(k, k); c.translate(-segs[4].x, -segs[4].y); }
  else { k = Math.min(w / (n * sp + r * 3), h / (amp * 2 + r * 5)); c.translate(w * .5 + (n * sp * .5) * k, h * .5); c.scale(k, k); }
  drawSnake(c, s, t, { scale: k, quality: 'high' });
  emitFx(P, s, dt, t, 'high'); P.update(dt); P.draw(c);
  c.restore();
}

SN.Particles = Particles;
SN.Render = { drawWorld, drawSnake, drawPreview, emitFx, skinColor };
})(window);
