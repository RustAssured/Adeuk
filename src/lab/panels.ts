/**
 * De drie panelen rechts: de zetlijst (replay), de knoppen (§5) en de batch.
 *
 * Alle knoppen uit §5 lezen en schrijven één configuratie-object; er wordt
 * nergens iets herbouwd. Dat is de les uit RESONANTIE die §6 noemt.
 */
import type { GameConfig } from '../engine/config';
import type { BatchMetriek } from '../engine/batch';
import type { GameEvent } from '../engine/types';

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  kinderen: Array<Node | string> = [],
): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else n.setAttribute(k, v);
  }
  for (const kind of kinderen) n.append(kind);
  return n;
};

// ------------------------------------------------------------------ knoppen

interface Getal {
  soort: 'getal';
  pad: string;
  label: string;
  bij?: string;
  min: number;
  max: number;
  stap?: number;
}
interface Vink {
  soort: 'vink';
  pad: string;
  label: string;
  bij?: string;
}
interface Keuze {
  soort: 'keuze';
  pad: string;
  label: string;
  bij?: string;
  opties: string[];
}
type Knop = Getal | Vink | Keuze;

const GROEPEN: Array<{ titel: string; bij: string; knoppen: Knop[] }> = [
  {
    titel: 'Tempo',
    bij: 'Haar ondergrens is 3 × sporen ÷ handelingen beurten; de zijne is tegels ÷ stappen. Bij de v5-stand staat dat op 18 tegen 14.',
    knoppen: [
      { soort: 'getal', pad: 'acts', label: 'handelingen van de Laatste', min: 1, max: 5 },
      { soort: 'getal', pad: 'nexusMoves', label: 'stappen van de Nexus', min: 1, max: 4 },
      { soort: 'getal', pad: 'needL', label: 'sporen die zij nodig heeft', bij: 'met de Oversteek aan is dit de drempel, niet de winst zelf', min: 4, max: 24 },
      { soort: 'getal', pad: 'needN', label: 'tegels die hij nodig heeft', bij: 'sporen + tegels moeten samen boven de 36 uitkomen, anders kunnen ze het allebei halen', min: 10, max: 36 },
    ],
  },
  {
    titel: 'Het lichaam',
    bij: 'De gesloten kringloop: niets verdwijnt, alles staat in voorraad, op het bord of in de doos.',
    knoppen: [
      { soort: 'getal', pad: 'start', label: 'substantie in voorraad', min: 1, max: 40 },
      { soort: 'getal', pad: 'total', label: 'substantie in het spel', min: 1, max: 60 },
      { soort: 'vink', pad: 'harvest', label: 'oogsten' },
      { soort: 'vink', pad: 'feed', label: 'elke hap voedt haar' },
    ],
  },
  {
    titel: 'Oogst per tegel',
    bij: 'Wat een vat-tegel aan de draad per beurt oplevert.',
    knoppen: [
      { soort: 'getal', pad: 'yields.bewoond', label: 'bewoonde wereld', min: 0, max: 5 },
      { soort: 'getal', pad: 'yields.planeet', label: 'planeet', min: 0, max: 5 },
      { soort: 'getal', pad: 'yields.komeet', label: 'komeet', min: 0, max: 5 },
      { soort: 'getal', pad: 'yields.gat', label: 'zwart gat', min: 0, max: 5 },
      { soort: 'getal', pad: 'yields.stil', label: 'stil veld', min: 0, max: 5 },
    ],
  },
  {
    titel: 'Afslaan — de drie opties uit §5A',
    bij: 'Zonder één van deze verschanst zij zich achter vat-tegels en staat het bord stil.',
    knoppen: [
      { soort: 'vink', pad: 'afslag.omsingeling.on', label: '1 · omsingeling', bij: 'een vat-tegel met genoeg rand-zijden verliest aan het eind van zijn beurt een steen naar de doos' },
      { soort: 'getal', pad: 'afslag.omsingeling.minRandZijden', label: '— rand-zijden nodig', min: 1, max: 6 },
      { soort: 'vink', pad: 'afslag.omsingeling.bordrandTelt', label: '— bordrand telt mee' },
      { soort: 'vink', pad: 'afslag.stilstand.on', label: '2 · stilstand', bij: 'hij slaat zijn hele beurt over, ook de verplichte hap, en slaat één steen af' },
      { soort: 'vink', pad: 'afslag.hongerVoorbij.on', label: '3 · honger voorbij', bij: 'staat hij helemaal ingesloten door vat, dan mag hij er één in zijn geheel verzwelgen' },
    ],
  },
  {
    titel: 'De middenlaag',
    bij: 'Uit de speeltest: het spel is puur chasen, zij oogt machteloos, hij heeft geen eigen spel. Deze drie regels zijn het antwoord.',
    knoppen: [
      { soort: 'vink', pad: 'verharden.on', label: 'A · verharden', bij: 'een aaneengesloten groep van K vat-tegels wordt onaantastbaar, en is daarmee ook af' },
      { soort: 'getal', pad: 'verharden.K', label: '— K, tegels per keten', min: 2, max: 8 },
      { soort: 'vink', pad: 'verzilveren.on', label: 'B · verzilveren', bij: 'een hele verharde keten in één handeling, voor tegels x M punten' },
      { soort: 'getal', pad: 'verzilveren.M', label: '— M, vermenigvuldiger', bij: 'los doorgeven blijft 1 punt per tegel; bij een hoge M is dat dood', min: 1, max: 3, stap: 0.5 },
      { soort: 'vink', pad: 'oversteek.on', label: 'C · de Oversteek', bij: 'winnen vraagt de teller én een onafgebroken pad van de Zetel naar het Oog' },
      { soort: 'getal', pad: 'oversteek.afstand', label: '— afstand Oog tot Zetel', min: 2, max: 6 },
      { soort: 'vink', pad: 'oversteek.oogMoetVanHaarZijn', label: '— het Oog zelf moet van haar zijn', bij: 'uit: een pad tot náást het Oog volstaat' },
      { soort: 'vink', pad: 'oversteek.hof', label: '— hof: de buren van het Oog zijn ook onverzwelgbaar', bij: 'niet in de opdracht; hiermee kan hij het Oog niet volledig insluiten' },
      { soort: 'vink', pad: 'oversteek.onbereikbaarEindigt', label: '— onbereikbaar Oog beëindigt de partij', bij: 'niet in de opdracht; haalt de dode beurten eruit als er geen weg meer is' },
    ],
  },
  {
    titel: 'Spoorvreten — niet in §5, wél doorslaggevend',
    bij: 'Hij vreet 61–78% van alles wat zij bouwt. Geen enkele tempo-instelling weegt daar tegenop; dit is de knop die dat wel doet. Nog geen besloten regel — hier om te meten.',
    knoppen: [
      {
        soort: 'keuze',
        pad: 'spoorVreten',
        label: 'als hij een spoor verzwelgt',
        bij: 'alles = v5 (−1 op haar teller) · eenPerBeurt = hoogstens één per beurt · alleenTegel = de tegel gaat, haar teller blijft · nooit = een spoor is onschendbaar',
        opties: ['alles', 'eenPerBeurt', 'alleenTegel', 'nooit'],
      },
    ],
  },
  {
    titel: 'Wie speelt',
    bij: 'De gretige bot is de bot uit v5, ongewijzigd. De zoekbot speelt de regel zoals §2 hem beschrijft.',
    knoppen: [
      { soort: 'keuze', pad: 'laatsteBot', label: 'de Laatste', opties: ['gretig', 'defensief', 'gemengd', 'beam'] },
      { soort: 'keuze', pad: 'nexusBot', label: 'de Nexus', opties: ['gretig', 'defensief', 'gemengd'] },
      { soort: 'vink', pad: 'solo', label: 'solo — zonder Nexus', bij: 'de batterij uit §4' },
      { soort: 'getal', pad: 'maxTurns', label: 'beurtenplafond', min: 10, max: 200, stap: 10 },
    ],
  },
];

