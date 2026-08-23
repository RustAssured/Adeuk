/**
 * Het lab. §6 van de handoff vraagt om iets waarin de stappen te *zien* zijn:
 * afspeelbaar per zet, niet per beurt, met één regel uitleg per handeling,
 * vooruit en terug, een tempo-regelaar, een seed-invoer, een batch-modus en
 * alle knoppen uit §5 live instelbaar. Dat is wat hier staat.
 */
import './style.css';
import { Game } from '../engine/game';
import { gevalideerd, type GameConfig } from '../engine/config';
import type { GameEvent, Snapshot, TileType, Uitslag } from '../engine/types';
import { laadArt } from './art';
import { Bord, routeUitSnapshot } from './board';
import { bouwKnoppen, bouwZetlijst, el, toonBatch } from './panels';
import {
  bewaarAlsVergelijking, laadVergelijking, neemKnoppenOver, toonAdvies, wisVergelijking,
  type Batchstand,
} from './advies-paneel';
import type { BatchBericht, BatchOpdracht } from './batch-worker';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

interface Partij {
  seed: number;
  events: GameEvent[];
  tiles: Array<TileType | null>;
  seat: number;
  uitslag: Uitslag;
  turns: number;
}

// Het lab opent in de gevalideerde stand van opdracht 3: K 3, M 1,5, 13 om 28,
// het pad mag één gat over en een ingesloten Oog is zijn winst. Alles is in het
// knoppenpaneel uit te zetten, tot en met de v5-stand aan toe.
const cfg: GameConfig = gevalideerd();

let partij: Partij | null = null;
let i = 0;
let speelt = false;
let laatsteTik = 0;
let hover = -1;
let bord: Bord;
let ververs: (huidig: number) => void = () => {};
let ververKnoppen: () => void = () => {};

// ------------------------------------------------------------------ partij

function speelPartij(seed: number): void {
  const g = new Game(seed, { ...cfg });
  g.trace = true;
  const uitslag = g.play();
  partij = {
    seed,
    events: g.events,
    tiles: g.result(uitslag).tiles,
    seat: g.result(uitslag).seat,
    uitslag,
    turns: g.turn,
  };
  i = 0;
  ($('seed') as HTMLInputElement).value = String(seed);
  const scrub = $('scrub') as HTMLInputElement;
  scrub.max = String(Math.max(0, partij.events.length - 1));
  scrub.value = '0';
  ververs = bouwZetlijst($('tab-replay'), partij.events, ga);
  tekenNu();
}

function ga(n: number): void {
  if (!partij) return;
  i = Math.max(0, Math.min(partij.events.length - 1, n));
  ($('scrub') as HTMLInputElement).value = String(i);
  tekenNu();
}

function tekenNu(): void {
  if (!partij) return;
  const ev = partij.events[i];
  ververs(i);

  $('tijdlabel').textContent = `zet ${i + 1} / ${partij.events.length}  ·  beurt ${ev.after.turn}`;

  const tekst = $('verhaal-tekst');
  tekst.textContent = ev.text;
  tekst.className = 'verhaal-tekst ' + (ev.actor === 'laatste' ? 'zij' : ev.actor);
  $('verhaal-beurt').textContent = ev.after.turn > 0 ? `beurt ${ev.after.turn}` : 'opzet';

  tekenTellers(ev.after);
  tekenUitslag(ev);
}

function tekenTellers(snap: Snapshot): void {
  const vak = $('tellers');
  vak.className = 'tellers';
  const maak = (klas: string, naam: string, nu: number, nodig: number, extra: string) => {
    const pips = el('div', { class: 'teller-rail' });
    for (let k = 0; k < nodig; k++) {
      const p = el('div', { class: 'teller-pip' + (k < nu ? ' vol' : '') });
      pips.append(p);
    }
    return el('div', { class: `teller ${klas}` }, [
      el('div', { class: 'teller-kop' }, [
        el('span', {}, [naam]),
        el('b', {}, [`${nu} / ${nodig}`]),
      ]),
      pips,
      el('div', { class: 'teller-kop' }, [el('span', {}, [extra])]),
    ]);
  };
  const opBord = snap.w.reduce((a, b) => a + b, 0);
  const kinderen: Node[] = [
    maak('zij', 'staande sporen', Math.max(0, snap.pileL), cfg.needL,
      `voorraad ${snap.stock} · bord ${opBord} · doos ${snap.box}`),
    maak('hij', 'verzwolgen tegels', snap.pileN, cfg.needN,
      `${snap.alive.reduce((a, b) => a + b, 0)} tegels over`),
  ];
  if (cfg.oversteek.on) {
    const verhardeTegels = snap.verhard.filter((x) => x > 0).length;
    const stand =
      snap.routeTekort < 0
        ? 'het Oog is ingesloten'
        : snap.routeOpen
          ? 'de weg ligt er'
          : `nog ${snap.routeTekort} ${snap.routeTekort === 1 ? 'tegel' : 'tegels'}`;
    const klasse = snap.routeTekort < 0 ? 'dicht' : snap.routeOpen ? 'open' : '';
    kinderen.push(
      el('div', { class: `teller oversteek ${klasse}` }, [
        el('div', { class: 'teller-kop' }, [
          el('span', {}, ['de oversteek']),
          el('b', {}, [stand]),
        ]),
        el('div', { class: 'teller-kop' }, [
          el('span', {}, [
            verhardeTegels ? `${verhardeTegels} tegels verhard` : 'nog geen keten verhard',
          ]),
        ]),
      ]),
    );
  }
  vak.replaceChildren(...kinderen);
}

