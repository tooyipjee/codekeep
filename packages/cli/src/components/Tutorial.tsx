import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameSave, GridCoord, PlacedStructure, RaidTickEvent } from '@codekeep/shared';
import {
  GRID_SIZE,
  STRUCTURE_SYMBOLS,
  STRUCTURE_NAMES,
  EMPTY_CELL_SYMBOL,
  RESOURCE_ICONS,
  RAIDER_TYPES,
} from '@codekeep/shared';
import { simulateRaid } from '@codekeep/server';

interface TutorialProps {
  gameSave: GameSave;
  onComplete: () => void;
}

type Step =
  | 'welcome'
  | 'resources'
  | 'move'
  | 'place_wall'
  | 'place_treasury'
  | 'place_archer'
  | 'place_trap'
  | 'upgrade_explain'
  | 'first_raid'
  | 'raid_result'
  | 'foraging'
  | 'tips'
  | 'done';

const STEP_ORDER: Step[] = [
  'welcome', 'resources', 'move', 'place_wall', 'place_treasury',
  'place_archer', 'place_trap', 'upgrade_explain', 'first_raid',
  'raid_result', 'foraging', 'tips', 'done',
];

const STRUCTURE_COLORS: Record<string, string> = {
  wall: 'white',
  trap: 'magenta',
  treasury: 'yellow',
  ward: 'cyan',
  watchtower: 'green',
  archerTower: 'redBright',
};

