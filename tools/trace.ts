import { Game } from '../src/engine/game';
import { makeConfig } from '../src/engine/config';
const bot = (process.argv[2] ?? 'beam') as 'beam' | 'gretig';
const seed = Number(process.argv[3] ?? 0);
const g = new Game(seed, makeConfig({ laatsteBot: bot, solo: true, maxTurns: 26 }));
g.trace = true;
g.play();
for (const ev of g.events) {
  if (ev.kind === 'beurt') console.log(`--- ${ev.text} voorraad ${ev.after.stock} doos ${ev.after.box} sporen ${ev.after.pileL}`);
  else console.log('   ', ev.kind.padEnd(13), ev.text);
}
