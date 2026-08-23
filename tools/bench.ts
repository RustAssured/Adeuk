/**
 * Meetbank op de opdrachtregel. Dezelfde engine als het lab.
 *
  *   npm run bench -- solo [n]
  *   npm run bench -- afslag [n]
  *   npm run bench -- tempo [n]
  *   npm run bench -- personas [n]
 *   npm run bench -- balans [n]
 *   npm run bench -- spoor [n]
 */
import { makeConfig, type DeepPartial, type GameConfig } from '../src/engine/config';
import { soloBatterij, speelBatch, type BatchMetriek } from '../src/engine/batch';

const N = Number(process.argv[3] ?? 500);
const cmd = process.argv[2] ?? 'afslag';
/** Welke bot speelt de Laatste in de sweeps — standaard de zoekbot, want met
 *  de gretige bot meet je vooral zijn eigen zwaktes. */
const BOT = (process.argv[4] ?? 'beam') as GameConfig['laatsteBot'];

const pct = (x: number) => x.toFixed(0).padStart(3) + '%';

function regel(label: string, m: BatchMetriek): string {
  return (
    `${label.padEnd(30)} ` +
    `L ${pct(m.verdeling.laatste)}  N ${pct(m.verdeling.nexus)}  ` +
    `niets ${pct(m.verdeling.niets)}  klem ${pct(m.vastlopersPct)} | ` +
    `med ${String(m.medianDuur).padStart(3)}b (${m.minDuur}-${m.maxDuur}) | ` +
    `wissels ${m.gemWissels.toFixed(1)} | comeback ${pct(m.comebackPct)} | ` +
    `sporen ${m.gemSporen.toFixed(1)}`
  );
}

function kop(t: string) {
  console.log(`\n${t}\n${'─'.repeat(t.length)}`);
}

const AFSLAG: Array<[string, DeepPartial<GameConfig>]> = [
  ['v5 — geen afslag', {}],
  ['1 omsingeling (3, zonder bordrand)', { afslag: { omsingeling: { on: true, minRandZijden: 3, bordrandTelt: false } } }],
  ['1 omsingeling (3, mét bordrand)', { afslag: { omsingeling: { on: true, minRandZijden: 3, bordrandTelt: true } } }],
  ['1 omsingeling (2, zonder bordrand)', { afslag: { omsingeling: { on: true, minRandZijden: 2, bordrandTelt: false } } }],
  ['2 stilstand', { afslag: { stilstand: { on: true } } }],
  ['3 honger voorbij', { afslag: { hongerVoorbij: { on: true } } }],
  ['1+2', { afslag: { omsingeling: { on: true }, stilstand: { on: true } } }],
  ['1+3', { afslag: { omsingeling: { on: true }, hongerVoorbij: { on: true } } }],
  ['2+3', { afslag: { stilstand: { on: true }, hongerVoorbij: { on: true } } }],
  ['1+2+3', { afslag: { omsingeling: { on: true }, stilstand: { on: true }, hongerVoorbij: { on: true } } }],
];

const TEMPO: Array<[string, DeepPartial<GameConfig>]> = [
  // De rekensom achter deze lijst:
  //   zij heeft 3 handelingen nodig per spoor (reiken, vatten, doorgeven),
  //   dus haar ondergrens is 3 * needL / acts beurten;
  //   hij verzwelgt nexusMoves tegels per beurt, dus zijn ondergrens is
  //   needN / nexusMoves beurten. Bij 12/28, 2 handelingen en 2 stappen is dat
  //   18 tegen 14: hij is structureel vier beurten sneller, nog vóór hij ook
  //   maar één spoor van haar heeft opgegeten.
  ['basis 12/28, 2 hand., 2 stap', {}],
  ['3 handelingen (18b -> 12b)', { acts: 3 }],
  ['1 stap voor hem (14b -> 28b)', { nexusMoves: 1 }],
  ['3 handelingen + drempel 32', { acts: 3, needN: 32 }],
  ['3 handelingen + 14 sporen', { acts: 3, needL: 14 }],
  ['3 hand., 14 sporen, drempel 30', { acts: 3, needL: 14, needN: 30 }],
  ['drempels 10/26', { needL: 10, needN: 26 }],
  ['drempels 14/30', { needL: 14, needN: 30 }],
  ['3 handelingen, geen oogst', { acts: 3, harvest: false }],
  ['3 handelingen, geen voeding', { acts: 3, feed: false }],
];

