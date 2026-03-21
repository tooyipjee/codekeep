import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface SettingsProps {
  onBack: () => void;
  onResetGame: () => void;
  onReplayTutorial: () => void;
  asciiMode: boolean;
  onToggleAscii: () => void;
}

type SettingsItem = { key: string; label: string; desc: string };

export function Settings({ onBack, onResetGame, onReplayTutorial, asciiMode, onToggleAscii }: SettingsProps) {
  const [selected, setSelected] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const ITEMS: SettingsItem[] = [
    { key: 'ascii', label: `ASCII Mode: ${asciiMode ? 'ON' : 'OFF'}`, desc: 'Use plain ASCII borders (for basic terminals)' },
    { key: 'tutorial', label: 'Replay Tutorial', desc: 'Learn how to play again' },
    { key: 'reset', label: 'Reset Game', desc: 'Delete save and start over' },
    { key: 'back', label: 'Back', desc: 'Return to menu' },
  ];

  useInput((input, key) => {
    if (confirmReset) {
      if (input === 'y' || input === 'Y') {
        onResetGame();
        return;
      }
      setConfirmReset(false);
      return;
    }

    if (input === 'q' || key.escape) { onBack(); return; }

    if (input === 'j' || input === 's' || key.downArrow) {
      setSelected((s) => Math.min(s + 1, ITEMS.length - 1));
    }
    if (input === 'k' || input === 'w' || key.upArrow) {
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (key.return) {
      const item = ITEMS[selected];
      if (item.key === 'ascii') onToggleAscii();
      else if (item.key === 'tutorial') onReplayTutorial();
      else if (item.key === 'reset') setConfirmReset(true);
      else if (item.key === 'back') onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Settings'}</Text>
      <Text> </Text>

      {confirmReset ? (
        <Box flexDirection="column">
          <Text bold color="red">Are you sure you want to reset?</Text>
          <Text>This will permanently delete your save file.</Text>
          <Text>All structures, resources, and achievements will be lost.</Text>
          <Text> </Text>
          <Text bold>Press <Text color="red">Y</Text> to confirm, any other key to cancel</Text>
        </Box>
      ) : (
        <>
          {ITEMS.map((item, i) => (
            <Box key={item.key}>
              <Text color={i === selected ? 'yellow' : undefined} bold={i === selected}>
                {i === selected ? ' ▸ ' : '   '}
                {item.label}
              </Text>
              <Text dimColor>  {item.desc}</Text>
            </Box>
          ))}
          <Text> </Text>
          <Text dimColor>  ↑↓ navigate · Enter select · Esc back</Text>
        </>
      )}
    </Box>
  );
}
