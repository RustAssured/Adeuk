/**
 * ADEUK — regel-engine.
 *
 * Dit is een port van tools/v5_ref.py (dat op zijn beurt v5.py is met de
 * set-iteratievolgorde gecanoniseerd). De regels zijn *niet* herschreven: de
 * subtiliteiten waar de handoff §6 voor waarschuwt — een spoor draagt de draad,
 * de gesloten kringloop, de rand-sprong — staan hier in dezelfde vorm.
 * tests/parity.test.ts legt beide zet voor zet naast elkaar.
 *
 * Toegevoegd t.o.v. v5: een gebeurtenislogboek per handeling (voor het lab) en
 * de drie afsla-opties uit §5A, die standaard uit staan.
 */
import { MersenneTwister } from './rng';
import {
  ALL,
  ALL_KEYS,
  DIRS,
  MID_KEYS,
  dist,
  key as ckey,
  neighbours,
  unkey,
  type Axial,
  type CellKey,
} from './hex';
import { V5_CONFIG, type GameConfig } from './config';
import type { Actor, EventKind, GameEvent, GameResult, Snapshot, TileType, Uitslag } from './types';
import { laatsteBots, nexusBots } from './bots';

/** index in ALL, voor compacte snapshots en events */
export const IDX: ReadonlyMap<CellKey, number> = new Map(ALL_KEYS.map((k, i) => [k, i]));

/** Canonieke bordvolgorde — vervangt v5's afhankelijkheid van set-volgorde. */
export function order(cells: Iterable<CellKey>): CellKey[] {
  return [...cells].sort((a, b) => (IDX.get(a) ?? 1e6) - (IDX.get(b) ?? 1e6));
}

const DECK: TileType[] = [
  ...Array<TileType>(12).fill('planeet'),
  ...Array<TileType>(6).fill('bewoond'),
  ...Array<TileType>(6).fill('komeet'),
  ...Array<TileType>(6).fill('gat'),
  ...Array<TileType>(6).fill('stil'),
];

/** Menselijke namen voor in het logboek. */
export const TEGELNAAM: Record<string, string> = {
  planeet: 'een planeet',
  bewoond: 'een bewoonde wereld',
  komeet: 'een komeet',
  gat: 'een zwart gat',
  stil: 'een stil veld',
  seat: 'de Zetel',
  leeg: 'lege ruimte',
};

export class Game {
  readonly cfg: GameConfig;
  readonly seed: number;
  readonly rng: MersenneTwister;

  /** tegelsoort per hex; `null` voor de hex zonder tegel. Ligt vast na de opzet. */
  tile = new Map<CellKey, TileType | null>();
  alive = new Set<CellKey>();
  open = new Set<CellKey>();
  marks = new Set<CellKey>();
  /** stenen per hex: 0 = leeg, 1 = ijl, 2 = vat */
  w = new Map<CellKey, number>();

  seat!: CellKey;
  npos!: CellKey;

  stock: number;
  box: number;
  pileL = 0;
  pileN = 0;
  turn = 0;
  done: Uitslag | null = null;
  hist: Array<[number, number]> = [];

  /** kostenkaart die `path()` als neveneffect achterlaat — v5 doet dit ook */
  cost = new Map<CellKey, number>();
  /** het doel dat de gretige bot vasthoudt */
  goal: CellKey | null = null;
  /** sporen die hij deze beurt al van haar teller afhaalde */
  spoorAfDezeBeurt = 0;

  // --- logboek ---
  trace: boolean;
  events: GameEvent[] = [];
  private evI = 0;
  laatsteVerandering = 0;
  private vorigeSignatuur = '';

