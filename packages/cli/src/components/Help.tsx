import React from 'react';
import { Box, Text } from 'ink';
import { RAIDER_TYPES, RESOURCE_ICONS, STRUCTURE_COSTS, STRUCTURE_SYMBOLS } from '@codekeep/shared';
import type { Resources } from '@codekeep/shared';

function fmtCost(c: Resources): string {
  const p: string[] = [];
  if (c.gold > 0) p.push(`${RESOURCE_ICONS.gold}${c.gold}`);
  if (c.wood > 0) p.push(`${RESOURCE_ICONS.wood}${c.wood}`);
  if (c.stone > 0) p.push(`${RESOURCE_ICONS.stone}${c.stone}`);
  return p.join(' ');
}

export function Help() {
  const R = RAIDER_TYPES;
  const C = STRUCTURE_COSTS;
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ CodeKeep — Help'}</Text>
      <Text> </Text>
      <Text bold>Navigation</Text>
      <Text>  h/j/k/l or WASD or Arrows  Move cursor</Text>
      <Text>  g + hex coords + Enter     Jump to coordinate (e.g. g 5,3)</Text>
      <Text>  Tab                         Jump to next structure</Text>
      <Text>  Esc                         Back to menu</Text>
      <Text> </Text>
      <Text bold>Building</Text>
      <Text>  {'[ / ]                        Cycle structure type'}</Text>
      <Text>  1-6                         Select structure by number</Text>
      <Text>  Enter or e                  Place structure at cursor</Text>
      <Text>  u                           Upgrade structure (Lv.1→2→3)</Text>
      <Text>  x                           Demolish structure (50% refund)</Text>
      <Text> </Text>
      <Text bold>Foraging</Text>
      <Text>  c                           Collect forage at cursor (~ on the grid)</Text>
      <Text>  {'  Archer towers improve spawn rate; treasuries improve yield'}</Text>
      <Text>  {'  Watchtowers auto-gather nearby forage'}</Text>
      <Text> </Text>
      <Text bold>Combat</Text>
      <Text>  r                           Quick defend (instant result)</Text>
      <Text>  v                           View last quick-defend replay</Text>
      <Text>  Defend Keep (menu)          Watch raiders assault your grid</Text>
      <Text>  Attack NPC (menu)           Raid an NPC keep for loot</Text>
      <Text> </Text>
      <Text bold>Other</Text>
      <Text>  f                           Kingdom boon (+resources)</Text>
      <Text>  ?                           Toggle this help (works on any screen)</Text>
      <Text>  q                           Save and quit</Text>
      <Text> </Text>
      <Text bold>Structures (cost Lv.1 → Lv.2 → Lv.3)</Text>
      <Text>  <Text color="white">1 {STRUCTURE_SYMBOLS.wall}</Text> Stone Wall     Blocks raiders, has HP            {fmtCost(C.wall[1])}</Text>
      <Text>  <Text color="magenta">2 {STRUCTURE_SYMBOLS.trap}</Text> Bear Trap      Stuns raiders on contact          {fmtCost(C.trap[1])}</Text>
      <Text>  <Text color="yellow">3 {STRUCTURE_SYMBOLS.treasury}</Text> Treasury       Stores loot, generates income     {fmtCost(C.treasury[1])}</Text>
      <Text>  <Text color="cyan">4 {STRUCTURE_SYMBOLS.ward}</Text> Ward           Reduces loot stolen nearby         {fmtCost(C.ward[1])}</Text>
      <Text>  <Text color="green">5 {STRUCTURE_SYMBOLS.watchtower}</Text> Watchtower     Extends ward range, auto-gathers  {fmtCost(C.watchtower[1])}</Text>
      <Text>  <Text color="redBright">6 {STRUCTURE_SYMBOLS.archerTower}</Text> Archer Tower   Fires arrows at raiders in range  {fmtCost(C.archerTower[1])}</Text>
      <Text> </Text>
      <Text bold>Resources</Text>
      <Text>  <Text color="yellow">{RESOURCE_ICONS.gold}</Text> Gold      Earned from events, foraging, and raids</Text>
      <Text>  <Text color="green">{RESOURCE_ICONS.wood}</Text> Wood      Earned from treasuries and events</Text>
      <Text>  <Text color="white">{RESOURCE_ICONS.stone}</Text> Stone     Earned from watchtowers and events</Text>
      <Text>  Treasuries and watchtowers generate passive income over time.</Text>
      <Text> </Text>
      <Text bold>Raider Types</Text>
      <Text>  Raider  HP {R.raider.hp}, dmg {R.raider.damage}, speed {R.raider.speed}  — standard foot soldier</Text>
      <Text>  Scout   HP {R.scout.hp}, dmg {R.scout.damage}, speed {R.scout.speed}  — fast, moves twice per tick</Text>
      <Text>  Brute   HP {R.brute.hp}, dmg {R.brute.damage}, speed {R.brute.speed}  — heavy hitter, hard to kill</Text>
      <Text> </Text>
      <Text bold>Raid Difficulty</Text>
      <Text>  Difficulty scales with total raids completed (Lv.1–5).</Text>
      <Text>  Higher levels bring more raiders, scouts, and brutes.</Text>
      <Text>  Outcomes: <Text color="green">Defense Win</Text> · <Text color="yellow">Partial Breach</Text> · <Text color="red">Full Breach</Text></Text>
      <Text> </Text>
      <Text dimColor>Press any key to close</Text>
    </Box>
  );
}
