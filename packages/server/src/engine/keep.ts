import type { KeepState, NpcState } from '@codekeep/shared';

export interface KeepStructure {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  upgradeCost: (level: number) => number;
}

export const KEEP_STRUCTURES: KeepStructure[] = [
  { id: 'forge', name: 'The Forge', description: 'Unlock card upgrades at rest sites. Higher levels improve upgrades.',
    maxLevel: 3, upgradeCost: (l) => l * 30 },
  { id: 'archive', name: 'The Archive', description: 'Unlock rare cards in the reward pool. Higher levels add legendaries.',
    maxLevel: 3, upgradeCost: (l) => l * 40 },
  { id: 'beacon_tower', name: 'Beacon Tower', description: '+1 starting hand size per level.',
    maxLevel: 2, upgradeCost: (l) => l * 50 },
  { id: 'foundry', name: 'The Foundry', description: 'Emplacements start with +2 HP per level.',
    maxLevel: 3, upgradeCost: (l) => l * 25 },
  { id: 'sanctum_hall', name: 'Sanctum Hall', description: '+5 max Gate HP per level.',
    maxLevel: 3, upgradeCost: (l) => l * 35 },
];

export function getStructureLevel(keep: KeepState, structureId: string): number {
  return keep.structures[structureId] ?? 0;
}

export function upgradeStructure(keep: KeepState, structureId: string): KeepState | null {
  const def = KEEP_STRUCTURES.find((s) => s.id === structureId);
  if (!def) return null;
  const current = getStructureLevel(keep, structureId);
  if (current >= def.maxLevel) return null;
  const cost = def.upgradeCost(current + 1);
  if (keep.echoes < cost) return null;

  return {
    ...keep,
    echoes: keep.echoes - cost,
    structures: { ...keep.structures, [structureId]: current + 1 },
  };
}

export function createDefaultNpcs(): NpcState[] {
  return [
    { id: 'wren', tier: 0, echoesGiven: 0, dialoguesSeen: [] },
    { id: 'sable', tier: 0, echoesGiven: 0, dialoguesSeen: [] },
    { id: 'duskmar', tier: 0, echoesGiven: 0, dialoguesSeen: [] },
    { id: 'mott', tier: 0, echoesGiven: 0, dialoguesSeen: [] },
    { id: 'pale_visitor', tier: 0, echoesGiven: 0, dialoguesSeen: [] },
  ];
}

export function getNpcTier(npc: NpcState): number {
  return npc.tier;
}

export function advanceNpcTier(keep: KeepState, npcId: string, echoesRequired: number): KeepState | null {
  const npcIdx = keep.npcs.findIndex((n) => n.id === npcId);
  if (npcIdx === -1) return null;
  const npc = keep.npcs[npcIdx];
  if (npc.tier >= 5) return null;
  if (keep.echoes < echoesRequired) return null;

  const newNpcs = [...keep.npcs];
  newNpcs[npcIdx] = { ...npc, tier: npc.tier + 1, echoesGiven: npc.echoesGiven + echoesRequired };

  return {
    ...keep,
    echoes: keep.echoes - echoesRequired,
    npcs: newNpcs,
  };
}

export function calculateEchoReward(won: boolean, act: number, ascension: number): number {
  const base = won ? 10 + act * 5 : 3;
  return base + Math.floor(ascension * 0.5);
}
