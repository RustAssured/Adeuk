/**
 * De lat zelf op de lat. Deze tests gaan niet over of de gevalideerde stand
 * goed is — dat meet de batch — maar over of het paneel eerlijk oordeelt:
 * grijs blijft grijs, het eindadvies volgt de slechtste meetbare kleur, en de
 * drempels bijten waar ze horen te bijten.
 */
import { describe, it, expect } from 'vitest';
import { beoordeel, actieveRegels, DREMPELS } from '../src/engine/adviesregels';
import type { Meting2, PersonaMeting } from '../src/engine/meting2';
import { meeting2 } from '../src/engine/config';

/** Een batch waarin alles precies goed staat; per test één ding scheef. */
function gezond(patch: Partial<Meting2> = {}): Meting2 {
  return {
    n: 100,
    verdeling: { laatste: 45, nexus: 45, niets: 0, timeout: 10 },
    medianDuur: 16, minDuur: 9, maxDuur: 30,
    vastlopers: 8,
    gemWissels: 1.6,
    comebackPct: 55,
    sprints: 1,
    verhardPct: 65, ketensVerhard: 2.4, ketensGebroken: 1.3,
    losPct: 35, gemLos: 4, gemKeten: 8,
    blokkadePct: 12, klemVolPct: 4, oogIngeslotenPct: 6,
    gemRouteBreuken: 1.1, gemSporen: 12,
    stilstandPct: 20,
    wegen: { tegels: 20, route: 10, insluiting: 15 },
    wegenBespeeld: 3,
    grootsteWeg: 44,
    ketensGestart: 3.7,
    ...patch,
  };
}

const CFG = meeting2({
  verharden: { K: 3 }, verzilveren: { M: 1.5 }, needL: 13, needN: 28,
  oversteek: { maxSprong: 1, onbereikbaar: 'nexusWint' },
});

const bij = (a: ReturnType<typeof beoordeel>, nr: number) =>
  a.oordelen.find((o) => o.nr === nr)!;

