/**
 * De zoekbot voor de Laatste — beam-search over de handelingen binnen één beurt,
 * met een waardefunctie die verder kijkt dan de beurt zelf (§4: "minimaal
 * beam-search of MCTS-light (2-3 ply)").
 *
 * Waarom hij bestaat, en wat de gretige bot fout doet:
 *
 *   1. De gretige bot mikt op tegels die vér van de draad liggen. `push` legt
 *      dan stenen op élke tussentegel; die blijven daar liggen. Solo lekt hij
 *      zo ~23 van de 30 substantie naar tegels die nooit meer iets opleveren.
 *   2. Hij mikt ook op tegels die al een spoor dragen. Die kunnen nooit meer
 *      geoogst of doorgegeven worden — elke steen daarheen is definitief weg.
 *   3. Hij haalt gestrande stenen pas terug als zijn voorraad al leeg is.
 *
 * De rekensom waar deze bot naar toe speelt: een spoor kost drie handelingen
 * (reiken, vatten, doorgeven) en géén substantie — doorgeven geeft beide stenen
 * terug. Een doorgegeven tegel draagt bovendien de draad, dus de volgende tegel
 * ligt weer naast de draad. Met 2 handelingen per beurt is dat 2 sporen per 3
 * beurten: 12 sporen in 18 beurten, plus wat verlies aan omgedraaide stille
 * velden.
 */
import type { Game } from '../game';
import { order } from '../game';
import { dist, unkey, type CellKey } from '../hex';

type ZetSoort = 'doorgeven' | 'reiken' | 'terugtrekken' | 'wachten';
interface Zet {
  soort: ZetSoort;
  doel: CellKey;
  kosten?: number;
}

const BEAM = 6;

/** Kans dat een nog gedekte tegel een stil veld blijkt — 6 van de 36. */
const KANS_STIL = 6 / 36;

export function laatsteBeam(g: Game): void {
  g.harvest();

  interface Knoop {
    g: Game;
    plan: Zet[];
    v: number;
  }
  let beam: Knoop[] = [{ g: g.clone(), plan: [], v: waarde(g) }];
  let beste: Knoop = beam[0];

  for (let slot = 0; slot < g.cfg.acts; slot++) {
    const volgende: Knoop[] = [];
    for (const knoop of beam) {
      if (knoop.g.done) continue;
      for (const z of zetten(knoop.g)) {
        const k = knoop.g.clone();
        if (!voerUit(k, z)) continue;
        // wachten is toegestaan maar nooit gratis beter dan handelen
        const v = waarde(k) - (z.soort === 'wachten' ? 0.01 : 0);
        volgende.push({ g: k, plan: [...knoop.plan, z], v });
      }
    }
    if (!volgende.length) break;
    volgende.sort((a, b) => b.v - a.v);
    beam = volgende.slice(0, BEAM);
    if (beam[0].v > beste.v) beste = beam[0];
  }

  // het beste plan telt de vooruitblik mee: waar staat ze na nog één beurt
  // doorspelen op dezelfde manier?
  // de vooruitblik is duur, dus alleen over de kanshebbers
  let keuze = beste;
  let besteTotaal = -Infinity;
  for (const knoop of beam.slice(0, 3)) {
    const totaal = knoop.v + 0.6 * vooruitblik(knoop.g);
    if (totaal > besteTotaal) {
      besteTotaal = totaal;
      keuze = knoop;
    }
  }

  for (const z of keuze.plan) {
    if (g.done) return;
    if (z.soort === 'wachten') break;
    if (!voerUit(g, z)) break;
    if (g.pileL >= g.cfg.needL) {
      g.done = 'laatste';
      return;
    }
  }
}

/** Eén extra beurt gretig doorspelen op een kopie — de "2e ply". */
function vooruitblik(g: Game): number {
  const k = g.clone();
  k.harvest();
  for (let i = 0; i < k.cfg.acts; i++) {
    const opties = zetten(k);
    if (!opties.length) break;
    let best: Zet | null = null;
    let bv = -Infinity;
    for (const z of opties) {
      const c = k.clone();
      if (!voerUit(c, z)) continue;
      const v = waarde(c);
      if (v > bv) {
        bv = v;
        best = z;
      }
    }
    if (!best || !voerUit(k, best)) break;
  }
  return waarde(k);
}

// ------------------------------------------------------------- zettenruimte

