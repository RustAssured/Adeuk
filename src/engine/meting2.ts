/**
 * De meetbank van opdracht 2. Naast de oude assen meet hij de drie vragen die
 * de opdracht stelt: breekt hij ketens op tijd, is los doorgeven nog levend,
 * en wint hij ooit door alleen de route weg te vreten?
 */
import { Game } from './game';
import type { GameConfig, NexusPersona } from './config';
import { mediaan } from './batch';
import type { GameResult, Uitslag } from './types';

export interface Meting2 {
  n: number;
  verdeling: Record<Uitslag, number>;
  medianDuur: number;
  minDuur: number;
  maxDuur: number;
  vastlopers: number;
  gemWissels: number;
  comebackPct: number;
  sprints: number;
  /** aandeel van de ketens dat het tot verharden bracht */
  verhardPct: number;
  ketensVerhard: number;
  ketensGebroken: number;
  /** aandeel van haar punten dat uit los doorgeven kwam */
  losPct: number;
  gemLos: number;
  gemKeten: number;
  /**
   * Zijn nieuwe spel: hij wint terwijl haar teller vol staat, puur doordat de
   * weg naar het Oog weg is. De opdracht wil dit boven 0% en onder 30%.
   */
  blokkadePct: number;
  /**
   * Dezelfde stand, maar niemand wint: haar teller is vol, de weg is weg, en
   * de partij loopt tegen het beurtenplafond. Dat is dode tijd, geen tegenspel.
   */
  klemVolPct: number;
  /** partijen waarin het Oog helemaal onbereikbaar raakte */
  oogIngeslotenPct: number;
  gemRouteBreuken: number;
  gemSporen: number;

  // --- voor het advies-paneel (opdracht 3) ---
  /** partijen waarin hij minstens één keer stilstond */
  stilstandPct: number;
  /** zijn winsten uitgesplitst naar weg, als aandeel van zijn winsten */
  wegen: { tegels: number; route: number; insluiting: number };
  /** aantal wegen dat hij daadwerkelijk bespeelde */
  wegenBespeeld: number;
  /** het grootste aandeel dat één weg inneemt (0 als hij niet won) */
  grootsteWeg: number;
  /** ketens die begonnen zijn: verhard plus gebroken */
  ketensGestart: number;
}

export function meet(cfg: GameConfig, n: number, seedStart = 0): Meting2 {
  const rs: GameResult[] = [];
  for (let s = seedStart; s < seedStart + n; s++) {
    const g = new Game(s, cfg);
    const uit = g.play();
    rs.push(g.result(uit));
  }
  return vatSamen2(rs);
}

/** Dezelfde metrieken, maar over partijen die al gespeeld zijn. */
export function vatSamen2(rs: GameResult[]): Meting2 {
  const n = rs.length;
  const telling: Record<Uitslag, number> = { laatste: 0, nexus: 0, niets: 0, timeout: 0 };
  if (!n) throw new Error('vatSamen2 zonder partijen');
  let vast = 0, wissels = 0, comebacks = 0, beslist = 0, sprints = 0;
  let verhard = 0, gebroken = 0, los = 0, keten = 0, blokkade = 0, klemVol = 0, ingesloten = 0;
  let breuken = 0, sporen = 0, stilstand = 0;
  const wegen = { tegels: 0, route: 0, insluiting: 0 };
  const duren: number[] = [];
  for (const r of rs) {
    telling[r.uitslag]++;
    duren.push(r.turns);
    if (r.turns - r.laatsteVerandering >= 5) vast++;
    if (r.turns < 8) sprints++;
    wissels += r.flips;
    sporen += r.pileL;
    verhard += r.ketensVerhard;
    gebroken += r.ketensGebroken;
    los += r.losPunten;
    keten += r.ketenPunten;
    breuken += r.routeBreuken;
    if (r.uitslag === 'laatste' || r.uitslag === 'nexus') {
      beslist++;
      if (r.comeback) comebacks++;
    }
    // hij wint doordat de weg weg is
    if (r.uitslag === 'nexus' && r.tellerVol && !r.routeOpenAanEind) blokkade++;
    // niemand wint: haar teller vol, de weg weg, en de klok loopt af
    if (r.uitslag === 'timeout' && r.tellerVol && !r.routeOpenAanEind) klemVol++;
    if (r.oog >= 0 && !r.routeOpenAanEind && r.tellerVol) ingesloten++;
    if (r.stilstandGebruikt > 0) stilstand++;
    if (r.nexusWeg) wegen[r.nexusWeg]++;
  }
  const pct = (x: number) => (100 * x) / n;
  return {
    n,
    verdeling: {
      laatste: pct(telling.laatste), nexus: pct(telling.nexus),
      niets: pct(telling.niets), timeout: pct(telling.timeout),
    },
    medianDuur: mediaan(duren),
    minDuur: Math.min(...duren),
    maxDuur: Math.max(...duren),
    vastlopers: pct(vast),
    gemWissels: wissels / n,
    comebackPct: beslist ? (100 * comebacks) / beslist : 0,
    sprints,
    verhardPct: verhard + gebroken ? (100 * verhard) / (verhard + gebroken) : 0,
    ketensVerhard: verhard / n,
    ketensGebroken: gebroken / n,
    losPct: los + keten ? (100 * los) / (los + keten) : 0,
    gemLos: los / n,
    gemKeten: keten / n,
    blokkadePct: pct(blokkade),
    klemVolPct: pct(klemVol),
    oogIngeslotenPct: pct(ingesloten),
    gemRouteBreuken: breuken / n,
    gemSporen: sporen / n,
    stilstandPct: pct(stilstand),
    wegen,
    wegenBespeeld: Object.values(wegen).filter((x) => x > 0).length,
    grootsteWeg: telling.nexus ? (100 * Math.max(...Object.values(wegen))) / telling.nexus : 0,
    ketensGestart: (verhard + gebroken) / n,
  };
}

export function regel(label: string, m: Meting2): string {
  const p = (x: number) => x.toFixed(0).padStart(3) + '%';
  return (
    `${label.padEnd(26)} L ${p(m.verdeling.laatste)}  N ${p(m.verdeling.nexus)}  ` +
    `klem ${p(m.vastlopers)} | ` +
    `med ${String(m.medianDuur).padStart(3)}b | ` +
    `verhard ${p(m.verhardPct)} | los ${p(m.losPct)} | ` +
    `blokk ${p(m.blokkadePct)} | dood ${p(m.klemVolPct)} | comeback ${p(m.comebackPct)} | ` +
    `sprints ${String(m.sprints).padStart(3)}`
  );
}


/**
 * Dezelfde seeds tegen alle drie de Nexus-persona's. Stelregel 8
 * (herspeelbaarheid) is alleen te beoordelen als je weet hoeveel de winstkans
 * meebeweegt met hoe goed er gespeeld wordt.
 */
export interface PersonaMeting {
  perPersona: Partial<Record<NexusPersona, Meting2>>;
  /** verschil tussen hoogste en laagste winstkans van de Laatste, in punten */
  spreiding: number;
}

export const PERSONAS: NexusPersona[] = ['gretig', 'gemengd', 'defensief'];

export function meetPersonas(cfg: GameConfig, n: number, seedStart = 0): PersonaMeting {
  const perPersona: Partial<Record<NexusPersona, Meting2>> = {};
  const kansen: number[] = [];
  for (const p of PERSONAS) {
    const m = meet({ ...cfg, nexusBot: p }, n, seedStart);
    perPersona[p] = m;
    kansen.push(m.verdeling.laatste);
  }
  return { perPersona, spreiding: Math.max(...kansen) - Math.min(...kansen) };
}
