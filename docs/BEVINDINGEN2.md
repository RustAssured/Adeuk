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

