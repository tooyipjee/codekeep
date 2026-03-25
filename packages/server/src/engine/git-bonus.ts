import { execSync } from 'node:child_process';
import type { GitBonusInfo } from '@codekeep/shared';

const MAX_TOTAL_BONUS = 20;
const CACHE_TTL_MS = 30_000;

let cachedBonuses: GitBonusInfo[] | null = null;
let cacheTimestamp = 0;

function git(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', timeout: 3000 }).trim();
}

export function detectGitBonuses(): GitBonusInfo[] {
  const now = Date.now();
  if (cachedBonuses !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedBonuses;
  }

  const bonuses: GitBonusInfo[] = [];

  try {
    git('git rev-parse --git-dir 2>/dev/null');
  } catch {
    cachedBonuses = bonuses;
    cacheTimestamp = now;
    return bonuses;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const count = parseInt(git(`git log --oneline --since="${today}" 2>/dev/null | wc -l`), 10) || 0;
    if (count > 0) {
      const hp = Math.min(count * 2, 10);
      bonuses.push({
        type: 'commits_today',
        value: hp,
        description: `${count} commit${count > 1 ? 's' : ''} today: +${hp} Gate HP`,
      });
    }
  } catch { /* no commits data */ }

  try {
    const staged = git('git diff --cached --stat 2>/dev/null');
    if (staged.length > 0) {
      bonuses.push({
        type: 'staged',
        value: 3,
        description: 'Staged changes: +3 Gate HP',
      });
    }
  } catch { /* no staged data */ }

  try {
    const unstaged = git('git diff --stat 2>/dev/null');
    if (unstaged.length > 0) {
      bonuses.push({
        type: 'unstaged',
        value: 2,
        description: 'Unstaged changes: +2 Gate HP',
      });
    }
  } catch { /* no unstaged data */ }

  try {
    const dates = git('git log --format=%cd --date=short 2>/dev/null');
    if (dates.length > 0) {
      const uniqueDates = new Set(dates.split('\n').filter(Boolean));
      let streak = 0;
      const today = new Date();
      for (let d = 0; d < 30; d++) {
        const check = new Date(today);
        check.setDate(check.getDate() - d);
        const dateStr = check.toISOString().slice(0, 10);
        if (uniqueDates.has(dateStr)) {
          streak++;
        } else {
          break;
        }
      }
      if (streak > 1) {
        const hp = Math.min(streak - 1, 5);
        bonuses.push({
          type: 'streak',
          value: hp,
          description: `${streak}-day streak: +${hp} Gate HP`,
        });
      }
    }
  } catch { /* no streak data */ }

  cachedBonuses = bonuses;
  cacheTimestamp = now;
  return bonuses;
}

export function getGitHpBonus(bonuses?: GitBonusInfo[]): number {
  if (!bonuses || bonuses.length === 0) return 0;
  const total = bonuses.reduce((sum, b) => sum + b.value, 0);
  return Math.min(total, MAX_TOTAL_BONUS);
}

export function clearGitBonusCache(): void {
  cachedBonuses = null;
  cacheTimestamp = 0;
}
