import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installHook, uninstallHook, isHookInstalled } from '../src/lib/git-hooks.js';

describe('git-hooks', () => {
  let tempDir: string;
  let repoPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codekeep-hooks-'));
    repoPath = join(tempDir, 'repo');
    mkdirSync(join(repoPath, '.git', 'hooks'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('installHook creates a post-commit hook', () => {
    installHook(repoPath);
    const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
    expect(existsSync(hookPath)).toBe(true);
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('#!/bin/sh');
    expect(content).toContain('codekeep-post-commit-hook');
    expect(content).toContain('git_commit');
  });

  it('installHook is idempotent', () => {
    installHook(repoPath);
    installHook(repoPath);
    expect(isHookInstalled(repoPath)).toBe(true);
  });

  it('installHook throws if not a git repo', () => {
    const noGitPath = join(tempDir, 'norepo');
    mkdirSync(noGitPath);
    expect(() => installHook(noGitPath)).toThrow('Not a git repository');
  });

  it('installHook throws if foreign hook exists', () => {
    const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho "foreign hook"', { mode: 0o755 });
    expect(() => installHook(repoPath)).toThrow('already exists');
  });

  it('isHookInstalled returns false when no hook', () => {
    expect(isHookInstalled(repoPath)).toBe(false);
  });

  it('isHookInstalled returns true after install', () => {
    installHook(repoPath);
    expect(isHookInstalled(repoPath)).toBe(true);
  });

  it('isHookInstalled returns false for foreign hook', () => {
    const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho "other"', { mode: 0o755 });
    expect(isHookInstalled(repoPath)).toBe(false);
  });

  it('uninstallHook removes our hook', () => {
    installHook(repoPath);
    expect(isHookInstalled(repoPath)).toBe(true);
    uninstallHook(repoPath);
    expect(isHookInstalled(repoPath)).toBe(false);
  });

  it('uninstallHook is silent when no hook exists', () => {
    expect(() => uninstallHook(repoPath)).not.toThrow();
  });

  it('uninstallHook throws for foreign hook', () => {
    const hookPath = join(repoPath, '.git', 'hooks', 'post-commit');
    writeFileSync(hookPath, '#!/bin/sh\necho "other"', { mode: 0o755 });
    expect(() => uninstallHook(repoPath)).toThrow('not installed by CodeKeep');
  });
});
