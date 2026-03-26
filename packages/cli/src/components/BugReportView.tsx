import React from 'react';
import { Box, Text } from 'ink';

export type BugReportPhase = 'input' | 'submitting' | 'done';

interface BugReportViewProps {
  phase: BugReportPhase;
  description: string;
  issueUrl: string | null;
  fallbackUrl: string | null;
  error: string | null;
}

export function BugReportView({ phase, description, issueUrl, fallbackUrl, error }: BugReportViewProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">◆ Report a Bug</Text>
      <Text> </Text>

      {phase === 'input' && (
        <>
          <Text>Describe the bug (what happened, what you expected):</Text>
          <Text> </Text>
          <Box>
            <Text color="yellow">{'> '}</Text>
            <Text>{description}<Text color="yellow">{'█'}</Text></Text>
          </Box>
          <Text> </Text>
          <Text dimColor>Type your description, then press Enter to submit.</Text>
          <Text dimColor>Press Esc to cancel.</Text>
        </>
      )}

      {phase === 'submitting' && (
        <Text dimColor>Submitting bug report to GitHub...</Text>
      )}

      {phase === 'done' && issueUrl && (
        <>
          <Text color="green">✓ Bug report submitted!</Text>
          <Text> </Text>
          <Text color="cyan">{issueUrl}</Text>
          <Text> </Text>
          <Text dimColor>Game state was captured automatically. Press Enter or Esc to return.</Text>
        </>
      )}

      {phase === 'done' && !issueUrl && fallbackUrl && (
        <>
          {error && <Text color="yellow">{error}</Text>}
          <Text> </Text>
          <Text>Open this URL to submit manually:</Text>
          <Text> </Text>
          <Text color="cyan" wrap="truncate-end">{fallbackUrl}</Text>
          <Text> </Text>
          <Text dimColor>Press Enter or Esc to return.</Text>
        </>
      )}

      {phase === 'done' && !issueUrl && !fallbackUrl && error && (
        <>
          <Text color="red">Failed to submit: {error}</Text>
          <Text> </Text>
          <Text dimColor>Press Enter or Esc to return.</Text>
        </>
      )}
    </Box>
  );
}
