/**
 * De meetbank van opdracht 2. Naast de oude assen meet hij de drie vragen die
 * de opdracht stelt: breekt hij ketens op tijd, is los doorgeven nog levend,
 * en wint hij ooit door alleen de route weg te vreten?
 */
import { Game } from './game';
import type { GameConfig } from './config';
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
  /** partijen waarin hij won terwijl haar teller vol stond: route-blokkade */
  blokkadePct: number;
  /** partijen waarin het Oog onbereikbaar raakte */
  oogIngeslotenPct: number;
  gemRouteBreuken: number;
  gemSporen: number;
}

export function meet(cfg: GameConfig, n: number, seedStart = 0): Meting2 {
  const rs: GameResult[] = [];
  for (let s = seedStart; s < seedStart + n; s++) {
    const g = new Game(s, cfg);
    const uit = g.play();
    rs.push(g.result(uit));
  }
  const telling: Record<Uitslag, number> = { laatste: 0, nexus: 0, niets: 0, timeout: 0 };
  let vast = 0, wissels = 0, comebacks = 0, beslist = 0, sprints = 0;
  let verhard = 0, gebroken = 0, los = 0, keten = 0, blokkade = 0, ingesloten = 0;
  let breuken = 0, sporen = 0;
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
    if (r.uitslag !== 'laatste' && r.tellerVol && !r.routeOpenAanEind) blokkade++;
    if (r.oog >= 0 && !r.routeOpenAanEind && r.tellerVol) ingesloten++;
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
    oogIngeslotenPct: pct(ingesloten),
    gemRouteBreuken: breuken / n,
    gemSporen: sporen / n,
  };
}

export function regel(label: string, m: Meting2): string {
  const p = (x: number) => x.toFixed(0).padStart(3) + '%';
  return (
    `${label.padEnd(26)} L ${p(m.verdeling.laatste)}  N ${p(m.verdeling.nexus)}  ` +
    `klem ${p(m.vastlopers + m.verdeling.timeout > 100 ? 100 : m.vastlopers)} | ` +
    `med ${String(m.medianDuur).padStart(3)}b | ` +
    `verhard ${p(m.verhardPct)} | los ${p(m.losPct)} | ` +
    `blokk ${p(m.blokkadePct)} | comeback ${p(m.comebackPct)} | ` +
    `sprints ${String(m.sprints).padStart(3)}`
  );
}