function lees(cfg: GameConfig, pad: string): unknown {
  return pad.split('.').reduce<any>((o, k) => o?.[k], cfg);
}
function schrijf(cfg: GameConfig, pad: string, waarde: unknown): void {
  const delen = pad.split('.');
  const laatste = delen.pop()!;
  const doel = delen.reduce<any>((o, k) => o[k], cfg);
  doel[laatste] = waarde;
}

export function bouwKnoppen(
  vak: HTMLElement,
  cfg: GameConfig,
  bijWijziging: () => void,
): () => void {
  vak.replaceChildren();
  const verversers: Array<() => void> = [];

  for (const groep of GROEPEN) {
    const g = el('div', { class: 'groep' }, [
      el('h3', {}, [groep.titel]),
      el('p', { class: 'bij' }, [groep.bij]),
    ]);

    for (const knop of groep.knoppen) {
      const label = el('label', {}, [knop.label]);
      if (knop.bij) label.append(el('small', {}, [knop.bij]));

      let bediening: HTMLElement;
      if (knop.soort === 'getal') {
        const inp = el('input', {
          type: 'number',
          min: String(knop.min),
          max: String(knop.max),
          step: String(knop.stap ?? 1),
        });
        inp.value = String(lees(cfg, knop.pad) ?? 0);
        inp.oninput = () => {
          const v = Math.max(knop.min, Math.min(knop.max, Number(inp.value)));
          if (Number.isFinite(v)) {
            schrijf(cfg, knop.pad, v);
            bijWijziging();
          }
        };
        verversers.push(() => (inp.value = String(lees(cfg, knop.pad) ?? 0)));
        bediening = inp;
      } else if (knop.soort === 'vink') {
        const inp = el('input', { type: 'checkbox' });
        inp.checked = Boolean(lees(cfg, knop.pad));
        inp.onchange = () => {
          schrijf(cfg, knop.pad, inp.checked);
          bijWijziging();
        };
        verversers.push(() => (inp.checked = Boolean(lees(cfg, knop.pad))));
        bediening = el('span', { class: 'tuimel' }, [inp, el('span', {})]);
      } else {
        const sel = el('select');
        for (const o of knop.opties) {
          const opt = el('option', { value: o }, [o]);
          sel.append(opt);
        }
        sel.value = String(lees(cfg, knop.pad));
        sel.onchange = () => {
          schrijf(cfg, knop.pad, sel.value);
          bijWijziging();
        };
        verversers.push(() => (sel.value = String(lees(cfg, knop.pad))));
        bediening = sel;
      }

      g.append(el('div', { class: 'regel' }, [label, bediening]));
    }
    vak.append(g);
  }

  return () => verversers.forEach((f) => f());
}

