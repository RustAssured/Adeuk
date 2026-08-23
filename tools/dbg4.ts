import { Game } from '../src/engine/game';
import { meeting2 } from '../src/engine/config';

const cfg = meeting2({
  verharden: { K: 3 }, verzilveren: { M: 1.5 }, needL: 13,
  oversteek: { maxSprong: 1 }, nexusBot: 'gemengd',
});
const N = 200;
let plafond = 0, tellerVol = 0, geenRoute = 0, uitgehongerd = 0;
let verhardTotaal = 0, pileNTotaal = 0, etenTotaal = 0;
for (let s = 0; s < N; s++) {
  const g = new Game(s, cfg);
  const uit = g.play();
  if (uit !== 'timeout') continue;
  plafond++;
  const verhard = g.ketenVan.size;
  verhardTotaal += verhard;
  pileNTotaal += g.pileN;
  // hoeveel tegels kan hij nog ooit opeten?
  let eetbaar = 0;
  for (const k of g.alive) {
    if (k === g.seat || k === g.oog || g.isVerhard(k)) continue;
    eetbaar++;
  }
  etenTotaal += eetbaar;
  if (g.pileL >= g.cfg.needL) tellerVol++;
  if (!Number.isFinite(g.routeTekort())) geenRoute++;
  if (g.pileN + eetbaar < g.cfg.needN) uitgehongerd++;
}
console.log(`${plafond} van ${N} partijen halen het beurtenplafond\n`);
console.log(`  haar teller vol            ${((100 * tellerVol) / plafond).toFixed(0)}%`);
console.log(`  het Oog onbereikbaar       ${((100 * geenRoute) / plafond).toFixed(0)}%`);
console.log(`  hij kan 28 niet meer halen ${((100 * uitgehongerd) / plafond).toFixed(0)}%  <- uitgehongerd door verharde ketens`);
console.log(`\n  gemiddeld ${(verhardTotaal / plafond).toFixed(1)} tegels verhard, hij staat op ${(pileNTotaal / plafond).toFixed(1)} van 28,`);
console.log(`  en er zijn nog ${(etenTotaal / plafond).toFixed(1)} tegels die hij ooit zou mogen eten.`);
