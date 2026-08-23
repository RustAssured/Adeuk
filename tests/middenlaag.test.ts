/**
 * De drie regels van meetopdracht 2: verharden, verzilveren, de Oversteek.
 *
 * Deze tests leggen vast wat de regels zeggen, niet wat de bots ervan maken.
 * De randgevallen die de opdracht expliciet noemt — "grenzen mag, aanbouwen
 * niet", "de sporen behouden de verharde status NIET", "gaten in de route zijn
 * zijn tegenspel" — staan er allemaal apart in.
 */
import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { makeConfig, meeting2 } from '../src/engine/config';
import { ALL, dist, key, unkey, type CellKey } from '../src/engine/hex';

/** Een bord met alle drie de regels aan, maar zonder bots ertussen. */
const opzet = (seed = 1, patch = {}) =>
  new Game(seed, meeting2({ maxTurns: 40, ...patch }));

/** Legt vat (twee stenen) op een reeks tegels, zoals `reik` dat zou doen. */
function vat(g: Game, cellen: CellKey[]): void {
  for (const c of cellen) {
    g.setW(c, 1);
    g.open.add(c);
    g.setW(c, 2);
    // dezelfde controle die reik()/push() na een vatting doet
    (g as unknown as { checkVerharden(t: CellKey): void }).checkVerharden(c);
  }
}

/**
 * Een aaneengesloten sliert van n levende tegels die aan de Zetel begint.
 * Elke volgende tegel grenst aan een tegel die al in de sliert zit, zodat het
 * gegarandeerd één groep is en niet twee losse stukken naast de Zetel.
 */
function sliert(g: Game, n: number): CellKey[] {
  const bruikbaar = (k: CellKey) => g.alive.has(k) && k !== g.seat && k !== g.oog;
  const eerste = g.nbKeys(g.seat).find(bruikbaar);
  if (!eerste) throw new Error('geen bruikbare buur van de Zetel');
  const uit: CellKey[] = [eerste];
  while (uit.length < n) {
    // een pad, niet een klont: elke tegel grenst aan de vórige, zodat elk
    // aaneengesloten stuk van de sliert ook echt aaneengesloten is
    const laatste = uit[uit.length - 1];
    let volgende = g.nbKeys(laatste).find((k) => bruikbaar(k) && !uit.includes(k));
    if (!volgende) {
      for (const c of uit) {
        volgende = g.nbKeys(c).find((k) => bruikbaar(k) && !uit.includes(k));
        if (volgende) break;
      }
    }
    if (!volgende) throw new Error('sliert loopt dood');
    uit.push(volgende);
  }
  return uit;
}