  constructor(seed: number, cfg: Partial<GameConfig> | GameConfig = {}) {
    this.cfg = { ...V5_CONFIG, ...cfg } as GameConfig;
    this.seed = seed;
    this.rng = new MersenneTwister(seed);
    this.trace = false;

    const deck = [...DECK];
    this.rng.shuffle(deck);
    // v5: dict(zip(ALL, deck)) — ALL telt 37 hexen, het spel 36 tegels.
    // De laatste hex in bordvolgorde krijgt dus géén tegel. Dat is v5-gedrag
    // en het blijft hier staan; zie het rapport in docs/BEVINDINGEN.md.
    for (let i = 0; i < ALL_KEYS.length; i++) {
      this.tile.set(ALL_KEYS[i], i < deck.length ? deck[i] : null);
    }
    this.alive = new Set(ALL_KEYS);
    this.open = new Set(MID_KEYS);

    const covered = ALL_KEYS.filter((k) => !this.open.has(k));
    this.seat = this.rng.choice(covered);
    this.open.add(this.seat);
    this.tile.set(this.seat, 'seat');

    const seatAx = unkey(this.seat);
    const pool = ALL.filter((c) => ckey(c) !== this.seat && dist(c, seatAx) >= 5).map(ckey);
    const fallback = ALL_KEYS.filter((k) => k !== this.seat);
    this.npos = this.rng.choice(pool.length ? pool : fallback);

    this.stock = this.cfg.start;
    this.box = this.cfg.total - this.cfg.start;
  }

  // ---------------------------------------------------------------- helpers

  wOf(k: CellKey): number {
    return this.w.get(k) ?? 0;
  }
  setW(k: CellKey, v: number): void {
    this.w.set(k, v);
  }
  tileOf(k: CellKey): TileType | null {
    return this.tile.get(k) ?? null;
  }
  yieldOf(k: CellKey): number {
    const t = this.tileOf(k);
    return t ? (this.cfg.yields[t] ?? 0) : 0;
  }
  /** vat = twee stenen; de Nexus komt er niet in */
  isVat(k: CellKey): boolean {
    return this.wOf(k) >= 2;
  }
  nbKeys(k: CellKey): CellKey[] {
    return neighbours(unkey(k)).map(ckey);
  }
  /** rand-zijden: buren die verzwolgen zijn (en optioneel de bordrand zelf) */
  randZijden(k: CellKey): number {
    let n = 0;
    for (const x of this.nbKeys(k)) {
      if (!IDX.has(x)) {
        if (this.cfg.afslag.omsingeling.bordrandTelt) n++;
      } else if (!this.alive.has(x)) n++;
    }
    return n;
  }

  /** substantie uit de doos halen; de kringloop is gesloten, dus max = doos */
  gain(n: number): number {
    const got = Math.min(n, this.box);
    this.box -= got;
    this.stock += got;
    return got;
  }

  /**
   * Alles wat via stenen of sporen aan de Zetel hangt.
   * Let op: sporen dragen de draad ook zonder stenen — dat is de kern van §2.
   */
  conn(): CellKey[] {
    const seen = new Set<CellKey>();
    const stk: CellKey[] = [this.seat];
    while (stk.length) {
      const c = stk.pop()!;
      if (seen.has(c) || !this.alive.has(c)) continue;
      seen.add(c);
      for (const x of this.nbKeys(c)) {
        if ((this.wOf(x) > 0 || this.marks.has(x)) && !seen.has(x) && this.alive.has(x)) {
          stk.push(x);
        }
      }
    }
    return order(seen);
  }

