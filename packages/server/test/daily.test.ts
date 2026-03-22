import { describe, it, expect } from 'vitest';
import { getDailySeed, getDailyNumber, calculateDailyScore } from '../src/engine/daily.js';

describe('daily challenge', () => {
  it('daily seed contains today\'s date', () => {
    const seed = getDailySeed();
    const today = new Date().toISOString().slice(0, 10);
    expect(seed).toContain(today);
  });

  it('daily number is deterministic for same day', () => {
    const n1 = getDailyNumber();
    const n2 = getDailyNumber();
    expect(n1).toBe(n2);
  });

  it('calculates score with win bonus', () => {
    const winScore = calculateDailyScore(true, 3, 50, 15, 60);
    const loseScore = calculateDailyScore(false, 2, 0, 20, 80);
    expect(winScore).toBeGreaterThan(loseScore);
  });

  it('fewer cards gives higher score', () => {
    const smallDeck = calculateDailyScore(true, 3, 50, 12, 60);
    const largeDeck = calculateDailyScore(true, 3, 50, 25, 60);
    expect(smallDeck).toBeGreaterThan(largeDeck);
  });

  it('more remaining gate HP gives higher score', () => {
    const highHp = calculateDailyScore(true, 3, 70, 15, 60);
    const lowHp = calculateDailyScore(true, 3, 10, 15, 60);
    expect(highHp).toBeGreaterThan(lowHp);
  });
});
