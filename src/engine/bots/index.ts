import type { Game } from '../game';
import type { LaatstePersona, NexusPersona } from '../config';
import { laatsteGretig, nexusGretig } from './gretig';
import { laatsteDefensief, laatsteGemengd, nexusDefensief, nexusGemengd } from './persona';
import { laatsteBeam } from './beam';

export type TurnFn = (g: Game) => void;

export const laatsteBots: Record<LaatstePersona, TurnFn> = {
  gretig: laatsteGretig,
  defensief: laatsteDefensief,
  gemengd: laatsteGemengd,
  beam: laatsteBeam,
};

export const nexusBots: Record<NexusPersona, TurnFn> = {
  gretig: nexusGretig,
  defensief: nexusDefensief,
  gemengd: nexusGemengd,
  // de Nexus heeft geen aparte zoekbot: zijn zettenruimte is klein genoeg
  beam: nexusGemengd,
};
