import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProbeType } from '@codekeep/shared';
import type { MatchTarget, PvpProfile } from '../lib/backend.js';

interface PvpMenuProps {
  pvpProfile: PvpProfile | null;
  targets: MatchTarget[];
  isSearching: boolean;
  onSearch: () => void;
  onAttack: (target: MatchTarget, probeTypes: ProbeType[]) => void;
  onWarCamp: () => void;
  onLeaderboard: () => void;
  onBack: () => void;
}

const LEAGUE_COLORS: Record<string, string> = {
  copper: 'white',
  iron: 'gray',
  silver: 'whiteBright',
  gold: 'yellow',
  diamond: 'cyan',
};

const LEAGUE_ICONS: Record<string, string> = {
  copper: '○',
  iron: '●',
  silver: '◆',
  gold: '★',
  diamond: '◈',
};

export function PvpMenu({ pvpProfile, targets, isSearching, onSearch, onAttack, onWarCamp, onLeaderboard, onBack }: PvpMenuProps) {
  const [selected, setSelected] = useState(0);
  const items = [
    { key: 'search', label: 'Find Opponent' },
    { key: 'warcamp', label: 'War Camp' },
    { key: 'leaderboard', label: 'Leaderboard' },
    ...targets.map((t, i) => ({ key: `target-${i}`, label: `Attack ${t.displayName} (${t.trophies} trophies)` })),
    { key: 'back', label: 'Back' },
  ];

  useInput((input, key) => {
    if (key.upArrow || input === 'k') setSelected((s) => Math.max(0, s - 1));
    else if (key.downArrow || input === 'j') setSelected((s) => Math.min(items.length - 1, s + 1));
    else if (key.return) {
      const item = items[selected];
      if (item.key === 'search') onSearch();
      else if (item.key === 'warcamp') onWarCamp();
      else if (item.key === 'leaderboard') onLeaderboard();
      else if (item.key === 'back') onBack();
      else if (item.key.startsWith('target-')) {
        const idx = parseInt(item.key.split('-')[1]);
        const target = targets[idx];
        if (target) onAttack(target, ['raider', 'raider', 'raider', 'scout', 'brute']);
      }
    }
    else if (key.escape || input === 'q') onBack();
  });

  const league = pvpProfile?.league ?? 'copper';
  const leagueColor = LEAGUE_COLORS[league] ?? 'white';
  const leagueIcon = LEAGUE_ICONS[league] ?? '○';

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">{'⚔  PVP ARENA'}</Text>
      <Text> </Text>

      {pvpProfile && (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={2}>
            <Text color={leagueColor} bold>{leagueIcon} {league.toUpperCase()} League</Text>
            <Text>Trophies: <Text bold color="yellow">{pvpProfile.trophies}</Text></Text>
          </Box>
          {pvpProfile.shieldExpiresAt && pvpProfile.shieldExpiresAt > Date.now() && (
            <Text color="cyan">Shield active ({Math.ceil((pvpProfile.shieldExpiresAt - Date.now()) / 3600000)}h remaining)</Text>
          )}
          <Text> </Text>
        </Box>
      )}

      {isSearching && <Text color="yellow">Searching for opponents...</Text>}

      {items.map((item, i) => (
        <Box key={item.key}>
          <Text color={i === selected ? 'yellow' : undefined} bold={i === selected}>
            {i === selected ? ' ▸ ' : '   '}
            {item.label}
          </Text>
        </Box>
      ))}

      <Text> </Text>
      <Text dimColor>↑↓ select  Enter choose  Esc back</Text>
    </Box>
  );
}