// ------------------------------------------------------------------- replay

const MERKJE: Record<string, string> = {
  opzet: '◇', beurt: '', oogst: '↑', reiken: '·', vatten: '◆', randsprong: '⤳',
  doorgeven: '✦', terugtrekken: '↩', stap: '→', verzwelgen: '✕', voeden: '+',
  'spoor-weg': '✧', omsingeling: '⊘', stilstand: '‖', honger: '◉', klem: '—', einde: '■',
  verharden: '⬢', 'keten-gebroken': '⬡', verzilveren: '✷', 'route-open': '⟶', 'route-dicht': '⤬',
};

/** De drie nieuwe momenten uit meetopdracht 2 mogen niet wegvallen in de lijst. */
const OPVALLEND = new Set(['verharden', 'verzilveren', 'route-open', 'route-dicht', 'keten-gebroken']);

export function bouwZetlijst(
  vak: HTMLElement,
  events: GameEvent[],
  spring: (i: number) => void,
): (huidig: number) => void {
  vak.replaceChildren();
  if (!events.length) {
    vak.append(el('p', { class: 'leeg' }, ['Nog geen partij geladen.']));
    return () => {};
  }

  const lijst = el('div', { class: 'zetlijst' });
  const rijen: HTMLElement[] = [];
  for (const ev of events) {
    const klas =
      'zet ' +
      (ev.kind === 'beurt' ? 'beurtkop ' : '') +
      (OPVALLEND.has(ev.kind) ? `mijlpaal ${ev.kind} ` : '') +
      ev.actor;
    const rij = el('div', { class: klas });
    if (ev.kind === 'beurt') {
      rij.append(el('span', { class: 'merkje' }, ['']), el('span', {}, [ev.text]));
    } else {
      rij.append(
        el('span', { class: 'merkje' }, [MERKJE[ev.kind] ?? '·']),
        el('span', {}, [ev.text]),
      );
    }
    rij.onclick = () => spring(ev.i);
    lijst.append(rij);
    rijen.push(rij);
  }
  vak.append(lijst);

  let vorig = -1;
  return (huidig: number) => {
    if (vorig === huidig) return;
    if (rijen[vorig]) rijen[vorig].classList.remove('nu');
    const r = rijen[huidig];
    if (r) {
      r.classList.add('nu');
      const boven = r.offsetTop - vak.clientHeight / 2;
      vak.scrollTo({ top: Math.max(0, boven), behavior: vorig < 0 ? 'auto' : 'smooth' });
    }
    vorig = huidig;
  };
}

