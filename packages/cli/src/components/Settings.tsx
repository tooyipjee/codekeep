import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { exec } from 'node:child_process';
import { generateGitHubIssueUrl, type CrashReport } from '../lib/crash-reporter.js';

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
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugInput, setBugInput] = useState('');
  const [bugUrl, setBugUrl] = useState<string | null>(null);

  const ITEMS: SettingsItem[] = [
    { key: 'ascii', label: `ASCII Mode: ${asciiMode ? 'ON' : 'OFF'}`, desc: 'Use plain ASCII borders (for basic terminals)' },
    { key: 'tutorial', label: 'Replay Tutorial', desc: 'Learn how to play again' },
    { key: 'report', label: 'Report Bug', desc: 'Open a GitHub issue for bugs' },
    { key: 'reset', label: 'Reset Game', desc: 'Delete save and start over' },
    { key: 'back', label: 'Back', desc: 'Return to menu' },
  ];

  useInput((input, key) => {
    if (bugUrl) {
      if (key.escape || key.return || input === 'q') {
        setBugUrl(null);
        setShowBugReport(false);
      }
      return;
    }

    if (showBugReport) {
      if (key.escape) {
        setShowBugReport(false);
        setBugInput('');
        return;
      }
      if (key.return && bugInput.length > 0) {
        const report: CrashReport = {
          timestamp: new Date().toISOString(),
          error: bugInput,
          version: globalThis.__CODEKEEP_VERSION ?? 'unknown',
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          screen: 'settings',
        };
        const url = generateGitHubIssueUrl(report);
        setBugUrl(url);
        setBugInput('');
        const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCmd} "${url}"`, () => {});
        return;
      }
      if (key.backspace || key.delete) {
        setBugInput((prev) => prev.slice(0, -1));
        return;
      }
      if (input && input.length === 1) {
        setBugInput((prev) => prev + input);
      }
      return;
    }

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
      else if (item.key === 'report') setShowBugReport(true);
      else if (item.key === 'reset') setConfirmReset(true);
      else if (item.key === 'back') onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Settings'}</Text>
      <Text> </Text>

      {bugUrl ? (
        <Box flexDirection="column">
          <Text bold color="green">Bug report ready!</Text>
          <Text> </Text>
          <Text>Opening in your browser...</Text>
          <Text>If it didn't open, copy this URL:</Text>
          <Text> </Text>
          <Text color="cyan" wrap="wrap">{bugUrl}</Text>
          <Text> </Text>
          <Text dimColor>Press Enter or Esc to go back</Text>
        </Box>
      ) : showBugReport ? (
        <Box flexDirection="column">
          <Text bold color="cyan">Report a Bug</Text>
          <Text>Describe the issue briefly:</Text>
          <Text color="cyan">{bugInput}<Text dimColor>_</Text></Text>
          <Text> </Text>
          <Text dimColor>Enter to generate GitHub issue URL · Esc cancel</Text>
        </Box>
      ) : confirmReset ? (
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
