/**
 * De batch draait in een aparte draad. Vijfhonderd potjes met de zoekbot kosten
 * seconden tot minuten; op de hoofddraad zou het lab al die tijd bevriezen.
 *
 * Er kan een tweede ronde bij: dezelfde seeds tegen alle drie de Nexus-persona's.
 * Dat is de enige manier om stelregel 8 (herspeelbaarheid) uit grijs te halen,
 * en het kost ongeveer drie keer zo lang. Vandaar dat het een vinkje is.
 */
import { Game } from '../engine/game';
import { vatSamen } from '../engine/batch';
import { vatSamen2, PERSONAS, type Meting2, type PersonaMeting } from '../engine/meting2';
import type { GameConfig, NexusPersona } from '../engine/config';
import type { GameResult } from '../engine/types';

export interface BatchOpdracht {
  cfg: GameConfig;
  n: number;
  seedStart: number;
  /** ook tegen de andere twee persona's spelen, voor stelregel 8 */
  personas: boolean;
}
export type BatchBericht =
  | { soort: 'voortgang'; klaar: number; totaal: number; wat: string }
  | {
      soort: 'klaar';
      metriek: ReturnType<typeof vatSamen>;
      middenlaag: Meting2;
      personas?: PersonaMeting;
    };

function speel(
  cfg: GameConfig,
  n: number,
  seedStart: number,
  wat: string,
  al: number,
  totaal: number,
): GameResult[] {
  const uit: GameResult[] = [];
  const stap = Math.max(1, Math.floor(totaal / 60));
  for (let i = 0; i < n; i++) {
    const g = new Game(seedStart + i, cfg);
    uit.push(g.result(g.play()));
    const klaar = al + i + 1;
    if (klaar % stap === 0 || klaar === totaal) {
      const bericht: BatchBericht = { soort: 'voortgang', klaar, totaal, wat };
      self.postMessage(bericht);
    }
  }
  return uit;
}

self.onmessage = (e: MessageEvent<BatchOpdracht>) => {
  const { cfg, n, seedStart, personas } = e.data;
  const anderen: NexusPersona[] = personas
    ? PERSONAS.filter((p) => p !== cfg.nexusBot)
    : [];
  const totaal = n * (1 + anderen.length);

  const uit = speel(cfg, n, seedStart, 'de huidige stand', 0, totaal);
  const middenlaag = vatSamen2(uit);

  let pm: PersonaMeting | undefined;
  if (personas) {
    const perPersona: Partial<Record<NexusPersona, Meting2>> = {};
    if (PERSONAS.includes(cfg.nexusBot as NexusPersona)) {
      perPersona[cfg.nexusBot as NexusPersona] = middenlaag;
    }
    let al = n;
    for (const p of anderen) {
      perPersona[p] = vatSamen2(speel({ ...cfg, nexusBot: p }, n, seedStart, `de ${p}e Nexus`, al, totaal));
      al += n;
    }
    const kansen = Object.values(perPersona).map((m) => m.verdeling.laatste);
    pm = { perPersona, spreiding: Math.max(...kansen) - Math.min(...kansen) };
  }

  const bericht: BatchBericht = {
    soort: 'klaar',
    metriek: vatSamen(uit, cfg),
    middenlaag,
    personas: pm,
  };
  self.postMessage(bericht);
};
