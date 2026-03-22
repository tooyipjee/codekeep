import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { ErrorBoundary } from './components/ErrorBoundary.js';

const MIN_COLS = 60;
const MIN_ROWS = 18;

function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout?.columns ?? process.stdout.columns ?? 80,
    rows: stdout?.rows ?? process.stdout.rows ?? 24,
  });

  useEffect(() => {
    const target = stdout ?? process.stdout;
    const onResize = () => {
      setSize({ columns: target.columns, rows: target.rows });
    };
    target.on('resize', onResize);
    return () => { target.off('resize', onResize); };
  }, [stdout]);

  return size;
}

export interface AppProps {
  asciiMode: boolean;
  compact: boolean;
  forceTutorial: boolean;
  dryRun?: boolean;
}

function AppContent({ compact }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();

  const tooSmall = columns < MIN_COLS || rows < MIN_ROWS;

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
    }
  });

  if (tooSmall) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
        <Text> </Text>
        <Text color="red">Terminal too small</Text>
        <Text>Need <Text bold>{MIN_COLS}x{MIN_ROWS}</Text>, got <Text bold>{columns}x{rows}</Text></Text>
        <Text dimColor>Resize your terminal or run with --compact</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ CodeKeep — The Pale'}</Text>
      <Text> </Text>
      <Text>{'The fortress stands at the edge of the Pale.'}</Text>
      <Text>{'Beyond the walls, something stirs.'}</Text>
      <Text> </Text>
      <Text dimColor>{'Deck-building tactical roguelike — coming soon.'}</Text>
      <Text dimColor>{'Press q to exit.'}</Text>
    </Box>
  );
}

export function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <AppContent {...props} />
    </ErrorBoundary>
  );
}
