/**
 * Pariteit: speelt de TypeScript-engine dezelfde partij als de Python-referentie?
 *
 * De handoff (§6) vraagt om een port, niet om een herschrijving. Dat is alleen
 * hard te maken door beide implementaties dezelfde seeds te laten spelen en de
 * toestand na élke beurt te vergelijken — inclusief de toevalsgenerator.
 *
 * De traces komen uit tools/gen-golden.py; opnieuw genereren met `npm run golden`.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import golden from './golden/v5.json' with { type: 'json' };
import { Game } from '../src/engine/game';
import { ALL_KEYS } from '../src/engine/hex';
import { makeConfig, type GameConfig } from '../src/engine/config';

type Rij = { t: number; s: number; b: number; l: number; n: number; a: string; m: string; w: string; p: number; d: string };

/** vertaalt de Python-cfg-sleutels naar de TS-config */
function vertaal(cfg: Record<string, unknown>): GameConfig {
  const map: Record<string, string> = {
    need_l: 'needL', need_n: 'needN', nexus_moves: 'nexusMoves',
    start: 'start', total: 'total', feed: 'feed', harvest: 'harvest',
    engines: 'engines', acts: 'acts',
  };
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg)) {
    const t = map[k];
    if (!t) throw new Error(`onbekende cfg-sleutel in golden: ${k}`);
    patch[t] = v;
  }
  return makeConfig(patch);
}

function mask(pred: (k: string) => boolean): string {
  let v = 0n;
  ALL_KEYS.forEach((k, i) => {
    if (pred(k)) v |= 1n << BigInt(i);
  });
  return v.toString(16);
}

function digest(g: Game): Rij {
  return {
    t: g.turn, s: g.stock, b: g.box, l: g.pileL, n: g.pileN,
    a: mask((k) => g.alive.has(k)),
    m: mask((k) => g.marks.has(k)),
    w: ALL_KEYS.map((k) => String(g.wOf(k))).join(''),
    p: ALL_KEYS.indexOf(g.npos),
    d: g.done ?? '',
  };
}

/** Zelfde lus als v5_ref.play(), zodat de digest op dezelfde momenten valt. */
function speelMetDigests(seed: number, cfg: GameConfig, maxturns = 80) {
  const g = new Game(seed, cfg);
  const setup = {
    seat: ALL_KEYS.indexOf(g.seat),
    npos: ALL_KEYS.indexOf(g.npos),
    tiles: ALL_KEYS.map((k) => g.tileOf(k)),
    stock: g.stock,
    box: g.box,
  };
  const rows: Rij[] = [];
  while (g.turn < maxturns && !g.done) {
    g.turn += 1;
    g.laatsteTurn();
    if (g.done) { rows.push(digest(g)); break; }
    g.nexusTurn();
    if (g.done) { rows.push(digest(g)); break; }
    g.hist.push([g.pileL, g.pileN]);
    if (g.alive.size <= 1) g.done = 'niets';
    rows.push(digest(g));
  }
  return { setup, rows, uitslag: g.done ?? 'timeout', turns: g.turn };
}

/** Zelfde JSON-vorm als de Python-kant, zodat de hashes vergelijkbaar zijn. */
function hashPartij(r: ReturnType<typeof speelMetDigests>): string {
  const blob = JSON.stringify([
    { box: r.setup.box, npos: r.setup.npos, seat: r.setup.seat, stock: r.setup.stock, tiles: r.setup.tiles },
    r.rows.map((x) => ({ a: x.a, b: x.b, d: x.d, l: x.l, m: x.m, n: x.n, p: x.p, s: x.s, t: x.t, w: x.w })),
    r.uitslag,
    r.turns,
  ]);
  return createHash('sha256').update(blob).digest('hex').slice(0, 16);
}

describe('pariteit met tools/v5_ref.py', () => {
  for (const c of golden.configs) {
    describe(c.name, () => {
      const cfg = vertaal(c.cfg as Record<string, unknown>);

      it('speelt beurt voor beurt dezelfde partij', () => {
        for (const t of c.traces) {
          const got = speelMetDigests(t.seed, cfg);
          expect(got.setup, `seed ${t.seed}: opzet`).toEqual(t.setup);
          expect(got.rows.length, `seed ${t.seed}: aantal beurten`).toBe(t.rows.length);
          for (let i = 0; i < t.rows.length; i++) {
            expect(got.rows[i], `seed ${t.seed}, beurt ${i + 1}`).toEqual(t.rows[i]);
          }
          expect(got.uitslag, `seed ${t.seed}: uitslag`).toBe(t.uitslag);
        }
      });

      it('heeft dezelfde hash over 200 seeds', () => {
        const afwijkend: number[] = [];
        c.hashes.forEach((h, seed) => {
          if (hashPartij(speelMetDigests(seed, cfg)) !== h) afwijkend.push(seed);
        });
        expect(afwijkend, `afwijkende seeds voor ${c.name}`).toEqual([]);
      });
    });
  }
});
