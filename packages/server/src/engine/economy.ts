import {
  type Resources,
  type CodingEvent,
  type Keep,
  type KeepGridState,
  CODING_EVENT_GRANTS,
  DAILY_RESOURCE_CAP,
  PASSIVE_INCOME_PER_TREASURY,
  PASSIVE_INCOME_PER_WATCHTOWER,
  PASSIVE_INCOME_INTERVAL_MS,
} from '@codekeep/shared';
import { addResources } from './grid.js';

export function grantCodingEventResources(
  keep: Keep,
  event: CodingEvent,
): Keep {
  const grants = event.grants ?? CODING_EVENT_GRANTS[event.type] ?? { gold: 0, wood: 0, stone: 0 };
  const newResources = addResources(keep.resources, grants);

  return {
    ...keep,
    resources: capResources(newResources),
    updatedAtUnixMs: Date.now(),
  };
}

export function capResources(resources: Resources): Resources {
  return {
    gold: Math.min(resources.gold, DAILY_RESOURCE_CAP.gold * 10),
    wood: Math.min(resources.wood, DAILY_RESOURCE_CAP.wood * 10),
    stone: Math.min(resources.stone, DAILY_RESOURCE_CAP.stone * 10),
  };
}

export function calculateOfflineResources(
  grid: KeepGridState,
  elapsedMs: number,
): Resources {
  const intervals = Math.min(Math.floor(elapsedMs / PASSIVE_INCOME_INTERVAL_MS), 60);
  const treasuries = grid.structures.filter((s) => s.kind === 'treasury');
  const watchtowers = grid.structures.filter((s) => s.kind === 'watchtower');
  const treasuryLevelSum = treasuries.reduce((sum, s) => sum + s.level, 0);
  const watchtowerLevelSum = watchtowers.reduce((sum, s) => sum + s.level, 0);
  return {
    gold: intervals * (treasuryLevelSum * PASSIVE_INCOME_PER_TREASURY.gold + watchtowerLevelSum * PASSIVE_INCOME_PER_WATCHTOWER.gold),
    wood: intervals * (treasuryLevelSum * PASSIVE_INCOME_PER_TREASURY.wood + watchtowerLevelSum * PASSIVE_INCOME_PER_WATCHTOWER.wood),
    stone: intervals * (treasuryLevelSum * PASSIVE_INCOME_PER_TREASURY.stone + watchtowerLevelSum * PASSIVE_INCOME_PER_WATCHTOWER.stone),
  };
}

export function simulateFaucetEvent(): CodingEvent {
  const types = ['build_success', 'tests_pass', 'git_commit', 'session_reward'] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    timestamp: Date.now(),
    grants: CODING_EVENT_GRANTS[type],
  };
}
