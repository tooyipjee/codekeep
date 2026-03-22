#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { loadGame, saveGame } from '@codekeep/server';

export const CLI_VERSION = '0.2.3';
(globalThis as any).__CODEKEEP_VERSION = CLI_VERSION;

const program = new Command();

program
  .name('codekeep')
  .description('Async tower defense terminal game powered by your coding activity')
  .version(CLI_VERSION)
  .option('--ascii', 'Force ASCII-only rendering (no Unicode box drawing)')
  .option('--compact', 'Compact layout for narrow terminals')
  .option('--tutorial', 'Replay the tutorial')
  .option('--resume', 'Skip menu, jump straight to keep')
  .option('--no-save', 'Dry-run mode: play without writing to disk')
  .option('--stats', 'Print save file stats as JSON (headless, no TUI)')
  .option('--online <url>', 'Connect to a CodeKeep server for multiplayer')
  .option('--server <url>', 'Alias for --online')
  .action((opts) => {
    if (opts.stats) {
      const save = loadGame();
      if (!save) {
        process.stdout.write(JSON.stringify({ error: 'No save file found' }) + '\n');
        process.exit(1);
      }
      const p = save.progression;
      const stats = {
        version: CLI_VERSION,
        player: save.player.displayName,
        keepAge: Math.max(1, Math.floor((Date.now() - save.keep.createdAtUnixMs) / 86400000)),
        structures: save.keep.grid.structures.length,
        resources: save.keep.resources,
        raids: { won: p.totalRaidsWon, lost: p.totalRaidsLost, winStreak: p.currentWinStreak, bestStreak: p.bestWinStreak },
        achievements: p.achievements?.length ?? 0,
        tutorialCompleted: save.tutorialCompleted,
        lastPlayed: new Date(save.lastPlayedAtUnixMs).toISOString(),
      };
      process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
      process.exit(0);
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write(
        'codekeep requires an interactive terminal.\n' +
        'Run it directly in your terminal (not piped or in CI).\n' +
        'Use --stats for headless save file info.\n',
      );
      process.exit(1);
    }

    const hasSave = !!loadGame();
    const serverUrl = opts.online || opts.server || process.env.CODEKEEP_SERVER;

    const { waitUntilExit, unmount } = render(
      <App
        asciiMode={opts.ascii ?? false}
        compact={opts.compact ?? false}
        forceTutorial={opts.tutorial ?? false}
        autoResume={(opts.resume ?? false) && hasSave}
        serverUrl={serverUrl}
        dryRun={opts.save === false}
      />,
      {
        exitOnCtrlC: false,
      },
    );

    let exiting = false;

    function gracefulExit() {
      if (exiting) return;
      exiting = true;

      if (opts.save !== false) {
        process.stderr.write('\nSaving...\n');
        try {
          const save = loadGame();
          if (save) saveGame(save);
        } catch {
          // best-effort save
        }
      }
      unmount();
    }

    process.on('SIGINT', gracefulExit);
    process.on('SIGTERM', gracefulExit);
    process.on('SIGHUP', gracefulExit);

    waitUntilExit().then(() => {
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  });

program.parse();
