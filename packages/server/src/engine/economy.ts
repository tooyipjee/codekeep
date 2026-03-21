import {
  type Resources,
  type CodingEvent,
  type Keep,
  type KeepGridState,
  CODING_EVENT_GRANTS,
  DAILY_RESOURCE_CAP,
  PASSIVE_INCOME_PER_VAULT,
  PASSIVE_INCOME_PER_RELAY,
  PASSIVE_INCOME_INTERVAL_MS,
} from '@codekeep/shared';
import { addResources } from './grid.js';

export function grantCodingEventResources(
  keep: Keep,
  event: CodingEvent,
): Keep {
  const grants = event.grants ?? CODING_EVENT_GRANTS[event.type] ?? { compute: 0, memory: 0, bandwidth: 0 };
  const newResources = addResources(keep.resources, grants);

  return {
    ...keep,
    resources: capResources(newResources),
    updatedAtUnixMs: Date.now(),
  };
}

export function capResources(resources: Resources): Resources {
  return {
    compute: Math.min(resources.compute, DAILY_RESOURCE_CAP.compute * 10),
    memory: Math.min(resources.memory, DAILY_RESOURCE_CAP.memory * 10),
    bandwidth: Math.min(resources.bandwidth, DAILY_RESOURCE_CAP.bandwidth * 10),
  };
}

export function calculateOfflineResources(
  grid: KeepGridState,
  elapsedMs: number,
): Resources {
  const intervals = Math.min(Math.floor(elapsedMs / PASSIVE_INCOME_INTERVAL_MS), 60);
  const vaultCount = grid.structures.filter((s) => s.kind === 'dataVault').length;
  const relayCount = grid.structures.filter((s) => s.kind === 'relayTower').length;
  return {
    compute: intervals * (vaultCount * PASSIVE_INCOME_PER_VAULT.compute + relayCount * PASSIVE_INCOME_PER_RELAY.compute),
    memory: intervals * (vaultCount * PASSIVE_INCOME_PER_VAULT.memory + relayCount * PASSIVE_INCOME_PER_RELAY.memory),
    bandwidth: intervals * (vaultCount * PASSIVE_INCOME_PER_VAULT.bandwidth + relayCount * PASSIVE_INCOME_PER_RELAY.bandwidth),
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
