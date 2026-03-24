import type { CombatState, Emplacement, CardDef, CardEffect, EnemyInstance } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';
import { getDamageMult, applyStatus } from './status.js';

export function placeEmplacement(state: CombatState, cardDef: CardDef, column: number, hpBonus: number = 0): boolean {
  if (column < 0 || column >= state.columns.length) return false;
  if (state.columns[column].emplacement) return false;
  if (!cardDef.emplaceHp || !cardDef.emplaceEffects) return false;

  const totalHp = cardDef.emplaceHp + hpBonus;
  state.columns[column].emplacement = {
    cardDefId: cardDef.id,
    hp: totalHp,
    maxHp: totalHp,
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
  const emplacementCount = state.columns.filter(c => c.emplacement).length;

  for (const col of state.columns) {
    if (!col.emplacement) continue;

    for (const effect of col.emplacement.effects) {
      applyEmplacementEffect(state, col.index, effect);
    }

    const leftHasEmplace = col.index > 0 && state.columns[col.index - 1].emplacement;
    const rightHasEmplace = col.index < state.columns.length - 1 && state.columns[col.index + 1].emplacement;
    const adjacencyBonus = (leftHasEmplace ? 1 : 0) + (rightHasEmplace ? 1 : 0);

    if (adjacencyBonus > 0) {
      for (const effect of col.emplacement.effects) {
        if (effect.type === 'damage') {
          for (const enemy of col.enemies) {
            applyEmplacementDamage(enemy, adjacencyBonus);
          }
        }
        if (effect.type === 'block') {
          state.gateBlock += adjacencyBonus;
        }
      }
    }

    state.events.push({
      type: 'emplacement_triggered',
      turn: state.turn,
      data: { column: col.index, cardId: col.emplacement.cardDefId, adjacencyBonus },
    });
  }

  if (emplacementCount >= 3) {
    state.gateBlock += emplacementCount;
  }
}

function applyEmplacementDamage(enemy: EnemyInstance, baseDmg: number): void {
  const mult = getDamageMult(enemy);
  enemy.hp -= Math.max(0, Math.floor(baseDmg * mult));
}

function applyEmplacementEffect(state: CombatState, column: number, effect: CardEffect): void {
  const col = state.columns[column];
  switch (effect.type) {
    case 'damage': {
      if (effect.target === 'column') {
        for (const enemy of col.enemies) {
          applyEmplacementDamage(enemy, effect.value);
        }
      } else if (effect.target === 'adjacent') {
        for (let c = Math.max(0, column - 1); c <= Math.min(state.columns.length - 1, column + 1); c++) {
          for (const enemy of state.columns[c].enemies) {
            applyEmplacementDamage(enemy, effect.value);
          }
        }
      } else {
        for (const enemy of col.enemies) {
          applyEmplacementDamage(enemy, effect.value);
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
        applyStatus(enemy, 'weak', effect.value, 2);
      }
      break;
    case 'vulnerable':
      for (const enemy of col.enemies) {
        applyStatus(enemy, 'vulnerable', effect.value, 2);
      }
      break;
  }
}

export function reinforceEmplacement(state: CombatState, column: number, cardDef: CardDef): boolean {
  const col = state.columns[column];
  if (!col.emplacement) return false;
  if (!cardDef.emplaceHp || !cardDef.emplaceEffects) return false;

  col.emplacement.hp += Math.floor(cardDef.emplaceHp / 2);
  col.emplacement.maxHp += Math.floor(cardDef.emplaceHp / 2);

  for (const newEffect of cardDef.emplaceEffects) {
    const existing = col.emplacement.effects.find(e => e.type === newEffect.type && e.target === newEffect.target);
    if (existing) {
      existing.value += Math.floor(newEffect.value / 2);
    } else {
      col.emplacement.effects.push({ ...newEffect, value: Math.floor(newEffect.value / 2) });
    }
  }

  state.events.push({
    type: 'emplacement_placed',
    turn: state.turn,
    data: { cardId: cardDef.id, column, reinforced: true },
  });

  return true;
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
