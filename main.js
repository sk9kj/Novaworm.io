/* NOVAWORM — point d'entrée. */
(function (root) {
'use strict';
const SN = root.SN;
SN.Store.load();
const rep = SN.Store.checkSeason();
SN.UI.go('menu');
if (rep) SN.UI.seasonReport(rep);
SN.Net.probe().then(() => { if (SN.UI.cur === 'menu') SN.UI.go('menu'); });
['pointerdown', 'keydown'].forEach(ev => root.addEventListener(ev, () => SN.Sfx.init(), { once: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden && SN.Game.playing) SN.Game.togglePause(); });
})(window);
