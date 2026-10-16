# NOVAWORM — arène de serpents

Jeu .io en HTML / CSS / JavaScript (Canvas 2D), inspiré du concept de Slither.io. Graphismes, skins et sons sont **100 % originaux** (formes vectorielles dessinées en code, sons synthétisés WebAudio : aucun fichier image ou audio).

## Lancer le jeu

**Option 1 — hors ligne (le plus simple)** : ouvre `index.html` dans un navigateur récent (Chrome, Firefox, Edge, Safari). Tout fonctionne : bots, boutique, casier, ranked, sauvegarde locale.

**Option 2 — avec le serveur (multijoueur + classement mondial)** :

```bash
node server.js            # Node 18+ ; aucune dépendance, pas de npm install
# puis ouvre http://localhost:8080
```

Variables optionnelles : `PORT` (8080), `MAX_PLAYERS` (40), `MIN_SNAKES` (18, les bots complètent l'arène), `DB_FILE` (leaderboard.json).

Quand la page est servie par `server.js`, elle le détecte automatiquement : le bouton **En ligne** du menu rejoint l'arène partagée, et l'onglet **Classement** affiche les vrais résultats enregistrés.

## La tempête (mode Ranked)

6 phases : la zone sûre attend, puis se referme vers un **nouveau centre décalé** (le prochain cercle, en pointillés blancs, est toujours visible dans le jeu et sur la minimap). Hors du cercle violet, tu perds des points en continu, et **de plus en plus vite à mesure que la zone devient petite** (environ 5 pts/s zone pleine, jusqu'à ~50 pts/s pour 100 pts en zone minuscule, plus un pourcentage de ta masse) jusqu'à l'élimination. Formule dans `stormStep` (`core.js`). Une flèche indique le prochain cercle, un bandeau donne le compte à rebours, un voile violet et une alerte sonore te préviennent. Les bots fuient la tempête. Réglage des phases : `SN.STORM_PHASES` dans `core.js` (attente, durée de fermeture, rayon final).

## Déplacement (inspiré de Slither.io)

Vitesse constante, virage limité (plus lent quand le serpent grossit), le corps suit la trajectoire de la tête, boost qui consomme de la masse et laisse des orbes, accélération progressive du boost, orbes proches aspirés vers la tête, petite zone morte de la souris autour de la tête, caméra qui s'éloigne quand on grandit. Réglages dans `Cfg` (`core.js`) : `base`, `boost`, `minBoostMass`.

## Musique

Entièrement synthétisée (WebAudio), elle s'adapte : calme dans le menu, plus rythmée en partie, puis en tempête de plus en plus rapide (cadence environ 2,3 fois plus rapide en fin de partie), plus grave et dense (grosse caisse, charleston, arpège aigu) quand la zone se referme, avec une alerte supplémentaire quand tu es dans la tempête. Voir `SN.Sfx.setMood` (`audio.js`).

## Contrôles

- Souris : diriger · clic gauche ou **Espace** : accélérer (consomme de la masse, laisse des orbes) · **Échap** : pause
- Mobile / tablette : glisser le doigt + bouton **BOOST**

## Fonctionnalités

- **Jouer** : arène de 3500 de rayon, 5 à 45 bots IA réglables, orbes, croissance, collisions (tête contre corps = élimination), les serpents morts laissent leurs orbes, classement en direct, minimap, fil d'éliminations.
- **Ranked** : 12 serpents, 3 min, **tempête mobile façon Fortnite**, pas de réapparition. ELO selon la place + éliminations ; rangs Bronze → Argent → Or → Diamant → Élite → Champion ; récompenses de palier, saisons mensuelles (récompense de fin de saison, trophée, ELO ramené vers 500), historique des 40 derniers matchs. Plus le rang monte, plus les bots sont forts.
- **Boutique / Casier** : 21 skins, 8 motifs, 10 paires d'yeux, 11 chapeaux, 7 accessoires, 8 effets lumineux ; 5 raretés ; monnaie ◆ gagnée en jouant (achats fictifs, aucun argent réel) ; offre du jour −30 % ; bonus quotidien ; **aperçu animé avant achat** ; casier avec équipement, tenue aléatoire, réinitialisation.
- **Classement** : mondial, hebdomadaire, entre amis (code ami), plus « Mes records » local.
- **Paramètres** : pseudo, volume, effets/musique, qualité graphique, FPS, nombre de bots, adresse du serveur, export / import / réinitialisation de la sauvegarde.
- Sauvegarde locale automatique (`localStorage`, clé `novaworm_save_v1`).

## À propos du classement mondial (important)

Aucun faux joueur n'est affiché. Sans serveur, les onglets Mondial / Hebdo / Amis expliquent qu'un serveur est nécessaire. Avec `server.js`, ils affichent uniquement les scores réellement envoyés par les joueurs.

## Architecture (prête pour le vrai multijoueur)

| Fichier | Rôle |
|---|---|
| `core.js` | Simulation (monde, serpents, orbes, collisions, IA). **Sans DOM** : la même logique tourne dans le navigateur (hors ligne) et sur le serveur Node (en ligne). |
| `data.js` | Catalogue des cosmétiques, raretés, rangs (partagé client/serveur). |
| `server.js` | HTTP statique + WebSocket (`/ws`) + API REST de classement. Le serveur est **autoritaire** : il simule, le client n'envoie que `{a: angle, b: boost}` et reçoit des instantanés filtrés autour du joueur. |
| `net.js` | Client réseau : `OnlineMatch` expose la même interface que `World`, donc rendu et HUD sont identiques en ligne et hors ligne. |
| `render.js`, `game.js`, `ui.js`, `storage.js`, `audio.js`, `style.css`, `index.html` | Rendu Canvas, boucle de jeu, interface, sauvegarde, sons. |

### API du serveur

- `GET /api/health` → `{game, players, bots, max}`
- `GET /api/leaderboard?scope=global|weekly|friends[&ids=a,b,c]` → `{rows:[{pid,name,elo,best}]}`
- `POST /api/result` `{pid,name,elo,score,kills,mode}` (limité à 30 requêtes/min/IP)
- WebSocket `/ws` : client → `{t:'join',pid,name,loadout}` puis `{t:'in',a,b}` ; serveur → `{t:'hello'}` puis `{t:'s',…}` ~15 fois/s.

## Brancher un vrai serveur en ligne

1. Héberge ce dossier sur une machine avec Node 18+ (VPS, Render, Railway, Fly.io…) et lance `node server.js` derrière HTTPS (reverse proxy Nginx/Caddy ; le WebSocket doit passer en `wss://`).
2. Soit tu sers aussi le jeu depuis ce serveur (rien à configurer), soit tu héberges les fichiers ailleurs et tu saisis l'adresse du serveur dans **Paramètres → Serveur en ligne** (puis « Tester »).
3. Active **En ligne** dans le menu.

## Limites actuelles (honnêteté)

- Le **ranked** est joué contre des bots avec un ELO **local** : un ranked entre vrais joueurs nécessite un matchmaking côté serveur (salles de 12 joueurs, ELO calculé par le serveur) — l'architecture le permet, mais ce n'est pas encore écrit.
- Les scores envoyés au classement sont déclarés par le client : sur Internet public, il faut ajouter une authentification (comptes) et calculer les scores côté serveur pour empêcher la triche. Le classement est stocké dans un fichier JSON, à remplacer par une base de données pour de la production.
- Les serpents en ligne sont mis à jour à ~15 Hz avec lissage ; pas de prédiction côté client.
