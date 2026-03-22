import { execSync } from 'node:child_process';

export interface GitBonus {
  type: 'commits_today' | 'streak';
  value: number;
  description: string;
}

export function detectGitBonuses(): GitBonus[] {
  const bonuses: GitBonus[] = [];

  try {
    const today = new Date().toISOString().slice(0, 10);
    const count = execSync(`git log --oneline --since="${today}" 2>/dev/null | wc -l`, { encoding: 'utf-8' }).trim();
    const commits = parseInt(count, 10) || 0;
    if (commits > 0) {
      const bonus = Math.min(commits * 2, 10);
      bonuses.push({
        type: 'commits_today',
        value: bonus,
        description: `${commits} commit${commits > 1 ? 's' : ''} today: +${bonus}% card damage`,
      });
    }
  } catch {
    // Not in a git repo or git not available
  }

  return bonuses;
}

export function getGitDamageMult(): number {
  const bonuses = detectGitBonuses();
  let mult = 1;
  for (const b of bonuses) {
    if (b.type === 'commits_today') {
      mult += b.value / 100;
    }
  }
  return Math.min(mult, 1.10); // Cap at 10%
}
