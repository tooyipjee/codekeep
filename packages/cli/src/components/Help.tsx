import React from 'react';
import { Box, Text } from 'ink';

export function Help() {
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
      <Text bold>Combat</Text>
      <Text>  r                           Quick defend (instant result)</Text>
      <Text>  Defend Keep (menu)          Watch NPCs attack your grid</Text>
      <Text>  Attack NPC (menu)           Raid NPC keep for resources</Text>
      <Text> </Text>
      <Text bold>Other</Text>
      <Text>  f                           Simulate coding event (+resources)</Text>
      <Text>  ?                           Toggle this help</Text>
      <Text>  q                           Save and quit</Text>
      <Text> </Text>
      <Text bold>Structures</Text>
      <Text>  <Text color="white">1 #</Text> Firewall     Blocks probe movement, has HP</Text>
      <Text>  <Text color="magenta">2 %</Text> Honeypot     Stuns probes that walk over it</Text>
      <Text>  <Text color="yellow">3 $</Text> Data Vault   Stores resources (raid target)</Text>
      <Text>  <Text color="cyan">4 @</Text> Encryption   Reduces loot from nearby vaults</Text>
      <Text>  <Text color="green">5 ^</Text> Relay Tower  Extends encryption range</Text>
      <Text>  <Text color="redBright">6 !</Text> Scanner      Deals damage to probes in range</Text>
      <Text> </Text>
      <Text bold>Probe Types</Text>
      <Text>  Standard  HP 30, dmg 8, speed 1</Text>
      <Text>  Scout     HP 14, dmg 4, speed 2 (moves twice per tick)</Text>
      <Text>  Brute     HP 55, dmg 14, speed 1</Text>
      <Text> </Text>
      <Text dimColor>Press any key to close</Text>
    </Box>
  );
}
