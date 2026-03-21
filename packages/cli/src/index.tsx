#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { loadGame, saveGame } from '@codekeep/server';

const program = new Command();

program
  .name('codekeep')
  .description('Async tower defense terminal game powered by your coding activity')
  .version('0.1.0')
  .option('--ascii', 'Force ASCII-only rendering (no Unicode box drawing)')
  .option('--compact', 'Compact layout for narrow terminals')
  .option('--tutorial', 'Replay the tutorial')
  .option('--resume', 'Skip menu, jump straight to keep')
  .action((opts) => {
    const hasSave = !!loadGame();

    const { waitUntilExit, unmount } = render(
      <App
        asciiMode={opts.ascii ?? false}
        compact={opts.compact ?? false}
        forceTutorial={opts.tutorial ?? false}
        autoResume={(opts.resume ?? false) && hasSave}
      />,
      {
        exitOnCtrlC: false,
      },
    );

    let exiting = false;

    function gracefulExit() {
      if (exiting) return;
      exiting = true;

      process.stderr.write('\nSaving...\n');
      try {
        const save = loadGame();
        if (save) saveGame(save);
      } catch {
        // best-effort save
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