function zetten(g: Game): Zet[] {
  const out: Zet[] = [];
  // conn() is de duurste berekening in de engine; hier één keer, en dan
  // doorgegeven aan alles wat hem nodig heeft
  const draad = g.conn();

  for (const c of g.claimable(draad)) out.push({ soort: 'doorgeven', doel: c });

  // reiken volgens de regel zelf: elke tegel naast de draad, plus rand-sprongen
  const bereik = g.reikbaar(draad);
  for (const t of order(bereik.keys())) {
    if (t === g.npos) continue;
    if (g.marks.has(t)) continue; // een spoor levert nooit meer iets op
    if (g.open.has(t) && g.yieldOf(t) <= 0) continue; // omgedraaid stil veld
    const kosten = bereik.get(t)!;
    if (kosten > g.stock) continue;
    out.push({ soort: 'reiken', doel: t, kosten });
  }

  // terugtrekken: gestrande stenen actief ophalen, niet pas bij lege voorraad
  for (const c of order(g.alive)) {
    if (c === g.seat || g.wOf(c) < 1) continue;
    if (gestrand(g, c)) out.push({ soort: 'terugtrekken', doel: c });
  }

  // wachten mag: zonder deze optie neemt de zoeker elke beurt de minst slechte
  // handeling en gaat ze zinloos heen en weer
  out.push({ soort: 'wachten', doel: g.seat });

  return out;
}

/** Een steen is gestrand als zijn tegel nooit meer iets kan opleveren. */
function gestrand(g: Game, c: CellKey): boolean {
  if (g.marks.has(c)) return true;
  return g.open.has(c) && g.yieldOf(c) <= 0;
}

function voerUit(g: Game, z: Zet): boolean {
  switch (z.soort) {
    case 'doorgeven': {
      if (g.wOf(z.doel) < 2 || g.marks.has(z.doel)) return false;
      g.claim(z.doel);
      if (g.pileL >= g.cfg.needL) g.done = 'laatste';
      return true;
    }
    case 'reiken':
      return g.reik(z.doel, z.kosten ?? 1);
    case 'terugtrekken': {
      if (g.wOf(z.doel) < 1) return false;
      g.withdraw(z.doel);
      return true;
    }
    case 'wachten':
      return true;
  }
}

// ---------------------------------------------------------- waardefunctie

function waarde(g: Game): number {
  const solo = g.cfg.solo;
  const npos = solo ? null : unkey(g.npos);
  const dichtbij = (k: CellKey) => (npos ? dist(unkey(k), npos) : 99);

  let v = 0;
  let vatten = 0;
  let ijl = 0;
  let lek = 0;
  const draad = g.conn();
  const aanDraad = new Set<CellKey>(g.reikbaar(draad).keys());

  for (const c of draad) {
    if (c === g.seat) continue;
    if (g.marks.has(c)) continue;
    const w = g.wOf(c);
    if (g.yieldOf(c) <= 0) continue;
    if (w >= 2) vatten++;
    else if (w === 1) ijl++;
  }
  for (const c of g.alive) {
    if (c === g.seat) continue;
    if (gestrand(g, c)) lek += g.wOf(c);
  }

  // sporen zijn de munt, maar een spoor naast de Nexus is geleend geld
  let sporenWaarde = 0;
  for (const c of g.marks) {
    sporenWaarde += dichtbij(c) <= 2 ? 62 : 100;
  }
  // De gradiënt moet strikt oplopen richting afmaken, anders spreidt ze stenen
  // in plaats van tegels af te maken: bij vat = 2 x ijl is een tweede steen
  // precies even veel waard als een eerste steen ergens anders, en dat laatste
  // vergroot ook nog eens het front.
  //   reiken   (leeg -> ijl)   +8   - 2,4 voorraad
  //   vatten   (ijl  -> vat)  +16   - 2,4 voorraad
  //   doorgeven(vat  -> spoor)+76   + 4,8 voorraad
  v += sporenWaarde;
  v += 24 * vatten;
  v += 8 * ijl;
  v += 2.4 * g.stock;
  v -= 15 * lek;
  // met minder dan twee substantie kan ze niets afmaken
  if (g.stock < 2) v -= 12 * (2 - g.stock);

  // ruimte om verder te bouwen: tegels die ze nu daadwerkelijk kan bereiken,
  // gedekt telt mee maar met de kans op een stil veld erin verdisconteerd
  let front = 0;
  for (const t of aanDraad) {
    if (t === g.seat || g.marks.has(t) || g.wOf(t) >= 2) continue;
    if (g.open.has(t)) {
      if (g.yieldOf(t) > 0) front += 1;
    } else {
      front += 1 - KANS_STIL;
    }
  }
  // het front telt als ademruimte, niet als doel: zonder plafond loont het om
  // stenen te blijven spreiden puur om meer buren aan te raken
  v += 1.2 * Math.min(front, 6);
  if (front === 0) v -= 40; // doodlopende draad is het echte verlies

  return v;
}
