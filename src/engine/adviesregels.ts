/**
 * Het advies-paneel: elke batch langs de negen stelregels uit het regeldocument.
 *
 * Twee dingen zijn hier belangrijker dan de logica zelf.
 *
 * Eén: alle grenzen staan in `DREMPELS` hieronder, op één plek, met een regel
 * uitleg per waarde. Wie de lat wil verleggen hoeft nergens anders te zoeken.
 *
 * Twee: het paneel veinst geen zekerheid die het niet heeft. Drie van de negen
 * stelregels zijn niet uit een batch af te lezen — makkelijk leren, thema en
 * mechaniek, en of het bord in één oogopslag leesbaar is. Die krijgen grijs en
 * de tekst "aan tafel te toetsen", en ze worden nooit groen. Het eindadvies
 * rekent alleen met wat wél gemeten is, en noemt de regel die de doorslag gaf.
 */
import type { GameConfig } from './config';
import type { Meting2, PersonaMeting } from './meting2';

export type Kleur = 'groen' | 'oranje' | 'rood' | 'grijs';
export type Meetbaarheid = 'ja' | 'deels' | 'nee';
export type Eindadvies = 'aanbevolen' | 'aanbevolen met kanttekening' | 'afgeraden';

/**
 * Alle grenzen op één plek. De getallen komen uit meting 1 en 2; waar er geen
 * meting onder ligt staat het erbij.
 */
export const DREMPELS = {
  /** §1 — een keten die altijd verhardt is geen beslissing, een keten die nooit
   *  verhardt ook niet. Daartussen moet het spannend zijn. */
  contested: { onder: 50, boven: 80 },
  /** §1 en §6 — allebei de wegen naar punten moeten leven. */
  puntenSplitMin: 15,
  /** §1 en §6 — hij moet de route-winst bespelen, maar het mag niet zijn hele spel zijn. */
  routeWinst: { onder: 5, boven: 30 },
  /** §2 — proxy, geen meting: boven dit aantal regels tegelijk aan wordt het
   *  spel moeilijk uit te leggen. Negen is een schatting, geen bevinding. */
  maxRegels: 9,
  /** §3 en §5 — onder deze comeback-kans is de partij halverwege al beslist. */
  comebackMin: 40,
  /** §4 — korter is een sprint, langer is uitzitten. Uit §3.7 van de handoff. */
  duur: { onder: 12, boven: 25 },
  /** §4 — aandeel partijen korter dan acht beurten. */
  sprintsMax: 2,
  /** §4 — partijen waarin het bord stil kwam te staan. */
  klem: { groen: 10, oranje: 20 },
  /** §5 — minder wisselingen van de leiding en het is een wegloper. */
  wisselsMin: 1.0,
  /** §6 — hij moet meer dan één weg naar de winst bespelen. */
  wegenMin: 2,
  wegAandeelMax: 85,
  /** §8 — hoeveel de winstkans mag meebewegen met de persona, in punten. */
  spreiding: { groen: 5, oranje: 10 },
} as const;

export interface Signaal {
  naam: string;
  waarde: string;
  kleur: Kleur;
}

export interface Oordeel {
  nr: number;
  stelregel: string;
  meetbaar: Meetbaarheid;
  kleur: Kleur;
  /** één zin, met het getal erin */
  reden: string;
  signalen: Signaal[];
}

export interface Advies {
  eind: Eindadvies;
  /** welke stelregel het eindadvies bepaalde */
  bepalend: string;
  oordelen: Oordeel[];
  /** de regels die op dit moment aan staan — de proxy voor stelregel 2 */
  actieveRegels: string[];
}

const ERGER: Record<Kleur, number> = { groen: 0, grijs: 0, oranje: 1, rood: 2 };
const slechtste = (kleuren: Kleur[]): Kleur =>
  kleuren.filter((k) => k !== 'grijs').reduce<Kleur>((a, b) => (ERGER[b] > ERGER[a] ? b : a), 'groen');

const pct = (x: number) => `${x.toFixed(0)}%`;
const band = (x: number, onder: number, boven: number): Kleur =>
  x >= onder && x <= boven ? 'groen' : 'oranje';
const minstens = (x: number, grens: number): Kleur => (x >= grens ? 'groen' : 'oranje');

/**
 * Welke regels staan er aan? Dit is de proxy voor stelregel 2: hoe meer
 * gelijktijdige regels, hoe zwaarder het spel te leren is.
 */
