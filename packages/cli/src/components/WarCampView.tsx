import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { WarCamp, ProbeType, Resources } from '@codekeep/shared';
import { WARCAMP_TRAIN_COST, WARCAMP_TRAIN_TIME_MS, RAIDER_TYPES, RESOURCE_ICONS } from '@codekeep/shared';

interface WarCampViewProps {
  warCamp: WarCamp;
  resources: Resources;
  onTrain: (slotId: number, type: ProbeType) => void;
  onBack: () => void;
}

const RAIDER_OPTIONS: { type: ProbeType; name: string; symbol: string }[] = [
  { type: 'raider', name: 'Raider', symbol: 'R' },
  { type: 'scout', name: 'Scout', symbol: 'S' },
  { type: 'brute', name: 'Brute', symbol: 'B' },
];

function formatTime(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function WarCampView({ warCamp, resources, onTrain, onBack }: WarCampViewProps) {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [selectingType, setSelectingType] = useState(false);
  const [typeIndex, setTypeIndex] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (selectingType) {
      if (key.upArrow || input === 'k') setTypeIndex((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setTypeIndex((i) => Math.min(RAIDER_OPTIONS.length - 1, i + 1));
      else if (key.return) {
        onTrain(selectedSlot, RAIDER_OPTIONS[typeIndex].type);
        setSelectingType(false);
      }
      else if (key.escape) setSelectingType(false);
      return;
    }
    if (key.upArrow || input === 'k') setSelectedSlot((i) => Math.max(0, i - 1));
    else if (key.downArrow || input === 'j') setSelectedSlot((i) => Math.min(warCamp.maxSlots - 1, i + 1));
    else if (key.return) {
      const slot = warCamp.slots[selectedSlot];
      if (!slot?.raiderType) setSelectingType(true);
    }
    else if (key.escape || input === 'q') onBack();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">{'⚔  WAR CAMP'}</Text>
      <Text dimColor>Train raiders for PvP attacks</Text>
      <Text> </Text>

      <Box flexDirection="row" gap={2}>
        <Text>Gold: {resources.gold}{RESOURCE_ICONS.gold}</Text>
        <Text>Wood: {resources.wood}{RESOURCE_ICONS.wood}</Text>
        <Text>Stone: {resources.stone}{RESOURCE_ICONS.stone}</Text>
      </Box>
      <Text> </Text>

      <Text bold>Slots ({warCamp.slots.filter(s => s.raiderType).length}/{warCamp.maxSlots})</Text>
      {Array.from({ length: warCamp.maxSlots }, (_, i) => {
        const slot = warCamp.slots[i];
        const isSelected = selectedSlot === i;
        const isReady = slot?.readyAtMs ? slot.readyAtMs <= now : false;
        const isTraining = slot?.readyAtMs ? slot.readyAtMs > now : false;
        const remaining = isTraining && slot?.readyAtMs ? slot.readyAtMs - now : 0;

        let status: string;
        if (!slot?.raiderType) {
          status = '[ Empty ]';
        } else if (isTraining) {
          status = `${slot.raiderType} training... ${formatTime(remaining)}`;
        } else if (isReady) {
          status = `${slot.raiderType} READY!`;
        } else {
          status = `${slot.raiderType}`;
        }

        return (
          <Box key={i}>
            <Text color={isSelected ? 'yellow' : undefined} bold={isSelected}>
              {isSelected ? ' ▸ ' : '   '}
              Slot {i + 1}: {status}
            </Text>
          </Box>
        );
      })}

      {selectingType && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">Select raider type:</Text>
          {RAIDER_OPTIONS.map((opt, i) => {
            const cost = WARCAMP_TRAIN_COST[opt.type];
            const time = WARCAMP_TRAIN_TIME_MS[opt.type];
            const stats = RAIDER_TYPES[opt.type];
            const canAfford = resources.gold >= cost.gold && resources.wood >= cost.wood && resources.stone >= cost.stone;
            return (
              <Box key={opt.type}>
                <Text color={typeIndex === i ? 'yellow' : canAfford ? undefined : 'red'} bold={typeIndex === i}>
                  {typeIndex === i ? ' ▸ ' : '   '}
                  {opt.name} — HP:{stats.hp} DMG:{stats.damage} SPD:{stats.speed} — {cost.gold}g {cost.wood}w {cost.stone}s — {formatTime(time)}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Text> </Text>
      <Text dimColor>↑↓ select  Enter train  Esc back</Text>
    </Box>
  );
}
