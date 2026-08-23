import { Game } from '../src/engine/game';
import { meeting2 } from '../src/engine/config';
const t0 = Date.now();
const N = 40;
for (let s = 0; s < N; s++) new Game(s, meeting2({ nexusBot: 'gemengd' })).play();
console.log(`${N} partijen in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${((Date.now() - t0) / N).toFixed(0)} ms per partij`);
