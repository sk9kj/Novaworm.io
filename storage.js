/* NOVAWORM — sauvegarde locale (localStorage), saisons, ELO, progression. */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};
const KEY = 'novaworm_save_v1';
const uuid = () => 'p' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const seasonId = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };

function defaults() {
  return {
    v: 1, pid: uuid(), name: 'Joueur' + Math.floor(Math.random() * 900 + 100), coins: 300,
    owned: SN.ITEMS.filter(i => !i.price).map(i => i.key),
    loadout: Object.assign({}, SN.DEFAULT_LOADOUT),
    settings: { vol: .7, sfx: true, music: true, quality: 'high', fps: false, bots: 25, server: '', online: false },
    ranked: { elo: 500, season: seasonId(), peak: 500, claimed: [], history: [], matches: 0, top1: 0, top3: 0, kills: 0, placeSum: 0, trophies: [] },
    records: [], friends: [], daily: '', stats: { matches: 0, kills: 0, best: 0 }
  };
}
function merge(base, src) {
  if (!src || typeof src !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    const b = base[k], s = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, s);
    else if (Array.isArray(b) ? Array.isArray(s) : typeof s === typeof b) base[k] = s;
  }
  return base;
}

const Store = {
  data: null,
  load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
    this.data = merge(defaults(), saved);
    const D = this.data;
    D.owned = D.owned.filter(k => SN.byKey(k));
    SN.ITEMS.forEach(i => { if (!i.price && !D.owned.includes(i.key)) D.owned.push(i.key); });
    for (const c of SN.CATS) if (!D.owned.includes(c.id + ':' + D.loadout[c.id])) D.loadout[c.id] = SN.DEFAULT_LOADOUT[c.id];
    this.save();
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* stockage plein / privé */ } },
  exportJSON() { return JSON.stringify(this.data); },
  importJSON(txt) { const o = JSON.parse(txt); if (!o || o.v !== 1) throw new Error('format'); this.data = merge(defaults(), o); this.save(); },
  reset() { try { localStorage.removeItem(KEY); } catch (e) {} this.load(); },
  seasonId, seasonLabel(id) {
    const [y, m] = id.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  daysLeft() { const n = new Date(); return Math.max(0, Math.ceil((new Date(n.getFullYear(), n.getMonth() + 1, 1) - n) / 864e5)); },
  /* Fin de saison : récompense selon le rang atteint, trophée, reset partiel de l'ELO. */
  checkSeason() {
    const R = this.data.ranked, now = seasonId();
    if (R.season === now) return null;
    const idx = SN.rankIndex(R.elo), reward = SN.RANKS[idx].end;
    const rep = { from: R.season, to: now, rank: idx, elo: R.elo, reward };
    this.data.coins += reward;
    R.trophies.push({ season: R.season, rank: idx, elo: R.elo });
    R.elo = Math.round(500 + (R.elo - 500) * .5); R.peak = R.elo; R.claimed = []; R.season = now;
    this.save(); return rep;
  },
  /* Offre du jour : -30 % sur un article payant, tiré selon la date. */
  dealKey() {
    const pool = SN.ITEMS.filter(i => i.price > 0), d = new Date().toDateString();
    let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return pool[h % pool.length].key;
  },
  priceOf(it) { return it.key === this.dealKey() ? Math.round(it.price * .7) : it.price; },
  dailyReady() { return this.data.daily !== new Date().toDateString(); },
  claimDaily() { if (!this.dailyReady()) return 0; this.data.daily = new Date().toDateString(); this.data.coins += 120; this.save(); return 120; },
  buy(key) {
    const it = SN.byKey(key), D = this.data, p = this.priceOf(it);
    if (!it || D.owned.includes(key) || D.coins < p) return false;
    D.coins -= p; D.owned.push(key); D.loadout[it.cat] = it.id; this.save(); return true;
  },
  equip(key) { const it = SN.byKey(key); if (!it || !this.data.owned.includes(key)) return false; this.data.loadout[it.cat] = it.id; this.save(); return true; }
};

/* Fin de partie : pièces, ELO, historique, records. res = {mode,score,kills,place,total,secs} */
const Progress = {
  finish(res) {
    const D = Store.data, R = D.ranked, out = { coins: 0, milestones: 0, delta: 0, oldElo: R.elo, elo: R.elo, rankFrom: SN.rankIndex(R.elo), rankTo: SN.rankIndex(R.elo) };
    let coins = Math.floor(res.score / 8) + res.kills * 6;
    if (res.mode === 'ranked') coins += res.place === 1 ? 120 : res.place === 2 ? 80 : res.place === 3 ? 50 : res.place <= Math.ceil(res.total / 2) ? 20 : 0;
    coins = Math.min(coins, 600); D.coins += coins; out.coins = coins;
    D.stats.matches++; D.stats.kills += res.kills; D.stats.best = Math.max(D.stats.best, res.score);
    if (res.mode === 'ranked') {
      const N = res.total, s = (N - res.place) / (N - 1), K = 40;
      const delta = Math.round(K * (s - .5) + Math.min(8, res.kills * 1.5));
      out.delta = Math.max(delta, -R.elo);
      R.elo = Math.max(0, R.elo + out.delta); R.peak = Math.max(R.peak, R.elo);
      R.matches++; R.kills += res.kills; R.placeSum += res.place; if (res.place === 1) R.top1++; if (res.place <= 3) R.top3++;
      R.history.unshift({ date: Date.now(), place: res.place, total: N, score: res.score, kills: res.kills, delta: out.delta, elo: R.elo });
      R.history.length = Math.min(R.history.length, 40);
      out.elo = R.elo; out.rankTo = SN.rankIndex(R.elo);
      for (let i = 1; i <= out.rankTo; i++) if (!R.claimed.includes(i)) { R.claimed.push(i); out.milestones += SN.RANKS[i].reward; }
      D.coins += out.milestones;
    }
    D.records.push({ name: D.name, score: res.score, kills: res.kills, mode: res.mode, date: Date.now(), elo: R.elo });
    D.records.sort((a, b) => b.score - a.score); D.records.length = Math.min(D.records.length, 30);
    Store.save();
    if (SN.Net && SN.Net.submit) SN.Net.submit({ pid: D.pid, name: D.name, elo: R.elo, score: res.score, mode: res.mode, kills: res.kills });
    return out;
  }
};

SN.Store = Store; SN.Progress = Progress;
})(window);
