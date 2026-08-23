/**
 * De speelbare modus.
 *
 * Dit is het enige stuk van het lab dat een vraag beantwoordt die geen bot kan
 * beantwoorden: houd je je adem in bij de derde tegel? Daarom staat hier alles
 * op één ding — dat je ziet wat je mág, en waarom je iets niet mag.
 *
 * De regels komen uit `engine/zetten.ts` en het verloop uit `engine/sessie.ts`.
 * Hier staat geen enkele regel opnieuw opgeschreven; dit bestand is alleen de
 * hand op de tafel.
 */
import type { GameConfig, NexusPersona, LaatstePersona } from '../engine/config';
import { Sessie, type Bestuur, type Zijde } from '../engine/sessie';
import { waaromNiet, zetCellen, zetTekst, type Zet } from '../engine/zetten';
import { ALL_KEYS, type CellKey } from '../engine/hex';
import type { GameEvent, Snapshot, TileType } from '../engine/types';
import type { Keuze } from './board';
import { el } from './panels';

const IDX_VAN = new Map(ALL_KEYS.map((k, i) => [k, i]));
const idx = (k: CellKey): number => IDX_VAN.get(k) ?? -1;

export interface SpeelHaken {
  /** de tellers bovenin bijwerken */
  tellers: (snap: Snapshot) => void;
  /** de regel onderin het lab */
  verhaal: (tekst: string, wie: GameEvent['actor'], beurt: number) => void;
  /** de uitslagbanner in het bordvak */
  uitslag: (tekst: string | null, klasse: string) => void;
  /** hoeveel zetten per seconde de bot afspeelt */
  tempo: () => number;
  /** het logboek opnieuw opbouwen, in het meegegeven vak */
  logboek: (
    vak: HTMLElement,
    events: GameEvent[],
    spring: (i: number) => void,
  ) => (huidig: number) => void;
  /** waar hex `i` op het canvas ligt */
  plek: (i: number) => { x: number; y: number };
}

interface Opzet {
  vorm: 'botspel' | 'hotseat';
  mijnKant: Zijde;
  nexusPersona: NexusPersona;
  laatstePersona: LaatstePersona;
  seed: number;
}

const KANTNAAM: Record<Zijde, string> = { laatste: 'de Laatste', nexus: 'de Nexus' };

/**
 * Hoe een zet in de lijst heet. Reiken en vatten zijn dezelfde handeling in de
 * code maar niet in het hoofd van een speler, dus die krijgen hier hun eigen
 * naam — net als de sprong over de rand.
 */
function zetGroep(z: Zet): string {
  switch (z.soort) {
    case 'reiken':
      return z.kosten > 1 ? 'over de rand' : z.wordt === 'vat' ? 'vatten' : 'reiken';
    case 'stap':
      return 'stappen';
    case 'stilstand':
      return 'stilstaan';
    case 'hongerVoorbij':
      return 'honger voorbij';
    default:
      return z.soort;
  }
}

/** Alles wat het bord van één beeld moet weten. */
export interface Speelbeeld {
  snap: Snapshot;
  seat: number;
  tiles: Array<TileType | null>;
  keuzes: Keuze[];
  gloed: number[];
  markeer: number[];
  wie: GameEvent['actor'];
}

const PERSONA_UITLEG: Record<string, string> = {
  gretig: 'pakt wat er ligt — de bot uit v5',
  defensief: 'houdt zijn stelling en breekt liever dan hij eet',
  gemengd: 'wisselt tussen pakken en breken',
  beam: 'zoekt een paar beurten vooruit — traag, maar sterk',
};

export class Speelmodus {
  actief = false;
  private sessie: Sessie | null = null;
  private opzet: Opzet;
  private hoverCel = -1;
  private gekozenCel = -1;

  /** de beurt van de bot, die zichtbaar afspeelt */
  private botFilm: GameEvent[] = [];
  private botI = 0;
  private botTik = 0;

  private ververslogboek: (huidig: number) => void = () => {};
  private paneel: HTMLElement;
  private logvak = el('div', { class: 'speellog' });
  private menu: HTMLElement;

  constructor(
    private vak: HTMLElement,
    private cfg: GameConfig,
    private haken: SpeelHaken,
    bordvak: HTMLElement,
  ) {
    this.opzet = {
      vorm: 'botspel',
      mijnKant: 'laatste',
      nexusPersona: cfg.nexusBot === 'beam' ? 'gemengd' : cfg.nexusBot,
      laatstePersona: cfg.laatsteBot,
      seed: 1,
    };
    this.paneel = el('div');
    this.menu = el('div', { class: 'keuzemenu', hidden: 'hidden' });
    bordvak.append(this.menu);
    this.vak.replaceChildren(this.paneel, this.logvak);
    this.toonOpzet();
  }

