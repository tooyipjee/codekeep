import type { StructureKind, UpgradeLevel, Resources, StructureStats, FragmentType } from './types.js';

export const GRID_SIZE = 16;
export const TICK_RATE_HZ = 8;
export const MAX_RAID_TICKS = 2400;
export const RULES_VERSION = 1;

export const STARTING_RESOURCES: Resources = {
  compute: 80,
  memory: 40,
  bandwidth: 20,
};

export const DAILY_RESOURCE_CAP: Resources = {
  compute: 200,
  memory: 120,
  bandwidth: 80,
};

export const STRUCTURE_SYMBOLS: Record<StructureKind, string> = {
  firewall: '#',
  honeypot: '%',
  dataVault: '$',
  encryptionNode: '@',
  relayTower: '^',
  scanner: '!',
};

export const STRUCTURE_NAMES: Record<StructureKind, string> = {
  firewall: 'Firewall',
  honeypot: 'Honeypot',
  dataVault: 'Data Vault',
  encryptionNode: 'Encryption',
  relayTower: 'Relay Tower',
  scanner: 'Scanner',
};

export const EMPTY_CELL_SYMBOL = '·';

export const STRUCTURE_COSTS: Record<StructureKind, Record<UpgradeLevel, Resources>> = {
  firewall: {
    1: { compute: 12, memory: 0, bandwidth: 2 },
    2: { compute: 10, memory: 0, bandwidth: 4 },
    3: { compute: 14, memory: 0, bandwidth: 6 },
  },
  honeypot: {
    1: { compute: 8, memory: 4, bandwidth: 6 },
    2: { compute: 8, memory: 4, bandwidth: 6 },
    3: { compute: 10, memory: 6, bandwidth: 8 },
  },
  dataVault: {
    1: { compute: 6, memory: 14, bandwidth: 2 },
    2: { compute: 6, memory: 18, bandwidth: 4 },
    3: { compute: 8, memory: 24, bandwidth: 6 },
  },
  encryptionNode: {
    1: { compute: 10, memory: 10, bandwidth: 0 },
    2: { compute: 12, memory: 12, bandwidth: 0 },
    3: { compute: 16, memory: 16, bandwidth: 0 },
  },
  relayTower: {
    1: { compute: 6, memory: 2, bandwidth: 12 },
    2: { compute: 6, memory: 4, bandwidth: 14 },
    3: { compute: 8, memory: 6, bandwidth: 18 },
  },
  scanner: {
    1: { compute: 14, memory: 6, bandwidth: 8 },
    2: { compute: 16, memory: 8, bandwidth: 10 },
    3: { compute: 20, memory: 12, bandwidth: 14 },
  },
};

export const FIREWALL_HP: Record<UpgradeLevel, number> = { 1: 40, 2: 70, 3: 110 };
export const HONEYPOT_STUN_TICKS: Record<UpgradeLevel, number> = { 1: 4, 2: 6, 3: 9 };
export const HONEYPOT_COOLDOWN_TICKS: Record<UpgradeLevel, number> = { 1: 16, 2: 12, 3: 8 };
export const VAULT_CAPACITY: Record<UpgradeLevel, number> = { 1: 80, 2: 160, 3: 280 };
export const ENCRYPTION_MITIGATION: Record<UpgradeLevel, number> = { 1: 0.15, 2: 0.28, 3: 0.40 };
export const RELAY_RANGE: Record<UpgradeLevel, number> = { 1: 1, 2: 2, 3: 3 };

export const SCANNER_DAMAGE: Record<UpgradeLevel, number> = { 1: 4, 2: 7, 3: 10 };
export const SCANNER_RANGE: Record<UpgradeLevel, number> = { 1: 2, 2: 2, 3: 3 };
export const SCANNER_COOLDOWN_TICKS: Record<UpgradeLevel, number> = { 1: 4, 2: 3, 3: 2 };