describe('A · verharden', () => {
  it('verhardt zodra de K-de aaneengesloten vat-tegel er ligt, en niet eerder', () => {
    const g = opzet();
    const rij = sliert(g, 4);
    vat(g, rij.slice(0, 3));
    expect(g.ketens.size, 'drie tegels is nog geen keten').toBe(0);
    vat(g, rij.slice(3, 4));
    expect(g.ketens.size).toBe(1);
    expect(rij.slice(0, 4).every((c) => g.isVerhard(c))).toBe(true);
  });

  it('telt elke aaneengesloten groep, geen rechte lijn vereist', () => {
    const g = opzet(5);
    // een groep rond één centrale tegel is net zo goed een keten
    const midden = g.nbKeys(g.seat).find((k) => g.alive.has(k) && k !== g.oog)!;
    const om = g.nbKeys(midden).filter((k) => g.alive.has(k) && k !== g.seat && k !== g.oog);
    vat(g, [midden, ...om.slice(0, 3)]);
    expect(g.ketens.size).toBe(1);
    expect(g.vatComponent(midden).size).toBe(0); // zit nu in een keten, dus telt niet mee
  });

  it('is af: vatten ernaast begint een nieuwe keten en groeit de oude niet aan', () => {
    const g = opzet(2, { verharden: { on: true, K: 3 } });
    const rij = sliert(g, 6);
    vat(g, rij.slice(0, 3));
    expect(g.ketens.size).toBe(1);
    const eersteNr = g.ketenVan.get(rij[0]);
    const eersteGrootte = g.ketens.get(eersteNr!)!.size;

    vat(g, [rij[3]]);
    // de nieuwe tegel hangt aan de verharde keten, maar hoort er niet bij
    expect(g.ketens.get(eersteNr!)!.size, 'de verharde keten blijft even groot').toBe(eersteGrootte);
    expect(g.isVerhard(rij[3])).toBe(false);
    // en hij begint een eigen groep, die pas bij K verhardt
    expect(g.vatComponent(rij[3]).size).toBe(1);
    vat(g, rij.slice(4, 6));
    expect(g.ketens.size, 'de tweede keten staat los van de eerste').toBe(2);
    expect(g.ketenVan.get(rij[3])).not.toBe(eersteNr);
  });

  it('is onaantastbaar: niet te verzwelgen, ook niet via omsingeling of stilstand', () => {
    const g = opzet(3, { afslag: { omsingeling: { on: true, minRandZijden: 1 }, stilstand: { on: true } } });
    const rij = sliert(g, 4);
    vat(g, rij);
    expect(g.ketens.size).toBe(1);

    const voorAlive = g.alive.size;
    g.consume(rij[0]);
    expect(g.alive.size, 'verzwelgen stuit af').toBe(voorAlive);
    expect(g.pileN).toBe(0);

    // maak zoveel mogelijk randen om hem heen en laat de omsingeling los
    for (const b of g.nbKeys(rij[0])) if (g.alive.has(b) && !g.isVerhard(b) && b !== g.seat && b !== g.oog) g.alive.delete(b);
    g.omsingelingAfslag();
    expect(g.wOf(rij[0]), 'omsingeling raakt hem niet').toBe(2);

    g.stilstandAfslag(rij[0]);
    expect(g.wOf(rij[0]), 'stilstand raakt hem niet').toBe(2);
  });

  it('draagt de draad, zoals sporen dat doen', () => {
    const g = opzet(4);
    const rij = sliert(g, 4);
    vat(g, rij);
    for (const c of rij) expect(g.conn()).toContain(c);
  });

  it('telt een gebroken bijna-keten mee, zodat het lab het kan meten', () => {
    const g = opzet(6, { verharden: { on: true, K: 4 } });
    const rij = sliert(g, 3);
    vat(g, rij);
    expect(g.ketensGebroken).toBe(0);
    g.consume(rij[0]);
    expect(g.ketensGebroken, 'K-1 tegels weggehaald telt als gebroken keten').toBe(1);
  });
});

describe('B · verzilveren', () => {
  it('levert tegels x M op, geeft de stenen terug en maakt er gewone sporen van', () => {
    const g = opzet(7, { verzilveren: { on: true, M: 2 } });
    const rij = sliert(g, 4);
    vat(g, rij);
    const nr = [...g.ketens.keys()][0];
    const voorraadVoor = g.stock;

    expect(g.pileL, 'een onverzilverde keten telt 0 sporen').toBe(0);
    expect(g.ketenWaarde(nr)).toBe(8);

    g.verzilver(nr);
    expect(g.pileL).toBe(8);
    expect(g.stock).toBe(voorraadVoor + 8); // twee stenen per tegel terug
    expect(g.ketens.size).toBe(0);
    for (const c of rij) {
      expect(g.marks.has(c), 'elke tegel is nu spoor').toBe(true);
      expect(g.isVerhard(c), 'en de verharde status is weg').toBe(false);
      expect(g.wOf(c)).toBe(0);
    }
  });

  it('rondt bij M = 1,5 naar beneden af', () => {
    const g = opzet(8, { verharden: { on: true, K: 3 }, verzilveren: { on: true, M: 1.5 } });
    vat(g, sliert(g, 3));
    const nr = [...g.ketens.keys()][0];
    expect(g.ketenWaarde(nr)).toBe(4); // 3 x 1,5 = 4,5 -> 4
  });

  it('laat de verzilverde sporen gewoon opvreetbaar zijn', () => {
    const g = opzet(9, { spoorVreten: 'alles' });
    const rij = sliert(g, 4);
    vat(g, rij);
    g.verzilver([...g.ketens.keys()][0]);
    const voor = g.pileL;
    g.consume(rij[0]);
    expect(g.alive.has(rij[0]), 'de tegel is nu wél te verzwelgen').toBe(false);
    expect(g.pileL).toBe(voor - 1);
  });

  it('laat los doorgeven bestaan naast het verzilveren', () => {
    const g = opzet(10);
    const los = g.nbKeys(g.seat).find(
      (k) => g.alive.has(k) && k !== g.oog && g.yieldOf(k) > 0,
    )!;
    g.setW(los, 2);
    g.open.add(los);
    expect(g.claimable()).toContain(los);
    g.claim(los);
    expect(g.pileL).toBe(1);
    expect(g.losPunten).toBe(1);
  });

  it('houdt een verharde tegel buiten het losse doorgeven', () => {
    const g = opzet(11);
    const rij = sliert(g, 4);
    vat(g, rij);
    for (const c of rij) expect(g.claimable()).not.toContain(c);
  });
});

