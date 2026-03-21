import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameSave, RaidRecord } from '@codekeep/shared';
import { ACHIEVEMENTS } from '@codekeep/shared';

interface RaidLogProps {
  gameSave: GameSave;
  onBack: () => void;
  onWatchReplay?: (record: RaidRecord) => void;
}

export function RaidLog({ gameSave, onBack, onWatchReplay }: RaidLogProps) {
  const [tab, setTab] = useState<'raids' | 'achievements'>('raids');
  const [selected, setSelected] = useState(0);

  const raids = [...gameSave.raidHistory].reverse().slice(0, 15);

  useInput((input, key) => {
    if (input === 'q' || key.escape) { onBack(); return; }
    if (key.tab || input === 't') {
      setTab(t => t === 'raids' ? 'achievements' : 'raids');
    }

    if (tab === 'raids' && raids.length > 0) {
      if (input === 'j' || key.downArrow) setSelected(s => Math.min(s + 1, raids.length - 1));
      if (input === 'k' || key.upArrow) setSelected(s => Math.max(s - 1, 0));
      if ((key.return || input === 'v') && raids[selected] && onWatchReplay) {
        onWatchReplay(raids[selected]);
      }
    }
  });

  const p = gameSave.progression;

  return (
    <Box flexDirection="column" padding={1}>
      <Box gap={2}>
        <Text bold color={tab === 'raids' ? 'yellow' : undefined}
              underline={tab === 'raids'}>Raid Log</Text>
        <Text bold color={tab === 'achievements' ? 'yellow' : undefined}
              underline={tab === 'achievements'}>Achievements</Text>
        <Text dimColor>(Tab to switch)</Text>
      </Box>
      <Text> </Text>

      {tab === 'raids' && (
        <Box flexDirection="column">
          <Text dimColor>  Total: {p.totalRaidsWon}W / {p.totalRaidsLost}L · Streak: {p.currentWinStreak} (best {p.bestWinStreak})</Text>
          <Text> </Text>
          {raids.length === 0 ? (
            <Text dimColor>  No raids yet. Try Defend Keep or Attack NPC!</Text>
          ) : (
            raids.map((r, i) => {
              const ago = formatAgo(r.resolvedAtUnixMs);
              const isDefense = r.attackerId !== gameSave.player.id;
              const icon = r.outcome === 'defense_win'
                ? (isDefense ? '✓' : '✗')
                : (isDefense ? '✗' : '✓');
              const color = (isDefense ? r.outcome === 'defense_win' : r.outcome !== 'defense_win') ? 'green' : 'red';
              const type = isDefense ? 'DEF' : 'ATK';
              const lootStr = r.lootLost.memory > 0 ? ` -${r.lootLost.memory}M` : '';
              const gainStr = r.lootGained.compute + r.lootGained.memory + r.lootGained.bandwidth > 0
                ? ` +${r.lootGained.compute}C+${r.lootGained.memory}M+${r.lootGained.bandwidth}B`
                : '';
              const sel = i === selected ? '>' : ' ';
              return (
                <Text key={r.id} dimColor={i > 4 && i !== selected} bold={i === selected}>
                  {sel} <Text color={color}>{icon}</Text> {type} {r.outcome.replace('_', ' ')}{lootStr}{gainStr} <Text dimColor>({ago})</Text>
                </Text>
              );
            })
          )}
          {raids.length > 0 && (
            <>
              <Text> </Text>
              <Text dimColor>  j/k navigate · Enter/v watch replay</Text>
            </>
          )}
        </Box>
      )}

      {tab === 'achievements' && (
        <Box flexDirection="column">
          <Text dimColor>  {p.achievements?.length || 0} / {ACHIEVEMENTS.length} earned</Text>
          <Text> </Text>
          {ACHIEVEMENTS.map((a) => {
            const earned = p.achievements?.includes(a.id);
            return (
              <Box key={a.id}>
                <Text color={earned ? 'green' : undefined} dimColor={!earned}>
                  {'  '}{earned ? '★' : '☆'} <Text bold={earned}>{a.name}</Text> — {a.desc}
                  {a.bonus && earned ? <Text color="yellow"> ({a.bonus})</Text> : null}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Text> </Text>
      <Text dimColor>  Tab switch · Esc/q back</Text>
    </Box>
  );
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