  // -------------------------------------------------------------- de opzet

  private toonOpzet(): void {
    this.logvak.replaceChildren();
    const o = this.opzet;
    const groep = el('div', { class: 'groep' }, [
      el('h3', {}, ['Zelf spelen']),
      el('p', { class: 'bij' }, [
        'De partij loopt met de knoppen die nu onder "knoppen" staan. Alles wat ' +
          'je mag lichtte op; wat je niet mag vertelt bij het aanwijzen waarom niet.',
      ]),
    ]);

    const kies = <T extends string>(
      label: string,
      opties: Array<[T, string]>,
      nu: T,
      zet: (v: T) => void,
    ) => {
      const rij = el('div', { class: 'keuzerij' });
      for (const [waarde, naam] of opties) {
        const b = el('button', { class: 'knop keuze' + (waarde === nu ? ' aan' : '') }, [naam]);
        b.onclick = () => {
          zet(waarde);
          this.toonOpzet();
        };
        rij.append(b);
      }
      return el('div', { class: 'regel staand' }, [el('label', {}, [label]), rij]);
    };

    groep.append(
      kies<'botspel' | 'hotseat'>(
        'tegen wie',
        [
          ['botspel', 'tegen de bot'],
          ['hotseat', 'met z’n tweeën'],
        ],
        o.vorm,
        (v) => (o.vorm = v),
      ),
    );

    if (o.vorm === 'botspel') {
      groep.append(
        kies<Zijde>(
          'jij speelt',
          [
            ['laatste', 'de Laatste'],
            ['nexus', 'de Nexus'],
          ],
          o.mijnKant,
          (v) => (o.mijnKant = v),
        ),
      );
      if (o.mijnKant === 'laatste') {
        groep.append(
          kies<NexusPersona>(
            'de bot speelt',
            [
              ['gretig', 'gretig'],
              ['gemengd', 'gemengd'],
              ['defensief', 'defensief'],
              ['beam', 'zoekend'],
            ],
            o.nexusPersona,
            (v) => (o.nexusPersona = v),
          ),
          el('p', { class: 'bij klein' }, [PERSONA_UITLEG[o.nexusPersona]]),
        );
      } else {
        groep.append(
          kies<LaatstePersona>(
            'de bot speelt',
            [
              ['beam', 'zoekend'],
              ['gemengd', 'gemengd'],
              ['gretig', 'gretig'],
              ['defensief', 'defensief'],
            ],
            o.laatstePersona,
            (v) => (o.laatstePersona = v),
          ),
          el('p', { class: 'bij klein' }, [PERSONA_UITLEG[o.laatstePersona]]),
        );
      }
    }

    const seed = el('input', { type: 'number', min: '0', step: '1' });
    seed.value = String(o.seed);
    seed.oninput = () => (o.seed = Number(seed.value) || 0);
    groep.append(el('div', { class: 'regel' }, [el('label', {}, ['seed']), seed]));

    const start = el('button', { class: 'knop startknop' }, ['begin de partij']);
    start.onclick = () => this.begin();
    groep.append(start);

    this.paneel.replaceChildren(groep);
  }

  // ------------------------------------------------------------ de partij

  private begin(): void {
    const o = this.opzet;
    const bestuur: Record<Zijde, Bestuur> =
      o.vorm === 'hotseat'
        ? { laatste: 'mens', nexus: 'mens' }
        : o.mijnKant === 'laatste'
          ? { laatste: 'mens', nexus: 'bot' }
          : { laatste: 'bot', nexus: 'mens' };

    const cfg: GameConfig = {
      ...this.cfg,
      nexusBot: o.nexusPersona,
      laatsteBot: o.laatstePersona,
    };
    this.sessie = new Sessie({ cfg, seed: o.seed, bestuur });
    this.actief = true;
    document.getElementById('lab')?.classList.add('speelt');
    this.gekozenCel = -1;
    this.botFilm = [];
    this.botI = 0;
    this.haken.uitslag(null, '');
    this.ververs();
  }

  stop(): void {
    this.actief = false;
    document.getElementById('lab')?.classList.remove('speelt');
    this.sessie = null;
    this.menu.hidden = true;
    this.toonOpzet();
  }

