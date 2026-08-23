/**
 * De solo-batterij uit §4 en de afsla-opties uit §5A als test.
 *
 * §4 stelt de eis: "de Laatste zonder Nexus moet >= 95% halen in <= 20 beurten,
 * anders is de bot (of de regel) stuk." Die eis staat hier, zodat een latere
 * wijziging aan bot of regels meteen laat zien welke van de twee het was.
 */
import { describe, expect, it } from 'vitest';
import { Game, speel } from '../src/engine/game';
import { makeConfig } from '../src/engine/config';
import { soloBatterij, speelBatch, KLEM_DREMPEL } from '../src/engine/batch';

describe('solo-batterij (§4)', () => {
  it('de zoekbot haalt 12 sporen in <= 20 beurten voor >= 95% van de seeds', () => {
    const m = soloBatterij(makeConfig({ laatsteBot: 'beam' }), 120, 20);
    expect(m.binnenPct).toBeGreaterThanOrEqual(95);
  });

  it('de zoekbot laat geen stenen achter op tegels die niets meer opleveren', () => {
    const m = soloBatterij(makeConfig({ laatsteBot: 'beam' }), 60, 20);
    expect(m.gemLek).toBeLessThan(0.5);
  });

  // Vastgelegd omdat §4 hier expliciet naar vraagt: de gretige bot uit v5 haalt
  // solo ongeveer de helft. Zakt dit getal, dan is er iets aan de regels
  // veranderd; stijgt het naar >90%, dan is per ongeluk de bot aangepast.
  it('de gretige v5-bot blijft rond de helft steken', () => {
    const m = soloBatterij(makeConfig({ laatsteBot: 'gretig' }), 120, 20);
    expect(m.gehaaldPct).toBeGreaterThan(35);
    expect(m.gehaaldPct).toBeLessThan(70);
    expect(m.binnenPct).toBeLessThan(5);
    // en hij lekt substantie naar tegels die nooit meer iets opleveren
    expect(m.gemLek).toBeGreaterThan(10);
  });
});

describe('afsla-opties (§5A)', () => {
  const seeds = 120;

  it('v5 zonder afslag loopt massaal vast — de aanleiding voor §5A', () => {
    const m = speelBatch(makeConfig({ laatsteBot: 'gretig', nexusBot: 'gretig' }), seeds);
    expect(m.vastlopersPct).toBeGreaterThan(50);
  });

  it('omsingeling haalt de patstelling er vrijwel helemaal uit', () => {
    const m = speelBatch(
      makeConfig({
        laatsteBot: 'gretig',
        afslag: { omsingeling: { on: true, minRandZijden: 3, bordrandTelt: false } },
      }),
      seeds,
    );
    expect(m.vastlopersPct).toBeLessThan(20);
  });

  it('omsingeling slaat alleen stenen af van vat-tegels met genoeg rand-zijden', () => {
    const g = new Game(5, makeConfig({
      afslag: { omsingeling: { on: true, minRandZijden: 3, bordrandTelt: false } },
    }));
    const doel = g.nbKeys(g.seat).find((k) => g.alive.has(k))!;
    g.setW(doel, 2);
    const buren = g.nbKeys(doel).filter((k) => g.alive.has(k) && k !== g.seat);
    // te weinig rand: niets gebeurt
    g.omsingelingAfslag();
    expect(g.wOf(doel)).toBe(2);
    // drie randen: één steen naar de doos
    for (const b of buren.slice(0, 3)) g.alive.delete(b);
    const doos = g.box;
    g.omsingelingAfslag();
    expect(g.wOf(doel)).toBe(1);
    expect(g.box).toBe(doos + 1);
  });

  it('honger voorbij vuurt alleen als álles om hem heen vat is', () => {
    const g = new Game(9, makeConfig({ afslag: { hongerVoorbij: { on: true } } }));
    expect(g.hongerVoorbijMogelijk()).toBe(false);
    for (const b of g.nbKeys(g.npos)) if (g.alive.has(b)) g.setW(b, 2);
    expect(g.hongerVoorbijMogelijk()).toBe(true);
  });

  it('stilstand kost hem zijn hap: de tegelteller staat stil', () => {
    const cfg = makeConfig({ afslag: { stilstand: { on: true } } });
    const g = new Game(4, cfg);
    const buur = g.nbKeys(g.npos).find((k) => g.alive.has(k))!;
    for (const b of g.nbKeys(g.npos)) if (g.alive.has(b) && b !== buur) g.setW(b, 2);
    g.setW(buur, 2);
    const voor = { n: g.pileN, alive: g.alive.size };
    g.nexusTurn();
    expect(g.pileN).toBe(voor.n);
    expect(g.alive.size).toBe(voor.alive);
  });
});

describe('solo-modus', () => {
  it('laat het bord ongemoeid: zonder Nexus verdwijnt er geen tegel', () => {
    for (let s = 0; s < 20; s++) {
      const r = speel(s, makeConfig({ solo: true, laatsteBot: 'beam', maxTurns: 25 }));
      expect(r.alive).toBe(37);
      expect(r.pileN).toBe(0);
    }
  });
});

describe('klem-detectie', () => {
  it('merkt op wanneer het bord stil komt te staan', () => {
    const r = speel(0, makeConfig({ laatsteBot: 'gretig' }));
    expect(r.turns - r.laatsteVerandering).toBeGreaterThanOrEqual(KLEM_DREMPEL);
  });
});

describe('spoorvreten', () => {
  const opzet = (modus: 'alles' | 'eenPerBeurt' | 'alleenTegel' | 'nooit') => {
    const g = new Game(2, makeConfig({ spoorVreten: modus }));
    // twee sporen pal naast de Nexus, zodat hij ze in één beurt kan pakken
    const buren = g.nbKeys(g.npos).filter((k) => g.alive.has(k) && k !== g.seat);
    for (const b of buren.slice(0, 2)) g.marks.add(b);
    g.pileL = buren.slice(0, 2).length;
    return { g, sporen: buren.slice(0, 2) };
  };

  it('alles: elk verzwolgen spoor kost haar een punt (v5)', () => {
    const { g, sporen } = opzet('alles');
    const voor = g.pileL;
    g.spoorAfDezeBeurt = 0;
    for (const s of sporen) g.consume(s);
    expect(g.pileL).toBe(voor - sporen.length);
  });

  it('eenPerBeurt: hoogstens één spoor telt af', () => {
    const { g, sporen } = opzet('eenPerBeurt');
    const voor = g.pileL;
    g.spoorAfDezeBeurt = 0;
    for (const s of sporen) g.consume(s);
    expect(g.pileL).toBe(voor - 1);
    // de tegels zijn wel weg
    expect(sporen.every((s) => !g.alive.has(s))).toBe(true);
  });

  it('alleenTegel: de tegel gaat, haar teller blijft staan', () => {
    const { g, sporen } = opzet('alleenTegel');
    const voor = g.pileL;
    for (const s of sporen) g.consume(s);
    expect(g.pileL).toBe(voor);
    expect(sporen.every((s) => !g.alive.has(s))).toBe(true);
  });

  it('nooit: een spoor is onschendbaar, hij mag er niet eens op', () => {
    const { g, sporen } = opzet('nooit');
    const voor = { l: g.pileL, alive: g.alive.size };
    for (const s of sporen) {
      expect(g.nexusMag(s)).toBe(false);
      g.consume(s);
    }
    expect(g.pileL).toBe(voor.l);
    expect(g.alive.size).toBe(voor.alive);
  });
});
