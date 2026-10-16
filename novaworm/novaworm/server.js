/* NOVAWORM — serveur Node : fichiers statiques + arène multijoueur (WebSocket) + API de classement.
   Lancer : node server.js   (aucune dépendance)   →   http://localhost:8080
   La simulation est celle de core.js (la même que dans le navigateur). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const crypto = require('crypto');
require('./data.js'); require('./core.js');
const SN = globalThis.SN;

const PORT = +process.env.PORT || 8080;
const MAX_PLAYERS = +process.env.MAX_PLAYERS || 40;
const MIN_SNAKES = +process.env.MIN_SNAKES || 18;       // les bots complètent jusqu'à ce nombre
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'leaderboard.json');
const TICK = 1 / 30;

/* ---------- classement persistant (fichier JSON — remplaçable par une vraie base) ---------- */
let db = { players: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { /* premier lancement */ }
let dirty = false;
setInterval(() => { if (!dirty) return; dirty = false; fs.writeFile(DB_FILE, JSON.stringify(db), () => {}); }, 5000);
const weekId = () => { const d = new Date(), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-W' + Math.ceil(((t - y) / 864e5 + 1) / 7); };
const clean = (s) => String(s || '').replace(/[<>&"'`\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Joueur';
const hits = new Map();
function limited(ip) { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000); a.push(n); hits.set(ip, a); return a.length > 30; }
setInterval(() => hits.clear(), 300000);

function submit(b) {
  if (!b || typeof b.pid !== 'string' || !/^[\w-]{3,24}$/.test(b.pid)) return false;
  const score = Math.max(0, Math.min(20000, Math.floor(+b.score || 0)));
  const elo = Math.max(0, Math.min(4000, Math.floor(+b.elo || 0)));
  const p = db.players[b.pid] || (db.players[b.pid] = { name: 'Joueur', elo: 0, best: 0, week: '', weekBest: 0 });
  p.name = clean(b.name); p.elo = elo || p.elo; p.best = Math.max(p.best, score);
  const w = weekId(); if (p.week !== w) { p.week = w; p.weekBest = 0; } p.weekBest = Math.max(p.weekBest, score);
  p.updated = Date.now(); dirty = true; return true;
}
function board(scope, ids) {
  const w = weekId(); let arr = Object.entries(db.players).map(([pid, p]) => ({ pid, name: p.name, elo: p.elo, best: scope === 'weekly' ? (p.week === w ? p.weekBest : 0) : p.best }));
  if (scope === 'friends') { const set = new Set(ids); arr = arr.filter(r => set.has(r.pid)); }
  if (scope === 'weekly') arr = arr.filter(r => r.best > 0);
  arr.sort(scope === 'weekly' ? (a, b) => b.best - a.best : (a, b) => b.elo - a.elo || b.best - a.best);
  return arr.slice(0, 100);
}

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PUBLIC = new Set(['index.html', 'style.css', 'data.js', 'core.js', 'storage.js', 'audio.js', 'render.js', 'net.js', 'game.js', 'ui.js', 'main.js']);
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(JSON.stringify(o)); };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), ip = req.socket.remoteAddress;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (u.pathname === '/api/health') return json(res, 200, { game: 'novaworm', players: humans(), bots: world.snakes.filter(s => s.bot && s.alive).length, max: MAX_PLAYERS });
  if (u.pathname === '/api/leaderboard') { const scope = ['global', 'weekly', 'friends'].includes(u.searchParams.get('scope')) ? u.searchParams.get('scope') : 'global'; const ids = (u.searchParams.get('ids') || '').split(',').slice(0, 100); return json(res, 200, { rows: board(scope, ids) }); }
  if (u.pathname === '/api/result' && req.method === 'POST') {
    if (limited(ip)) return json(res, 429, { error: 'trop de requêtes' });
    let body = ''; req.on('data', d => { body += d; if (body.length > 4096) req.destroy(); });
    req.on('end', () => { try { json(res, submit(JSON.parse(body)) ? 200 : 400, { ok: true }); } catch (e) { json(res, 400, { error: 'JSON invalide' }); } }); return;
  }
  const f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
  if (!PUBLIC.has(f)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, f), (err, data) => { if (err) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data); });
});


