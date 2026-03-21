import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { CODING_EVENT_GRANTS } from '@codekeep/shared';

export const EVENTS_DIR = join(homedir(), '.config', 'codekeep');
export const EVENTS_FILE = join(EVENTS_DIR, 'events.jsonl');

const HOOK_MARKER = '# codekeep-post-commit-hook';

function hookPath(repoPath: string): string {
  return join(repoPath, '.git', 'hooks', 'post-commit');
}

/**
 * Shell script installed as .git/hooks/post-commit.
 * Appends a single JSON line to the shared events file on each commit.
 */
function hookScript(): string {
  const grants = CODING_EVENT_GRANTS['git_commit'];
  const eventsFile = EVENTS_FILE;
  const eventsDir = EVENTS_DIR;

  return [
    '#!/bin/sh',
    HOOK_MARKER,
    `EVENTS_DIR="${eventsDir}"`,
    `EVENTS_FILE="${eventsFile}"`,
    'mkdir -p "$EVENTS_DIR"',
    `TIMESTAMP=$(date +%s)000`,
    `printf '{"type":"git_commit","timestamp":%s,"grants":{"compute":${grants.compute},"memory":${grants.memory},"bandwidth":${grants.bandwidth}}}\\n' "$TIMESTAMP" >> "$EVENTS_FILE"`,
    '',
  ].join('\n');
}

export function installHook(repoPath: string): void {
  const gitDir = join(repoPath, '.git');
  if (!existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  const hooksDir = join(gitDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });

  const target = hookPath(repoPath);

  if (existsSync(target)) {
    const existing = readFileSync(target, 'utf-8');
    if (existing.includes(HOOK_MARKER)) {
      return; // already installed
    }
    throw new Error(
      `A post-commit hook already exists at ${target}. Remove it first or add CodeKeep manually.`,
    );
  }

  writeFileSync(target, hookScript(), { mode: 0o755 });
}

export function uninstallHook(repoPath: string): void {
  const target = hookPath(repoPath);
  if (!existsSync(target)) return;

  const contents = readFileSync(target, 'utf-8');
  if (!contents.includes(HOOK_MARKER)) {
    throw new Error(
      `post-commit hook at ${target} was not installed by CodeKeep — refusing to remove.`,
    );
  }

  unlinkSync(target);
}

export function isHookInstalled(repoPath: string): boolean {
  const target = hookPath(repoPath);
  if (!existsSync(target)) return false;
  const contents = readFileSync(target, 'utf-8');
  return contents.includes(HOOK_MARKER);
}
