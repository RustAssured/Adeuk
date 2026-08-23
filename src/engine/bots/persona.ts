/**
 * Persona's voor beide kanten (§4: "aparte persona's (gretig / defensief /
 * gemengd) voor beide kanten").
 *
 * Anders dan bots/gretig.ts — dat is de bevroren v5-port en mag niet wijzigen —
 * is dit één heuristiek met knoppen. Zo blijven de persona's onderling
 * vergelijkbaar: ze verschillen alleen in gewichten, niet in code.
 *
 * De interessantste knop is `claimVeiligheid`. Een vat-tegel is onschendbaar
 * (hij kan er niet in); een spoor is dat níet (hij vreet het weg, haar teller
 * −1). Doorgeven is dus geen gratis winst maar een blootstelling. Gretig
 * negeert dat, defensief wacht tot hij ver genoeg weg is.
 */
import type { Game } from '../game';
import { order } from '../game';
import { dist, unkey, type CellKey } from '../hex';

export interface LaatsteGewichten {
  /** waarde van de opbrengst van een doeltegel */
  opbrengst: number;
  /** straf per substantie die de route kost */
  kosten: number;
  /** ruis, zodat gelijke opties niet altijd hetzelfde uitpakken */
  ruis: number;
  /** hoeveel hoogopbrengende vat-tegels ze als motor aanhoudt */
  motoren: number;
  /** straf voor doelen dicht bij de Nexus */
  gevaar: number;
  /** minimale afstand van de Nexus voordat ze durft door te geven (0 = altijd) */
  claimVeiligheid: number;
  /** bonus voor doelen dicht bij de Zetel — korte draad is een taaie draad */
  nabijheid: number;
}

export interface NexusGewichten {
  /** bonus per buur met stenen */
  buurStenen: number;
  /** bonus voor een ijle tegel (steen valt in de doos) */
  ijl: number;
  /** bonus voor het wegvreten van een spoor */
  spoor: number;
  /** bonus voor de opbrengst van de tegel */
  opbrengst: number;
  /** bonus per vrije buur ná de stap — houdt hem uit een fuik */
  beweeglijkheid: number;
  /** bonus voor stappen richting de Zetel */
  richtingZetel: number;
  /**
   * Bonus voor tegels naast een vat-groep die één tegel van verharden af staat.
   * Zo'n groep is zijn laatste kans: verhardt hij eenmaal, dan kan hij er nooit
   * meer bij. Hij komt er niet ín, dus hij moet hem insluiten en de omsingeling
   * het werk laten doen.
   */
  ketenBreken: number;
  /** bonus voor het wegvreten van een spoor dat op haar route naar het Oog ligt */
  routeVreten: number;
  ruis: number;
}

export const LAATSTE_GEWICHTEN: Record<string, LaatsteGewichten> = {
  gretig: { opbrengst: 2.2, kosten: 1.4, ruis: 0.3, motoren: 2, gevaar: 0, claimVeiligheid: 0, nabijheid: 0 },
  defensief: { opbrengst: 1.8, kosten: 1.2, ruis: 0.2, motoren: 3, gevaar: 1.6, claimVeiligheid: 3, nabijheid: 0.5 },
  gemengd: { opbrengst: 2.1, kosten: 1.3, ruis: 0.25, motoren: 2, gevaar: 0.8, claimVeiligheid: 2, nabijheid: 0.25 },
};

export const NEXUS_GEWICHTEN: Record<string, NexusGewichten> = {
  gretig: { buurStenen: 1.2, ijl: 2, spoor: 3.5, opbrengst: 0.6, beweeglijkheid: 0, richtingZetel: 0, ketenBreken: 0, routeVreten: 0, ruis: 1 },
  defensief: { buurStenen: 0.6, ijl: 1.5, spoor: 3, opbrengst: 0.4, beweeglijkheid: 1.4, richtingZetel: 0.2, ketenBreken: 3.5, routeVreten: 4, ruis: 0.6 },
  gemengd: { buurStenen: 1.0, ijl: 2, spoor: 3.5, opbrengst: 0.5, beweeglijkheid: 0.7, richtingZetel: 0.4, ketenBreken: 4.5, routeVreten: 5, ruis: 0.8 },
};

// ------------------------------------------------------------ de Laatste