  // ------------------------------------------------------------- tekenlus

  /** Door de tekenlus van het lab aangeroepen. Geeft terug wat het bord moet tonen. */
  frame(t: number): Speelbeeld | null {
    const s = this.sessie;
    if (!s) return null;
    const vast = {
      seat: idx(s.g.seat),
      tiles: ALL_KEYS.map((k) => s.g.tileOf(k)),
    };

    // de beurt van de bot speelt zichtbaar af, met de bestaande replay-stappen
    if (this.botFilm.length) {
      const perSec = Math.max(1, this.haken.tempo());
      if (t - this.botTik > 1000 / perSec) {
        this.botTik = t;
        this.botI += 1;
        if (this.botI >= this.botFilm.length) {
          this.botFilm = [];
          this.botI = 0;
          this.ververs();
        } else {
          this.toonGebeurtenis(this.botFilm[this.botI]);
        }
      }
      if (this.botFilm.length) {
        const ev = this.botFilm[Math.min(this.botI, this.botFilm.length - 1)];
        return { ...vast, snap: ev.after, keuzes: [], gloed: [], markeer: ev.cells, wie: ev.actor };
      }
    }

    const zetten = s.mensAanZet ? s.zetten() : [];
    const keuzes: Keuze[] = [];
    for (const z of zetten) {
      for (const c of zetCellen(z)) keuzes.push({ cel: idx(c), soort: z.soort });
    }
    const gloed = this.gloeiendeCellen(zetten);
    const laatste = s.events[s.events.length - 1];
    return {
      ...vast,
      snap: s.g.snapshot(),
      keuzes,
      gloed,
      markeer: laatste ? laatste.cells : [],
      wie: laatste ? laatste.actor : 'systeem',
    };
  }

  private gloeiendeCellen(zetten: Zet[]): number[] {
    const doel = this.gekozenCel >= 0 ? this.gekozenCel : this.hoverCel;
    if (doel < 0) return [];
    const uit = new Set<number>();
    for (const z of zetten) {
      const cellen = zetCellen(z).map(idx);
      if (cellen.includes(doel)) for (const c of cellen) uit.add(c);
    }
    return [...uit];
  }

  // ------------------------------------------------------------- bediening

  wijs(i: number): void {
    this.hoverCel = i;
  }

  /** Wat er in de tooltip moet staan bij de tegel waar de muis boven hangt. */
  tip(i: number): string {
    const s = this.sessie;
    if (!s || !s.mensAanZet || i < 0) return '';
    const zetten = s.zetten().filter((z) => zetCellen(z).map(idx).includes(i));
    if (zetten.length) return zetten.map(zetTekst).join('  ·  ');
    const reden = waaromNiet(s.g, s.aanZet!, ALL_KEYS[i]);
    return reden ? `kan niet — ${reden}` : '';
  }

  klik(i: number): void {
    const s = this.sessie;
    if (!s || !s.mensAanZet || this.botFilm.length) return;
    const zetten = s.zetten().filter((z) => zetCellen(z).map(idx).includes(i));
    if (!zetten.length) {
      this.menu.hidden = true;
      this.gekozenCel = -1;
      return;
    }
    if (zetten.length === 1) {
      this.voer(zetten[0]);
      return;
    }
    this.gekozenCel = i;
    this.toonMenu(i, zetten);
  }

  private toonMenu(i: number, zetten: Zet[]): void {
    this.menu.replaceChildren(
      el('div', { class: 'km-kop' }, ['wat doe je hier?']),
      ...zetten.map((z) => {
        const b = el('button', { class: `knop km-zet ${z.soort}` }, [zetTekst(z)]);
        b.onclick = () => this.voer(z);
        return b;
      }),
    );
    const p = this.haken.plek(i);
    this.menu.style.left = `${p.x}px`;
    this.menu.style.top = `${p.y}px`;
    this.menu.hidden = false;
  }

  private voer(z: Zet): void {
    const s = this.sessie;
    if (!s) return;
    if (z.soort === 'stilstand') {
      const ok = window.confirm(
        'Stilstaan kost je hele beurt: geen stap, geen hap, alleen één steen ' +
          'van deze tegel af.\n\nHele beurt offeren?',
      );
      if (!ok) return;
    }
    this.menu.hidden = true;
    this.gekozenCel = -1;
    s.doe(z);
    this.ververs();
  }

