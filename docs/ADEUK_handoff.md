# 아득 — ADEUK · Overdracht naar Claude Code

*Voor: bouw van het simulatielab + solver-bot in de repo. 21 augustus 2026.*

Dit document is de enige bron. Alles hierin is gemeten of expliciet besloten in de
ontwerpsessies. Niet heronderhandelen zonder meting.

---

## 1. Het spel in één alinea

**De Laatste** (een web) en **de Nexus** (een punt) verdelen een eindig universum van 36
tegels. Zij *markeert* tegels als doorgegeven (sporen); hij *verzwelgt* tegels
permanent. Zij wint bij **12 staande sporen**, hij bij **28 verzwolgen tegels**.
12 + 28 = 40 > 36: ze kunnen niet allebei — elke tegel telt. Hij kan haar sporen
opeten (haar teller loopt terug); zij kan tegels met vat voor hem afsluiten.

Toon: stierengevecht. Zij danst en bouwt; hij is traag, onstuitbaar, en voedt haar
met elke hap (1 substantie per verzwolgen tegel).

---

## 2. Regels v5 (zoals gemeten)

### Bord
- 37 hexen: centrum + ring 1 (6) + ring 2 (12) + ring 3 (18).
- Tegels geschud: 12 planeet, 6 bewoond, 6 komeet, 6 zwart gat, 6 stil veld.
- Middelste ring (12) ligt open; de rest gedekt. Gedekt = de kaartrug = lege ruimte.
- De Zetel: willekeurige gedekte tegel (later: de Laatste kiest). De Nexus start op
  afstand ≥ 5 van de Zetel.

### De Laatste
- **Lichaam: 30 substantie, gesloten kringloop.** Drie plekken: voorraad / bord / doos.
  Niets verdwijnt ooit. Start: 8 in voorraad, 22 in doos.
- 1 steen op tegel = **ijl** (aanwezig, machteloos). 2 = **vat** (oogst; Nexus kan er
  niet in).
- **De draad:** alles verbonden met de Zetel; sporen (markeringen) dragen de draad ook
  zonder stenen.
- **Beurt:** (a) oogst — elke vat-tegel geeft naar voorraad (bewoond 2, rest 1; doos is
  de bron, dus max = wat er in de doos zit); (b) 2 handelingen:
  - **Reiken** — 1 steen uit voorraad op tegel naast de draad; gedekt → omdraaien.
  - **Vatten** — tweede steen erbij.
  - **Doorgeven** — vat-tegel wordt spoor: beide stenen terug naar voorraad, merkteken
    erop, +1 op haar teller. Spoor oogst niets meer.
  - **Terugtrekken** — steen van het bord terug naar voorraad. (Verplicht ventiel;
    zonder dit loopt haar economie aantoonbaar vast.)
- **Reiken door de rand:** over n aaneengesloten verdwenen tegels heen; kost n+2, alles
  behalve de aankomende steen keert terug naar de doos.

### De Nexus
- Punt-figuur, **max 2 stappen per beurt**, elke richting.
- Tegel die hij verlaat: **verzwolgen** — van het bord, +1 zijn teller, en **+1
  substantie voor de Laatste** (uit de doos).
- Mag niet op: vat-tegels. Wel op: ijl (steen → doos), sporen (**spoor weg, haar teller
  −1** — dit is zijn comeback/grab), open, gedekt.
- **Moet elke beurt minstens 1 tegel verzwelgen** (de klok: max 36 beurten).

### Einde
- Laatste: 12 staande sporen. Nexus: 28 verzwolgen. Bord op zonder winnaar: niemand
  wint — "het universum eindigde en niets ging door."

---

## 3. Gemeten feiten (niet opnieuw ontdekken)

1. **Aankomen-als-winst degenereert altijd** tot een sprint van 2–4 beurten. Winst moet
   opgebouwd worden (tellers), niet bereikt (locatie). Locaties (Oog/Zetel) komen terug
   als *slotstuk* (laag 5), pas nadat de teller vol is.
2. **Tegels verwijderen door de Laatste breekt haar eigen wegen** (solo-slagingskans
   ging van ~0% naar ~50% door markeren i.p.v. verwijderen). Invariant: alleen de Nexus
   laat verdwijnen.
3. **Open economie loopt leeg** (doos leeg op beurt 8, daarna 20 beurten machteloos).
   Gesloten kringloop is de juiste vorm; het ventiel (terugtrekken) is onmisbaar.
4. **Tellers in dezelfde munt** (tegels), anders bindt de schaarste niet
   (12 punten ≈ 6 tegels ≠ 12 tegels).
