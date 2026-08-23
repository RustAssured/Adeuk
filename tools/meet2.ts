/**
 * Meetbank voor opdracht 2 — de middenlaag.
 *
 *   npm run meet2 -- matrix [n]     K x M x drempel
 *   npm run meet2 -- personas [n]   de drie Nexus-persona's tegen beide bots
 *   npm run meet2 -- ablatie [n]    elk van de drie regels apart uit
 *   npm run meet2 -- stand [n]      één stand, alle cijfers
 *   npm run meet2 -- oog [n]        het ingesloten Oog: twee kandidaat-reparaties
 *   npm run meet2 -- beste [n] [K] [M] [drempel] [hof] [onbereikbaar] [sprong] [needN]
 *                                   één stand tegen alle drie de persona's
 */
import { meeting2, type DeepPartial, type GameConfig } from '../src/engine/config';
import { meet, meetPersonas, regel, type Meting2 } from '../src/engine/meting2';
import { beoordeel, type Advies, type Kleur } from '../src/engine/adviesregels';

/** De stand die uit opdracht 2 als beste kwam: K3 · M1,5 · 13/28 · sprong 1 · nexusWint. */
export const GEVALIDEERD_PATCH: DeepPartial<GameConfig> = {
  verharden: { K: 3 },
  verzilveren: { M: 1.5 },
  needL: 13,
  needN: 28,
  oversteek: { maxSprong: 1, onbereikbaar: 'nexusWint' },
  nexusBot: 'gemengd',
};
const GEVALIDEERD = meeting2(GEVALIDEERD_PATCH);

const KLEURCODE: Record<Kleur, string> = {
  groen: '\x1b[32m●\x1b[0m',
  oranje: '\x1b[33m●\x1b[0m',
  rood: '\x1b[31m●\x1b[0m',
  grijs: '\x1b[90m○\x1b[0m',
};

function toonAdvies(a: Advies): void {
  console.log(`\n  ${a.eind.toUpperCase()}  —  bepalend: ${a.bepalend}\n`);
  for (const o of a.oordelen) {
    console.log(`  ${KLEURCODE[o.kleur]} ${o.nr}. ${o.stelregel}`);
    console.log(`     ${o.reden}`);
    for (const s of o.signalen) {
      console.log(`       ${KLEURCODE[s.kleur]} ${s.naam}: ${s.waarde}`);
    }
  }
  console.log(`\n  regels aan: ${a.actieveRegels.join(', ')}`);
}

const cmd = process.argv[2] ?? 'stand';
const N = Number(process.argv[3] ?? 100);

const kop = (t: string) => console.log(`\n${t}\n${'─'.repeat(t.length)}`);
const p = (x: number) => x.toFixed(0).padStart(3) + '%';

function volledig(label: string, m: Meting2): void {
  console.log(`\n${label}`);
  console.log(
    `  uitslag        de Laatste ${p(m.verdeling.laatste)}   de Nexus ${p(m.verdeling.nexus)}   ` +
      `niets ${p(m.verdeling.niets)}   plafond ${p(m.verdeling.timeout)}`,
  );
  console.log(
    `  duur           mediaan ${m.medianDuur}b (${m.minDuur}-${m.maxDuur})   ` +
      `vastlopers ${p(m.vastlopers)}   sprints <8b ${m.sprints}`,
  );
  console.log(
    `  spanning       leiderswissels ${m.gemWissels.toFixed(1)}   comebacks ${p(m.comebackPct)}   ` +
      `routebreuken ${m.gemRouteBreuken.toFixed(1)}`,
  );
  console.log(
    `  ketens         verhard ${p(m.verhardPct)} van de pogingen   ` +
      `(${m.ketensVerhard.toFixed(1)} verhard, ${m.ketensGebroken.toFixed(1)} gebroken per partij)`,
  );
  console.log(
    `  punten         los ${p(m.losPct)} / keten ${p(100 - m.losPct)}   ` +
      `(${m.gemLos.toFixed(1)} los, ${m.gemKeten.toFixed(1)} uit ketens)`,
  );
  console.log(
    `  zijn nieuwe spel  hij wint via de route ${p(m.blokkadePct)}   ` +
      `(dode partijen met dezelfde stand ${p(m.klemVolPct)})`,
  );
}