  /** De beurt afsluiten — de spatiebalk. */
  beurtAf(): void {
    const s = this.sessie;
    if (!s || !s.mensAanZet || this.botFilm.length) return;
    this.menu.hidden = true;
    this.gekozenCel = -1;
    s.beurtAf();
    this.ververs();
  }

  /** Eén handeling terug — de z. */
  terug(): void {
    const s = this.sessie;
    if (!s || !s.kanTerug() || this.botFilm.length) return;
    this.menu.hidden = true;
    this.gekozenCel = -1;
    s.terug();
    this.ververs();
  }

  toets(e: KeyboardEvent): boolean {
    if (!this.actief || !this.sessie) return false;
    if (e.key === ' ') {
      e.preventDefault();
      this.beurtAf();
      return true;
    }
    if (e.key === 'z' || e.key === 'Z') {
      this.terug();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------- paneel

  /** Alles opnieuw tekenen, en zo nodig de bot laten spelen. */
  private ververs(): void {
    const s = this.sessie;
    if (!s) return;

    if (s.uitslag) {
      this.toonEinde();
      this.bouwPaneel();
      return;
    }
    if (!s.mensAanZet) {
      const film = s.speelBot();
      if (film.length) {
        this.botFilm = film;
        this.botI = 0;
        this.botTik = 0;
        this.toonGebeurtenis(film[0]);
      } else if (!s.uitslag && !s.mensAanZet) {
        // de bot had niets te doen: meteen door
        this.ververs();
        return;
      }
    }
    const laatste = s.events[s.events.length - 1];
    if (laatste && !this.botFilm.length) this.toonGebeurtenis(laatste);
    this.haken.tellers(s.g.snapshot());
    this.bouwPaneel();
    if (s.uitslag) this.toonEinde();
  }

  private toonGebeurtenis(ev: GameEvent): void {
    this.haken.verhaal(ev.text, ev.actor, ev.after.turn);
    this.haken.tellers(ev.after);
  }

  private toonEinde(): void {
    const s = this.sessie!;
    const u = s.uitslag!;
    const klas =
      u === 'laatste' ? 'zij' : u === 'nexus' ? 'hij' : u === 'niets' ? 'niets' : 'klem';
    this.haken.uitslag(s.events[s.events.length - 1]?.text ?? '', klas);
  }

  private bouwPaneel(): void {
    const s = this.sessie!;
    const groep = el('div', { class: 'groep' });

    // ---- wie is er aan zet
    if (s.uitslag) {
      groep.append(this.eindkaart());
    } else {
      const kant = s.aanZet!;
      const mens = s.bestuur[kant] === 'mens';
      const kop = el('div', { class: `aanzet ${kant === 'laatste' ? 'zij' : 'hij'}` }, [
        el('div', { class: 'az-beurt' }, [`beurt ${s.g.turn}`]),
        el('div', { class: 'az-wie' }, [KANTNAAM[kant]]),
        el('div', { class: 'az-wat' }, [
          mens ? 'jij bent aan zet' : this.botFilm.length ? 'speelt…' : 'wacht',
        ]),
      ]);
      // de handelingenteller: drie pitten die opgaan
      const totaal = kant === 'laatste' ? s.cfg.acts : s.cfg.nexusMoves;
      const over = s.restant();
      const rail = el('div', { class: 'handelingen' });
      for (let k = 0; k < totaal; k++) {
        rail.append(el('i', { class: k < totaal - over ? 'op' : '' }));
      }
      kop.append(
        rail,
        el('div', { class: 'az-telling' }, [
          `${totaal - over} / ${totaal} ${totaal === 1 ? 'handeling' : 'handelingen'}`,
        ]),
      );
      groep.append(kop);

      if (mens) groep.append(this.zetlijst(s));
    }

    // ---- knoppen
    const knoppen = el('div', { class: 'speelknoppen' });
    const af = el('button', { class: 'knop' }, ['beurt af  ␣']);
    af.onclick = () => this.beurtAf();
    af.toggleAttribute('disabled', !s.mensAanZet || Boolean(s.uitslag));
    const terug = el('button', { class: 'knop' }, ['terug  z']);
    terug.onclick = () => this.terug();
    terug.toggleAttribute('disabled', !s.kanTerug());
    const opnieuw = el('button', { class: 'knop stil' }, ['andere partij']);
    opnieuw.onclick = () => this.stop();
    knoppen.append(af, terug, opnieuw);
    groep.append(knoppen);

    this.paneel.replaceChildren(groep);
    this.ververslogboek = this.haken.logboek(this.logvak, s.events, () => {});
    this.ververslogboek(s.events.length - 1);
  }

  /** De zetten als lijst, zodat je ze ook zonder het bord kunt lezen. */
  private zetlijst(s: Sessie): HTMLElement {
    const zetten = s.zetten();
    if (!zetten.length) {
      return el('p', { class: 'bij' }, [
        s.restant() > 0
          ? 'Er is niets meer te doen deze beurt.'
          : 'Je handelingen zijn op — sluit de beurt af met de spatiebalk.',
      ]);
    }
    const perGroep = new Map<string, Zet[]>();
    for (const z of zetten) {
      const naam = zetGroep(z);
      const lijst = perGroep.get(naam) ?? [];
      lijst.push(z);
      perGroep.set(naam, lijst);
    }
    const vak = el('div', { class: 'zetkeuzes' });
    for (const [naam, lijst] of perGroep) {
      const enkel = lijst.length === 1;
      const rij = el('div', { class: `zetgroep ${lijst[0].soort}${enkel ? ' enkel' : ''}` }, [
        el('div', { class: 'zg-kop' }, [enkel ? naam : `${naam} · ${lijst.length}`]),
        el('div', { class: 'zg-uitleg' }, [zetTekst(lijst[0])]),
      ]);
      // aanwijzen laat op het bord zien waar het over gaat; één zet mag je
      // hier ook meteen doen, dan hoef je niet naar de tegel te zoeken
      rij.onmouseenter = () => (this.gekozenCel = idx(zetCellen(lijst[0])[0]));
      rij.onmouseleave = () => (this.gekozenCel = -1);
      if (enkel) rij.onclick = () => this.voer(lijst[0]);
      vak.append(rij);
    }
    return vak;
  }

  private eindkaart(): HTMLElement {
    const s = this.sessie!;
    const u = s.uitslag!;
    const g = s.g;
    const kant = u === 'laatste' ? 'zij' : u === 'nexus' ? 'hij' : 'niets';
    return el('div', { class: `eindkaart ${kant}` }, [
      el('div', { class: 'ek-woord' }, [
        u === 'laatste'
          ? 'De Laatste haalt het'
          : u === 'nexus'
            ? 'De Nexus haalt het'
            : u === 'niets'
              ? 'Er is niets meer'
              : 'Het plafond',
      ]),
      el('div', { class: 'ek-cijfers' }, [
        `${g.pileL} van ${s.cfg.needL} sporen · ${g.pileN} van ${s.cfg.needN} tegels · ` +
          `${g.turn} beurten · ${g.alive.size} tegels over`,
      ]),
      el('p', { class: 'ek-duiding' }, [duiding(s)]),
    ]);
  }
}

/** Eén regel over hoe het liep — geen samenvatting, een lezing. */
function duiding(s: Sessie): string {
  const g = s.g;
  const u = s.uitslag;
  if (u === 'laatste') {
    const uitKetens = g.ketenPunten > g.losPunten;
    return uitKetens
      ? `Ze won op ketens: ${g.ketenPunten} van haar punten kwamen uit verzilverde ketens, ` +
          `${g.losPunten} uit los doorgeven. Het bouwwerk hield.`
      : `Ze won op losse sporen: ${g.losPunten} tegen ${g.ketenPunten} uit ketens. ` +
          `Snel doorgeven bleek genoeg — hij kreeg geen tijd om te breken.`;
  }
  if (u === 'nexus') {
    if (g.nexusWeg === 'insluiting') {
      return 'Hij won zonder zijn teller vol te maken: het Oog raakte ingesloten, ' +
        'en daarmee was haar oversteek weg voordat haar sporen ertoe deden.';
    }
    return g.pileL >= s.cfg.needL
      ? `Haar teller stond vol, maar de weg naar het Oog lag er niet. Hij at door ` +
          `tot zijn ${g.pileN} tegels vol waren — een ontzegde oversteek, geen verloren race.`
      : `Hij at haar voorbij: ${g.pileN} tegels tegen haar ${g.pileL} sporen. ` +
          `Ze kwam niet op tempo.`;
  }
  if (u === 'niets') {
    return 'Het bord raakte op. Niemand kwam er — het universum was eerder leeg dan beslist.';
  }
  return (
    `Het beurtenplafond kwam eerder dan een beslissing: ${g.pileL} tegen ${g.pileN}. ` +
    `Dat is de dode tijd waar de klem-metriek over gaat.`
  );
}
