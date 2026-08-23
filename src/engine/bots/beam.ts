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
 *
 * Met de middenlaag (meetopdracht 2) erbij verandert die rekensom. Een keten
 * van K vat-tegels verhardt en levert bij verzilveren K x M punten in één
 * handeling; dat is per handeling veel goedkoper dan los doorgeven. En de
 * Oversteek maakt punten alleen de helft van de winst: er moet ook een pad van
 * de Zetel naar het Oog liggen. De waardefunctie hieronder weegt die drie
 * dingen tegen elkaar af — inclusief het lastigste dilemma: een verharde keten
 * is onaantastbaar en dus een veilige route, maar verzilveren maakt hem weer
 * tot gewoon spoor dat hij kan wegvreten.
 */
import type { Game } from '../game';
import { order } from '../game';
import { dist, unkey, type CellKey } from '../hex';

type ZetSoort = 'doorgeven' | 'verzilveren' | 'reiken' | 'terugtrekken' | 'wachten';
interface Zet {
  soort: ZetSoort;
  doel: CellKey;
  kosten?: number;
  keten?: number;
}

const BEAM = 6;

/** Kans dat een nog gedekte tegel een stil veld blijkt — 6 van de 36. */
const KANS_STIL = 6 / 36;

/** Waarde van één punt op haar teller. Alle andere gewichten hangen hieraan. */
const PUNT = 100;

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
  // doorspelen op dezelfde manier? De vooruitblik is duur, dus alleen over de
  // kanshebbers.
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
    if (g.winstLaatste()) {
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
  for (const nr of g.verzilverbaar(draad)) {
    const tegels = g.ketens.get(nr)!;
    out.push({ soort: 'verzilveren', doel: [...tegels][0], keten: nr });
  }

  // reiken volgens de regel zelf: elke tegel naast de draad, plus rand-sprongen
  const bereik = g.reikbaar(draad);
  const middenlaag = g.cfg.verharden.on;
  for (const t of order(bereik.keys())) {
    if (t === g.npos) continue;
    if (g.marks.has(t)) continue; // een spoor levert nooit meer iets op
    // Een omgedraaid stil veld oogst niets, maar met verharden aan kan het wél
    // een keten vullen of een stuk route dragen — dan is het geen dode tegel.
    if (!middenlaag && g.open.has(t) && g.yieldOf(t) <= 0) continue;
    const kosten = bereik.get(t)!;
    if (kosten > g.stock) continue;
    out.push({ soort: 'reiken', doel: t, kosten });
  }

  // terugtrekken: gestrande stenen actief ophalen, niet pas bij lege voorraad
  for (const c of order(g.alive)) {
    if (c === g.seat || g.wOf(c) < 1) continue;
    if (g.isVerhard(c)) continue;
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
  if (g.isVerhard(c)) return false;
  if (!g.open.has(c) || g.yieldOf(c) > 0) return false;
  // stil veld: met de middenlaag is hij nog bruikbaar als ketenvulling of route
  if (!g.cfg.verharden.on) return true;
  if (g.oog && (c === g.oog || opRoute(g, c))) return false;
  return g.vatComponent(c).size < 2 && g.wOf(c) < 2;
}

function opRoute(g: Game, c: CellKey): boolean {
  const pad = g.routeNaarOog();
  return pad ? pad.includes(c) : false;
}

function voerUit(g: Game, z: Zet): boolean {
  switch (z.soort) {
    case 'doorgeven': {
      if (g.wOf(z.doel) < 2 || g.marks.has(z.doel) || g.isVerhard(z.doel)) return false;
      g.claim(z.doel);
      if (g.winstLaatste()) g.done = 'laatste';
      return true;
    }
    case 'verzilveren': {
      if (z.keten === undefined || !g.verzilver(z.keten)) return false;
      if (g.winstLaatste()) g.done = 'laatste';
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
  if (g.done === 'laatste') return 1e6;

  const solo = g.cfg.solo;
  const npos = solo ? null : unkey(g.npos);
  const dichtbij = (k: CellKey) => (npos ? dist(unkey(k), npos) : 99);
  const cfg = g.cfg;
  const middenlaag = cfg.verharden.on || cfg.verzilveren.on;

  let v = 0;
  const draad = g.conn();
  const aanDraad = new Set<CellKey>(g.reikbaar(draad).keys());

  // ---- 1. wat er al op de teller staat -----------------------------------
  // Boven de drempel is een extra punt niets waard, behalve als hij punten kan
  // wegvreten; dan is het een buffer.
  const bufferWaarde = cfg.spoorVreten === 'alles' || cfg.spoorVreten === 'eenPerBeurt' ? 14 : 2;
  const opTeller = Math.min(g.pileL, cfg.needL);
  const overschot = Math.max(0, g.pileL - cfg.needL);
  v += PUNT * opTeller + bufferWaarde * overschot;
  let gedekt = opTeller;
  const nodig = () => Math.max(0, cfg.needL - gedekt);

  // ---- 2. sporen die er als tegel nog liggen ------------------------------
  // Ze dragen de draad en de route; een spoor naast de Nexus is geleend geld.
  for (const c of g.marks) {
    if (!g.alive.has(c)) continue;
    v += dichtbij(c) <= 2 ? 4 : 9;
  }

  // ---- 3. verharde ketens: punten in de wacht, en onaantastbaar -----------
  const ketens = [...g.ketens.keys()].sort((a, b) => g.ketenWaarde(b) - g.ketenWaarde(a));
  for (const nr of ketens) {
    const w = g.ketenWaarde(nr);
    const bijdrage = Math.min(w, nodig());
    gedekt += bijdrage;
    // 0,88: één handeling verwijderd van de teller, en tot die tijd veilig
    v += 0.88 * PUNT * bijdrage + 12 * (w - bijdrage);
    // een verharde tegel is bovendien permanent draad — dat is de enige route
    // die hij niet kan wegvreten
    v += 6 * (g.ketens.get(nr)?.size ?? 0);
  }

  // ---- 4. vat-tegels onderweg naar een keten ------------------------------
  let lek = 0;
  if (middenlaag) {
    const K = cfg.verharden.K;
    const gezien = new Set<CellKey>();
    let losseVat = 0;
    for (const c of order(g.alive)) {
      if (c === g.seat || g.wOf(c) < 2 || g.isVerhard(c) || gezien.has(c)) continue;
      const groep = g.vatComponent(c);
      for (const x of groep) gezien.add(x);
      if (!groep.size) continue;
      // kan deze groep de K überhaupt nog halen?
      const ruimte = groeiruimte(g, groep);
      if (groep.size + ruimte < K) {
        // nooit meer een keten: alleen nog los doorgeven waard
        losseVat += groep.size;
        continue;
      }
      const vol = Math.min(Math.floor(K * cfg.verzilveren.M), Math.max(1, nodig()));
      gedekt += vol;
      const deel = Math.min(1, groep.size / K);
      // kwadratisch: de laatste tegel van een keten is veruit de waardevolste
      v += 0.88 * PUNT * vol * deel * deel;
    }
    // vat-tegels die geen keten meer kunnen worden zijn nog wel los doorgeefbaar
    v += 24 * losseVat;
    for (const c of g.alive) {
      if (c === g.seat || g.isVerhard(c)) continue;
      if (g.marks.has(c)) lek += g.wOf(c);
    }
  } else {
    let vatten = 0;
    let ijl = 0;
    for (const c of draad) {
      if (c === g.seat || g.marks.has(c) || g.yieldOf(c) <= 0) continue;
      const w = g.wOf(c);
      if (w >= 2) vatten++;
      else if (w === 1) ijl++;
    }
    // De gradiënt moet strikt oplopen richting afmaken, anders spreidt ze stenen
    // in plaats van tegels af te maken: bij vat = 2 x ijl is een tweede steen
    // precies even veel waard als een eerste steen ergens anders.
    v += 24 * vatten + 8 * ijl;
    for (const c of g.alive) {
      if (c === g.seat) continue;
      if (gestrand(g, c)) lek += g.wOf(c);
    }
  }

  // ---- 5. halve tegels tellen ook mee -------------------------------------
  if (middenlaag) {
    for (const c of g.alive) {
      if (c === g.seat || g.wOf(c) !== 1 || g.marks.has(c)) continue;
      v += 10;
    }
  }

  // ---- 6. de gesloten kringloop ------------------------------------------
  v += 2.4 * g.stock;
  v -= 15 * lek;
  if (g.stock < 2) v -= 12 * (2 - g.stock); // met minder kan ze niets afmaken

  // ---- 7. de Oversteek ----------------------------------------------------
  // Punten alleen winnen niets: er moet ook een pad liggen. En het pad is
  // onomkeerbaar — elke tegel die hij eruit vreet komt nooit meer terug. De
  // route weegt daarom zwaarder per handeling dan een punt, en de omgeving van
  // het Oog telt apart mee: sluit hij die dicht, dan is de partij voor haar
  // voorbij zonder dat ze het aan haar teller ziet.
  if (cfg.oversteek.on && g.oog) {
    const tekort = g.routeTekort();
    if (!Number.isFinite(tekort)) {
      v -= 2400; // het Oog is ingesloten: ze kan niet meer winnen
    } else {
      v -= 72 * tekort;
      const pad = g.routeNaarOog();
      if (pad) {
        // Hoe hard is deze route?
        //   verhard  — hij kan er niets aan doen, ooit;
        //   vat      — veilig zolang de omsingeling hem niet uitholt;
        //   spoor    — hij hoeft er één weg te vreten en de oversteek is weg.
        // Dat verschil is groot genoeg om een keten níet te verzilveren: een
        // keten van vier levert acht punten, maar als hij tevens de weg naar het
        // Oog draagt is hij als draagmuur meer waard dan als munt.
        let alleVerhard = true;
        let alleVat = true;
        for (const c of pad) {
          if (c === g.seat) continue;
          if (!g.isVerhard(c)) alleVerhard = false;
          if (g.wOf(c) < 2) alleVat = false;
        }
        v += alleVerhard ? 1000 : alleVat ? 420 : 120;
      }
    }
    // hoeveel lucht heeft het Oog nog, en hoeveel daarvan is van haar?
    let lucht = 0;
    let vanHaar = 0;
    for (const x of g.nbKeys(g.oog)) {
      if (!g.alive.has(x)) continue;
      lucht++;
      if (g.haarTegel(x) || g.isVerhard(x)) vanHaar++;
    }
    v -= 70 * Math.max(0, 3 - lucht);
    v += 30 * Math.min(vanHaar, 2);
    if (g.haarTegel(g.oog)) v += 70;
  }

  // ---- 8. ruimte om verder te bouwen -------------------------------------
  let front = 0;
  for (const t of aanDraad) {
    if (t === g.seat || g.marks.has(t) || g.wOf(t) >= 2) continue;
    if (g.open.has(t)) {
      if (middenlaag || g.yieldOf(t) > 0) front += 1;
    } else {
      front += 1 - KANS_STIL;
    }
  }
  // het front telt als ademruimte, niet als doel: zonder plafond loont het om
  // stenen te blijven spreiden puur om meer buren aan te raken
  v += 1.2 * Math.min(front, 6);
  if (front === 0 && !g.ketens.size) v -= 40; // doodlopende draad is het echte verlies

  return v;
}

/** Hoeveel tegels kan deze groep er nog bij krijgen? */
function groeiruimte(g: Game, groep: Set<CellKey>): number {
  const buiten = new Set<CellKey>();
  for (const c of groep) {
    for (const x of g.nbKeys(c)) {
      if (groep.has(x) || buiten.has(x)) continue;
      if (!g.alive.has(x) || x === g.seat) continue;
      if (g.isVerhard(x) || g.marks.has(x)) continue;
      buiten.add(x);
    }
  }
  return buiten.size;
}
