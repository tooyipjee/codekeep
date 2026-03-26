import { useState, useCallback, useRef, useEffect } from 'react';
import type { CombatState, CombatEvent, CardInstance, PotionDef, DifficultyModifiers } from '@codekeep/shared';
import { getCardDef, getEnemyTemplate, HAND_SIZE } from '@codekeep/shared';
import { createCombatState, playCard, endPlayerTurn, createStarterDeck, mulberry32, drawCards, hasFirstCardFree } from '@codekeep/server';

export interface UseCombatStateReturn {
  combat: CombatState | null;
  selectedCard: number;
  targetColumn: number;
  message: string;
  emplaceMode: boolean;
  animating: boolean;
  selectCard: (index: number) => void;
  selectTarget: (col: number) => void;
  confirmPlay: () => void;
  endTurn: () => void;
  toggleEmplace: () => void;
  startCombat: (deck?: CardInstance[], seed?: number, gateHp?: number, gateMaxHp?: number, wave?: { templateId: string; column: number }[], relics?: string[], difficulty?: DifficultyModifiers) => void;
  applyPotion: (potionDef: PotionDef | null) => void;
  needsTarget: boolean;
}

function describeEnemyEvent(evt: CombatEvent): string | null {
  switch (evt.type) {
    case 'enemy_advance': return `Enemy advances to row ${evt.data.row}`;
    case 'gate_hit': {
      const blocked = evt.data.blocked ? ` (${evt.data.blocked} blocked)` : '';
      return evt.data.self ? `Gate takes ${evt.data.damage} self-damage` : `Enemy hits gate for ${evt.data.damage}${blocked}!`;
    }
    case 'enemy_killed': return 'An enemy is destroyed!';
    case 'emplacement_destroyed': return `Emplacement in column ${(evt.data.column as number) + 1} destroyed!`;
    case 'emplacement_triggered': return `Emplacement fires in column ${(evt.data.column as number) + 1}`;
    case 'status_applied': return `${evt.data.type} applied (${evt.data.value} stacks)`;
    case 'damage_dealt': return `${evt.data.damage} damage dealt`;
    case 'block_gained': return `+${evt.data.value} Block`;
    default: return null;
  }
}

const TARGETING_EFFECT_TYPES = new Set([
  'damage', 'damage_if_vulnerable', 'damage_equal_block', 'damage_if_emplaced',
  'damage_plus_block', 'damage_if_low_hp', 'vulnerable', 'weak', 'burn',
]);

const ANIM_STEP_MS = 700;

