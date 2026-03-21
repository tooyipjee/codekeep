import type { StructureKind, UpgradeLevel, Resources, StructureStats, FragmentType, ResourceId, League, RaidOutcome, ProbeType } from './types.js';

export const RESOURCE_ICONS: Record<ResourceId, string> = {
  gold: '●',
  wood: '♣',
  stone: '■',
};

export const RESOURCE_COLORS: Record<ResourceId, string> = {
  gold: 'yellow',
  wood: 'green',
  stone: 'white',
};

export const RESOURCE_NAMES: Record<ResourceId, string> = {
  gold: 'Gold',
  wood: 'Wood',
  stone: 'Stone',
};

export const GRID_SIZE = 16;
export const TICK_RATE_HZ = 8;
export const MAX_RAID_TICKS = 2400;
export const RULES_VERSION = 1;

export const STARTING_RESOURCES: Resources = {
  gold: 80,
  wood: 40,
  stone: 20,
};

export const DAILY_RESOURCE_CAP: Resources = {
  gold: 200,
  wood: 120,
  stone: 80,
};

export const STRUCTURE_SYMBOLS: Record<StructureKind, string> = {
  wall: '#',
  trap: '%',
  treasury: '$',
  ward: '@',
  watchtower: '^',
  archerTower: '!',
  vault: '&',
};

export const STRUCTURE_NAMES: Record<StructureKind, string> = {
  wall: 'Stone Wall',
  trap: 'Bear Trap',
  treasury: 'Treasury',
  ward: 'Ward',
  watchtower: 'Watchtower',
  archerTower: 'Archer Tower',
  vault: 'Vault',
};

export const EMPTY_CELL_SYMBOL = '·';

export const STRUCTURE_COSTS: Record<StructureKind, Record<UpgradeLevel, Resources>> = {
  wall: {
    1: { gold: 12, wood: 0, stone: 2 },
    2: { gold: 10, wood: 0, stone: 4 },
    3: { gold: 14, wood: 0, stone: 6 },
  },
  trap: {
    1: { gold: 8, wood: 4, stone: 6 },
    2: { gold: 8, wood: 4, stone: 6 },
    3: { gold: 10, wood: 6, stone: 8 },
  },
  treasury: {
    1: { gold: 6, wood: 14, stone: 2 },
    2: { gold: 6, wood: 18, stone: 4 },
    3: { gold: 8, wood: 24, stone: 6 },
  },
  ward: {
    1: { gold: 10, wood: 10, stone: 0 },
    2: { gold: 12, wood: 12, stone: 0 },
    3: { gold: 16, wood: 16, stone: 0 },
  },
  watchtower: {
    1: { gold: 6, wood: 2, stone: 12 },
    2: { gold: 6, wood: 4, stone: 14 },
    3: { gold: 8, wood: 6, stone: 18 },
  },
  archerTower: {
    1: { gold: 14, wood: 6, stone: 8 },
    2: { gold: 16, wood: 8, stone: 10 },
    3: { gold: 20, wood: 12, stone: 14 },
  },
  vault: {
    1: { gold: 20, wood: 20, stone: 15 },
    2: { gold: 35, wood: 35, stone: 25 },
    3: { gold: 55, wood: 55, stone: 40 },
  },
};

export const WALL_HP: Record<UpgradeLevel, number> = { 1: 40, 2: 70, 3: 110 };
export const ARCHER_TOWER_HP: Record<UpgradeLevel, number> = { 1: 25, 2: 40, 3: 60 };
export const WATCHTOWER_HP: Record<UpgradeLevel, number> = { 1: 20, 2: 35, 3: 50 };
export const TRAP_STUN_TICKS: Record<UpgradeLevel, number> = { 1: 4, 2: 6, 3: 9 };
export const TRAP_COOLDOWN_TICKS: Record<UpgradeLevel, number> = { 1: 16, 2: 12, 3: 8 };
export const TREASURY_CAPACITY: Record<UpgradeLevel, number> = { 1: 80, 2: 160, 3: 280 };
export const WARD_MITIGATION: Record<UpgradeLevel, number> = { 1: 0.15, 2: 0.28, 3: 0.40 };
export const WATCHTOWER_RANGE: Record<UpgradeLevel, number> = { 1: 1, 2: 2, 3: 3 };

