/**
 * De Zetel en de Nexus staan als 3D-model in assets/. Het lab tekent op canvas
 * en niet in WebGL, dus die modellen worden hier één keer omgezet naar een
 * plaatje: één opname per figuur, met het licht van het bord erop.
 *
 * Zo blijft het lab licht — geen WebGL, geen 10 MB aan geometrie in de browser —
 * en zien de twee figuren er toch uit zoals ze bedoeld zijn.
 *
 *   node tools/build-figuren.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  const bestand = path.join(WORTEL, decodeURIComponent(req.url.split('?')[0]));
  if (!bestand.startsWith(WORTEL) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
    res.writeHead(404);
    res.end('weg');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(bestand)] ?? 'application/octet-stream' });
  fs.createReadStream(bestand).pipe(res);
});
await new Promise((k) => server.listen(4199, k));

const FIGUREN = [
  { naam: 'zetel', glb: '/assets/Seat 3D.glb', rand: 0xc9a44a, hoogte: 16 },
  { naam: 'nexus', glb: '/assets/Nexus3d.glb', rand: 0x9b7fd4, hoogte: 14 },
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const f of FIGUREN) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
  page.on('pageerror', (e) => console.error('  fout:', e.message));
  await page.goto('http://localhost:4199/tools/figuur.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.gereed === true, null, { timeout: 30000 });
  const data = await page.evaluate(
    ([url, rand, hoogte]) => window.rendereer(url, rand, hoogte),
    [encodeURI(f.glb), f.rand, f.hoogte],
  );
  await page.close();

  const rauw = Buffer.from(data.split(',')[1], 'base64');
  const uit = path.join(WORTEL, 'public/art', `figuur-${f.naam}.webp`);
  const beeld = sharp(rauw).trim({ threshold: 2 }).resize(420, 420, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  await beeld.webp({ quality: 88, alphaQuality: 92 }).toFile(uit);
  const { size } = fs.statSync(uit);
  console.log(`  ${f.naam.padEnd(6)} -> ${path.relative(WORTEL, uit)}  ${(size / 1024).toFixed(0)} kB`);
}

await browser.close();
server.close();
