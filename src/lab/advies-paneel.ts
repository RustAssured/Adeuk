/**
 * Het advies-paneel. Na elke batch legt het de stand langs de negen stelregels
 * en zegt in één woord wat het ervan vindt.
 *
 * Twee dingen zijn hier expres zo gedaan.
 *
 * De grijze regels zien er anders uit dan de gekleurde: gestippeld, gedimd, met
 * "aan tafel te toetsen" erbij. Ze horen in het overzicht — dat is de helft van
 * het punt — maar ze mogen er nooit uitzien alsof ze goedgekeurd zijn.
 *
 * En elke batch die "aanbevolen" haalt wordt bewaard als vergelijkingsstand.
 * Daarnaast staat de volgende batch, met per stelregel wat er van kleur
 * veranderde. Zo heeft elke draai aan een knop een voor en een na.
 */
import type { GameConfig } from '../engine/config';
import type { Meting2, PersonaMeting } from '../engine/meting2';
import { beoordeel, type Advies, type Kleur, type Oordeel } from '../engine/adviesregels';
import { el } from './panels';

export interface Batchstand {
  cfg: GameConfig;
  meting: Meting2;
  personas?: PersonaMeting;
  n: number;
  seedStart: number;
  /** wanneer hij gedraaid is, voor de regel eronder */
  tijd: number;
}

const SLEUTEL = 'adeuk.vergelijkingsstand';

export function bewaarAlsVergelijking(s: Batchstand): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(s));
  } catch {
    /* privémodus: dan maar zonder geheugen */
  }
}

export function laadVergelijking(): Batchstand | null {
  try {
    const rauw = localStorage.getItem(SLEUTEL);
    return rauw ? (JSON.parse(rauw) as Batchstand) : null;
  } catch {
    return null;
  }
}

export function wisVergelijking(): void {
  try {
    localStorage.removeItem(SLEUTEL);
  } catch {
    /* laat maar */
  }
}

// ------------------------------------------------------------- knopverschil

/** De knoppen waarop twee standen van elkaar kunnen verschillen. */
const PADEN: Array<[string, string]> = [
  ['acts', 'handelingen'],
  ['nexusMoves', 'stappen'],
  ['needL', 'sporen nodig'],
  ['needN', 'tegels nodig'],
  ['start', 'voorraad'],
  ['total', 'substantie'],
  ['harvest', 'oogsten'],
  ['yields.bewoond', 'oogst bewoond'],
  ['yields.planeet', 'oogst planeet'],
  ['yields.komeet', 'oogst komeet'],
  ['yields.gat', 'oogst zwart gat'],
  ['yields.stil', 'oogst stil veld'],
  ['feed', 'voeden'],
  ['spoorVreten', 'spoorvreten'],
  ['afslag.omsingeling.on', 'omsingeling'],
  ['afslag.omsingeling.minRandZijden', 'rand-zijden'],
  ['afslag.omsingeling.bordrandTelt', 'bordrand telt'],
  ['afslag.stilstand.on', 'stilstand'],
  ['afslag.hongerVoorbij.on', 'honger voorbij'],
  ['verharden.on', 'verharden'],
  ['verharden.K', 'K'],
  ['verzilveren.on', 'verzilveren'],
  ['verzilveren.M', 'M'],
  ['oversteek.on', 'de Oversteek'],
  ['oversteek.afstand', 'afstand Oog'],
  ['oversteek.oogMoetVanHaarZijn', 'Oog van haar'],
  ['oversteek.hof', 'hof'],
  ['oversteek.onbereikbaar', 'onbereikbaar'],
  ['oversteek.maxSprong', 'sprong'],
  ['laatsteBot', 'zij speelt als'],
  ['nexusBot', 'hij speelt als'],
  ['maxTurns', 'beurtenplafond'],
];

const lees = (o: unknown, pad: string): unknown =>
  pad.split('.').reduce<any>((x, k) => x?.[k], o);

const toon = (v: unknown): string =>
  typeof v === 'boolean' ? (v ? 'aan' : 'uit') : String(v);

/** Wat er tussen twee standen aan knoppen verschoven is, in leesbare taal. */
export function verschillen(was: GameConfig, nu: GameConfig): string[] {
  const uit: string[] = [];
  for (const [pad, naam] of PADEN) {
    const a = lees(was, pad);
    const b = lees(nu, pad);
    if (a !== b && a !== undefined && b !== undefined) {
      uit.push(`${naam} ${toon(a)} → ${toon(b)}`);
    }
  }
  return uit;
}

