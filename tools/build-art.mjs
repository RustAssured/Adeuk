/**
 * Maakt van de uploads in assets/artwork/ web-klare tegels in public/art/.
 *
 * De originelen zijn 1254x1254 vierkant en 3 MB per stuk — samen 29 MB, te veel
 * voor een lab dat vlot moet openen. Hier worden ze in een pointy-top hexagon
 * gemaskeerd (de vorm van de kaartrug), op maat gebracht en als webp
 * weggeschreven. De originelen blijven onaangeroerd.
 */
import sharp from 'sharp';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets', 'artwork');
const dst = join(root, 'public', 'art');

/** bestandsnaam in assets/artwork -> sleutel in het lab */
const KAART = {
  'planet.png': 'planeet',
  'planet_life.png': 'bewoond',
  'comet.png': 'komeet',
  'black hole.png': 'gat',
  'emptiness.png': 'stil',
  'seat_goed.png': 'seat',
  'back high res.png': 'rug',
  'nexus.png': 'nexus',
  'Supernova.png': 'supernova',
  'Oog.png': 'oog',
};

/**
 * De kaartrug is zelf al een hexagon, maar een iets bredere dan een
 * regelmatige: gemeten 1060 x 1175 px, verhouding 0,902 tegen 0,866. Recht
 * maskeren snijdt daarom de gouden rand aan weerszijden af. Deze uitsnede
 * schaalt hem eerst zo dat zijn breedte precies in het masker past; boven en
 * onder blijft dan een haartje leeg, wat op de donkere achtergrond niet opvalt.
 */
const UITSNEDE = {
  rug: { left: 14, top: 0, width: 1224, height: 1224 },
};

/** de tegels op het bord; de rest is decor en mag groter blijven */
const TEGELS = new Set(['planeet', 'bewoond', 'komeet', 'gat', 'stil', 'seat', 'rug']);

const MAAT = 512;   // tegelkant in px — scherp genoeg voor 2x op een grote hex
const DECOR = 768;

/** pointy-top hexagon: punten boven en onder, vlakke zijden links en rechts */
function hexMasker(maat) {
  const r = maat / 2;
  const b = (Math.sqrt(3) / 2) * r; // halve breedte van de vlakke zijde
  const p = [
    [r, 0],
    [r + b, r * 0.5],
    [r + b, r * 1.5],
    [r, maat],
    [r - b, r * 1.5],
    [r - b, r * 0.5],
  ];
  const punten = p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return Buffer.from(
    `<svg width="${maat}" height="${maat}" xmlns="http://www.w3.org/2000/svg">` +
      `<polygon points="${punten}" fill="#fff"/></svg>`,
  );
}

async function main() {
  await mkdir(dst, { recursive: true });
  const aanwezig = await readdir(src);
  const manifest = {};
  let totaal = 0;

  for (const [bestand, sleutel] of Object.entries(KAART)) {
    if (!aanwezig.includes(bestand)) {
      console.warn(`  ontbreekt: ${bestand} — overgeslagen`);
      continue;
    }
    const maat = TEGELS.has(sleutel) ? MAAT : DECOR;
    const uit = join(dst, `${sleutel}.webp`);

    let pijp = sharp(join(src, bestand));
    const uitsnede = UITSNEDE[sleutel];
    if (uitsnede) pijp = pijp.extract(uitsnede);
    pijp = pijp.resize(maat, maat, { fit: 'cover' });
    if (TEGELS.has(sleutel)) {
      // de kunst vult het vierkant; de hexagon snijdt eruit wat op het bord past
      pijp = pijp
        .composite([{ input: hexMasker(maat), blend: 'dest-in' }])
        .ensureAlpha();
    }
    await pijp.webp({ quality: 88, effort: 5 }).toFile(uit);
    const { size } = await stat(uit);
    totaal += size;
    manifest[sleutel] = { bestand: `art/${sleutel}.webp`, maat, hex: TEGELS.has(sleutel) };
    console.log(`  ${sleutel.padEnd(10)} ${String(maat).padStart(4)}px  ${(size / 1024).toFixed(0).padStart(4)} kB`);
  }

  await writeFile(join(dst, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n  samen ${(totaal / 1024 / 1024).toFixed(2)} MB (origineel 29 MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
