/**
 * Het bord, op canvas. De beeldtaal komt uit §6 van de handoff:
 * donker, goud voor haar, aantrekkingspaars voor hem, substantie in rozig
 * roomwit. Vat = gouden gloed om de tegel, rand = zwart gat met dunne paarse
 * contour, spoor = gouden merkteken, de gedekte rug toont het oog-motief.
 *
 * De tekenlaag praat alleen met een Snapshot; hij kent de engine verder niet.
 * Zo kan er later een driedimensionale weergave naast, zonder de rest te raken.
 */
import { ALL, ALL_KEYS, DIRS, toPixel, type Axial } from '../engine/hex';
import type { Snapshot, TileType } from '../engine/types';
import type { Art } from './art';

const KLEUR = {
  goud: '#c9a44a',
  goudLicht: '#e6cd8f',
  substantie: '#e0a9a0',
  aantrekking: '#9b7fd4',
  nacht: '#06050a',
  inkt: '#efe9dd',
};

/**
 * De materie van het organisme, afgelezen van het artwork van de Zetel: geen
 * steen en geen metaal maar gegroeid weefsel — oker, oud rozehout, een groenige
 * schaduw, donkere poriën en een gouden zweem eroverheen. Alles wat de Laatste
 * op het bord zet is van dit spul gemaakt.
 */
const MATERIE = {
  licht: '#efdcc0',
  vlees: '#cfa87e',
  diep: '#9c7482',
  schaduw: '#4f6a69',
  porie: '#150e1e',
  gloed: '#f2dda7',
};

const ART_VAN_TEGEL: Record<TileType, keyof Art> = {
  planeet: 'planeet',
  bewoond: 'bewoond',
  komeet: 'komeet',
  gat: 'gat',
  stil: 'stil',
  seat: 'seat',
};

export interface BordStand {
  snap: Snapshot;
  /** het pad van de Zetel naar het Oog, als indexen — leeg als er geen ligt */
  route: number[];
  tiles: Array<TileType | null>;
  seat: number;
  /** hexen die dit moment aandacht vragen — de zet die net gebeurde */
  markeer: number[];
  /** 'laatste' | 'nexus' | 'systeem' — kleurt de markering */
  wie: 'laatste' | 'nexus' | 'systeem';
  /** hex waar de muis boven hangt, of -1 */
  hover: number;
  /** de zetten die nu open liggen, in de speelbare modus */
  keuzes?: Keuze[];
  /** de tegels van de zet die op dit moment aandacht heeft */
  gloed?: number[];
}

/**
 * Een aanklikbare zet, zoals het bord hem moet laten zien. De kleur volgt de
 * kant: goud is van haar, aantrekkingspaars van hem.
 */
/** Hoe lang het verzwelgen duurt, en hoe lang het spoor daarna nog nagloeit. */
const VERZWELG_MS = 420;
const SPOOR_DOOF_MS = 1500;

interface Verzwolgen {
  cel: number;
  start: number;
  naar: { x: number; y: number };
  wasSpoor: boolean;
  tile: TileType | null;
  open: boolean;
}

export interface Keuze {
  cel: number;
  soort:
    | 'reiken' | 'doorgeven' | 'verzilveren' | 'terugtrekken'
    | 'stap' | 'verzwelgen' | 'stilstand' | 'hongerVoorbij';
}

const KEUZEKLEUR: Record<Keuze['soort'], string> = {
  reiken: KLEUR.goud,
  doorgeven: KLEUR.goudLicht,
  verzilveren: '#ffe6a8',
  terugtrekken: KLEUR.substantie,
  stap: KLEUR.aantrekking,
  verzwelgen: KLEUR.aantrekking,
  stilstand: '#c9b6f0',
  hongerVoorbij: '#c9b6f0',
};

export class Bord {
  private ctx: CanvasRenderingContext2D;
  private size = 40;
  private ox = 0;
  private oy = 0;
  private dpr = 1;
  /** vorige positie van de Nexus, zodat hij glijdt in plaats van springt */
  private nexusVan = -1;
  private nexusNaar = -1;
  private nexusT = 1;

  /** tegels die op dit moment verzwolgen worden, met hun eigen klok */
  private verzwolgen: Verzwolgen[] = [];
  private vorigAlive: number[] | null = null;
  private vorigMarks: number[] | null = null;
  private vorigBeurt = -1;

