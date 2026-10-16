/* NOVAWORM — catalogue de cosmétiques, raretés, rangs. Chargé côté navigateur ET côté serveur Node. */
(function (root) {
'use strict';
const SN = root.SN = root.SN || {};

SN.RARITY = {
  common:    { n: 'Commun',     c: '#9fb0c8', price: 90,   o: 0 },
  rare:      { n: 'Rare',       c: '#38bdf8', price: 320,  o: 1 },
  epic:      { n: 'Épique',     c: '#c084fc', price: 800,  o: 2 },
  legendary: { n: 'Légendaire', c: '#fbbf24', price: 1900, o: 3 },
  mythic:    { n: 'Mythique',   c: '#fb7185', price: 4200, o: 4 }
};
SN.CATS = [
  { id: 'skin',    n: 'Skins',       s: 'Skin' },
  { id: 'pattern', n: 'Motifs',      s: 'Motif' },
  { id: 'eyes',    n: 'Yeux',        s: 'Yeux' },
  { id: 'hat',     n: 'Chapeaux',    s: 'Chapeau' },
  { id: 'acc',     n: 'Accessoires', s: 'Accessoire' },
  { id: 'fx',      n: 'Effets',      s: 'Effet lumineux' }
];

SN.ITEMS = [];
const M = {};
SN.item = (cat, id) => M[cat + ':' + id];
SN.byKey = (k) => M[k];
function add(cat, id, n, rar, free, x) {
  const it = Object.assign({ key: cat + ':' + id, id, cat, n, rar, price: free ? 0 : SN.RARITY[rar].price }, x || {});
  SN.ITEMS.push(it); M[it.key] = it;
}
const sk = (id, n, rar, mode, colors, free, x) => add('skin', id, n, rar, free, Object.assign({ mode, colors }, x));

/* ---------- Skins (modes : cycle, gradient, wave, rainbow) ---------- */
sk('neon', 'Vert Néon', 'common', 'cycle', ['#39ff88', '#16c868'], 1);
sk('cyan', 'Cyan Pulse', 'common', 'cycle', ['#22d3ee', '#0ea5c6'], 1);
sk('rose', 'Rose Pop', 'common', 'cycle', ['#ff6fb5', '#e0408f'], 1);
sk('mandarine', 'Mandarine', 'common', 'cycle', ['#ffa94d', '#f97316']);
sk('amethyste', 'Améthyste', 'common', 'cycle', ['#b388ff', '#7c4dff']);
sk('rubis', 'Rubis', 'common', 'cycle', ['#ff5d6c', '#d62839']);
sk('lagon', 'Lagon', 'rare', 'gradient', ['#00f5d4', '#00bbf9']);
sk('braise', 'Braise', 'rare', 'gradient', ['#ffd200', '#ff5400', '#c1121f']);
sk('sakura', 'Sakura', 'rare', 'cycle', ['#ffd6e0', '#ff8fab', '#fb6f92']);
sk('toxique', 'Toxique', 'rare', 'cycle', ['#d9f99d', '#84cc16', '#365314']);
sk('glacier', 'Glacier', 'rare', 'gradient', ['#e0f2fe', '#7dd3fc', '#3b82f6']);
sk('aurore', 'Aurore', 'epic', 'gradient', ['#00ff87', '#60efff', '#a855f7']);
sk('galaxie', 'Galaxie', 'epic', 'gradient', ['#1e1b4b', '#7c3aed', '#f0abfc', '#7c3aed', '#1e1b4b']);
sk('candy', 'Bonbon', 'epic', 'cycle', ['#ff70a6', '#ffd670', '#70d6ff', '#e9ff70']);
sk('lave', 'Lave', 'epic', 'wave', ['#450a0a', '#ef4444', '#fbbf24']);
sk('obsidienne', 'Obsidienne', 'epic', 'cycle', ['#111827', '#312e81', '#111827', '#4c1d95']);
sk('or', 'Or Pur', 'legendary', 'gradient', ['#fff7ae', '#ffc400', '#b8860b', '#ffc400']);
sk('arcenciel', 'Arc-en-ciel', 'legendary', 'rainbow', ['#ff0055', '#ffee00', '#00ffcc'], 0, { speed: 1 });
sk('plasma', 'Plasma', 'legendary', 'wave', ['#22d3ee', '#a855f7', '#ec4899']);
sk('prisme', 'Prisme', 'mythic', 'rainbow', ['#ffffff', '#ff00aa', '#00e5ff'], 0, { speed: 2.4, shim: 1 });
sk('abysse', 'Abysse', 'mythic', 'wave', ['#001219', '#0a9396', '#94d2bd', '#0a9396']);

/* ---------- Motifs ---------- */
add('pattern', 'none', 'Aucun motif', 'common', 1);
add('pattern', 'stripes', 'Rayures', 'common');
add('pattern', 'dots', 'Pois', 'common');
add('pattern', 'rings', 'Anneaux', 'rare');
add('pattern', 'checker', 'Damier', 'rare');
add('pattern', 'scales', 'Écailles', 'epic');
add('pattern', 'stars', 'Étoiles', 'epic');
add('pattern', 'circuit', 'Circuit', 'legendary');

/* ---------- Yeux ---------- */
add('eyes', 'round', 'Classiques', 'common', 1);
add('eyes', 'cute', 'Mignons', 'common');
add('eyes', 'angry', 'Furieux', 'common');
add('eyes', 'sleepy', 'Endormis', 'common');
add('eyes', 'dizzy', 'Étourdis', 'rare');
add('eyes', 'cool', 'Lunettes de soleil', 'rare');
add('eyes', 'cyclops', 'Cyclope', 'rare');
add('eyes', 'alien', 'Alien', 'epic');
add('eyes', 'heart', 'Yeux en cœur', 'epic');
add('eyes', 'laser', 'Laser', 'legendary');

/* ---------- Chapeaux ---------- */
add('hat', 'none', 'Aucun chapeau', 'common', 1);
add('hat', 'cap', 'Casquette', 'common');
add('hat', 'party', 'Chapeau de fête', 'common');
add('hat', 'catears', 'Oreilles de chat', 'rare');
add('hat', 'headphones', 'Casque audio', 'rare');
add('hat', 'tophat', 'Haut-de-forme', 'rare');
add('hat', 'horns', 'Cornes de démon', 'epic');
add('hat', 'viking', 'Casque viking', 'epic');
add('hat', 'wizard', 'Chapeau de sorcier', 'epic');
add('hat', 'crown', 'Couronne', 'legendary');
add('hat', 'halo', 'Auréole', 'legendary');

/* ---------- Accessoires ---------- */
add('acc', 'none', 'Aucun accessoire', 'common', 1);
add('acc', 'bowtie', 'Nœud papillon', 'common');
add('acc', 'scarf', 'Écharpe', 'rare');
add('acc', 'antenna', 'Antennes', 'rare');
add('acc', 'spikes', 'Piques', 'epic');
add('acc', 'wings', 'Ailes', 'epic');
add('acc', 'cape', 'Cape royale', 'legendary');

/* ---------- Effets lumineux ---------- */
add('fx', 'none', 'Aucun effet', 'common', 1);
add('fx', 'neon', 'Néon', 'rare', 0, { glow: 'skin' });
add('fx', 'spark', 'Étincelles', 'rare', 0, { glow: '#fde047', p: 'spark' });
add('fx', 'hearts', 'Cœurs flottants', 'rare', 0, { glow: '#f472b6', p: 'heart' });
add('fx', 'flame', 'Flammes', 'epic', 0, { glow: '#ff6a00', p: 'flame' });
add('fx', 'ice', 'Givre', 'epic', 0, { glow: '#7dd3fc', p: 'ice' });
add('fx', 'electric', 'Foudre', 'legendary', 0, { glow: '#67e8f9', p: 'bolt' });
add('fx', 'void', 'Néant', 'legendary', 0, { glow: '#7c3aed', p: 'void' });
add('fx', 'aura', 'Aura arc-en-ciel', 'mythic', 0, { glow: 'rainbow', p: 'rain' });

SN.DEFAULT_LOADOUT = { skin: 'neon', pattern: 'none', eyes: 'round', hat: 'none', acc: 'none', fx: 'none' };

SN.randomLoadout = function () {
  const L = {};
  for (const c of SN.CATS) {
    if (c.id !== 'skin' && c.id !== 'eyes' && Math.random() < 0.4) { L[c.id] = 'none'; continue; }
    const r = Math.random();
    const tier = r < .5 ? 'common' : r < .75 ? 'rare' : r < .9 ? 'epic' : r < .97 ? 'legendary' : 'mythic';
    let pool = SN.ITEMS.filter(i => i.cat === c.id && i.rar === tier && i.id !== 'none');
    if (!pool.length) pool = SN.ITEMS.filter(i => i.cat === c.id && i.id !== 'none');
    L[c.id] = pool[Math.floor(Math.random() * pool.length)].id;
  }
  return L;
};
SN.cleanLoadout = function (L) {           // valide un loadout reçu (serveur)
  const out = {};
  for (const c of SN.CATS) out[c.id] = (L && SN.item(c.id, L[c.id])) ? L[c.id] : SN.DEFAULT_LOADOUT[c.id];
  return out;
};

/* ---------- Rangs ---------- */
SN.RANKS = [
  { id: 'bronze',   n: 'Bronze',   min: 0,    c: '#e0955a', c2: '#8a4b1f', reward: 0,    end: 50 },
  { id: 'argent',   n: 'Argent',   min: 800,  c: '#e2e8f0', c2: '#8794a8', reward: 100,  end: 150 },
  { id: 'or',       n: 'Or',       min: 1100, c: '#fde047', c2: '#b7791f', reward: 200,  end: 300 },
  { id: 'diamant',  n: 'Diamant',  min: 1400, c: '#8cf3ff', c2: '#2b8fd6', reward: 400,  end: 600 },
  { id: 'elite',    n: 'Élite',    min: 1700, c: '#d8a8ff', c2: '#7e22ce', reward: 800,  end: 1200 },
  { id: 'champion', n: 'Champion', min: 2000, c: '#ff9db0', c2: '#e11d48', reward: 1500, end: 2500 }
];
SN.rankIndex = (elo) => { let r = 0; for (let i = 0; i < SN.RANKS.length; i++) if (elo >= SN.RANKS[i].min) r = i; return r; };

if (typeof module !== 'undefined' && module.exports) module.exports = SN;
})(typeof window !== 'undefined' ? window : globalThis);
