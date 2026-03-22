import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { CardDef, CardInstance, RunState, MapNode, CombatState, KeepState, PotionDef, GameSave } from '@codekeep/shared';
import { getCardDef, getEnemyTemplate, STARTING_GATE_HP, FRAGMENT_REWARDS, POTION_DEFS } from '@codekeep/shared';
import {
  createStarterDeck, makeCardInstance, generateCardRewards, pickEncounter,
  mulberry32, hashSeed, createCombatState, playCard, endPlayerTurn,
  createRun, visitNode, healGate, gainFragments, spendFragments, addCardToRunDeck, addPotion,
  removeCardFromRunDeck, advanceAct, usePotion,
  generateActMap, getReachableNodes, getNodeById,
  generateShop, pickEvent, getBossWave,
  saveGame, loadGame, createNewGameSave,
  calculateEchoReward, upgradeStructure, KEEP_STRUCTURES, getStructureLevel,
  createDefaultNpcs, getNextDialogue, markDialogueSeen,
  getCurrentStoryLayer,
} from '@codekeep/server';
import type { ShopItem, GameEvent } from '@codekeep/server';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { CombatView } from './components/CombatView.js';
import { CardReward } from './components/CardReward.js';
import { DeckView } from './components/DeckView.js';
import { MapView } from './components/MapView.js';
import { ShopView } from './components/ShopView.js';
import { EventView } from './components/EventView.js';
import { RestView } from './components/RestView.js';
import { KeepView } from './components/KeepView.js';
import { useCombatState } from './hooks/useCombatState.js';

const MIN_COLS = 60;
const MIN_ROWS = 18;

function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout?.columns ?? process.stdout.columns ?? 80,
    rows: stdout?.rows ?? process.stdout.rows ?? 24,
  });
  useEffect(() => {
    const target = stdout ?? process.stdout;
    const onResize = () => setSize({ columns: target.columns, rows: target.rows });
    target.on('resize', onResize);
    return () => { target.off('resize', onResize); };
  }, [stdout]);
  return size;
}

export interface AppProps {
  asciiMode: boolean;
  compact: boolean;
  forceTutorial: boolean;
  dryRun?: boolean;
}

type Screen = 'menu' | 'keep' | 'map' | 'combat' | 'reward' | 'deck' | 'deck_remove' | 'shop' | 'shop_remove' | 'event' | 'rest' | 'result';

