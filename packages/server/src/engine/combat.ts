import type { CombatState, CombatEvent, Column, CardInstance, EnemyInstance, Intent, DifficultyModifiers } from '@codekeep/shared';
import { COLUMNS, ROWS, HAND_SIZE, STARTING_GATE_HP, MAX_RESOLVE, getCardDef, getEnemyTemplate } from '@codekeep/shared';
import { mulberry32 } from './rng.js';
import { shuffleDeck, drawCards } from './deck.js';
import { spawnEnemy, rollEnemyIntent } from './enemies.js';
import { placeEmplacement, reinforceEmplacement, triggerEmplacements } from './emplacements.js';
import { tickStatusEffects, applyBurn, getDamageMult, getEnemyDamageMult, applyStatus, hasStatus } from './status.js';
import { applyRelicEffect, getMaxResolveBonus, getEmplaceHpBonus, hasFirstCardFree } from './relics.js';

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
  relics: string[] = [],
  difficulty?: DifficultyModifiers,
): CombatState {
  const rng = mulberry32(seed);
  const shuffled = shuffleDeck(deck, rng);

  const resolveBonus = getMaxResolveBonus(relics);
  const maxResolve = (difficulty?.reducedMaxResolve ? MAX_RESOLVE - 1 : MAX_RESOLVE) + resolveBonus;

  const handSize = difficulty?.reducedHandSize ? HAND_SIZE - 1 : HAND_SIZE;

  const columns: Column[] = Array.from({ length: COLUMNS }, (_, i) => ({
    index: i,
    enemies: [],
    emplacement: null,
  }));

  for (const w of enemyWave) {
    const enemy = spawnEnemy(w.templateId, w.column);
    if (difficulty?.enemyHpMult && difficulty.enemyHpMult !== 1) {
      enemy.hp = Math.ceil(enemy.hp * difficulty.enemyHpMult);
      enemy.maxHp = Math.ceil(enemy.maxHp * difficulty.enemyHpMult);
    }
    if (difficulty?.enemyBlitz) {
      enemy.row = 1;
    }
    if (difficulty?.enemyStartFortified) {
      applyStatus(enemy, 'fortified', 1, 99);
    }
    columns[enemy.column].enemies.push(enemy);
  }

  const { drawn, newDrawPile, newDiscardPile } = drawCards(shuffled, [], handSize, rng);

  const state: CombatState = {
    columns,
    hand: drawn,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
    exhaustPile: [],
    gateHp,
    gateMaxHp,
    gateBlock: 0,
    resolve: maxResolve,
    maxResolve,
    turn: 1,
    phase: 'player',
    outcome: 'undecided',
    events: [],
    seed,
    killsThisCombat: 0,
    relics,
    difficulty,
  };

  applyRelicEffect(state, relics, 'on_combat_start');

  for (const col of columns) {
    for (const enemy of col.enemies) {
      const colHasEmplacement = col.emplacement !== null;
      enemy.intent = rollEnemyIntent(enemy, rng, 1, colHasEmplacement);
    }
  }

  pushEvent(state, 'turn_start', { turn: 1 });
  return state;
}

function pushEvent(state: CombatState, type: CombatEvent['type'], data: Record<string, unknown>): void {
  state.events.push({ type, turn: state.turn, data });
  if (state.events.length > 100) {
    state.events = state.events.slice(-100);
  }
}

