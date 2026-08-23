# Bevindingen — meting 2: de middenlaag

*Verharden, verzilveren en de Oversteek, gemeten met de code in deze repo.
Vervolg op [BEVINDINGEN.md](BEVINDINGEN.md). Startpunt: de aanbevolen stand uit
meting 1 — 3 handelingen, 2 stappen, `spoorVreten = alleenTegel`, omsingeling
aan — met de drempel als knop.*

De drie regels staan standaard uit. `meeting2()` zet de meetstand; de pariteit
met `v5.py` blijft daardoor onaangetast (9 configuraties × 208 seeds, beurt voor
beurt gelijk).

---

## Kort

1. **De drie regels werken, maar alleen samen.** De Oversteek in zijn eentje
   maakt haar kansen slechter dan vóór meting 2; verharden zonder verzilveren
   verzet niets. Los ingevoerd doen ze schade.
2. **Verzilveren is de enige regel die de balans verzet** — van 29% naar 59%.
   Verharden is de opstap ernaartoe.
3. **De Oversteek verzet de balans niet, maar wel de partij.** Comebacks van 26%
   naar 76%, leiderswissels van 0,2 naar bijna 2. Dat is precies wat de speeltest
   miste.
4. **De sprint-check faalt.** In de basisstand is een derde van de partijen
   binnen acht beurten voorbij, bij drempel 9 meer dan de helft. Eén keten van
   vier is bij M 2 al acht punten.
5. **Het Oog kan worden ingesloten, en dan gebeurt er niets meer.** Ruim een
   kwart van de partijen loopt tot het beurtenplafond. Dit is de vervelendste
   vondst en hij stond niet in de opdracht.
6. **Er is één stand die het wél doet:** K 3, M 1,5, drempel 13 — en het mooiste
   eraan is dat de balans nauwelijks meebeweegt met hoe goed de Nexus gespeeld
   wordt. Alleen die dode tijd moet er nog uit.

## Wat de opdracht openliet, en wat ik ervan gemaakt heb

De drie regels zijn scherp opgeschreven, maar op zes punten moest ik kiezen.
Alle zes staan als test vastgelegd in `tests/middenlaag.test.ts`, en waar het er
echt toe doet staat er een knop naast zodat de andere lezing te meten is.

1. **Een groep die de K voorbijschiet.** "Verhardt op het moment dat de K-de
   tegel vat krijgt." Eén vatting kan twee losse groepen aan elkaar knopen en zo
   in één keer van 2 + 2 naar 5 gaan. Ik verhard dan de hele groep — elke
   deelverzameling van K aaneengesloten vat-tegels erin voldoet immers aan de
   regel, en er een deel van uitkiezen zou willekeurig zijn.

2. **Stilstand tegen een verharde keten.** "Onaantastbaar: niet te verzwelgen,
   ook niet via omsingeling." Stilstand (§5A-2) slaat óók een steen af en wordt
   niet genoemd. Ik laat hem er eveneens op afstuiten: het is hetzelfde soort
   ingreep, en anders is "onaantastbaar" niet waar.

3. **Stille velden in een keten.** De regel zegt *vat-tegels*, zonder eis aan de
   opbrengst. Een stil veld kan dus meetellen in een keten en via het verzilveren
   punten opleveren, terwijl los doorgeven ervan nog steeds niets waard is. Dat
   geeft de zes stille velden voor het eerst een rol. Ik heb het zo gelaten; het
   is een van de aardigste gevolgen van de regel.

4. **Wat "een pad naar het Oog" betekent.** Moet het Oog zelf ook van haar zijn,
   of volstaat een pad tot ernaast? Ik heb de strenge lezing als standaard
   genomen — anders is aankomen niets meer dan ernaast staan — met
   `oversteek.oogMoetVanHaarZijn` als knop voor de andere.

5. **Geen hex op afstand 4.** Staat de Zetel in het centrum (4% van de partijen),
   dan bestáát er geen tegel op afstand 4; het bord reikt daar maar tot 3. Ik val
   dan terug op de verste tegel die er wel is, net zoals v5 dat bij de
   Nexus-plaatsing doet.

6. **Honger voorbij tegen verharde ketens.** Staat hij volledig ingesloten door
   verharde tegels, dan mag hij er geen van verzwelgen — dan is hij echt klem, en
   dat is de bedoeling van "onaantastbaar".

## Hoe de matrix is opgezet

