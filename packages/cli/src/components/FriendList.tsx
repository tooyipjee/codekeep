import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Keep } from '@codekeep/shared';
import { generateNpcKeep } from '@codekeep/server';

interface NpcFriend {
  name: string;
  seed: string;
  difficulty: number;
  tagline: string;
}

const NPC_FRIENDS: NpcFriend[] = [
  { name: 'ByteBandit', seed: 'friend-bytebandit-42', difficulty: 1, tagline: 'Hoards data like a digital raccoon' },
  { name: 'NullPointer', seed: 'friend-nullptr-99', difficulty: 2, tagline: 'Leaves segfaults in their wake' },
  { name: 'StackOverflow', seed: 'friend-stackoverflow-256', difficulty: 3, tagline: 'Recursion is their love language' },
];

interface FriendListProps {
  onSelectFriend: (friendKeep: Keep) => void;
  onBack: () => void;
}

export function FriendList({ onSelectFriend, onBack }: FriendListProps) {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (input === 'k' || input === 'w' || key.upArrow) {
      setSelected((s) => Math.max(0, s - 1));
    } else if (input === 'j' || input === 's' || key.downArrow) {
      setSelected((s) => Math.min(NPC_FRIENDS.length - 1, s + 1));
    } else if (key.return) {
      const friend = NPC_FRIENDS[selected];
      const keep = generateNpcKeep(friend.seed, friend.difficulty);
      keep.name = `${friend.name}'s Keep`;
      keep.ownerPlayerId = friend.name.toLowerCase();
      onSelectFriend(keep);
    } else if (input === 'q' || key.escape) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">{'⚔ Raid Friend '}</Text>
        <Text bold color="yellow">{'[ LOCAL SIMULATION ]'}</Text>
      </Box>
      <Text> </Text>
      <Text dimColor>  Pick a friend's keep to raid. Results are simulated locally.</Text>
      <Text> </Text>

      {NPC_FRIENDS.map((friend, i) => (
        <Box key={friend.name} flexDirection="column">
          <Box>
            <Text color={i === selected ? 'yellow' : undefined} bold={i === selected}>
              {i === selected ? ' ▸ ' : '   '}
              {friend.name}
            </Text>
            <Text dimColor>  Lv.{friend.difficulty}</Text>
          </Box>
          {i === selected && (
            <Text dimColor>     "{friend.tagline}"</Text>
          )}
        </Box>
      ))}

      <Text> </Text>
      <Text dimColor>  ↑↓ navigate  Enter raid  Esc back</Text>
    </Box>
  );
}