export function playCard(state: CombatState, cardIndex: number, targetColumn?: number, asEmplace: boolean = false): CombatState {
  if (state.phase !== 'player') return state;

  const card = state.hand[cardIndex];
  if (!card) return state;

  const def = getCardDef(card.defId);
  if (!def) return state;

  const isFirstCardThisTurn = !state.events.some(
    (e) => e.type === 'card_played' && e.turn === state.turn,
  );
  const firstCardFree = hasFirstCardFree(state.relics) && isFirstCardThisTurn;

  if (asEmplace && def.type === 'emplace' && def.emplaceCost !== undefined) {
    const cost = firstCardFree ? 0 : def.emplaceCost;
    if (cost > state.resolve) return state;
    const col = targetColumn ?? 0;
    const emplaceHpBonus = getEmplaceHpBonus(state.relics);
    const placed = placeEmplacement(state, def, col, emplaceHpBonus) || reinforceEmplacement(state, col, def);
    if (!placed) return state;
    state.resolve -= cost;
    state.hand.splice(cardIndex, 1);

    state.exhaustPile.push(card);

    applyRelicEffect(state, state.relics, 'on_emplace');
  } else {
    const cost = firstCardFree ? 0 : def.cost;
    if (cost > state.resolve) return state;
    state.resolve -= cost;
    state.hand.splice(cardIndex, 1);

    let shouldExhaust = false;
    for (const effect of def.effects) {
      if (effect.type === 'exhaust_self') {
        shouldExhaust = true;
        continue;
      }
      applyEffect(state, effect, targetColumn ?? 0);
    }

    removeDeadEnemies(state);

    if (shouldExhaust) {
      state.exhaustPile.push(card);
    } else {
      state.discardPile.push(card);
    }

    applyRelicEffect(state, state.relics, 'on_card_play', { cardCost: def.cost, cardId: def.id });
  }

  state.lastCardPlayed = card.defId;

  pushEvent(state, 'card_played', { cardId: card.defId, targetColumn, asEmplace });

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
    case 'vulnerable': {
      if (effect.target === 'all') {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'vulnerable', effect.value, 3);
          }
        }
      } else if (effect.target === 'column') {
        const col = state.columns[targetColumn];
        if (col) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'vulnerable', effect.value, 3);
          }
        }
      } else {
        const col = state.columns[targetColumn];
        if (col && col.enemies.length > 0) {
          const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
          applyStatus(front, 'vulnerable', effect.value, 3);
        }
      }
      pushEvent(state, 'status_applied', { type: 'vulnerable', value: effect.value, column: targetColumn });
      break;
    }
    case 'weak': {
      if (effect.target === 'all') {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'weak', effect.value, 3);
          }
        }
      } else if (effect.target === 'column') {
        const col = state.columns[targetColumn];
        if (col) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'weak', effect.value, 3);
          }
        }
      } else {
        const col = state.columns[targetColumn];
        if (col && col.enemies.length > 0) {
          const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
          applyStatus(front, 'weak', effect.value, 3);
        }
      }
      pushEvent(state, 'status_applied', { type: 'weak', value: effect.value, column: targetColumn });
      break;
    }
    case 'burn': {
      if (effect.target === 'all') {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'burn', effect.value, 99);
          }
        }
      } else {
        const col = state.columns[targetColumn];
        if (col) {
          for (const enemy of col.enemies) {
            applyStatus(enemy, 'burn', effect.value, 99);
          }
        }
      }
      break;
    }
    case 'self_damage': {
      state.gateHp -= effect.value;
      pushEvent(state, 'gate_hit', { self: true, damage: effect.value });
      break;
    }
    case 'fortify': {
      break;
    }

    // ── Synergy / Conditional effects ──

    case 'trigger_emplacements': {
      triggerEmplacements(state);
      break;
    }
    case 'damage_per_burn': {
      for (const col of state.columns) {
        for (const enemy of col.enemies) {
          const burnStacks = hasStatus(enemy, 'burn');
          if (burnStacks > 0) {
            applyDamageToEnemy(state, enemy, effect.value * burnStacks);
          }
        }
      }
      break;
    }
    case 'damage_equal_block': {
      const dmg = state.gateBlock;
      const col = state.columns[targetColumn];
      if (col && col.enemies.length > 0) {
        const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
        applyDamageToEnemy(state, front, dmg);
      }
      break;
    }
    case 'draw_per_kills': {
      const drawCount = state.killsThisCombat * effect.value;
      if (drawCount > 0) {
        const { drawn, newDrawPile, newDiscardPile } = drawCards(
          state.drawPile, state.discardPile, drawCount, mulberry32(state.seed + state.turn + 3),
        );
        state.hand.push(...drawn);
        state.drawPile = newDrawPile;
        state.discardPile = newDiscardPile;
      }
      break;
    }
    case 'damage_if_vulnerable': {
      const col = state.columns[targetColumn];
      if (col && col.enemies.length > 0) {
        const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
        const isVulnerable = hasStatus(front, 'vulnerable') > 0;
        const dmg = isVulnerable ? effect.value * 2 : effect.value;
        applyDamageToEnemy(state, front, dmg);
      }
      break;
    }
    case 'damage_per_kill_this_action': {
      const killed = countJustKilled(state);
      if (killed > 0) {
        const totalDmg = effect.value * killed;
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyDamageToEnemy(state, enemy, totalDmg);
          }
        }
      }
      break;
    }
    case 'exhaust_draw': {
      if (state.hand.length > 0) {
        const exhausted = state.hand.shift()!;
        state.exhaustPile.push(exhausted);
      }
      const { drawn, newDrawPile, newDiscardPile } = drawCards(
        state.drawPile, state.discardPile, effect.value, mulberry32(state.seed + state.turn + 5),
      );
      state.hand.push(...drawn);
      state.drawPile = newDrawPile;
      state.discardPile = newDiscardPile;
      break;
    }
    case 'burn_if_burning': {
      let anyBurning = false;
      for (const col of state.columns) {
        for (const enemy of col.enemies) {
          if (hasStatus(enemy, 'burn') > 0) { anyBurning = true; break; }
        }
        if (anyBurning) break;
      }
      const burnAmount = anyBurning ? effect.value + 2 : effect.value;
      for (const col of state.columns) {
        for (const enemy of col.enemies) {
          applyStatus(enemy, 'burn', burnAmount, 99);
        }
      }
      break;
    }
    case 'damage_plus_block': {
      const bonus = Math.min(state.gateBlock, 10);
      const totalDmg = effect.value + bonus;
      const col = state.columns[targetColumn];
      if (col && col.enemies.length > 0) {
        const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
        applyDamageToEnemy(state, front, totalDmg);
      }
      break;
    }
    case 'replay_last': {
      if (state.lastCardPlayed && state.lastCardPlayed !== 'pale_echo') {
        const lastDef = getCardDef(state.lastCardPlayed);
        if (lastDef) {
          for (const eff of lastDef.effects) {
            if (eff.type !== 'exhaust_self' && eff.type !== 'replay_last') {
              applyEffect(state, eff, targetColumn);
            }
          }
        }
      }
      break;
    }
    case 'damage_if_emplaced': {
      const col = state.columns[targetColumn];
      if (col) {
        const dmg = col.emplacement ? Math.floor(effect.value * 1.5) : effect.value;
        for (const enemy of col.enemies) {
          applyDamageToEnemy(state, enemy, dmg);
        }
      }
      break;
    }
    case 'damage_if_low_hp': {
      const lowHp = state.gateHp < state.gateMaxHp * 0.5;
      const dmg = lowHp ? effect.value * 2 : effect.value;
      const col = state.columns[targetColumn];
      if (col && col.enemies.length > 0) {
        const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
        applyDamageToEnemy(state, front, dmg);
      }
      break;
    }
    case 'damage_per_emplace': {
      const emplaceCount = state.columns.filter((c) => c.emplacement !== null).length;
      if (emplaceCount > 0) {
        const totalDmg = effect.value * emplaceCount;
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            applyDamageToEnemy(state, enemy, totalDmg);
          }
        }
      }
      break;
    }
    case 'draw_per_empty_potions': {
      const drawCount = 2;
      const { drawn, newDrawPile, newDiscardPile } = drawCards(
        state.drawPile, state.discardPile, drawCount, mulberry32(state.seed + state.turn + 9),
      );
      state.hand.push(...drawn);
      state.drawPile = newDrawPile;
      state.discardPile = newDiscardPile;
      break;
    }
    case 'exhaust_self': {
      break;
    }
  }
}

