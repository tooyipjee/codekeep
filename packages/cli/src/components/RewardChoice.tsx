import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RewardOption } from '@codekeep/shared';

interface RewardChoiceProps {
  options: RewardOption[];
  anomalyNames?: string[];
  onClaim: (rewardId: string) => void;
  onDismiss: () => void;
}

export function RewardChoice({ options, anomalyNames, onClaim, onDismiss }: RewardChoiceProps) {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.leftArrow || input === 'h') {
      setSelected((s) => Math.max(0, s - 1));
    } else if (key.rightArrow || input === 'l') {
      setSelected((s) => Math.min(options.length - 1, s + 1));
    } else if (key.return || input === ' ') {
      onClaim(options[selected].id);
    } else if (key.escape || input === 'q') {
      onDismiss();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
      <Text bold color="yellow">{'★ Victory! Choose your reward ★'}</Text>
      {anomalyNames && anomalyNames.length > 0 && (
        <Text dimColor>Anomalies faced: {anomalyNames.join(', ')}</Text>
      )}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        {options.map((opt, i) => (
          <Box
            key={opt.id}
            flexDirection="column"
            borderStyle={i === selected ? 'bold' : 'single'}
            borderColor={i === selected ? 'yellow' : 'gray'}
            paddingX={2}
            paddingY={1}
            width={26}
          >
            <Text bold color={i === selected ? 'yellow' : 'white'}>
              {opt.icon} {opt.name}
            </Text>
            <Text dimColor={i !== selected}>{opt.description}</Text>
            {i === selected && <Text color="green">{'▲ [Enter] Claim'}</Text>}
          </Box>
        ))}
      </Box>
      <Text dimColor>{'← → to browse  |  Enter to claim  |  Esc to skip'}</Text>
    </Box>
  );
}
