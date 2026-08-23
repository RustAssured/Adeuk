/**
 * De metingen waar docs/BEVINDINGEN.md op rust. Draaien met:
 *   npm run experimenten            (alle drie)
 *   npm run experimenten -- C       (alleen C)
 */
import { Game } from '../src/engine/game';
import { makeConfig } from '../src/engine/config';
import { soloBatterij, speelBatch, mediaan } from '../src/engine/batch';

const N = 200;
const KIES = (process.argv[2] ?? '').toUpperCase();
const doe = (letter: string) => !KIES || KIES === letter;

if (doe('A')) {
console.log('A. Doet de gesloten kringloop iets voor een competente Laatste?');
console.log('   (solo, 12 sporen halen, oogst en doos uitgekleed)\n');
for (const [label, patch] of [
  ['v5: 8 voorraad, 30 totaal, oogst aan', {}],
  ['geen oogst', { harvest: false }],
  ['geen oogst, 8 voorraad, 8 totaal', { harvest: false, start: 8, total: 8 }],
  ['geen oogst, 3 voorraad, 3 totaal', { harvest: false, start: 3, total: 3 }],
  ['geen oogst, 2 voorraad, 2 totaal', { harvest: false, start: 2, total: 2 }],
  ['geen oogst, 1 voorraad, 1 totaal', { harvest: false, start: 1, total: 1 }],
] as const) {
  const m = soloBatterij(makeConfig({ laatsteBot: 'beam', ...patch }), N, 20);
  console.log(
    `   ${label.padEnd(38)} haalt ${m.gehaaldPct.toFixed(0).padStart(3)}%   ` +
      `binnen 20b ${m.binnenPct.toFixed(0).padStart(3)}%   mediaan ${m.medianDuur}b`,
  );
}

}

if (doe('B')) {
console.log('\nB. Hoeveel sporen vreet de Nexus weg, en hoeveel bouwt zij?\n');
for (const [label, patch] of [
  ['basis 12/28, 2 handelingen', {}],
  ['3 handelingen', { acts: 3 }],
  ['3 handelingen, 1 stap voor hem', { acts: 3, nexusMoves: 1 }],
] as const) {
  let gebouwd = 0;
  let gegeten = 0;
  const duren: number[] = [];
  for (let s = 0; s < N; s++) {
    const g = new Game(s, makeConfig({ laatsteBot: 'beam', ...patch }));
    g.trace = true;
    g.play();
    gebouwd += g.events.filter((e) => e.kind === 'doorgeven').length;
    gegeten += g.events.filter((e) => e.kind === 'spoor-weg').length;
    duren.push(g.turn);
  }
  console.log(
    `   ${label.padEnd(34)} zij bouwt ${(gebouwd / N).toFixed(1).padStart(4)} sporen, ` +
      `hij vreet er ${(gegeten / N).toFixed(1).padStart(4)} weg  ` +
      `(${((100 * gegeten) / Math.max(gebouwd, 1)).toFixed(0)}%)  in ${mediaan(duren)}b`,
  );
}
}

if (doe('C')) {
  console.log('\nC. Fijnstelling rond de enige stand die een echte partij oplevert.\n');
  console.log(
    '   ' + 'stand'.padEnd(26) + 'zij   hij    verdeling         mediaan  comeback  sporen',
  );
  const standen: Array<[number, number, number, number]> = [
    [3, 2, 12, 28],
    [3, 2, 12, 26],
    [3, 2, 12, 30],
    [3, 2, 13, 28],
    [3, 2, 14, 28],
    [3, 2, 11, 28],
    [3, 2, 12, 27],
    [2, 2, 8, 29],
  ];
  for (const [acts, stappen, needL, needN] of standen) {
    const m = speelBatch(
      makeConfig({
        acts,
        nexusMoves: stappen,
        needL,
        needN,
        spoorVreten: 'alleenTegel',
        laatsteBot: 'beam',
        afslag: { omsingeling: { on: true }, stilstand: { on: true }, hongerVoorbij: { on: true } },
      }),
      N,
    );
    const som = needL + needN > 36 ? ' ' : '!';
    console.log(
      `   ${som}${acts} hand. ${stappen} stap ${needL}/${needN}`.padEnd(29) +
        `${String(Math.ceil((3 * needL) / acts)).padStart(3)}b ${String(Math.ceil(needN / stappen)).padStart(3)}b   ` +
        `L ${m.verdeling.laatste.toFixed(0).padStart(3)}%  N ${m.verdeling.nexus.toFixed(0).padStart(3)}%  ` +
        `klem ${m.vastlopersPct.toFixed(0).padStart(2)}%   ` +
        `${String(m.medianDuur).padStart(4)}b  ` +
        `${m.comebackPct.toFixed(0).padStart(6)}%  ` +
        `${m.gemSporen.toFixed(1).padStart(6)}`,
    );
  }
}
