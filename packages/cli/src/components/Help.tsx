import React from 'react';
import { Box, Text } from 'ink';
import { RAIDER_TYPES } from '@codekeep/shared';

export function Help() {
  const R = RAIDER_TYPES;
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
      <Text>  u                           Upgrade structure</Text>
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
      <Text>  f                           Kingdom boon (+resources, sim)</Text>
      <Text>  ?                           Toggle this help</Text>
      <Text>  q                           Save and quit</Text>
      <Text> </Text>
      <Text bold>Structures</Text>
      <Text>  <Text color="white">1 #</Text> Stone Wall    Blocks raiders, has HP</Text>
      <Text>  <Text color="magenta">2 %</Text> Bear Trap     Stuns raiders that step on it</Text>
      <Text>  <Text color="yellow">3 $</Text> Treasury      Stores supplies (raid target)</Text>
      <Text>  <Text color="cyan">4 @</Text> Ward          Reduces loot taken from nearby treasuries</Text>
      <Text>  <Text color="green">5 ^</Text> Watchtower  Extends ward range</Text>
      <Text>  <Text color="redBright">6 !</Text> Archer Tower  Fires at raiders in range</Text>
      <Text> </Text>
      <Text bold>Raider types</Text>
      <Text>  Raider  HP {R.raider.hp}, dmg {R.raider.damage}, speed {R.raider.speed}</Text>
      <Text>  Scout   HP {R.scout.hp}, dmg {R.scout.damage}, speed {R.scout.speed} (moves twice per tick)</Text>
      <Text>  Brute   HP {R.brute.hp}, dmg {R.brute.damage}, speed {R.brute.speed}</Text>
      <Text> </Text>
      <Text dimColor>Press any key to close</Text>
    </Box>
  );
}
