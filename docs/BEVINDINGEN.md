# Bevindingen uit het lab

*Bij de bouw van de engine en het lab, augustus 2026. Alles hieronder is gemeten
met de code in deze repo; onder elk punt staat hoe je het zelf terugkrijgt.*

De handoff zegt: niet heronderhandelen zonder meting. Dit document is de meting.
Er staan een paar dingen in die botsen met §2 en §3 — niet omdat de vorm niet
deugt, maar omdat de referentiebot een ander spel speelde dan de regels
beschrijven.

---

## Kort

1. **De rekensom klopt niet.** Zij heeft minimaal 18 beurten nodig voor 12
   sporen, hij 14 voor 28 tegels. Hij is structureel vier beurten sneller,
   nog vóór hij één spoor van haar heeft opgegeten.
2. **Hij vreet 61–78% van alles wat zij bouwt.** Dat is de bindende beperking,
   en het is de enige knop die niet in §5 staat.
3. **De gesloten kringloop doet niets.** Met de oogst uit en tótaal 2 substantie
   in het spel haalt zij nog steeds 100% van de solo-partijen in 18 beurten.
4. **Haar pijplijn heeft géén stille doodlopers.** §4 vermoedde "deels
   bot-domheid, deels een ontwerpsignaal". Het is bot-domheid, en de oorzaak is
   aanwijsbaar: v5's `push()`. Solo gaat van 52% naar 100% binnen 20 beurten.
5. **Er ís een stand die een echte partij oplevert**, maar niet met de knoppen
   uit §5B alleen. Zie het slot.

---

## 1 · De port is aantoonbaar een port

`v5.py` laat spelbeslissingen afhangen van CPython's set-iteratievolgorde:
`for x in order(self.alive)` heet daar `for x in self.alive`, en `max(useless,
key=…)` pakt het eerste maximum in díe volgorde. Dat is geen eigenschap van het
spel maar van de interpreter — hij verschuift met de Python-versie en met de
invoeg- en verwijdergeschiedenis van de set. **Een partij van v5.py is dus niet
reproduceerbaar buiten de exacte interpreter waarop hij draaide.**

`tools/v5_ref.py` is hetzelfde bestand met alleen die iteraties gecanoniseerd
naar bordvolgorde. Over 300 seeds × 3 configuraties verschuift dat niets
(verschillen van 1–2 procentpunt, binnen de ruis):

```
configuratie     bron      med.b  sporen  verzw.  verdeling
basis 12/28      v5.py        80    2.93   25.49  {nexus: 11, timeout: 89}
basis 12/28      v5_ref       80    3.05   25.48  {nexus: 13, timeout: 87}
```

Daarna speelt de TypeScript-engine **zet voor zet dezelfde partij** als
`v5_ref.py`, inclusief de toevalsgenerator: `src/engine/rng.ts` is een
bit-identieke MT19937 met Python's `random`, `getrandbits`, `shuffle` en
`choice`. Bewaakt over 9 configuraties × 208 seeds.

> `python3 tools/compare_v5.py 300` · `npm test`

---

## 2 · De rekensom van de partij

Dit is het belangrijkste getal in het document, en het volgt uit de regels zelf,
niet uit een simulatie.

Een spoor kost haar **drie handelingen**: reiken, vatten, doorgeven. Het kost
haar **geen substantie** — doorgeven geeft beide stenen terug. En een
doorgegeven tegel draagt de draad, dus de volgende tegel ligt weer naast de
draad. Bij 2 handelingen per beurt is dat 2 sporen per 3 beurten:

|                        | ondergrens                |          |
| ---------------------- | ------------------------- | -------- |
| de Laatste, 12 sporen  | 3 × 12 ÷ 2 handelingen    | 18 beurten |
| de Nexus, 28 tegels    | 28 ÷ 2 stappen            | 14 beurten |

**Hij is vier beurten eerder klaar dan zij.** Daar komt bovenop dat hij haar
teller terugdraait. Gemeten met een bot die wél optimaal speelt:

```
basis 12/28, 2 handelingen      zij bouwt  7,1 sporen, hij vreet er  5,5 weg (78%)
3 handelingen                   zij bouwt 10,6 sporen, hij vreet er  7,8 weg (74%)
3 handelingen, 1 stap voor hem  zij bouwt 13,9 sporen, hij vreet er  8,5 weg (61%)
```

Haar bruto-productie is prima. Netto blijft er niets van over.

> `npm run experimenten -- B`

---

## 3 · De gretige bot lekt; de regels doen dat niet

