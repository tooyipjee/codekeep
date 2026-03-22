import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';

interface DialogueViewProps {
  speaker: string;
  text: string;
  onComplete: () => void;
}

export function DialogueView({ speaker, text, onComplete }: DialogueViewProps) {
  const [displayedChars, setDisplayedChars] = useState(0);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayedChars(0);
    setComplete(false);

    timerRef.current = setInterval(() => {
      setDisplayedChars((prev) => {
        if (prev >= text.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          setComplete(true);
          return prev;
        }
        return prev + 2;
      });
    }, 30);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  const displayText = text.slice(0, displayedChars);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">{speaker}</Text>
      <Text> </Text>
      <Text>{displayText}{!complete ? '▌' : ''}</Text>
      <Text> </Text>
      {complete ? (
        <Text dimColor>Press Enter to continue.</Text>
      ) : (
        <Text dimColor>Press Enter to skip.</Text>
      )}
    </Box>
  );
}
