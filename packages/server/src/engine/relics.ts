import type { RelicDef, CombatState } from '@codekeep/shared';
import { applyStatus, getDamageMult } from './status.js';

export const RELIC_DEFS: RelicDef[] = [
  { id: 'wardens_signet', name: "Warden's Signet", description: '+1 max Resolve.',
    trigger: 'passive', effect: { type: 'max_resolve_bonus', value: 1 } },
  { id: 'column_keystone', name: 'Column Keystone', description: 'When you emplace, gain 8 Block.',
    trigger: 'on_emplace', effect: { type: 'block_on_emplace', value: 8 } },
  { id: 'echo_shard', name: 'Echo Shard', description: 'When an enemy dies, deal 3 damage to all enemies in same column.',
    trigger: 'on_enemy_kill', effect: { type: 'deal_damage_column', value: 3 } },
  { id: 'pale_lens', name: 'Pale Lens', description: 'At combat start, apply 1 Vulnerable to all enemies.',
    trigger: 'on_combat_start', effect: { type: 'apply_vulnerable_all', value: 1 } },
  { id: 'burnished_shield', name: 'Burnished Shield', description: 'At turn start, if Resolve is 0, gain 8 Block.',
    trigger: 'on_turn_start', effect: { type: 'gain_block', value: 8 } },
  { id: 'ember_crown', name: 'Ember Crown', description: 'When an enemy dies from Burn, apply 2 Burn to all enemies.',
    trigger: 'on_enemy_kill', effect: { type: 'burn_on_kill', value: 2 } },
  { id: 'architects_blueprint', name: "Architect's Blueprint", description: 'Emplacements gain +4 HP.',
    trigger: 'passive', effect: { type: 'emplace_hp_bonus', value: 4 } },
  { id: 'ironwood_staff', name: 'Ironwood Staff', description: 'Draw 1 extra card each turn.',
    trigger: 'on_turn_start', effect: { type: 'draw_cards', value: 1 } },
  { id: 'siege_engine', name: 'Siege Engine', description: 'Your first card each turn costs 0 Resolve.',
    trigger: 'on_turn_start', effect: { type: 'first_card_free', value: 1 } },
  { id: 'pale_compass', name: 'Pale Compass', description: 'After elite kills, gain a card reward.',
    trigger: 'on_elite_kill', effect: { type: 'extra_card_reward', value: 1 } },
  { id: 'fragment_magnet', name: 'Fragment Magnet', description: 'Gain +5 fragments per combat.',
    trigger: 'passive', effect: { type: 'fragment_bonus', value: 5 } },
  { id: 'hexproof_seal', name: 'Hexproof Seal', description: 'At combat start, gain 10 Block.',
    trigger: 'on_combat_start', effect: { type: 'gain_block', value: 10 } },
  { id: 'war_drum', name: 'War Drum', description: 'At combat start, apply 1 Weak to all enemies.',
    trigger: 'on_combat_start', effect: { type: 'apply_weak_all', value: 1 } },
  { id: 'living_wall', name: 'Living Wall', description: 'When you emplace, draw 2 cards.',
    trigger: 'on_emplace', effect: { type: 'draw_cards', value: 2 } },
  { id: 'siphon_ring', name: 'Siphon Ring', description: 'On card play, if card costs 2+, heal 2 Gate HP.',
    trigger: 'on_card_play', effect: { type: 'heal', value: 2 } },
  { id: 'void_prism', name: 'Void Prism', description: 'At turn start, deal 2 damage to all enemies.',
    trigger: 'on_turn_start', effect: { type: 'deal_damage_all', value: 2 } },
  { id: 'watchers_eye', name: "Watcher's Eye", description: 'At combat start, draw 2 extra cards.',
    trigger: 'on_combat_start', effect: { type: 'draw_cards', value: 2 } },
  { id: 'fortress_heart', name: 'Fortress Heart', description: 'Emplacements gain +3 HP.',
    trigger: 'passive', effect: { type: 'emplace_hp_bonus', value: 3 } },
  { id: 'mending_stone', name: 'Mending Stone', description: 'After combat, heal 5 Gate HP.',
    trigger: 'passive', effect: { type: 'heal', value: 5 } },
  { id: 'pale_harvester', name: 'Pale Harvester', description: 'On enemy kill, gain 1 Resolve (cap at max+2).',
    trigger: 'on_enemy_kill', effect: { type: 'gain_resolve', value: 1 } },
];

export function getRelicDef(id: string): RelicDef | undefined {
  return RELIC_DEFS.find((r) => r.id === id);
}

export function pickRelicReward(rng: () => number, ownedRelics: string[], count: number = 3): RelicDef[] {
  const pool = RELIC_DEFS.filter((r) => !ownedRelics.includes(r.id));
  const result: RelicDef[] = [];
  const available = [...pool];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    result.push(available[idx]);
    available.splice(idx, 1);
  }
  return result;
}

