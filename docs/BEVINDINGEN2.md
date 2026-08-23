# Bevindingen — meting 2: de middenlaag

*Verharden, verzilveren en de Oversteek, gemeten met de code in deze repo.
Vervolg op [BEVINDINGEN.md](BEVINDINGEN.md). Startpunt: de aanbevolen stand uit
meting 1 — 3 handelingen, 2 stappen, `spoorVreten = alleenTegel`, omsingeling
aan — met de drempel als knop.*

De drie regels staan standaard uit. `meeting2()` zet de meetstand; de pariteit
met `v5.py` blijft daardoor onaangetast (9 configuraties × 208 seeds, beurt voor
beurt gelijk).

---

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

### B · Het Oog raakt ingesloten, en dan gebeurt er niets meer

Dit is de vervelendste vondst, en hij zat niet in de opdracht.

Het Oog is onverzwelgbaar, maar zijn **buren niet**. Hij hoeft geen weg te
blokkeren — hij eet er gewoon een ring omheen. Gemeten over 400 partijen heeft
het Oog bij de opzet in 20% van de gevallen maar drie buren op het bord, in 31%
vier, en in 49% zes: insluiten kost hem drie tot zes tegels, en hij eet er twee
per beurt.

Zodra dat gebeurt kan zij **nooit meer winnen**, hoe vol haar teller ook staat.
En omdat hij intussen zelf klem kan komen te zitten tussen verharde ketens die
hij niet mag verzwelgen, loopt de partij daarna gewoon door tot het
beurtenplafond. In de replay is dat pijnlijk goed te zien: een partij die op
beurt 5 al beslist is en dan nog vijfenzeventig beurten doorloopt.

In de matrix eindigt 5 tot 19% van alle partijen zo — haar teller vol, de weg
weg, en niemand die wint. Dat telt bovenop de 7 tot 23% waarin hij er wél mee
wint. De eerste groep is tegenspel; de tweede is dode tijd.

---

## Ablatie — welke van de drie draagt het meest?

Elk van de drie regels apart uit, in de basisstand (K 4, M 2, drempel 11) tegen
de gemengde Nexus. Let op: "alleen de Oversteek" is dezelfde configuratie als
"zonder verharden", en "alleen verharden en verzilveren" dezelfde als "zonder
Oversteek — vandaar vijf onderscheiden rijen, geen zeven.

__ABLATIETABEL__

Drie dingen springen eruit.

**Verzilveren is de motor.** Verharden zónder verzilveren tilt haar van 2% naar
ongeveer een kwart; verzilveren erbij brengt haar naar zestig procent. Een
verharde keten die je niet kunt innen is een muur, geen munt — hij houdt haar in
leven maar wint niets. Dit is meteen het antwoord op "welke regel draagt het
meest": **B, en A is er de opstap naar.**

**De Oversteek levert de spanning.** Zet hem uit en de comebacks zakken van bijna
vier op de vijf partijen naar één op de vijf. Dát is wat hij toevoegt: haar
teller vol zien lopen terwijl de weg dichtgroeit is de spanningsboog die er in
meting 1 niet was. Hij is ook de enige van de drie die de Nexus iets eigens
geeft.

**En de Oversteek levert álle dode tijd.** Zonder hem: nul procent vastlopers.
Met hem: bijna een op de vijf. Die twee zitten aan hetzelfde mechanisme vast —
een winstvoorwaarde die hij kan wégeten is spannend zolang zij hem kan herstellen,
en dood zodra dat niet meer kan.

**Verharden alleen doet weinig.** Zonder verharden (en dus zonder verzilveren)
wint zij 2%; dat is slechter dan de stand van meting 1 zonder alle drie de
regels. De Oversteek in zijn eentje is dus een netto verslechtering voor haar:
hij legt er een tweede voorwaarde bovenop zonder haar iets te geven om die mee te
halen.

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
