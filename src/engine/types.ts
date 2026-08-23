import type { CellKey } from './hex';

/** De zes tegelsoorten plus de Zetel. `null` = de tegelloze hex (zie opmerking in game.ts). */
export type TileType = 'planeet' | 'bewoond' | 'komeet' | 'gat' | 'stil' | 'seat';

export type Uitslag = 'laatste' | 'nexus' | 'niets' | 'timeout';

/** Wie handelt. */
export type Actor = 'laatste' | 'nexus' | 'systeem';

export type EventKind =
  | 'opzet'          // bord geschud, Zetel en Nexus geplaatst
  | 'beurt'          // begin van een beurt
  | 'oogst'          // vat-tegels leveren substantie
  | 'reiken'         // eerste steen op een tegel (ijl)
  | 'vatten'         // tweede steen (vat)
  | 'randsprong'     // reiken over verdwenen tegels heen
  | 'doorgeven'      // vat-tegel wordt spoor
  | 'terugtrekken'   // steen van het bord terug naar voorraad
  | 'stap'           // de Nexus verplaatst
  | 'verzwelgen'     // tegel van het bord
  | 'voeden'         // +1 substantie voor de Laatste
  | 'spoor-weg'      // hij vreet een spoor, haar teller -1
  | 'omsingeling'    // afsla-optie 1
  | 'stilstand'      // afsla-optie 2
  | 'honger'         // afsla-optie 3
  | 'klem'           // niemand kan nog iets
  | 'einde';

/** Compacte momentopname, geïndexeerd op de bordvolgorde van ALL (37 hexen). */
export interface Snapshot {
  turn: number;
  /** 1 = tegel ligt er nog, 0 = verzwolgen. */
  alive: number[];
  /** stenen per hex (0, 1 = ijl, 2 = vat). */
  w: number[];
  /** 1 = spoor. */
  marks: number[];
  /** 1 = open (omgedraaid), 0 = gedekt. */
  open: number[];
  /** index in ALL van de Nexus. */
  npos: number;
  stock: number;
  box: number;
  pileL: number;
  pileN: number;
  done: Uitslag | null;
}

export interface GameEvent {
  /** volgnummer over de hele partij */
  i: number;
  turn: number;
  kind: EventKind;
  actor: Actor;
  /** betrokken hexen, als index in ALL — voor markering in het lab */
  cells: number[];
  /** één regel uitleg, in de taal van het spel */
  text: string;
  /** verschil in substantie/tellers dat dit event veroorzaakte */
  delta?: { stock?: number; box?: number; pileL?: number; pileN?: number };
  after: Snapshot;
}

export interface GameResult {
  seed: number;
  uitslag: Uitslag;
  turns: number;
  pileL: number;
  pileN: number;
  /** aantal nog levende tegels aan het eind */
  alive: number;
  /** (sporen, verzwolgen) na elke volledige beurt */
  hist: Array<[number, number]>;
  /** leiderswissels, zoals v5.py ze telt */
  flips: number;
  /** stond de winnaar halverwege achter? */
  comeback: boolean;
  /** beurt waarop het bord voor het laatst veranderde — detecteert patstellingen */
  laatsteVerandering: number;
  events?: GameEvent[];
  seat: number;
  tiles: Array<TileType | null>;
}

export type { CellKey };