§4 stelde de solo-eis: zonder Nexus moet zij ≥95% halen in ≤20 beurten.

```
solo, 200 seeds        haalt 12 sporen   binnen 20 beurten   mediaan   lek
gretig (de v5-bot)              51%                    0%       31b   23,1 stenen
defensief                       52%                    0%     31,5b   21,2
gemengd                         54%                    0%       31b   22,3
beam (zoekbot)                 100%                  100%       18b    0,0
```

De zoekbot haalt precies de theoretische ondergrens van 18 beurten. **De regels
zijn dus niet stuk; de bot was het.** De oorzaak is aanwijsbaar:

`v5.path()` zoekt de *geometrisch kortste* route van de Zetel naar een doel, en
`v5.push()` legt een steen op het eerste gat in díe route. Die route loopt vaak
niet over haar bestaande draad, zodat ze een tweede keten betaalt en de eerste
laat verzanden. §2 beschrijft iets anders en eenvoudigers: *"Reiken — 1 steen
uit voorraad op tegel naast de draad."* Geen route, geen tussenstenen.

Het gevolg staat in de kolom **lek**: 23,1 van de 30 substantie eindigt op
tegels die nooit meer iets kunnen opleveren — sporen en omgedraaide stille
velden. Dat is 77% van haar lichaam, permanent weg.

`Game.reik()` implementeert de regel zoals §2 hem opschrijft; `Game.push()`
blijft staan voor de v5-bots, want daar hangt de pariteitstest aan.

> `npm run bench -- solo 200`

---

## 4 · De gesloten kringloop is decor

§2 beschrijft het lichaam uitvoerig: 30 substantie, drie plekken, niets
verdwijnt ooit, de doos als bron, het ventiel als noodzaak. §3.3 meldt dat een
open economie leegloopt.

Met een bot die niet lekt, doet dat hele bouwwerk niets:

```
solo, 200 seeds                          haalt 12 sporen   binnen 20 beurten
v5: 8 voorraad, 30 totaal, oogst aan               100%              100%
geen oogst                                         100%              100%
geen oogst, 3 voorraad, 3 totaal                   100%              100%
geen oogst, 2 voorraad, 2 totaal                   100%              100%
geen oogst, 1 voorraad, 1 totaal                     0%                0%
```

**Twee stenen zijn alles wat ze ooit nodig heeft**, want doorgeven geeft ze
allebei terug. De oogst, de doos, de oogstwaarden per tegelsoort, het voeden bij
elke hap — geen ervan raakt de uitkomst. Bij één steen klapt het om, want dan
kan ze geen vat meer maken.

Dat verklaart §3.3 ook: de economie líep leeg, maar door de lek uit punt 3, niet
doordat de kringloop te krap stond.

Dit is geen oproep om de kringloop te schrappen — hij doet thematisch werk en
zorgt dat "hij voedt haar met elke hap" iets betekent aan tafel. Maar als
*schaarste* bindt hij niet, en de knoppen `start`, `total` en de oogstwaarden
zijn op dit moment geen balansknoppen.

> `npm run experimenten -- A`

---

## 5 · De afsla-opties uit §5A werken — voor een probleem dat de sterke bot niet heeft

§3.6 meldde 72% vastlopers. Dat reproduceert: met de gretige bot aan beide
kanten loopt 87% van de partijen vast. Het beeld is scherp in het lab te zien —
zij bezet elke resterende tegel met vat, hij kan geen kant op, en van beurt 18
tot beurt 80 verandert er niets meer.

De afsla-opties halen dat er inderdaad uit:

```
500 seeds, gretig tegen gretig          de Laatste  de Nexus  klem  mediaan
v5 — geen afslag                              0%       13%    87%     80b
1 omsingeling (3 randen, zonder bordrand)     0%       92%     8%     21b
1 omsingeling (3 randen, mét bordrand)        0%      100%     0%     21b
1 omsingeling (2 randen)                      0%      100%     0%     21b
2 stilstand                                   0%       39%    60%     80b
3 honger voorbij                              0%       20%    80%     80b
1+2+3                                         0%       92%     9%     23b
```

**Omsingeling is de enige die het probleem echt oplost**; stilstand en honger
voorbij halen er hooguit een kwart uit. De bordrand meerekenen maakt hem
strenger (8% → 0% klem) maar duwt de partij ook harder naar hem toe.

Maar met de zoekbot loopt er sowieso nooit iets vast (0% klem in alle tien de
varianten), en dan **verandert geen van de drie opties ook maar iets** aan de
uitkomst — hij wint 100%, met of zonder. De patstelling was een symptoom van een
bot die zich ingroef omdat ze niets beters wist te doen.

