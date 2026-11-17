import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { setTimeout as delay } from 'node:timers/promises';
import { App } from '../src/app.js';
import { useCombatState } from '../src/hooks/useCombatState.js';
import { CombatView } from '../src/components/CombatView.js';
import { makeCardInstance } from '@codekeep/server';
import { Box, Text, useInput } from 'ink';
import { getCardDef } from '@codekeep/shared';
function CombatHarness({
  onReady,
}: {
  onReady?: (hook: ReturnType<typeof useCombatState>) => void;
}) {
  const hook = useCombatState(true);
  const [confirmEndTurn, setConfirmEndTurn] = React.useState(false);
  React.useEffect(() => {
    if (!hook.combat) {
      const deck = Array.from({ length: 10 }, () => makeCardInstance('strike'));
      hook.startCombat(deck, 1, 999, 999, [{ templateId: 'boss_pale', column: 2 }]);
    }
  }, []);

  React.useEffect(() => {
    if (hook.combat && onReady) onReady(hook);
  });

  useInput((input, key) => {
    if (!hook.combat) return;
    if (hook.combat.outcome !== 'undecided') {
      if (key.return || input === ' ') setConfirmEndTurn(false);
      return;
    }
    if (input >= '1' && input <= '9') {
      setConfirmEndTurn(false);
      hook.selectCard(parseInt(input, 10) - 1);
      return;
    }
    if (key.return && hook.selectedCard >= 0) {
      setConfirmEndTurn(false);
      hook.confirmPlay();
      return;
    }
    if (input === ' ') {
      const hasPlayableCard = hook.combat.hand.some((c) => {
        const d = getCardDef(c.defId);
        return d && (hook.isFirstCardFree ? 0 : d.cost) <= hook.combat!.resolve;
      });
      if (hook.combat.resolve > 0 && hasPlayableCard && !confirmEndTurn) {
        setConfirmEndTurn(true);
        return;
      }
      setConfirmEndTurn(false);
      hook.endTurn();
    }
  });

  if (!hook.combat) return <Text>Loading</Text>;
  return (
    <Box flexDirection="column">
      <CombatView
        combat={hook.combat}
        selectedCard={hook.selectedCard}
        targetColumn={hook.targetColumn}
        needsTarget={hook.needsTarget}
        emplaceMode={hook.emplaceMode}
        firstCardFree={hook.isFirstCardFree}
        message={
          confirmEndTurn
            ? `End turn with ${hook.combat.resolve} Resolve remaining? (carries over) Press Space again to confirm.`
            : hook.message
        }
        animating={hook.animating}
      />
    </Box>
  );
}

