/**
 * Wat mag er nu, en waarom mag de rest niet.
 *
 * De bots kiezen hun zet zelf uit de toestand; een mens heeft een lijst nodig.
 * Deze module leest die lijst uit dezelfde methodes die de bots gebruiken —
 * `reikbaar`, `claimable`, `verzilverbaar`, `nexusMag`, `hongerVoorbijMogelijk`
 * — zodat er geen tweede lezing van de regels ontstaat die uit de pas kan lopen.
 *
 * `waaromNiet` is er voor de andere helft: een tegel die je niet kunt aanklikken
 * hoort te vertellen waarom niet. Zonder dat leert een speler de regel niet.
 */
import type { Game } from './game';
import { order } from './game';
import { dist, unkey, type CellKey } from './hex';
import type { Actor } from './types';

export type Zet =
  /** reiken of vatten; `kosten` > 1 is een sprong over de rand */
  | { soort: 'reiken'; cel: CellKey; kosten: number; wordt: 'ijl' | 'vat' }
  | { soort: 'doorgeven'; cel: CellKey }
  | { soort: 'verzilveren'; keten: number; cellen: CellKey[]; waarde: number }
  | { soort: 'terugtrekken'; cel: CellKey }
  | { soort: 'stap'; cel: CellKey }
  | { soort: 'verzwelgen'; cel: CellKey }
  | { soort: 'stilstand'; cel: CellKey }
  | { soort: 'hongerVoorbij'; cel: CellKey };

export const zetCel = (z: Zet): CellKey => (z.soort === 'verzilveren' ? z.cellen[0] : z.cel);

/** Eén regel uitleg per zetsoort, voor de knoppenbalk en de tooltip. */
export function zetTekst(z: Zet): string {
  switch (z.soort) {
    case 'reiken':
      return z.kosten > 1
        ? `over de rand springen — ${z.kosten} substantie, waarvan ${z.kosten - 1} naar de doos`
        : z.wordt === 'vat'
          ? 'vatten — de tegel gaat oogsten en hij komt er niet meer in'
          : 'reiken — ijl, aanwezig maar machteloos';
    case 'doorgeven':
      return 'doorgeven — 1 spoor, de substantie keert terug';
    case 'verzilveren':
      return `de keten van ${z.cellen.length} verzilveren — ${z.waarde} sporen in één handeling`;
    case 'terugtrekken':
      return 'terugtrekken — een steen terug naar de voorraad';
    case 'stap':
      return 'een stap zetten — de tegel die je verlaat wordt verzwolgen';
    case 'verzwelgen':
      return 'verzwelgen — je kunt nergens heen, dus je eet op afstand';
    case 'stilstand':
      return 'stilstaan — je hele beurt voor één afgeslagen steen';
    case 'hongerVoorbij':
      return 'honger voorbij — alles om je heen heeft vat, dus je slokt er één in zijn geheel';
  }
}

/** Alles wat de Laatste nu met één handeling kan doen. */
export function zettenLaatste(g: Game): Zet[] {
  const uit: Zet[] = [];
  const draad = g.conn();

  for (const [cel, kosten] of g.reikbaar(draad)) {
    if (kosten > g.stock) continue;
    uit.push({ soort: 'reiken', cel, kosten, wordt: g.wOf(cel) === 1 ? 'vat' : 'ijl' });
  }
  for (const cel of g.claimable(draad)) uit.push({ soort: 'doorgeven', cel });
  for (const nr of g.verzilverbaar(draad)) {
    uit.push({
      soort: 'verzilveren',
      keten: nr,
      cellen: [...(g.ketens.get(nr) ?? [])],
      waarde: g.ketenWaarde(nr),
    });
  }
  for (const cel of order(g.alive)) {
    if (cel === g.seat || g.wOf(cel) < 1 || g.isVerhard(cel)) continue;
    uit.push({ soort: 'terugtrekken', cel });
  }
  return uit;
}

/**
 * Alles wat de Nexus nu kan doen. Zijn beurt heeft drie vormen: stilstaan
 * (de hele beurt), een slok als hij ingesloten staat (ook de hele beurt), of
 * stappen — en dat mag hij `nexusMoves` keer.
 *
 * Kan hij geen kant op, dan eet hij op afstand, net als de bot. Om die keuze
 * hanteerbaar te houden staan alleen de dichtstbijzijnde tegels in de lijst;
 * dat is precies wat de bot ook doet.
 */
