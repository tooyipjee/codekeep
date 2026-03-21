import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CRASH_DIR = join(homedir(), '.config', 'codekeep', 'crashes');

export interface CrashReport {
  timestamp: string;
  error: string;
  stack?: string;
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  screen?: string;
  gameState?: string;
}

export function saveCrashReport(error: unknown, context?: { screen?: string; gameState?: string }): string {
  if (!existsSync(CRASH_DIR)) {
    mkdirSync(CRASH_DIR, { recursive: true });
  }

  const report: CrashReport = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    version: '0.1.0',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    screen: context?.screen,
    gameState: context?.gameState,
  };

  const filename = `crash-${Date.now()}.json`;
  const filepath = join(CRASH_DIR, filename);
  writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
  return filepath;
}

export function generateGitHubIssueUrl(report: CrashReport): string {
  const title = encodeURIComponent(`[Crash]: ${report.error.slice(0, 80)}`);
  const body = encodeURIComponent(
    `## Crash Report\n\n` +
    `**Error:** ${report.error}\n\n` +
    `**Stack:**\n\`\`\`\n${report.stack ?? 'N/A'}\n\`\`\`\n\n` +
    `## Environment\n` +
    `- Version: ${report.version}\n` +
    `- Node: ${report.nodeVersion}\n` +
    `- OS: ${report.platform} ${report.arch}\n` +
    `- Screen: ${report.screen ?? 'unknown'}\n` +
    `- Time: ${report.timestamp}\n`,
  );
  return `https://github.com/tooyipjee/codekeep/issues/new?title=${title}&body=${body}&labels=bug,crash`;
}
