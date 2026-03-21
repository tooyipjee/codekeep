import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface AuthViewProps {
  onLogin: (apiKey: string) => void;
  onRegister: (displayName: string) => void;
  onPlayOffline: () => void;
  error: string | null;
  isLoading: boolean;
}

export function AuthView({ onLogin, onRegister, onPlayOffline, error, isLoading }: AuthViewProps) {
  const [mode, setMode] = useState<'menu' | 'login' | 'register'>('menu');
  const [input, setInputVal] = useState('');
  const [selected, setSelected] = useState(0);

  const menuItems = [
    { key: 'register', label: 'Register (new player)' },
    { key: 'login', label: 'Login (with API key)' },
    { key: 'offline', label: 'Play Offline' },
  ];

  useInput((ch, key) => {
    if (isLoading) return;

    if (mode === 'menu') {
      if (key.upArrow || ch === 'k') setSelected((s) => Math.max(0, s - 1));
      else if (key.downArrow || ch === 'j') setSelected((s) => Math.min(menuItems.length - 1, s + 1));
      else if (key.return) {
        const item = menuItems[selected];
        if (item.key === 'register') setMode('register');
        else if (item.key === 'login') setMode('login');
        else if (item.key === 'offline') onPlayOffline();
      }
      return;
    }

    if (key.escape) {
      setMode('menu');
      setInputVal('');
      return;
    }

    if (key.return && input.length > 0) {
      if (mode === 'login') onLogin(input);
      else if (mode === 'register') onRegister(input);
      setInputVal('');
      return;
    }

    if (key.backspace || key.delete) {
      setInputVal((prev) => prev.slice(0, -1));
      return;
    }

    if (ch && ch.length === 1) {
      setInputVal((prev) => prev + ch);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ CodeKeep Online'}</Text>
      <Text> </Text>

      {error && <Text color="red">{error}</Text>}
      {isLoading && <Text color="yellow">Connecting...</Text>}

      {mode === 'menu' && !isLoading && (
        <>
          {menuItems.map((item, i) => (
            <Box key={item.key}>
              <Text color={i === selected ? 'yellow' : undefined} bold={i === selected}>
                {i === selected ? ' ▸ ' : '   '}
                {item.label}
              </Text>
            </Box>
          ))}
          <Text> </Text>
          <Text dimColor>↑↓ navigate  Enter select</Text>
        </>
      )}

      {mode === 'login' && !isLoading && (
        <Box flexDirection="column">
          <Text>Enter your API key:</Text>
          <Text color="cyan">{input}<Text dimColor>_</Text></Text>
          <Text> </Text>
          <Text dimColor>Enter to submit  Esc back</Text>
        </Box>
      )}

      {mode === 'register' && !isLoading && (
        <Box flexDirection="column">
          <Text>Choose a display name:</Text>
          <Text color="cyan">{input}<Text dimColor>_</Text></Text>
          <Text> </Text>
          <Text dimColor>Enter to submit  Esc back</Text>
        </Box>
      )}
    </Box>
  );
}
