/**
 * Regel-invarianten. Deze tests bewaken de dingen die volgens §3 van de handoff
 * gemeten en besloten zijn, zodat een latere regelwijziging ze niet stilletjes
 * omver duwt. Ze leggen ook een paar eigenaardigheden van v5 vast — expres,
 * met bronvermelding, zodat duidelijk is dat het gedrag bekend is.
 */
import { describe, expect, it } from 'vitest';
import { Game, speel, IDX } from '../src/engine/game';
import { ALL, ALL_KEYS, MID_KEYS, dist, key, unkey } from '../src/engine/hex';
import { makeConfig } from '../src/engine/config';

const SEEDS = Array.from({ length: 60 }, (_, i) => i);

describe('bord', () => {
  it('telt 37 hexen: centrum + ring 1 + ring 2 + ring 3', () => {
    expect(ALL.length).toBe(37);
    expect(new Set(ALL_KEYS).size).toBe(37);
  });

  it('legt de middelste ring van 12 open, de rest gedekt', () => {
    expect(MID_KEYS.length).toBe(12);
    const g = new Game(1);
    // de Zetel ligt ook open, dus 13
    expect(g.open.size).toBe(13);
    expect(MID_KEYS.every((k) => g.open.has(k))).toBe(true);
  });

  // BEVINDING 1 — zie docs/BEVINDINGEN.md. Het bord heeft 37 hexen, het spel
  // 36 tegels; `dict(zip(ALL, deck))` laat de laatste hex in bordvolgorde dus
  // zonder tegel. Die hex oogst niets en telt nergens voor mee. Vastgelegd
  // zoals het is, niet stilzwijgend gerepareerd.
  it('laat de laatste hex zonder tegel — 37 hexen, 36 tegels (v5-gedrag)', () => {
    for (const s of SEEDS) {
      const g = new Game(s);
      const zonder = ALL_KEYS.filter((k) => g.tileOf(k) === null);
      if (g.seat === ALL_KEYS[36]) {
        // valt de Zetel juist op die hex, dan is het gat gedicht
        expect(zonder.length).toBe(0);
      } else {
        expect(zonder).toEqual([ALL_KEYS[36]]);
      }
    }
  });

  // BEVINDING 2 — §2 zegt "de Nexus start op afstand >= 5 van de Zetel", maar
  // de Zetel wordt uit de gedékte hexen getrokken: ring 0, 1 en 3. Valt hij in
  // ring 0 of 1 (ruim 30% van de partijen), dan bestaat er geen hex op afstand
  // 5 en valt v5 terug op "willekeurig". Hij kan dan pal naast haar beginnen.
  it('zet de Nexus op afstand >= 5 zodra zo\'n hex bestaat, en anders willekeurig', () => {
    let terugval = 0;
    for (const s of SEEDS) {
      const g = new Game(s);
      const seatAx = unkey(g.seat);
      const ver = ALL.filter((c) => key(c) !== g.seat && dist(c, seatAx) >= 5);
      if (ver.length) {
        expect(dist(unkey(g.npos), seatAx), `seed ${s}`).toBeGreaterThanOrEqual(5);
      } else {
        terugval++;
        expect(g.npos).not.toBe(g.seat);
      }
    }
    // de terugval is geen theoretisch geval: hij treedt regelmatig op
    expect(terugval).toBeGreaterThan(0);
  });
});

