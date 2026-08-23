import { Game } from '../src/engine/game';
import { meeting2 } from '../src/engine/config';
const seed = Number(process.argv[2] ?? 0);
const g = new Game(seed, meeting2());
g.trace = true;
g.play();
for (const ev of g.events) {
  if (ev.kind === 'beurt') console.log(`--- ${ev.text} teller ${ev.after.pileL}/${g.cfg.needL}  verzw ${ev.after.pileN}  route ${ev.after.routeOpen ? 'open' : 'tekort ' + ev.after.routeTekort}`);
  else console.log('   ', ev.kind.padEnd(14), ev.text);
}
console.log('\nuitslag:', g.done, '| ketens verhard', g.ketensVerhard, 'gebroken', g.ketensGebroken, '| los', g.losPunten, 'keten', g.ketenPunten);