describe('het advies-paneel', () => {
  it('geeft een oordeel over alle negen stelregels, in volgorde', () => {
    const a = beoordeel(gezond(), CFG);
    expect(a.oordelen.map((o) => o.nr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('houdt de niet-meetbare stelregels grijs, ook bij een perfecte batch', () => {
    const a = beoordeel(gezond(), CFG);
    for (const nr of [2, 7, 9]) {
      expect(bij(a, nr).kleur).toBe('grijs');
      expect(bij(a, nr).reden).toContain('Aan tafel te toetsen');
    }
  });

  it('beveelt een gezonde batch aan', () => {
    expect(beoordeel(gezond(), CFG).eind).toBe('aanbevolen');
  });

  it('laat één rode stelregel het hele advies afkeuren en noemt hem', () => {
    const a = beoordeel(gezond({ vastlopers: 22 }), CFG);
    expect(bij(a, 4).kleur).toBe('rood');
    expect(bij(a, 4).reden).toContain('22%');
    expect(a.eind).toBe('afgeraden');
    expect(a.bepalend).toContain('stelregel 4');
  });

  it('zet een oranje stelregel om in een kanttekening, geen afkeuring', () => {
    const a = beoordeel(gezond({ vastlopers: 15 }), CFG);
    expect(bij(a, 4).kleur).toBe('oranje');
    expect(a.eind).toBe('aanbevolen met kanttekening');
  });

  it('noemt bij twee klachten de ergste als bepalend', () => {
    const a = beoordeel(gezond({ vastlopers: 22, gemWissels: 0.4 }), CFG);
    expect(bij(a, 5).kleur).toBe('oranje');
    expect(a.eind).toBe('afgeraden');
    expect(a.bepalend).toContain('stelregel 4');
  });

  it('laat grijs het eindadvies niet bepalen', () => {
    const a = beoordeel(gezond(), CFG);
    expect(a.eind).toBe('aanbevolen');
    expect(a.bepalend).not.toContain('stelregel 7');
    expect(a.bepalend).not.toContain('stelregel 9');
  });

  it('zet elk getal uit de reden ook echt in de reden', () => {
    const a = beoordeel(gezond({ verhardPct: 92 }), CFG);
    expect(bij(a, 1).kleur).toBe('oranje');
    expect(bij(a, 1).reden).toContain('92%');
    expect(bij(a, 1).reden).toContain('te makkelijk');
  });

  it('herkent een verharding die vrijwel nooit lukt', () => {
    const a = beoordeel(gezond({ verhardPct: 20 }), CFG);
    expect(bij(a, 1).reden).toContain('te moeilijk');
  });

  it('klaagt als hij maar één weg naar de winst bespeelt', () => {
    const a = beoordeel(
      gezond({ wegenBespeeld: 1, wegen: { tegels: 0, route: 0, insluiting: 45 }, grootsteWeg: 100 }),
      CFG,
    );
    expect(bij(a, 6).kleur).toBe('oranje');
    expect(bij(a, 6).reden).toContain('1 weg');
  });

  it('klaagt als één weg bijna al zijn winsten opslokt', () => {
    const a = beoordeel(gezond({ grootsteWeg: 91 }), CFG);
    expect(bij(a, 6).kleur).toBe('oranje');
    expect(bij(a, 6).reden).toContain('91%');
  });

  it('valt over een sprintspel', () => {
    const a = beoordeel(gezond({ sprints: 14 }), CFG);
    expect(bij(a, 4).kleur).toBe('rood');
    expect(bij(a, 4).reden).toContain('14%');
  });

  it('valt over een partij die halverwege al beslist is', () => {
    const a = beoordeel(gezond({ comebackPct: 20 }), CFG);
    expect(bij(a, 3).kleur).toBe('oranje');
    expect(bij(a, 5).kleur).toBe('oranje');
    expect(a.eind).toBe('aanbevolen met kanttekening');
  });
});

describe('stelregel 2 — de regeltelling is een proxy, geen meting', () => {
  it('blijft grijs maar waarschuwt als er te veel regels aan staan', () => {
    const veel = meeting2({ oversteek: { hof: true, maxSprong: 1, onbereikbaar: 'nexusWint' } });
    const a = beoordeel(gezond(), veel);
    expect(actieveRegels(veel).length).toBeGreaterThan(DREMPELS.maxRegels);
    expect(bij(a, 2).kleur).toBe('grijs');
    expect(bij(a, 2).reden).toContain('waarschuwing');
  });

  it('beslist niet mee over het advies, maar staat er wel naast', () => {
    const veel = meeting2({ oversteek: { hof: true, maxSprong: 1, onbereikbaar: 'nexusWint' } });
    expect(actieveRegels(veel).length).toBeGreaterThan(DREMPELS.maxRegels);
    const a = beoordeel(gezond(), veel);
    // het advies volgt alleen de meetbare regels — die staan hier allemaal groen
    expect(a.eind).toBe('aanbevolen');
    expect(a.bepalend).not.toContain('stelregel 2');
    // maar de waarschuwing is er, met het getal erin
    expect(a.waarschuwing).toContain('10 regels');
    expect(a.waarschuwing).toContain('geen meting');
  });

  it('waarschuwt niet als het aantal regels binnen de grens blijft', () => {
    expect(beoordeel(gezond(), CFG).waarschuwing).toBeUndefined();
  });

  it('noemt de regels die aan staan bij naam', () => {
    expect(actieveRegels(CFG)).toContain('verharden (K 3)');
    expect(actieveRegels(CFG)).toContain('de Oversteek');
    expect(actieveRegels(meeting2({ verharden: { on: false } }))).not.toContain('verharden (K 3)');
  });
});

describe('stelregel 8 — herspeelbaarheid', () => {
  it('is grijs zolang er maar tegen één persona gespeeld is', () => {
    const a = beoordeel(gezond(), CFG);
    expect(bij(a, 8).kleur).toBe('grijs');
    expect(bij(a, 8).reden).toContain('beperkt zicht');
  });

  it('wordt groen bij een kleine spreiding over de persona’s', () => {
    const p: PersonaMeting = {
      perPersona: {
        gretig: gezond({ verdeling: { laatste: 42, nexus: 48, niets: 0, timeout: 10 } }),
        gemengd: gezond({ verdeling: { laatste: 45, nexus: 45, niets: 0, timeout: 10 } }),
        defensief: gezond({ verdeling: { laatste: 44, nexus: 46, niets: 0, timeout: 10 } }),
      },
      spreiding: 3,
    };
    const a = beoordeel(gezond(), CFG, p);
    expect(bij(a, 8).kleur).toBe('groen');
    expect(bij(a, 8).reden).toContain('gretig 42%');
  });

  it('wordt rood als de uitkomst aan de persona hangt', () => {
    const p: PersonaMeting = { perPersona: { gemengd: gezond() }, spreiding: 18 };
    const a = beoordeel(gezond(), CFG, p);
    expect(bij(a, 8).kleur).toBe('rood');
    expect(beoordeel(gezond(), CFG, p).eind).toBe('afgeraden');
  });
});