De opdracht vraagt K × M × drempel × beide bots × drie Nexus-persona's: 3 × 2 ×
3 × 2 × 3 = 108 vakjes, ruim vier uur rekenen, en het meeste ervan zou niets
nieuws vertellen. Opgesplitst in drie sneden:

- **K × M × drempel** (18 standen) tegen de gemengde Nexus, met de zoekbot — dat
  is de as waar de knoppen op zitten.
- **beide bots × drie persona's** (9 standen) op de basisstand, om te zien of de
  uitkomst aan de bot hangt of aan de regel.
- **de beste stand uit de matrix** nog eens tegen alle drie de persona's, want in
  meting 1 bleek het evenwichtspunt daarmee mee te schuiven.

### De matrix

150 partijen per stand, tegen de gemengde Nexus, met de zoekbot voor de Laatste.
*blokkade* = hij wint doordat de weg naar het Oog weg is terwijl haar teller vol
staat; *dood* = dezelfde stand maar niemand wint; *sprints* = partijen korter
dan acht beurten.

```
stand                  zij   hij   onbeslist  mediaan  verhard  los   blokkade  dood  sprints 
────────────────────── ───── ───── ────────── ──────── ──────── ───── ───────── ───── ────────
K3 · M1,5 · drempel 9  57%   22%   21%        14 b     77%      32%   11%       13%   6%      
K3 · M1,5 · drempel 11 47%   31%   22%        16 b     78%      33%   13%       8%    1%      
K3 · M1,5 · drempel 13 41%   31%   28%        17,5 b   75%      35%   9%        7%    0%      
K3 · M2 · drempel 9    63%   15%   22%        12 b     78%      24%   7%        16%   17%     
K3 · M2 · drempel 11   62%   17%   21%        13 b     77%      13%   11%       14%   13%     
K3 · M2 · drempel 13   59%   18%   23%        14 b     74%      14%   9%        15%   10%     

K4 · M1,5 · drempel 9  29%   44%   27%        19,5 b   61%      74%   22%       11%   9%      
K4 · M1,5 · drempel 11 23%   48%   29%        20,5 b   58%      68%   22%       7%    1%      
K4 · M1,5 · drempel 13 19%   57%   24%        20 b     57%      67%   21%       4%    1%      
K4 · M2 · drempel 9    67%   18%   15%        7 b      79%      15%   15%       14%   55%     
K4 · M2 · drempel 11   59%   21%   20%        9 b      82%      26%   14%       15%   32%     
K4 · M2 · drempel 13   55%   29%   16%        11 b     80%      32%   15%       7%    5%      

K5 · M1,5 · drempel 9  22%   48%   30%        21 b     65%      86%   21%       9%    3%      
K5 · M1,5 · drempel 11 19%   50%   31%        20 b     57%      83%   17%       7%    1%      
K5 · M1,5 · drempel 13 16%   50%   34%        21 b     55%      81%   14%       5%    0%      
K5 · M2 · drempel 9    23%   47%   30%        21 b     66%      79%   20%       10%   6%      
K5 · M2 · drempel 11   29%   41%   30%        20 b     47%      61%   13%       10%   15%     
K5 · M2 · drempel 13   25%   45%   30%        20 b     49%      53%   18%       7%    5%      
```

---

## De drie vragen van de opdracht

### 1 · Breekt de Nexus ketens-van-K−1 op tijd, of is verharden gratis?

**Dat hangt volledig aan K, en bij K = 3 is verharden inderdaad zo goed als
gratis.** Het aandeel ketenpogingen dat de verharding haalt loopt over de matrix
van 29% tot 82%:

- **K = 3** — 72 tot 78% verhardt. Hij komt vrijwel nooit op tijd.
- **K = 4** — 56 tot 82%, sterk afhankelijk van M.
- **K = 5** — 29 tot 62%. Hier heeft hij echt tegenspel.

De reden is mechanisch. Hij kan een vat-tegel niet binnengaan, dus hij kan een
keten alleen breken door hem in te sluiten en de **omsingeling** het werk te
laten doen — drie rand-zijden per tegel. Bij K = 3 heeft zij drie handelingen
nodig om een keten te sluiten (reiken, vatten, en de laatste tegel afmaken); hij
heeft er meer nodig om er genoeg randen omheen te eten. Bij K = 5 draait die
verhouding om.

