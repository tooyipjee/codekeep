import { useEffect, useRef, useCallback } from 'react';
import { existsSync, statSync, openSync, readSync, closeSync, watch, type FSWatcher } from 'node:fs';
import type { CodingEvent } from '@codekeep/shared';
import { EVENTS_FILE } from '../lib/git-hooks.js';

const POLL_INTERVAL_MS = 2000;

export function useCodingEvents(onEvent: (event: CodingEvent) => void) {
  const offsetRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const processNewLines = useCallback(() => {
    if (!existsSync(EVENTS_FILE)) return;

    let size: number;
    try {
      size = statSync(EVENTS_FILE).size;
    } catch {
      return;
    }

    if (size < offsetRef.current) offsetRef.current = 0;
    if (size <= offsetRef.current) return;

    let chunk: string;
    let fd: number | undefined;
    try {
      const buf = Buffer.alloc(size - offsetRef.current);
      fd = openSync(EVENTS_FILE, 'r');
      readSync(fd, buf, 0, buf.length, offsetRef.current);
      chunk = buf.toString('utf-8');
    } catch {
      return;
    } finally {
      if (fd !== undefined) closeSync(fd);
    }

    offsetRef.current = size;

    const lines = chunk.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as CodingEvent;
        onEventRef.current(event);
      } catch {
        // skip malformed lines
      }
    }
  }, []);

  useEffect(() => {
    if (existsSync(EVENTS_FILE)) {
      try {
        offsetRef.current = statSync(EVENTS_FILE).size;
      } catch {
        offsetRef.current = 0;
      }
    }

    let watcher: FSWatcher | null = null;
    try {
      watcher = watch(EVENTS_FILE, () => processNewLines());
    } catch {
      // file might not exist yet — fall through to polling
    }

    const timer = setInterval(processNewLines, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      watcher?.close();
    };
  }, [processNewLines]);
}
