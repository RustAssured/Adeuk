/**
 * De speelbare modus. Twee dingen moeten kloppen.
 *
 * Eén: een gespeelde partij is dezelfde partij als een gesimuleerde. Laat je
 * beide kanten door de bot spelen, dan moet de sessie zet voor zet hetzelfde
 * verloop opleveren als `Game.play()`. Anders speelt een mens een ander spel
 * dan het spel dat we gemeten hebben.
 *
 * Twee: de zettenlijst is de regel, niet een tweede lezing ervan. Wat er in
 * staat moet uitvoerbaar zijn, en wat er niet in staat moet uit te leggen zijn.
 */
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/game';
import { Sessie } from '../src/engine/sessie';
import { legaleZetten, waaromNiet, zetTekst, type Zet } from '../src/engine/zetten';
import { gevalideerd, makeConfig, meeting2 } from '../src/engine/config';
import { ALL_KEYS, type CellKey } from '../src/engine/hex';

/** Speelt een sessie uit waarin beide kanten door de bot bestuurd worden. */
function botSessie(seed: number, cfg = gevalideerd()): Sessie {
  const s = new Sessie({ cfg, seed, bestuur: { laatste: 'bot', nexus: 'bot' } });
  let wacht = 0;
  while (!s.uitslag && wacht++ < 2000) s.speelBot();
  return s;
}

describe('de sessie speelt hetzelfde spel als de simulatie', () => {
  for (const seed of [0, 1, 7, 42, 108]) {
    it(`seed ${seed}: zelfde uitslag, beurten en tellers`, () => {
      const g = new Game(seed, gevalideerd());
      const uit = g.play();
      const s = botSessie(seed);
      expect(s.uitslag).toBe(uit);
      expect(s.g.turn).toBe(g.turn);
      expect(s.g.pileL).toBe(g.pileL);
      expect(s.g.pileN).toBe(g.pileN);
      expect(s.g.alive.size).toBe(g.alive.size);
      expect(s.g.ketensVerhard).toBe(g.ketensVerhard);
    });
  }

  it('levert hetzelfde logboek op als een getraceerde partij', () => {
    const g = new Game(3, gevalideerd());
    g.trace = true;
    g.play();
    const s = botSessie(3);
    expect(s.events.map((e) => e.kind)).toEqual(g.events.map((e) => e.kind));
    expect(s.events.map((e) => e.text)).toEqual(g.events.map((e) => e.text));
  });

  it('doet dat ook in de v5-stand, zonder middenlaag', () => {
    const cfg = makeConfig();
    const g = new Game(11, cfg);
    const uit = g.play();
    const s = botSessie(11, cfg);
    expect(s.uitslag).toBe(uit);
    expect(s.g.turn).toBe(g.turn);
  });
});

describe('de zettenlijst', () => {
  it('geeft de Laatste bij de opzet alleen reikzetten', () => {
    const g = new Game(0, gevalideerd());
    const soorten = new Set(legaleZetten(g, 'laatste').map((z) => z.soort));
    expect(soorten).toEqual(new Set(['reiken']));
  });

  it('biedt geen zet aan die de voorraad niet kan betalen', () => {
    const g = new Game(0, gevalideerd());
    g.stock = 1;
    for (const z of legaleZetten(g, 'laatste')) {
      if (z.soort === 'reiken') expect(z.kosten).toBeLessThanOrEqual(1);
    }
  });

  it('is uitvoerbaar: elke aangeboden zet loopt zonder klacht', () => {
    for (const seed of [0, 5, 19]) {
      const s = new Sessie({
        cfg: gevalideerd(),
        seed,
        bestuur: { laatste: 'mens', nexus: 'bot' },
      });
      let wacht = 0;
      while (!s.uitslag && wacht++ < 400) {
        if (!s.mensAanZet) {
          s.speelBot();
          continue;
        }
        const zetten = s.zetten();
        if (!zetten.length) {
          s.beurtAf();
          continue;
        }
        const voor = s.g.substantieTotaal();
        s.doe(zetten[wacht % zetten.length]);
        // de gesloten kringloop mag door geen enkele zet lekken
        expect(s.g.substantieTotaal()).toBe(voor);
      }
      expect(s.uitslag).not.toBeNull();
    }
  });

  it('biedt de Nexus stappen aan die hij ook echt mag zetten', () => {
    const g = new Game(0, gevalideerd());
    g.play(4);
    for (const z of legaleZetten(g, 'nexus')) {
      if (z.soort === 'stap') expect(g.nexusMag(z.cel)).toBe(true);
    }
  });

  it('biedt stilstand alleen aan als de regel aan staat', () => {
    const uit = new Game(0, meeting2({ afslag: { stilstand: { on: false } } }));
    uit.play(6);
    expect(legaleZetten(uit, 'nexus').some((z) => z.soort === 'stilstand')).toBe(false);
  });

  it('biedt een verharde keten nooit los aan, alleen als geheel', () => {
    const g = bouwKeten();
    const zetten = legaleZetten(g, 'laatste');
    const keten = [...(g.ketens.get(1) ?? [])];
    expect(keten.length).toBeGreaterThanOrEqual(3);
    for (const c of keten) {
      expect(zetten.some((z) => z.soort === 'doorgeven' && z.cel === c)).toBe(false);
      expect(zetten.some((z) => z.soort === 'terugtrekken' && z.cel === c)).toBe(false);
    }
    const verzilver = zetten.find((z) => z.soort === 'verzilveren');
    expect(verzilver).toBeDefined();
    expect((verzilver as Extract<Zet, { soort: 'verzilveren' }>).cellen.length).toBe(keten.length);
  });

  it('geeft elke zet een zin die uit te leggen is', () => {
    const g = bouwKeten();
    for (const z of legaleZetten(g, 'laatste')) {
      expect(zetTekst(z).length).toBeGreaterThan(8);
    }
  });
});