/* ---------- mini serveur WebSocket (RFC 6455, sans dépendance) ---------- */
function acceptWS(server, onConn, opt) {
  server.on('upgrade', (req, socket) => {
    const u = new URL(req.url, 'http://x'), key = req.headers['sec-websocket-key'];
    if (u.pathname !== opt.path || !key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
    const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
    socket.setNoDelay(true);
    const handlers = {}, ws = { readyState: 1,
      on(ev, fn) { handlers[ev] = fn; },
      emit(ev, a) { if (handlers[ev]) handlers[ev](a); },
      send(str) { if (ws.readyState !== 1) return; const d = Buffer.from(str), n = d.length; let h;
        if (n < 126) h = Buffer.from([0x81, n]); else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); } else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
        socket.write(Buffer.concat([h, d])); },
      close() { if (ws.readyState !== 1) return; ws.readyState = 3; try { socket.end(Buffer.from([0x88, 0])); } catch (e) {} } };
    let buf = Buffer.alloc(0), closed = false;
    const done = () => { if (closed) return; closed = true; ws.readyState = 3; ws.emit('close'); };
    socket.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 2) {
        const op = buf[0] & 15, masked = buf[1] & 128; let len = buf[1] & 127, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (len > opt.maxPayload || !masked) { socket.destroy(); return; }
        if (buf.length < off + 4 + len) return;
        const mk = buf.subarray(off, off + 4), data = Buffer.from(buf.subarray(off + 4, off + 4 + len));
        for (let i = 0; i < len; i++) data[i] ^= mk[i & 3];
        buf = buf.subarray(off + 4 + len);
        if (op === 1) ws.emit('message', data.toString('utf8'));
        else if (op === 8) { ws.close(); socket.end(); return; }
        else if (op === 9) { const pong = Buffer.concat([Buffer.from([0x8A, data.length]), data]); if (data.length < 126) socket.write(pong); }
      }
    });
    socket.on('close', done); socket.on('error', () => { done(); });
    onConn(ws);
  });
}

/* ---------- arène en ligne ---------- */
const world = new SN.World({ radius: 4200, bots: 0, skill: .6, loadoutFn: SN.randomLoadout }); world.isServer = true;
const clients = new Map(); let nid = 1, tickN = 0;
const humans = () => clients.size;
function fillBots() { const n = world.snakes.filter(s => s.alive).length, pend = world.respawns.length; for (let i = n + pend; i < MIN_SNAKES; i++) world.addBot(); }
for (let i = 0; i < MIN_SNAKES; i++) world.addBot();

acceptWS(server, (ws) => {
  let me = null;
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'join' && !me) {
      if (clients.size >= MAX_PLAYERS) { ws.send(JSON.stringify({ t: 'full' })); return ws.close(); }
      const id = 'h' + (nid++), s = world.addHuman(id, clean(m.name), SN.cleanLoadout(m.loadout));
      me = { id, ws, snake: s, known: new Set(), a: 0, b: 0, evs: [] }; clients.set(id, me);
      ws.send(JSON.stringify({ t: 'hello', id, R: world.R0 }));
    } else if (m.t === 'in' && me && me.snake.alive) {
      const a = +m.a; if (Number.isFinite(a)) { me.snake.target = a; me.snake.want = !!m.b; }
    }
  });
  ws.on('close', () => { if (me) { clients.delete(me.id); world.removeSnake(me.snake); } });
}, { path: '/ws', maxPayload: 4096 });

setInterval(() => {
  world.step(TICK); tickN++; fillBots();
  const evs = world.events.splice(0);
  if (tickN % 2) return;
  const lb = tickN % 30 === 0 ? world.leaderboard(8) : null;
  for (const c of clients.values()) {
    if (c.ws.readyState !== 1) continue;
    const snap = world.snapshotFor(c.id, c.known, !!lb || !c.sentLb); if (snap.lb) c.sentLb = true;
    const sn = c.snake; snap.ev = evs.filter(e => e.t === 'death' && (e.id === c.id || e.killer === c.id || Math.hypot(e.x - sn.x, e.y - sn.y) < 1500)).map(e => Object.assign({}, e, { x: Math.round(e.x), y: Math.round(e.y) }));
    const eat = evs.filter(e => e.t === 'eat' && e.id === c.id).length; for (let i = 0; i < Math.min(eat, 3); i++) snap.ev.push({ t: 'eat', id: c.id, v: 1 });
    try { c.ws.send(JSON.stringify(snap)); } catch (e) {}
  }
}, TICK * 1000);

server.listen(PORT, () => console.log('NOVAWORM prêt : http://localhost:' + PORT + '  (arène : ' + MIN_SNAKES + ' serpents min., ' + MAX_PLAYERS + ' joueurs max.)'));
