import { describe, it, expect } from 'vitest';
import {
  TROPHY_CONFIG,
  LEAGUE_BRACKETS,
  SHIELD_DURATION_MS,
  WARCAMP_TRAIN_COST,
  WARCAMP_TRAIN_TIME_MS,
  WARCAMP_BASE_SLOTS,
  WARCAMP_MAX_SLOTS,
  MATCHMAKING_TROPHY_RANGE,
  ATTACKER_COOLDOWN_MS,
  REVENGE_EXPIRY_MS,
  SEASON_DURATION_MS,
  SEASON_TROPHY_RESET_FACTOR,
  SEASON_REWARDS,
  PVP_LOOT_CAP_PERCENT,
  DORMANT_THRESHOLD_MS,
  NEW_PLAYER_PROTECTION_MS,
  BATTERED_THRESHOLD,
  BATTERED_SHIELD_MS,
  BATTERED_INCOME_MULTIPLIER,
} from '@codekeep/shared';

describe('PvP constants', () => {
  it('trophy config has all required fields', () => {
    expect(TROPHY_CONFIG.startingTrophies).toBe(0);
    expect(TROPHY_CONFIG.attackFullBreach).toBeGreaterThan(0);
    expect(TROPHY_CONFIG.attackPartialBreach).toBeGreaterThan(0);
    expect(TROPHY_CONFIG.attackDefenseWin).toBeLessThan(0);
    expect(TROPHY_CONFIG.defendDefenseWin).toBeGreaterThan(0);
    expect(TROPHY_CONFIG.defendPartialBreach).toBeLessThan(0);
    expect(TROPHY_CONFIG.defendFullBreach).toBeLessThan(0);
    expect(TROPHY_CONFIG.minTrophies).toBe(0);
    expect(TROPHY_CONFIG.revengeBonus).toBeGreaterThan(1);
  });

  it('league brackets are contiguous and cover 0 to infinity', () => {
    expect(LEAGUE_BRACKETS[0].min).toBe(0);
    for (let i = 1; i < LEAGUE_BRACKETS.length; i++) {
      expect(LEAGUE_BRACKETS[i].min).toBe(LEAGUE_BRACKETS[i - 1].max + 1);
    }
    expect(LEAGUE_BRACKETS[LEAGUE_BRACKETS.length - 1].max).toBe(Infinity);
  });

  it('league brackets have 5 tiers', () => {
    expect(LEAGUE_BRACKETS.length).toBe(5);
    expect(LEAGUE_BRACKETS.map((b) => b.name)).toEqual(['copper', 'iron', 'silver', 'gold', 'diamond']);
  });

  it('shield durations increase with severity', () => {
    expect(SHIELD_DURATION_MS.defense_win).toBeLessThan(SHIELD_DURATION_MS.partial_breach);
    expect(SHIELD_DURATION_MS.partial_breach).toBeLessThan(SHIELD_DURATION_MS.full_breach);
  });

  it('warcamp training costs are defined for all raider types', () => {
    expect(WARCAMP_TRAIN_COST.raider).toBeDefined();
    expect(WARCAMP_TRAIN_COST.scout).toBeDefined();
    expect(WARCAMP_TRAIN_COST.brute).toBeDefined();

    // Brute should be most expensive
    expect(WARCAMP_TRAIN_COST.brute.gold).toBeGreaterThan(WARCAMP_TRAIN_COST.raider.gold);
  });

  it('warcamp training times are defined', () => {
    expect(WARCAMP_TRAIN_TIME_MS.raider).toBeGreaterThan(0);
    expect(WARCAMP_TRAIN_TIME_MS.scout).toBeGreaterThan(0);
    expect(WARCAMP_TRAIN_TIME_MS.brute).toBeGreaterThan(WARCAMP_TRAIN_TIME_MS.raider);
  });

  it('warcamp slot limits are reasonable', () => {
    expect(WARCAMP_BASE_SLOTS).toBe(3);
    expect(WARCAMP_MAX_SLOTS).toBe(8);
    expect(WARCAMP_MAX_SLOTS).toBeGreaterThan(WARCAMP_BASE_SLOTS);
  });

  it('matchmaking range is reasonable', () => {
    expect(MATCHMAKING_TROPHY_RANGE).toBe(200);
  });

  it('attacker cooldown is 24 hours', () => {
    expect(ATTACKER_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('revenge expires in 48 hours', () => {
    expect(REVENGE_EXPIRY_MS).toBe(48 * 60 * 60 * 1000);
  });

  it('season is 28 days', () => {
    expect(SEASON_DURATION_MS).toBe(28 * 24 * 60 * 60 * 1000);
  });

  it('season trophy reset factor is between 0 and 1', () => {
    expect(SEASON_TROPHY_RESET_FACTOR).toBeGreaterThan(0);
    expect(SEASON_TROPHY_RESET_FACTOR).toBeLessThan(1);
  });

  it('season rewards increase with league tier', () => {
    const leagues = ['copper', 'iron', 'silver', 'gold', 'diamond'] as const;
    for (let i = 1; i < leagues.length; i++) {
      expect(SEASON_REWARDS[leagues[i]].gold).toBeGreaterThan(SEASON_REWARDS[leagues[i - 1]].gold);
    }
  });

  it('PvP loot cap is 30%', () => {
    expect(PVP_LOOT_CAP_PERCENT).toBe(0.30);
  });

  it('anti-snowball protection values are defined', () => {
    expect(DORMANT_THRESHOLD_MS).toBe(14 * 24 * 60 * 60 * 1000);
    expect(NEW_PLAYER_PROTECTION_MS).toBe(48 * 60 * 60 * 1000);
    expect(BATTERED_THRESHOLD).toBe(3);
    expect(BATTERED_SHIELD_MS).toBe(12 * 60 * 60 * 1000);
    expect(BATTERED_INCOME_MULTIPLIER).toBe(1.5);
  });
});
