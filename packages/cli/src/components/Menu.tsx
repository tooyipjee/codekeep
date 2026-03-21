import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameSave } from '@codekeep/shared';

interface MenuProps {
  gameSave: GameSave;
  onlineMode?: boolean;
  onKeep: () => void;
  onAttack: () => void;
  onDefend: () => void;
  onFriendRaid: () => void;
  onPvp?: () => void;
  onRaidLog: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

function getMenuItems(online: boolean) {
  const items = [
    { key: 'keep', label: 'Build Keep', desc: 'Place and upgrade structures' },
    { key: 'defend', label: 'Defend Keep', desc: 'Watch NPCs attack YOUR defenses' },
    { key: 'attack', label: 'Attack NPC', desc: 'Raid an NPC keep for resources' },
  ];
  if (online) {
    items.push({ key: 'pvp', label: '⚔ PvP Arena', desc: 'Fight real players for trophies' });
  }
  items.push(
    { key: 'friendRaid', label: 'Raid Rival Keep', desc: "Plunder a rival lord's fortress" },
    { key: 'raidLog', label: 'Raid Log', desc: 'View recent raid history' },
    { key: 'settings', label: 'Settings', desc: 'Game options and reset' },
    { key: 'quit', label: 'Rest for the Night', desc: 'Save and exit' },
  );
  return items;
}

export function Menu({ gameSave, onlineMode, onKeep, onAttack, onDefend, onFriendRaid, onPvp, onRaidLog, onSettings, onQuit }: MenuProps) {
  const menuItems = getMenuItems(!!onlineMode);
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (input === 'k' || input === 'w' || key.upArrow) {
      setSelected((s) => Math.max(0, s - 1));
    } else if (input === 'j' || input === 's' || key.downArrow) {
      setSelected((s) => Math.min(menuItems.length - 1, s + 1));
    } else if (key.return) {
      const item = menuItems[selected];
      if (item.key === 'keep') onKeep();
      else if (item.key === 'defend') onDefend();
      else if (item.key === 'attack') onAttack();
      else if (item.key === 'pvp') onPvp?.();
      else if (item.key === 'friendRaid') onFriendRaid();
      else if (item.key === 'raidLog') onRaidLog();
      else if (item.key === 'settings') onSettings();
      else if (item.key === 'quit') onQuit();
    } else if (input === 'q') {
      onQuit();
    }
  });

  const structCount = gameSave.keep.grid.structures.length;
  const p = gameSave.progression;
  const totalRaids = p.totalRaidsWon + p.totalRaidsLost;
  const keepAgeDays = Math.max(1, Math.floor((Date.now() - gameSave.keep.createdAtUnixMs) / 86400000));
  const treasuryCount = gameSave.keep.grid.structures.filter((s) => s.kind === 'treasury').length;
  const archerCount = gameSave.keep.grid.structures.filter((s) => s.kind === 'archerTower').length;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">
        {`
  ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗███████╗███████╗██████╗
 ██╔════╝██╔═══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔════╝██╔══██╗
 ██║     ██║   ██║██║  ██║█████╗  █████╔╝ █████╗  █████╗  ██████╔╝
 ██║     ██║   ██║██║  ██║██╔══╝  ██╔═██╗ ██╔══╝  ██╔══╝  ██╔═══╝
 ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██╗███████╗███████╗██║
  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝`}
      </Text>
      <Text> </Text>
      <Text dimColor>  {gameSave.player.displayName}'s Keep — {keepAgeDays}d old</Text>
      <Text dimColor>  {structCount} structures ({treasuryCount}$ {archerCount}!) · Raids {p.totalRaidsWon}W / {p.totalRaidsLost}L · Streak {p.currentWinStreak} (best {p.bestWinStreak})</Text>
      <Text dimColor>  Difficulty: Lv.{totalRaids <= 2 ? 1 : totalRaids <= 5 ? 2 : totalRaids <= 9 ? 3 : totalRaids <= 14 ? 4 : 5}</Text>
      <Text dimColor>  Achievements: {gameSave.progression.achievements?.length || 0}/{10}</Text>
      <Text> </Text>

      {menuItems.map((item, i) => (
        <Box key={item.key}>
          <Text color={i === selected ? 'yellow' : undefined} bold={i === selected}>
            {i === selected ? ' ▸ ' : '   '}
            {item.label}
          </Text>
          <Text dimColor>  {item.desc}</Text>
        </Box>
      ))}

      <Text> </Text>
      <Text dimColor>  ↑↓ navigate  Enter select  q quit</Text>
    </Box>
  );
}