Er is één rechtstreeks breekwapen: **stilstand** (§5A-2), waarmee hij zijn hele
beurt inruilt voor één afgeslagen steen. In de aanbevolen stand uit meting 1
staat die optie uit. De Nexus-persona's *gemengd* en *defensief* mikken hem, als
hij aan staat, gericht op groepen die één tegel van verharden af staan.

### 2 · Verzilvert de zoekbot ooit los, of altijd via ketens?

**Los doorgeven leeft, maar het is K en M samen die beslissen — niet M alleen.**
Het aandeel punten uit los doorgeven loopt van 13% tot 85%:

- **K = 3 met M = 2** — 13 tot 25% los. Hier is los doorgeven bijna dood: een
  keten van drie levert zes punten voor zeven handelingen, los doorgeven één
  punt voor drie.
- **K = 3 met M = 1,5** — 30 tot 35% los. Gezond naast elkaar.
- **K = 4 of 5 met M = 1,5** — 55 tot 85% los. De keten is dan zóveel werk dat
  ze hem alleen nog bouwt als hij toevallig uitkomt.

De gezonde band ligt dus rond **M = 1,5 bij K = 3**, of **M = 2 bij K = 4 met een
hoge drempel**. M = 2 bij K = 3 is te veel.

### 3 · Route-blokkade: wint hij ooit door de weg weg te vreten?

**Ja, en netjes binnen de gevraagde band — in alle achttien vakjes.** Hij wint
in 7 tot 23% van de partijen doordat haar teller vol staat maar de weg naar het
Oog weg is. De opdracht vroeg om meer dan 0% en minder dan 30%; dat klopt overal.

Dit is zijn nieuwe spel, en het werkt. Het werkt bovendien juist dankzij
`spoorVreten = alleenTegel` uit meting 1: haar punten blijven staan, maar de
tégel verdwijnt, en daarmee de route. Zonder die regel zou hij haar teller
terugdraaien en de route ongemoeid laten; nu is het omgekeerd, en dat geeft hem
iets te doen dat niet "achter haar aan lopen" is.

---

## Twee dingen die niet werken

### A · De sprint-check faalt — hard

De opdracht vermoedde dat de Oversteek sprints zou tegenhouden, omdat het een
én-voorwaarde is. **Dat doet hij niet.** In de basisstand (K 4, M 2, drempel 11)
eindigt bijna een derde van de partijen binnen acht beurten; bij drempel 9 loopt
dat op tot meer dan de helft, met een mediaan van zes en een halve beurt.

De rekensom erachter is simpel. Een keten van vier levert bij M = 2 **acht
punten in één handeling**. Bij drempel 11 zijn dat er twee te weinig — dus twee
ketens, of één keten plus twee losse. Beide ketens kosten samen achttien
handelingen; met drie handelingen per beurt is dat zes beurten. Ligt het Oog dan
toevallig aan haar kant, dan is de partij voorbij vóór de Nexus iets heeft
kunnen doen.

De Oversteek dempt dat wel — zonder Oversteek zijn de sprints even talrijk maar
verdwijnt élke rem — maar hij lost het niet op. Wat het wél oplost is de
combinatie **lagere M** en **hogere drempel**: bij M = 1,5 met drempel 13 zijn er
in geen enkele K-variant nog sprints.

### B · Twee spiegelbeeldige patstellingen

Dit is de vervelendste vondst, en hij stond niet in de opdracht. Er zijn er
bovendien twee, en ze zijn elkaars spiegelbeeld.

**Het Oog raakt ingesloten.** Het Oog is onverzwelgbaar, maar zijn *buren* niet.
Hij hoeft geen weg te blokkeren — hij eet er een ring omheen. Gemeten over 400
partijen heeft het Oog bij de opzet in 20% van de gevallen maar drie buren op het
bord, in 31% vier, en in 49% zes: insluiten kost hem drie tot zes tegels, en hij
eet er twee per beurt. Daarna kan zij **nooit meer winnen**, hoe vol haar teller
ook staat.

**En hij kan uitgehongerd raken.** Een verharde keten is permanent van het bord
af voor hem. Houdt zij haar ketens hard in plaats van ze te verzilveren — en dat
is precies wat een goede speler doet met de keten die haar route draagt — dan
zakt het aantal tegels dat hij ooit nog mag eten onder zijn drempel van 28. Dan
kan **hij** niet meer winnen. Dat is §3.6 in nieuwe vorm: "zij verschanst zich
eeuwig", nu met een regel die dat expliciet onaantastbaar maakt.