describe('C · de Oversteek', () => {
  it('legt het Oog op de afgesproken afstand van de Zetel, met terugval', () => {
    let terugval = 0;
    for (let s = 0; s < 80; s++) {
      const g = opzet(s);
      expect(g.oog).not.toBeNull();
      const d = dist(unkey(g.oog!), unkey(g.seat));
      const bestaat = ALL.some((c) => dist(c, unkey(g.seat)) === 4 && key(c) !== g.seat);
      if (bestaat) expect(d, `seed ${s}`).toBe(4);
      else terugval++;
    }
    // staat de Zetel in het centrum, dan bestáát er geen hex op afstand 4
    expect(terugval).toBeGreaterThan(0);
  });

  it('laat het Oog niet verzwelgen', () => {
    const g = opzet(12);
    const voor = g.alive.size;
    g.consume(g.oog!);
    expect(g.alive.has(g.oog!)).toBe(true);
    expect(g.alive.size).toBe(voor);
  });

  it('geeft haar de winst pas als teller én pad er allebei zijn', () => {
    const g = opzet(13, { needL: 3 });
    g.pileL = 5; // teller ruim vol
    expect(g.winstLaatste(), 'zonder pad is een volle teller niets waard').toBe(false);

    // maak een pad van de Zetel naar het Oog van louter sporen
    let pad = padNaarOog(g);
    for (const c of pad) if (c !== g.seat) g.marks.add(c);
    expect(g.routeNaarOog()).not.toBeNull();
    expect(g.winstLaatste()).toBe(true);

    // en zonder de teller telt het pad niet
    g.pileL = 2;
    expect(g.winstLaatste()).toBe(false);
  });

  it('breekt op een gat: een verzwolgen spoortegel telt niet meer als pad', () => {
    const g = opzet(14, { needL: 1, spoorVreten: 'alleenTegel' });
    const pad = padNaarOog(g);
    for (const c of pad) if (c !== g.seat) g.marks.add(c);
    g.pileL = 4;
    expect(g.winstLaatste()).toBe(true);

    const midden = pad[Math.floor(pad.length / 2)];
    g.consume(midden);
    expect(g.pileL, 'het punt blijft staan').toBe(4);
    expect(g.routeNaarOog(), 'maar de tegel is weg, dus het pad is verbroken').toBeNull();
    expect(g.winstLaatste()).toBe(false);
  });

  it('kan het Oog insluiten: dan is er geen weg meer, hoe vol de teller ook staat', () => {
    const g = opzet(15, { needL: 1 });
    g.pileL = 9;
    for (const b of g.nbKeys(g.oog!)) g.alive.delete(b);
    expect(Number.isFinite(g.routeTekort())).toBe(false);
    expect(g.winstLaatste()).toBe(false);
  });

  it('volstaat met een pad tot náást het Oog als die knop uit staat', () => {
    const g = opzet(16, { needL: 1, oversteek: { oogMoetVanHaarZijn: false } });
    g.pileL = 4;
    const pad = padNaarOog(g);
    for (const c of pad) if (c !== g.seat && c !== g.oog) g.marks.add(c);
    expect(g.haarTegel(g.oog!), 'het Oog zelf is niet van haar').toBe(false);
    expect(g.winstLaatste()).toBe(true);
  });
});

/** Kortste rij levende tegels van de Zetel naar het Oog, inclusief beide. */
function padNaarOog(g: Game): CellKey[] {
  const vorige = new Map<CellKey, CellKey | null>([[g.seat, null]]);
  const rij = [g.seat];
  let kop = 0;
  while (kop < rij.length) {
    const c = rij[kop++];
    if (c === g.oog) {
      const pad: CellKey[] = [];
      let cur: CellKey | null = c;
      while (cur) {
        pad.push(cur);
        cur = vorige.get(cur) ?? null;
      }
      return pad.reverse();
    }
    for (const x of g.nbKeys(c)) {
      if (vorige.has(x) || !g.alive.has(x)) continue;
      vorige.set(x, c);
      rij.push(x);
    }
  }
  throw new Error('geen pad naar het Oog');
}

describe('pariteit blijft', () => {
  it('staat de middenlaag standaard uit', () => {
    const v5 = makeConfig();
    expect(v5.verharden.on).toBe(false);
    expect(v5.verzilveren.on).toBe(false);
    expect(v5.oversteek.on).toBe(false);
    const g = new Game(0, v5);
    expect(g.oog).toBeNull();
    expect(g.winstLaatste()).toBe(false);
  });
});