export function laatsteHeuristisch(g: Game, W: LaatsteGewichten): void {
  g.harvest();
  const nexusAf = (k: CellKey) => (g.cfg.solo ? 99 : dist(unkey(k), unkey(g.npos)));
  const zetelAf = (k: CellKey) => dist(unkey(k), unkey(g.seat));

  for (let act = 0; act < g.cfg.acts; act++) {
    // ventiel
    if (g.stock <= 1) {
      const dood = order(g.alive).filter(
        (c) =>
          g.wOf(c) >= 1 &&
          c !== g.seat &&
          (g.marks.has(c) || (g.yieldOf(c) === 0 && g.open.has(c))),
      );
      if (dood.length) {
        let best = dood[0];
        for (const c of dood) if (g.wOf(c) > g.wOf(best)) best = c;
        g.withdraw(best);
        continue;
      }
    }

    // een verharde keten verzilveren gaat vóór los doorgeven: één handeling
    // voor de hele keten
    const ketens = g.verzilverbaar();
    if (ketens.length) {
      let beste = ketens[0];
      for (const nr of ketens) if (g.ketenWaarde(nr) > g.ketenWaarde(beste)) beste = nr;
      g.verzilver(beste);
      if (g.winstLaatste()) {
        g.done = 'laatste';
        return;
      }
      continue;
    }

    // doorgeven
    const cl = g.claimable();
    if (cl.length) {
      const endgame = g.pileL >= g.cfg.needL - 4;
      const keep = new Set<CellKey>();
      if (!endgame) {
        const motoren = [...cl].sort((a, b) => g.yieldOf(b) - g.yieldOf(a));
        for (const c of motoren) {
          if (g.yieldOf(c) >= 2 && keep.size < W.motoren) keep.add(c);
        }
      }
      // een spoor kan hij wegvreten; wacht tot hij ver genoeg is
      const veilig = cl.filter(
        (c) => !keep.has(c) && (endgame || nexusAf(c) >= W.claimVeiligheid),
      );
      const bank = veilig.length ? veilig : endgame ? cl.filter((c) => !keep.has(c)) : [];
      if (bank.length) {
        bank.sort((a, b) => g.yieldOf(b) - g.yieldOf(a) || nexusAf(b) - nexusAf(a));
        g.claim(bank[0]);
        if (g.winstLaatste()) {
          g.done = 'laatste';
          return;
        }
        continue;
      }
    }

    // afmaken wat half af is
    if (g.stock <= 3) {
      const half = order(g.alive).filter(
        (x) => g.wOf(x) === 1 && x !== g.seat && g.yieldOf(x) > 0 && g.path(x) !== null,
      );
      if (half.length) {
        let best = half[0];
        let bestLen = g.path(best)!.length;
        for (const x of half) {
          const len = g.path(x)!.length;
          if (len < bestLen) {
            bestLen = len;
            best = x;
          }
        }
        g.goal = best;
      }
    }

    let goal = g.goal;
    if (goal !== null && g.open.has(goal) && g.yieldOf(goal) <= 0) {
      goal = null;
      g.goal = null;
    }
    if (
      goal === null ||
      !g.alive.has(goal) ||
      g.wOf(goal) >= 2 ||
      goal === g.npos ||
      g.path(goal) === null
    ) {
      let best: CellKey | null = null;
      let bs = -1e9;
      for (const x of order(g.alive)) {
        if (x === g.seat || g.wOf(x) >= 2 || x === g.npos) continue;
        const p = g.path(x);
        if (!p) continue;
        let kosten = 0;
        for (let i = 1; i < p.length; i++) {
          if (g.wOf(p[i]) === 0) kosten += g.cost.get(p[i]) ?? 1;
        }
        kosten += 2 - g.wOf(x);
        if (kosten > Math.max(g.stock, 1)) continue;
        const v = g.open.has(x) ? g.yieldOf(x) : 1.1;
        const s =
          v * W.opbrengst -
          kosten * W.kosten -
          (nexusAf(x) <= 2 ? W.gevaar : 0) -
          zetelAf(x) * W.nabijheid +
          g.rng.random() * W.ruis;
        if (s > bs) {
          bs = s;
          best = x;
        }
      }
      g.goal = best;
    }
    if (g.goal !== null) {
      const p = g.path(g.goal);
      if (p && g.push(p)) continue;
    }
    break;
  }
}

export const laatsteDefensief = (g: Game) => laatsteHeuristisch(g, LAATSTE_GEWICHTEN.defensief);
export const laatsteGemengd = (g: Game) => laatsteHeuristisch(g, LAATSTE_GEWICHTEN.gemengd);

// -------------------------------------------------------------- de Nexus

