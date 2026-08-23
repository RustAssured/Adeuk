import type { TileType } from './types';

/** Persona's voor beide kanten (§4: "aparte persona's ... voor beide kanten"). */
export type LaatstePersona = 'gretig' | 'defensief' | 'gemengd' | 'beam';
export type NexusPersona = 'gretig' | 'defensief' | 'gemengd' | 'beam';

export interface AfslagConfig {
  /**
   * §5A-1 Omsingeling: een vat-tegel die aan >= `minRandZijden` rand-zijden
   * grenst verliest aan het eind van zijn beurt 1 steen naar de doos.
   * `bordrandTelt`: telt de buitenrand van het bord ook als rand-zijde?
   */
  omsingeling: { on: boolean; minRandZijden: number; bordrandTelt: boolean };
  /**
   * §5A-2 Stilstand: hij slaat zijn hele beurt over (ook de verplichte hap) en
   * slaat 1 steen af van een aangrenzende vat-tegel.
   */
  stilstand: { on: boolean };
  /**
   * §5A-3 Honger voorbij: begint hij zijn beurt zonder aangrenzende
   * niet-vat-tegel, dan mag hij een vat-tegel volledig verzwelgen.
   */
  hongerVoorbij: { on: boolean };
}

/**
 * Hoe hard het aankomt als hij een spoor verzwelgt. Niet in §5 gevraagd, wél
 * de knop die er in de meting het meeste toe doet: hij vreet 61-78% van alles
 * wat zij bouwt, en dat is de reden dat geen enkele tempo-instelling de partij
 * in balans krijgt. `alles` is de v5-regel; de rest staat hier om te méten,
 * niet als besloten regel (§7: eerst meten, dan pas in het regeldocument).
 */
export type SpoorVreten =
  /** v5: elk verzwolgen spoor is -1 op haar teller */
  | 'alles'
  /** hoogstens één spoor per beurt telt af; hij kan er nog wel meer opeten */
  | 'eenPerBeurt'
  /** de tegel en het merkteken verdwijnen, maar haar teller blijft staan */
  | 'alleenTegel'
  /** een spoor is onschendbaar: hij kan er niet in, net als in een vat */
  | 'nooit';

/**
 * Meetopdracht 2 — de middenlaag. Uit de speeltest kwam: het spel is puur
 * chasen, zij oogt machteloos, hij heeft geen eigen spel. Deze drie regels zijn
 * het antwoord. Alle drie staan standaard uit, zodat de v5-pariteit blijft
 * gelden; `MEETING2_CONFIG` zet de meetstand.
 */
export interface VerhardenConfig {
  on: boolean;
  /** aantal aaneengesloten vat-tegels dat een keten verhardt (3/4/5) */
  K: number;
}

export interface VerzilverenConfig {
  on: boolean;
  /** vermenigvuldiger bij het verzilveren van een hele keten (1.5 of 2) */
  M: number;
}

export interface OversteekConfig {
  on: boolean;
  /** afstand van het Oog tot de Zetel bij de opzet */
  afstand: number;
  /**
   * Moet het Oog zelf ook van haar zijn, of volstaat een pad tot ernaast?
   * De opdracht laat dit open ("een onafgebroken pad van Zetel naar Oog");
   * standaard de strenge lezing, met een knop om de andere te meten.
   */
  oogMoetVanHaarZijn: boolean;
  /**
   * Niet in de opdracht gevraagd, wel nodig om te meten: in de meetstand raakt
   * het Oog regelmatig volledig ingesloten. Zij kan dan nooit meer winnen, hij
   * heeft haar teller niet nodig, en er volgen tientallen dode beurten.
   *
   * `hof` maakt de directe buren van het Oog ook onverzwelgbaar, zodat er altijd
   * een aanlanding blijft. `onbereikbaarEindigt` laat het universum eindigen
   * zodra er geen weg meer naar het Oog is. Allebei standaard uit — de meting
   * gaat eerst over de regel zoals hij is opgeschreven.
   */
  hof: boolean;
  onbereikbaarEindigt: boolean;
}

export interface GameConfig {
  // --- lichaam van de Laatste (gesloten kringloop) ---
  /** substantie in voorraad bij de start */
  start: number;
  /** totale substantie in het spel; de rest begint in de doos */
  total: number;

  // --- drempels (§5B) ---
  needL: number;
  needN: number;

  // --- tempo (§5B) ---
  /** handelingen per beurt voor de Laatste */
  acts: number;
  /** stappen per beurt voor de Nexus */
  nexusMoves: number;
  /** oogstwaarde per tegelsoort */
  yields: Record<TileType, number>;
  /** hoeveel hoogopbrengende vat-tegels de gretige bot als motor aanhoudt */
  engines: number;

  // --- schakelaars ---
  /** voedt elke verzwolgen tegel de Laatste met 1 substantie? */
  feed: boolean;
  /** oogsten aan/uit */
  harvest: boolean;
  /** solo-batterij (§4): de Laatste zonder Nexus */
  solo: boolean;

  afslag: AfslagConfig;
  spoorVreten: SpoorVreten;