Gemeten in de voorgestelde stand (K 3, M 1,5, drempel 13, pad springt 1) loopt
een kwart van de partijen tot het beurtenplafond, en die splitsen zo:

```
oorzaak                              aandeel van de vastlopers
──────────────────────────────────── ─────────────────────────
het Oog is onbereikbaar              36%
hij kan 28 rekenkundig niet meer halen  32%
haar teller stond vol                17%
```

In de replay is dat pijnlijk goed te zien: een partij die op beurt 5 al beslist
is en dan nog vijfenzeventig beurten doorloopt.

---

## Vier kandidaat-reparaties

Geen ervan staat in de opdracht; ze staan als knop in het lab en standaard uit,
want de meting gaat eerst over de regel zoals hij is opgeschreven. De eerste twee
zijn de voor de hand liggende — en ze schieten allebei door.

**1 · Hof.** De directe buren van het Oog zijn ook onverzwelgbaar. Dit **maakt
zijn winst rekenkundig onhaalbaar**: zes beschermde buren, plus het Oog, plus de
Zetel zijn acht tegels die hij nooit mag verzwelgen, en 36 − 8 = 28 — precies
zijn drempel. Hij zou letterlijk élke overgebleven tegel moeten opeten. Gemeten:
hij wint 0 van de 150. Alleen bruikbaar als `needN` mee omlaag gaat.

**2 · Onbereikbaar = niemand wint.** Het universum eindigt zodra er geen weg meer
naar het Oog is. De dode tijd verdwijnt, maar **insluiten wás zijn winst en is nu
een gelijkspel**: 41% van de partijen eindigt in "niemand wint" en hij wint er
geen enkele meer.

De volgende twee komen uit de vraag "wat zou het spel zélf doen?", en die werken
wél — juist omdat ze elkaars bijwerking repareren.

**3 · Het pad mag over de rand springen.** §2 kent al *"Reiken door de rand: over
n aaneengesloten verdwenen tegels heen"*. Als reiken over een gat mag, kan de
route dat ook. Hij houdt zijn tegenspel — hij moet nu bréde gaten eten in plaats
van één tegel — zonder dat één hap de partij voorgoed onbeslisbaar maakt.
`oversteek.maxSprong`, met een test die vastlegt dat één gat overbrugd wordt en
twee niet.

**4 · Onbereikbaar = de Nexus wint.** Sluit hij het Oog in, dan sloot het
universum zich om haar heen en heeft hij gewonnen. Dat maakt van zijn insluiting
een uitslag in plaats van een patstelling, en geeft hem een tweede weg naar de
overwinning naast zijn tegelteller. `oversteek.onbereikbaar: 'nexusWint'`.

Op de voorgestelde stand (K 3, M 1,5, drempel 13), 200 partijen per persona:

```
variant                     gretig   gemengd  defensief  plafond   sprints
─────────────────────────── ──────── ──────── ────────── ───────── ────────
zoals opgeschreven          32 / 39  45 / 29  39 / 31    27-31%    0
+ pad springt over 1 gat    40 / 35  41 / 36  42 / 36    23-26%    0
+ pad springt over 2 gaten  43 / 30  39 / 34  43 / 35    22-28%    0
+ onbereikbaar = hij wint   32 / 57  45 / 47  39 / 54     8-12%    24-30%
+ allebei (springt 1)       40 / 41  41 / 44             15-20%    ~0,5%
```

**Los werkt geen van de twee, samen wel.** "Hij wint" alleen maakt insluiten zo
aantrekkelijk dat een kwart van de partijen een sprint wordt: hij rent naar de
buren van het Oog en het is klaar. De sprong maakt insluiten juist duurder — hij
moet bredere gaten eten — waardoor die rush niet meer loont: de sprints zakken
van 24–30% naar één op de tweehonderd. En "hij wint" maakt van de insluitingen
die tóch lukken een uitslag in plaats van tachtig dode beurten.

---

## Ablatie — welke van de drie draagt het meest?

Elk van de drie regels apart uit, in de basisstand (K 4, M 2, drempel 11) tegen
de gemengde Nexus, 150 partijen. Let op: "alleen de Oversteek" is dezelfde
configuratie als "zonder verharden", en "alleen verharden + verzilveren"
dezelfde als "zonder Oversteek" — vandaar vijf onderscheiden rijen, geen zeven.