Aanbeveling: houd **omsingeling met 3 randen, bordrand niet meegeteld** als
vangnet in het regeldocument. Hij kost niets als hij niet nodig is, en hij vangt
precies het gedrag op dat een menselijke speler ook zou vertonen. Stilstand en
honger voorbij zijn extra regels voor weinig effect.

> `npm run bench -- afslag 500 gretig` en `npm run bench -- afslag 200 beam`

---

## 6 · De tempo-knoppen uit §5B halen het niet

Met de zoekbot, alle drie de afsla-opties aan, 200 seeds:

```
stand                          zij   hij     de Laatste  de Nexus  comeback
2 hand. 2 stap 12/28           18b   14b           0%      100%        1%
3 hand. 2 stap 12/28           12b   14b           7%       94%       16%
2 hand. 1 stap 12/28           18b   28b           0%      100%       16%
3 hand. 1 stap 12/28           12b   28b          33%       68%       40%
3 hand. 1 stap 12/25           12b   25b          33%       68%       44%
4 hand. 1 stap 16/26           12b   26b           9%       91%       66%
```

Kijk naar de vierde regel. Haar klok staat op 12 beurten, de zijne op 28 — meer
dan twee keer zo lang — en hij wint nog steeds twee van de drie partijen. Er is
geen instelling van handelingen, stappen en drempels die daar overheen komt,
omdat de knop die telt er niet tussen zit.

> `npm run bench -- balans 200 beam`

---

## 7 · De knop die wél telt

Hoe hard een verzwolgen spoor aankomt staat nergens in §5. Ik heb hem als
instelling toegevoegd (`spoorVreten`, standaard op de v5-regel) en gemeten. Vier
standen, allemaal binnen het thema *"hij kan haar sporen opeten"*:

- **alles** — v5: elk verzwolgen spoor is −1 op haar teller.
- **eenPerBeurt** — hoogstens één per beurt telt af; hij mag er meer opeten.
- **alleenTegel** — de tegel en het merkteken verdwijnen, haar teller blijft
  staan. *Wat doorgegeven is, is doorgegeven.*
- **nooit** — een spoor is onschendbaar, net als een vat.

```
3 handelingen, 2 stappen, 12/28   de Laatste  de Nexus  klem  mediaan  comeback  sporen
alles                                    7%       94%    0%     18b       16%      2,8
eenPerBeurt                              8%       92%    0%     18b       22%      4,7
alleenTegel                             43%       58%    0%     15b       36%      9,8
nooit                                   69%        3%   29%     12b        1%     11,3
```

`eenPerBeurt` verandert bijna niets: hij eet er in de praktijk toch meestal maar
één per beurt. `nooit` slaat door — zij loopt weg en het bord loopt weer vast.
`alleenTegel` levert een partij op.

Fijnstelling daaromheen (200 seeds, nog met alle drie de afsla-opties aan;
het voorstel in het slot is dezelfde richting maar apart nagemeten):

```
stand (alleenTegel)        zij   hij    de Laatste  de Nexus  klem  mediaan  comeback  sporen
3 hand. 2 stap 11/28       11b   14b        50%       50%      0%   13,5b      31%      9,3
3 hand. 2 stap 12/28       12b   14b        43%       58%      0%     15b      36%      9,8
3 hand. 2 stap 13/28       13b   14b        30%       71%      0%     16b      44%     10,1
3 hand. 2 stap 14/28       14b   14b        23%       78%      0%     17b      27%     10,3
```

> `npm run bench -- spoor 200 beam` · `npm run experimenten -- C`

---

## Voorstel om te toetsen

**3 handelingen · 2 stappen · 11 sporen / 28 tegels · spoor = alleenTegel ·
omsingeling aan (3 randen, zonder bordrand).**

400 seeds, de zoekbot voor haar:

```
tegen wie                        de Laatste  de Nexus  klem  mediaan       wissels  comeback  sprints
de gretige Nexus (de v5-bot)          50%       50%     0%     14b (11–27)     0,5      32%        0
de gemengde Nexus                     29%       71%     0%     16b (11–23)     0,8      33%        0
de defensieve Nexus                   32%       68%     0%     15b (11–23)     0,8      36%        0
── v5-stand ter vergelijking ──        0%      100%     0%     19b (14–27)     0,2       2%        0
```

11 + 28 = 39 > 36, dus §1 blijft staan: ze kunnen het niet allebei halen.