describe('gesloten kringloop (§2, §3.3)', () => {
  it('houdt voorraad + bord + doos gelijk aan het totaal, na elke handeling', () => {
    for (const s of SEEDS) {
      const g = new Game(s);
      g.trace = true;
      g.play();
      expect(g.substantieTotaal(), `seed ${s}: eindstand`).toBe(g.cfg.total);
      for (const ev of g.events) {
        const opBord = ev.after.w.reduce((a, b) => a + b, 0);
        expect(ev.after.stock + ev.after.box + opBord, `seed ${s}, event ${ev.i} (${ev.kind})`)
          .toBe(g.cfg.total);
      }
    }
  });

  it('laat de voorraad nooit negatief worden', () => {
    for (const s of SEEDS) {
      const g = new Game(s);
      g.trace = true;
      g.play();
      for (const ev of g.events) {
        expect(ev.after.stock).toBeGreaterThanOrEqual(0);
        expect(ev.after.box).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('invarianten van de tegels (§3.2)', () => {
  it('laat alleen de Nexus tegels laten verdwijnen', () => {
    for (const s of SEEDS) {
      const g = new Game(s);
      g.trace = true;
      g.play();
      let vorig = g.events[0]?.after.alive;
      for (const ev of g.events.slice(1)) {
        const weg = ev.after.alive.map((a, i) => (vorig![i] === 1 && a === 0 ? i : -1)).filter((i) => i >= 0);
        if (weg.length) {
          expect(ev.actor, `seed ${s}, event ${ev.i} (${ev.kind}) liet een tegel verdwijnen`).toBe('nexus');
        }
        vorig = ev.after.alive;
      }
    }
  });

  it('laat de Nexus nooit op een vat-tegel staan', () => {
    for (const s of SEEDS) {
      const g = new Game(s);
      g.trace = true;
      g.play();
      for (const ev of g.events) {
        expect(ev.after.w[ev.after.npos], `seed ${s}, event ${ev.i}`).toBeLessThan(2);
      }
    }
  });

  // BEVINDING 3 — §2 somt op waar hij wel en niet op mag; de Zetel staat in
  // geen van beide lijstjes. In v5 is de Zetel dus een geldig vakje voor hem,
  // en omdat `consume` de Zetel weigert eet hij bij vertrek niets: één beurt
  // gratis. Dat gebeurt in bijna de helft van de partijen.
  it('laat de Nexus wél op de Zetel staan, waar hij niets verzwelgt (v5-gedrag)', () => {
    let opZetel = 0;
    for (const s of SEEDS) {
      const g = new Game(s);
      g.trace = true;
      g.play();
      const seat = IDX.get(g.seat)!;
      if (g.events.some((ev) => ev.after.npos === seat)) opZetel++;
    }
    expect(opZetel).toBeGreaterThan(0);
  });

  it('verzwelgt de Zetel nooit', () => {
    for (const s of SEEDS) {
      const g = new Game(s);
      g.play();
      expect(g.alive.has(g.seat)).toBe(true);
    }
  });
});

describe('de draad (§2)', () => {
  it('laat een spoor de draad dragen, ook zonder stenen', () => {
    const g = new Game(3);
    const buur = g.nbKeys(g.seat).find((k) => g.alive.has(k))!;
    const verder = g.nbKeys(buur).find((k) => g.alive.has(k) && k !== g.seat)!;
    // spoor op de tussentegel, stenen op de verre tegel
    g.marks.add(buur);
    g.setW(verder, 2);
    expect(g.conn()).toContain(verder);
    // haal het spoor weg en de verbinding valt uit elkaar
    g.marks.delete(buur);
    expect(g.conn()).not.toContain(verder);
  });

  it('oogst alleen vat-tegels aan de draad die nog geen spoor zijn', () => {
    const g = new Game(7, makeConfig({ start: 30, total: 30 }));
    const buur = g.nbKeys(g.seat).find((k) => g.alive.has(k) && g.yieldOf(k) > 0);
    if (!buur) return;
    g.setW(buur, 2);
    g.box = 10;
    g.stock = 0;
    g.harvest();
    expect(g.stock).toBe(g.yieldOf(buur));
    // als spoor levert dezelfde tegel niets meer
    g.marks.add(buur);
    g.setW(buur, 2);
    g.stock = 0;
    g.harvest();
    expect(g.stock).toBe(0);
  });

  it('rekent een rand-sprong over n verdwenen tegels als n + 2', () => {
    const g = new Game(11);
    // maak een gat van 1 tegel recht naast de Zetel
    const ax = unkey(g.seat);
    const gat = key([ax[0] + 1, ax[1]]);
    const achter = key([ax[0] + 2, ax[1]]);
    if (!g.alive.has(gat) || !g.alive.has(achter)) return;
    g.alive.delete(gat);
    const p = g.path(achter);
    expect(p).not.toBeNull();
    expect(g.cost.get(achter)).toBe(3); // n = 1 -> 3
  });
});

describe('einde', () => {
  it('roept de Laatste uit bij de drempel en de Nexus bij de zijne', () => {
    for (const s of Array.from({ length: 200 }, (_, i) => i)) {
      const r = speel(s, makeConfig({ needL: 10, needN: 26 }));
      if (r.uitslag === 'laatste') expect(r.pileL).toBeGreaterThanOrEqual(10);
      if (r.uitslag === 'nexus') expect(r.pileN).toBeGreaterThanOrEqual(26);
    }
  });

  it('verandert niet als het logboek aan staat', () => {
    for (const s of SEEDS) {
      const zonder = speel(s);
      const met = speel(s, {}, { trace: true });
      expect({ ...met, events: undefined }).toEqual({ ...zonder, events: undefined });
    }
  });
});