export const ARCHER_DAMAGE: Record<UpgradeLevel, number> = { 1: 4, 2: 7, 3: 10 };
export const ARCHER_RANGE: Record<UpgradeLevel, number> = { 1: 2, 2: 2, 3: 3 };
export const ARCHER_COOLDOWN_TICKS: Record<UpgradeLevel, number> = { 1: 4, 2: 3, 3: 2 };

export const RAIDER_BASE_HP = 30;
export const RAIDER_DAMAGE_PER_TICK = 8;
export const RAIDER_LOOT_PER_TICK = 3;

export const RAIDER_TYPES = {
  raider: { hp: 30, damage: 8, loot: 3, speed: 1 },
  scout: { hp: 14, damage: 4, loot: 2, speed: 2 },
  brute: { hp: 55, damage: 14, loot: 5, speed: 1 },
} as const;

export const PASSIVE_INCOME_INTERVAL_MS = 60_000;
export const PASSIVE_INCOME_PER_TREASURY: Resources = { gold: 2, wood: 4, stone: 1 };
export const PASSIVE_INCOME_PER_WATCHTOWER: Resources = { gold: 1, wood: 0, stone: 3 };

export const CODING_EVENT_GRANTS: Record<string, Resources> = {
  build_success: { gold: 12, wood: 0, stone: 4 },
  tests_pass: { gold: 0, wood: 8, stone: 4 },
  git_commit: { gold: 5, wood: 5, stone: 10 },
  session_reward: { gold: 8, wood: 3, stone: 6 },
  daily_login: { gold: 5, wood: 5, stone: 10 },
};

export const KINGDOM_EVENT_NAMES: Record<string, string> = {
  build_success: 'Miners returned',
  tests_pass: 'Harvest complete',
  git_commit: 'Trade caravan arrived',
  session_reward: 'Tax collection',
  daily_login: 'Morning tribute',
};

export const BACKGROUND_RAID_INTERVAL_MS = 900_000;
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
  { id: 'first_structure', name: 'Builder', desc: 'Place your first structure', bonus: '+20 gold' },
  { id: 'defense_win_5', name: 'Warden', desc: 'Win 5 defense raids', bonus: '+25 gold, +15 wood, +15 stone' },
  { id: 'win_streak_3', name: 'Rallying Cry', desc: 'Achieve a 3-win streak', bonus: '+10 all resources' },
  { id: 'win_streak_5', name: 'Unstoppable', desc: 'Achieve a 5-win streak', bonus: '+30 all resources' },
  { id: 'all_types', name: 'Master Builder', desc: 'Place every structure type', bonus: '+15 all resources' },
  { id: 'max_level', name: 'Fortifier', desc: 'Upgrade a structure to Level 3', bonus: '+20 gold, +10 stone' },
  { id: 'archer_kills_10', name: 'Marksman', desc: 'Kill 10 raiders with archers', bonus: '+20 gold, +10 wood, +10 stone' },
  { id: 'structures_20', name: 'Architect', desc: 'Place 20 structures total', bonus: '+10 all resources' },
  { id: 'raids_10', name: 'Veteran', desc: 'Complete 10 raids', bonus: '+15 all resources' },
  { id: 'hoarder', name: 'Treasure Keeper', desc: 'Hold 500+ total resources', bonus: '+25 gold' },
];

export const FRAGMENT_TYPES = {
  gold_nugget: { symbol: '~', color: 'cyan',    yield: { gold: 4, wood: 0, stone: 0 } as Resources, weight: 35 },
  timber:      { symbol: '~', color: 'yellow',  yield: { gold: 0, wood: 4, stone: 0 } as Resources, weight: 35 },
  ore:         { symbol: '~', color: 'green',   yield: { gold: 0, wood: 0, stone: 4 } as Resources, weight: 20 },
  gem:         { symbol: '~', color: 'white',   yield: { gold: 2, wood: 2, stone: 2 } as Resources, weight: 10 },
} as const;

