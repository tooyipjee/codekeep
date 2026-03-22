import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { CardDef, CardInstance, RunState, MapNode, CombatState } from '@codekeep/shared';
import { getCardDef, STARTING_GATE_HP, FRAGMENT_REWARDS } from '@codekeep/shared';
import {
  createStarterDeck, makeCardInstance, generateCardRewards, pickEncounter,
  mulberry32, hashSeed, createCombatState, playCard, endPlayerTurn,
  createRun, visitNode, healGate, gainFragments, spendFragments, addCardToRunDeck, addPotion,
  removeCardFromRunDeck, advanceAct,
  generateActMap, getReachableNodes, getNodeById,
  generateShop, pickEvent, getBossWave,
  saveGame, loadGame, createNewGameSave,
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

type Screen = 'menu' | 'map' | 'combat' | 'reward' | 'deck' | 'shop' | 'event' | 'rest' | 'result';

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

  // Combat
  const combatHook = useCombatState();
  const { combat, selectedCard, targetColumn, message, emplaceMode, selectCard, selectTarget, confirmPlay, endTurn, toggleEmplace, startCombat, needsTarget } = combatHook;

  const tooSmall = columns < MIN_COLS || rows < MIN_ROWS;

  // Persistence
  const doSave = useCallback((r: RunState | null) => {
    if (dryRun) return;
    let save = loadGame();
    if (!save) save = createNewGameSave('Warden');
    save.activeRun = r;
    saveGame(save);
  }, [dryRun]);

  const beginRun = useCallback(() => {
    const seedStr = `run-${Date.now()}`;
    const r = createRun(seedStr);
    setRun(r);
    setSelectedNodeIdx(0);
    doSave(r);
    setScreen('map');
  }, [doSave]);

  const resumeRun = useCallback(() => {
    const save = loadGame();
    if (save?.activeRun) {
      setRun(save.activeRun);
      setSelectedNodeIdx(0);
      setScreen('map');
    }
  }, []);

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
      setCurrentEvent(pickEvent(run.act, rng));
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

  const afterCombat = useCallback(() => {
    if (!combat || !run) return;
    let r = { ...run, gateHp: combat.gateHp };

    if (combat.outcome === 'lose') {
      r = { ...r, combat: null };
      setRun(r);
      doSave(null);
      setScreen('result');
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
        setRun(r);
        doSave(null);
        setScreen('result');
      }
      return;
    }

    const rng = mulberry32(hashSeed(run.seed + (run.currentNodeId ?? '') + '-reward'));
    setRewardCards(generateCardRewards(rng));
    setRewardIndex(0);
    setRun(r);
    doSave(r);
    setScreen('reward');
  }, [combat, run, doSave]);

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
        if (action === 'new') beginRun();
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
          } else if (item.type === 'potion' && item.potionDef) {
            const result = addPotion(r, item.potionDef.id);
            if (result) r = result;
          }
          setRun(r);
          doSave(r);
          setShopItems((items) => items.filter((_, i) => i !== shopIndex));
          setShopIndex(0);
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
          case 'damage': r = { ...r, gateHp: Math.max(1, r.gateHp - choice.effect.value) }; break;
          case 'fragments': r = gainFragments(r, choice.effect.value); break;
          case 'max_hp': r = { ...r, gateMaxHp: r.gateMaxHp + choice.effect.value }; break;
          case 'card_reward': {
            const rng = mulberry32(hashSeed(run.seed + (currentEvent?.id ?? '')));
            setRewardCards(generateCardRewards(rng));
            setRewardIndex(0);
            setRun(r);
            doSave(r);
            setScreen('reward');
            return;
          }
          case 'remove_card': {
            if (r.deck.length > 5) {
              const removeIdx = Math.floor(Math.random() * r.deck.length);
              r = removeCardFromRunDeck(r, r.deck[removeIdx].instanceId);
            }
            break;
          }
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
      else if (key.downArrow || input === 'j') setRestChoice((i) => Math.min(1, i + 1));
      else if (key.return) {
        let r = run;
        if (restChoice === 0) {
          r = healGate(r, Math.floor(r.gateMaxHp * 0.3));
        }
        setRun(r);
        doSave(r);
        setSelectedNodeIdx(0);
        setScreen('map');
      }
      return;
    }

    if (screen === 'result') {
      if (key.return || input === ' ' || input === 'q') setScreen('menu');
      return;
    }

    if (screen === 'combat' && combat) {
      if (combat.outcome !== 'undecided') {
        if (key.return || input === ' ') afterCombat();
        return;
      }
      if (input === 'q') { setScreen('menu'); return; }
      if (input === 'd' && run) { setScreen('deck'); return; }
      if (input === 'e') { toggleEmplace(); return; }
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
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
        <Text> </Text>
        <Text>The fortress stands at the edge of the Pale.</Text>
        <Text>Beyond the walls, something stirs.</Text>
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

  if (screen === 'map' && run) {
    const reachable = getReachable();
    return (
      <Box flexDirection="column">
        <Box justifyContent="space-between" paddingX={1}>
          <Text>Gate <Text bold color={run.gateHp > 40 ? 'green' : run.gateHp > 20 ? 'yellow' : 'red'}>{run.gateHp}/{run.gateMaxHp}</Text></Text>
          <Text>Fragments <Text bold color="yellow">{run.fragments}</Text></Text>
          <Text>Deck <Text dimColor>{run.deck.length}</Text></Text>
        </Box>
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
    const won = combat?.outcome === 'win' || (run && run.act >= 3);
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
        <Text> </Text>
        {won ? (
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
          <Text dimColor>Act {run.act} | Deck: {run.deck.length} cards | Fragments: {run.fragments}</Text>
        )}
        <Text> </Text>
        <Text dimColor>Press Enter to return to menu.</Text>
      </Box>
    );
  }

  if (screen === 'combat' && combat && run) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>Act {run.act}  |  Gate {run.gateHp}/{run.gateMaxHp}  |  Fragments {run.fragments}  |  d=deck</Text>
        <CombatView
          combat={combat}
          selectedCard={selectedCard}
          targetColumn={targetColumn}
          needsTarget={needsTarget}
          message={message}
        />
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
