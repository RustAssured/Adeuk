import { Game } from '../src/engine/game';
import { meeting2 } from '../src/engine/config';
import { ALL, dist, unkey } from '../src/engine/hex';

const N = 400;
const ringVanOog = new Map<number, number>();
const burenBijStart = new Map<number, number>();
let zetelRing = new Map<number, number>();
let geenOog = 0;

for (let s = 0; s < N; s++) {
  const g = new Game(s, meeting2());
  const zr = dist(unkey(g.seat), [0, 0]);
  zetelRing.set(zr, (zetelRing.get(zr) ?? 0) + 1);
  if (!g.oog) { geenOog++; continue; }
  const r = dist(unkey(g.oog), [0, 0]);
  ringVanOog.set(r, (ringVanOog.get(r) ?? 0) + 1);
  const b = g.nbKeys(g.oog).filter((k) => ALL.some((c) => `${c[0]},${c[1]}` === k)).length;
  burenBijStart.set(b, (burenBijStart.get(b) ?? 0) + 1);
}
const toon = (m: Map<number, number>) =>
  [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}: ${((100 * v) / N).toFixed(0)}%`).join('  ');

console.log(`${N} partijen in de meetstand\n`);
console.log('ring van de Zetel        ', toon(zetelRing));
console.log('ring van het Oog         ', toon(ringVanOog), geenOog ? `(geen Oog: ${geenOog})` : '');
console.log('buren van het Oog op het bord', toon(burenBijStart));
console.log('\n→ hoeveel tegels moet hij eten om het Oog in te sluiten? = het aantal buren.');
