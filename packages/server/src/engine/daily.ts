import { hashSeed } from './rng.js';

export function getDailySeed(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `daily-${today}`;
}

export function getDailyNumber(): number {
  return hashSeed(getDailySeed());
}

export interface DailyResult {
  seed: string;
  score: number;
  actsCompleted: number;
  gateHpRemaining: number;
  deckSize: number;
  turnsPlayed: number;
}

export function calculateDailyScore(
  won: boolean,
  actsCompleted: number,
  gateHpRemaining: number,
  deckSize: number,
  turnsPlayed: number,
): number {
  let score = 0;
  score += actsCompleted * 1000;
  if (won) score += 5000;
  score += gateHpRemaining * 10;
  score += Math.max(0, 20 - deckSize) * 50;
  score += Math.max(0, 100 - turnsPlayed) * 5;
  return Math.max(0, score);
}
