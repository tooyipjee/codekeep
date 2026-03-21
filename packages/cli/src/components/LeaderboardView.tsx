import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { LeaderboardEntry } from '../lib/backend.js';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentPlayerId: string | null;
  isLoading: boolean;
  onBack: () => void;
}

const LEAGUE_COLORS: Record<string, string> = {
  copper: 'white',
  iron: 'gray',
  silver: 'whiteBright',
  gold: 'yellow',
  diamond: 'cyan',
};

export function LeaderboardView({ entries, currentPlayerId, isLoading, onBack }: LeaderboardViewProps) {
  useInput((input, key) => {
    if (key.escape || input === 'q') onBack();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'🏆  LEADERBOARD'}</Text>
      <Text> </Text>

      {isLoading && <Text color="yellow">Loading...</Text>}

      {!isLoading && entries.length === 0 && (
        <Text dimColor>No players on the leaderboard yet.</Text>
      )}

      {!isLoading && entries.length > 0 && (
        <Box flexDirection="column">
          <Box>
            <Text bold>{'  #  '}</Text>
            <Text bold>{'Name                '}</Text>
            <Text bold>{'League    '}</Text>
            <Text bold>{'Trophies'}</Text>
          </Box>
          {entries.map((e) => {
            const isMe = e.id === currentPlayerId;
            const color = isMe ? 'green' : undefined;
            const leagueColor = LEAGUE_COLORS[e.league] ?? 'white';
            return (
              <Box key={e.id}>
                <Text color={color} bold={isMe}>{String(e.rank).padStart(3, ' ')}  </Text>
                <Text color={color} bold={isMe}>{(e.displayName || 'Unknown').padEnd(20, ' ')}</Text>
                <Text color={leagueColor}>{e.league.padEnd(10, ' ')}</Text>
                <Text color="yellow" bold>{e.trophies}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Text> </Text>
      <Text dimColor>Esc/q back</Text>
    </Box>
  );
}