// -------------------------------------------------------------------- batch

const UITSLAGKLEUR: Record<string, string> = {
  laatste: 'var(--goud)',
  nexus: 'var(--aantrekking)',
  niets: '#3a3450',
  timeout: '#262036',
};
const UITSLAGNAAM: Record<string, string> = {
  laatste: 'de Laatste',
  nexus: 'de Nexus',
  niets: 'niets',
  timeout: 'klem',
};

export function toonBatch(
  vak: HTMLElement,
  m: BatchMetriek,
  openPotje: (seed: number) => void,
): void {
  const g = el('div', { class: 'groep' }, [
    el('h3', {}, ['Winstverdeling']),
    el('p', { class: 'bij' }, [`${m.n} potjes, seeds ${m.seeds[0]}–${m.seeds[m.seeds.length - 1]}.`]),
  ]);

  const staven = el('div', { class: 'staven' });
  for (const k of ['laatste', 'nexus', 'niets', 'timeout'] as const) {
    const p = m.verdeling[k];
    const balk = el('div', { class: 'balk' });
    const vul = el('i');
    vul.style.width = `${p}%`;
    vul.style.background = UITSLAGKLEUR[k];
    balk.append(vul);
    staven.append(
      el('div', { class: 'staaf' }, [
        el('span', {}, [UITSLAGNAAM[k]]),
        balk,
        el('span', { class: 'getal' }, [`${p.toFixed(0)}%`]),
      ]),
    );
  }
  g.append(staven);

  const kaartjes = el('div', { class: 'kaartjes' });
  const kaart = (label: string, waarde: string) =>
    el('div', { class: 'kaartje' }, [
      el('div', { class: 'k-label' }, [label]),
      el('div', { class: 'k-waarde' }, [waarde]),
    ]);
  kaartjes.append(
    kaart('mediaan duur', `${m.medianDuur} b`),
    kaart('spreiding', `${m.minDuur}–${m.maxDuur}`),
    kaart('vastlopers', `${m.vastlopersPct.toFixed(0)}%`),
    kaart('leiderswissels', m.gemWissels.toFixed(1)),
    kaart('comebacks', `${m.comebackPct.toFixed(0)}%`),
    kaart('sprints < 6 b', String(m.sprints)),
    kaart('gem. sporen', m.gemSporen.toFixed(1)),
    kaart('gem. verzwolgen', m.gemVerzwolgen.toFixed(1)),
  );
  g.append(kaartjes);

  // duurhistogram
  const eerste = m.duurHist.findIndex((x) => x > 0);
  const laatste = m.duurHist.length - 1 - [...m.duurHist].reverse().findIndex((x) => x > 0);
  const staafjes = m.duurHist.slice(Math.max(0, eerste), laatste + 1);
  const top = Math.max(1, ...staafjes);
  const hist = el('div', { class: 'histogram' });
  for (const v of staafjes) {
    const i = el('i');
    i.style.height = `${(100 * v) / top}%`;
    i.title = `${v} potjes`;
    hist.append(i);
  }
  g.append(
    el('h3', { style: 'margin-top:18px' }, ['Duur']),
    hist,
    el('div', { class: 'as' }, [
      el('span', {}, [`${eerste} b`]),
      el('span', {}, [`${laatste} b`]),
    ]),
  );

  const potjes = el('div', { class: 'potjes' });
  for (const p of m.potjes) {
    const b = el('button', {
      class: `potje ${p.uitslag}`,
      title:
        `seed ${p.seed} — ${UITSLAGNAAM[p.uitslag]} in ${p.turns} beurten\n` +
        `sporen ${p.pileL}, verzwolgen ${p.pileN}, wissels ${p.flips}` +
        (p.comeback ? '\ncomeback: de winnaar stond halverwege achter' : ''),
    });
    b.onclick = () => openPotje(p.seed);
    potjes.append(b);
  }
  g.append(
    el('h3', { style: 'margin-top:18px' }, ['Potjes']),
    el('p', { class: 'bij' }, ['Klik een potje om het af te spelen.']),
    potjes,
  );

  vak.replaceChildren(g);
}
