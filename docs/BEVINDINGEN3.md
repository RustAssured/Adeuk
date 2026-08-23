# Bevindingen — opdracht 3: het advies-paneel, de speelbare modus, de toestandstaal

*Vervolg op [BEVINDINGEN2.md](BEVINDINGEN2.md). De gevalideerde stand uit meting 2
is hier het uitgangspunt en er is niets aan de regels veranderd: de pariteit met
`v5.py` staat, en de testsuite is van 73 naar 116 gegaan.*

---

## Kort

1. **Het paneel keurt de gevalideerde stand goed, met één kanttekening**, en die
   kanttekening is precies de 18% klem die voor opdracht 4 op de lijst stond.
   Bij 200 seeds staat stelregel 4 op oranje (11% vastlopers, boven de 10%-grens);
   bij 120 seeds staat alles op groen. De uitspraak kantelt dus met de steekproef,
   want dat cijfer ligt vlak op de lat. Dat is geen weeffout in het paneel maar een
   eerlijk beeld van waar de stand staat.
2. **Stilstand aanzetten helpt meetbaar.** Met de knop uit: 15% vastlopers en het
   advies "aanbevolen met kanttekening". Met de knop aan: 11% vastlopers en
   "aanbevolen". Hij wordt in 47% van de partijen ook echt gebruikt — het is geen
   dode regel.
3. **De herspeelbaarheid is beter dan verwacht.** Over de drie Nexus-persona's
   heen beweegt haar winstkans 3 punten: 42% (gretig), 44% (gemengd), 43%
   (defensief). Dat haalt stelregel 8 uit het grijs en op groen.
4. **Zijn drie wegen worden alle drie bespeeld, maar niet gelijk.** Van zijn
   winsten komt 69% uit insluiting, 28% uit zijn tegelteller en 2% uit de route.
   Dat is binnen de lat (drie wegen, grootste onder de 85%), maar het zegt wel dat
   *insluiting* zijn hoofdspel is geworden en niet zijn honger.
5. **De lat bijt, maar hij ziet niet alles.** Vijf van de zeven met opzet scheve
   standen worden afgekeurd. Eén niet: K 2 — verharden voor twee tegels — komt er
   volledig groen doorheen. Dat is geen fout in de drempels: bij K 2 kloppen alle
   cijfers. Wat er mis mee is (een keten die nooit spannend is) meet geen batch.
   Daar is de speelbare modus voor.

---

## A · Het advies-paneel

`src/engine/adviesregels.ts` legt elke batch langs de negen stelregels. Alle
grenzen staan in één blok, `DREMPELS`, met een regel uitleg per waarde. Wie de lat
wil verleggen hoeft nergens anders te zoeken.

### Wat het paneel wél en niet zegt

Drie van de negen stelregels zijn niet uit een batch af te lezen: makkelijk leren
(2), thema en mechaniek (7) en leesbaarheid van het bord (9). Die staan er als
**grijs** in, met "aan tafel te toetsen", en ze worden nooit groen. Het eindadvies
rekent alleen met de gekleurde regels en noemt de regel die de doorslag gaf.

Onder stelregel 2 staat wel een teller: hoeveel regels er tegelijk aan staan.
Boven de negen komt er een waarschuwing. Die waarschuwing staat **naast** het
advies en niet erin, want het is een schatting en geen meting. Een spel met
vijftien regels tegelijk kan op alle cijfers kloppen en aan tafel alsnog
onspeelbaar zijn; dat mag het paneel zeggen, maar het mag er niet mee doen alsof
het het gemeten heeft.

### De gevalideerde stand langs de lat

200 seeds, tegen de gemengde Nexus, met stilstand aan.

| # | stelregel | | reden |
|---|---|---|---|
| 1 | Elke beurt een betekenisvolle beslissing | groen | 71% van de ketens haalt de verharding; punten komen van twee kanten (35% los); stilstand in 47% van de partijen gebruikt |
| 2 | Makkelijk leren, moeilijk meesteren | grijs | aan tafel te toetsen — 10 regels tegelijk aan, boven de 9 |
| 3 | Geen dode tijd | groen | 66% comebacks |
| 4 | Spanningsboog naar een climax | **oranje** | 11% vastlopers, boven de 10%-grens (mediaan 15 beurten, 1% sprints) |
| 5 | Geen wegloper | groen | 1,5 leiderswissels, 66% comebacks |
| 6 | Meerdere wegen naar de winst | groen | zij 35/65 los tegen keten; hij bespeelt 3 wegen, grootste 69% |
| 7 | Thema en mechaniek versterken elkaar | grijs | aan tafel te toetsen |
| 8 | Herspeelbaarheid | groen | 3 punten spreiding over de persona's (42 / 44 / 43) |
| 9 | Bord in één oogopslag leesbaar | grijs | aan tafel te toetsen |

**Advies: aanbevolen met kanttekening — bepalend: stelregel 4.**

### Werkt de lat? (120 seeds per stand)

| stand | uitspraak | bepalend |
|---|---|---|
| de gevalideerde stand | aanbevolen | alles groen |
| K 6 — verharden bijna onhaalbaar | afgeraden | stelregel 4 |
| K 2 — verharden gratis | **aanbevolen** | alles groen |
| drempel 5 — sprintspel | afgeraden | stelregel 4 |
| drempel 30 — uitzitten | afgeraden | stelregel 4 |
| verzilveren uit | afgeraden | stelregel 4 |
| stilstand uit | aanbevolen met kanttekening | stelregel 4 |

Twee dingen vallen op, en ze zijn allebei het vermelden waard.