export function nexusHeuristisch(g: Game, W: NexusGewichten): void {
  if (g.hongerVoorbijMogelijk()) {
    const buren = g.nbKeys(g.npos).filter((x) => g.alive.has(x) && x !== g.seat);
    if (buren.length) {
      let best = buren[0];
      for (const c of buren) if (g.yieldOf(c) > g.yieldOf(best)) best = c;
      g.hongerVoorbijSlok(best);
      if (g.pileN >= g.cfg.needN) g.done = 'nexus';
      return;
    }
  }

  if (g.cfg.afslag.stilstand.on) {
    const stappen = g.nbKeys(g.npos).filter((x) => g.alive.has(x) && !g.isVat(x));
    const vatten = g.nbKeys(g.npos).filter(
      (x) => g.alive.has(x) && g.isVat(x) && x !== g.seat && !g.isVerhard(x),
    );
    // een groep die één tegel van verharden af staat is nú of nooit
    const bijnaVerhard = vatten.filter(
      (x) => g.cfg.verharden.on && g.vatComponent(x).size >= g.cfg.verharden.K - 1,
    );
    if (bijnaVerhard.length) {
      let best = bijnaVerhard[0];
      for (const c of bijnaVerhard) {
        if (g.vatComponent(c).size > g.vatComponent(best).size) best = c;
      }
      g.stilstandAfslag(best);
      return;
    }
    if (stappen.length <= 1 && vatten.length) {
      let best = vatten[0];
      for (const c of vatten) if (g.yieldOf(c) > g.yieldOf(best)) best = c;
      g.stilstandAfslag(best);
      return;
    }
  }

  const zetel = unkey(g.seat);
  let moved = 0;
  for (let step = 0; step < g.cfg.nexusMoves; step++) {
    const opts = g.nbKeys(g.npos).filter((x) => g.nexusMag(x));
    if (!opts.length) break;
    // haar huidige weg naar het Oog: elke tegel daarvan die hij weghaalt kost
    // haar de oversteek, ook als haar teller allang vol staat
    const route = W.routeVreten > 0 && g.cfg.oversteek.on ? new Set(g.routeNaarOog() ?? []) : null;
    const K = g.cfg.verharden.K;
    let best = opts[0];
    let bestS = -1e9;
    for (const x of opts) {
      let s = 0;
      for (const y of g.nbKeys(x)) if (g.wOf(y) > 0) s += W.buurStenen;
      if (g.wOf(x) === 1) s += W.ijl;
      if (g.marks.has(x)) s += W.spoor;
      s += g.yieldOf(x) * W.opbrengst;
      if (route && route.has(x)) s += W.routeVreten;
      if (W.ketenBreken > 0 && g.cfg.verharden.on) {
        // insluiten loont: zodra een vat-tegel genoeg rand-zijden heeft slaat
        // de omsingeling er een steen af en valt de groep uit elkaar
        let dreiging = 0;
        for (const y of g.nbKeys(x)) {
          if (!g.alive.has(y) || g.wOf(y) < 2 || g.isVerhard(y)) continue;
          const groep = g.vatComponent(y);
          if (groep.size >= K - 1) dreiging = Math.max(dreiging, groep.size);
        }
        if (dreiging) s += W.ketenBreken * (dreiging / K);
      }
      // beweeglijkheid ná de stap: de tegel die hij verlaat is dan weg
      const vrij = g.nbKeys(x).filter(
        (y) => y !== g.npos && g.alive.has(y) && g.wOf(y) < 2,
      ).length;
      s += vrij * W.beweeglijkheid;
      s -= dist(unkey(x), zetel) * W.richtingZetel;
      s += g.rng.random() * W.ruis;
      if (s > bestS) {
        bestS = s;
        best = x;
      }
    }
    g.moveTo(best);
    moved++;
    if (g.pileN >= g.cfg.needN) {
      g.done = 'nexus';
      return;
    }
  }
  if (moved === 0) {
    const cand = order(g.alive).filter((x) => x !== g.seat && x !== g.npos && g.nexusMag(x));
    if (cand.length) {
      const np = unkey(g.npos);
      let best = cand[0];
      let bestD = dist(unkey(best), np);
      for (const c of cand) {
        const d = dist(unkey(c), np);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      g.consume(best);
      if (g.pileN >= g.cfg.needN) g.done = 'nexus';
    }
  }
}

export const nexusDefensief = (g: Game) => nexusHeuristisch(g, NEXUS_GEWICHTEN.defensief);
export const nexusGemengd = (g: Game) => nexusHeuristisch(g, NEXUS_GEWICHTEN.gemengd);