  /**
   * Goedkoopste route van de Zetel naar `dst`, inclusief de rand-sprong:
   * over n aaneengesloten verdwenen tegels heen kost n+2.
   * Neveneffect: `this.cost` (v5 doet hetzelfde).
   */
  path(dst: CellKey): CellKey[] | null {
    this.cost = new Map([[this.seat, 0]]);
    const prev = new Map<CellKey, CellKey | null>([[this.seat, null]]);
    const q: CellKey[] = [this.seat];
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      if (c === dst) {
        const p: CellKey[] = [];
        let cur: CellKey | null = c;
        while (cur !== null && cur !== undefined) {
          p.push(cur);
          cur = prev.get(cur) ?? null;
        }
        return p.reverse();
      }
      const ax = unkey(c);
      for (let i = 0; i < 6; i++) {
        const d = DIRS[i];
        const x = ckey([ax[0] + d[0], ax[1] + d[1]] as Axial);
        if (this.alive.has(x) && !prev.has(x) && x !== this.npos) {
          prev.set(x, c);
          this.cost.set(x, 1);
          q.push(x);
        } else if (!this.alive.has(x)) {
          let y: Axial = [ax[0] + d[0], ax[1] + d[1]];
          let gaps = 0;
          while (!this.alive.has(ckey(y)) && gaps < 4) {
            y = [y[0] + d[0], y[1] + d[1]];
            gaps++;
            if (Math.abs(y[0]) > 4 || Math.abs(y[1]) > 4) break;
          }
          const yk = ckey(y);
          if (this.alive.has(yk) && !prev.has(yk) && yk !== this.npos) {
            prev.set(yk, c);
            this.cost.set(yk, gaps + 2);
            q.push(yk);
          }
        }
      }
    }
    return null;
  }

  // ------------------------------------------------------- de Laatste

  /** Elke vat-tegel aan de draad levert; de doos is de bron, dus op is op. */
  harvest(): void {
    if (!this.cfg.harvest) return;
    let got = 0;
    const bron: number[] = [];
    for (const c of this.conn()) {
      if (c === this.seat || this.wOf(c) < 2 || this.marks.has(c)) continue;
      const y = this.yieldOf(c);
      if (y > 0) bron.push(IDX.get(c)!);
      got += y;
    }
    const kreeg = this.gain(got);
    if (this.trace && got > 0) {
      const tekort = got > kreeg ? ` (de doos gaf er maar ${kreeg})` : '';
      this.emit('oogst', 'laatste', bron, `De Laatste oogst ${got} substantie${tekort}.`, {
        stock: kreeg,
        box: -kreeg,
      });
    }
  }

  /** Eén steen langs de route leggen. Geeft terug of er iets gebeurde. */
  push(p: CellKey[]): boolean {
    const need: number[] = p.map((x) => (this.marks.has(x) ? 0 : 1));
    need[need.length - 1] = 2;
    need[0] = 0;
    for (let i = 0; i < p.length - 1; i++) {
      const t = p[i + 1];
      if (this.wOf(t) >= need[i + 1]) continue;
      const cost = this.cost.get(t) ?? 1;
      if (this.stock < cost) return false;
      this.stock -= cost;
      if (cost > 1) this.box += cost - 1; // sprongverlies keert terug naar de doos
      const na = this.wOf(t) + 1;
      this.setW(t, na);
      const wasGedekt = !this.open.has(t);
      this.open.add(t);
      if (this.trace) {
        const naam = TEGELNAAM[this.tileOf(t) ?? 'leeg'];
        const omdraai = wasGedekt ? ` en draait ${naam} om` : '';
        if (cost > 1) {
          this.emit(
            'randsprong',
            'laatste',
            [IDX.get(t)!],
            `De Laatste reikt over de rand heen${omdraai} — ${cost} substantie, ` +
              `waarvan ${cost - 1} naar de doos.`,
            { stock: -cost, box: cost - 1 },
          );
        } else {
          this.emit(
            na >= 2 ? 'vatten' : 'reiken',
            'laatste',
            [IDX.get(t)!],
            na >= 2
              ? `De Laatste vat ${naam} — de tegel oogst nu, en hij komt er niet in.`
              : `De Laatste reikt naar ${naam}${omdraai} — ijl, aanwezig maar machteloos.`,
            { stock: -cost },
          );
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Reiken zoals §2 het beschrijft: "1 steen uit voorraad op tegel naast de
   * draad", plus de rand-sprong "over n aaneengesloten verdwenen tegels heen;
   * kost n+2, alles behalve de aankomende steen keert terug naar de doos".
   *
   * Let op het verschil met `push()`. Dat is v5's benadering van dezelfde regel:
   * het zoekt de gééometrisch kortste route van de Zetel naar een doel en legt
   * een steen op het eerste gat daarin. Die route loopt vaak niet over haar
   * bestaande draad, zodat ze een tweede keten betaalt en de eerste laat
   * verzanden. Dat is de directe oorzaak van de lek uit §4. `push()` blijft
   * staan voor de v5-bots (pariteit); bots die de regel zelf volgen gebruiken
   * `reikbaar()` + `reik()`.
   *
   * Geeft per bereikbare tegel de kosten in substantie.
   */
  reikbaar(draad: readonly CellKey[] = this.conn()): Map<CellKey, number> {
    const out = new Map<CellKey, number>();
    const zet = (k: CellKey, kosten: number) => {
      if (k === this.seat || !this.alive.has(k) || this.wOf(k) >= 2) return;
      const vorig = out.get(k);
      if (vorig === undefined || kosten < vorig) out.set(k, kosten);
    };
    for (const c of draad) {
      // vatten: een tweede steen op een tegel die al van haar is
      if (this.wOf(c) === 1) zet(c, 1);
      const ax = unkey(c);
      for (const d of DIRS) {
        const buur: Axial = [ax[0] + d[0], ax[1] + d[1]];
        if (this.alive.has(ckey(buur))) {
          zet(ckey(buur), 1);
          continue;
        }
        // rand-sprong: tel de aaneengesloten verdwenen tegels in deze richting
        let y: Axial = buur;
        let gaten = 0;
        while (!this.alive.has(ckey(y)) && gaten < 4) {
          y = [y[0] + d[0], y[1] + d[1]];
          gaten++;
          if (Math.abs(y[0]) > 4 || Math.abs(y[1]) > 4) break;
        }
        if (this.alive.has(ckey(y))) zet(ckey(y), gaten + 2);
      }
    }
    return out;
  }

  /** Voert `reiken`/`vatten` uit op een tegel uit `reikbaar()`. */
  reik(t: CellKey, kosten: number): boolean {
    if (this.stock < kosten) return false;
    this.stock -= kosten;
    if (kosten > 1) this.box += kosten - 1;
    const na = this.wOf(t) + 1;
    this.setW(t, na);
    const wasGedekt = !this.open.has(t);
    this.open.add(t);
    if (this.trace) {
      const naam = TEGELNAAM[this.tileOf(t) ?? 'leeg'];
      const omdraai = wasGedekt ? ` en draait ${naam} om` : '';
      if (kosten > 1) {
        this.emit(
          'randsprong',
          'laatste',
          [IDX.get(t)!],
          `De Laatste reikt over de rand heen${omdraai} — ${kosten} substantie, ` +
            `waarvan ${kosten - 1} naar de doos.`,
          { stock: -kosten, box: kosten - 1 },
        );
      } else {
        this.emit(
          na >= 2 ? 'vatten' : 'reiken',
          'laatste',
          [IDX.get(t)!],
          na >= 2
            ? `De Laatste vat ${naam} — de tegel oogst nu, en hij komt er niet in.`
            : `De Laatste reikt naar ${naam}${omdraai} — ijl, aanwezig maar machteloos.`,
          { stock: -kosten },
        );
      }
    }
    return true;
  }

  /** Doorgeven: de tegel blijft liggen, de stenen keren terug, er komt een spoor op. */
  claim(c: CellKey): void {
    this.pileL += 1;
    const terug = this.wOf(c);
    this.stock += terug;
    this.setW(c, 0);
    this.marks.add(c);
    if (this.trace) {
      this.emit(
        'doorgeven',
        'laatste',
        [IDX.get(c)!],
        `De Laatste geeft ${TEGELNAAM[this.tileOf(c) ?? 'leeg']} door — spoor ${this.pileL} ` +
          `van ${this.cfg.needL}, ${terug} substantie keert terug.`,
        { stock: terug, pileL: 1 },
      );
    }
  }

  /** Alleen doorgeefbare tegels die de draad heel laten. */
  claimable(draad: readonly CellKey[] = this.conn()): CellKey[] {
    const out: CellKey[] = [];
    for (const c of draad) {
      if (c === this.seat || this.wOf(c) < 2 || !this.alive.has(c)) continue;
      if (this.marks.has(c)) continue;
      if (this.yieldOf(c) <= 0) continue;
      out.push(c);
    }
    return out;
  }

  /** Het ventiel: een steen van het bord terug naar de voorraad. */
  withdraw(c: CellKey): void {
    this.setW(c, this.wOf(c) - 1);
    this.stock += 1;
    if (this.trace) {
      this.emit(
        'terugtrekken',
        'laatste',
        [IDX.get(c)!],
        `De Laatste trekt een steen terug van ${TEGELNAAM[this.tileOf(c) ?? 'leeg']} — ` +
          `het ventiel, anders loopt haar economie vast.`,
        { stock: 1 },
      );
    }
  }

  // ------------------------------------------------------------ de Nexus

  /** Een tegel verdwijnt van het bord, en voedt haar. */
  consume(c: CellKey, reden: EventKind = 'verzwelgen'): void {
    if (!this.alive.has(c) || c === this.seat) return;
    if (this.cfg.spoorVreten === 'nooit' && this.marks.has(c)) return;
    this.alive.delete(c);
    this.pileN += 1;
    const wasSpoor = this.marks.has(c);
    let telAf = false;
    if (wasSpoor) {
      this.marks.delete(c);
      const modus = this.cfg.spoorVreten;
      telAf =
        modus === 'alles' ||
        (modus === 'eenPerBeurt' && this.spoorAfDezeBeurt === 0);
      if (telAf) {
        this.pileL -= 1;
        this.spoorAfDezeBeurt += 1;
      }
    }
    const stenen = this.wOf(c);
    this.box += stenen;
    this.setW(c, 0);
    const gevoed = this.cfg.feed ? this.gain(1) : 0;
    if (this.trace) {
      const naam = TEGELNAAM[this.tileOf(c) ?? 'leeg'];
      this.emit(
        reden,
        'nexus',
        [IDX.get(c)!],
        `De Nexus verzwelgt ${naam} — ${this.pileN} van ${this.cfg.needN}` +
          (stenen ? `, ${stenen} substantie terug naar de doos` : '') +
          (gevoed ? ', en voedt haar met 1' : '') +
          '.',
        { pileN: 1, box: stenen - gevoed, stock: gevoed },
      );
      if (wasSpoor) {
        this.emit(
          'spoor-weg',
          'nexus',
          [IDX.get(c)!],
          telAf
            ? `Hij vreet haar spoor weg — haar teller zakt naar ${this.pileL}.`
            : `Hij vreet haar spoor weg, maar wat doorgegeven is blijft doorgegeven.`,
          telAf ? { pileL: -1 } : undefined,
        );
      }
    }
  }

  moveTo(t: CellKey): void {
    const old = this.npos;
    this.npos = t;
    if (this.trace) {
      this.emit('stap', 'nexus', [IDX.get(old)!, IDX.get(t)!], `De Nexus zet een stap.`);
    }
    this.consume(old);
  }

  // --------------------------------------------------- afsla-opties (§5A)

  /** §5A-1 — automatisch aan het eind van zijn beurt. */
  omsingelingAfslag(): void {
    const o = this.cfg.afslag.omsingeling;
    if (!o.on) return;
    for (const c of order(this.alive)) {
      if (this.wOf(c) < 2 || c === this.seat) continue;
      if (this.randZijden(c) < o.minRandZijden) continue;
      this.setW(c, this.wOf(c) - 1);
      this.box += 1;
      if (this.trace) {
        this.emit(
          'omsingeling',
          'systeem',
          [IDX.get(c)!],
          `Omsingeling: ${TEGELNAAM[this.tileOf(c) ?? 'leeg']} grenst aan ` +
            `${this.randZijden(c)} randen en verliest een steen naar de doos.`,
          { box: 1 },
        );
      }
    }
  }

  /** §5A-2 — hij slaat zijn hele beurt over en slaat 1 steen van een vat-tegel. */
  stilstandAfslag(c: CellKey): void {
    this.setW(c, this.wOf(c) - 1);
    this.box += 1;
    if (this.trace) {
      this.emit(
        'stilstand',
        'nexus',
        [IDX.get(c)!],
        `De Nexus staat stil en slaat een steen van ${TEGELNAAM[this.tileOf(c) ?? 'leeg']} — ` +
          `hij eet niets deze beurt.`,
        { box: 1 },
      );
    }
  }

  /** §5A-3 — voorwaarde: geen aangrenzende niet-vat-tegel bij het begin van zijn beurt. */
  hongerVoorbijMogelijk(): boolean {
    if (!this.cfg.afslag.hongerVoorbij.on) return false;
    const buren = this.nbKeys(this.npos).filter((x) => this.alive.has(x));
    return buren.length > 0 && buren.every((x) => this.isVat(x));
  }

  hongerVoorbijSlok(c: CellKey): void {
    if (this.trace) {
      this.emit(
        'honger',
        'nexus',
        [IDX.get(c)!],
        `Honger voorbij: alles om hem heen heeft vat, dus hij verzwelgt er één in zijn geheel.`,
      );
    }
    this.consume(c, 'verzwelgen');
  }

  // ------------------------------------------------------------- verloop

  laatsteTurn(): void {
    laatsteBots[this.cfg.laatsteBot](this);
  }

  /** Mag hij hier staan? Vat is verboden, en bij `spoorVreten: nooit` ook een spoor. */
  nexusMag(k: CellKey): boolean {
    if (!this.alive.has(k) || this.wOf(k) >= 2) return false;
    if (this.cfg.spoorVreten === 'nooit' && this.marks.has(k)) return false;
    return true;
  }

  nexusTurn(): void {
    if (this.cfg.solo) return;
    this.spoorAfDezeBeurt = 0;
    nexusBots[this.cfg.nexusBot](this);
    this.omsingelingAfslag();
  }

  playTurn(): void {
    if (this.done) return;
    this.turn += 1;
    if (this.trace) {
      this.emit('beurt', 'systeem', [], `Beurt ${this.turn}.`);
    }
    this.laatsteTurn();
    if (this.done) return;
    this.nexusTurn();
    if (this.done) return;
    this.hist.push([this.pileL, this.pileN]);
    if (this.alive.size <= 1) this.done = 'niets';
    this.noteerVerandering();
  }

  play(maxTurns = this.cfg.maxTurns): Uitslag {
    if (this.trace && this.events.length === 0) this.emitOpzet();
    while (this.turn < maxTurns && !this.done) this.playTurn();
    const uit = this.done ?? 'timeout';
    if (this.trace) {
      this.emit('einde', 'systeem', [], eindTekst(uit, this));
    }
    return uit;
  }

  private noteerVerandering(): void {
    const sig = `${this.alive.size}|${this.pileL}|${this.pileN}|${[...this.w.values()].join('')}`;
    if (sig !== this.vorigeSignatuur) {
      this.vorigeSignatuur = sig;
      this.laatsteVerandering = this.turn;
    }
  }

  // -------------------------------------------------------------- logboek

  private emitOpzet(): void {
    this.emit(
      'opzet',
      'systeem',
      [IDX.get(this.seat)!, IDX.get(this.npos)!],
      `Het bord ligt. De Zetel staat, de Nexus wacht op ${dist(unkey(this.npos), unkey(this.seat))} tegels afstand.`,
    );
  }

  emit(kind: EventKind, actor: Actor, cells: number[], text: string, delta?: GameEvent['delta']): void {
    if (!this.trace) return;
    this.events.push({
      i: this.evI++,
      turn: this.turn,
      kind,
      actor,
      cells,
      text,
      delta,
      after: this.snapshot(),
    });
  }

  snapshot(): Snapshot {
    const n = ALL_KEYS.length;
    const alive = new Array<number>(n);
    const w = new Array<number>(n);
    const marks = new Array<number>(n);
    const open = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const k = ALL_KEYS[i];
      alive[i] = this.alive.has(k) ? 1 : 0;
      w[i] = this.wOf(k);
      marks[i] = this.marks.has(k) ? 1 : 0;
      open[i] = this.open.has(k) ? 1 : 0;
    }
    return {
      turn: this.turn,
      alive,
      w,
      marks,
      open,
      npos: IDX.get(this.npos)!,
      stock: this.stock,
      box: this.box,
      pileL: this.pileL,
      pileN: this.pileN,
      done: this.done,
    };
  }

  /**
   * Kopie voor zoekbots. Het logboek gaat niet mee en de toevalsgenerator wordt
   * gedeeld noch gebruikt: zoeken mag de echte partij niet verschuiven.
   */
  clone(): Game {
    const c = Object.create(Game.prototype) as Game;
    Object.assign(c, {
      cfg: this.cfg,
      seed: this.seed,
      rng: this.rng,
      tile: this.tile,
      alive: new Set(this.alive),
      open: new Set(this.open),
      marks: new Set(this.marks),
      w: new Map(this.w),
      seat: this.seat,
      npos: this.npos,
      stock: this.stock,
      box: this.box,
      pileL: this.pileL,
      pileN: this.pileN,
      turn: this.turn,
      done: this.done,
      hist: this.hist,
      cost: new Map(this.cost),
      goal: this.goal,
      spoorAfDezeBeurt: this.spoorAfDezeBeurt,
      trace: false,
      events: [],
      evI: 0,
      laatsteVerandering: this.laatsteVerandering,
      vorigeSignatuur: this.vorigeSignatuur,
    });
    return c;
  }

  /** Controle op de gesloten kringloop: voorraad + bord + doos = total. */
  substantieTotaal(): number {
    let opBord = 0;
    for (const v of this.w.values()) opBord += v;
    return this.stock + this.box + opBord;
  }

  result(uitslag: Uitslag): GameResult {
    let flips = 0;
    let lead: 'L' | 'N' | null = null;
    for (const [pl, pn] of this.hist) {
      const cur = pl / this.cfg.needL > pn / this.cfg.needN ? 'L' : 'N';
      if (lead && cur !== lead) flips++;
      lead = cur;
    }
    const half = this.hist[Math.floor(this.hist.length / 2)];
    let comeback = false;
    if (half && (uitslag === 'laatste' || uitslag === 'nexus')) {
      const leiderHalf = half[0] / this.cfg.needL > half[1] / this.cfg.needN ? 'laatste' : 'nexus';
      comeback = leiderHalf !== uitslag;
    }
    return {
      seed: this.seed,
      uitslag,
      turns: this.turn,
      pileL: this.pileL,
      pileN: this.pileN,
      alive: this.alive.size,
      hist: this.hist,
      flips,
      comeback,
      laatsteVerandering: this.laatsteVerandering,
      events: this.trace ? this.events : undefined,
      seat: IDX.get(this.seat)!,
      tiles: ALL_KEYS.map((k) => this.tileOf(k)),
    };
  }
}

function eindTekst(uit: Uitslag, g: Game): string {
  switch (uit) {
    case 'laatste':
      return `De Laatste heeft ${g.cfg.needL} staande sporen. Er ging iets door.`;
    case 'nexus':
      return `De Nexus heeft ${g.cfg.needN} tegels verzwolgen. Het universum sloot zich.`;
    case 'niets':
      return `Het bord is op. Het universum eindigde en niets ging door.`;
    default:
      return `Klem na ${g.turn} beurten — sinds beurt ${g.laatsteVerandering} veranderde er niets meer.`;
  }
}

/** Speel één partij en geef het resultaat. */
export function speel(
  seed: number,
  cfg: Partial<GameConfig> = {},
  opties: { trace?: boolean } = {},
): GameResult {
  const g = new Game(seed, cfg);
  g.trace = opties.trace ?? false;
  const uit = g.play();
  return g.result(uit);
}