function tekenUitslag(ev: GameEvent): void {
  const vak = $('uitslag');
  if (ev.kind !== 'einde' || !partij) {
    vak.hidden = true;
    return;
  }
  const klas =
    partij.uitslag === 'laatste' ? 'zij'
      : partij.uitslag === 'nexus' ? 'hij'
        : partij.uitslag === 'niets' ? 'niets' : 'klem';
  vak.className = `uitslag ${klas}`;
  vak.textContent = ev.text;
  vak.hidden = false;
}

// -------------------------------------------------------------- tekenlus

function lus(t: number): void {
  if (speelt && partij) {
    const perSec = Number(($('snelheid') as HTMLInputElement).value);
    if (t - laatsteTik > 1000 / perSec) {
      laatsteTik = t;
      if (i >= partij.events.length - 1) speelt = false;
      else ga(i + 1);
      knopSpeel();
    }
  }
  if (partij) {
    const ev = partij.events[i];
    bord.teken(
      {
        snap: ev.after,
        tiles: partij.tiles,
        seat: partij.seat,
        route: routeUitSnapshot(ev.after, partij.seat),
        markeer: ev.cells,
        wie: ev.actor,
        hover,
      },
      t,
    );
  }
  requestAnimationFrame(lus);
}

function knopSpeel(): void {
  $('speel').textContent = speelt ? '⏸' : '▶';
}

// ----------------------------------------------------------------- batch

let worker: Worker | null = null;
let laatsteBatch: Batchstand | null = null;

/**
 * Het advies-paneel opnieuw tekenen. Elke batch die "aanbevolen" haalt wordt
 * de vergelijkingsstand voor de volgende; de rest ligt ernaast.
 */
function tekenAdvies(stand: Batchstand): void {
  laatsteBatch = stand;
  const advies = toonAdvies($('tab-advies'), stand, laadVergelijking(), {
    neemOver: (bron) => {
      neemKnoppenOver(cfg, bron);
      ververKnoppen();
      if (partij) speelPartij(partij.seed);
      kiesTab('knoppen');
    },
    zetVast: () => {
      if (laatsteBatch) bewaarAlsVergelijking(laatsteBatch);
      if (laatsteBatch) tekenAdvies(laatsteBatch);
    },
    wis: () => {
      wisVergelijking();
      if (laatsteBatch) tekenAdvies(laatsteBatch);
    },
  });
  const stipje = $('tab-stip');
  stipje.className =
    'tab-stip ' +
    (advies.eind === 'aanbevolen' ? 'groen' : advies.eind === 'afgeraden' ? 'rood' : 'oranje');
  stipje.hidden = false;
  if (advies.eind === 'aanbevolen') bewaarAlsVergelijking(stand);
}

