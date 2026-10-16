/* NOVAWORM — interface : menu, boutique, casier, ranked, classement, paramètres, résultats. */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
const S = SN.Store, $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmt = n => Math.round(n).toLocaleString('fr-FR');
let cur = 'menu', cat = 'skin', rar = 'all', sel = null, lbTab = 'global', minis = [], frame = 0, bigBoost = false;

function toast(msg, kind) {
  const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg; $('#toasts').appendChild(d);
  setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3100);
}
function badge(i, sz) {
  const rk = SN.RANKS[i]; sz = sz || 56;
  return '<svg class="badge" width="' + sz + '" height="' + sz + '" viewBox="0 0 64 64"><defs><linearGradient id="bg' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + rk.c + '"/><stop offset="1" stop-color="' + rk.c2 + '"/></linearGradient></defs>' +
    '<polygon points="32,3 58,18 58,46 32,61 6,46 6,18" fill="url(#bg' + i + ')" stroke="rgba(255,255,255,.65)" stroke-width="2"/><polygon points="32,12 50,22 50,42 32,52 14,42 14,22" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>' +
    '<text x="32" y="40" text-anchor="middle" font-size="22" font-weight="800" fill="rgba(0,0,0,.6)">' + (i + 1) + '</text></svg>';
}
const header = (title, back) => '<header class="topbar"><button class="btn back" data-go="menu">← Menu</button><h2>' + title + '</h2><div class="chips"><span class="chip">◆ ' + fmt(S.data.coins) + '</span></div></header>';

function go(name) {
  cur = name; document.body.classList.toggle('playing', !name);
  $$('.screen').forEach(e => e.classList.toggle('active', e.id === 'screen-' + name));
  if (name === 'menu') rMenu(); else if (name === 'shop' || name === 'locker') rStore(name); else if (name === 'ranked') rRanked();
  else if (name === 'leaderboard') rLb(); else if (name === 'settings') rSettings();
}

/* ---------- menu ---------- */
function rMenu() {
  const D = S.data, ri = SN.rankIndex(D.ranked.elo);
  $('#coins').textContent = fmt(D.coins);
  $('#chip-rank').innerHTML = badge(ri, 22) + '<span>' + SN.RANKS[ri].n + ' · ' + fmt(D.ranked.elo) + '</span>';
  $('#in-name').value = D.name; $('#daily-btn').hidden = !S.dailyReady();
  $$('#modeswitch button').forEach(b => b.classList.toggle('on', (b.dataset.mode === 'on') === !!D.settings.online));
  const names = SN.CATS.map(c => SN.item(c.id, D.loadout[c.id])).filter(i => i && i.id !== 'none' && i.cat !== 'eyes').map(i => i.n);
  $('#pv-name').textContent = names.slice(0, 3).join(' · ') || 'Tenue de base';
  $('#net-note').textContent = D.settings.online ? (SN.Net.configured() ? 'Arène en ligne (serveur)' : 'Serveur non configuré → Paramètres') : 'Arène hors ligne : adversaires = bots IA';
}

