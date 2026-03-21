import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
    openSync: vi.fn(),
    readSync: vi.fn(),
    closeSync: vi.fn(),
    watch: vi.fn(),
  };
});

import {
  existsSync,
  statSync,
  openSync,
  readSync,
  closeSync,
  watch,
} from 'node:fs';
import { useCodingEvents } from '../src/hooks/useCodingEvents.js';

function TestComponent({ onEvent }: { onEvent: (event: any) => void }) {
  useCodingEvents(onEvent);
  return <Text>ready</Text>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('useCodingEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when events file does not exist', async () => {
    (existsSync as any).mockReturnValue(false);
    (watch as any).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    await vi.advanceTimersByTimeAsync(3000);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('processes new lines from events file on poll', async () => {
    const eventLine = JSON.stringify({
      type: 'git_commit',
      timestamp: 123,
      grants: { gold: 10, wood: 5, stone: 3 },
    });
    let pollCalls = 0;

    (existsSync as any).mockReturnValue(true);
    (statSync as any).mockImplementation(() => {
      pollCalls++;
      if (pollCalls <= 1) return { size: 0 };
      return { size: Buffer.byteLength(eventLine + '\n') };
    });
    (openSync as any).mockReturnValue(42);
    (readSync as any).mockImplementation(
      (_fd: number, buf: Buffer, _off: number, len: number, _pos: number) => {
        const content = eventLine + '\n';
        buf.write(content, 0, len);
        return len;
      },
    );
    (closeSync as any).mockImplementation(() => {});
    (watch as any).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    await vi.advanceTimersByTimeAsync(2500);
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'git_commit' }),
    );
  });

  it('skips malformed JSON lines', async () => {
    const badLine = 'not valid json';
    const goodLine = JSON.stringify({ type: 'git_commit', timestamp: 1 });
    const content = badLine + '\n' + goodLine + '\n';

    (existsSync as any).mockReturnValue(true);
    (statSync as any)
      .mockReturnValueOnce({ size: 0 })
      .mockReturnValue({ size: Buffer.byteLength(content) });
    (openSync as any).mockReturnValue(10);
    (readSync as any).mockImplementation(
      (_fd: number, buf: Buffer, _off: number, len: number) => {
        buf.write(content, 0, len);
        return len;
      },
    );
    (closeSync as any).mockImplementation(() => {});
    (watch as any).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    await vi.advanceTimersByTimeAsync(2500);
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'git_commit' }),
    );
  });

  it('handles statSync errors gracefully', async () => {
    (existsSync as any).mockReturnValue(true);
    (statSync as any).mockImplementation(() => {
      throw new Error('permission denied');
    });
    (watch as any).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    await vi.advanceTimersByTimeAsync(2500);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('handles readSync errors gracefully', async () => {
    (existsSync as any).mockReturnValue(true);
    (statSync as any)
      .mockReturnValueOnce({ size: 0 })
      .mockReturnValue({ size: 100 });
    (openSync as any).mockImplementation(() => {
      throw new Error('open failed');
    });
    (watch as any).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    await vi.advanceTimersByTimeAsync(2500);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('resets offset when file is truncated', async () => {
    const line1 = JSON.stringify({ type: 'git_commit', timestamp: 1 });
    const fullContent = line1 + '\n';
    const fullSize = Buffer.byteLength(fullContent);

    let pollCount = 0;
    (existsSync as any).mockReturnValue(true);
    (statSync as any).mockImplementation(() => {
      pollCount++;
      if (pollCount <= 1) return { size: fullSize };
      if (pollCount === 2) return { size: fullSize };
      return { size: 5 };
    });
    (openSync as any).mockReturnValue(10);
    (readSync as any).mockImplementation(
      (_fd: number, buf: Buffer, _off: number, len: number) => {
        const partial = line1.slice(0, len) + '\n';
        buf.write(partial, 0, len);
        return len;
      },
    );
    (closeSync as any).mockImplementation(() => {});
    (watch as any).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    await vi.advanceTimersByTimeAsync(5000);
    expect(closeSync).toHaveBeenCalled();
  });

  it('uses file watcher when available', async () => {
    let watchCallback: Function | null = null;
    const mockWatcher = { close: vi.fn() };

    (existsSync as any).mockReturnValue(true);
    (statSync as any).mockReturnValue({ size: 0 });
    (watch as any).mockImplementation((_path: string, cb: Function) => {
      watchCallback = cb;
      return mockWatcher;
    });

    const onEvent = vi.fn();
    const { unmount } = render(<TestComponent onEvent={onEvent} />);

    expect(watch).toHaveBeenCalled();

    unmount();
    expect(mockWatcher.close).toHaveBeenCalled();
  });

  it('processes events when watcher fires', async () => {
    let watchCallback: Function | null = null;
    const mockWatcher = { close: vi.fn() };
    const eventLine = JSON.stringify({
      type: 'git_commit',
      timestamp: 999,
      grants: { gold: 5, wood: 5, stone: 5 },
    });

    (existsSync as any).mockReturnValue(true);
    let statCallCount = 0;
    (statSync as any).mockImplementation(() => {
      statCallCount++;
      if (statCallCount <= 1) return { size: 0 };
      return { size: Buffer.byteLength(eventLine + '\n') };
    });
    (openSync as any).mockReturnValue(7);
    (readSync as any).mockImplementation(
      (_fd: number, buf: Buffer, _off: number, len: number) => {
        buf.write(eventLine + '\n', 0, len);
        return len;
      },
    );
    (closeSync as any).mockImplementation(() => {});
    (watch as any).mockImplementation((_path: string, cb: Function) => {
      watchCallback = cb;
      return mockWatcher;
    });

    const onEvent = vi.fn();
    render(<TestComponent onEvent={onEvent} />);

    watchCallback!();
    await vi.advanceTimersByTimeAsync(100);

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'git_commit', timestamp: 999 }),
    );
  });
});
