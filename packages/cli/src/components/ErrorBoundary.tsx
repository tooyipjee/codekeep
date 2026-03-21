import React from 'react';
import { Box, Text } from 'ink';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text bold color="red">{'◆ CodeKeep — Something went wrong'}</Text>
          <Text> </Text>
          <Text color="red">{this.state.error.message}</Text>
          <Text> </Text>
          <Text dimColor>{'Your save file is at:'}</Text>
          <Text>  {'~/.config/codekeep/game.json'}</Text>
          <Text> </Text>
          <Text dimColor>{'If the game won\'t start, try:'}</Text>
          <Text bold>  {'codekeep --tutorial'}</Text>
          <Text> </Text>
          <Text dimColor>{'Press Ctrl+C to exit'}</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}