export const FRAGMENT_MAX = 6;
export const FRAGMENT_SPAWN_INTERVAL_MS = 35_000;
export const FRAGMENT_DECAY_MS = 180_000;
export const FRAGMENT_TREASURY_BONUS = 0.25;
export const FRAGMENT_TREASURY_RANGE = 2;

export const ALL_STRUCTURE_KINDS: StructureKind[] = [
  'wall',
  'trap',
  'treasury',
  'ward',
  'watchtower',
  'archerTower',
  'vault',
];

export const VAULT_HP: Record<UpgradeLevel, number> = { 1: 60, 2: 90, 3: 130 };
export const VAULT_PROTECTION: Record<UpgradeLevel, Resources> = {
  1: { gold: 50, wood: 30, stone: 20 },
  2: { gold: 100, wood: 60, stone: 40 },
  3: { gold: 180, wood: 110, stone: 75 },
};
export const VAULT_MAX_COUNT = 1;

export const PVP_LOOT_CAP_PERCENT = 0.30;

export const TROPHY_CONFIG = {
  startingTrophies: 0,
  attackFullBreach: 30,
  attackPartialBreach: 15,
  attackDefenseWin: -10,
  defendDefenseWin: 20,
  defendPartialBreach: -5,
  defendFullBreach: -15,
  minTrophies: 0,
  revengeBonus: 1.5,
} as const;

export const LEAGUE_BRACKETS: { name: League; min: number; max: number }[] = [
  { name: 'copper', min: 0, max: 199 },
  { name: 'iron', min: 200, max: 499 },
  { name: 'silver', min: 500, max: 999 },
  { name: 'gold', min: 1000, max: 1999 },
  { name: 'diamond', min: 2000, max: Infinity },
];

export const SHIELD_DURATION_MS: Record<RaidOutcome, number> = {
  defense_win: 2 * 60 * 60 * 1000,
  partial_breach: 4 * 60 * 60 * 1000,
  full_breach: 8 * 60 * 60 * 1000,
};

export const WARCAMP_TRAIN_COST: Record<ProbeType, Resources> = {
  raider: { gold: 8, wood: 4, stone: 2 },
  scout: { gold: 6, wood: 6, stone: 0 },
  brute: { gold: 15, wood: 8, stone: 8 },
};

export const WARCAMP_TRAIN_TIME_MS: Record<ProbeType, number> = {
  raider: 2 * 60 * 1000,
  scout: 2 * 60 * 1000,
  brute: 5 * 60 * 1000,
};

export const WARCAMP_BASE_SLOTS = 3;
export const WARCAMP_MAX_SLOTS = 8;

export const MATCHMAKING_TROPHY_RANGE = 200;
export const MATCHMAKING_WIDEN_INTERVAL_MS = 5000;
export const MATCHMAKING_WIDEN_AMOUNT = 50;
export const ATTACKER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const REVENGE_EXPIRY_MS = 48 * 60 * 60 * 1000;

export const SEASON_DURATION_MS = 28 * 24 * 60 * 60 * 1000;
export const SEASON_TROPHY_RESET_FACTOR = 0.6;

export const SEASON_REWARDS: Record<League, Resources> = {
  copper: { gold: 50, wood: 25, stone: 15 },
  iron: { gold: 120, wood: 60, stone: 40 },
  silver: { gold: 250, wood: 120, stone: 80 },
  gold: { gold: 500, wood: 250, stone: 160 },
  diamond: { gold: 800, wood: 400, stone: 260 },
};

export const DORMANT_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
export const NEW_PLAYER_PROTECTION_MS = 48 * 60 * 60 * 1000;
export const BATTERED_THRESHOLD = 3;
export const BATTERED_SHIELD_MS = 12 * 60 * 60 * 1000;
export const BATTERED_INCOME_MULTIPLIER = 1.5;
