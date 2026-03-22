import { useState, useCallback, useRef } from 'react';
import type { CombatState, CardInstance } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';
import { createCombatState, playCard, endPlayerTurn, createStarterDeck } from '@codekeep/server';

export interface UseCombatStateReturn {
  combat: CombatState | null;
  selectedCard: number;
  targetColumn: number;
  message: string;
  emplaceMode: boolean;
  selectCard: (index: number) => void;
  selectTarget: (col: number) => void;
  confirmPlay: () => void;
  endTurn: () => void;
  toggleEmplace: () => void;
  startCombat: (deck?: CardInstance[], seed?: number, gateHp?: number, gateMaxHp?: number, wave?: { templateId: string; column: number }[]) => void;
  needsTarget: boolean;
}

export function useCombatState(): UseCombatStateReturn {
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedCard, setSelectedCard] = useState(-1);
  const [targetColumn, setTargetColumn] = useState(2);
  const [message, setMessage] = useState('');
  const [emplaceMode, setEmplaceMode] = useState(false);
  const combatRef = useRef<CombatState | null>(null);

  const startCombat = useCallback((
    deck?: CardInstance[],
    seed?: number,
    gateHp?: number,
    gateMaxHp?: number,
    wave?: { templateId: string; column: number }[],
  ) => {
    const d = deck ?? createStarterDeck();
    const s = seed ?? Math.floor(Math.random() * 2147483647);
    const state = createCombatState(d, s, gateHp, gateMaxHp, wave);
    combatRef.current = state;
    setCombat({ ...state });
    setSelectedCard(-1);
    setTargetColumn(2);
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
      e.type === 'damage' && (e.target === 'single' || e.target === 'column'),
    );
  })();

  const selectCard = useCallback((index: number) => {
    if (!combatRef.current || combatRef.current.phase !== 'player') return;
    if (index < 0 || index >= combatRef.current.hand.length) return;
    const card = combatRef.current.hand[index];
    const def = getCardDef(card.defId);
    if (!def) return;
    if (def.cost > combatRef.current.resolve) {
      setMessage(`Not enough Resolve for ${def.name} (costs ${def.cost}).`);
      return;
    }
    setSelectedCard(index);
    const needsTgt = def.effects.some((e) =>
      e.type === 'damage' && (e.target === 'single' || e.target === 'column'),
    );
    if (needsTgt) {
      setMessage(`${def.name} selected. Choose column (←→), Enter to play.`);
    } else {
      setMessage(`${def.name} selected. Enter to play.`);
    }
  }, []);

  const selectTarget = useCallback((col: number) => {
    if (col >= 0 && col < 5) {
      setTargetColumn(col);
    }
  }, []);

  const confirmPlay = useCallback(() => {
    const state = combatRef.current;
    if (!state || state.phase !== 'player' || selectedCard < 0) return;
    const card = state.hand[selectedCard];
    if (!card) return;
    const def = getCardDef(card.defId);
    if (!def) return;

    playCard(state, selectedCard, targetColumn, emplaceMode);
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
    if (!state || state.phase !== 'player') return;

    endPlayerTurn(state);
    combatRef.current = state;
    setCombat({ ...state });
    setSelectedCard(-1);

    if (state.outcome === 'win') {
      setMessage('Victory! The Pale recedes.');
    } else if (state.outcome === 'lose') {
      setMessage('The Gate has fallen...');
    } else {
      setMessage(`Turn ${state.turn}. Your move.`);
    }
  }, []);

  return {
    combat,
    selectedCard,
    targetColumn,
    message,
    emplaceMode,
    selectCard,
    selectTarget,
    confirmPlay,
    endTurn,
    toggleEmplace,
    startCombat,
    needsTarget,
  };
}