export const PROBE_BASE_HP = 30;
export const PROBE_DAMAGE_PER_TICK = 8;
export const PROBE_LOOT_PER_TICK = 3;

export const PROBE_TYPES = {
  standard: { hp: 30, damage: 8, loot: 3, speed: 1 },
  scout: { hp: 14, damage: 4, loot: 2, speed: 2 },
  brute: { hp: 55, damage: 14, loot: 5, speed: 1 },
} as const;

export const PASSIVE_INCOME_INTERVAL_MS = 60_000;
export const PASSIVE_INCOME_PER_VAULT: Resources = { compute: 2, memory: 4, bandwidth: 1 };
export const PASSIVE_INCOME_PER_RELAY: Resources = { compute: 1, memory: 0, bandwidth: 3 };

export const CODING_EVENT_GRANTS: Record<string, Resources> = {
  build_success: { compute: 12, memory: 0, bandwidth: 4 },
  tests_pass: { compute: 0, memory: 8, bandwidth: 4 },
  git_commit: { compute: 5, memory: 5, bandwidth: 10 },
  session_reward: { compute: 8, memory: 3, bandwidth: 6 },
  daily_login: { compute: 5, memory: 5, bandwidth: 10 },
};

export const BACKGROUND_RAID_INTERVAL_MS = 900_000; // 15 min
export const BACKGROUND_RAID_MAX = 5;

export const FAUCET_BASE_USES = 10;
export const FAUCET_DIMINISH_FACTOR = 0.5;

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  bonus?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_structure', name: 'Builder', desc: 'Place your first structure', bonus: '+20C welcome bonus' },
  { id: 'defense_win_5', name: 'Warden', desc: 'Win 5 defense raids', bonus: '+25% defense bonus' },
  { id: 'win_streak_3', name: 'On Fire', desc: 'Achieve a 3-win streak', bonus: '+10 all resources' },
  { id: 'win_streak_5', name: 'Unstoppable', desc: 'Achieve a 5-win streak', bonus: '+30 all resources' },
  { id: 'all_types', name: 'Diverse', desc: 'Place every structure type' },
  { id: 'max_level', name: 'Maxed Out', desc: 'Upgrade a structure to Level 3' },
  { id: 'scanner_kills_10', name: 'Headhunter', desc: 'Kill 10 probes with scanners', bonus: '+1 scanner damage' },
  { id: 'structures_20', name: 'Architect', desc: 'Place 20 structures total' },
  { id: 'raids_10', name: 'Veteran', desc: 'Complete 10 raids', bonus: 'Unlock Lv.2 friend raids' },
  { id: 'hoarder', name: 'Hoarder', desc: 'Hold 500+ total resources' },
];

export const FRAGMENT_TYPES = {
  compute_shard:    { symbol: '~', color: 'cyan',    yield: { compute: 4, memory: 0, bandwidth: 0 } as Resources, weight: 35 },
  memory_bit:       { symbol: '~', color: 'yellow',  yield: { compute: 0, memory: 4, bandwidth: 0 } as Resources, weight: 35 },
  bandwidth_packet: { symbol: '~', color: 'green',   yield: { compute: 0, memory: 0, bandwidth: 4 } as Resources, weight: 20 },
  data_bundle:      { symbol: '~', color: 'white',   yield: { compute: 2, memory: 2, bandwidth: 2 } as Resources, weight: 10 },
} as const;

export const FRAGMENT_MAX = 6;
export const FRAGMENT_SPAWN_INTERVAL_MS = 35_000;
export const FRAGMENT_DECAY_MS = 180_000;
export const FRAGMENT_VAULT_BONUS = 0.25;
export const FRAGMENT_VAULT_RANGE = 2;

export const ALL_STRUCTURE_KINDS: StructureKind[] = [
  'firewall',
  'honeypot',
  'dataVault',
  'encryptionNode',
  'relayTower',
  'scanner',
];
