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
  | 'verharden'      // een keten van K vat-tegels wordt onaantastbaar
  | 'keten-gebroken' // een bijna-volle keten verliest een tegel
  | 'verzilveren'    // een hele verharde keten wordt in één handeling spoor
  | 'route-open'     // het pad van de Zetel naar het Oog ligt er
  | 'route-dicht'    // en is weer verbroken
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
  /** ketennummer per hex, of 0 als de tegel niet verhard is. */
  verhard: number[];
  /** index van het Oog in ALL, of -1 als de Oversteek uit staat. */
  oog: number;
  /** ligt het pad van de Zetel naar het Oog er op dit moment? */
  routeOpen: boolean;
  /** hoeveel tegels ze nog moet innemen om de route rond te krijgen. */
  routeTekort: number;
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
  oog: number;
  tiles: Array<TileType | null>;

  // --- middenlaag (meetopdracht 2) ---
  /** ketens die het tot verharding brachten */
  ketensVerhard: number;
  /** ketens die op K-1 (of hoger, maar onverhard) een tegel verloren */
  ketensGebroken: number;
  /** punten uit los doorgeven */
  losPunten: number;
  /** punten uit het verzilveren van hele ketens */
  ketenPunten: number;
  /** aantal keer verzilverd */
  verzilverd: number;
  /** stond haar teller op de drempel toen de partij eindigde? */
  tellerVol: boolean;
  /** lag de route naar het Oog er aan het eind? */
  routeOpenAanEind: boolean;
  /** hoe vaak de route brak nadat hij er had gelegen */
  routeBreuken: number;
  /** hoe vaak hij zijn hele beurt inruilde voor één afgeslagen steen */
  stilstandGebruikt: number;
  /** langs welke weg hij won, of null als hij niet won */
  nexusWeg: 'tegels' | 'route' | 'insluiting' | null;
}

export type { CellKey };