  // --- de middenlaag (meetopdracht 2) ---
  verharden: VerhardenConfig;
  verzilveren: VerzilverenConfig;
  oversteek: OversteekConfig;

  laatsteBot: LaatstePersona;
  nexusBot: NexusPersona;

  maxTurns: number;
}

/** Oogstwaarden zoals v5.py ze heeft; de Zetel oogst nooit (wordt overgeslagen). */
export const V5_YIELDS: Record<TileType, number> = {
  bewoond: 2,
  planeet: 1,
  komeet: 1,
  gat: 1,
  stil: 0,
  seat: 0,
};

/** De v5-basis. Elke afsla-optie staat uit — dat is precies de stand van §3.6. */
export const V5_CONFIG: GameConfig = {
  start: 8,
  total: 30,
  needL: 12,
  needN: 28,
  acts: 2,
  nexusMoves: 2,
  yields: { ...V5_YIELDS },
  engines: 2,
  feed: true,
  harvest: true,
  solo: false,
  spoorVreten: 'alles',
  verharden: { on: false, K: 4 },
  verzilveren: { on: false, M: 2 },
  oversteek: { on: false, afstand: 4, oogMoetVanHaarZijn: true, hof: false, onbereikbaarEindigt: false },
  afslag: {
    omsingeling: { on: false, minRandZijden: 3, bordrandTelt: false },
    stilstand: { on: false },
    hongerVoorbij: { on: false },
  },
  laatsteBot: 'gretig',
  nexusBot: 'gretig',
  maxTurns: 80,
};

/** Een verse kopie van de v5-basis, met de geneste objecten losgemaakt. */
function versV5(): GameConfig {
  return {
    ...V5_CONFIG,
    yields: { ...V5_CONFIG.yields },
    verharden: { ...V5_CONFIG.verharden },
    verzilveren: { ...V5_CONFIG.verzilveren },
    oversteek: { ...V5_CONFIG.oversteek },
    afslag: {
      omsingeling: { ...V5_CONFIG.afslag.omsingeling },
      stilstand: { ...V5_CONFIG.afslag.stilstand },
      hongerVoorbij: { ...V5_CONFIG.afslag.hongerVoorbij },
    },
  };
}

/**
 * Legt een patch op een bestaande configuratie. De geneste objecten worden
 * samengevoegd, niet vervangen — anders zou `{ verharden: { K: 3 } }` de regel
 * stilletjes uitzetten omdat `on` in de patch ontbreekt. Precies dat ging in de
 * eerste opzet van de meetmatrix mis.
 */
function pasToe(base: GameConfig, patch: DeepPartial<GameConfig>): GameConfig {
  const p = patch as Partial<GameConfig> & {
    afslag?: DeepPartial<AfslagConfig>;
    verharden?: Partial<VerhardenConfig>;
    verzilveren?: Partial<VerzilverenConfig>;
    oversteek?: Partial<OversteekConfig>;
  };
  const genest = {
    yields: base.yields,
    afslag: base.afslag,
    verharden: base.verharden,
    verzilveren: base.verzilveren,
    oversteek: base.oversteek,
  };
  Object.assign(base, p, genest);
  if (p.yields) Object.assign(base.yields, p.yields);
  if (p.verharden) Object.assign(base.verharden, p.verharden);
  if (p.verzilveren) Object.assign(base.verzilveren, p.verzilveren);
  if (p.oversteek) Object.assign(base.oversteek, p.oversteek);
  if (p.afslag) {
    if (p.afslag.omsingeling) Object.assign(base.afslag.omsingeling, p.afslag.omsingeling);
    if (p.afslag.stilstand) Object.assign(base.afslag.stilstand, p.afslag.stilstand);
    if (p.afslag.hongerVoorbij) Object.assign(base.afslag.hongerVoorbij, p.afslag.hongerVoorbij);
  }
  return base;
}

export function makeConfig(patch: DeepPartial<GameConfig> = {}): GameConfig {
  return pasToe(versV5(), patch);
}

/**
 * De meetstand van opdracht 2: de aanbevolen stand uit meting 1, plus de drie
 * nieuwe regels aan. De drempel is hier een knop (9/11/13); 11 was het
 * evenwichtspunt van meting 1, maar met verzilveren erbij loopt de teller
 * anders vol — dat is precies wat er gemeten moet worden.
 *
 * De patch komt ná de meetstand, zodat `meeting2({ verharden: { K: 3 } })`
 * alleen de K verandert en de regel aan laat staan.
 */
export function meeting2(patch: DeepPartial<GameConfig> = {}): GameConfig {
  const basis = makeConfig({
    acts: 3,
    nexusMoves: 2,
    needL: 11,
    needN: 28,
    spoorVreten: 'alleenTegel',
    afslag: { omsingeling: { on: true, minRandZijden: 3, bordrandTelt: false } },
    verharden: { on: true, K: 4 },
    verzilveren: { on: true, M: 2 },
    oversteek: { on: true, afstand: 4, oogMoetVanHaarZijn: true, hof: false, onbereikbaarEindigt: false },
    laatsteBot: 'beam',
    nexusBot: 'gretig',
  });
  return pasToe(basis, patch);
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
