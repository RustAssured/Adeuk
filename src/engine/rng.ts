/**
 * Mersenne Twister (MT19937) met de Python-`random`-API die v5.py gebruikt.
 *
 * Waarom niet gewoon Math.random: de handoff (§6) zegt "porten, niet
 * herschrijven". Een port is pas aantoonbaar een port als hij dezelfde partij
 * speelt als het origineel. Deze klasse levert bit-identieke uitkomsten voor
 * `random()`, `getrandbits()`, `shuffle()` en `choice()` bij dezelfde seed,
 * zodat tests/parity.test.ts de TS-engine tegen echte v5.py-traces kan leggen.
 */

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class MersenneTwister {
  private mt = new Uint32Array(N);
  private mti = N + 1;

  constructor(seed: number | bigint) {
    this.seedPython(seed);
  }

  /** CPython's `random_seed`: abs(n) in 32-bits woorden, little-endian, via init_by_array. */
  private seedPython(seed: number | bigint): void {
    let n = typeof seed === 'bigint' ? seed : BigInt(Math.trunc(seed));
    if (n < 0n) n = -n;
    const key: number[] = [];
    if (n === 0n) {
      key.push(0);
    } else {
      while (n > 0n) {
        key.push(Number(n & 0xffffffffn));
        n >>= 32n;
      }
    }
    this.initByArray(key);
  }

  private initGenrand(s: number): void {
    this.mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      // 1812433253 * prev + i, in 32-bits — opgesplitst om float-precisie te vermijden
      const lo = (prev & 0xffff) * 1812433253;
      const hi = (((prev >>> 16) * 1812433253) & 0xffff) << 16;
      this.mt[i] = (lo + hi + i) >>> 0;
    }
    this.mti = N;
  }

  private initByArray(key: number[]): void {
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    let k = Math.max(N, key.length);
    for (; k > 0; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      const lo = (prev & 0xffff) * 1664525;
      const hi = (((prev >>> 16) * 1664525) & 0xffff) << 16;
      this.mt[i] = ((((this.mt[i] ^ (lo + hi)) >>> 0) + key[j] + j) >>> 0) >>> 0;
      i++;
      j++;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (k = N - 1; k > 0; k--) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      const lo = (prev & 0xffff) * 1566083941;
      const hi = (((prev >>> 16) * 1566083941) & 0xffff) << 16;
      this.mt[i] = ((((this.mt[i] ^ (lo + hi)) >>> 0) - i) >>> 0) >>> 0;
      i++;
      if (i >= N) {
        this.mt[0] = this.mt[N - 1];
        i = 1;
      }
    }
    this.mt[0] = 0x80000000;
  }

  /** Eén 32-bits woord — genrand_uint32. */
  next32(): number {
    let y: number;
    if (this.mti >= N) {
      if (this.mti === N + 1) this.initGenrand(5489);
      let kk = 0;
      for (; kk < N - M; kk++) {
        y = ((this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK)) >>> 0;
        this.mt[kk] = (this.mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
      }
      for (; kk < N - 1; kk++) {
        y = ((this.mt[kk] & UPPER_MASK) | (this.mt[kk + 1] & LOWER_MASK)) >>> 0;
        this.mt[kk] = (this.mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
      }
      y = ((this.mt[N - 1] & UPPER_MASK) | (this.mt[0] & LOWER_MASK)) >>> 0;
      this.mt[N - 1] = (this.mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
      this.mti = 0;
    }
    y = this.mt[this.mti++];
    y ^= y >>> 11;
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** Python `random.random()` — genrand_res53, 53 bits uit twee woorden. */
  random(): number {
    const a = this.next32() >>> 5;
    const b = this.next32() >>> 6;
    return (a * 67108864 + b) * (1.0 / 9007199254740992.0);
  }

  /** Python `random.getrandbits(k)` voor k <= 32 (meer hebben we niet nodig). */
  getrandbits(k: number): number {
    if (k <= 0) return 0;
    if (k > 32) throw new RangeError('getrandbits(>32) niet ondersteund');
    return this.next32() >>> (32 - k);
  }

  /** CPython `_randbelow_with_getrandbits`. */
  randbelow(n: number): number {
    if (n <= 0) return 0;
    const k = 32 - Math.clz32(n); // bit_length
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** Python `random.shuffle` — Fisher-Yates omlaag met _randbelow. */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randbelow(i + 1);
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }

  /** Python `random.choice`. */
  choice<T>(seq: readonly T[]): T {
    return seq[this.randbelow(seq.length)];
  }
}
