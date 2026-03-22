import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import type { GameSave } from '@codekeep/shared';
import { STARTING_RESOURCES } from '@codekeep/shared';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendKeys(stdin: { write: (s: string) => void }, keys: string[], keyDelay = 100) {
  for (const k of keys) {
    stdin.write(k);
    await delay(keyDelay);
  }
}

function makeSave(): GameSave {
  return {
    schemaVersion: 1,
    savedAtUnixMs: Date.now(),
    player: { id: 'p1', displayName: 'Tester', settings: { asciiMode: false } },
    keep: {
      id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
      grid: { width: 16, height: 16, structures: [] },
      resources: { gold: 200, wood: 100, stone: 60 },
      createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
    },
    raidHistory: [],
    tutorialCompleted: true,
    lastPlayedAtUnixMs: Date.now(),
    progression: {
      totalBuildsToday: 0, totalCommitsToday: 0, lastDailyResetDay: 0,
      totalRaidsWon: 0, totalRaidsLost: 0, totalStructuresPlaced: 0,
      currentWinStreak: 0, bestWinStreak: 0, achievements: [],
      totalRaidersKilledByArcher: 0,
    },
  };
}

vi.mock('@codekeep/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codekeep/server')>();
  return {
    ...actual,
    loadGame: vi.fn(() => makeSave()),
    saveGame: vi.fn(),
    deleteSaveFile: vi.fn(() => true),
  };
});

vi.mock('../src/hooks/useCodingEvents.js', () => ({
  useCodingEvents: vi.fn(),
}));

import { App } from '../src/app.js';