/* ---------- boutique / casier ---------- */
const focusOf = c => c === 'eyes' || c === 'hat' ? 'head' : c === 'acc' ? 'neck' : 'full';
function previewLoadout() { const it = sel && SN.byKey(sel); return it ? Object.assign({}, S.data.loadout, { [it.cat]: it.id }) : S.data.loadout; }
function rStore(mode) {
  const el = $('#screen-' + mode), D = S.data, L = D.loadout, locker = mode === 'locker';
  const old = $('.items', el), sc = old ? old.scrollTop : 0;
  let items = SN.ITEMS.filter(i => i.cat === cat && (rar === 'all' || i.rar === rar));
  if (locker) items = items.filter(i => D.owned.includes(i.key));
  items.sort((a, b) => SN.RARITY[a.rar].o - SN.RARITY[b.rar].o || a.price - b.price);
  if (!sel || !SN.byKey(sel) || SN.byKey(sel).cat !== cat) sel = cat + ':' + L[cat];
  const it = SN.byKey(sel), owned = D.owned.includes(it.key), eq = L[it.cat] === it.id, price = S.priceOf(it), R = SN.RARITY[it.rar];
  const total = SN.ITEMS.filter(i => i.cat === cat).length, have = SN.ITEMS.filter(i => i.cat === cat && D.owned.includes(i.key)).length;
  const deal = SN.byKey(S.dealKey());
  let btn;
  if (eq) btn = '<button class="btn" disabled>Équipé ✓</button>' + (it.id !== 'none' && it.cat !== 'skin' && it.cat !== 'eyes' ? '<button class="btn" data-act="unequip">Retirer</button>' : '');
  else if (owned) btn = '<button class="btn primary" data-act="equip">Équiper</button>';
  else btn = '<button class="btn primary" data-act="buy"' + (D.coins < price ? ' disabled' : '') + '>Acheter · ◆ ' + fmt(price) + '</button>' + (D.coins < price ? '<small class="muted">Il manque ◆ ' + fmt(price - D.coins) + '</small>' : '');
  el.innerHTML = header(locker ? 'CASIER' : 'BOUTIQUE') +
    '<div class="store"><div class="store-main">' +
    (!locker ? '<div class="deal card" data-item="' + deal.key + '"><span class="tag">OFFRE DU JOUR −30 %</span><b>' + esc(deal.n) + '</b><span class="r-' + deal.rar + '-t">' + SN.RARITY[deal.rar].n + '</span><span>◆ ' + fmt(Math.round(deal.price * .7)) + ' <s>' + fmt(deal.price) + '</s></span>' +
      (S.dailyReady() ? '<button class="btn sm primary" data-act="daily">🎁 Bonus quotidien +120</button>' : '<span class="muted">Bonus quotidien récupéré</span>') + '</div>' :
      '<div class="slots card">' + SN.CATS.map(c => { const q = SN.item(c.id, L[c.id]); return '<button class="slot' + (c.id === cat ? ' on' : '') + '" data-cat="' + c.id + '"><small>' + c.s + '</small><b>' + esc(q ? q.n : '—') + '</b></button>'; }).join('') +
      '<div class="row"><button class="btn sm" data-act="random">🎲 Aléatoire</button><button class="btn sm" data-act="reset-loadout">Par défaut</button></div></div>') +
    '<div class="tabs">' + SN.CATS.map(c => '<button class="tab' + (c.id === cat ? ' on' : '') + '" data-cat="' + c.id + '">' + c.n + '</button>').join('') + '</div>' +
    '<div class="filters"><select data-set="rar"><option value="all">Toutes raretés</option>' + Object.keys(SN.RARITY).map(k => '<option value="' + k + '"' + (rar === k ? ' selected' : '') + '>' + SN.RARITY[k].n + '</option>').join('') + '</select><span class="muted">' + have + ' / ' + total + ' possédés</span></div>' +
    '<div class="items">' + (items.length ? items.map(i => {
      const o = D.owned.includes(i.key), e = L[i.cat] === i.id;
      return '<button class="item r-' + i.rar + (i.key === sel ? ' sel' : '') + '" data-item="' + i.key + '"><canvas class="mini" data-key="' + i.key + '"></canvas><span class="nm">' + esc(i.n) + '</span><span class="pr">' + (e ? 'ÉQUIPÉ' : o ? 'Possédé' : (i.key === S.dealKey() ? '<s>' + fmt(i.price) + '</s> ' : '') + '◆ ' + fmt(S.priceOf(i))) + '</span></button>';
    }).join('') : '<p class="muted pad">Rien ici pour le moment.</p>') + '</div></div>' +
    '<aside class="store-side card"><canvas id="bigpv"></canvas><div class="meta"><span class="rar r-' + it.rar + '-t">' + R.n + '</span><h3>' + esc(it.n) + '</h3><small class="muted">' + SN.CATS.find(c => c.id === it.cat).s + '</small></div><div class="actions">' + btn +
    '<button class="btn sm" data-act="boostdemo">⚡ Aperçu boost</button></div></aside></div>';
  minis = $$('canvas.mini', el); const ni = $('.items', el); if (ni) ni.scrollTop = sc;
  const mb = $$('canvas.mini', el); mb.forEach(cv => { const k = SN.byKey(cv.dataset.key); cv._f = focusOf(k.cat); });
}