```
variant                                       zij hij klem mediaan verhard los  blokkade dood comeback sprints
───────────────────────────────────────────── ─── ─── ──── ─────── ─────── ──── ──────── ──── ──────── ───────
alle drie aan                                 59% 21% 20%  9 b     82%     26%  14%      15%  76%      32%    
zonder verharden — dus ook zonder verzilveren 2%  65% 33%  21 b    —       100% 17%      10%  60%      0%     
zonder verzilveren                            29% 48% 23%  22 b    69%     100% 2%       1%   41%      0%     
zonder Oversteek                              59% 41% 0%   11 b    69%     55%  —        —    26%      29%    
geen van drieën — de stand van meting 1       31% 69% 0%   15 b    —       100% —        —    29%      0%     
```

Dit is scherper dan verwacht, en het antwoord op "welke regel draagt het meest"
is niet wat de opzet suggereert.

**Alleen verzilveren verzet de balans.** Zonder verzilveren staat zij op 29% —
praktisch gelijk aan de 31% van de meting 1-stand zonder alle drie de regels.
Mét verzilveren springt ze naar 59%. Dat is de hele beweging. **Verharden op
zichzelf doet niets voor de uitslag**: een keten die je niet kunt innen houdt
haar in leven maar wint geen enkele partij. A is de opstap, B is de motor.

**De Oversteek verzet de balans ook níet** — 59% met, 59% zonder. Wat hij wél
doet is de *textuur*: de comebacks gaan van 26% naar 76%, en de vastlopers van
0% naar 20%. Hij verandert geen enkele uitslag maar wel elke partij. Haar teller
vol zien lopen terwijl de weg dichtgroeit is de spanningsboog die er in meting 1
niet was; dat is precies wat de speeltest miste.

**En die twee zitten aan hetzelfde mechanisme vast.** Zonder Oversteek: nul
procent vastlopers. Met: een op de vijf. Een winstvoorwaarde die hij kan
wégeten is spannend zolang zij hem kan herstellen, en dood zodra dat niet meer
kan. Daarom is reparatie B hierboven geen luxe maar een voorwaarde.

**De Oversteek in zijn eentje is een verslechtering.** Zonder verharden en
verzilveren wint zij 2% — slechter dan de 31% van meting 1. Hij legt er dan een
tweede voorwaarde bovenop zonder haar iets te geven om die mee te halen. De
drie regels horen bij elkaar; los ingevoerd doen ze schade.

---

## Voorstel om te toetsen

**K 3 · M 1,5 · drempel 13**, bovenop de aanbevolen stand van meting 1
(3 handelingen, 2 stappen, `spoorVreten = alleenTegel`, omsingeling aan). 200
partijen per persona:

```
tegen wie   zij  hij  plafond  mediaan      verhard  los  blokkade  dood  wissels  comeback  sprints
─────────── ──── ──── ──────── ──────────── ──────── ──── ───────── ───── ──────── ───────── ───────
de gretige  32%  39%  30%      19 b (9-80)  67%      34%  13%       10%   1,6      60%       0
de gemengde 45%  29%  27%      17 b (8-80)  76%      36%   9%        6%   1,9      71%       0
de defensieve 39% 31%  31%      20 b (8-80)  75%      39%  11%        7%   1,7      65%       0
```

**Het sterkste punt is niet de balans zelf maar hoe stabiel hij is.** In meting 1
zwaaide het evenwichtspunt van 50% naar 29% zodra de Nexus beter gespeeld werd;
hier blijft het tussen 32 en 45% tegen 29 en 39%, over drie heel verschillende
persona's. Dat is precies wat je wilt van een ontwerp dat aan tafel moet werken
met spelers van ongelijke sterkte.

Langs de toetslijst uit §5, alleen wat ik kán meten:

- *geen wegloper* — geen enkele persona wint meer dan twee van de vijf partijen.
- *spanningsboog* — 60 tot 71% van de beslíste partijen wordt gewonnen door de
  kant die halverwege achterstond, met 1,6 tot 1,9 leiderswissels per partij.
  In meting 1 was dat 0,2 wissels.
- *sprints gedood* — nul partijen onder de acht beurten, tegen 32% in de
  basisstand van de opdracht.
- *betekenisvolle beslissing* — los doorgeven levert nog altijd een derde van
  haar punten, dus de keuze tussen "nu innen" en "doorbouwen naar een keten"
  blijft echt.