export function Tutorial({ gameSave, onComplete }: TutorialProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [cursor, setCursor] = useState<GridCoord>({ x: 7, y: 7 });
  const [placed, setPlaced] = useState<PlacedStructure[]>([]);
  const [raidLog, setRaidLog] = useState<string[]>([]);
  const [raidOutcome, setRaidOutcome] = useState<string>('');
  const [moveCount, setMoveCount] = useState(0);
  const hasMovedEnough = moveCount >= 4;

  const stepIndex = STEP_ORDER.indexOf(step);
  const totalSteps = STEP_ORDER.length - 1;

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    }
  }, [step]);

  const currentPlaceKind = step === 'place_wall' ? 'wall'
    : step === 'place_treasury' ? 'treasury'
    : step === 'place_archer' ? 'archerTower'
    : step === 'place_trap' ? 'trap'
    : null;

  const runTutorialRaid = useCallback(() => {
    const grid = { width: 16 as const, height: 16 as const, structures: [...placed] };
    const replay = simulateRaid({
      probeCount: 2,
      keepGrid: grid,
      seed: 'tutorial-raid',
      probeTypes: ['raider', 'scout'],
    });

    const log: string[] = [];
    let raidersKilled = 0;
    let wallsHit = 0;
    let treasuryBreached = false;

    for (const ev of replay.events) {
      if (ev.type === 'raider_spawn') {
        log.push(`  Raider ${ev.probeId + 1} appears from the ${ev.edge} edge`);
      } else if (ev.type === 'wall_damaged' && ev.destroyed) {
        wallsHit++;
        log.push(`  A stone wall was destroyed!`);
      } else if (ev.type === 'raider_stunned') {
        log.push(`  Raider ${ev.probeId + 1} stepped on a bear trap — stunned!`);
      } else if (ev.type === 'arrow_hit' && ev.hpRemaining <= 0) {
        raidersKilled++;
        log.push(`  Archer tower eliminated raider ${ev.probeId + 1}!`);
      } else if (ev.type === 'raider_destroyed' && !log[log.length - 1]?.includes(`raider ${ev.probeId + 1}`)) {
        raidersKilled++;
        log.push(`  Raider ${ev.probeId + 1} was destroyed`);
      } else if (ev.type === 'treasury_breach') {
        treasuryBreached = true;
        log.push(`  Raiders breached your treasury!`);
      } else if (ev.type === 'raid_end') {
        if (ev.outcome === 'defense_win') {
          log.push(`  ✓ DEFENSE WIN — all raiders defeated!`);
        } else {
          log.push(`  ✗ Raiders got through — time to strengthen defenses`);
        }
      }
    }

    if (log.length > 10) {
      const kept = [...log.slice(0, 3), `  ... ${log.length - 6} more events ...`, ...log.slice(-3)];
      setRaidLog(kept);
    } else {
      setRaidLog(log);
    }

    const outcome = replay.events.find(e => e.type === 'raid_end');
    setRaidOutcome(
      outcome?.type === 'raid_end' && outcome.outcome === 'defense_win'
        ? 'win' : 'loss'
    );
    goNext();
  }, [placed, goNext]);

  useInput((input, key) => {
    if (input === 's' && step !== 'move') { onComplete(); return; }

    const isTextStep = ['welcome', 'resources', 'move', 'upgrade_explain',
      'first_raid', 'raid_result', 'foraging', 'tips', 'done'].includes(step);

    if (isTextStep) {
      if (step === 'move') {
        if (input === 'h' || input === 'a' || key.leftArrow) { setCursor(c => ({ ...c, x: Math.max(0, c.x - 1) })); setMoveCount(n => n + 1); return; }
        if (input === 'l' || input === 'd' || key.rightArrow) { setCursor(c => ({ ...c, x: Math.min(GRID_SIZE - 1, c.x + 1) })); setMoveCount(n => n + 1); return; }
        if (input === 'k' || input === 'w' || key.upArrow) { setCursor(c => ({ ...c, y: Math.max(0, c.y - 1) })); setMoveCount(n => n + 1); return; }
        if (input === 'j' || key.downArrow) { setCursor(c => ({ ...c, y: Math.min(GRID_SIZE - 1, c.y + 1) })); setMoveCount(n => n + 1); return; }
        if ((key.return || input === ' ') && hasMovedEnough) { goNext(); return; }
        return;
      }
      if (step === 'first_raid') { runTutorialRaid(); return; }
      if (step === 'done') { onComplete(); return; }
      if (key.return || input === ' ') goNext();
      return;
    }

    if (currentPlaceKind) {
      if (input === 'h' || input === 'a' || key.leftArrow) setCursor(c => ({ ...c, x: Math.max(0, c.x - 1) }));
      else if (input === 'l' || input === 'd' || key.rightArrow) setCursor(c => ({ ...c, x: Math.min(GRID_SIZE - 1, c.x + 1) }));
      else if (input === 'k' || input === 'w' || key.upArrow) setCursor(c => ({ ...c, y: Math.max(0, c.y - 1) }));
      else if (input === 'j' || key.downArrow) setCursor(c => ({ ...c, y: Math.min(GRID_SIZE - 1, c.y + 1) }));
      else if (key.return || input === 'e') {
        const occupied = placed.some(s => s.pos.x === cursor.x && s.pos.y === cursor.y);
        if (occupied) return;
        const newStruct: PlacedStructure = {
          id: `tut-${currentPlaceKind}-${cursor.x}-${cursor.y}`,
          kind: currentPlaceKind,
          level: 1,
          pos: { ...cursor },
          placedAtUnixMs: Date.now(),
        };
        setPlaced(prev => [...prev, newStruct]);
        goNext();
      }
    }
  });

  const renderGrid = () => {
    const size = 10;
    const offsetX = 3;
    const offsetY = 3;
    const structMap = new Map<string, PlacedStructure>();
    for (const s of placed) structMap.set(`${s.pos.x},${s.pos.y}`, s);

    const rows: React.ReactNode[] = [];
    for (let y = offsetY; y < offsetY + size; y++) {
      const cells: React.ReactNode[] = [];
      for (let x = offsetX; x < offsetX + size; x++) {
        const isCursor = cursor.x === x && cursor.y === y;
        const struct = structMap.get(`${x},${y}`);
        let char = EMPTY_CELL_SYMBOL;
        let color: string | undefined;
        if (struct) {
          char = STRUCTURE_SYMBOLS[struct.kind];
          color = STRUCTURE_COLORS[struct.kind];
        }
        if (isCursor) {
          cells.push(<Text key={x} backgroundColor="white" color="black" bold>{char + ' '}</Text>);
        } else if (color) {
          cells.push(<Text key={x} color={color} bold>{char + ' '}</Text>);
        } else {
          cells.push(<Text key={x} dimColor>{char + ' '}</Text>);
        }
      }
      rows.push(<Box key={y}>{cells}</Box>);
    }
    return <Box flexDirection="column">{rows}</Box>;
  };

  const progress = `[${stepIndex}/${totalSteps}]`;

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="yellow">{'◆ CodeKeep — Tutorial '}</Text>
        <Text dimColor>{progress}</Text>
      </Box>
      <Text> </Text>

      {step === 'welcome' && (
        <>
          <Text bold color="cyan">Welcome to CodeKeep, {gameSave.player.displayName}!</Text>
          <Text> </Text>
          <Text>CodeKeep is a <Text bold>tower defense</Text> game played in your terminal.</Text>
          <Text> </Text>
          <Text>{'  '}Build a <Text bold>fortress</Text> on a 16×16 grid</Text>
          <Text>{'  '}Place <Text bold>walls</Text>, <Text bold>traps</Text>, and <Text bold>archer towers</Text> to defend</Text>
          <Text>{'  '}Protect your <Text bold color="yellow">treasuries</Text> from raiding parties</Text>
          <Text>{'  '}Earn resources over time and from coding activity</Text>
          <Text> </Text>
          <Text>Let's learn how to play!</Text>
          <Text> </Text>
          <Text dimColor>Enter to continue · s to skip tutorial</Text>
        </>
      )}

      {step === 'resources' && (
        <>
          <Text bold color="cyan">Resources</Text>
          <Text> </Text>
          <Text>You have three resources to build and upgrade structures:</Text>
          <Text> </Text>
          <Text>  <Text color="yellow" bold>{RESOURCE_ICONS.gold} Gold</Text>    — Your main currency. Earned from events and raids.</Text>
          <Text>  <Text color="green" bold>{RESOURCE_ICONS.wood} Wood</Text>    — Building material. Earned from treasuries and events.</Text>
          <Text>  <Text color="white" bold>{RESOURCE_ICONS.stone} Stone</Text>   — Heavy material. Used for walls and towers.</Text>
          <Text> </Text>
          <Text>Resources grow passively and from coding activity (git commits!).</Text>
          <Text>You can also press <Text bold>f</Text> for a kingdom boon anytime.</Text>
          <Text> </Text>
          <Text dimColor>Enter to continue</Text>
        </>
      )}

      {step === 'move' && (
        <>
          <Text bold color="cyan">Movement</Text>
          <Text> </Text>
          <Text>Move the cursor with:</Text>
          <Text>  <Text bold>h j k l</Text> (vim) · <Text bold>W A S D</Text> · <Text bold>Arrow keys</Text></Text>
          <Text> </Text>
          <Text>Try moving around — {hasMovedEnough
            ? <Text color="green" bold>Great! Press Enter to continue.</Text>
            : <Text dimColor>move at least 4 times to proceed</Text>
          }</Text>
          <Text> </Text>
          {renderGrid()}
        </>
      )}

      {step === 'place_wall' && (
        <>
          <Text bold color="cyan">Build: Stone Wall <Text color="white">#</Text></Text>
          <Text> </Text>
          <Text>Walls <Text bold>block raiders</Text> and force them to find another path.</Text>
          <Text>They have HP and will eventually break if attacked.</Text>
          <Text> </Text>
          <Text>Move to an empty cell and press <Text bold>Enter</Text> to place one.</Text>
          <Text> </Text>
          {renderGrid()}
          <Text> </Text>
          <Text dimColor>Move with h/j/k/l · place with Enter</Text>
        </>
      )}

      {step === 'place_treasury' && (
        <>
          <Text bold color="cyan">Build: Treasury <Text color="yellow">$</Text></Text>
          <Text> </Text>
          <Text>Treasuries are what <Text bold color="red">raiders target</Text>.</Text>
          <Text>They also generate <Text bold>passive income</Text> over time.</Text>
          <Text>Place them in protected spots behind your walls!</Text>
          <Text> </Text>
          <Text>Place a treasury somewhere on the grid.</Text>
          <Text> </Text>
          {renderGrid()}
          <Text> </Text>
          <Text dimColor>Move and press Enter to place</Text>
        </>
      )}

      {step === 'place_archer' && (
        <>
          <Text bold color="cyan">Build: Archer Tower <Text color="redBright">!</Text></Text>
          <Text> </Text>
          <Text>Archer towers <Text bold>shoot arrows</Text> at raiders within range.</Text>
          <Text>They fire automatically and can kill raiders before they reach your treasury.</Text>
          <Text>Place them where raiders will pass by!</Text>
          <Text> </Text>
          <Text>Place an archer tower on the grid.</Text>
          <Text> </Text>
          {renderGrid()}
          <Text> </Text>
          <Text dimColor>Move and press Enter to place</Text>
        </>
      )}

      {step === 'place_trap' && (
        <>
          <Text bold color="cyan">Build: Bear Trap <Text color="magenta">%</Text></Text>
          <Text> </Text>
          <Text>Traps <Text bold>stun raiders</Text> that walk over them.</Text>
          <Text>A stunned raider can't move for several ticks — perfect for</Text>
          <Text>your archer towers to finish them off!</Text>
          <Text> </Text>
          <Text>Place a bear trap on a path raiders might take.</Text>
          <Text> </Text>
          {renderGrid()}
          <Text> </Text>
          <Text dimColor>Move and press Enter to place</Text>
        </>
      )}

      {step === 'upgrade_explain' && (
        <>
          <Text bold color="cyan">Upgrading & More Structures</Text>
          <Text> </Text>
          <Text>In the full game you can:</Text>
          <Text> </Text>
          <Text>  <Text bold>u</Text>  Upgrade a structure (Lv.1 → 2 → 3) for better stats</Text>
          <Text>  <Text bold>x</Text>  Demolish a structure (get 50% refund)</Text>
          <Text>  <Text bold>1-6</Text> Quick-select any structure type</Text>
          <Text> </Text>
          <Text>Two structures you haven't placed yet:</Text>
          <Text> </Text>
          <Text>  <Text color="cyan" bold>{STRUCTURE_SYMBOLS.ward}</Text> {STRUCTURE_NAMES.ward} — Place next to a treasury to <Text bold>reduce loot</Text></Text>
          <Text>    raiders can steal. Wards protect a 1-tile radius around them.</Text>
          <Text> </Text>
          <Text>  <Text color="green" bold>{STRUCTURE_SYMBOLS.watchtower}</Text> {STRUCTURE_NAMES.watchtower} — <Text bold>Extends ward range</Text> when adjacent.</Text>
          <Text>    Also auto-gathers forage nearby and earns passive stone.</Text>
          <Text> </Text>
          <Text dimColor>Combo: Ward next to Treasury + Watchtower next to Ward = max protection!</Text>
          <Text> </Text>
          <Text dimColor>Enter to continue</Text>
        </>
      )}

      {step === 'first_raid' && (
        <>
          <Text bold color="cyan">Your First Raid!</Text>
          <Text> </Text>
          <Text>Let's test your defenses. Two raiders will attack your layout:</Text>
          <Text> </Text>
          {renderGrid()}
          <Text> </Text>
          <Text>  You placed: {placed.map(s =>
            <Text key={s.id}><Text color={STRUCTURE_COLORS[s.kind]} bold>{STRUCTURE_SYMBOLS[s.kind]}</Text> </Text>
          )}</Text>
          <Text> </Text>
          <Text bold color="yellow">Press any key to simulate the raid!</Text>
        </>
      )}

      {step === 'raid_result' && (
        <>
          <Text bold color={raidOutcome === 'win' ? 'green' : 'yellow'}>
            {raidOutcome === 'win' ? 'Victory! Your defenses held!' : 'The raiders got through — but that\'s okay!'}
          </Text>
          <Text> </Text>
          <Text bold>Raid replay:</Text>
          {raidLog.map((line, i) => (
            <Text key={i} color={
              line.includes('WIN') ? 'green' :
              line.includes('eliminated') || line.includes('destroyed') ? 'cyan' :
              line.includes('breached') || line.includes('through') ? 'red' :
              line.includes('stunned') ? 'magenta' :
              undefined
            }>{line}</Text>
          ))}
          <Text> </Text>
          {raidOutcome !== 'win' && (
            <Text dimColor>Don't worry — you'll have plenty of resources to build better defenses!</Text>
          )}
          <Text> </Text>
          <Text dimColor>Enter to continue</Text>
        </>
      )}

      {step === 'foraging' && (
        <>
          <Text bold color="cyan">Foraging</Text>
          <Text> </Text>
          <Text>Glowing <Text color="cyan" bold>~</Text> fragments appear on your grid over time.</Text>
          <Text>Move your cursor over one and press <Text bold>c</Text> to collect resources!</Text>
          <Text> </Text>
          <Text>  <Text color="cyan">~</Text> Gold Nugget   <Text color="yellow">~</Text> Timber   <Text color="green">~</Text> Ore   <Text color="white">~</Text> Gem</Text>
          <Text> </Text>
          <Text>Structure synergies:</Text>
          <Text>  <Text color="redBright">!</Text> Archer Towers increase spawn rate</Text>
          <Text>  <Text color="yellow">$</Text> Treasuries boost yield when nearby</Text>
          <Text>  <Text color="green">^</Text> Watchtowers auto-collect nearby fragments</Text>
          <Text> </Text>
          <Text dimColor>Enter to continue</Text>
        </>
      )}

      {step === 'tips' && (
        <>
          <Text bold color="cyan">Pro Tips</Text>
          <Text> </Text>
          <Text>  <Text bold>?</Text>        Full help screen (anytime)</Text>
          <Text>  <Text bold>1-6</Text>      Quick-select structures</Text>
          <Text>  <Text bold>Tab</Text>      Jump between your structures</Text>
          <Text>  <Text bold>r</Text>        Quick defend (instant raid result)</Text>
          <Text>  <Text bold>v</Text>        Watch replay of last defense</Text>
          <Text>  <Text bold>f</Text>        Kingdom boon (free resources)</Text>
          <Text>  <Text bold>Esc</Text>      Back to main menu</Text>
          <Text> </Text>
          <Text bold>Strategy:</Text>
          <Text>  • Place walls to create <Text bold>chokepoints</Text></Text>
          <Text>  • Put traps in the chokepoint so raiders get <Text bold>stunned</Text></Text>
          <Text>  • Put archer towers nearby to <Text bold>finish stunned raiders</Text></Text>
          <Text>  • Hide treasuries <Text bold>deep inside</Text> your walls</Text>
          <Text>  • Place wards next to treasuries to <Text bold>reduce loot stolen</Text></Text>
          <Text>  • <Text bold>Hover over</Text> towers/wards to see their <Text bold color="red">range overlay</Text></Text>
          <Text> </Text>
          <Text dimColor>Enter to continue</Text>
        </>
      )}

      {step === 'done' && (
        <>
          <Text bold color="yellow">You're ready to defend your keep!</Text>
          <Text> </Text>
          <Text>Your structures from the tutorial won't carry over — you start</Text>
          <Text>with a clean grid and starting resources.</Text>
          <Text> </Text>
          <Text>Go forth, build wisely, and may your walls hold strong!</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to start playing</Text>
        </>
      )}
    </Box>
  );
}
