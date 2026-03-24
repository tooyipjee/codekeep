#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { loadGame, saveGame } from '@codekeep/server';

export const CLI_VERSION = '1.0.4';
(globalThis as any).__CODEKEEP_VERSION = CLI_VERSION;

const program = new Command();

program
  .name('codekeep')
  .description('CodeKeep: The Pale — deck-building tactical roguelike in your terminal')
  .version(CLI_VERSION)
  .option('--ascii', 'Force ASCII-only rendering (no Unicode box drawing)')
  .option('--compact', 'Compact layout for narrow terminals')
  .option('--tutorial', 'Replay the tutorial')
  .option('--no-save', 'Dry-run mode: play without writing to disk')
  .action((opts) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write(
        'codekeep requires an interactive terminal.\n' +
        'Run it directly in your terminal (not piped or in CI).\n',
      );
      process.exit(1);
    }

    const { waitUntilExit, unmount } = render(
      <App
        asciiMode={opts.ascii ?? false}
        compact={opts.compact ?? false}
        forceTutorial={opts.tutorial ?? false}
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