export function useCombatState(skipEnemyAnimation = false): UseCombatStateReturn {
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedCard, setSelectedCard] = useState(-1);
  const [targetColumn, setTargetColumn] = useState(2);
  const [message, setMessage] = useState('');
  const [emplaceMode, setEmplaceMode] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animQueue, setAnimQueue] = useState<string[]>([]);
  const combatRef = useRef<CombatState | null>(null);
  const targetColumnRef = useRef(2);

  useEffect(() => {
    if (!animating || animQueue.length === 0) return;

    if (skipEnemyAnimation) {
      setMessage(animQueue[animQueue.length - 1]);
      setAnimQueue([]);
      setAnimating(false);
      const state = combatRef.current;
      if (state) {
        if (state.outcome === 'win') {
          setMessage('Victory! The Pale recedes.');
        } else if (state.outcome === 'lose') {
          setMessage('The Gate has fallen...');
        } else {
          setMessage(`Turn ${state.turn}. Your move.`);
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      const [current, ...rest] = animQueue;
      setMessage(current);
      if (rest.length === 0) {
        setAnimating(false);
        const state = combatRef.current;
        if (state) {
          if (state.outcome === 'win') {
            setMessage('Victory! The Pale recedes.');
          } else if (state.outcome === 'lose') {
            setMessage('The Gate has fallen...');
          } else {
            setMessage(`Turn ${state.turn}. Your move.`);
          }
        }
      } else {
        setAnimQueue(rest);
      }
    }, ANIM_STEP_MS);
    return () => clearTimeout(timer);
  }, [animating, animQueue, skipEnemyAnimation]);

  const startCombat = useCallback((
    deck?: CardInstance[],
    seed?: number,
    gateHp?: number,
    gateMaxHp?: number,
    wave?: { templateId: string; column: number }[],
    relics?: string[],
    difficulty?: DifficultyModifiers,
  ) => {
    const d = deck ?? createStarterDeck();
    const s = seed ?? Math.floor(Math.random() * 2147483647);
    const state = createCombatState(d, s, gateHp, gateMaxHp, wave, relics ?? [], difficulty);
    combatRef.current = state;
    setCombat({ ...state });
    setSelectedCard(-1);
    setTargetColumn(2);
    targetColumnRef.current = 2;
    setEmplaceMode(false);
    setMessage('Your turn. Select a card (1-5) and a column (←→).');
  }, []);

  const needsTarget = (() => {
    if (selectedCard < 0 || !combat) return false;
    const card = combat.hand[selectedCard];
    if (!card) return false;
    const def = getCardDef(card.defId);
    if (!def) return false;
    return def.effects.some((e) =>
      TARGETING_EFFECT_TYPES.has(e.type) && (e.target === 'single' || e.target === 'column'),
    );
  })();

  const selectCard = useCallback((index: number) => {
    if (!combatRef.current || combatRef.current.phase !== 'player') return;
    if (index < 0 || index >= combatRef.current.hand.length) return;
    const card = combatRef.current.hand[index];
    const def = getCardDef(card.defId);
    if (!def) return;
    const isFirstCardThisTurn = !combatRef.current.events.some(
      (e) => e.type === 'card_played' && e.turn === combatRef.current!.turn,
    );
    const firstCardFree = hasFirstCardFree(combatRef.current.relics) && isFirstCardThisTurn;
    const effectiveCost = firstCardFree ? 0 : def.cost;
    if (effectiveCost > combatRef.current.resolve) {
      setMessage(`Not enough Resolve for ${def.name} (costs ${def.cost}).`);
      return;
    }
    setSelectedCard(index);
    const needsTgt = def.effects.some((e) =>
      TARGETING_EFFECT_TYPES.has(e.type) && (e.target === 'single' || e.target === 'column'),
    );
    if (needsTgt) {
      const cols = combatRef.current.columns;
      const cur = targetColumnRef.current;
      if (cols[cur].enemies.length === 0) {
        let best = -1;
        let bestDist = 99;
        for (let c = 0; c < cols.length; c++) {
          if (cols[c].enemies.length > 0 && Math.abs(c - cur) < bestDist) {
            best = c;
            bestDist = Math.abs(c - cur);
          }
        }
        if (best >= 0) { setTargetColumn(best); targetColumnRef.current = best; }
      }
      setMessage(`${def.name} selected. Choose column (←→), Enter to play.`);
    } else {
      setMessage(`${def.name} selected. Enter to play.`);
    }
  }, []);

  const selectTarget = useCallback((col: number) => {
    if (col >= 0 && col < 5) {
      setTargetColumn(col);
      targetColumnRef.current = col;
    }
  }, []);

  const confirmPlay = useCallback(() => {
    const state = combatRef.current;
    if (!state || state.phase !== 'player' || selectedCard < 0) return;
    const card = state.hand[selectedCard];
    if (!card) return;
    const def = getCardDef(card.defId);
    if (!def) return;

    const needsSingleTarget = !emplaceMode && def.effects.some((e) =>
      TARGETING_EFFECT_TYPES.has(e.type) && e.target === 'single',
    );
    if (needsSingleTarget) {
      const col = state.columns[targetColumn];
      if (!col || col.enemies.length === 0) {
        setMessage(`No enemies in column ${targetColumn + 1}. Move target (←→) to an enemy.`);
        return;
      }
    }

    const eventsBefore = state.events.length;
    playCard(state, selectedCard, targetColumn, emplaceMode);

    if (state.events.length === eventsBefore) {
      if (emplaceMode && state.columns[targetColumn]?.emplacement) {
        setMessage(`Column ${targetColumn + 1} already has an emplacement. Choose another column.`);
      } else {
        setMessage(`Cannot play ${def.name}. Not enough Resolve.`);
      }
      return;
    }

    combatRef.current = state;
    setCombat({ ...state });
    setSelectedCard(-1);
    setEmplaceMode(false);

    if (state.outcome === 'win') {
      setMessage('Victory! The Pale recedes.');
    } else if (state.outcome === 'lose') {
      setMessage('The Gate has fallen...');
    } else {
      const action = emplaceMode ? 'Emplaced' : 'Played';
      setMessage(`${action} ${def.name}. ${state.resolve} Resolve left.`);
    }
  }, [selectedCard, targetColumn, emplaceMode]);

  const toggleEmplace = useCallback(() => {
    if (selectedCard < 0 || !combatRef.current) return;
    const card = combatRef.current.hand[selectedCard];
    if (!card) return;
    const def = getCardDef(card.defId);
    if (!def || def.type !== 'emplace') {
      setMessage('This card cannot be emplaced.');
      return;
    }
    setEmplaceMode((prev) => !prev);
    setMessage(emplaceMode ? `${def.name}: cast mode` : `${def.name}: EMPLACE mode — place in a column`);
  }, [selectedCard, emplaceMode]);

  const endTurn = useCallback(() => {
    const state = combatRef.current;
    if (!state || state.phase !== 'player' || animating) return;

    const eventsBefore = state.events.length;
    endPlayerTurn(state);
    combatRef.current = state;
    setCombat({ ...state });
    setSelectedCard(-1);

    const newEvents = state.events.slice(eventsBefore);
    const descriptions: string[] = [];
    for (const evt of newEvents) {
      const desc = describeEnemyEvent(evt);
      if (desc) descriptions.push(desc);
    }

    if (descriptions.length > 0) {
      setAnimating(true);
      setMessage('⚡ Enemy turn...');
      setAnimQueue(descriptions);
    } else {
      if (state.outcome === 'win') {
        setMessage('Victory! The Pale recedes.');
      } else if (state.outcome === 'lose') {
        setMessage('The Gate has fallen...');
      } else {
        setMessage(`Turn ${state.turn}. Your move.`);
      }
    }
  }, [animating]);

  const applyPotion = useCallback((potionDef: PotionDef | null) => {
    const state = combatRef.current;
    if (!state || !potionDef) return;

    for (const effect of potionDef.effects) {
      switch (effect.type) {
        case 'heal':
          state.gateHp = Math.min(state.gateMaxHp, state.gateHp + effect.value);
          break;
        case 'block':
          state.gateBlock += effect.value;
          break;
        case 'damage': {
          const col = targetColumn;
          if (effect.target === 'column') {
            const c = state.columns[col];
            if (c) {
              for (const e of c.enemies) e.hp -= effect.value;
            }
          } else if (effect.target === 'all') {
            for (const c of state.columns) {
              for (const e of c.enemies) e.hp -= effect.value;
            }
          }
          for (const c of state.columns) {
            c.enemies = c.enemies.filter(e => e.hp > 0);
          }
          break;
        }
        case 'draw': {
          const rng = mulberry32(state.seed + state.turn * 53);
          const { drawn, newDrawPile, newDiscardPile } = drawCards(state.drawPile, state.discardPile, effect.value, rng);
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
    combatRef.current = state;
    setCombat({ ...state });
    setMessage(`Used ${potionDef.name}.`);
  }, [targetColumn]);

  return {
    combat,
    selectedCard,
    targetColumn,
    message,
    emplaceMode,
    animating,
    selectCard,
    selectTarget,
    confirmPlay,
    endTurn,
    toggleEmplace,
    startCombat,
    applyPotion,
    needsTarget,
  };
}