function countJustKilled(state: CombatState): number {
  let count = 0;
  for (const col of state.columns) {
    for (const enemy of col.enemies) {
      if (enemy.hp <= 0) count++;
    }
  }
  return count;
}

function applyDamageToEnemy(state: CombatState, enemy: EnemyInstance, damage: number): void {
  const mult = getDamageMult(enemy);
  const actual = Math.floor(damage * mult);
  enemy.hp -= actual;
  pushEvent(state, 'damage_dealt', { targetId: enemy.instanceId, damage: actual });
}

function removeDeadEnemies(state: CombatState): void {
  for (const col of state.columns) {
    col.enemies = col.enemies.filter((e) => {
      if (e.hp <= 0) {
        state.killsThisCombat++;
        pushEvent(state, 'enemy_killed', { enemyId: e.instanceId, templateId: e.templateId });

        const diedFromBurn = hasStatus(e, 'burn') > 0;
        applyRelicEffect(state, state.relics, 'on_enemy_kill', {
          column: col.index,
          diedFromBurn,
          templateId: e.templateId,
        });

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

  const allEnemies = state.columns.flatMap(col => col.enemies.map(e => ({ enemy: e, intent: e.intent ?? { type: 'advance' as const, value: 1 } })));
  for (const { enemy, intent } of allEnemies) {
    if (enemy.hp <= 0) continue;
    executeEnemyIntent(state, enemy, intent, rng);
  }

  removeDeadEnemies(state);
  checkCombatEnd(state);

  if (state.outcome !== 'undecided') return;

  state.turn++;
  state.phase = 'player';
  state.resolve = state.maxResolve;
  state.gateBlock = 0;

  triggerEmplacements(state);
  removeDeadEnemies(state);
  checkCombatEnd(state);
  if (state.outcome !== 'undecided') return;

  applyRelicEffect(state, state.relics, 'on_turn_start');

  state.discardPile.push(...state.hand);
  state.hand = [];

  const handSize = state.difficulty?.reducedHandSize ? HAND_SIZE - 1 : HAND_SIZE;
  const { drawn, newDrawPile, newDiscardPile } = drawCards(
    state.drawPile, state.discardPile, handSize, rng,
  );
  state.hand = drawn;
  state.drawPile = newDrawPile;
  state.discardPile = newDiscardPile;

  for (const col of state.columns) {
    for (const enemy of col.enemies) {
      const colHasEmplacement = col.emplacement !== null;
      enemy.intent = rollEnemyIntent(enemy, rng, state.turn, colHasEmplacement);
    }
  }

  pushEvent(state, 'turn_start', { turn: state.turn });
}

function executeEnemyIntent(state: CombatState, enemy: EnemyInstance, intent: Intent, rng: () => number): void {
  const tmpl = getEnemyTemplate(enemy.templateId);
  const dmgMult = getEnemyDamageMult(enemy);
  const diffDmgMult = state.difficulty?.enemyDamageMult ?? 1;

  applyBurn(enemy);
  tickStatusEffects(enemy);

  if (enemy.hp <= 0) return;

  switch (intent.type) {
    case 'advance': {
      // Breaker: if column has emplacement, deal double damage to emplacement instead of advancing
      if (enemy.templateId === 'breaker') {
        const col = state.columns[enemy.column];
        if (col.emplacement && enemy.row >= ROWS - 2) {
          const dmg = (tmpl?.damage ?? 10) * 2;
          col.emplacement.hp -= dmg;
          if (col.emplacement.hp <= 0) {
            pushEvent(state, 'emplacement_destroyed', { column: enemy.column });
            col.emplacement = null;
          }
          break;
        }
      }

      enemy.row = Math.min(ROWS - 1, enemy.row + (tmpl?.speed ?? 1));
      pushEvent(state, 'enemy_advance', { enemyId: enemy.instanceId, row: enemy.row });

      if (enemy.row >= ROWS - 1) {
        // Wraith: skip emplacement check, damage gate directly
        if (enemy.templateId === 'wraith') {
          const dmg = Math.floor((tmpl?.damage ?? 7) * dmgMult * diffDmgMult);
          const blocked = Math.min(state.gateBlock, dmg);
          state.gateBlock -= blocked;
          state.gateHp -= (dmg - blocked);
          pushEvent(state, 'gate_hit', { enemyId: enemy.instanceId, damage: dmg - blocked, blocked });
        } else {
          const col = state.columns[enemy.column];
          if (col.emplacement) {
            col.emplacement.hp -= (tmpl?.damage ?? 4);
            if (col.emplacement.hp <= 0) {
              pushEvent(state, 'emplacement_destroyed', { column: enemy.column });
              col.emplacement = null;
            }
          } else {
            const dmg = Math.floor((tmpl?.damage ?? 4) * dmgMult * diffDmgMult);
            const blocked = Math.min(state.gateBlock, dmg);
            state.gateBlock -= blocked;
            state.gateHp -= (dmg - blocked);
            pushEvent(state, 'gate_hit', { enemyId: enemy.instanceId, damage: dmg - blocked, blocked });
          }
        }
      }
      break;
    }
    case 'attack': {
      // Flanker: shift column before attacking
      if (enemy.templateId === 'flanker') {
        const shift = rng() < 0.5 ? -1 : 1;
        const oldCol = enemy.column;
        const newCol = Math.max(0, Math.min(COLUMNS - 1, enemy.column + shift));
        if (newCol !== oldCol) {
          const srcCol = state.columns[oldCol];
          srcCol.enemies = srcCol.enemies.filter((e) => e.instanceId !== enemy.instanceId);
          enemy.column = newCol;
          state.columns[newCol].enemies.push(enemy);
        }
      }

      const dmg = Math.floor((tmpl?.damage ?? 4) * dmgMult * diffDmgMult);
      const blocked = Math.min(state.gateBlock, dmg);
      state.gateBlock -= blocked;
      state.gateHp -= (dmg - blocked);
      pushEvent(state, 'gate_hit', { enemyId: enemy.instanceId, damage: dmg - blocked, blocked });
      break;
    }
    case 'buff':
      applyStatus(enemy, 'empowered', intent.value, 3);
      break;
    case 'debuff': {
      state.gateBlock = Math.max(0, state.gateBlock - intent.value * 2);
      break;
    }
    case 'shield': {
      const col = state.columns[enemy.column];
      for (const e of col.enemies) {
        applyStatus(e, 'fortified', intent.value, 2);
      }
      break;
    }
    case 'summon': {
      const emptyCol = state.columns.findIndex((c) => c.enemies.length === 0);
      if (emptyCol >= 0) {
        const spawned = spawnEnemy('wisp', emptyCol);
        state.columns[emptyCol].enemies.push(spawned);
        spawned.intent = rollEnemyIntent(spawned, mulberry32(state.seed + state.turn * 97));
      }
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
