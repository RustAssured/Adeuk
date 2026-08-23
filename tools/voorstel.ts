/** De stand uit het slot van docs/BEVINDINGEN.md, precies zoals voorgesteld. */
import { makeConfig } from '../src/engine/config';
import { speelBatch } from '../src/engine/batch';

const N = Number(process.argv[2] ?? 500);
const voorstel = makeConfig({
  acts: 3,
  nexusMoves: 2,
  needL: 11,
  needN: 28,
  spoorVreten: 'alleenTegel',
  afslag: { omsingeling: { on: true, minRandZijden: 3, bordrandTelt: false } },
  laatsteBot: 'beam',
  nexusBot: 'gretig',
});

for (const [label, cfg] of [
  ['voorstel', voorstel],
  ['zelfde stand, gemengde Nexus', makeConfig({ ...voorstel, nexusBot: 'gemengd' })],
  ['zelfde stand, defensieve Nexus', makeConfig({ ...voorstel, nexusBot: 'defensief' })],
  ['v5-stand ter vergelijking', makeConfig({ laatsteBot: 'beam' })],
] as const) {
  const m = speelBatch(cfg, N);
  console.log(
    `${label.padEnd(32)} L ${m.verdeling.laatste.toFixed(0).padStart(3)}%  ` +
      `N ${m.verdeling.nexus.toFixed(0).padStart(3)}%  ` +
      `niets ${m.verdeling.niets.toFixed(0).padStart(2)}%  ` +
      `klem ${m.vastlopersPct.toFixed(0).padStart(2)}% | ` +
      `mediaan ${String(m.medianDuur).padStart(4)}b (${m.minDuur}–${m.maxDuur}) | ` +
      `wissels ${m.gemWissels.toFixed(1)} | comeback ${m.comebackPct.toFixed(0).padStart(2)}% | ` +
      `sprints ${m.sprints} | sporen ${m.gemSporen.toFixed(1)}`,
  );
}
