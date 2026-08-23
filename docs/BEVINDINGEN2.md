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

