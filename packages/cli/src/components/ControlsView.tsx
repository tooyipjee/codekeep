import React from 'react';
import { Box, Text } from 'ink';

export function ControlsView() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ Controls Reference</Text>
      <Text> </Text>
      <Text bold>Global</Text>
      <Text>  q           Quit / back to menu</Text>
      <Text>  ↑↓ or j/k   Navigate menus</Text>
      <Text>  Enter       Confirm / select</Text>
      <Text>  Esc         Cancel / go back</Text>
      <Text> </Text>
      <Text bold>Combat</Text>
      <Text>  1-9         Select card from hand</Text>
      <Text>  ←→ or h/l   Target column</Text>
      <Text>  Enter       Play selected card</Text>
      <Text>  Space       End your turn</Text>
      <Text>  e           Toggle emplace mode</Text>
      <Text>  p           Use first available potion</Text>
      <Text>  i           Inspect enemies</Text>
      <Text>  d           View deck</Text>
      <Text>  Esc         Deselect card</Text>
      <Text> </Text>
      <Text bold>Map</Text>
      <Text>  ↑↓          Select next node</Text>
      <Text>  Enter       Enter node</Text>
      <Text>  d           View deck</Text>
      <Text> </Text>
      <Text bold>Inspect Mode (i in combat)</Text>
      <Text>  ←→          Switch column</Text>
      <Text>  ↑↓          Switch enemy in column</Text>
      <Text>  i / Esc     Close inspect</Text>
      <Text> </Text>
      <Text dimColor>Press q or Esc to go back</Text>
    </Box>
  );
}
