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
  tiles: Array<TileType | null>;
  seat: number;
  /** hexen die dit moment aandacht vragen — de zet die net gebeurde */
  markeer: number[];
  /** 'laatste' | 'nexus' | 'systeem' — kleurt de markering */
  wie: 'laatste' | 'nexus' | 'systeem';
  /** hex waar de muis boven hangt, of -1 */
  hover: number;
}

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

    // ---- 3. de draad, over de tegels heen: onder de tegels is hij onzichtbaar
    this.tekenDraad(snap, seat);

    // ---- 4. de Nexus
    this.tekenNexus(snap.npos, tijd);

    // ---- 5. de Zetel, ná de Nexus: hij mag op de Zetel staan (zie
    //         docs/BEVINDINGEN.md, punt c) en zou hem anders volledig afdekken
    if (snap.alive[seat]) this.tekenZetelRing(this.plek(seat), snap.npos === seat, tijd);

    // ---- 6. markering van de zet die net gebeurde
    for (const i of gemarkeerd) {
      if (i < 0 || i >= ALL.length) continue;
      this.tekenMarkering(this.plek(i), wie, tijd);
    }

    // ---- 7. muisaanwijzing
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
      const puls = 0.5 + 0.5 * Math.sin(tijd / 620 + i);
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
    const sleutel: keyof Art = isZetel
      ? 'seat'
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

    // randje: goud voor de Zetel en voor wat van haar is, anders ingehouden
    this.pad(p, rs);
    if (isZetel) {
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
    if (stenen > 0) this.tekenStenen(p, stenen);
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
  private tekenStenen(p: { x: number; y: number }, n: number): void {
    const { ctx } = this;
    const s = this.size;
    const r = Math.max(2.6, s * 0.115);
    const y = p.y + s * 0.56;
    const plekken = n === 1 ? [p.x] : [p.x - r * 1.55, p.x + r * 1.55];
    for (const x of plekken) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
      g.addColorStop(0, 'rgba(224,169,160,0.55)');
      g.addColorStop(1, 'rgba(224,169,160,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = KLEUR.substantie;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,235,0.75)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
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
