import type { CombatState, CombatEvent, Column, CardInstance, EnemyInstance, Intent } from '@codekeep/shared';
import { COLUMNS, ROWS, HAND_SIZE, STARTING_GATE_HP, MAX_RESOLVE, getCardDef, getEnemyTemplate } from '@codekeep/shared';
import { mulberry32 } from './rng.js';
import { shuffleDeck, drawCards } from './deck.js';
import { spawnEnemy, rollEnemyIntent } from './enemies.js';

export function createCombatState(
  deck: CardInstance[],
  seed: number,
  gateHp: number = STARTING_GATE_HP,
  gateMaxHp: number = STARTING_GATE_HP,
  enemyWave: { templateId: string; column: number }[] = [
    { templateId: 'hollow', column: 1 },
    { templateId: 'hollow', column: 3 },
    { templateId: 'needle', column: 2 },
  ],
): CombatState {
  const rng = mulberry32(seed);
  const shuffled = shuffleDeck(deck, rng);

  const columns: Column[] = Array.from({ length: COLUMNS }, (_, i) => ({
    index: i,
    enemies: [],
    emplacement: null,
  }));

  for (const w of enemyWave) {
    const enemy = spawnEnemy(w.templateId, w.column);
    columns[enemy.column].enemies.push(enemy);
  }

  const { drawn, newDrawPile, newDiscardPile } = drawCards(shuffled, [], HAND_SIZE, rng);

  const state: CombatState = {
    columns,
    hand: drawn,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
    exhaustPile: [],
    gateHp,
    gateMaxHp,
    gateBlock: 0,
    resolve: MAX_RESOLVE,
    maxResolve: MAX_RESOLVE,
    turn: 1,
    phase: 'player',
    outcome: 'undecided',
    events: [],
    seed,
  };

  for (const col of columns) {
    for (const enemy of col.enemies) {
      enemy.intent = rollEnemyIntent(enemy, rng);
    }
  }

  pushEvent(state, 'turn_start', { turn: 1 });
  return state;
}

function pushEvent(state: CombatState, type: CombatEvent['type'], data: Record<string, unknown>): void {
  state.events.push({ type, turn: state.turn, data });
}

export function playCard(state: CombatState, cardIndex: number, targetColumn?: number): CombatState {
  if (state.phase !== 'player') return state;

  const card = state.hand[cardIndex];
  if (!card) return state;

  const def = getCardDef(card.defId);
  if (!def) return state;
  if (def.cost > state.resolve) return state;

  state.resolve -= def.cost;
  state.hand.splice(cardIndex, 1);

  for (const effect of def.effects) {
    applyEffect(state, effect, targetColumn ?? 0);
  }

  state.discardPile.push(card);
  pushEvent(state, 'card_played', { cardId: card.defId, targetColumn });

  checkCombatEnd(state);
  return state;
}

function applyEffect(
  state: CombatState,
  effect: { type: string; value: number; target?: string },
  targetColumn: number,
): void {
  switch (effect.type) {
    case 'damage': {
      if (effect.target === 'all') {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyDamageToEnemy(state, enemy, effect.value);
          }
        }
      } else if (effect.target === 'column') {
        const col = state.columns[targetColumn];
        if (col) {
          for (const enemy of col.enemies) {
            applyDamageToEnemy(state, enemy, effect.value);
          }
        }
      } else {
        const col = state.columns[targetColumn];
        if (col && col.enemies.length > 0) {
          const frontEnemy = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
          applyDamageToEnemy(state, frontEnemy, effect.value);
        }
      }
      removeDeadEnemies(state);
      break;
    }
    case 'block':
      state.gateBlock += effect.value;
      pushEvent(state, 'block_gained', { value: effect.value });
      break;
    case 'heal':
      state.gateHp = Math.min(state.gateMaxHp, state.gateHp + effect.value);
      break;
    case 'draw': {
      const { drawn, newDrawPile, newDiscardPile } = drawCards(
        state.drawPile, state.discardPile, effect.value, mulberry32(state.seed + state.turn),
      );
      state.hand.push(...drawn);
      state.drawPile = newDrawPile;
      state.discardPile = newDiscardPile;
      break;
    }
    case 'resolve':
      state.resolve = Math.min(state.maxResolve + 5, state.resolve + effect.value);
      break;
  }
}

