import React from 'react';
import { Box, Text } from 'ink';
import { saveCrashReport, generateGitHubIssueUrl, type CrashReport } from '../lib/crash-reporter.js';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  crashFilePath: string | null;
  issueUrl: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, crashFilePath: null, issueUrl: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error) {
    try {
      const crashFilePath = saveCrashReport(error);
      const report: CrashReport = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        version: '0.1.0',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      };
      const issueUrl = generateGitHubIssueUrl(report);
      this.setState({ crashFilePath, issueUrl });
    } catch {
      // crash reporter itself failed — don't make things worse
    }
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
          {this.state.crashFilePath && (
            <>
              <Text dimColor>{'Crash report saved to:'}</Text>
              <Text>  {this.state.crashFilePath}</Text>
              <Text> </Text>
            </>
          )}
          {this.state.issueUrl && (
            <>
              <Text dimColor>{'Report this bug:'}</Text>
              <Text color="cyan">  {this.state.issueUrl}</Text>
              <Text> </Text>
            </>
          )}
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