const TICK_MS = 25;
describe('App', () => {
  it('renders without crashing', () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('The Pale');
  });

  it('shows game title', () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('The Pale');
  });

  it('stays in sync past 100 combat events and grants victory on final kill', async () => {
    let latestHook: ReturnType<typeof useCombatState> | null = null;
    const { stdin, lastFrame, unmount } = render(
      <CombatHarness onReady={(h) => { latestHook = h; }} />,
    );
    for (let i = 0; i < 40 && !latestHook?.combat; i++) {
      await delay(TICK_MS);
    }
    expect(latestHook?.combat).toBeTruthy();

    for (let turn = 0; turn < 14; turn++) {
      latestHook!.combat!.gateHp = 999;
      for (const col of latestHook!.combat!.columns) {
        for (const e of col.enemies) e.hp = 999;
      }
      while (latestHook!.combat!.resolve > 0 && latestHook!.combat!.hand.length > 0) {
        stdin.write('1');
        await delay(TICK_MS);
        stdin.write('\r');
        await delay(TICK_MS);
        expect(lastFrame()).not.toContain('Not enough Resolve');
      }
      // Space twice if carry-over confirmation prompts
      stdin.write(' ');
      await delay(TICK_MS);
      if (lastFrame()!.includes('Press Space again')) {
        stdin.write(' ');
        await delay(TICK_MS);
      }
    }

    expect(latestHook!.combat!.events.length).toBeGreaterThan(100);

    // Play 1 card on a >100-event turn, press Spacebar to confirm carry-over
    const resolveStart = latestHook!.combat!.resolve;
    stdin.write('1');
    await delay(TICK_MS);
    stdin.write('\r');
    await delay(TICK_MS);
    expect(lastFrame()).toContain(`${resolveStart - 1} Resolve left.`);
    expect(lastFrame()).not.toContain('Not enough Resolve');
    stdin.write(' ');
    await delay(TICK_MS);
    expect(lastFrame()).toContain(`End turn with ${resolveStart - 1} Resolve remaining?`);
    stdin.write(' ');
    await delay(TICK_MS);
    const boss = latestHook!.combat!.columns[2].enemies[0];
    boss.hp = 1;
    latestHook!.combat!.columns.forEach((c, idx) => {
      c.enemies = idx === 2 ? [boss] : [];
    });
    latestHook!.selectTarget(2);
    await delay(TICK_MS);
    stdin.write('1');
    await delay(TICK_MS);
    stdin.write('\r');
    await delay(TICK_MS);

    const frame = lastFrame()!;
    expect(frame).not.toContain('Not enough Resolve');
    expect(frame).toContain('VICTORY');
    expect(latestHook!.combat!.outcome).toBe('win');
    expect(latestHook!.combat!.phase).toBe('ended');
    unmount();
  });

  it('marks victory when a damage potion kills the last enemy', async () => {
    let latestHook: ReturnType<typeof useCombatState> | null = null;
    const { lastFrame, unmount } = render(
      <CombatHarness onReady={(h) => { latestHook = h; }} />,
    );
    for (let i = 0; i < 40 && !latestHook?.combat; i++) {
      await delay(TICK_MS);
    }
    expect(latestHook?.combat).toBeTruthy();

    const boss = latestHook!.combat!.columns[2].enemies[0];
    boss.hp = 5;
    latestHook!.combat!.columns.forEach((c, idx) => {
      c.enemies = idx === 2 ? [boss] : [];
    });
    latestHook!.selectTarget(2);
    await delay(TICK_MS);
    latestHook!.applyPotion({
      id: 'damage_potion',
      name: 'Fire Flask',
      description: 'Deal 10 damage to all enemies in a column.',
      effects: [{ type: 'damage', value: 10, target: 'column' }],
    });
    await delay(TICK_MS);

    const frame = lastFrame()!;
    expect(frame).toContain('VICTORY');
    expect(latestHook!.combat!.outcome).toBe('win');
    expect(latestHook!.combat!.phase).toBe('ended');
    unmount();
  });
  it('selects and plays first card via Siege Engine even after >100 events', async () => {
    let latestHook: ReturnType<typeof useCombatState> | null = null;
    const { stdin, lastFrame, unmount } = render(
      <CombatHarness onReady={(h) => { latestHook = h; }} />,
    );
    for (let i = 0; i < 40 && !latestHook?.combat; i++) {
      await delay(TICK_MS);
    }
    expect(latestHook?.combat).toBeTruthy();

    // Advance into turn 2 cleanly, then push >100 events in turn 2 after playing first card
    stdin.write(' ');
    await delay(TICK_MS);
    if (lastFrame()!.includes('Press Space again')) {
      stdin.write(' ');
      await delay(TICK_MS);
    }
    expect(latestHook!.combat!.turn).toBe(2);

    latestHook!.combat!.relics.push('siege_engine');
    latestHook!.selectTarget(2);
    await delay(TICK_MS);
    // Play first card of turn 2 (free via Siege Engine)
    stdin.write('1');
    await delay(TICK_MS);
    stdin.write('\r');
    await delay(TICK_MS);
    const resolveAfterFirst = latestHook!.combat!.resolve;

    // Push >100 events in turn 2 without dropping card_played for turn 2
    for (let i = 0; i < 110; i++) {
      latestHook!.combat!.events.push({ type: 'damage_dealt', turn: 2, data: { damage: 1 } });
    }
    stdin.write('1');
    await delay(TICK_MS);
    stdin.write('\r');
    await delay(TICK_MS);
    expect(lastFrame()).toContain(`${resolveAfterFirst - 1} Resolve left.`);
    expect(latestHook!.combat!.resolve).toBe(resolveAfterFirst - 1);
    expect(lastFrame()).not.toContain('Not enough Resolve');
    unmount();
  });
});
