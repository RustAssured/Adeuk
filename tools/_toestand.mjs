import { chromium } from 'playwright';
const SP = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGE ERR:', e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
// een potje waar zeker ketens in zitten: spoel door naar het eind
await p.$eval('#seed', e => { e.value = '3'; e.dispatchEvent(new Event('change', {bubbles:true})); });
await p.waitForTimeout(1200);
async function schot(naam, frac) {
  await p.$eval('#scrub', (e, f) => {
    e.value = String(Math.floor(Number(e.max) * f));
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }, frac);
  await p.waitForTimeout(700);
  await p.locator('#bordvak').screenshot({ path: `${SP}/toestand-${naam}.png` });
}
await schot('vroeg', 0.22);
await schot('midden', 0.55);
await schot('laat', 0.92);
await b.close();