if (cmd === 'solo') {
  kop(`Solo-batterij — de Laatste zonder Nexus, ${N} seeds (eis §4: >= 95% in <= 20 beurten)`);
  for (const bot of ['gretig', 'defensief', 'gemengd', 'beam'] as const) {
    const m = soloBatterij(makeConfig({ laatsteBot: bot }), N, 20);
    console.log(
      `${bot.padEnd(12)} haalt 12 sporen: ${m.gehaaldPct.toFixed(1).padStart(5)}%  ` +
        `binnen 20 beurten: ${m.binnenPct.toFixed(1).padStart(5)}%  ` +
        `mediaan ${String(m.medianDuur).padStart(3)}b  ` +
        `gem. sporen ${m.gemSporen.toFixed(1)}  ` +
        `lek ${m.gemLek.toFixed(1)} stenen  klem ${m.vastlopers}`,
    );
  }
} else if (cmd === 'afslag') {
  kop(`§5A — de drie afsla-opties, ${N} seeds, de Laatste = ${BOT}`);
  for (const [label, patch] of AFSLAG) {
    console.log(regel(label, speelBatch(makeConfig({ ...patch, laatsteBot: BOT }), N)));
  }
} else if (cmd === 'tempo') {
  kop(`§5B — tempo-knoppen, ${N} seeds, de Laatste = ${BOT}, mét 1+2+3 als afslag`);
  const basis: DeepPartial<GameConfig> = {
    afslag: { omsingeling: { on: true }, stilstand: { on: true }, hongerVoorbij: { on: true } },
  };
  for (const [label, patch] of TEMPO) {
    console.log(regel(label, speelBatch(makeConfig({ ...basis, ...patch, laatsteBot: BOT }), N)));
  }
} else if (cmd === 'personas') {
  kop(`Persona's tegen elkaar, ${N} seeds, mét 1+2+3 als afslag`);
  const basis: DeepPartial<GameConfig> = {
    afslag: { omsingeling: { on: true }, stilstand: { on: true }, hongerVoorbij: { on: true } },
  };
  for (const l of ['gretig', 'defensief', 'gemengd', 'beam'] as const) {
    for (const nx of ['gretig', 'defensief', 'gemengd'] as const) {
      console.log(regel(`${l} vs ${nx}`, speelBatch(makeConfig({ ...basis, laatsteBot: l, nexusBot: nx }), N)));
    }
  }
} else if (cmd === 'balans') {
  // Zoekt de stand waar beide kanten een echte kans hebben. De rekensom:
  //   haar ondergrens = 3 * needL / acts beurten
  //   zijn ondergrens = needN / nexusMoves beurten
  // en §1 eist needL + needN > 36, anders kunnen ze het allebei halen.
  kop(`Balans — ${N} seeds, de Laatste = ${BOT}, mét 1+2+3 als afslag`);
  const basis: DeepPartial<GameConfig> = {
    afslag: { omsingeling: { on: true }, stilstand: { on: true }, hongerVoorbij: { on: true } },
  };
  const standen: Array<[number, number, number, number]> = [
    // acts, stappen, needL, needN
    [2, 2, 12, 28],
    [3, 2, 12, 28],
    [3, 2, 14, 30],
    [2, 1, 12, 28],
    [2, 1, 14, 26],
    [2, 1, 12, 26],
    [3, 1, 12, 28],
    [3, 1, 14, 30],
    [3, 1, 16, 28],
    [3, 1, 14, 24],
    [4, 1, 16, 26],
    [3, 1, 12, 25],
  ];
  console.log(
    `${'stand'.padEnd(30)} ${'zij'.padStart(3)}b ${'hij'.padStart(3)}b   uitkomst`,
  );
  for (const [acts, stappen, needL, needN] of standen) {
    const cfg = makeConfig({ ...basis, acts, nexusMoves: stappen, needL, needN, laatsteBot: BOT });
    const m = speelBatch(cfg, N);
    const haar = Math.ceil((3 * needL) / acts);
    const zijn = Math.ceil(needN / stappen);
    const som = needL + needN > 36 ? ' ' : '!';
    console.log(
      `${som}${acts} hand. ${stappen} stap ${needL}/${needN}`.padEnd(30) +
        ` ${String(haar).padStart(3)}  ${String(zijn).padStart(3)}   ` +
        regel('', m).trim(),
    );
  }
  console.log('\n  ! = sporen + tegels komen niet boven de 36 uit: ze kunnen het allebei halen');
} else if (cmd === 'spoor') {
  kop(`Spoorvreten — ${N} seeds, de Laatste = ${BOT}, mét 1+2+3 als afslag`);
  const basis: DeepPartial<GameConfig> = {
    afslag: { omsingeling: { on: true }, stilstand: { on: true }, hongerVoorbij: { on: true } },
  };
  const modi = ['alles', 'eenPerBeurt', 'alleenTegel', 'nooit'] as const;
  const standen: Array<[string, DeepPartial<GameConfig>]> = [
    ['v5-tempo 2/2, 12/28', { acts: 2, nexusMoves: 2 }],
    ['3 hand. 2 stap, 12/28', { acts: 3, nexusMoves: 2 }],
    ['3 hand. 1 stap, 12/28', { acts: 3, nexusMoves: 1 }],
  ];
  for (const [label, patch] of standen) {
    console.log(`\n  ${label}`);
    for (const modus of modi) {
      const cfg = makeConfig({ ...basis, ...patch, spoorVreten: modus, laatsteBot: BOT });
      console.log('   ' + regel(modus, speelBatch(cfg, N)));
    }
  }
} else {
  console.error(`onbekend commando: ${cmd}`);
  process.exit(1);
}