export function actieveRegels(cfg: GameConfig): string[] {
  const uit: string[] = [];
  if (cfg.harvest) uit.push('oogsten');
  if (cfg.feed) uit.push('elke hap voedt haar');
  if (cfg.afslag.omsingeling.on) uit.push('omsingeling');
  if (cfg.afslag.stilstand.on) uit.push('stilstand');
  if (cfg.afslag.hongerVoorbij.on) uit.push('honger voorbij');
  if (cfg.spoorVreten !== 'alles') uit.push(`spoorvreten: ${cfg.spoorVreten}`);
  if (cfg.verharden.on) uit.push(`verharden (K ${cfg.verharden.K})`);
  if (cfg.verzilveren.on) uit.push(`verzilveren (M ${cfg.verzilveren.M})`);
  if (cfg.oversteek.on) {
    uit.push('de Oversteek');
    if (cfg.oversteek.hof) uit.push('hof rond het Oog');
    if (cfg.oversteek.maxSprong > 0) uit.push(`pad springt ${cfg.oversteek.maxSprong}`);
    if (cfg.oversteek.onbereikbaar !== 'doorspelen') {
      uit.push(`onbereikbaar: ${cfg.oversteek.onbereikbaar}`);
    }
  }
  return uit;
}

export function beoordeel(
  m: Meting2,
  cfg: GameConfig,
  personas?: PersonaMeting,
): Advies {
  const regels = actieveRegels(cfg);
  const oordelen: Oordeel[] = [];

  // ---- 1 · Elke beurt een betekenisvolle beslissing -----------------------
  {
    const contested = band(m.verhardPct, DREMPELS.contested.onder, DREMPELS.contested.boven);
    const splitOk =
      m.losPct >= DREMPELS.puntenSplitMin && 100 - m.losPct >= DREMPELS.puntenSplitMin;
    const stilstandAan = cfg.afslag.stilstand.on;
    const signalen: Signaal[] = [
      {
        naam: 'ketens die verharden',
        waarde: `${pct(m.verhardPct)} van ${m.ketensGestart.toFixed(1)} per partij`,
        kleur: contested,
      },
      {
        naam: 'punten los / uit ketens',
        waarde: `${pct(m.losPct)} / ${pct(100 - m.losPct)}`,
        kleur: splitOk ? 'groen' : 'oranje',
      },
      {
        naam: 'route-winst',
        waarde: pct(m.blokkadePct),
        kleur: band(m.blokkadePct, DREMPELS.routeWinst.onder, DREMPELS.routeWinst.boven),
      },
    ];
    if (stilstandAan) {
      signalen.push({
        naam: 'stilstand gebruikt',
        waarde: `${pct(m.stilstandPct)} van de partijen`,
        kleur: m.stilstandPct > 0 ? 'groen' : 'oranje',
      });
    }
    const kleur = slechtste(signalen.map((s) => s.kleur));
    oordelen.push({
      nr: 1,
      stelregel: 'Elke beurt een betekenisvolle beslissing',
      meetbaar: 'deels',
      kleur,
      reden:
        kleur === 'groen'
          ? `${pct(m.verhardPct)} van de ketens haalt de verharding en de punten komen van twee kanten (${pct(m.losPct)} los).`
          : contested !== 'groen'
            ? `${pct(m.verhardPct)} van de ketens verhardt — buiten de band van ${DREMPELS.contested.onder} tot ${DREMPELS.contested.boven}%, dus verharden is ${m.verhardPct > DREMPELS.contested.boven ? 'te makkelijk' : 'te moeilijk'}.`
            : !splitOk
              ? `De punten komen vrijwel van één kant: ${pct(m.losPct)} los tegen ${pct(100 - m.losPct)} uit ketens.`
              : `De route-winst staat op ${pct(m.blokkadePct)}, buiten de band van ${DREMPELS.routeWinst.onder} tot ${DREMPELS.routeWinst.boven}%.`,
      signalen,
    });
  }

  // ---- 2 · Makkelijk leren, moeilijk meesteren ----------------------------
  {
    const teveel = regels.length > DREMPELS.maxRegels;
    oordelen.push({
      nr: 2,
      stelregel: 'Makkelijk leren, moeilijk meesteren',
      meetbaar: 'nee',
      kleur: 'grijs',
      reden: teveel
        ? `Aan tafel te toetsen. Wel een waarschuwing: er staan ${regels.length} regels tegelijk aan, boven de ${DREMPELS.maxRegels} die nog uit te leggen zijn.`
        : `Aan tafel te toetsen. Er staan ${regels.length} regels aan; dat blijft binnen wat uit te leggen is.`,
      signalen: [
        {
          naam: 'regels tegelijk aan',
          waarde: String(regels.length),
          kleur: teveel ? 'oranje' : 'groen',
        },
      ],
    });
  }

  // ---- 3 · Geen dode tijd -------------------------------------------------
  {
    const comeback = minstens(m.comebackPct, DREMPELS.comebackMin);
    const signalen: Signaal[] = [
      { naam: 'comebacks', waarde: pct(m.comebackPct), kleur: comeback },
      {
        naam: 'elke hap voedt haar',
        waarde: cfg.feed ? 'aan' : 'uit',
        kleur: cfg.feed ? 'groen' : 'oranje',
      },
    ];
    const kleur = slechtste(signalen.map((s) => s.kleur));
    oordelen.push({
      nr: 3,
      stelregel: 'Geen dode tijd',
      meetbaar: 'deels',
      kleur,
      reden:
        comeback === 'groen' && cfg.feed
          ? `${pct(m.comebackPct)} van de beslíste partijen wordt gewonnen door de kant die halverwege achterstond.`
          : comeback !== 'groen'
            ? `Maar ${pct(m.comebackPct)} comebacks, onder de ${DREMPELS.comebackMin}% waaronder de partij halverwege al beslist is.`
            : 'De voeding staat uit: verzwelgen levert haar niets meer op, en zijn beurt doet niets voor haar.',
      signalen,
    });
  }

  // ---- 4 · Spanningsboog naar climax --------------------------------------
  {
    const duur = band(m.medianDuur, DREMPELS.duur.onder, DREMPELS.duur.boven);
    const sprintPct = (100 * m.sprints) / Math.max(1, m.n);
    const sprint: Kleur = sprintPct <= DREMPELS.sprintsMax ? 'groen' : 'rood';
    const klem: Kleur =
      m.vastlopers <= DREMPELS.klem.groen
        ? 'groen'
        : m.vastlopers <= DREMPELS.klem.oranje
          ? 'oranje'
          : 'rood';
    const signalen: Signaal[] = [
      { naam: 'mediane duur', waarde: `${m.medianDuur} beurten`, kleur: duur },
      { naam: 'sprints < 8 beurten', waarde: pct(sprintPct), kleur: sprint },
      { naam: 'vastlopers', waarde: pct(m.vastlopers), kleur: klem },
    ];
    const kleur = slechtste(signalen.map((s) => s.kleur));
    oordelen.push({
      nr: 4,
      stelregel: 'Spanningsboog naar een climax',
      meetbaar: 'ja',
      kleur,
      reden:
        kleur === 'groen'
          ? `Mediaan ${m.medianDuur} beurten, ${pct(sprintPct)} sprints en ${pct(m.vastlopers)} vastlopers — alles binnen de band.`
          : klem !== 'groen'
            ? `${pct(m.vastlopers)} vastlopers, boven de ${klem === 'rood' ? DREMPELS.klem.oranje : DREMPELS.klem.groen}%-grens.`
            : sprint !== 'groen'
              ? `${pct(sprintPct)} van de partijen is binnen acht beurten voorbij, boven de ${DREMPELS.sprintsMax}%.`
              : `Mediaan ${m.medianDuur} beurten, buiten de band van ${DREMPELS.duur.onder} tot ${DREMPELS.duur.boven}.`,
      signalen,
    });
  }

  // ---- 5 · Geen wegloper --------------------------------------------------
  {
    const wissels = minstens(m.gemWissels, DREMPELS.wisselsMin);
    const comeback = minstens(m.comebackPct, DREMPELS.comebackMin);
    const signalen: Signaal[] = [
      { naam: 'leiderswissels', waarde: m.gemWissels.toFixed(1), kleur: wissels },
      { naam: 'comebacks', waarde: pct(m.comebackPct), kleur: comeback },
    ];
    const kleur = slechtste(signalen.map((s) => s.kleur));
    oordelen.push({
      nr: 5,
      stelregel: 'Geen wegloper',
      meetbaar: 'ja',
      kleur,
      reden:
        kleur === 'groen'
          ? `${m.gemWissels.toFixed(1)} leiderswissels per partij en ${pct(m.comebackPct)} comebacks.`
          : wissels !== 'groen'
            ? `${m.gemWissels.toFixed(1)} leiderswissels per partij, onder de ${DREMPELS.wisselsMin.toFixed(1)}: de leiding wisselt te weinig.`
            : `Maar ${pct(m.comebackPct)} comebacks, onder de ${DREMPELS.comebackMin}%.`,
      signalen,
    });
  }

  // ---- 6 · Meerdere wegen naar de winst -----------------------------------
  {
    const splitOk =
      m.losPct >= DREMPELS.puntenSplitMin && 100 - m.losPct >= DREMPELS.puntenSplitMin;
    const wegenOk = m.wegenBespeeld >= DREMPELS.wegenMin;
    const dominant = m.grootsteWeg > DREMPELS.wegAandeelMax;
    const wegNamen = (Object.entries(m.wegen) as Array<[string, number]>)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
    const signalen: Signaal[] = [
      {
        naam: 'haar wegen: los / keten',
        waarde: `${pct(m.losPct)} / ${pct(100 - m.losPct)}`,
        kleur: splitOk ? 'groen' : 'oranje',
      },
      {
        naam: 'zijn wegen bespeeld',
        waarde: wegNamen || 'hij won niet',
        kleur: wegenOk ? 'groen' : 'oranje',
      },
      {
        naam: 'grootste weg',
        waarde: pct(m.grootsteWeg),
        kleur: dominant ? 'oranje' : 'groen',
      },
    ];
    const kleur = slechtste(signalen.map((s) => s.kleur));
    oordelen.push({
      nr: 6,
      stelregel: 'Meerdere wegen naar de winst',
      meetbaar: 'ja',
      kleur,
      reden:
        kleur === 'groen'
          ? `Zij haalt ${pct(m.losPct)} van haar punten los en de rest uit ketens; hij bespeelt ${m.wegenBespeeld} wegen.`
          : !splitOk
            ? `Haar punten komen vrijwel van één kant: ${pct(m.losPct)} los.`
            : !wegenOk
              ? `Hij bespeelt maar ${m.wegenBespeeld} weg naar de winst.`
              : `Eén weg neemt ${pct(m.grootsteWeg)} van zijn winsten, boven de ${DREMPELS.wegAandeelMax}%.`,
      signalen,
    });
  }

  // ---- 7 · Thema en mechaniek versterken elkaar ---------------------------
  oordelen.push({
    nr: 7,
    stelregel: 'Thema en mechaniek versterken elkaar',
    meetbaar: 'nee',
    kleur: 'grijs',
    reden:
      'Aan tafel te toetsen. Geen batch laat zien of het verharden van een keten ' +
      'voelt als wat het voorstelt.',
    signalen: [],
  });

  // ---- 8 · Herspeelbaarheid ----------------------------------------------
  {
    if (!personas) {
      oordelen.push({
        nr: 8,
        stelregel: 'Herspeelbaarheid',
        meetbaar: 'deels',
        kleur: 'grijs',
        reden:
          'Eén persona — beperkt zicht. Draai de batch over alle drie de ' +
          'Nexus-persona’s om te zien hoeveel de winstkans meebeweegt.',
        signalen: [],
      });
    } else {
      const s = personas.spreiding;
      const kleur: Kleur =
        s <= DREMPELS.spreiding.groen
          ? 'groen'
          : s <= DREMPELS.spreiding.oranje
            ? 'oranje'
            : 'rood';
      const per = Object.entries(personas.perPersona)
        .map(([naam, mm]) => `${naam} ${pct(mm!.verdeling.laatste)}`)
        .join(', ');
      oordelen.push({
        nr: 8,
        stelregel: 'Herspeelbaarheid',
        meetbaar: 'deels',
        kleur,
        reden:
          kleur === 'groen'
            ? `Haar winstkans beweegt ${s.toFixed(0)} punten mee met de persona (${per}) — binnen de ${DREMPELS.spreiding.groen}.`
            : `Haar winstkans beweegt ${s.toFixed(0)} punten mee met de persona (${per}): de uitkomst hangt aan hoe goed er gespeeld wordt.`,
        signalen: [
          { naam: 'spreiding over persona’s', waarde: `${s.toFixed(0)} punten`, kleur },
        ],
      });
    }
  }

  // ---- 9 · Bord in één oogopslag leesbaar --------------------------------
  oordelen.push({
    nr: 9,
    stelregel: 'Bord in één oogopslag leesbaar',
    meetbaar: 'nee',
    kleur: 'grijs',
    reden:
      'Aan tafel te toetsen. Speel een partij af in het lab en kijk of je ijl, ' +
      'vat en verhard uit een ooghoek uit elkaar houdt.',
    signalen: [],
  });

  // ---- eindadvies ---------------------------------------------------------
  const meetbaar = oordelen.filter((o) => o.kleur !== 'grijs');
  let ergste: Kleur = 'groen';
  let bepalend = 'alle meetbare stelregels staan op groen';
  for (const o of meetbaar) {
    if (ERGER[o.kleur] > ERGER[ergste]) {
      ergste = o.kleur;
      bepalend = `stelregel ${o.nr} · ${o.stelregel}`;
    }
  }
  // de proxy van stelregel 2 kan het advies niet afkeuren, wel van groen halen
  if (ergste === 'groen' && regels.length > DREMPELS.maxRegels) {
    ergste = 'oranje';
    bepalend = `stelregel 2 · ${regels.length} regels tegelijk aan`;
  }

  return {
    eind:
      ergste === 'rood'
        ? 'afgeraden'
        : ergste === 'oranje'
          ? 'aanbevolen met kanttekening'
          : 'aanbevolen',
    bepalend,
    oordelen,
    actieveRegels: regels,
  };
}