export function applyRelicEffect(
  state: CombatState,
  relics: string[],
  trigger: string,
  context?: Record<string, unknown>,
): void {
  for (const relicId of relics) {
    const def = getRelicDef(relicId);
    if (!def || def.trigger !== trigger) continue;

    switch (def.effect.type) {
      case 'gain_block': {
        if (relicId === 'burnished_shield' && state.resolve > 0) break;
        state.gateBlock += def.effect.value;
        state.events.push({ type: 'block_gained', turn: state.turn, data: { value: def.effect.value, relic: relicId } });
        break;
      }
      case 'gain_resolve': {
        state.resolve = Math.min(state.maxResolve * 2, state.resolve + def.effect.value);
        break;
      }
      case 'draw_cards': {
        const { drawCards } = await_drawCards();
        const { drawn, newDrawPile, newDiscardPile } = drawCards(
          state.drawPile, state.discardPile, def.effect.value, seedRng(state),
        );
        state.hand.push(...drawn);
        state.drawPile = newDrawPile;
        state.discardPile = newDiscardPile;
        break;
      }
      case 'deal_damage_all': {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            const mult = getDamageMult(enemy);
            enemy.hp -= Math.floor(def.effect.value * mult);
          }
        }
        break;
      }
      case 'deal_damage_column': {
        const killedCol = context?.column as number | undefined;
        if (killedCol !== undefined) {
          const col = state.columns[killedCol];
          if (col) {
            for (const enemy of col.enemies) {
              const mult = getDamageMult(enemy);
              enemy.hp -= Math.floor(def.effect.value * mult);
            }
          }
        }
        break;
      }
      case 'heal': {
        if (trigger === 'on_card_play') {
          const cardCost = context?.cardCost as number | undefined;
          if (cardCost !== undefined && cardCost < 2) break;
        }
        const healAmt = Math.floor(def.effect.value * (state.difficulty?.healMult ?? 1));
        state.gateHp = Math.min(state.gateMaxHp, state.gateHp + healAmt);
        break;
      }
      case 'apply_vulnerable_all': {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'vulnerable', def.effect.value, 3);
          }
        }
        break;
      }
      case 'apply_weak_all': {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'weak', def.effect.value, 3);
          }
        }
        break;
      }
      case 'burn_on_kill': {
        const diedFromBurn = context?.diedFromBurn as boolean | undefined;
        if (diedFromBurn) {
          for (const col of state.columns) {
            for (const enemy of col.enemies) {
              applyStatus(enemy, 'burn', def.effect.value, def.effect.value + 1);
            }
          }
        }
        break;
      }
      case 'block_on_emplace': {
        state.gateBlock += def.effect.value;
        state.events.push({ type: 'block_gained', turn: state.turn, data: { value: def.effect.value, relic: relicId } });
        break;
      }
      case 'first_card_free':
      case 'emplace_hp_bonus':
      case 'max_resolve_bonus':
      case 'extra_card_reward':
      case 'fragment_bonus':
        break;
    }
  }
}

function seedRng(state: CombatState): () => number {
  return mulberry32Inline(state.seed + state.turn * 7 + 13);
}

function mulberry32Inline(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function await_drawCards() {
  // Inline draw to avoid circular dependency with deck.ts
  return {
    drawCards(
      drawPile: { instanceId: string; defId: string; upgraded: boolean }[],
      discardPile: { instanceId: string; defId: string; upgraded: boolean }[],
      count: number,
      rng: () => number,
    ) {
      const drawn: { instanceId: string; defId: string; upgraded: boolean }[] = [];
      const pile = [...drawPile];
      let discard = [...discardPile];
      for (let i = 0; i < count; i++) {
        if (pile.length === 0) {
          if (discard.length === 0) break;
          for (let j = discard.length - 1; j > 0; j--) {
            const k = Math.floor(rng() * (j + 1));
            [discard[j], discard[k]] = [discard[k], discard[j]];
          }
          pile.push(...discard);
          discard = [];
        }
        drawn.push(pile.shift()!);
      }
      return { drawn, newDrawPile: pile, newDiscardPile: discard };
    },
  };
}

export function getEmplaceHpBonus(relics: string[]): number {
  let bonus = 0;
  for (const relicId of relics) {
    const def = getRelicDef(relicId);
    if (def && def.effect.type === 'emplace_hp_bonus') {
      bonus += def.effect.value;
    }
  }
  return bonus;
}

export function getMaxResolveBonus(relics: string[]): number {
  let bonus = 0;
  for (const relicId of relics) {
    const def = getRelicDef(relicId);
    if (def && def.effect.type === 'max_resolve_bonus') {
      bonus += def.effect.value;
    }
  }
  return bonus;
}

export function hasFirstCardFree(relics: string[]): boolean {
  return relics.some((id) => {
    const def = getRelicDef(id);
    return def && def.effect.type === 'first_card_free';
  });
}