/** De knoppen van een bewaarde stand terugzetten in de levende configuratie. */
export function neemKnoppenOver(doel: GameConfig, bron: GameConfig): void {
  for (const [pad] of PADEN) {
    const v = lees(bron, pad);
    if (v === undefined) continue;
    const delen = pad.split('.');
    const laatste = delen.pop()!;
    const o = delen.reduce<any>((x, k) => x?.[k], doel);
    if (o) o[laatste] = v;
  }
}

// ------------------------------------------------------------------ tekenen

const stip = (k: Kleur, klein = false) =>
  el('span', { class: `stip ${k}${klein ? ' klein' : ''}`, title: k });

const EINDKLEUR: Record<string, Kleur> = {
  aanbevolen: 'groen',
  'aanbevolen met kanttekening': 'oranje',
  afgeraden: 'rood',
};

/** De cijfers die het meest zeggen, voor de voor/na-tabel. */
function kerncijfers(m: Meting2): Array<[string, number, string]> {
  return [
    ['zij wint', m.verdeling.laatste, '%'],
    ['hij wint', m.verdeling.nexus, '%'],
    ['klem', m.verdeling.timeout, '%'],
    ['mediane duur', m.medianDuur, ' b'],
    ['vastlopers', m.vastlopers, '%'],
    ['ketens verhard', m.verhardPct, '%'],
    ['punten los', m.losPct, '%'],
    ['comebacks', m.comebackPct, '%'],
    ['leiderswissels', m.gemWissels, ''],
    ['route-winst', m.blokkadePct, '%'],
  ];
}

function oordeelrij(o: Oordeel, was?: Oordeel): HTMLElement {
  const grijs = o.kleur === 'grijs';
  const kop = el('div', { class: 'o-kop' }, [
    stip(o.kleur),
    el('span', { class: 'o-nr' }, [String(o.nr)]),
    el('span', { class: 'o-naam' }, [o.stelregel]),
  ]);
  if (grijs) {
    kop.append(el('span', { class: 'o-merk' }, ['aan tafel te toetsen']));
  } else if (was && was.kleur !== o.kleur) {
    kop.append(
      el('span', { class: 'o-verschoven' }, [stip(was.kleur, true), '→', stip(o.kleur, true)]),
    );
  }

  const rij = el('div', { class: `oordeel ${o.kleur}` }, [
    kop,
    el('p', { class: 'o-reden' }, [o.reden]),
  ]);

  if (o.signalen.length) {
    const sig = el('div', { class: 'o-signalen' });
    for (const s of o.signalen) {
      sig.append(
        el('span', { class: `signaal ${s.kleur}` }, [
          stip(s.kleur, true),
          el('span', { class: 's-naam' }, [s.naam]),
          el('b', {}, [s.waarde]),
        ]),
      );
    }
    rij.append(sig);
  }
  return rij;
}

export interface PaneelHaken {
  /** de knoppen van de vergelijkingsstand overnemen */
  neemOver: (cfg: GameConfig) => void;
  /** deze batch met de hand als vergelijkingsstand vastzetten */
  zetVast: () => void;
  /** de vergelijkingsstand weggooien */
  wis: () => void;
}

