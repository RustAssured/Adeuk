/**
 * De gretige bot — regel voor regel de bot uit v5.py.
 *
 * Dit is de bot uit §4 van de handoff: degene die solo maar ~47% haalt. Hij
 * blijft hier ongewijzigd staan omdat hij het ijkpunt is: tests/parity.test.ts
 * eist dat hij zet voor zet dezelfde partij speelt als tools/v5_ref.py.
 * Verbeteringen horen in een ándere persona, niet hier.
 *
 * Enige toevoeging: de twee afsla-opties die een keuze van hem vragen (§5A-2
 * stilstand, §5A-3 honger voorbij). Staan die uit — de v5-stand — dan raakt
 * geen enkele regel hieronder de toevalsgenerator anders dan v5 dat doet.
 */
import type { Game } from '../game';
import { order } from '../game';
import { dist, unkey, type CellKey } from '../hex';

export function laatsteGretig(g: Game): void {
  g.harvest();
  for (let act = 0; act < g.cfg.acts; act++) {
    let did = false;

    // het ventiel: bij lege voorraad een steen terughalen uit een dode tegel
    if (g.stock <= 1) {
      const useless = order(g.alive).filter(
        (c) =>
          g.wOf(c) >= 1 &&
          c !== g.seat &&
          (g.marks.has(c) || (g.yieldOf(c) === 0 && g.open.has(c))),
      );
      if (useless.length) {
        let best = useless[0];
        for (const c of useless) if (g.wOf(c) > g.wOf(best)) best = c;
        g.withdraw(best);
        continue;
      }
    }

    // Met verzilveren aan (meetopdracht 2) kan hij ook een hele keten innen.
    // De rest van deze bot blijft de bevroren v5-bot; deze tak staat uit zolang
    // de regel uit staat, dus de pariteitstest merkt er niets van.
    if (g.cfg.verzilveren.on) {
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
    }

    const cl = g.claimable();
    if (cl.length) {
      const K = g.cfg.engines;
      const endgame = g.pileL >= g.cfg.needL - 4;
      const keep = new Set<CellKey>();
      if (!endgame) {
        for (const c of cl) {
          if (g.yieldOf(c) >= 2 && keep.size < K) keep.add(c);
        }
      }
      const bank = cl.filter((c) => !keep.has(c));
      // v5-sleutel: (occ > 1, -opbrengst); occ is altijd 0, dus alleen opbrengst.
      // Array.sort is stabiel, dus gelijke opbrengsten houden de bordvolgorde.
      bank.sort((a, b) => g.yieldOf(b) - g.yieldOf(a));
      if (bank.length) {
        g.claim(bank[0]);
        if (g.winstLaatste()) {
          g.done = 'laatste';
          return;
        }
        did = true;
      }
    }
    if (did) continue;

    // zuinig: bij lage voorraad eerst bestaande ijle tegels afmaken
    if (g.stock <= 3) {
      const half = order(g.alive).filter(
        (x) => g.wOf(x) === 1 && x !== g.seat && g.yieldOf(x) > 0 && g.path(x) !== null,
      );
      if (half.length) {
        let best = half[0];
        let bestLen = g.path(best)!.length;
        for (let i = 1; i < half.length; i++) {
          const len = g.path(half[i])!.length;
          if (len < bestLen) {
            bestLen = len;
            best = half[i];
          }
        }
        g.goal = best;
      }
    }

    let goal = g.goal;
    // bleek een stil veld te zijn: laat los
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
      let bs = -99;
      for (const x of order(g.alive)) {
        if (x === g.seat || g.wOf(x) >= 2 || x === g.npos) continue;
        const p = g.path(x);
        if (!p || p.length === 0) continue;
        let kosten = 0;
        for (let i = 1; i < p.length; i++) {
          if (g.wOf(p[i]) === 0) kosten += g.cost.get(p[i]) ?? 1;
        }
        kosten += 2 - g.wOf(x);
        if (kosten > Math.max(g.stock, 1)) continue;
        const v = g.open.has(x) ? g.yieldOf(x) : 1.1;
        const s2 = v * 2.2 - kosten * 1.4 + g.rng.random() * 0.3;
        if (s2 > bs) {
          bs = s2;
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

/**
 * Kiest hij stilstand (§5A-2)? De optie bestaat om te voorkomen dat zij zich
 * eeuwig verschanst, dus hij grijpt hem precies wanneer dat dreigt: als hij
 * nog hoogstens één stap heeft én er een vat-tegel naast hem ligt.
 * Zo is de keuze verklaarbaar en meetbaar; het lab kan hem aan- en uitzetten.
 */
function stilstandDoelwit(g: Game): CellKey | null {
  if (!g.cfg.afslag.stilstand.on) return null;
  const stappen = g.nbKeys(g.npos).filter((x) => g.alive.has(x) && !g.isVat(x));
  if (stappen.length > 1) return null;
  const vatten = g.nbKeys(g.npos).filter(
    (x) => g.alive.has(x) && g.isVat(x) && x !== g.seat && !g.isVerhard(x),
  );
  if (!vatten.length) return null;
  // sla de meest waardevolle motor af
  let best = vatten[0];
  for (const c of vatten) if (g.yieldOf(c) > g.yieldOf(best)) best = c;
  return best;
}

export function nexusGretig(g: Game): void {
  // §5A-3: hij begint zijn beurt volledig ingesloten door vat
  if (g.hongerVoorbijMogelijk()) {
    const vatten = g.nbKeys(g.npos).filter((x) => g.alive.has(x) && x !== g.seat);
    if (vatten.length) {
      let best = vatten[0];
      for (const c of vatten) if (g.yieldOf(c) > g.yieldOf(best)) best = c;
      g.hongerVoorbijSlok(best);
      if (g.pileN >= g.cfg.needN) g.done = 'nexus';
      return;
    }
  }

  // §5A-2: hele beurt overslaan om een steen af te slaan
  const stil = stilstandDoelwit(g);
  if (stil !== null) {
    g.stilstandAfslag(stil);
    return;
  }

  let moved = 0;
  for (let step = 0; step < g.cfg.nexusMoves; step++) {
    const opts = g.nbKeys(g.npos).filter((x) => g.nexusMag(x));
    if (!opts.length) break;
    let best = opts[0];
    let bestS = scoreNexus(g, opts[0]);
    for (let i = 1; i < opts.length; i++) {
      const s = scoreNexus(g, opts[i]);
      if (s > bestS) {
        bestS = s;
        best = opts[i];
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
    const cand = order(g.alive).filter(
      (x) => x !== g.seat && x !== g.npos && g.nexusMag(x),
    );
    if (cand.length) {
      const np = unkey(g.npos);
      let best = cand[0];
      let bestD = dist(unkey(cand[0]), np);
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

function scoreNexus(g: Game, x: CellKey): number {
  let s = 0;
  for (const y of g.nbKeys(x)) if (g.wOf(y) > 0) s += 1.2;
  if (g.wOf(x) === 1) s += 2;
  if (g.marks.has(x)) s += 3.5; // haar spoor wegvreten
  s += g.yieldOf(x) * 0.6;
  return s + g.rng.random();
}