Langs de toetslijst uit §5, alleen de punten die ik kán meten:

- *geen dode tijd* — 0% vastlopers, tegen 87% in v5.
- *geen wegloper* — 50/50 tegen de v5-bot, en bijna een derde van de partijen
  wordt gewonnen door de kant die halverwege achterstond.
- *spanningsboog* — mediaan 14 beurten, spreiding 11–27.
- *sprints gedood* — geen enkele partij onder de 6 beurten.

**Belangrijke kanttekening: die 50/50 hangt aan zijn bot.** Laat ik de Nexus
gemengd of defensief spelen — persona's die na hun stap ook op beweeglijkheid
letten — dan zakt zij naar 29–32%. Het evenwichtspunt schuift dus mee met hoe
goed hij gespeeld wordt, en 11 sporen is waarschijnlijk aan de krappe kant zodra
de tegenstander een mens is. Neem het voorstel als richting, niet als eindstand:
de knop die er echt toe doet is `spoorVreten`, de rest is fijnstelling die je
pas kunt vastzetten als je aan tafel weet hoe scherp de Nexus gespeeld wordt.

Wat dit sowieso niet zegt: of het aan tafel léuk is. Twee bots met een
waardefunctie vertellen je waar de klem zit, niet of de beslissing betekenisvol
voelt. Het lab staat er om die partijen zet voor zet af te spelen; dát is het
oordeel dat telt.

Twee dingen die ik zou willen tegenmeten voordat dit het regeldocument in gaat:

1. `alleenTegel` haalt hem zijn comeback-mechaniek af. In de meting gaat de
   spanning omhóóg (2% → 32% comebacks), maar dat komt van háár kant. Speel een
   paar potjes met de hand om te voelen of hij nog dreigend is. `eenPerBeurt` is
   het zachtere alternatief, maar dat mat in deze stand nauwelijks verschil met
   v5 — hij eet er in de praktijk toch meestal maar één per beurt.
2. Bij 3 handelingen zit ze op 1 spoor per beurt zonder speling. Dat maakt haar
   beurt misschien mechanisch. `2 handelingen, 8 sporen / 29 tegels` geeft
   dezelfde ondergrens van 12 beurten en meet 41/60 — de moeite waard om naast
   te leggen.

> `npm run voorstel -- 400`

## Losse eigenaardigheden in v5

Klein, maar ze zitten in elke meting die ooit met `v5.py` gedaan is.

**a. 37 hexen, 36 tegels.** `dict(zip(ALL, deck))` — het bord heeft centrum +
6 + 12 + 18 = 37 hexen, het spel telt 12 + 6 + 6 + 6 + 6 = 36 tegels. De laatste
hex in bordvolgorde krijgt geen tegel: hij oogst niets, telt nergens voor mee, en
de Nexus verzwelgt hem gewoon. In 1945 van 2000 partijen is dat zo; in de
overige 55 valt de Zetel er toevallig op.

**b. "De Nexus start op afstand ≥ 5" geldt in 70% van de partijen.** De Zetel
wordt getrokken uit de gedékte hexen — ring 0, 1 en 3. Valt hij in ring 0 of 1
(607 van 2000), dan bestaat er geen hex op afstand 5 en valt v5 terug op
"willekeurig". In 95 van 2000 partijen begint hij pal naast haar.

**c. De Nexus mag op de Zetel staan.** §2 somt op waar hij wel en niet op mag;
de Zetel staat in geen van beide lijstjes, dus is hij een geldig vakje. En omdat
`consume` de Zetel weigert, eet hij bij vertrek niets: één gratis beurt. Dat
gebeurt in 186 van 400 partijen.

**d. `claim_cost` en `claim_back` doen niets.** `claim()` gebruikt ze niet. De
regel `('claim geeft 1 terug', dict(claim_back=1))` onderaan `v5.py` meet
daardoor exact hetzelfde als de basisregel — de identieke uitkomst in die tabel
is geen bevinding maar een no-op.

**e. §3.7 reproduceert niet.** "Minimum 13 beurten, mediaan ~21–30" — `v5.py`
zoals aangeleverd geeft mediaan 80 (het beurtenplafond), omdat 88% van de
partijen vastloopt. Waarschijnlijk zijn die getallen gemeten mét een
afsla-mechanisme, of vóór de patstelling erin kwam.

Alle vijf staan vastgelegd in `tests/rules.test.ts`, expres als test in plaats
van als stille reparatie — zodat duidelijk is dat het gedrag bekend is en niet
per ongeluk verandert.
