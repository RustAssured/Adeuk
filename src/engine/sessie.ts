/**
 * Een partij die een mens kan spelen.
 *
 * `Game.play()` speelt in één keer af; hier wordt dezelfde beurt opgeknipt tot
 * op de handeling. De volgorde is die van `playTurn`, stuk voor stuk — beurt
 * openen, haar handelingen, de route noteren, zijn beurt, omsingeling, de
 * eindcontroles — zodat een gespeelde partij en een gesimuleerde partij
 * hetzelfde spel zijn.
 *
 * Terugnemen kan binnen je eigen beurt, tot je hem afsluit. Daarna niet meer:
 * dat is het verschil tussen nadenken en terugvalsen.
 */
import { eindTekst, Game } from './game';
import { laatsteBots, nexusBots } from './bots';
import type { GameConfig } from './config';
import { legaleZetten, voerUit, type Zet } from './zetten';
import type { GameEvent, Uitslag } from './types';

export type Zijde = 'laatste' | 'nexus';
export type Bestuur = 'mens' | 'bot';

export interface SessieOpties {
  cfg: GameConfig;
  seed: number;
  /** wie bestuurt welke kant */
  bestuur: Record<Zijde, Bestuur>;
}

export class Sessie {
  g: Game;
  readonly bestuur: Record<Zijde, Bestuur>;

  /** wie er aan zet is; `null` zodra de partij voorbij is */
  aanZet: Zijde | null = 'laatste';
  /** handelingen die de Laatste deze beurt nog heeft */
  handelingenOver = 0;
  /** stappen die de Nexus deze beurt al deed */
  gestapt = 0;
  /** de uitslag, zodra die er is */
  uitslag: Uitslag | null = null;

  /** het punt in het logboek waar de huidige halve beurt begon */
  vanaf = 0;

  private stapel: Game[] = [];

  constructor(opties: SessieOpties) {
    this.g = new Game(opties.seed, opties.cfg);
    this.g.trace = true;
    this.g.emitOpzet();
    this.bestuur = opties.bestuur;
    this.openBeurt();
  }

  get cfg(): GameConfig {
    return this.g.cfg;
  }
  get events(): GameEvent[] {
    return this.g.events;
  }
  get mensAanZet(): boolean {
    return this.aanZet !== null && this.bestuur[this.aanZet] === 'mens';
  }

  // ------------------------------------------------------------- verloop

  /** Een nieuwe volle beurt openen en haar helft klaarzetten. */
  private openBeurt(): void {
    if (this.klaarMetPartij()) return;
    this.g.beginBeurt();
    this.aanZet = 'laatste';
    this.vanaf = this.g.events.length;
    this.handelingenOver = this.cfg.acts;
    this.stapel = [];
    if (this.bestuur.laatste === 'mens') {
      this.g.harvest();
      this.stapel = [this.g.volledigeKopie()];
    }
  }

  private openNexus(): void {
    this.aanZet = 'nexus';
    this.vanaf = this.g.events.length;
    this.gestapt = 0;
    this.stapel = [];
    if (this.cfg.solo) {
      this.sluitVolleBeurt();
      return;
    }
    if (this.bestuur.nexus === 'mens') {
      this.g.beginNexusBeurt();
      this.stapel = [this.g.volledigeKopie()];
    }
  }

  private sluitVolleBeurt(): void {
    this.g.eindeBeurt();
    if (this.klaarMetPartij()) return;
    this.openBeurt();
  }

  private klaarMetPartij(): boolean {
    if (this.g.done) {
      this.eindig(this.g.done);
      return true;
    }
    if (this.g.turn >= this.cfg.maxTurns) {
      this.eindig('timeout');
      return true;
    }
    return false;
  }

  private eindig(uit: Uitslag): void {
    if (this.uitslag) return;
    this.uitslag = uit;
    this.aanZet = null;
    this.g.emit('einde', 'systeem', [], eindTekst(uit, this.g));
  }

  // ---------------------------------------------------------- de handeling

  /** Wat de speler die aan zet is nu kan doen. */
  zetten(): Zet[] {
    if (!this.aanZet || this.g.done) return [];
    if (this.aanZet === 'laatste' && this.handelingenOver <= 0) return [];
    return legaleZetten(this.g, this.aanZet, this.gestapt);
  }

  /** Handelingen die er in deze halve beurt nog in zitten. */
  restant(): number {
    if (this.aanZet === 'laatste') return this.handelingenOver;
    if (this.aanZet === 'nexus') return Math.max(0, this.cfg.nexusMoves - this.gestapt);
    return 0;
  }

  /**
   * Voert een zet uit. De beurt sluit *niet* vanzelf zodra de handelingen op
   * zijn: dat doet de speler met de spatiebalk. Anders zou de laatste handeling
   * nooit terug te nemen zijn, en juist die wil je kunnen overdenken.
   */
  doe(z: Zet): void {
    if (!this.aanZet || this.g.done) return;
    this.stapel.push(this.g.volledigeKopie());
    const { beurtVoorbij } = voerUit(this.g, z);

    if (this.g.done) {
      this.beurtAf();
      return;
    }
    if (this.aanZet === 'laatste') {
      this.handelingenOver = beurtVoorbij ? 0 : this.handelingenOver - 1;
    } else {
      if (z.soort === 'stap') this.gestapt += 1;
      if (beurtVoorbij) this.gestapt = this.cfg.nexusMoves;
    }
    // valt er niets meer te kiezen terwijl er nog handelingen over zijn, dan
    // heeft wachten geen zin
    if (this.restant() > 0 && !this.zetten().length) this.beurtAf();
  }

  /** De beurt met de hand afsluiten — de spatiebalk. */
  beurtAf(): void {
    if (!this.aanZet) return;
    if (this.aanZet === 'laatste') {
      if (!this.g.naHaarBeurt()) {
        this.eindig(this.g.done!);
        return;
      }
      this.openNexus();
      return;
    }
    if (this.bestuur.nexus === 'mens') this.g.omsingelingAfslag();
    this.sluitVolleBeurt();
  }

  // ------------------------------------------------------------ terugnemen

  kanTerug(): boolean {
    return this.mensAanZet && this.stapel.length > 1;
  }

  /** Eén handeling terug, binnen de eigen beurt. */
  terug(): void {
    if (!this.kanTerug()) return;
    this.stapel.pop();
    const vorig = this.stapel[this.stapel.length - 1];
    this.g = vorig.volledigeKopie();
    if (this.aanZet === 'laatste') this.handelingenOver += 1;
    else this.gestapt = Math.max(0, this.gestapt - 1);
  }

  // ------------------------------------------------------------- de bot

  /**
   * Laat de bot die aan zet is zijn halve beurt spelen. Geeft de nieuwe
   * gebeurtenissen terug zodat het lab ze met de bestaande replay-stappen kan
   * afdraaien; de toestand staat dan al op het eind.
   */
  speelBot(): GameEvent[] {
    if (!this.aanZet || this.bestuur[this.aanZet] === 'mens') return [];
    const vanaf = this.g.events.length;
    if (this.aanZet === 'laatste') {
      laatsteBots[this.cfg.laatsteBot](this.g);
      if (!this.g.naHaarBeurt()) {
        this.eindig(this.g.done!);
        return this.g.events.slice(vanaf);
      }
      this.openNexus();
    } else {
      this.g.beginNexusBeurt();
      nexusBots[this.cfg.nexusBot](this.g);
      this.g.omsingelingAfslag();
      this.sluitVolleBeurt();
    }
    return this.g.events.slice(vanaf);
  }
}