function AppContent({ dryRun }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [screen, setScreen] = useState<Screen>('menu');
  const [menuIndex, setMenuIndex] = useState(0);

  // Run state
  const [run, setRun] = useState<RunState | null>(null);
  const [selectedNodeIdx, setSelectedNodeIdx] = useState(0);

  // Reward state
  const [rewardCards, setRewardCards] = useState<CardDef[]>([]);
  const [rewardIndex, setRewardIndex] = useState(0);

  // Shop state
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopIndex, setShopIndex] = useState(0);

  // Event state
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [eventChoice, setEventChoice] = useState(0);

  // Rest state
  const [restChoice, setRestChoice] = useState(0);

  // Keep state
  const [keep, setKeep] = useState<KeepState | null>(null);
  const [keepIndex, setKeepIndex] = useState(0);
  const [keepMessage, setKeepMessage] = useState('');
  const [runWon, setRunWon] = useState(false);

  // Deck remove state
  const [removeIndex, setRemoveIndex] = useState(0);

  // Combat
  const combatHook = useCombatState();
  const { combat, selectedCard, targetColumn, message, emplaceMode, selectCard, selectTarget, confirmPlay, endTurn, toggleEmplace, startCombat, applyPotion: _applyPotion, needsTarget } = combatHook;

  // Inspect mode
  const [inspectMode, setInspectMode] = useState(false);
  const [inspectCol, setInspectCol] = useState(0);
  const [inspectEnemy, setInspectEnemy] = useState(0);

  // Tutorial
  const isFirstRun = (() => {
    const save = loadGame();
    return !save || save.keep.totalRuns <= 1;
  })();

  const storyLayer = (() => {
    const save = loadGame();
    return save ? getCurrentStoryLayer(save.keep.totalRuns, save.keep.highestAscension) : 'surface';
  })();

  const tooSmall = columns < MIN_COLS || rows < MIN_ROWS;

  // Persistence
  const ensureSave = useCallback((): GameSave => {
    let save = loadGame();
    if (!save) {
      save = createNewGameSave('Warden');
      if (save.keep.npcs.length === 0) {
        save.keep.npcs = createDefaultNpcs();
      }
      saveGame(save);
    }
    if (save.keep.npcs.length === 0) {
      save.keep.npcs = createDefaultNpcs();
    }
    return save;
  }, []);

  const doSave = useCallback((r: RunState | null) => {
    if (dryRun) return;
    const save = ensureSave();
    save.activeRun = r;
    if (keep) save.keep = keep;
    saveGame(save);
  }, [dryRun, keep, ensureSave]);

  const beginRun = useCallback(() => {
    const seedStr = `run-${Date.now()}`;
    const save = ensureSave();
    const r = createRun(seedStr, save.keep.highestAscension);
    setRun(r);
    setSelectedNodeIdx(0);
    save.activeRun = r;
    save.keep.totalRuns++;
    setKeep(save.keep);
    saveGame(save);
    setScreen('map');
  }, [ensureSave]);

  const resumeRun = useCallback(() => {
    const save = loadGame();
    if (save?.activeRun) {
      setRun(save.activeRun);
      setKeep(save.keep);
      setSelectedNodeIdx(0);
      setScreen('map');
    }
  }, []);

  const goToKeep = useCallback(() => {
    const save = ensureSave();
    setKeep(save.keep);
    setKeepIndex(0);
    setKeepMessage('');
    setScreen('keep');
  }, [ensureSave]);

  const getReachable = useCallback((): MapNode[] => {
    if (!run) return [];
    return getReachableNodes(run.map, run.currentNodeId);
  }, [run]);

  const enterNode = useCallback((node: MapNode) => {
    if (!run) return;
    let r = visitNode(run, node.id);

    if (node.type === 'combat' || node.type === 'elite') {
      const seed = hashSeed(run.seed + node.id);
      const rng = mulberry32(seed);
      const encounter = pickEncounter(run.act, rng, node.type === 'elite');
      startCombat(r.deck, seed, r.gateHp, r.gateMaxHp, encounter.enemies);
      setRun(r);
      setScreen('combat');
    } else if (node.type === 'boss') {
      const seed = hashSeed(run.seed + '-boss-' + run.act);
      const wave = getBossWave(run.act);
      startCombat(r.deck, seed, r.gateHp, r.gateMaxHp, wave);
      setRun(r);
      setScreen('combat');
    } else if (node.type === 'shop') {
      const rng = mulberry32(hashSeed(run.seed + node.id));
      setShopItems(generateShop(rng));
      setShopIndex(0);
      setRun(r);
      setScreen('shop');
    } else if (node.type === 'event') {
      const rng = mulberry32(hashSeed(run.seed + node.id));
      setCurrentEvent(pickEvent(run.act, rng, storyLayer));
      setEventChoice(0);
      setRun(r);
      setScreen('event');
    } else if (node.type === 'rest') {
      setRestChoice(0);
      setRun(r);
      setScreen('rest');
    }
    doSave(r);
  }, [run, startCombat, doSave]);

  const finishRun = useCallback((r: RunState, won: boolean) => {
    setRunWon(won);
    setRun(r);
    const save = ensureSave();
    const echoes = calculateEchoReward(won, r.act, r.ascensionLevel);
    save.keep.echoes += echoes;
    if (won) {
      save.keep.totalWins++;
      if (r.ascensionLevel >= save.keep.highestAscension) {
        save.keep.highestAscension = r.ascensionLevel + 1;
      }
    }
    save.activeRun = null;
    setKeep(save.keep);
    saveGame(save);
    setScreen('result');
  }, [ensureSave]);

  const afterCombat = useCallback(() => {
    if (!combat || !run) return;
    let r = { ...run, gateHp: combat.gateHp };

    if (combat.outcome === 'lose') {
      finishRun(r, false);
      return;
    }

    const currentNode = run.currentNodeId ? getNodeById(run.map, run.currentNodeId) : null;
    const fragReward = currentNode?.type === 'elite' ? FRAGMENT_REWARDS.elite
      : currentNode?.type === 'boss' ? FRAGMENT_REWARDS.boss
      : FRAGMENT_REWARDS.combat;
    r = gainFragments(r, fragReward);

    if (currentNode?.type === 'boss') {
      if (run.act < 3) {
        r = advanceAct(r);
        setRun(r);
        doSave(r);
        setSelectedNodeIdx(0);
        setScreen('map');
      } else {
        finishRun(r, true);
      }
      return;
    }

    const rng = mulberry32(hashSeed(run.seed + (run.currentNodeId ?? '') + '-reward'));
    setRewardCards(generateCardRewards(rng));
    setRewardIndex(0);
    setRun(r);
    doSave(r);
    setScreen('reward');
  }, [combat, run, doSave, finishRun]);

  const pickReward = useCallback((cardDef: CardDef | null) => {
    if (!run) return;
    let r = run;
    if (cardDef) {
      r = addCardToRunDeck(r, makeCardInstance(cardDef.id));
    }
    setRun(r);
    doSave(r);
    setSelectedNodeIdx(0);
    setScreen('map');
  }, [run, doSave]);

  const menuItems = [
    { label: 'The Keep', action: 'keep' },
    { label: 'New Run', action: 'new' },
    ...(loadGame()?.activeRun ? [{ label: 'Resume Run', action: 'resume' }] : []),
    { label: 'Quit', action: 'quit' },
  ];

  useInput((input, key) => {
    if (screen === 'menu') {
      if (key.upArrow || input === 'k') setMenuIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setMenuIndex((i) => Math.min(menuItems.length - 1, i + 1));
      else if (key.return) {
        const action = menuItems[menuIndex]?.action;
        if (action === 'keep') goToKeep();
        else if (action === 'new') beginRun();
        else if (action === 'resume') resumeRun();
        else exit();
      }
      else if (input === 'q') exit();
      return;
    }

    if (screen === 'deck') {
      if (input === 'q' || key.escape) setScreen('map');
      return;
    }

    if (screen === 'map' && run) {
      const reachable = getReachable();
      if (key.upArrow || input === 'k') setSelectedNodeIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setSelectedNodeIdx((i) => Math.min(reachable.length - 1, i + 1));
      else if (key.return && reachable[selectedNodeIdx]) enterNode(reachable[selectedNodeIdx]);
      else if (input === 'd') setScreen('deck');
      else if (input === 'q') { doSave(run); setScreen('menu'); }
      return;
    }

    if (screen === 'reward') {
      const maxIdx = rewardCards.length;
      if (key.upArrow || input === 'k') setRewardIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setRewardIndex((i) => Math.min(maxIdx, i + 1));
      else if (input === 's') pickReward(null);
      else if (key.return) {
        pickReward(rewardIndex < rewardCards.length ? rewardCards[rewardIndex] : null);
      }
      return;
    }

    if (screen === 'shop' && run) {
      if (key.upArrow || input === 'k') setShopIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setShopIndex((i) => Math.min(shopItems.length - 1, i + 1));
      else if (input === 'q' || key.escape) {
        setSelectedNodeIdx(0);
        setScreen('map');
      }
      else if (key.return) {
        const item = shopItems[shopIndex];
        if (item && run.fragments >= item.cost) {
          let r = spendFragments(run, item.cost);
          if (!r) return;
          if (item.type === 'card' && item.cardDef) {
            r = addCardToRunDeck(r, makeCardInstance(item.cardDef.id));
            setRun(r);
            doSave(r);
            setShopItems((items) => items.filter((_, i) => i !== shopIndex));
            setShopIndex(0);
          } else if (item.type === 'potion' && item.potionDef) {
            const result = addPotion(r, item.potionDef.id);
            if (result) r = result;
            setRun(r);
            doSave(r);
            setShopItems((items) => items.filter((_, i) => i !== shopIndex));
            setShopIndex(0);
          } else if (item.type === 'card_remove') {
            setRun(r);
            doSave(r);
            setRemoveIndex(0);
            setShopItems((items) => items.filter((_, i) => i !== shopIndex));
            setScreen('shop_remove');
          }
        }
      }
      return;
    }

    if (screen === 'event' && currentEvent && run) {
      if (key.upArrow || input === 'k') setEventChoice((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setEventChoice((i) => Math.min(currentEvent.choices.length - 1, i + 1));
      else if (key.return) {
        const choice = currentEvent.choices[eventChoice];
        let r = run;
        switch (choice.effect.type) {
          case 'heal': r = healGate(r, choice.effect.value); break;
          case 'damage': {
            r = { ...r, gateHp: Math.max(1, r.gateHp - choice.effect.value) };
            const fragMatch = choice.label.match(/(\d+)\s*fragments/i);
            if (fragMatch) r = gainFragments(r, parseInt(fragMatch[1]));
            break;
          }
          case 'fragments': r = gainFragments(r, choice.effect.value); break;
          case 'max_hp': r = { ...r, gateMaxHp: r.gateMaxHp + choice.effect.value, gateHp: r.gateHp + choice.effect.value }; break;
          case 'card_reward': {
            const hpMatch = choice.label.match(/lose\s+(\d+)\s*hp/i);
            if (hpMatch) r = { ...r, gateHp: Math.max(1, r.gateHp - parseInt(hpMatch[1])) };
            const evtRng = mulberry32(hashSeed(run.seed + (currentEvent?.id ?? '')));
            setRewardCards(generateCardRewards(evtRng));
            setRewardIndex(0);
            setRun(r);
            doSave(r);
            setScreen('reward');
            return;
          }
          case 'remove_card': {
            setRun(r);
            doSave(r);
            setScreen('deck_remove');
            return;
          }
          case 'nothing': break;
        }
        setRun(r);
        doSave(r);
        setSelectedNodeIdx(0);
        setScreen('map');
      }
      return;
    }

    if (screen === 'rest' && run) {
      if (key.upArrow || input === 'k') setRestChoice((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setRestChoice((i) => Math.min(2, i + 1));
      else if (key.return) {
        let r = run;
        if (restChoice === 0) {
          r = healGate(r, Math.floor(r.gateMaxHp * 0.3));
          setRun(r);
          doSave(r);
          setSelectedNodeIdx(0);
          setScreen('map');
        } else if (restChoice === 1 && r.deck.length > 5) {
          setRun(r);
          setRemoveIndex(0);
          setScreen('deck_remove');
        } else {
          setRun(r);
          doSave(r);
          setSelectedNodeIdx(0);
          setScreen('map');
        }
      }
      return;
    }

    if (screen === 'deck_remove' && run) {
      if (key.upArrow || input === 'k') setRemoveIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setRemoveIndex((i) => Math.min(run.deck.length - 1, i + 1));
      else if (key.escape || input === 'q') {
        setSelectedNodeIdx(0);
        setScreen('map');
      }
      else if (key.return && run.deck.length > 5) {
        const card = run.deck[removeIndex];
        if (card) {
          const r = removeCardFromRunDeck(run, card.instanceId);
          setRun(r);
          doSave(r);
        }
        setSelectedNodeIdx(0);
        setScreen('map');
      }
      return;
    }

    if (screen === 'shop_remove' && run) {
      if (key.upArrow || input === 'k') setRemoveIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setRemoveIndex((i) => Math.min(run.deck.length - 1, i + 1));
      else if (key.escape || input === 'q') setScreen('shop');
      else if (key.return && run.deck.length > 5) {
        const card = run.deck[removeIndex];
        if (card) {
          const r = removeCardFromRunDeck(run, card.instanceId);
          setRun(r);
          doSave(r);
        }
        setScreen('shop');
      }
      return;
    }

    if (screen === 'keep' && keep) {
      const totalItems = KEEP_STRUCTURES.length + keep.npcs.length + 2;
      if (key.upArrow || input === 'k') setKeepIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setKeepIndex((i) => Math.min(totalItems - 1, i + 1));
      else if (input === 'q') setScreen('menu');
      else if (key.return) {
        if (keepIndex < KEEP_STRUCTURES.length) {
          const struct = KEEP_STRUCTURES[keepIndex];
          const result = upgradeStructure(keep, struct.id);
          if (result) {
            setKeep(result);
            const save = ensureSave();
            save.keep = result;
            saveGame(save);
            setKeepMessage(`Upgraded ${struct.name}!`);
          } else {
            const level = getStructureLevel(keep, struct.id);
            if (level >= struct.maxLevel) setKeepMessage(`${struct.name} is already max level.`);
            else setKeepMessage(`Not enough Echoes to upgrade ${struct.name}.`);
          }
        } else if (keepIndex < KEEP_STRUCTURES.length + keep.npcs.length) {
          const npcIdx = keepIndex - KEEP_STRUCTURES.length;
          const npc = keep.npcs[npcIdx];
          const dialogue = getNextDialogue(npc.id, keep);
          if (dialogue) {
            const newKeep = markDialogueSeen(keep, npc.id, dialogue.dialogueId);
            setKeep(newKeep);
            const save = ensureSave();
            save.keep = newKeep;
            saveGame(save);
            setKeepMessage(`${dialogue.speaker}: "${dialogue.text}"`);
          } else {
            setKeepMessage('(No new dialogue)');
          }
        } else if (keepIndex === KEEP_STRUCTURES.length + keep.npcs.length) {
          beginRun();
        }
      }
      return;
    }

    if (screen === 'result') {
      if (key.return || input === ' ') goToKeep();
      else if (input === 'q') setScreen('menu');
      return;
    }

    if (screen === 'combat' && combat) {
      if (combat.outcome !== 'undecided') {
        if (key.return || input === ' ') afterCombat();
        return;
      }
      if (input === 'i') {
        if (inspectMode) {
          setInspectMode(false);
        } else {
          setInspectMode(true);
          setInspectCol(0);
          setInspectEnemy(0);
        }
        return;
      }
      if (inspectMode) {
        if (key.leftArrow || input === 'h') setInspectCol(c => Math.max(0, c - 1));
        else if (key.rightArrow || input === 'l') setInspectCol(c => Math.min(4, c + 1));
        else if (key.upArrow || input === 'k') setInspectEnemy(e => Math.max(0, e - 1));
        else if (key.downArrow || input === 'j') {
          const maxE = (combat.columns[inspectCol]?.enemies.length ?? 1) - 1;
          setInspectEnemy(e => Math.min(Math.max(0, maxE), e + 1));
        }
        else if (key.escape) setInspectMode(false);
        return;
      }
      if (input === 'q') { setScreen('menu'); return; }
      if (input === 'd' && run) { setScreen('deck'); return; }
      if (input === 'e') { toggleEmplace(); return; }
      if (input === 'p' && run) {
        const slotIdx = run.potions.findIndex((p) => p !== null);
        if (slotIdx >= 0) {
          const result = usePotion(run, slotIdx);
          if (result && combatHook.combat) {
            const potDef = POTION_DEFS.find((p) => p.id === result.potionId);
            setRun(result.run);
            doSave(result.run);
            combatHook.applyPotion(potDef ?? null);
          }
        }
        return;
      }
      if (input >= '1' && input <= '9') { selectCard(parseInt(input) - 1); return; }
      if (key.leftArrow || input === 'h') { selectTarget(Math.max(0, targetColumn - 1)); return; }
      if (key.rightArrow || input === 'l') { selectTarget(Math.min(4, targetColumn + 1)); return; }
      if (key.return && selectedCard >= 0) { confirmPlay(); return; }
      if (input === ' ') { endTurn(); return; }
      if (key.escape) { selectCard(-1); return; }
    }
  });

  if (tooSmall) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
        <Text color="red">Terminal too small ({columns}x{rows}, need {MIN_COLS}x{MIN_ROWS})</Text>
      </Box>
    );
  }

  if (screen === 'menu') {
    const flavorText = storyLayer === 'true_ending'
      ? ['The fortress. The Pale. You can no longer tell which side you\'re on.']
      : storyLayer === 'truth'
      ? ['The fortress stands. The Pale stands. The line between them blurs.']
      : storyLayer === 'cracks'
      ? ['The fortress stands at the edge of the Pale.', 'You\'ve stood here before. You\'re sure of it.']
      : ['The fortress stands at the edge of the Pale.', 'Beyond the walls, something stirs.'];

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
        <Text> </Text>
        {flavorText.map((line, i) => <Text key={i}>{line}</Text>)}
        <Text> </Text>
        {menuItems.map((item, i) => (
          <Text key={item.action} bold={i === menuIndex} color={i === menuIndex ? 'yellow' : undefined}>
            {i === menuIndex ? '▶ ' : '  '}{item.label}
          </Text>
        ))}
        <Text> </Text>
        <Text dimColor>↑↓ navigate  Enter select  q quit</Text>
      </Box>
    );
  }

  if (screen === 'deck' && run) {
    return <DeckView deck={run.deck} />;
  }

  if (screen === 'keep' && keep) {
    return (
      <Box flexDirection="column">
        <KeepView keep={keep} selectedIndex={keepIndex} />
        {keepMessage && <Text color="cyan" bold>  {keepMessage}</Text>}
      </Box>
    );
  }

  if ((screen === 'deck_remove' || screen === 'shop_remove') && run) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">◆ Remove a Card</Text>
        <Text dimColor>Choose a card to remove from your deck ({run.deck.length} cards).</Text>
        <Text> </Text>
        {run.deck.map((card, i) => {
          const def = getCardDef(card.defId);
          const isSelected = i === removeIndex;
          return (
            <Text key={card.instanceId} bold={isSelected} color={isSelected ? 'yellow' : 'white'}>
              {isSelected ? '▶ ' : '  '}{def?.name ?? card.defId} ({def?.rarity}) — {def?.description ?? ''}
            </Text>
          );
        })}
        <Text> </Text>
        <Text dimColor>↑↓ navigate  Enter remove  Esc cancel</Text>
      </Box>
    );
  }

  if (screen === 'map' && run) {
    const reachable = getReachable();
    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between" paddingX={1}>
          <Text>Gate <Text bold color={run.gateHp > 40 ? 'green' : run.gateHp > 20 ? 'yellow' : 'red'}>{run.gateHp}/{run.gateMaxHp}</Text></Text>
          <Text>Fragments <Text bold color="yellow">{run.fragments}</Text></Text>
          <Text>Deck <Text dimColor>{run.deck.length}</Text></Text>
        </Box>
        {isFirstRun && !run.currentNodeId && (
          <Text color="green" bold>  TIP: ⚔=combat ★=elite(harder, more reward) △=rest $=shop ?=event ◆=boss. ↑↓ select, Enter to go.</Text>
        )}
        <MapView
          map={run.map}
          currentNodeId={run.currentNodeId}
          reachableIds={reachable.map((n) => n.id)}
          selectedNodeId={reachable[selectedNodeIdx]?.id ?? null}
        />
      </Box>
    );
  }

  if (screen === 'reward') {
    return <CardReward cards={rewardCards} selectedIndex={rewardIndex} />;
  }

  if (screen === 'shop' && run) {
    return <ShopView items={shopItems} selectedIndex={shopIndex} fragments={run.fragments} />;
  }

  if (screen === 'event' && currentEvent) {
    return <EventView event={currentEvent} selectedChoice={eventChoice} />;
  }

  if (screen === 'rest' && run) {
    return <RestView gateHp={run.gateHp} gateMaxHp={run.gateMaxHp} selectedChoice={restChoice} deckSize={run.deck.length} />;
  }

  if (screen === 'result') {
    const echoReward = run ? calculateEchoReward(runWon, run.act, run.ascensionLevel) : 0;
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
        <Text> </Text>
        {runWon ? (
          <>
            <Text bold color="green">{'★ RUN COMPLETE'}</Text>
            <Text>The Pale recedes. The Keep endures.</Text>
          </>
        ) : (
          <>
            <Text bold color="red">{'✗ DEFEAT'}</Text>
            <Text>The Gate has fallen. The Pale consumes all.</Text>
          </>
        )}
        {run && (
          <>
            <Text dimColor>Act {run.act} | Deck: {run.deck.length} cards | Fragments: {run.fragments}</Text>
            <Text>Echoes earned: <Text bold color="cyan">+{echoReward}</Text></Text>
          </>
        )}
        <Text> </Text>
        <Text dimColor>Enter → The Keep  |  q → menu</Text>
      </Box>
    );
  }

  if (screen === 'combat' && combat && run) {
    const tutorialHint = isFirstRun && combat.turn <= 3 ? (
      combat.turn === 1 && selectedCard < 0
        ? 'TIP: Press 1-5 to select a card. ←→ to target a column. Enter to play. Space to end turn.'
        : combat.turn === 1 && selectedCard >= 0
        ? 'TIP: Arrow keys choose which column to target. Press Enter to play the card.'
        : combat.turn === 2
        ? 'TIP: Enemies with ⚔ will attack your Gate. ↓ means they advance. Block reduces damage. Press i to inspect enemies.'
        : combat.turn === 3
        ? 'TIP: Cards with type "emplace" can become structures! Select one, press e to toggle emplace mode, then Enter.'
        : null
    ) : null;
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>Act {run.act}  |  Gate {run.gateHp}/{run.gateMaxHp}  |  Fragments {run.fragments}  |  d=deck  i=inspect</Text>
        {tutorialHint && <Text color="green" bold>{tutorialHint}</Text>}
        <CombatView
          combat={combat}
          selectedCard={selectedCard}
          targetColumn={targetColumn}
          needsTarget={needsTarget}
          message={message}
        />
        {inspectMode && (() => {
          const col = combat.columns[inspectCol];
          const enemy = col?.enemies[inspectEnemy];
          if (!enemy) return <Text dimColor>No enemy in column {inspectCol + 1}. ←→ to navigate.</Text>;
          const tmpl = getEnemyTemplate(enemy.templateId);
          return (
            <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
              <Text bold color="cyan">Inspecting: {tmpl?.name ?? enemy.templateId} (Col {inspectCol + 1})</Text>
              <Text>HP: {enemy.hp}/{enemy.maxHp}  Row: {enemy.row}</Text>
              <Text dimColor>{tmpl?.description ?? ''}</Text>
              {enemy.statusEffects.length > 0 && (
                <Text>Status: {enemy.statusEffects.map(s => `${s.type}(${s.stacks}x, ${s.duration}t)`).join(', ')}</Text>
              )}
              <Text>Intent: {enemy.intent ? `${enemy.intent.type} ${enemy.intent.value}` : 'unknown'}</Text>
              <Text dimColor>←→ column  ↑↓ enemy  i/Esc close</Text>
            </Box>
          );
        })()}
      </Box>
    );
  }

  return <Text>Loading...</Text>;
}

export function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <AppContent {...props} />
    </ErrorBoundary>
  );
}