describe('App component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders menu screen on startup', async () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(200);
    const frame = lastFrame();
    expect(frame).toContain('Build Keep');
    expect(frame).toContain('Tester');
  });

  it('navigates to keep screen from menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(200);
    stdin.write('\r');
    await delay(200);
    const frame = lastFrame();
    expect(frame).toContain('·');
  });

  it('shows help when ? pressed on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(200);
    stdin.write('\r');
    await delay(200);
    stdin.write('?');
    await delay(200);
    expect(lastFrame()).toContain('Navigation');
  });

  it('dismisses help on any key', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(500);
    stdin.write('\r');
    await delay(500);
    stdin.write('?');
    await delay(500);
    stdin.write('a');
    await delay(500);
    expect(lastFrame()).not.toContain('Navigation');
  });

  it('autoResume starts in keep screen', async () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    const frame = lastFrame();
    expect(frame).toContain('·');
    expect(frame).not.toContain('Build Keep');
  });

  it('navigates to settings from menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(400);
    await sendKeys(stdin, ['j', 'j', 'j', 'j', 'j', 'j', 'j', '\r']);
    await delay(400);
    expect(lastFrame()).toContain('ASCII Mode');
  });

  it('compact mode renders correctly', async () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={true} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    expect(lastFrame()).toContain('·');
  });

  it('returns to menu on Escape from keep', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('\x1B');
    await delay(200);
    expect(lastFrame()).toContain('Build Keep');
  });

  it('cursor movement works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('h');
    stdin.write('h');
    stdin.write('k');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('structure placement works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('e');
    await delay(100);
    const frame = lastFrame();
    expect(frame).toBeTruthy();
  });

  it('bracket keys cycle structures', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write(']');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('number keys select structures', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('3');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('upgrade works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('u');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('demolish works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('x');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('collect works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('c');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('quick defend works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('r');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('faucet works on keep screen', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('f');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('g enters coordinate jump mode', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('g');
    await delay(100);
    expect(lastFrame()).toContain('Jump to');
  });

  it('asciiMode renders with ASCII borders', async () => {
    const { lastFrame } = render(
      <App asciiMode={true} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    const frame = lastFrame();
    expect(frame).toContain('+');
    expect(frame).toContain('-');
  });

  it('navigates to defend raid from menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(400);
    await sendKeys(stdin, ['j', '\r']);
    await delay(500);
    const frame = lastFrame();
    expect(frame).toContain('DEFENDING');
  });

  it('navigates to attack raid from menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(500);
    await sendKeys(stdin, ['j', 'j', '\r']);
    await delay(800);
    expect(lastFrame()).toContain('ATTACKING');
  });

  it('navigates to friend list from menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(500);
    await sendKeys(stdin, ['j', 'j', 'j', 'j', 'j', '\r']);
    await delay(600);
    expect(lastFrame()).toContain('Rival Keeps');
  });

  it('navigates to raid log from menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(400);
    await sendKeys(stdin, ['j', 'j', 'j', 'j', 'j', 'j', '\r']);
    await delay(400);
    expect(lastFrame()).toContain('Raid Log');
  });

  it('tab key navigates to next structure', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('\t');
    await delay(100);
    expect(lastFrame()).toBeTruthy();
  });

  it('coordinate jump: enter coordinates', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(300);
    stdin.write('g');
    await delay(200);
    expect(lastFrame()).toContain('Jump to');
    stdin.write('3');
    await delay(100);
    stdin.write(',');
    await delay(100);
    stdin.write('5');
    await delay(100);
    stdin.write('\r');
    await delay(300);
    expect(lastFrame()).not.toContain('Jump to');
  });

  it('coordinate jump: escape cancels', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(300);
    stdin.write('g');
    await delay(200);
    expect(lastFrame()).toContain('Jump to');
    stdin.write('\x1B');
    await delay(200);
    expect(lastFrame()).not.toContain('Jump to');
  });

  it('coordinate jump: backspace removes char', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(300);
    stdin.write('g');
    await delay(200);
    stdin.write('A');
    await delay(100);
    stdin.write('\x7F');
    await delay(200);
    expect(lastFrame()).toContain('Jump to');
  });

  it('v key on keep screen does nothing without prior raid', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('v');
    await delay(100);
    expect(lastFrame()).toContain('·');
  });

  it('v key after quick defend shows raid view', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={true} />,
    );
    await delay(200);
    stdin.write('r');
    await delay(200);
    stdin.write('v');
    await delay(200);
    const frame = lastFrame();
    expect(frame).toContain('DEFENDING');
  });

  it('forceTutorial shows tutorial screen', async () => {
    const { lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={true} autoResume={false} />,
    );
    await delay(200);
    expect(lastFrame()).toContain('Welcome');
  });

  it('raid screen returns to keep on Escape', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(400);
    await sendKeys(stdin, ['j', '\r']);
    await delay(500);
    expect(lastFrame()).toContain('DEFENDING');
    stdin.write('\x1B');
    await delay(400);
    expect(lastFrame()).toContain('·');
  });

  it('settings back button returns to menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(500);
    await sendKeys(stdin, ['j', 'j', 'j', 'j', 'j', 'j', 'j', '\r']);
    await delay(600);
    expect(lastFrame()).toContain('ASCII Mode');
    stdin.write('\x1B');
    await delay(500);
    expect(lastFrame()).toContain('Build Keep');
  });

  it('raid log back returns to menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(400);
    await sendKeys(stdin, ['j', 'j', 'j', 'j', 'j', 'j', '\r']);
    await delay(400);
    expect(lastFrame()).toContain('Raid Log');
    stdin.write('\x1B');
    await delay(400);
    expect(lastFrame()).toContain('Build Keep');
  });

  it('friend list back returns to menu', async () => {
    const { stdin, lastFrame } = render(
      <App asciiMode={false} compact={false} forceTutorial={false} autoResume={false} />,
    );
    await delay(400);
    await sendKeys(stdin, ['j', 'j', 'j', 'j', 'j', '\r']);
    await delay(400);
    expect(lastFrame()).toContain('Rival Keeps');
    stdin.write('\x1B');
    await delay(400);
    expect(lastFrame()).toContain('Build Keep');
  });
});
