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
  afslag: {
    omsingeling: { on: false, minRandZijden: 3, bordrandTelt: false },
    stilstand: { on: false },
    hongerVoorbij: { on: false },
  },
  laatsteBot: 'gretig',
  nexusBot: 'gretig',
  maxTurns: 80,
};

export function makeConfig(patch: DeepPartial<GameConfig> = {}): GameConfig {
  const base: GameConfig = {
    ...V5_CONFIG,
    yields: { ...V5_CONFIG.yields },
    afslag: {
      omsingeling: { ...V5_CONFIG.afslag.omsingeling },
      stilstand: { ...V5_CONFIG.afslag.stilstand },
      hongerVoorbij: { ...V5_CONFIG.afslag.hongerVoorbij },
    },
  };
  const p = patch as Partial<GameConfig> & { afslag?: DeepPartial<AfslagConfig> };
  Object.assign(base, { ...p, yields: base.yields, afslag: base.afslag });
  if (p.yields) Object.assign(base.yields, p.yields);
  if (p.afslag) {
    if (p.afslag.omsingeling) Object.assign(base.afslag.omsingeling, p.afslag.omsingeling);
    if (p.afslag.stilstand) Object.assign(base.afslag.stilstand, p.afslag.stilstand);
    if (p.afslag.hongerVoorbij) Object.assign(base.afslag.hongerVoorbij, p.afslag.hongerVoorbij);
  }
  return base;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