5. **1:1-ruil breekt alles**: de partij met hergebruik wint elke gelijke uitruil.
6. **Zonder afsla-mechanisme voor vat**: 72% vastlopers (zij verschanst zich eeuwig).
   → de drie te meten opties, §5.
7. Sprints gedood: minimum 13 beurten, mediaan ~21–30 afhankelijk van knoppen.
8. Kaarten in de vorige architectuur: effect 64% vs 57% — klein maar echt. Pas
   toevoegen als de kern staat.

## 4. Bekende zwakte van de chat-bot (waarom een solver nodig is)

De gretige bot voor de Laatste haalt solo (zonder tegenstander!) maar ~47% van de
partijen 12 sporen. Faalwijzen: stenen lekken naar dode tegels, doelwissel-fladderen,
motor/verzilver-afweging te subtiel. Deels bot-domheid, deels een ontwerpsignaal
(haar pijplijn heeft veel stille doodlopers — bewaken met stelregel 2).

**Botvereiste:** minimaal beam-search of MCTS-light (2–3 ply), aparte persona's
(gretig / defensief / gemengd) voor beide kanten. Eerst solo-batterij: de Laatste
zonder Nexus moet ≥ 95% halen in ≤ 20 beurten, anders is de bot (of de regel) stuk.

---

## 5. Te meten in het lab (in volgorde)

**A. De drie afsla-opties** (elk apart + combinaties, 500+ seeds, beide personas):
1. **Omsingeling:** vat-tegel grenzend aan ≥ 3 rand-zijden verliest 1 steen (→ doos)
   aan het eind van zijn beurt. Variant: bordrand telt wel/niet mee als rand-zijde.
2. **Stilstand:** hij slaat zijn hele beurt over (ook de verplichte hap) en slaat 1
   steen af van een aangrenzende vat-tegel.
3. **Honger voorbij:** begint hij zijn beurt zonder aangrenzende niet-vat-tegel, dan
   mag hij een vat-tegel volledig verzwelgen.
Metriek per optie: winstverdeling, mediaanduur, vastlopers, leiderswissels,
comeback-frequentie (winnaar stond halverwege achter).

**B. Tempo-knoppen:** haar handelingen (2/3), zijn stappen (1/2), drempels
(12/28 ↔ 10/26 ↔ 14/30), oogstwaarden.

**C. Daarna pas, één laag per keer:** vlagplaatsing als slotstuk (Oog/Zetel), verval
van onaangeraakte tegels, kosmische kaarten, supernova.

**Toetslijst bij elke meting** (staat ook in geheugen): betekenisvolle beslissing /
makkelijk leren / geen dode tijd / spanningsboog / geen wegloper / meerdere wegen /
thema=mechaniek / herspeelbaarheid / leesbaar bord.

---

## 6. Het lab (visueel — dit is óók een ontwerpinstrument)

WJ moet de stappen kunnen *zien*, representatief. Vereisten:

- **Bordweergave met de echte assets** (uploads in de repo): tegel-artwork
  (black_hole, comet, planet, planet_life, emptiness, Supernova, seat_goed,
  back_high_res als kaartrug), stenen (steen_1/2/3), Nexus (nexus.png of het
  3D-figuur — Nexus3d.glb, ~10 MB; Draco-compressie aanbevolen, of de render
  1787352990072_image.png als sprite).
- Beeldtaal: donker (#06050a), goud #c9a44a, substantie #e0a9a0, aantrekking #9b7fd4;
  vat = gouden gloed om de tegel; rand = zwart gat met dunne paarse contour; spoor =
  goudkleurig merkteken; de gedekte rug toont het oog-motief.
- **Afspeelbaar per zet** (niet per beurt): elke handeling apart, met één regel
  uitleg ("de Laatste reikt naar…", "de Nexus verzwelgt… en voedt haar"). Stap
  vooruit/terug, snelheidsregelaar, seed-invoer.
- Batch-modus: n potjes → winstverdeling, duurhistogram, wisselgrafiek; klik op een
  potje → replay.
- Parameters live instelbaar (alle knoppen uit §5) zonder herbouw — één config-object
  (les uit RESONANTIE: tempo.ts).
- Referentie-implementatie van de regels: `v5.py` (meegeleverd) — porten, niet
  herschrijven; de subtiliteiten (spoor draagt draad, kringloop, rand-sprong) zitten
  erin.

## 7. Werkwijze

- Blokkendoos eerst; Meshy/polish pas als de klem klopt.
- Elke regelwijziging: eerst meten, dan pas in het regeldocument.
- Scope-plafond fysiek spel: één bord, zes tegeltypes, fiches en kaarten, geen
  miniatures (het Nexus-figuur uitgezonderd).