describe('waarom niet', () => {
  it('zegt niets over een tegel waar wél een zet op ligt', () => {
    const g = new Game(0, gevalideerd());
    const z = legaleZetten(g, 'laatste')[0];
    expect(waaromNiet(g, 'laatste', (z as { cel: CellKey }).cel)).toBeNull();
  });

  it('wijst op de draad bij een tegel die te ver weg ligt', () => {
    const g = new Game(0, gevalideerd());
    const ver = ALL_KEYS.find(
      (k) => k !== g.seat && !g.reikbaar().has(k) && g.alive.has(k),
    )!;
    expect(waaromNiet(g, 'laatste', ver)).toContain('draad');
  });

  it('laat een verharde keten wél aanklikken zolang verzilveren aan staat', () => {
    const g = bouwKeten();
    const c = [...g.ketens.get(1)!][0];
    // klikken mag: het is de keten als geheel die je aanwijst
    expect(waaromNiet(g, 'laatste', c)).toBeNull();
    expect(waaromNiet(g, 'nexus', c)).toContain('verhard');
  });

  it('zegt van een verharde keten dat hij af is als verzilveren uit staat', () => {
    const g = bouwKeten(gevalideerd({ verzilveren: { on: false } }));
    const c = [...g.ketens.get(1)!][0];
    expect(waaromNiet(g, 'laatste', c)).toContain('af');
  });

  it('zegt tegen de Nexus dat een vat-tegel geen staanplaats is', () => {
    const g = bouwKeten();
    const vat = [...g.alive].find(
      (k) => g.isVat(k) && !g.isVerhard(k) && k !== g.seat && g.nbKeys(g.npos).includes(k),
    );
    if (vat) expect(waaromNiet(g, 'nexus', vat)).toContain('vat');
  });
});

describe('terugnemen', () => {
  it('kan binnen de eigen beurt, en zet de toestand echt terug', () => {
    const s = new Sessie({
      cfg: gevalideerd(),
      seed: 0,
      bestuur: { laatste: 'mens', nexus: 'bot' },
    });
    const voorraad = s.g.stock;
    const over = s.handelingenOver;
    s.doe(s.zetten()[0]);
    expect(s.g.stock).toBeLessThan(voorraad);
    expect(s.handelingenOver).toBe(over - 1);
    expect(s.kanTerug()).toBe(true);
    s.terug();
    expect(s.g.stock).toBe(voorraad);
    expect(s.handelingenOver).toBe(over);
    expect(s.kanTerug()).toBe(false);
  });

  it('kan niet meer nadat de beurt is afgesloten', () => {
    const s = new Sessie({
      cfg: gevalideerd(),
      seed: 0,
      bestuur: { laatste: 'mens', nexus: 'mens' },
    });
    s.doe(s.zetten()[0]);
    s.beurtAf();
    expect(s.aanZet).toBe('nexus');
    expect(s.kanTerug()).toBe(false);
  });

  it('sluit de beurt niet uit zichzelf als de handelingen op zijn', () => {
    const s = new Sessie({
      cfg: gevalideerd(),
      seed: 0,
      bestuur: { laatste: 'mens', nexus: 'bot' },
    });
    for (let k = 0; k < s.cfg.acts; k++) s.doe(s.zetten()[0]);
    expect(s.aanZet).toBe('laatste');
    expect(s.restant()).toBe(0);
    expect(s.zetten()).toEqual([]);
    expect(s.kanTerug()).toBe(true);
  });
});

describe('hotseat', () => {
  it('geeft de beurt netjes door tussen twee mensen', () => {
    const s = new Sessie({
      cfg: gevalideerd(),
      seed: 2,
      bestuur: { laatste: 'mens', nexus: 'mens' },
    });
    expect(s.aanZet).toBe('laatste');
    s.beurtAf();
    expect(s.aanZet).toBe('nexus');
    expect(s.mensAanZet).toBe(true);
    s.beurtAf();
    expect(s.aanZet).toBe('laatste');
    expect(s.g.turn).toBe(2);
  });
});

/** Een bord met één verharde keten van drie, om de randgevallen te toetsen. */
function bouwKeten(cfg = gevalideerd()): Game {
  const g = new Game(0, cfg);
  const bruikbaar = (k: CellKey) => g.alive.has(k) && k !== g.seat && k !== g.oog;
  const pad: CellKey[] = [g.nbKeys(g.seat).find(bruikbaar)!];
  while (pad.length < 3) {
    const volgende = g.nbKeys(pad[pad.length - 1]).find((k) => bruikbaar(k) && !pad.includes(k));
    if (!volgende) throw new Error('keten loopt dood');
    pad.push(volgende);
  }
  for (const c of pad) {
    g.setW(c, 2);
    g.open.add(c);
    (g as unknown as { checkVerharden(t: CellKey): void }).checkVerharden(c);
  }
  return g;
}
