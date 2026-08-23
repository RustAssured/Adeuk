/**
 * Batch-modus: n potjes, en de metrieken die §5 per optie vraagt —
 * winstverdeling, mediaanduur, vastlopers, leiderswissels, comeback-frequentie.
 *
 * Draait ongewijzigd in Node (tools/bench.ts) en in de browser (het lab).
 */
import { Game } from './game';
import type { GameConfig } from './config';
import type { GameResult, Uitslag } from './types';

export interface BatchMetriek {
  n: number;
  /** aandeel per uitslag, in procenten */
  verdeling: Record<Uitslag, number>;
  aantallen: Record<Uitslag, number>;
  medianDuur: number;
  minDuur: number;
  maxDuur: number;
  /** histogram van de duur, per beurt */
  duurHist: number[];
  /** partijen waarin het bord >= `klemDrempel` beurten stil stond */
  vastlopers: number;
  vastlopersPct: number;
  gemWissels: number;
  /** aandeel van de beslíste partijen waarin de winnaar halverwege achterstond */
  comebackPct: number;
  gemSporen: number;
  gemVerzwolgen: number;
  /** partijen korter dan 6 beurten — de sprint-detector uit §3.1 */
  sprints: number;
  seeds: number[];
  /** per partij, in seed-volgorde: genoeg om op een potje te klikken */
  potjes: Array<{
    seed: number;
    uitslag: Uitslag;
    turns: number;
    pileL: number;
    pileN: number;
    flips: number;
    comeback: boolean;
    klem: number;
  }>;
}

export const KLEM_DREMPEL = 5;

export function speelBatch(
  cfg: GameConfig,
  n: number,
  seedStart = 0,
): BatchMetriek {
  const results: GameResult[] = [];
  for (let s = seedStart; s < seedStart + n; s++) {
    const g = new Game(s, cfg);
    const uit = g.play();
    results.push(g.result(uit));
  }
  return vatSamen(results, cfg);
}

export function vatSamen(results: GameResult[], cfg: GameConfig): BatchMetriek {
  const n = results.length;
  const aantallen: Record<Uitslag, number> = { laatste: 0, nexus: 0, niets: 0, timeout: 0 };
  const duren: number[] = [];
  let vastlopers = 0;
  let wissels = 0;
  let comebacks = 0;
  let beslist = 0;
  let sporen = 0;
  let verzwolgen = 0;
  let sprints = 0;
  const maxT = cfg.maxTurns;
  const duurHist = new Array<number>(maxT + 1).fill(0);
  const potjes: BatchMetriek['potjes'] = [];

  for (const r of results) {
    aantallen[r.uitslag]++;
    duren.push(r.turns);
    duurHist[Math.min(r.turns, maxT)]++;
    const klem = r.turns - r.laatsteVerandering;
    if (klem >= KLEM_DREMPEL) vastlopers++;
    wissels += r.flips;
    sporen += r.pileL;
    verzwolgen += r.pileN;
    if (r.turns < 6) sprints++;
    if (r.uitslag === 'laatste' || r.uitslag === 'nexus') {
      beslist++;
      if (r.comeback) comebacks++;
    }
    potjes.push({
      seed: r.seed,
      uitslag: r.uitslag,
      turns: r.turns,
      pileL: r.pileL,
      pileN: r.pileN,
      flips: r.flips,
      comeback: r.comeback,
      klem,
    });
  }

  const pct = (x: number) => (n ? (100 * x) / n : 0);
  return {
    n,
    aantallen,
    verdeling: {
      laatste: pct(aantallen.laatste),
      nexus: pct(aantallen.nexus),
      niets: pct(aantallen.niets),
      timeout: pct(aantallen.timeout),
    },
    medianDuur: mediaan(duren),
    minDuur: duren.length ? Math.min(...duren) : 0,
    maxDuur: duren.length ? Math.max(...duren) : 0,
    duurHist,
    vastlopers,
    vastlopersPct: pct(vastlopers),
    gemWissels: n ? wissels / n : 0,
    comebackPct: beslist ? (100 * comebacks) / beslist : 0,
    gemSporen: n ? sporen / n : 0,
    gemVerzwolgen: n ? verzwolgen / n : 0,
    sprints,
    seeds: results.map((r) => r.seed),
    potjes,
  };
}

export function mediaan(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ------------------------------------------------------- solo-batterij (§4)

export interface SoloMetriek {
  n: number;
  /** aandeel dat de drempel haalde, ongeacht duur */
  gehaaldPct: number;
  /** aandeel dat de drempel haalde binnen `binnen` beurten — dit is de eis */
  binnenPct: number;
  binnen: number;
  medianDuur: number;
  gemSporen: number;
  /** partijen waarin het bord stil kwam te staan */
  vastlopers: number;
  /** stenen die aan het eind op tegels lagen die niets meer kunnen opleveren */
  gemLek: number;
  mislukteSeeds: number[];
}

/**
 * §4: "Eerst solo-batterij: de Laatste zonder Nexus moet >= 95% halen in
 * <= 20 beurten, anders is de bot (of de regel) stuk."
 */
export function soloBatterij(
  cfg: GameConfig,
  n: number,
  binnen = 20,
): SoloMetriek {
  const soloCfg: GameConfig = { ...cfg, solo: true, maxTurns: Math.max(cfg.maxTurns, binnen * 2) };
  let gehaald = 0;
  let opTijd = 0;
  let sporen = 0;
  let vast = 0;
  let lek = 0;
  const duren: number[] = [];
  const mislukt: number[] = [];

  for (let s = 0; s < n; s++) {
    const g = new Game(s, soloCfg);
    let beurtGehaald = 0;
    while (g.turn < soloCfg.maxTurns && !g.done) {
      g.playTurn();
      if (g.pileL >= g.cfg.needL && !beurtGehaald) {
        beurtGehaald = g.turn;
        break;
      }
    }
    if (beurtGehaald) {
      gehaald++;
      duren.push(beurtGehaald);
      if (beurtGehaald <= binnen) opTijd++;
      else mislukt.push(s);
    } else {
      mislukt.push(s);
      duren.push(soloCfg.maxTurns);
    }
    sporen += g.pileL;
    if (g.turn - g.laatsteVerandering >= KLEM_DREMPEL) vast++;
    // lek: stenen op tegels die niets meer kunnen opleveren
    for (const k of g.alive) {
      if (k === g.seat) continue;
      if (g.marks.has(k) || g.yieldOf(k) === 0) lek += g.wOf(k);
    }
  }

  return {
    n,
    gehaaldPct: (100 * gehaald) / n,
    binnenPct: (100 * opTijd) / n,
    binnen,
    medianDuur: mediaan(duren),
    gemSporen: sporen / n,
    vastlopers: vast,
    gemLek: lek / n,
    mislukteSeeds: mislukt.slice(0, 20),
  };
}