function applyDamageToEnemy(state: CombatState, enemy: EnemyInstance, damage: number): void {
  const vuln = enemy.statusEffects.find((s) => s.type === 'vulnerable');
  const mult = vuln ? 1.5 : 1;
  const actual = Math.floor(damage * mult);
  enemy.hp -= actual;
  pushEvent(state, 'damage_dealt', { targetId: enemy.instanceId, damage: actual });
}

function removeDeadEnemies(state: CombatState): void {
  for (const col of state.columns) {
    col.enemies = col.enemies.filter((e) => {
      if (e.hp <= 0) {
        pushEvent(state, 'enemy_killed', { enemyId: e.instanceId, templateId: e.templateId });
        return false;
      }
      return true;
    });
  }
}

export function endPlayerTurn(state: CombatState): CombatState {
  if (state.phase !== 'player') return state;

  pushEvent(state, 'turn_end', { turn: state.turn });
  state.phase = 'enemy';
  resolveEnemyTurn(state);
  return state;
}

function resolveEnemyTurn(state: CombatState): void {
  const rng = mulberry32(state.seed + state.turn * 31);

  for (const col of state.columns) {
    for (const enemy of col.enemies) {
      if (enemy.hp <= 0) continue;
      const intent = enemy.intent ?? { type: 'advance' as const, value: 1 };
      executeEnemyIntent(state, enemy, intent);
    }
  }

  removeDeadEnemies(state);
  checkCombatEnd(state);

  if (state.outcome !== 'undecided') return;

  state.turn++;
  state.phase = 'player';
  state.resolve = MAX_RESOLVE;
  state.gateBlock = 0;

  state.discardPile.push(...state.hand);
  state.hand = [];

  const { drawn, newDrawPile, newDiscardPile } = drawCards(
    state.drawPile, state.discardPile, HAND_SIZE, rng,
  );
  state.hand = drawn;
  state.drawPile = newDrawPile;
  state.discardPile = newDiscardPile;

  for (const col of state.columns) {
    for (const enemy of col.enemies) {
      enemy.intent = rollEnemyIntent(enemy, rng);
    }
  }

  pushEvent(state, 'turn_start', { turn: state.turn });
}

function executeEnemyIntent(state: CombatState, enemy: EnemyInstance, intent: Intent): void {
  const tmpl = getEnemyTemplate(enemy.templateId);
  const weakened = enemy.statusEffects.find((s) => s.type === 'weak');

  switch (intent.type) {
    case 'advance':
      enemy.row = Math.min(ROWS - 1, enemy.row + (tmpl?.speed ?? 1));
      pushEvent(state, 'enemy_advance', { enemyId: enemy.instanceId, row: enemy.row });
      if (enemy.row >= ROWS - 1) {
        const col = state.columns[enemy.column];
        if (col.emplacement) {
          col.emplacement.hp -= (tmpl?.damage ?? 4);
          if (col.emplacement.hp <= 0) {
            pushEvent(state, 'emplacement_destroyed', { column: enemy.column });
            col.emplacement = null;
          }
        } else {
          const dmg = weakened ? Math.floor((tmpl?.damage ?? 4) * 0.75) : (tmpl?.damage ?? 4);
          const blocked = Math.min(state.gateBlock, dmg);
          state.gateBlock -= blocked;
          state.gateHp -= (dmg - blocked);
          pushEvent(state, 'gate_hit', { enemyId: enemy.instanceId, damage: dmg - blocked, blocked });
        }
      }
      break;
    case 'attack': {
      const dmg = weakened ? Math.floor((tmpl?.damage ?? 4) * 0.75) : (tmpl?.damage ?? 4);
      const blocked = Math.min(state.gateBlock, dmg);
      state.gateBlock -= blocked;
      state.gateHp -= (dmg - blocked);
      pushEvent(state, 'gate_hit', { enemyId: enemy.instanceId, damage: dmg - blocked, blocked });
      break;
    }
  }
}

function checkCombatEnd(state: CombatState): void {
  if (state.gateHp <= 0) {
    state.gateHp = 0;
    state.outcome = 'lose';
    state.phase = 'ended';
    pushEvent(state, 'combat_end', { outcome: 'lose' });
    return;
  }
  const totalEnemies = state.columns.reduce((sum, col) => sum + col.enemies.length, 0);
  if (totalEnemies === 0) {
    state.outcome = 'win';
    state.phase = 'ended';
    pushEvent(state, 'combat_end', { outcome: 'win' });
  }
}

export type { CombatState, CardInstance, Column };