function bouwBatchPaneel(): void {
  const vak = $('tab-batch');
  const aantal = el('input', { type: 'number', min: '10', max: '5000', step: '10' });
  aantal.value = '200';
  const personas = el('input', { type: 'checkbox' });
  const start = el('button', { class: 'knop batchknop' }, ['draai de batch']);
  const status = el('p', { class: 'bij' }, ['']);
  const uitvoer = el('div');

  start.onclick = () => {
    worker?.terminate();
    worker = new Worker(new URL('./batch-worker.ts', import.meta.url), { type: 'module' });
    const n = Math.max(10, Math.min(5000, Number(aantal.value) || 200));
    status.textContent = `bezig… 0 / ${n}`;
    uitvoer.replaceChildren();
    worker.onmessage = (e: MessageEvent<BatchBericht>) => {
      if (e.data.soort === 'voortgang') {
        status.textContent = `bezig… ${e.data.klaar} / ${e.data.totaal} · ${e.data.wat}`;
      } else {
        status.textContent = `klaar — ${e.data.metriek.n} potjes met de huidige knoppen.`;
        tekenAdvies({
          cfg: JSON.parse(JSON.stringify(cfg)),
          meting: e.data.middenlaag,
          personas: e.data.personas,
          n,
          seedStart: 0,
          tijd: Date.now(),
        });
        toonBatch(
          uitvoer,
          e.data.metriek,
          (seed) => {
            speelPartij(seed);
            kiesTab('replay');
          },
          {
            cijfers: e.data.middenlaag,
            aan: cfg.verharden.on || cfg.verzilveren.on || cfg.oversteek.on,
          },
        );
      }
    };
    const opdracht: BatchOpdracht = {
      cfg: JSON.parse(JSON.stringify(cfg)),
      n,
      seedStart: 0,
      personas: personas.checked,
    };
    worker.postMessage(opdracht);
  };

  vak.replaceChildren(
    el('div', { class: 'groep' }, [
      el('h3', {}, ['Batch']),
      el('p', { class: 'bij' }, [
        'Draait n potjes met precies de knoppen die nu onder "knoppen" staan. ' +
          'De zoekbot is een stuk trager dan de gretige — begin klein.',
      ]),
      el('div', { class: 'regel' }, [el('label', {}, ['aantal potjes']), aantal]),
      el('div', { class: 'regel' }, [
        el('label', {}, [
          'ook tegen de andere persona’s',
          el('small', {}, [
            'de enige manier om stelregel 8 uit het grijs te halen — en ongeveer drie keer zo lang',
          ]),
        ]),
        el('span', { class: 'tuimel' }, [personas, el('span', {})]),
      ]),
      start,
      status,
    ]),
    uitvoer,
  );
}

// ------------------------------------------------------------------ tabs

function kiesTab(naam: string): void {
  for (const b of $('tabs').querySelectorAll('button')) {
    b.classList.toggle('aan', b.dataset.tab === naam);
  }
  for (const n of ['replay', 'knoppen', 'batch', 'advies']) {
    $(`tab-${n}`).hidden = n !== naam;
  }
}

// ------------------------------------------------------------------ start

async function start(): Promise<void> {
  const art = await laadArt();
  const canvas = $('bord') as HTMLCanvasElement;
  bord = new Bord(canvas, art);

  const pasAan = () => {
    bord.meet();
  };
  new ResizeObserver(pasAan).observe(canvas.parentElement!);
  pasAan();

  ververKnoppen = bouwKnoppen($('tab-knoppen'), cfg, () => {
    if (partij) speelPartij(partij.seed);
  });
  bouwBatchPaneel();

  // knoppen bovenin
  $('opnieuw').onclick = () => speelPartij(Number(($('seed') as HTMLInputElement).value) || 0);
  ($('seed') as HTMLInputElement).onchange = () =>
    speelPartij(Number(($('seed') as HTMLInputElement).value) || 0);

  // transport
  $('begin').onclick = () => ga(0);
  $('terug').onclick = () => {
    speelt = false;
    knopSpeel();
    ga(i - 1);
  };
  $('vooruit').onclick = () => {
    speelt = false;
    knopSpeel();
    ga(i + 1);
  };
  $('eind').onclick = () => ga((partij?.events.length ?? 1) - 1);
  $('speel').onclick = () => {
    if (!partij) return;
    if (i >= partij.events.length - 1) ga(0);
    speelt = !speelt;
    knopSpeel();
  };
  ($('scrub') as HTMLInputElement).oninput = (e) => {
    speelt = false;
    knopSpeel();
    ga(Number((e.target as HTMLInputElement).value));
  };

  for (const b of $('tabs').querySelectorAll('button')) {
    b.onclick = () => kiesTab(b.dataset.tab!);
  }

  canvas.onmousemove = (e) => {
    const r = canvas.getBoundingClientRect();
    hover = bord.raak(e.clientX - r.left, e.clientY - r.top);
  };
  canvas.onmouseleave = () => (hover = -1);

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') { speelt = false; knopSpeel(); ga(i + 1); }
    else if (e.key === 'ArrowLeft') { speelt = false; knopSpeel(); ga(i - 1); }
    else if (e.key === ' ') { e.preventDefault(); $('speel').click(); }
    else if (e.key === 'Home') ga(0);
    else if (e.key === 'End') $('eind').click();
  });

  ververKnoppen();
  speelPartij(0);
  requestAnimationFrame(lus);
}

start();