**Stelregel 4 doet vrijwel al het afkeuren.** Dat is geen toeval: het is de enige
volledig meetbare regel met harde grenzen aan twee kanten (duur, sprints,
vastlopers). Als een stand scheef staat, komt dat er bijna altijd uit als een
partij die te kort duurt, te lang duurt, of stilvalt. De andere regels zijn
daarmee niet nutteloos — ze vertellen *waarom* — maar ze zijn zelden de eerste
die rood worden.

**K 2 komt er groen doorheen.** Verharden voor twee tegels geeft 44/47, 70% van de
ketens verhardt, 51% comebacks, 12 beurten mediaan. Op de cijfers klopt het. Wat
eraan mankeert is dat een keten van twee nooit een beslissing is — hij is af
voordat er iets op het spel stond. Dat is precies wat een batch niet meet, en
waarom stelregel 1 als "deels meetbaar" in het paneel staat en niet als "ja".

### De vergelijkingsstand

Elke batch die "aanbevolen" haalt wordt bewaard. De volgende batch komt ernaast te
staan: welke knoppen er verschoven zijn, een voor/na-tabel met tien kerncijfers, en
per stelregel wat er van kleur veranderde. Draaien de seeds anders, dan zegt het
paneel dat erbij — anders lees je toeval als verbetering. Een stand met de hand
vastzetten kan ook, en de knoppen van de vergelijkingsstand zijn met één klik terug
te halen.

---

## B · De visuele toestandstaal

De drie toestanden waren drie keer hetzelfde bolletje. Nu:

- **ijl** — een liggend fiche. Plat, laag, doorschijnend. Aanwezig, maar het steekt
  nergens bovenuit.
- **vat** — een torentje, hoger dan breed, opgericht uit hetzelfde weefsel. Het
  wiegt licht, alsof het ademt.
- **verhard** — hetzelfde torentje, stilgezet en verbleekt naar been, op de
  gedeelde sokkel van het bastion.

Het bastion is geen rij tegels met een lasnaad ertussen meer maar één gegoten
bouwwerk: één sokkel over de hele keten, één silhouet, één schaduw. De vorm is de
vereniging van rondgeslepen strepen tussen de middelpunten, twee keer over elkaar
getekend — dat geeft de buitenrand zonder dat er een pad voor uitgerekend hoeft te
worden.

De materie is afgelezen van het artwork van de Zetel: oker, oud rozehout, een
groenige schaduw, poriën langs één zijde, wortels die de tegel in lopen. Geen steen
en geen metaal — gegroeid weefsel, met de kosmos die er doorheen blijft schemeren.
Eén ding is bewust vermeden: geen twee symmetrische poriën bovenin. Twee stippen
naast elkaar leest het oog onmiddellijk als een gezicht, en dan staat er een
poppetje op het bord.

Verzwelgen duurt nu ruim vier tienden van een seconde en doet pijn: de tegel
brokkelt, versnelt en wordt naar de Nexus toe getrokken. Lag er een spoor op, dan
blijft het merkteken staan terwijl de tegel wegvliegt en dooft daarna pas — de
tegel gaat, het punt blijft.

De Zetel en de Nexus staan er als hun 3D-model, één keer uitgerenderd met het licht
van het bord erop (`npm run figuren`). De Nexus zet zijn voet op de tegel; zijn
sokkel zit in het model. De Zetel staat nergens op — hij zweeft.

---

## C · De speelbare modus

Mens tegen bot (kies je kant en zijn persona) of met z'n tweeën achter één scherm.

Wat mag licht op het bord op, in de kleur van de kant. Wat niet mag vertelt bij het
aanwijzen waarom niet, in de taal van de regel: "grenst niet aan de draad — je kunt
alleen naast je eigen tegels reiken", "deze keten is af". Ligt er meer dan één zet
op een tegel, dan verschijnt er een keuzemenu bij die tegel. Stilstand vraagt eerst
of je je hele beurt wilt offeren.

De beurt sluit **niet** vanzelf als je handelingen op zijn. Dat is met opzet: anders
zou juist de laatste handeling nooit terug te nemen zijn, en dat is de handeling
waar je over nadenkt. Spatie sluit de beurt af, z neemt er één terug — binnen je
eigen beurt, tot je hem afsluit.

De beurt van de bot speelt zichtbaar af met de bestaande replay-stappen, op het
tempo van de schuif. Aan het eind een slotkaart met de eindstand en één regel over
hoe het liep — niet een samenvatting maar een lezing: won ze op ketens of op losse
sporen, won hij door te eten of door haar de oversteek te ontzeggen.

De test die hierbij hoort is de belangrijkste van de drie: *een gespeelde partij is
zet voor zet dezelfde partij als een gesimuleerde*, tot in het logboek. Laat je
beide kanten door de bot spelen, dan levert de sessie exact het verloop op dat
`Game.play()` oplevert. Anders speelt een mens een ander spel dan het spel dat we
gemeten hebben.

---

## Wat er niet in zit

- **De 18% klem is niet opgelost.** Dat was afgesproken (opdracht 4). Het paneel
  wijst er nu wel elke batch op, en dat is precies de bedoeling: het is de enige
  regel die de gevalideerde stand van groen afhoudt.
- **Geen regelwijzigingen.** Alle 73 oude tests staan nog, plus 43 nieuwe.
- **Het bastion is 2D-canvas**, zoals afgesproken. Alleen de twee figuren komen uit
  een 3D-model, en die zijn vooraf uitgerenderd naar een plaatje — er zit geen
  WebGL in het lab.
- **Wat een mens ervan vindt, staat er niet in.** Stelregel 7 en 9 blijven grijs
  tot iemand aan tafel heeft gezeten. Het paneel mag geen zekerheid veinzen die het
  niet heeft.
