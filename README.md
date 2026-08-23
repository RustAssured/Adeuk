# 아득 ADEUK — engine + simulatielab

Regel-engine (port van `docs/v5.py`) en een visueel lab om er metingen mee te
doen. Opgezet volgens `docs/ADEUK_handoff.md`.

Wat je waarschijnlijk het eerst wilt lezen:

- **[docs/BEVINDINGEN.md](docs/BEVINDINGEN.md)** — meting 1: de v5-regels, de
  afsla-opties en de rekensom van de partij.
- **[docs/BEVINDINGEN2.md](docs/BEVINDINGEN2.md)** — meting 2: de middenlaag —
  verharden, verzilveren en de Oversteek.

## Aan de slag

```bash
npm install
npm run art      # eenmalig: maakt public/art/ uit assets/artwork/
npm run dev      # het lab op http://localhost:5173
```

```bash
npm test         # 47 tests: pariteit met v5.py, regel-invarianten, botgedrag
npm run build    # productiebundel in dist/
```

## Het lab

- **Bord** met de echte artwork, hex-gemaskeerd. Vat = gouden gloed, rand =
  zwart gat met paarse contour, spoor = gouden zegel met het oog-motief, de
  gedekte tegels tonen de kaartrug.
- **Replay per zet**, niet per beurt. Elke handeling apart, met één regel uitleg.
  Vooruit, terug, springen, tempo-regelaar, seed-invoer. Pijltjestoetsen en
  spatie werken ook.
- **Knoppen**: alle instellingen uit §5 van de handoff, live. Elke wijziging
  speelt hetzelfde potje meteen opnieuw. Eén configuratie-object, geen herbouw.
- **Batch**: n potjes in een aparte draad, met winstverdeling, duurhistogram,
  vastlopers, leiderswissels en comebacks. Klik een potje om het af te spelen.

## Metingen op de opdrachtregel

```bash
# meting 2 — de middenlaag
npm run meet2 -- stand 200         # de meetstand, tegen alle drie de Nexus-persona's
npm run meet2 -- matrix 150        # K x M x drempel
npm run meet2 -- ablatie 150       # elk van de drie regels apart uit
npm run meet2 -- personas 150      # beide bots tegen alle persona's
npm run meet2 -- oog 150           # het ingesloten Oog en twee kandidaat-reparaties

# meting 1 — de v5-regels en de afsla-opties
npm run bench -- solo 500          # de solo-batterij uit §4
npm run bench -- afslag 500 beam   # de drie afsla-opties uit §5A
npm run bench -- tempo 500 beam    # de tempo-knoppen uit §5B
npm run bench -- balans 500 beam   # zoekt de stand waar beide kanten een kans hebben
npm run bench -- spoor 500 beam    # hoe hard een verzwolgen spoor mag aankomen
npm run bench -- personas 300 beam # de persona's tegen elkaar

npm run experimenten               # de drie metingen achter BEVINDINGEN.md
npm run trace -- beam 0            # één partij, zet voor zet, in de terminal
npm run voorstel -- 400            # de stand uit het slot van BEVINDINGEN.md
```

Het derde argument is de bot voor de Laatste: `gretig` (de v5-bot),
`defensief`, `gemengd` of `beam` (de zoekbot). Standaard `beam`.

## Hoe het in elkaar zit

```
src/engine/         de regels — kent geen scherm
  rng.ts            Mersenne Twister met de Python-random-API (bit-identiek)
  hex.ts            axiale coördinaten, ringen, afstand
  game.ts           de port van v5, plus logboek en de afsla-opties
  config.ts         elke knop uit §5 en de middenlaag, op één plek
  meting2.ts        de metrieken die meetopdracht 2 vraagt
  batch.ts          de metrieken die §5 per optie vraagt
  bots/gretig.ts    de v5-bot, bevroren — het ijkpunt voor de pariteitstest
  bots/persona.ts   dezelfde heuristiek met gewichten: gretig/defensief/gemengd
  bots/beam.ts      de zoekbot uit §4
src/lab/            het lab — kent de regels alleen via een Snapshot
tools/              v5_ref.py, golden-generator, meetbank
tests/              pariteit, regel-invarianten, botgedrag
assets/artwork/     de originelen, onaangeroerd
public/art/         wat het lab laadt (29 MB → 1,1 MB)
```

De engine draait ongewijzigd in Node en in de browser. Er is geen aparte
"lab-versie" van de regels.

## Pariteit met v5.py

`docs/v5.py` laat spelbeslissingen afhangen van CPython's set-iteratievolgorde
(`for x in self.alive`, `max(useless, …)`). Dat is een implementatiedetail van
de interpreter en niet porteerbaar. `tools/v5_ref.py` is hetzelfde bestand met
alleen die iteraties gecanoniseerd naar bordvolgorde; `tools/compare_v5.py`
laat zien dat dat de uitkomsten niet verschuift.

De TypeScript-engine speelt vervolgens **zet voor zet dezelfde partij** als
`v5_ref.py` — inclusief de toevalsgenerator, want `src/engine/rng.ts` is een
bit-identieke MT19937 met Python's `random`, `shuffle` en `choice`.
`tests/parity.test.ts` bewaakt dat over negen configuraties, elk met acht
volledig uitgeschreven partijen en tweehonderd gehashte.

Bijwerken na een wijziging aan de referentie:

```bash
npm run golden   # herschrijft tests/golden/v5.json
```

## Wat er nog niet is

- Het driedimensionale Nexus-figuur (`Nexus3d.glb`) en de steen-sprites
  (`steen_1/2/3`) uit §6 zitten niet in de repo. De Nexus staat er nu als
  sprite; stenen worden getekend.
- De weergave is 2D-canvas. Dat leest voor een lab beter dan 3D: je wilt de
  hele draad en alle randen in één oogopslag zien. `src/lab/board.ts` praat
  alleen met een `Snapshot`, dus er kan later een driedimensionale weergave
  naast zonder de engine of het lab te raken.
- Het definitieve artwork voor de Oog-tegel. Er is een eigen slot
  (`public/art/oogtegel.webp`); zolang dat er niet is wordt `Oog.png` gebruikt,
  met het oog-motief van de kaartrug eroverheen getekend.
- Laag 5 (vlagplaatsing, verval, kosmische kaarten, supernova) staat nog niet
  in de engine — §5C zegt: pas nadat de klem klopt.