export function toonAdvies(
  vak: HTMLElement,
  huidig: Batchstand,
  referentie: Batchstand | null,
  haken: PaneelHaken,
): Advies {
  const advies = beoordeel(huidig.meting, huidig.cfg, huidig.personas);
  const wasAdvies = referentie ? beoordeel(referentie.meting, referentie.cfg, referentie.personas) : null;
  const kleur = EINDKLEUR[advies.eind];

  // --- de uitspraak ------------------------------------------------------
  const banier = el('div', { class: `banier ${kleur}` }, [
    el('div', { class: 'b-woord' }, [advies.eind]),
    el('div', { class: 'b-bepalend' }, [
      advies.eind === 'aanbevolen'
        ? advies.bepalend
        : `bepalend: ${advies.bepalend}`,
    ]),
    ...(advies.waarschuwing
      ? [el('div', { class: 'b-waarschuwing' }, [advies.waarschuwing])]
      : []),
    el('div', { class: 'b-bron' }, [
      `${huidig.meting.n} potjes, seeds ${huidig.seedStart}–${huidig.seedStart + huidig.n - 1}` +
        (huidig.personas ? ' · over alle drie de persona’s' : ''),
    ]),
  ]);

  const groep = el('div', { class: 'groep advies' }, [banier]);

  // --- de vergelijkingsstand --------------------------------------------
  if (referentie && wasAdvies) {
    const zelfdeSeeds =
      referentie.n === huidig.n && referentie.seedStart === huidig.seedStart;
    const diff = verschillen(referentie.cfg, huidig.cfg);
    const vk = el('div', { class: 'vergelijking' });
    vk.append(
      el('div', { class: 'v-kop' }, [
        el('span', {}, ['vergeleken met de laatste aanbevolen stand']),
        stip(EINDKLEUR[wasAdvies.eind], true),
      ]),
    );
    vk.append(
      el('p', { class: 'bij' }, [
        diff.length
          ? `Verschil in de knoppen: ${diff.join(' · ')}.`
          : 'Zelfde knoppen — alleen opnieuw gedraaid.',
      ]),
    );
    if (!zelfdeSeeds) {
      vk.append(
        el('p', { class: 'waarschuwing' }, [
          `Andere seeds: ${referentie.n} potjes daar, ${huidig.n} hier. Het verschil is ` +
            'deels toeval; draai beide met hetzelfde aantal om ze naast elkaar te leggen.',
        ]),
      );
    }

    const tabel = el('div', { class: 'voorna' });
    tabel.append(
      el('span', { class: 'vn-kop' }, ['']),
      el('span', { class: 'vn-kop' }, ['was']),
      el('span', { class: 'vn-kop' }, ['nu']),
      el('span', { class: 'vn-kop' }, ['Δ']),
    );
    const nuC = kerncijfers(huidig.meting);
    const wasC = kerncijfers(referentie.meting);
    for (let i = 0; i < nuC.length; i++) {
      const [naam, n, e] = nuC[i];
      const w = wasC[i][1];
      const d = n - w;
      const cijfers = e === '' ? 1 : 0;
      tabel.append(
        el('span', { class: 'vn-naam' }, [naam]),
        el('span', { class: 'vn-was' }, [w.toFixed(cijfers) + e]),
        el('span', { class: 'vn-nu' }, [n.toFixed(cijfers) + e]),
        el('span', { class: `vn-d ${Math.abs(d) < 0.05 ? 'nul' : d > 0 ? 'op' : 'neer'}` }, [
          Math.abs(d) < 0.05 ? '—' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(cijfers)}`,
        ]),
      );
    }
    vk.append(tabel);

    const knopjes = el('div', { class: 'v-knopjes' });
    const over = el('button', { class: 'knop klein' }, ['neem die knoppen over']);
    over.onclick = () => haken.neemOver(referentie.cfg);
    const weg = el('button', { class: 'knop klein stil' }, ['vergeet deze stand']);
    weg.onclick = () => haken.wis();
    knopjes.append(over, weg);
    vk.append(knopjes);
    groep.append(vk);
  } else {
    groep.append(
      el('p', { class: 'bij' }, [
        'Nog geen vergelijkingsstand. Zodra een batch "aanbevolen" haalt, wordt hij ' +
          'bewaard en staat de volgende batch ernaast.',
      ]),
    );
  }

  // --- de negen stelregels ----------------------------------------------
  groep.append(el('h3', { style: 'margin-top:20px' }, ['De negen stelregels']));
  const lijst = el('div', { class: 'oordelen' });
  for (const o of advies.oordelen) {
    lijst.append(oordeelrij(o, wasAdvies?.oordelen.find((x) => x.nr === o.nr)));
  }
  groep.append(lijst);

  // --- wat er aan staat --------------------------------------------------
  groep.append(
    el('h3', { style: 'margin-top:20px' }, ['Regels die aan staan']),
    el('div', { class: 'regelchips' }, advies.actieveRegels.map((r) =>
      el('span', { class: 'chip' }, [r]),
    )),
  );

  // --- met de hand vastzetten -------------------------------------------
  const vast = el('button', { class: 'knop klein' }, [
    'zet deze batch vast als vergelijkingsstand',
  ]);
  vast.onclick = () => haken.zetVast();
  groep.append(el('div', { class: 'v-knopjes', style: 'margin-top:16px' }, [vast]));

  vak.replaceChildren(groep);
  return advies;
}
