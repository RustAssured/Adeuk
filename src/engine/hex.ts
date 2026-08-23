/** Axiale hex-coördinaten. Exacte port van de helpers bovenin v5.py. */

export type Axial = readonly [number, number];
/** Compacte sleutel "q,r" — snelle Map/Set-index, blijft leesbaar in traces. */
export type CellKey = string;

/** v5.py: DIRS = [(1,-1),(1,0),(0,1),(-1,1),(-1,0),(0,-1)] — volgorde is bindend. */
export const DIRS: readonly Axial[] = [
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
];

export const key = (c: Axial): CellKey => `${c[0]},${c[1]}`;
export const unkey = (k: CellKey): Axial => {
  const i = k.indexOf(',');
  return [Number(k.slice(0, i)), Number(k.slice(i + 1))];
};

/** v5.py `ring(n)` — zelfde uitvoervolgorde, want die bepaalt de tegelverdeling. */
export function ring(n: number): Axial[] {
  if (n === 0) return [[0, 0]];
  const out: Axial[] = [];
  let c: Axial = [DIRS[4][0] * n, DIRS[4][1] * n];
  for (let i = 0; i < 6; i++) {
    for (let s = 0; s < n; s++) {
      out.push(c);
      c = [c[0] + DIRS[i][0], c[1] + DIRS[i][1]];
    }
  }
  return out;
}

/** v5.py `dd` — hex-afstand. */
export function dist(a: Axial, b: Axial): number {
  return Math.max(
    Math.abs(a[0] - b[0]),
    Math.abs(a[1] - b[1]),
    Math.abs(a[0] + a[1] - b[0] - b[1]),
  );
}

/** v5.py `nb` — de zes buren, in DIRS-volgorde. */
export function neighbours(c: Axial): Axial[] {
  return DIRS.map((d) => [c[0] + d[0], c[1] + d[1]] as Axial);
}

export function neighbourKeys(k: CellKey): CellKey[] {
  const c = unkey(k);
  return DIRS.map((d) => `${c[0] + d[0]},${c[1] + d[1]}`);
}

/** v5.py `ALL` — centrum + ring 1..3, 37 hexen, volgorde is bindend. */
export const ALL: readonly Axial[] = [
  ...ring(0),
  ...ring(1),
  ...ring(2),
  ...ring(3),
];
export const ALL_KEYS: readonly CellKey[] = ALL.map(key);
export const ALL_SET: ReadonlySet<CellKey> = new Set(ALL_KEYS);
/** De middelste ring (12 hexen) ligt open bij de start. */
export const MID_KEYS: readonly CellKey[] = ring(2).map(key);

/** Pixelpositie voor een pointy-top hex — de oriëntatie van de kaartrug. */
export function toPixel(c: Axial, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (c[0] + c[1] / 2),
    y: size * 1.5 * c[1],
  };
}