if (cmd === 'stand') {
  kop(`De meetstand van opdracht 2 — ${N} seeds`);
  for (const nx of ['gretig', 'gemengd', 'defensief'] as const) {
    volledig(`tegen de ${nx}e Nexus`, meet(meeting2({ nexusBot: nx }), N));
  }
} else if (cmd === 'matrix') {
  kop(`Matrix K x M x drempel — ${N} seeds, tegen de gemengde Nexus`);
  console.log(
    `${'stand'.padEnd(26)} uitslag                    duur   ketens  punten  blokkade/dood  sprints`,
  );
  for (const K of [3, 4, 5]) {
    for (const M of [1.5, 2]) {
      for (const drempel of [9, 11, 13]) {
        const m = meet(
          meeting2({ verharden: { K }, verzilveren: { M }, needL: drempel, nexusBot: 'gemengd' }),
          N,
        );
        console.log(
          `K${K} M${M} drempel ${String(drempel).padStart(2)}`.padEnd(26) +
            ` L ${p(m.verdeling.laatste)} N ${p(m.verdeling.nexus)} klem ${p(m.vastlopers)}  ` +
            `${String(m.medianDuur).padStart(3)}b  ` +
            `verhard ${p(m.verhardPct)}  los ${p(m.losPct)}  ` +
            `${p(m.blokkadePct)}/${p(m.klemVolPct)}  sprint ${String(m.sprints).padStart(3)}`,
        );
      }
    }
  }
} else if (cmd === 'personas') {
  kop(`Persona's — ${N} seeds`);
  for (const l of ['beam', 'gretig', 'gemengd'] as const) {
    console.log('');
    for (const nx of ['gretig', 'gemengd', 'defensief'] as const) {
      console.log(regel(`${l} vs ${nx}`, meet(meeting2({ laatsteBot: l, nexusBot: nx }), N)));
    }
  }
} else if (cmd === 'ablatie') {
  kop(`Ablatie — welke van de drie regels draagt? ${N} seeds, gemengde Nexus`);
  const varianten: Array<[string, DeepPartial<GameConfig>]> = [
    ['alle drie aan', {}],
    ['zonder verharden', { verharden: { on: false }, verzilveren: { on: false } }],
    ['zonder verzilveren', { verzilveren: { on: false } }],
    ['zonder Oversteek', { oversteek: { on: false } }],
    ['alleen Oversteek', { verharden: { on: false }, verzilveren: { on: false } }],
    ['alleen verharden+verzilveren', { oversteek: { on: false } }],
    ['geen van drieën (meting 1)', {
      verharden: { on: false }, verzilveren: { on: false }, oversteek: { on: false },
    }],
  ];
  for (const [label, patch] of varianten) {
    console.log(regel(label, meet(meeting2({ ...patch, nexusBot: 'gemengd' }), N)));
  }
} else if (cmd === 'beste') {
  const K = Number(process.argv[4] ?? 4);
  const M = Number(process.argv[5] ?? 2);
  const drempel = Number(process.argv[6] ?? 11);
  const hof = process.argv[7] === 'hof';
  const einde = process.argv[8]; // 'niets' | 'nexusWint' | anders doorspelen
  const sprong = Number(process.argv[9] ?? 0);
  const needN = Number(process.argv[10] ?? 28);
  kop(
    `K${K} M${M} drempel ${drempel}${hof ? ' + hof' : ''}${einde === 'niets' || einde === 'nexusWint' ? ` + onbereikbaar: ${einde}` : ''}` +
      `${sprong ? ` + pad springt ${sprong}` : ''}${needN !== 28 ? ` + hij hoeft ${needN}` : ''}` +
      ` — ${N} seeds, tegen alle drie de persona's`,
  );
  for (const nx of ['gretig', 'gemengd', 'defensief'] as const) {
    const m = meet(
      meeting2({
        verharden: { K },
        verzilveren: { M },
        needL: drempel,
        needN,
        oversteek: {
          hof,
          onbereikbaar: einde === 'niets' || einde === 'nexusWint' ? einde : 'doorspelen',
          maxSprong: sprong,
        },
        nexusBot: nx,
      }),
      N,
    );
    console.log(
      `${nx.padEnd(12)} L ${p(m.verdeling.laatste)} N ${p(m.verdeling.nexus)} ` +
        `niets ${p(m.verdeling.niets)} plafond ${p(m.verdeling.timeout)} | ` +
        `med ${String(m.medianDuur).padStart(4)}b (${m.minDuur}-${m.maxDuur}) | ` +
        `verhard ${p(m.verhardPct)} | los ${p(m.losPct)} | ` +
        `blok ${p(m.blokkadePct)} | dood ${p(m.klemVolPct)} | ` +
        `wissels ${m.gemWissels.toFixed(1)} | comeback ${p(m.comebackPct)} | ` +
        `sprints ${String(m.sprints).padStart(3)}`,
    );
  }
} else if (cmd === 'advies') {
  // npm run meet2 -- advies [n] [personas]
  const metPersonas = process.argv[4] === 'personas';
  const cfg = GEVALIDEERD;
  kop(`Advies over de gevalideerde stand — ${N} seeds`);
  const m = meet(cfg, N);
  const a = beoordeel(m, cfg, metPersonas ? meetPersonas(cfg, N) : undefined);
  toonAdvies(a);
} else if (cmd === 'adviescheck') {
  // dezelfde lat langs een paar met opzet slechte standen, om te zien of hij bijt
  kop(`Werkt de lat? — ${N} seeds per stand`);
  const standen: Array<[string, DeepPartial<GameConfig>]> = [
    ['de gevalideerde stand', {}],
    ['K 6 — verharden bijna onhaalbaar', { verharden: { K: 6 } }],
    ['K 2 — verharden gratis', { verharden: { K: 2 } }],
    ['drempel 5 — sprintspel', { needL: 5 }],
    ['drempel 30 — uitzitten', { needL: 30 }],
    ['verzilveren uit', { verzilveren: { on: false } }],
    ['stilstand uit', { afslag: { stilstand: { on: false } } }],
  ];
  for (const [label, patch] of standen) {
    const cfg = meeting2({ ...GEVALIDEERD_PATCH, ...patch } as DeepPartial<GameConfig>);
    const a = beoordeel(meet(cfg, N), cfg);
    console.log(`${label.padEnd(34)} ${a.eind.padEnd(30)} ← ${a.bepalend}`);
  }
} else if (cmd === 'oog') {
  kop(`Het ingesloten Oog — ${N} seeds, tegen de gemengde Nexus`);
  const varianten: Array<[string, DeepPartial<GameConfig>]> = [
    ['zoals opgeschreven', {}],
    ['+ hof rond het Oog', { oversteek: { hof: true } }],
    ['+ onbereikbaar = niets', { oversteek: { onbereikbaar: 'niets' } }],
    ['+ onbereikbaar = hij wint', { oversteek: { onbereikbaar: 'nexusWint' } }],
    ['+ pad mag 1 gat over', { oversteek: { maxSprong: 1 } }],
    ['+ pad mag 2 gaten over', { oversteek: { maxSprong: 2 } }],
    ['pad tot náást het Oog', { oversteek: { oogMoetVanHaarZijn: false } }],
    ['Oog op afstand 3', { oversteek: { afstand: 3 } }],
  ];
  for (const [label, patch] of varianten) {
    const m = meet(meeting2({ ...patch, nexusBot: 'gemengd' }), N);
    console.log(
      `${label.padEnd(26)} L ${p(m.verdeling.laatste)} N ${p(m.verdeling.nexus)} ` +
        `niets ${p(m.verdeling.niets)} plafond ${p(m.verdeling.timeout)} | ` +
        `med ${String(m.medianDuur).padStart(4)}b | ` +
        `blokkade ${p(m.blokkadePct)} | dood ${p(m.klemVolPct)} | sprints ${String(m.sprints).padStart(3)} | ` +
        `comeback ${p(m.comebackPct)}`,
    );
  }
} else {
  console.error(`onbekend commando: ${cmd}`);
  process.exit(1);
}
