import type { KeepState, NpcState } from '@codekeep/shared';
import { getUnseenDialogue } from '@codekeep/shared';

export type StoryLayer = 'surface' | 'cracks' | 'truth' | 'true_ending';

export function getCurrentStoryLayer(totalRuns: number, ascension: number): StoryLayer {
  if (ascension >= 15) return 'true_ending';
  if (totalRuns >= 30) return 'truth';
  if (totalRuns >= 15) return 'cracks';
  return 'surface';
}

export function getNextDialogue(
  npcId: string,
  keep: KeepState,
): { speaker: string; text: string; dialogueId: string } | null {
  const npc = keep.npcs.find((n) => n.id === npcId);
  if (!npc) return null;

  const unseen = getUnseenDialogue(npcId, npc.tier, npc.dialoguesSeen);
  if (unseen.length === 0) return null;

  return {
    speaker: unseen[0].speaker,
    text: unseen[0].text,
    dialogueId: unseen[0].id,
  };
}

export function markDialogueSeen(keep: KeepState, npcId: string, dialogueId: string): KeepState {
  const npcIdx = keep.npcs.findIndex((n) => n.id === npcId);
  if (npcIdx === -1) return keep;

  const newNpcs = [...keep.npcs];
  const npc = { ...newNpcs[npcIdx] };
  npc.dialoguesSeen = [...npc.dialoguesSeen, dialogueId];
  newNpcs[npcIdx] = npc;

  return { ...keep, npcs: newNpcs };
}

export function setNarrativeFlag(keep: KeepState, flag: string): KeepState {
  if (keep.narrativeFlags.includes(flag)) return keep;
  return { ...keep, narrativeFlags: [...keep.narrativeFlags, flag] };
}

export function hasNarrativeFlag(keep: KeepState, flag: string): boolean {
  return keep.narrativeFlags.includes(flag);
}