/* ---------- ranked ---------- */
function rRanked() {
  const D = S.data, R = D.ranked, ri = SN.rankIndex(R.elo), rk = SN.RANKS[ri], nx = SN.RANKS[ri + 1];
  const pct = nx ? Math.min(100, Math.round((R.elo - rk.min) / (nx.min - rk.min) * 100)) : 100;
  const avg = R.matches ? (R.placeSum / R.matches).toFixed(1) : '–';
  $('#screen-ranked').innerHTML = header('RANKED') + '<div class="rk">' +
    '<div class="card rk-hero">' + badge(ri, 110) + '<div class="rk-info"><small class="muted">' + S.seasonLabel(R.season) + ' · ' + S.daysLeft() + ' j restants</small><h1 style="color:' + rk.c + '">' + rk.n + '</h1><div class="elo">' + fmt(R.elo) + ' ELO <small class="muted">(pic ' + fmt(R.peak) + ')</small></div>' +
    '<div class="bar"><i style="width:' + pct + '%;background:linear-gradient(90deg,' + rk.c2 + ',' + rk.c + ')"></i></div><small class="muted">' + (nx ? (nx.min - R.elo) + ' ELO avant ' + nx.n : 'Rang maximum atteint') + '</small></div>' +
    '<div class="rk-go"><button class="btn ranked xl" data-act="ranked-play">LANCER UN MATCH CLASSÉ</button><small class="muted">12 serpents · 3 min · zone qui rétrécit · pas de réapparition<br>Adversaires : bots IA (ELO local). Un vrai ranked en ligne exige le serveur.</small></div></div>' +
    '<div class="rk-grid"><div class="card"><h3>Récompenses de saison</h3><ul class="rw">' + SN.RANKS.map((r, i) => '<li class="' + (R.claimed.includes(i) || i === 0 ? 'done' : '') + '">' + badge(i, 26) + '<span>' + r.n + ' <small class="muted">dès ' + r.min + '</small></span><b>' + (i ? '◆ ' + r.reward : '—') + '</b><small>' + (i && R.claimed.includes(i) ? '✓ reçu' : '') + '</small></li>').join('') + '</ul>' +
    '<p class="muted sm">En fin de saison : ◆ selon le rang final (' + SN.RANKS.map(r => r.end).join(' / ') + ') + trophée, puis ELO ramené à mi-chemin de 500.</p>' +
    (R.trophies.length ? '<p class="sm">Trophées : ' + R.trophies.map(t => '🏆 ' + S.seasonLabel(t.season) + ' (' + SN.RANKS[t.rank].n + ')').join(' · ') + '</p>' : '') + '</div>' +
    '<div class="card"><h3>Statistiques</h3><div class="stats"><div><b>' + R.matches + '</b><small>Parties</small></div><div><b>' + R.top1 + '</b><small>Victoires</small></div><div><b>' + R.top3 + '</b><small>Top 3</small></div><div><b>' + avg + '</b><small>Place moy.</small></div><div><b>' + R.kills + '</b><small>Éliminations</small></div></div>' +
    '<h3>Comment ça marche</h3><p class="muted sm">Ta place finale (1 = dernier en vie ou plus gros à la fin des 3 min) fait varier l\'ELO : +20 pour une victoire, −20 en dernière place, plus un bonus par élimination. Plus ton rang monte, plus les bots sont forts.</p></div></div>' +
    '<div class="card"><h3>Historique des matchs</h3>' + (R.history.length ? '<table class="tbl"><tr><th>Date</th><th>Place</th><th>Score</th><th>Élims</th><th>ELO</th></tr>' + R.history.slice(0, 20).map(h => '<tr><td>' + new Date(h.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</td><td>#' + h.place + '/' + h.total + '</td><td>' + fmt(h.score) + '</td><td>' + h.kills + '</td><td class="' + (h.delta >= 0 ? 'up' : 'down') + '">' + (h.delta >= 0 ? '+' : '') + h.delta + ' → ' + fmt(h.elo) + '</td></tr>').join('') + '</table>' : '<p class="muted">Aucun match classé pour l\'instant.</p>') + '</div></div>';
}

/* ---------- classement ---------- */
async function rLb() {
  const D = S.data, el = $('#screen-leaderboard'), tab = lbTab, my = tab;
  const tabs = [['global', 'Mondial'], ['weekly', 'Hebdomadaire'], ['friends', 'Amis'], ['local', 'Mes records']];
  const head = header('CLASSEMENT') + '<div class="lb"><div class="tabs">' + tabs.map(t => '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div id="lb-body" class="card"></div></div>';
  el.innerHTML = head; const body = $('#lb-body');
  const rows = (arr) => '<table class="tbl lbt"><tr><th>#</th><th>Pseudo</th><th>Rang</th><th>ELO</th><th>Meilleur score</th></tr>' + arr.map((r, i) => {
    const ri = SN.rankIndex(r.elo); return '<tr class="' + (r.pid === D.pid ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td>' + badge(ri, 20) + ' ' + SN.RANKS[ri].n + '</td><td>' + fmt(r.elo) + '</td><td>' + fmt(r.best) + '</td></tr>';
  }).join('') + '</table>';
  if (tab === 'local') {
    body.innerHTML = '<h3>Meilleures parties sur cet appareil</h3>' + (D.records.length ? '<table class="tbl"><tr><th>#</th><th>Pseudo</th><th>Mode</th><th>Score</th><th>Élims</th><th>Date</th></tr>' + D.records.slice(0, 20).map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td>' + r.mode + '</td><td>' + fmt(r.score) + '</td><td>' + r.kills + '</td><td>' + new Date(r.date).toLocaleDateString('fr-FR') + '</td></tr>').join('') + '</table>' : '<p class="muted">Joue une partie pour enregistrer un record.</p>');
    return;
  }
  const friendsUi = tab === 'friends' ? '<div class="friend"><p>Ton code ami : <code>' + esc(D.pid) + '</code> <button class="btn sm" data-act="copy-id">Copier</button></p><div class="row"><input id="fr-in" placeholder="Code ami" maxlength="24" autocomplete="off"><button class="btn sm primary" data-act="add-friend">Ajouter</button></div>' +
    (D.friends.length ? '<p class="sm muted">Amis enregistrés : ' + D.friends.map(f => '<code>' + esc(f) + '</code> <a href="#" data-act="del-friend" data-id="' + esc(f) + '">✕</a>').join(' · ') + '</p>' : '') + '</div>' : '';
  if (!SN.Net.configured()) {
    body.innerHTML = friendsUi + '<div class="empty"><h3>Classement en ligne non connecté</h3><p class="muted">Le classement ' + (tab === 'global' ? 'mondial' : tab === 'weekly' ? 'hebdomadaire' : 'entre amis') + ' nécessite un serveur : aucun faux joueur n\'est affiché. Lance <code>npm start</code> puis ouvre le jeu via <code>http://localhost:8080</code>, ou renseigne l\'adresse du serveur dans les paramètres.</p><button class="btn primary" data-go="settings">Paramètres du serveur</button></div>';
    return;
  }
  body.innerHTML = friendsUi + '<p class="muted pad">Chargement…</p>';
  const r = await SN.Net.leaderboard(tab, tab === 'friends' ? D.friends.concat([D.pid]) : null);
  if (cur !== 'leaderboard' || lbTab !== my) return;
  const fresh = $('#lb-body'); if (!fresh) return;
  fresh.innerHTML = friendsUi + (r.ok ? (r.rows.length ? rows(r.rows) : '<p class="muted pad">Aucun joueur classé pour le moment. Termine un match pour apparaître ici.</p>') : '<p class="muted pad">' + esc(r.err || 'Erreur') + '</p>');
}

/* ---------- paramètres ---------- */
function rSettings() {
  const D = S.data, s = D.settings;
  const tog = (k, l) => '<label class="row sp"><span>' + l + '</span><input type="checkbox" data-set="' + k + '"' + (s[k] ? ' checked' : '') + '></label>';
  $('#screen-settings').innerHTML = header('PARAMÈTRES') + '<div class="set"><div class="card"><h3>Profil</h3><label class="row sp"><span>Pseudo</span><input data-set="name" maxlength="16" value="' + esc(D.name) + '"></label><p class="sm muted">Code ami : <code>' + esc(D.pid) + '</code></p></div>' +
    '<div class="card"><h3>Audio & graphismes</h3><label class="row sp"><span>Volume général</span><input type="range" min="0" max="1" step=".05" value="' + s.vol + '" data-set="vol"></label>' + tog('sfx', 'Effets sonores') + tog('music', 'Musique d\'ambiance') +
    '<label class="row sp"><span>Qualité</span><select data-set="quality"><option value="high"' + (s.quality === 'high' ? ' selected' : '') + '>Élevée (lueurs)</option><option value="low"' + (s.quality === 'low' ? ' selected' : '') + '>Économique</option></select></label>' + tog('fps', 'Afficher les FPS') + '</div>' +
    '<div class="card"><h3>Partie hors ligne</h3><label class="row sp"><span>Nombre de bots : <b id="bots-v">' + s.bots + '</b></span><input type="range" min="5" max="45" step="1" value="' + s.bots + '" data-set="bots"></label>' +
    '<p class="sm muted">Contrôles : souris pour diriger, clic gauche ou Espace pour accélérer (consomme de la masse), Échap pour la pause. Mobile : glisse le doigt + bouton BOOST.</p></div>' +
    '<div class="card"><h3>Serveur en ligne</h3><p class="sm muted">Optionnel. Sans serveur, tout fonctionne hors ligne. Format : <code>localhost:8080</code> ou <code>mon-serveur.com</code>.</p><div class="row"><input data-set="server" placeholder="adresse du serveur" value="' + esc(s.server) + '"><button class="btn sm" data-act="test-server">Tester</button></div><p id="srv-status" class="sm muted">' + (SN.Net.configured() ? 'Serveur détecté / configuré.' : 'Aucun serveur.') + '</p></div>' +
    '<div class="card"><h3>Données</h3><div class="row wrap"><button class="btn sm" data-act="export">Exporter la sauvegarde</button><button class="btn sm" data-act="import">Importer</button><button class="btn sm danger" data-act="reset-all">Tout réinitialiser</button></div></div></div>';
}

/* ---------- résultats ---------- */
function showResult(res, out, kind, forfeit) {
  const ov = $('#overlay'); ov.hidden = false; const D = S.data;
  let html = '<div class="modal card result">';
  if (res.mode === 'ranked') {
    const win = res.place === 1, up = out.rankTo > out.rankFrom, down = out.rankTo < out.rankFrom;
    html += '<small class="muted">' + (forfeit ? 'ABANDON' : 'MATCH CLASSÉ TERMINÉ') + '</small><h1 class="' + (win ? 'win' : '') + '">#' + res.place + ' <small>/ ' + res.total + '</small></h1>' +
      '<div class="elo-line ' + (out.delta >= 0 ? 'up' : 'down') + '">' + (out.delta >= 0 ? '+' : '') + out.delta + ' ELO <small>→ ' + fmt(out.elo) + '</small></div>' +
      (up ? '<div class="promo">⬆ PROMOTION : ' + SN.RANKS[out.rankTo].n + '</div>' : down ? '<div class="promo dn">⬇ Rétrogradé : ' + SN.RANKS[out.rankTo].n + '</div>' : '');
    if (up) SN.Sfx.rankUp();
  } else html += '<small class="muted">' + (kind === 'online' ? 'PARTIE EN LIGNE' : 'ÉLIMINÉ') + '</small><h1>Score ' + fmt(res.score) + '</h1>';
  html += '<div class="stats"><div><b>' + fmt(res.score) + '</b><small>Score</small></div><div><b>' + res.kills + '</b><small>Éliminations</small></div><div><b>' + Math.floor(res.secs / 60) + ':' + String(res.secs % 60).padStart(2, '0') + '</b><small>Durée</small></div><div><b>+' + fmt(out.coins + (out.milestones || 0)) + '</b><small>◆ gagnés</small></div></div>' +
    (out.milestones ? '<p class="sm">🎁 Récompense de rang : +' + fmt(out.milestones) + ' ◆</p>' : '') +
    '<div class="row"><button class="btn primary" data-act="replay" data-kind="' + kind + '">Rejouer</button><button class="btn" data-act="quit-menu">Menu</button></div></div>';
  ov.innerHTML = html;
}
function seasonReport(rep) {
  const ov = $('#overlay'); ov.hidden = false;
  ov.innerHTML = '<div class="modal card"><small class="muted">FIN DE SAISON</small><h2>' + S.seasonLabel(rep.from) + '</h2><div class="row center">' + badge(rep.rank, 90) + '</div><p>Rang final : <b>' + SN.RANKS[rep.rank].n + '</b> (' + fmt(rep.elo) + ' ELO)</p><p class="up">+ ◆ ' + fmt(rep.reward) + ' · trophée 🏆 ajouté</p><p class="muted sm">Nouvelle saison : ' + S.seasonLabel(rep.to) + '. Ton ELO a été ramené à mi-chemin de 500.</p><button class="btn primary" data-act="close-overlay">Continuer</button></div>';
  SN.Sfx.rankUp();
}

/* ---------- actions ---------- */
function startPlay(kind) {
  SN.Sfx.init();
  if (kind === 'free' && S.data.settings.online) { if (!SN.Net.configured()) { toast('Configure le serveur dans les paramètres', 'bad'); go('settings'); return; } kind = 'online'; }
  SN.Game.start(kind);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-act],[data-item],[data-cat],[data-tab],[data-mode]'); if (!t) return;
  SN.Sfx.init(); if (t.tagName === 'BUTTON' && !t.disabled) SN.Sfx.click();
  const D = S.data;
  if (t.dataset.go) { go(t.dataset.go); return; }
  if (t.dataset.mode) { D.settings.online = t.dataset.mode === 'on'; S.save(); rMenu(); return; }
  if (t.dataset.cat) { cat = t.dataset.cat; sel = null; rStore(cur); return; }
  if (t.dataset.tab) { lbTab = t.dataset.tab; rLb(); return; }
  if (t.dataset.item) { const it = SN.byKey(t.dataset.item); if (it) { cat = it.cat; sel = it.key; rStore(cur); } return; }
  const a = t.dataset.act; if (!a) return; if (a === 'del-friend') e.preventDefault();
  switch (a) {
    case 'play': startPlay('free'); break;
    case 'ranked-play': startPlay('ranked'); break;
    case 'replay': startPlay(t.dataset.kind === 'online' ? 'free' : t.dataset.kind); break;
    case 'quit-menu': SN.Game.stop(); go('menu'); break;
    case 'resume': SN.Game.resume(); break;
    case 'quit': SN.Game.quit(); break;
    case 'close-overlay': $('#overlay').hidden = true; rMenu(); break;
    case 'buy': if (S.buy(sel)) { SN.Sfx.buy(); toast('Acheté et équipé !', 'ok'); } else { SN.Sfx.error(); toast('Pas assez de ◆', 'bad'); } rStore(cur); break;
    case 'equip': S.equip(sel); rStore(cur); break;
    case 'unequip': { const it = SN.byKey(sel); S.equip(it.cat + ':none'); sel = null; rStore(cur); break; }
    case 'boostdemo': bigBoost = !bigBoost; setTimeout(() => { bigBoost = false; }, 2500); break;
    case 'random': SN.CATS.forEach(c => { const p = SN.ITEMS.filter(i => i.cat === c.id && D.owned.includes(i.key)); const i = p[Math.floor(Math.random() * p.length)]; D.loadout[c.id] = i.id; }); S.save(); rStore(cur); break;
    case 'reset-loadout': Object.assign(D.loadout, SN.DEFAULT_LOADOUT); S.save(); rStore(cur); break;
    case 'daily': { const g = S.claimDaily(); if (g) { SN.Sfx.buy(); toast('+' + g + ' ◆ bonus quotidien', 'ok'); } if (cur === 'menu') rMenu(); else rStore(cur); break; }
    case 'copy-id': try { navigator.clipboard.writeText(D.pid); toast('Code copié', 'ok'); } catch (x) { toast(D.pid); } break;
    case 'add-friend': { const v = ($('#fr-in').value || '').trim(); if (v && v !== D.pid && !D.friends.includes(v)) { D.friends.push(v); S.save(); } rLb(); break; }
    case 'del-friend': D.friends = D.friends.filter(f => f !== t.dataset.id); S.save(); rLb(); break;
    case 'test-server': SN.Net.health().then(r => { $('#srv-status').textContent = r.ok ? '✓ Serveur NOVAWORM joignable.' : '✗ ' + (r.err || 'Réponse invalide'); }); break;
    case 'export': { const b = new Blob([S.exportJSON()], { type: 'application/json' }), u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'novaworm-sauvegarde.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); break; }
    case 'import': { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(x => { try { S.importJSON(x); toast('Sauvegarde importée', 'ok'); rSettings(); } catch (er) { toast('Fichier invalide', 'bad'); } }); }; i.click(); break; }
    case 'reset-all': if (root.confirm('Effacer toute la progression (pièces, cosmétiques, ELO) ?')) { S.reset(); toast('Données réinitialisées'); go('menu'); } break;
  }
});
document.addEventListener('input', e => {
  const t = e.target.closest('[data-set]'); if (!t || !t.dataset.set) return; const k = t.dataset.set, s = S.data.settings;
  if (k === 'name') { S.data.name = t.value.replace(/[<>]/g, '').slice(0, 16) || 'Joueur'; S.save(); return; }
  if (k === 'rar') { rar = t.value; rStore(cur); return; }
  if (k === 'server') { s.server = t.value.trim(); S.save(); return; }
  s[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? parseFloat(t.value) : t.value;
  if (k === 'bots') $('#bots-v').textContent = s.bots; S.save(); SN.Sfx.apply();
});
$('#in-name').addEventListener('input', e => { S.data.name = e.target.value.replace(/[<>]/g, '').slice(0, 16) || 'Joueur'; S.save(); });

/* ---------- animation des aperçus ---------- */
function tick(now) {
  frame++;
  if (cur === 'menu') SN.Render.drawPreview($('#menu-preview'), S.data.loadout, now, { amp: 38, n: 34 });
  else if (cur === 'shop' || cur === 'locker') {
    const big = $('#bigpv'), it = sel && SN.byKey(sel);
    if (big && it) SN.Render.drawPreview(big, previewLoadout(), now, { focus: focusOf(it.cat) === 'full' ? 'full' : focusOf(it.cat), amp: 30, n: 30, boost: bigBoost });
    if (frame % 3 === 0) for (const cv of minis) { const k = SN.byKey(cv.dataset.key); if (!k) continue; SN.Render.drawPreview(cv, Object.assign({}, S.data.loadout, { [k.cat]: k.id }), now, { focus: cv._f, n: 18, amp: 12 }); }
  }
}

SN.UI = { go, toast, tick, showResult, seasonReport, get cur() { return cur; } };
})(window);