  constructor(private canvas: HTMLCanvasElement, private art: Art) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d niet beschikbaar');
    this.ctx = ctx;
  }

  meet(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));

    // grootste hexmaat die het hele bord met marge kwijt kan
    const marge = 20;
    const bb = grenzen(1);
    const sx = (r.width - marge * 2) / bb.w;
    const sy = (r.height - marge * 2) / bb.h;
    this.size = Math.min(sx, sy);
    const b = grenzen(this.size);
    this.ox = (r.width - b.w) / 2 - b.x0;
    this.oy = (r.height - b.h) / 2 - b.y0;
  }

  /** hex-index onder een muispositie, of -1 */
  raak(px: number, py: number): number {
    let best = -1;
    let bd = this.size * 0.95;
    for (let i = 0; i < ALL.length; i++) {
      const p = this.plek(i);
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  /** Waar hex `i` op het scherm ligt, in css-pixels binnen het canvas. */
  plekVan(i: number): { x: number; y: number } {
    return this.plek(i);
  }

  private plek(i: number): { x: number; y: number } {
    const p = toPixel(ALL[i], this.size);
    return { x: p.x + this.ox, y: p.y + this.oy };
  }

  teken(stand: BordStand, tijd: number): void {
    const { ctx } = this;
    const r = this.canvas.getBoundingClientRect();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);

    const { snap, tiles, seat, markeer, wie, hover } = stand;
    const gemarkeerd = new Set(markeer);
    this.merkVerzwelging(snap, tiles, tijd);

    // ---- 0. de tafel waar het bord op ligt
    this.tekenTafel(r.width, r.height, tijd);

    // ---- 1. de rand: verzwolgen tegels
    for (let i = 0; i < ALL.length; i++) {
      if (snap.alive[i]) continue;
      this.tekenRand(this.plek(i), tijd, i);
    }

    // ---- 2. de tegels
    for (let i = 0; i < ALL.length; i++) {
      if (!snap.alive[i]) continue;
      this.tekenTegel(i, snap, tiles, seat, tijd);
    }

    // ---- 3. het bastion: de sokkel waar een verharde keten op staat, in één
    //         stuk over de hele keten heen — daarna de substantie zelf
    this.tekenBastion(snap);
    for (let i = 0; i < ALL.length; i++) {
      if (!snap.alive[i] || snap.w[i] < 1) continue;
      const p = this.plek(i);
      if (snap.w[i] === 1) this.tekenIjl(p, tijd, i);
      else this.tekenVat(p, tijd, i, snap.verhard[i] > 0);
    }

    // ---- 4. de draad, over de tegels heen: onder de tegels is hij onzichtbaar
    this.tekenDraad(snap, seat);

    // ---- 4b. de oversteek: het pad van de Zetel naar het Oog
    if (stand.route.length > 1) this.tekenRoute(stand.route, snap, tijd);
    if (snap.oog >= 0 && snap.alive[snap.oog]) this.tekenOog(this.plek(snap.oog), tijd);

    // ---- 4c. het verzwelgen zelf: de tegel wordt naar hem toe getrokken
    this.tekenVerzwelgingen(tijd);

    // ---- 5. de Nexus
    this.tekenNexus(snap.npos, tijd);

    // ---- 6. de Zetel, ná de Nexus: hij mag op de Zetel staan (zie
    //         docs/BEVINDINGEN.md, punt c) en zou hem anders volledig afdekken
    if (snap.alive[seat]) this.tekenZetelRing(this.plek(seat), snap.npos === seat, tijd);

    // ---- 7. markering van de zet die net gebeurde
    for (const i of gemarkeerd) {
      if (i < 0 || i >= ALL.length) continue;
      this.tekenMarkering(this.plek(i), wie, tijd);
    }

    // ---- 7b. wat er nu te kiezen valt
    if (stand.keuzes?.length) this.tekenKeuzes(stand.keuzes, stand.gloed ?? [], tijd);

    // ---- 8. muisaanwijzing
    if (hover >= 0 && hover < ALL.length) {
      const p = this.plek(hover);
      ctx.save();
      this.pad(p, this.size * 0.93);
      ctx.strokeStyle = 'rgba(239,233,221,0.32)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * De open zetten. Een dunne, ademende ring in de kleur van de kant, en een
   * vollere ring om wat op dit moment aandacht heeft. Bewust terughoudend: het
   * bord moet leesbaar blijven als er twintig zetten open liggen.
   */
  private tekenKeuzes(keuzes: Keuze[], gloed: number[], tijd: number): void {
    const { ctx } = this;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 620);
    const aandacht = new Set(gloed);
    ctx.save();
    for (const k of keuzes) {
      if (k.cel < 0 || k.cel >= ALL.length) continue;
      const p = this.plek(k.cel);
      const kleur = KEUZEKLEUR[k.soort];
      const sterk = aandacht.has(k.cel);

      // een wash over de tegel, zodat het van een afstand opvalt
      ctx.globalAlpha = sterk ? 0.2 : 0.07 + 0.035 * puls;
      ctx.fillStyle = kleur;
      this.pad(p, this.size * 0.9);
      ctx.fill();

      ctx.globalAlpha = sterk ? 1 : 0.5 + 0.22 * puls;
      ctx.strokeStyle = kleur;
      ctx.lineWidth = sterk ? 2.6 : 1.8;
      ctx.shadowColor = kleur;
      ctx.shadowBlur = sterk ? 18 : 8;
      this.pad(p, this.size * (sterk ? 0.9 : 0.86));
      ctx.stroke();
      ctx.shadowBlur = 0;

      // en een stip in het midden: hier kun je klikken
      ctx.globalAlpha = sterk ? 1 : 0.6 + 0.2 * puls;
      ctx.fillStyle = kleur;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sterk ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Een zachte ring achter het bord: geeft de hexen een vlak om op te liggen. */
  private tekenTafel(w: number, h: number, tijd: number): void {
    const { ctx } = this;
    const c = this.plek(0);
    const straal = this.size * 7.4;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 4200);
    ctx.save();
    const g = ctx.createRadialGradient(c.x, c.y, straal * 0.2, c.x, c.y, straal);
    g.addColorStop(0, 'rgba(28,22,48,0.55)');
    g.addColorStop(0.72, 'rgba(14,10,26,0.35)');
    g.addColorStop(1, 'rgba(6,5,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, straal, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(201,164,74,${0.05 + 0.03 * puls})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.x, c.y, this.size * 6.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    void w;
    void h;
  }

  // -------------------------------------------------------------- onderdelen

  private pad(p: { x: number; y: number }, s: number): void {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // pointy-top: eerste punt recht boven het midden
      const a = (Math.PI / 180) * (60 * i - 90);
      const x = p.x + s * Math.cos(a);
      const y = p.y + s * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private tekenRand(p: { x: number; y: number }, tijd: number, zaad: number): void {
    const { ctx } = this;
    const s = this.size;
    ctx.save();
    this.pad(p, s * 0.93);
    const g = ctx.createRadialGradient(p.x, p.y, s * 0.05, p.x, p.y, s);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.55, '#07050c');
    g.addColorStop(1, '#0d0a17');
    ctx.fillStyle = g;
    ctx.fill();

    // dunne paarse contour, die langzaam ademt
    const puls = 0.5 + 0.5 * Math.sin(tijd / 900 + zaad * 0.7);
    ctx.strokeStyle = `rgba(155,127,212,${0.16 + 0.16 * puls})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // een zweem van wat er was
    ctx.globalCompositeOperation = 'lighter';
    const k = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 0.62);
    k.addColorStop(0, `rgba(155,127,212,${0.05 + 0.04 * puls})`);
    k.addColorStop(1, 'rgba(155,127,212,0)');
    ctx.fillStyle = k;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private tekenTegel(
    i: number,
    snap: Snapshot,
    tiles: Array<TileType | null>,
    seat: number,
    tijd: number,
  ): void {
    const { ctx } = this;
    const p = this.plek(i);
    const s = this.size;
    // een naadje tussen de tegels: zonder gleuf vloeien de sterrenvelden van
    // buurtegels in elkaar over en lees je het bord als één schildering
    const rs = s * 0.93;
    const open = snap.open[i] === 1;
    const stenen = snap.w[i];
    const spoor = snap.marks[i] === 1;
    const isZetel = i === seat;
    const vat = stenen >= 2;

    ctx.save();

    // gouden gloed om een vat-tegel: hij komt er niet in
    if (vat) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // een verharde tegel staat stil: hij ademt niet meer, hij ís
      const puls = snap.verhard[i] > 0 ? 0.85 : 0.5 + 0.5 * Math.sin(tijd / 620 + i);
      const g = ctx.createRadialGradient(p.x, p.y, s * 0.55, p.x, p.y, s * 1.35);
      g.addColorStop(0, `rgba(201,164,74,${0.3 + 0.12 * puls})`);
      g.addColorStop(1, 'rgba(201,164,74,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // schaduw onder de tegel, zodat hij van het bord af komt
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = s * 0.22;
    ctx.shadowOffsetY = s * 0.05;
    this.pad(p, rs);
    ctx.fillStyle = '#05040a';
    ctx.fill();
    ctx.restore();

    // het plaatje
    const isOog = i === snap.oog;
    const sleutel: keyof Art = isZetel
      ? 'seat'
      : isOog
        ? 'oogtegel'
        : open
          ? (ART_VAN_TEGEL[tiles[i] ?? 'stil'] ?? 'stil')
          : 'rug';
    const img = this.art[sleutel];
    const d = rs * 2;
    if (img) {
      ctx.save();
      this.pad(p, rs);
      ctx.clip();
      ctx.drawImage(img, p.x - d / 2, p.y - d / 2, d, d);
      ctx.restore();
    } else {
      this.pad(p, rs);
      ctx.fillStyle = open ? '#1a1526' : '#0e0b18';
      ctx.fill();
    }

    const verhard = snap.verhard[i] > 0;

    // randje: goud voor de Zetel en voor wat van haar is, anders ingehouden
    this.pad(p, rs);
    if (verhard) {
      // verhard = onaantastbaar: een vaste, dichte rand, geen ademing
      ctx.strokeStyle = 'rgba(240,222,176,0.95)';
      ctx.lineWidth = 2.6;
    } else if (isZetel) {
      ctx.strokeStyle = 'rgba(230,205,143,0.85)';
      ctx.lineWidth = 1.8;
    } else if (vat) {
      ctx.strokeStyle = 'rgba(201,164,74,0.8)';
      ctx.lineWidth = 1.4;
    } else if (stenen === 1) {
      ctx.strokeStyle = 'rgba(224,169,160,0.45)';
      ctx.lineWidth = 1.1;
    } else {
      ctx.strokeStyle = 'rgba(146,128,186,0.34)';
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    if (spoor) this.tekenSpoor(p, tijd, i);
    if (isZetel) this.tekenZetel(p, tijd);

    ctx.restore();
  }

  /** Het merkteken: een gouden zegel met het oog-motief van de kaartrug. */
  private tekenSpoor(p: { x: number; y: number }, tijd: number, zaad: number): void {
    const { ctx } = this;
    const s = this.size;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 1100 + zaad);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 0.72);
    g.addColorStop(0, `rgba(201,164,74,${0.24 + 0.07 * puls})`);
    g.addColorStop(1, 'rgba(201,164,74,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = KLEUR.goudLicht;
    ctx.lineWidth = 1.3;
    const r = s * 0.42;
    // het oog: twee bogen die elkaar in de punten raken
    ctx.beginPath();
    ctx.moveTo(p.x - r, p.y);
    ctx.quadraticCurveTo(p.x, p.y - r * 0.92, p.x + r, p.y);
    ctx.quadraticCurveTo(p.x, p.y + r * 0.92, p.x - r, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = KLEUR.goud;
    ctx.fill();
    ctx.restore();
  }

  /** Substantie op de tegel: één steen is ijl, twee is vat. */
  // ------------------------------------------------------------ verzwelgen
  //
  // Een tegel die verdwijnt hoort niet uit te gaan als een lampje. Hij wordt
  // naar de Nexus toe getrokken: het brokkelt, het versnelt, en het is weg.
  // Ruim vier tienden van een seconde, kort genoeg om niet te vervelen en lang
  // genoeg om te zien wat er gebeurde — ook in de replay, want die tekent
  // dezelfde momentopnames.
  //
  // Lag er een spoor op, dan blijft het merkteken achter en dooft daarna pas.
  // De tegel gaat, het punt blijft.

  private merkVerzwelging(
    snap: Snapshot,
    tiles: Array<TileType | null>,
    tijd: number,
  ): void {
    const vorig = this.vorigAlive;
    const vorigM = this.vorigMarks;
    // terugspoelen of een ander potje: geen animaties uit het niets
    const sprong = this.vorigBeurt >= 0 && snap.turn < this.vorigBeurt;
    if (vorig && vorig.length === snap.alive.length && !sprong) {
      for (let i = 0; i < snap.alive.length; i++) {
        if (vorig[i] === 1 && snap.alive[i] === 0) {
          this.verzwolgen.push({
            cel: i,
            start: tijd,
            naar: this.plek(snap.npos),
            wasSpoor: (vorigM?.[i] ?? 0) === 1,
            tile: tiles[i] ?? null,
            open: true,
          });
        }
      }
      if (this.verzwolgen.length > 14) this.verzwolgen.splice(0, this.verzwolgen.length - 14);
    } else if (sprong) {
      this.verzwolgen = [];
    }
    this.vorigAlive = snap.alive.slice();
    this.vorigMarks = snap.marks.slice();
    this.vorigBeurt = snap.turn;
  }

  private tekenVerzwelgingen(tijd: number): void {
    if (!this.verzwolgen.length) return;
    const { ctx } = this;
    const s = this.size;

    for (const v of this.verzwolgen) {
      const p = this.plek(v.cel);
      const vlucht = Math.min(1, (tijd - v.start) / VERZWELG_MS);

      if (vlucht < 1) {
        // hij trekt: het gaat steeds harder, zoals iets dat valt
        const e = vlucht * vlucht;
        const x = p.x + (v.naar.x - p.x) * e * 0.88;
        const y = p.y + (v.naar.y - p.y) * e * 0.88;

        // de streep waarlangs hij verdwijnt
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(155,127,212,${0.5 * (1 - vlucht)})`;
        ctx.lineWidth = s * 0.1 * (1 - vlucht) + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(v.naar.x, v.naar.y);
        ctx.stroke();
        ctx.restore();

        // de tegel zelf, krimpend en tollend
        const img = v.tile ? this.art[ART_VAN_TEGEL[v.tile]] : undefined;
        ctx.save();
        ctx.globalAlpha = 1 - e * 0.85;
        ctx.translate(x, y);
        ctx.rotate(e * 0.9);
        ctx.scale(1 - e * 0.72, 1 - e * 0.72);
        this.pad({ x: 0, y: 0 }, s * 0.93);
        ctx.clip();
        if (img) ctx.drawImage(img, -s * 0.93, -s * 0.93, s * 1.86, s * 1.86);
        else {
          ctx.fillStyle = '#1a1526';
          ctx.fill();
        }
        ctx.restore();

        // brokken: ze breken eruit en worden dan meegezogen
        ctx.save();
        for (let k = 0; k < 7; k++) {
          const hoek = (k / 7) * Math.PI * 2 + v.cel * 0.7;
          const spreid = Math.sin(Math.min(1, vlucht * 1.6) * Math.PI) * s * 0.42;
          const bx = p.x + Math.cos(hoek) * (s * 0.3 + spreid);
          const by = p.y + Math.sin(hoek) * (s * 0.26 + spreid * 0.8);
          const fx = bx + (v.naar.x - bx) * e;
          const fy = by + (v.naar.y - by) * e;
          const r = s * 0.075 * (1 - vlucht);
          ctx.globalAlpha = 0.85 * (1 - vlucht);
          ctx.fillStyle = k % 3 === 0 ? '#b4757a' : k % 3 === 1 ? '#dda876' : '#455a5c';
          ctx.beginPath();
          ctx.moveTo(fx, fy - r);
          ctx.lineTo(fx + r * 0.9, fy + r * 0.6);
          ctx.lineTo(fx - r * 0.8, fy + r * 0.7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // het spoor blijft nog even staan en dooft dan
      if (v.wasSpoor) {
        const u = (tijd - v.start) / SPOOR_DOOF_MS;
        if (u < 1) {
          const alfa = u < 0.35 ? 1 : 1 - (u - 0.35) / 0.65;
          ctx.save();
          ctx.globalAlpha = alfa;
          this.tekenSpoor(p, tijd, v.cel);
          ctx.restore();
        }
      }
    }

    const maxMs = Math.max(VERZWELG_MS, SPOOR_DOOF_MS);
    this.verzwolgen = this.verzwolgen.filter(
      (v) => tijd - v.start < (v.wasSpoor ? maxMs : VERZWELG_MS),
    );
  }

  private tekenZetel(p: { x: number; y: number }, tijd: number): void {
    const { ctx } = this;
    const s = this.size;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 1500);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, s * 0.5, p.x, p.y, s * 1.6);
    g.addColorStop(0, `rgba(230,205,143,${0.14 + 0.06 * puls})`);
    g.addColorStop(1, 'rgba(230,205,143,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------- de toestand van een tegel
  //
  // Drie toestanden, en je moet ze uit een ooghoek uit elkaar houden.
  //
  //   ijl     — een liggend fiche: plat, laag, doorschijnend. Aanwezig, maar
  //             het steekt nergens bovenuit. Machteloos.
  //   vat     — een torentje: hoger dan breed, opgericht uit hetzelfde weefsel.
  //             Het staat er. Grip.
  //   verhard — hetzelfde torentje, maar stilgezet en verbleekt tot been, op
  //             de gedeelde sokkel van het bastion. Gestold, af.
  //
  // De vorm is geen fiche en geen steen: het is weefsel dat gegroeid is. Een
  // voet die uitloopt in de tegel, een lijf met banden, een koepel met een
  // porie erin — de materie van het artwork, in het klein.

  /** Waar de substantie op een tegel staat, en hoe groot. */
  private voet(p: { x: number; y: number }): { x: number; y: number; e: number } {
    return { x: p.x, y: p.y + this.size * 0.44, e: this.size };
  }

  /** IJL — een liggend fiche. Laag, doorschijnend, met een dunne lichtrand. */
  private tekenIjl(p: { x: number; y: number }, tijd: number, zaad: number): void {
    const { ctx } = this;
    const { x, y, e } = this.voet(p);
    const adem = 0.5 + 0.5 * Math.sin(tijd / 1700 + zaad * 1.3);
    const rx = e * 0.26;
    const ry = e * 0.085;

    ctx.save();

    // schaduw op de tegel: het ligt érop
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + ry * 0.45, rx * 1.06, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // het fiche zelf — weefsel, geen glas: warm en een beetje troebel
    const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
    g.addColorStop(0, `rgba(233,205,166,${0.72 + 0.1 * adem})`);
    g.addColorStop(0.5, 'rgba(190,141,110,0.72)');
    g.addColorStop(1, 'rgba(122,88,104,0.7)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // de rand vangt licht op, de onderkant niet
    ctx.strokeStyle = `rgba(242,221,167,${0.4 + 0.16 * adem})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(21,14,30,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI);
    ctx.stroke();

    // een kern die nauwelijks gloeit: er zit iets in, maar het doet nog niets
    ctx.globalCompositeOperation = 'lighter';
    const k = ctx.createRadialGradient(x, y - ry * 0.2, 0, x, y, rx * 0.9);
    k.addColorStop(0, `rgba(242,221,167,${0.14 + 0.08 * adem})`);
    k.addColorStop(1, 'rgba(242,221,167,0)');
    ctx.fillStyle = k;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * VAT — een torentje, hoger dan breed. Hetzelfde weefsel, maar opgericht:
   * een voet die in de tegel wortelt, een lijf met groeibanden, een koepel met
   * een porie. Het wiegt heel licht, alsof het ademt; verhard doet dat niet
   * meer, en verbleekt naar been.
   */
  private tekenVat(
    p: { x: number; y: number },
    tijd: number,
    zaad: number,
    verhard: boolean,
  ): void {
    const { ctx } = this;
    const { x: bx, y: by, e } = this.voet(p);
    const h = e * (verhard ? 0.58 : 0.54);
    const w = e * 0.17;
    // verhard staat stil: dat is het hele verschil met vat
    const wieg = verhard ? 0 : Math.sin(tijd / 1450 + zaad) * e * 0.014;

    ctx.save();

    // slagschaduw op de tegel
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(bx + wieg * 0.4, by + e * 0.03, w * 1.5, e * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();

    const top = by - h;
    const tx = bx + wieg;

    // wortels: een paar draden die de tegel in lopen. Dit is wat het verschil
    // maakt tussen iets dat op de tegel gezet is en iets dat eruit gegroeid is.
    ctx.save();
    ctx.strokeStyle = 'rgba(190,148,112,0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.7, e * 0.017);
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      const uit = k * e * 0.075;
      ctx.beginPath();
      ctx.moveTo(bx + uit * 0.3, by - e * 0.02);
      ctx.quadraticCurveTo(bx + uit * 0.8, by + e * 0.01, bx + uit, by + e * 0.035);
      ctx.stroke();
    }
    ctx.restore();

    // het lijf: een gegroeide poliep — een voet die in de tegel wortelt, een
    // ingesnoerde steel, en een kop die er bovenop zit te zwellen
    ctx.beginPath();
    ctx.moveTo(bx - w * 1.08, by);
    ctx.bezierCurveTo(bx - w * 1.0, by - h * 0.16, tx - w * 0.5, by - h * 0.3, tx - w * 0.48, by - h * 0.52);
    ctx.bezierCurveTo(tx - w * 1.12, by - h * 0.72, tx - w * 1.0, top + h * 0.02, tx, top);
    ctx.bezierCurveTo(tx + w * 1.0, top + h * 0.02, tx + w * 1.12, by - h * 0.72, tx + w * 0.5, by - h * 0.52);
    ctx.bezierCurveTo(tx + w * 0.5, by - h * 0.3, bx + w * 1.0, by - h * 0.16, bx + w * 1.08, by);
    ctx.closePath();

    // Van boven naar beneden, niet schuin: de kop vangt het licht, de voet
    // zakt weg in de tegel. Verhard verbleekt naar been en verliest het roze.
    const g = ctx.createLinearGradient(tx, top, bx, by);
    if (verhard) {
      g.addColorStop(0, '#fdf6e6');
      g.addColorStop(0.22, '#e5d2b2');
      g.addColorStop(0.56, '#ab938f');
      g.addColorStop(0.82, '#6d5d66');
      g.addColorStop(1, '#332c3f');
    } else {
      // oker → oud rozehout → groenige schaduw: de loop van het artwork
      g.addColorStop(0, '#f8ead0');
      g.addColorStop(0.18, '#dda876');
      g.addColorStop(0.44, '#b4757a');
      g.addColorStop(0.68, '#7a5c72');
      g.addColorStop(0.87, '#455a5c');
      g.addColorStop(1, '#20202c');
    }
    ctx.fillStyle = g;
    ctx.fill();

    // groeibanden: het is gelaagd, zoals koraal
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(21,14,30,0.16)';
    ctx.lineWidth = Math.max(0.6, e * 0.016);
    for (let k = 1; k <= 3; k++) {
      const yy = by - (h * k) / 4.2;
      ctx.beginPath();
      ctx.moveTo(bx - w * 1.4, yy);
      ctx.quadraticCurveTo(tx, yy + e * 0.03, bx + w * 1.4, yy);
      ctx.stroke();
    }
    // licht van links, schaduw rechts
    const zij = ctx.createLinearGradient(tx - w, 0, tx + w, 0);
    zij.addColorStop(0, 'rgba(255,246,228,0.17)');
    zij.addColorStop(0.4, 'rgba(255,246,228,0)');
    zij.addColorStop(1, 'rgba(30,52,52,0.42)');
    ctx.fillStyle = zij;
    ctx.fillRect(tx - w * 1.6, top - 2, w * 3.2, h + 6);
    ctx.restore();

    // de omtrek
    ctx.strokeStyle = verhard ? 'rgba(250,242,222,0.85)' : 'rgba(21,14,30,0.5)';
    ctx.lineWidth = verhard ? 1.5 : 1;
    ctx.stroke();

    // Poriën — het kenmerk van het organisme. Ze lopen langs één zijde omlaag,
    // nooit als symmetrisch paar bovenin: twee stippen naast elkaar leest het
    // oog onmiddellijk als een gezicht, en dan staat er een poppetje.
    ctx.fillStyle = MATERIE.porie;
    for (const [dx, dy, r] of [
      [-0.3, 0.22, 0.2],
      [-0.14, 0.46, 0.15],
      [0.24, 0.62, 0.12],
    ] as Array<[number, number, number]>) {
      ctx.beginPath();
      ctx.ellipse(tx + w * dx, top + h * dy, w * r, h * r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // en de zweem eromheen: bij vat ademt hij mee, bij verhard staat hij vast
    ctx.globalCompositeOperation = 'lighter';
    const puls = verhard ? 0.9 : 0.55 + 0.45 * Math.sin(tijd / 700 + zaad);
    const k = ctx.createRadialGradient(tx, top + h * 0.08, 0, tx, top + h * 0.08, e * 0.3);
    k.addColorStop(0, `rgba(242,221,167,${(verhard ? 0.24 : 0.18) * puls})`);
    k.addColorStop(1, 'rgba(242,221,167,0)');
    ctx.fillStyle = k;
    ctx.beginPath();
    ctx.arc(tx, top + h * 0.08, e * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * HET BASTION — een verharde keten is geen rij losse torentjes maar één
   * gegoten bouwwerk. Dat wordt hier gemaakt met een sokkel die over de hele
   * keten doorloopt: één silhouet, één rand, één schaduw. De torentjes komen
   * er daarna bovenop te staan, en samen leest het als één ding.
   *
   * De vorm is de vereniging van dikke, rondgeslepen strepen tussen de
   * middelpunten. Twee keer over elkaar getekend — eerst breed in de randkleur,
   * dan iets smaller in de vulkleur — geeft precies de buitenrand van die
   * vereniging, zonder dat er een pad voor uitgerekend hoeft te worden.
   */
  private tekenBastion(snap: Snapshot): void {
    const { ctx } = this;
    const e = this.size;

    // de ketens uit elkaar halen
    const ketens = new Map<number, number[]>();
    for (let i = 0; i < ALL.length; i++) {
      const nr = snap.verhard[i];
      if (!nr) continue;
      const lijst = ketens.get(nr) ?? [];
      lijst.push(i);
      ketens.set(nr, lijst);
    }
    if (!ketens.size) return;

    for (const leden of ketens.values()) {
      const inKeten = new Set(leden);
      const paren: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
      for (const i of leden) {
        for (const j of buren(i)) {
          if (j > i && inKeten.has(j)) paren.push([this.plek(i), this.plek(j)]);
        }
      }
      const centra = leden.map((i) => {
        const p = this.plek(i);
        return { x: p.x, y: p.y + e * 0.44 };
      });
      const paren2 = paren.map(
        ([a, b]) =>
          [
            { x: a.x, y: a.y + e * 0.44 },
            { x: b.x, y: b.y + e * 0.44 },
          ] as [{ x: number; y: number }, { x: number; y: number }],
      );

      ctx.save();

      // de schaduw van het hele bouwwerk, in één keer
      const R = e * 0.33;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.75)';
      ctx.shadowBlur = e * 0.26;
      ctx.shadowOffsetY = e * 0.07;
      this.bastionVorm(centra, paren2, R, 'rgba(0,0,0,0.95)');
      ctx.restore();

      // Rand, dan lijf: de buitenrand van de vereniging. Bewust niet wit en
      // niet dicht — been en oker, met de kosmos die er doorheen blijft
      // schemeren. Het is substantie van een levend wezen, geen beton.
      ctx.globalAlpha = 0.88;
      this.bastionVorm(centra, paren2, R, 'rgba(240,222,180,0.6)');
      this.bastionVorm(centra, paren2, R - 2, '#3f4a52');
      this.bastionVorm(centra, paren2, R * 0.8, '#8a6f74');
      this.bastionVorm(centra, paren2, R * 0.46, '#c2a481');
      ctx.globalAlpha = 1;

      // poriën in de sokkel, één per tegel: het blijft weefsel
      for (const c of centra) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + R * 0.3, e * 0.055, e * 0.022, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(21,14,30,0.45)';
        ctx.fill();
      }

      // de gloed die zegt: dit is af
      ctx.globalCompositeOperation = 'lighter';
      for (const c of centra) {
        const k = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, e * 0.85);
        k.addColorStop(0, 'rgba(242,221,167,0.14)');
        k.addColorStop(1, 'rgba(242,221,167,0)');
        ctx.fillStyle = k;
        ctx.beginPath();
        ctx.arc(c.x, c.y, e * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /** Eén laag van het bastion: overlappende vlakken in dezelfde kleur lezen als één vorm. */
  private bastionVorm(
    centra: Array<{ x: number; y: number }>,
    paren: Array<[{ x: number; y: number }, { x: number; y: number }]>,
    straal: number,
    kleur: string,
  ): void {
    const { ctx } = this;
    if (straal <= 0.5) return;
    // De sokkel is een lage plaat, geen buis: horizontaal vol, verticaal
    // ingedrukt. Dat gebeurt met een schaling om de basislijn heen, zodat de
    // strepen en de koppen dezelfde dikte houden.
    const PLAT = 0.52;
    const basis = centra.reduce((a, c) => a + c.y, 0) / centra.length;
    ctx.save();
    ctx.translate(0, basis);
    ctx.scale(1, PLAT);
    ctx.translate(0, -basis);
    ctx.fillStyle = kleur;
    ctx.strokeStyle = kleur;
    ctx.lineCap = 'round';
    ctx.lineWidth = straal * 2;
    for (const [a, b] of paren) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const c of centra) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, straal, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }


  /** Het Oog: waar zij naartoe moet. Onverzwelgbaar, dus altijd aanwezig. */
  private tekenOog(p: { x: number; y: number }, tijd: number): void {
    const { ctx } = this;
    const s = this.size;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 1300);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, s * 0.3, p.x, p.y, s * 1.5);
    g.addColorStop(0, `rgba(230,205,143,${0.16 + 0.08 * puls})`);
    g.addColorStop(1, 'rgba(230,205,143,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // het oog-motief van de kaartrug, als merkteken op de tegel
    ctx.save();
    ctx.strokeStyle = `rgba(240,222,176,${0.8 + 0.2 * puls})`;
    ctx.lineWidth = 1.6;
    const r = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(p.x - r, p.y);
    ctx.quadraticCurveTo(p.x, p.y - r * 0.9, p.x + r, p.y);
    ctx.quadraticCurveTo(p.x, p.y + r * 0.9, p.x - r, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = KLEUR.goudLicht;
    ctx.fill();
    // dubbele hexrand, zoals de Zetel, maar smaller
    this.pad(p, s * 0.86);
    ctx.strokeStyle = `rgba(240,222,176,${0.5 + 0.2 * puls})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  /** De oversteek zelf: het pad dat haar de winst geeft. */
  private tekenRoute(route: number[], snap: Snapshot, tijd: number): void {
    const { ctx } = this;
    const loop = (tijd / 26) % 22;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < route.length; i++) {
      const p = this.plek(route[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,238,196,0.20)';
    ctx.lineWidth = Math.max(4, this.size * 0.28);
    ctx.stroke();
    ctx.restore();

    // een lopende stippellijn erdoorheen: de oversteek is een beweging
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < route.length; i++) {
      const p = this.plek(route[i]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.setLineDash([this.size * 0.22, this.size * 0.3]);
    ctx.lineDashOffset = -loop;
    ctx.strokeStyle = 'rgba(255,247,225,0.95)';
    ctx.lineWidth = Math.max(1.4, this.size * 0.05);
    ctx.stroke();
    ctx.restore();
    void snap;
  }

  /** De Zetel blijft herkenbaar, ook als de Nexus erbovenop staat. */
  private tekenZetelRing(p: { x: number; y: number }, bezet: boolean, tijd: number): void {
    const { ctx } = this;
    const s = this.size;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 1500);
    ctx.save();
    this.pad(p, s * 0.93);
    ctx.strokeStyle = `rgba(230,205,143,${0.75 + 0.2 * puls})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    this.pad(p, s * 0.82);
    ctx.strokeStyle = `rgba(230,205,143,${0.28 + 0.12 * puls})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (bezet) {
      // hij zit op haar Zetel — één beurt waarin hij niets verzwelgt
      ctx.font = `${Math.max(9, s * 0.24)}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(230,205,143,0.9)';
      ctx.fillText('de Zetel', p.x, p.y + s * 0.78);
    }
    ctx.restore();
  }

  private tekenDraad(snap: Snapshot, seat: number): void {
    const draad = verbonden(snap, seat);
    if (draad.size < 2) return;
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'round';
    for (const i of draad) {
      const a = this.plek(i);
      ctx.beginPath();
      ctx.arc(a.x, a.y, Math.max(1.5, this.size * 0.045), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,222,176,0.6)';
      ctx.fill();
      for (const j of buren(i)) {
        if (j <= i || !draad.has(j)) continue;
        const b = this.plek(j);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(201,164,74,0.20)';
        ctx.lineWidth = Math.max(2, this.size * 0.13);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = 'rgba(240,222,176,0.72)';
        ctx.lineWidth = Math.max(1, this.size * 0.028);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private tekenNexus(idx: number, tijd: number): void {
    if (this.nexusNaar !== idx) {
      this.nexusVan = this.nexusNaar >= 0 ? this.nexusNaar : idx;
      this.nexusNaar = idx;
      this.nexusT = 0;
    }
    this.nexusT = Math.min(1, this.nexusT + 0.09);
    const e = 1 - Math.pow(1 - this.nexusT, 3);
    const a = this.plek(this.nexusVan >= 0 ? this.nexusVan : idx);
    const b = this.plek(idx);
    const p = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };

    const { ctx } = this;
    const s = this.size;
    const puls = 0.5 + 0.5 * Math.sin(tijd / 700);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 1.7);
    g.addColorStop(0, `rgba(155,127,212,${0.42 + 0.14 * puls})`);
    g.addColorStop(0.45, 'rgba(155,127,212,0.16)');
    g.addColorStop(1, 'rgba(155,127,212,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const img = this.art.nexus;
    const d = s * 1.42;
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, d / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, p.x - d / 2, p.y - d / 2, d, d);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, d / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#100b1c';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, d / 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(155,127,212,${0.7 + 0.25 * puls})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  private tekenMarkering(
    p: { x: number; y: number },
    wie: 'laatste' | 'nexus' | 'systeem',
    tijd: number,
  ): void {
    const { ctx } = this;
    const s = this.size;
    const kleur =
      wie === 'laatste' ? '230,205,143' : wie === 'nexus' ? '155,127,212' : '239,233,221';
    const puls = 0.5 + 0.5 * Math.sin(tijd / 260);
    ctx.save();
    this.pad(p, s * (0.93 + 0.05 * puls));
    ctx.strokeStyle = `rgba(${kleur},${0.55 + 0.35 * puls})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// -------------------------------------------------------------------- hulp

function grenzen(size: number) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const bw = Math.sqrt(3) * size * 0.5;
  for (const c of ALL) {
    const p = toPixel(c, size);
    x0 = Math.min(x0, p.x - bw);
    x1 = Math.max(x1, p.x + bw);
    y0 = Math.min(y0, p.y - size);
    y1 = Math.max(y1, p.y + size);
  }
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}

const INDEX = new Map(ALL_KEYS.map((k, i) => [k, i]));
const BUREN: number[][] = ALL.map((c) =>
  DIRS.map((d) => INDEX.get(`${c[0] + d[0]},${c[1] + d[1]}`) ?? -1).filter((i) => i >= 0),
);
function buren(i: number): number[] {
  return BUREN[i];
}

/** Dezelfde regel als Game.conn(): stenen én sporen dragen de draad. */
export function verbonden(snap: Snapshot, seat: number): Set<number> {
  const gezien = new Set<number>();
  const stapel = [seat];
  while (stapel.length) {
    const c = stapel.pop()!;
    if (gezien.has(c) || !snap.alive[c]) continue;
    gezien.add(c);
    for (const x of buren(c)) {
      if ((snap.w[x] > 0 || snap.marks[x] === 1) && !gezien.has(x) && snap.alive[x]) {
        stapel.push(x);
      }
    }
  }
  return gezien;
}

export function hexPunten(): readonly Axial[] {
  return ALL;
}

/**
 * Het pad van de Zetel naar het Oog over tegels die van haar zijn (vat, verhard
 * of spoor). Dezelfde regel als Game.routeNaarOog(), maar op een Snapshot, zodat
 * de tekenlaag de engine niet nodig heeft. `snap.routeOpen` beslist of er er een
 * ligt; deze functie zoekt alleen wélke.
 */
export function routeUitSnapshot(snap: Snapshot, seat: number): number[] {
  if (!snap.routeOpen || snap.oog < 0 || !snap.alive[snap.oog]) return [];
  const haar = (i: number) => snap.alive[i] === 1 && (snap.w[i] >= 2 || snap.marks[i] === 1);
  const vorige = new Map<number, number>([[seat, -1]]);
  const rij = [seat];
  let kop = 0;
  while (kop < rij.length) {
    const c = rij[kop++];
    if (c === snap.oog) {
      const pad: number[] = [];
      let cur = c;
      while (cur !== -1) {
        pad.push(cur);
        cur = vorige.get(cur)!;
      }
      return pad.reverse();
    }
    for (const x of buren(c)) {
      if (vorige.has(x) || !snap.alive[x]) continue;
      if (x !== snap.oog && !haar(x)) continue;
      vorige.set(x, c);
      rij.push(x);
    }
  }
  return [];
}
