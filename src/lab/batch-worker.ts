/**
 * De batch draait in een aparte draad. Vijfhonderd potjes met de zoekbot kosten
 * seconden tot minuten; op de hoofddraad zou het lab al die tijd bevriezen.
 */
import { Game } from '../engine/game';
import { vatSamen } from '../engine/batch';
import type { GameConfig } from '../engine/config';
import type { GameResult } from '../engine/types';

export interface BatchOpdracht {
  cfg: GameConfig;
  n: number;
  seedStart: number;
}
export type BatchBericht =
  | { soort: 'voortgang'; klaar: number; totaal: number }
  | { soort: 'klaar'; metriek: ReturnType<typeof vatSamen> };

self.onmessage = (e: MessageEvent<BatchOpdracht>) => {
  const { cfg, n, seedStart } = e.data;
  const uit: GameResult[] = [];
  const stap = Math.max(1, Math.floor(n / 40));
  for (let i = 0; i < n; i++) {
    const g = new Game(seedStart + i, cfg);
    uit.push(g.result(g.play()));
    if ((i + 1) % stap === 0 || i + 1 === n) {
      const bericht: BatchBericht = { soort: 'voortgang', klaar: i + 1, totaal: n };
      self.postMessage(bericht);
    }
  }
  const bericht: BatchBericht = { soort: 'klaar', metriek: vatSamen(uit, cfg) };
  self.postMessage(bericht);
};