export function zettenNexus(g: Game, alGestapt: number): Zet[] {
  const uit: Zet[] = [];

  if (alGestapt === 0) {
    if (g.hongerVoorbijMogelijk()) {
      for (const cel of g.nbKeys(g.npos)) {
        if (!g.alive.has(cel) || cel === g.seat) continue;
        if (g.isVerhard(cel) || cel === g.oog) continue;
        uit.push({ soort: 'hongerVoorbij', cel });
      }
    }
    if (g.cfg.afslag.stilstand.on) {
      for (const cel of g.nbKeys(g.npos)) {
        if (!g.alive.has(cel) || cel === g.seat) continue;
        if (!g.isVat(cel) || g.isVerhard(cel)) continue;
        uit.push({ soort: 'stilstand', cel });
      }
    }
  }

  const stappen = g.nbKeys(g.npos).filter((x) => g.nexusMag(x));
  for (const cel of stappen) uit.push({ soort: 'stap', cel });

  if (alGestapt === 0 && !stappen.length) {
    const kandidaten = order(g.alive).filter(
      (x) => x !== g.seat && x !== g.npos && g.nexusMag(x),
    );
    if (kandidaten.length) {
      const np = unkey(g.npos);
      const dichtst = Math.min(...kandidaten.map((c) => dist(unkey(c), np)));
      for (const cel of kandidaten) {
        if (dist(unkey(cel), np) === dichtst) uit.push({ soort: 'verzwelgen', cel });
      }
    }
  }
  return uit;
}

export function legaleZetten(g: Game, wie: Actor, alGestapt = 0): Zet[] {
  if (g.done) return [];
  return wie === 'laatste' ? zettenLaatste(g) : zettenNexus(g, alGestapt);
}

// ------------------------------------------------------------- uitvoeren

/**
 * Voert een zet uit en zegt of de beurt daarmee voorbij is. De winstcontroles
 * staan hier omdat `playTurn` ze normaal doet en die overslaan we in een
 * gespeelde partij.
 */
export function voerUit(g: Game, z: Zet): { beurtVoorbij: boolean } {
  switch (z.soort) {
    case 'reiken':
      g.reik(z.cel, z.kosten);
      return { beurtVoorbij: false };
    case 'doorgeven':
      g.claim(z.cel);
      if (g.winstLaatste()) g.done = 'laatste';
      return { beurtVoorbij: Boolean(g.done) };
    case 'verzilveren':
      g.verzilver(z.keten);
      if (g.winstLaatste()) g.done = 'laatste';
      return { beurtVoorbij: Boolean(g.done) };
    case 'terugtrekken':
      g.withdraw(z.cel);
      return { beurtVoorbij: false };
    case 'stap':
      g.moveTo(z.cel);
      if (g.pileN >= g.cfg.needN) g.done = 'nexus';
      return { beurtVoorbij: Boolean(g.done) };
    case 'verzwelgen':
      g.consume(z.cel);
      if (g.pileN >= g.cfg.needN) g.done = 'nexus';
      return { beurtVoorbij: true };
    case 'stilstand':
      g.stilstandAfslag(z.cel);
      return { beurtVoorbij: true };
    case 'hongerVoorbij':
      g.hongerVoorbijSlok(z.cel);
      if (g.pileN >= g.cfg.needN) g.done = 'nexus';
      return { beurtVoorbij: true };
  }
}

// ------------------------------------------------------------- waarom niet

/**
 * Waarom kan ik hier niet klikken? Eén zin, in de taal van de regel — niet
 * "ongeldige zet". De volgorde is die van de meest voorkomende vergissing.
 */
export function waaromNiet(g: Game, wie: Actor, cel: CellKey): string | null {
  if (g.done) return 'de partij is voorbij';
  if (legaleZetten(g, wie).some((z) => raaktCel(z, cel))) return null;

  if (!g.alive.has(cel)) return 'hier is geen tegel meer — die is verzwolgen';
  if (cel === g.seat) return 'de Zetel zelf blijft zoals hij is';

  if (wie === 'laatste') {
    if (g.isVerhard(cel)) {
      return 'deze keten is af — verhard, onaantastbaar, en alleen in zijn geheel te verzilveren';
    }
    if (g.wOf(cel) >= 2) {
      if (g.marks.has(cel)) return 'hier ligt al een spoor';
      if (g.yieldOf(cel) <= 0) return 'een stil veld levert niets op om door te geven';
      return 'deze tegel is al vat';
    }
    const bereik = g.reikbaar();
    if (!bereik.has(cel)) return 'grenst niet aan de draad — je kunt alleen naast je eigen tegels reiken';
    const kosten = bereik.get(cel)!;
    return `daar is ${kosten} substantie voor nodig en je hebt er ${g.stock}`;
  }

  if (cel === g.npos) return 'daar sta je al';
  if (g.isVerhard(cel)) return 'verhard — daar kom je niet in, ook niet via omsingeling';
  if (g.wOf(cel) >= 2) return 'deze tegel heeft vat — daar kun je niet op staan';
  if (g.cfg.spoorVreten === 'nooit' && g.marks.has(cel)) return 'een spoor is onschendbaar';
  if (!g.nbKeys(g.npos).includes(cel)) return 'te ver — je zet één tegel per stap';
  return 'hier kan nu niets';
}

const raaktCel = (z: Zet, cel: CellKey): boolean =>
  z.soort === 'verzilveren' ? z.cellen.includes(cel) : z.cel === cel;

/** Alle tegels die een zet aanwijst, voor het oplichten op het bord. */
export function zetCellen(z: Zet): CellKey[] {
  return z.soort === 'verzilveren' ? z.cellen : [z.cel];
}

