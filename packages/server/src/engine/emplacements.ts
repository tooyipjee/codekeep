import type { CombatState, Emplacement, CardDef, CardEffect, EnemyInstance } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';

export function placeEmplacement(state: CombatState, cardDef: CardDef, column: number): boolean {
  if (column < 0 || column >= state.columns.length) return false;
  if (state.columns[column].emplacement) return false;
  if (!cardDef.emplaceHp || !cardDef.emplaceEffects) return false;

  state.columns[column].emplacement = {
    cardDefId: cardDef.id,
    hp: cardDef.emplaceHp,
    maxHp: cardDef.emplaceHp,
    effects: cardDef.emplaceEffects,
  };

  state.events.push({
    type: 'emplacement_placed',
    turn: state.turn,
    data: { cardId: cardDef.id, column },
  });

  return true;
}

export function triggerEmplacements(state: CombatState): void {
  for (const col of state.columns) {
    if (!col.emplacement) continue;
    for (const effect of col.emplacement.effects) {
      applyEmplacementEffect(state, col.index, effect);
    }
    state.events.push({
      type: 'emplacement_triggered',
      turn: state.turn,
      data: { column: col.index, cardId: col.emplacement.cardDefId },
    });
  }
}

function applyEmplacementEffect(state: CombatState, column: number, effect: CardEffect): void {
  const col = state.columns[column];
  switch (effect.type) {
    case 'damage': {
      if (effect.target === 'column') {
        for (const enemy of col.enemies) {
          enemy.hp -= effect.value;
        }
      } else if (effect.target === 'adjacent') {
        for (let c = Math.max(0, column - 1); c <= Math.min(state.columns.length - 1, column + 1); c++) {
          for (const enemy of state.columns[c].enemies) {
            enemy.hp -= effect.value;
          }
        }
      } else {
        for (const enemy of col.enemies) {
          enemy.hp -= effect.value;
        }
      }
      break;
    }
    case 'block':
      state.gateBlock += effect.value;
      break;
    case 'heal':
      state.gateHp = Math.min(state.gateMaxHp, state.gateHp + effect.value);
      break;
    case 'weak':
      for (const enemy of col.enemies) {
        const existing = enemy.statusEffects.find((s) => s.type === 'weak');
        if (existing) { existing.stacks += effect.value; }
        else { enemy.statusEffects.push({ type: 'weak', stacks: effect.value, duration: 2 }); }
      }
      break;
    case 'vulnerable':
      for (const enemy of col.enemies) {
        const existing = enemy.statusEffects.find((s) => s.type === 'vulnerable');
        if (existing) { existing.stacks += effect.value; }
        else { enemy.statusEffects.push({ type: 'vulnerable', stacks: effect.value, duration: 2 }); }
      }
      break;
  }
}

export function damageEmplacement(state: CombatState, column: number, damage: number): void {
  const col = state.columns[column];
  if (!col.emplacement) return;
  col.emplacement.hp -= damage;
  if (col.emplacement.hp <= 0) {
    state.events.push({
      type: 'emplacement_destroyed',
      turn: state.turn,
      data: { column },
    });
    col.emplacement = null;
  }
}
