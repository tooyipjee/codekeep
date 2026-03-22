import React from 'react';
import { Box, Text } from 'ink';

export interface GameSettings {
  asciiMode: boolean;
  showTutorialHints: boolean;
  combatLogSize: number;
}

interface SettingsViewProps {
  settings: GameSettings;
  selectedIndex: number;
  saveInfo: {
    totalRuns: number;
    totalWins: number;
    highestAscension: number;
    echoes: number;
    hasSave: boolean;
  };
  confirmingReset: boolean;
  message: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  asciiMode: false,
  showTutorialHints: true,
  combatLogSize: 4,
};

export function SettingsView({ settings, selectedIndex, saveInfo, confirmingReset, message }: SettingsViewProps) {
  const items = [
    { id: 'ascii', label: `ASCII Mode: ${settings.asciiMode ? 'ON' : 'OFF'}`, description: 'Use plain ASCII characters (no Unicode symbols)' },
    { id: 'hints', label: `Tutorial Hints: ${settings.showTutorialHints ? 'ON' : 'OFF'}`, description: 'Show helpful tips during first runs' },
    { id: 'log', label: `Combat Log Lines: ${settings.combatLogSize}`, description: 'Number of recent combat events shown (0-8)' },
    { id: 'tutorial', label: 'View Tutorial', description: 'Re-read the game tutorial' },
    { id: 'controls', label: 'Controls Reference', description: 'View all keybindings' },
    { id: 'reset', label: 'Reset Save Data', description: 'Delete all progress and start fresh' },
    { id: 'back', label: 'Back to Menu', description: '' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ Settings</Text>
      <Text> </Text>
      <Box paddingX={1}>
        <Box flexDirection="column" width={40}>
          <Text bold dimColor>Save Info</Text>
          <Text dimColor>Runs: {saveInfo.totalRuns}  Wins: {saveInfo.totalWins}  Echoes: {saveInfo.echoes}</Text>
          <Text dimColor>Highest Ascension: {saveInfo.highestAscension}</Text>
          <Text dimColor>Save: {saveInfo.hasSave ? '~/.config/codekeep/game.json' : 'None'}</Text>
        </Box>
      </Box>
      <Text> </Text>
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={item.id}>
            <Text bold={isSelected} color={isSelected ? (item.id === 'reset' ? 'red' : 'yellow') : undefined}>
              {isSelected ? '▶ ' : '  '}{item.label}
            </Text>
            {isSelected && item.description ? <Text dimColor>  — {item.description}</Text> : null}
          </Box>
        );
      })}
      {confirmingReset && (
        <>
          <Text> </Text>
          <Text bold color="red">Are you sure? This deletes ALL progress. Press Enter again to confirm, Esc to cancel.</Text>
        </>
      )}
      {message && (
        <>
          <Text> </Text>
          <Text color="cyan" bold>{message}</Text>
        </>
      )}
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter toggle/select  q back</Text>
    </Box>
  );
}