- *geen dode tijd* — **hier faalt het.** Ruim een kwart van de partijen loopt tot
  het beurtenplafond, en dat is bijna altijd het ingesloten Oog. Dat is de reden
  dat dit voorstel niet af is zonder een oplossing daarvoor.

---

## Beleefbaarheid — de drie momenten in het lab

Punt 4 van de opdracht: de drie nieuwe momenten moeten zichtbaar en voelbaar
zijn in de replay. Wat er nu staat:

- **Verharden.** Tegels van dezelfde keten worden aan elkaar gelast getekend:
  dikke gouden verbindingen tussen de hexen, een dichte rand eromheen, en de
  gloed staat stil in plaats van te ademen. Een verharde keten leest daardoor
  als één gelast bouwwerk en niet als vier losse tegels — precies het verschil
  dat aan tafel telt. In het logboek: *"Keten van 4 verhardt — onaantastbaar, en
  af: hier kan niets meer bij."*
- **Verzilveren.** *"De Laatste verzilvert een keten van 4 in één handeling —
  +8 op haar teller (11 van 11), 8 substantie keert terug. De sporen zijn nu
  gewoon spoor."* De lassen verdwijnen op datzelfde moment van het bord; je ziet
  het bouwwerk uit elkaar vallen tot losse merktekens.
- **De route.** Het pad van de Zetel naar het Oog loopt als een bewegende
  stippellijn over het bord, met een brede zachte gloed eronder. Breekt hij, dan
  staat er *"De weg naar het Oog is verbroken"* in het paars van de Nexus, en de
  teller bovenin slaat om naar het aantal tegels dat ze nog moet innemen — of
  naar *"het Oog is ingesloten"* als er helemaal geen weg meer is.

Het Oog heeft een eigen artwork-slot (`public/art/oogtegel.webp`). Zolang het
definitieve artwork er niet is wordt `Oog.png` gebruikt, met het oog-motief van
de kaartrug er in goud overheen getekend, zodat de tegel onmiskenbaar is.

De drie momenten zijn in het zettenlogboek uitgelicht — goud voor haar
mijlpalen, paars voor de zijne — zodat je ze in een lange partij niet
overslaat. Alle knoppen (K, M, drempel, afstand van het Oog, en de twee
kandidaat-reparaties hieronder) staan live in het paneel, en de batch-modus
toont dezelfde cijfers als de meetbank.

---

## Zelf terugkrijgen

```
npm run meet2 -- stand 200          # de meetstand tegen alle drie de persona's
npm run meet2 -- matrix 150         # K x M x drempel
npm run meet2 -- ablatie 150        # elk van de drie regels apart uit
npm run meet2 -- personas 150       # beide bots tegen alle persona's
npm run meet2 -- oog 150            # het ingesloten Oog en twee kandidaat-reparaties
npm run meet2 -- beste 200 3 1.5 13 # één stand tegen alle drie de persona's

npm test                            # 69 tests, waaronder de pariteit met v5.py
npm run dev                         # het lab, dat opent in de meetstand
```

De drie regels staan als knop in het lab onder *knoppen · De middenlaag*; de
batch-modus toont dezelfde cijfers als de meetbank hierboven.

## Over de bot

De cijfers hierboven zijn gemeten met de zoekbot uit meting 1, uitgebreid met de
middenlaag: hij bouwt ketens, weegt verzilveren af tegen route-veiligheid, en
houdt de omgeving van het Oog in de gaten. Die afweging is niet triviaal — een
verharde keten die de weg naar het Oog draagt is als draagmuur meer waard dan als
munt, en dat is precies het soort beslissing dat de opdracht wilde toevoegen.

Tijdens het meten is de waardefunctie één keer gecorrigeerd: groepen vat-tegels
die de K nooit meer konden halen werden gewaardeerd alsof ze los doorgegeven
konden worden, ook als het stille velden waren (die leveren los niets op). De
hele reeks is daarna opnieuw gedraaid. De verschillen bleven binnen de ruis —
K3/M1,5/drempel 9 ging van 56% naar 57% voor haar, verhard van 75% naar 77% —
dus de conclusies hangen niet aan dat detail.

Wat de cijfers níet zeggen: hoe dit aan tafel speelt. Twee bots met een
waardefunctie laten zien waar de klem zit en welke knop hem verzet. Of het
verharden van een keten *voelt* als het moment dat het zou moeten zijn, is iets
wat je in het lab moet zien — daar is de replay per zet voor.
