/**
 * Prove winnability by testing a well-built deck against all 3 bosses.
 * This simulates what a skilled player could achieve.
 */
import {
  createCombatState, playCard, endPlayerTurn,
  makeCardInstance, getDifficultyModifiers, getBossWave, hasFirstCardFree,
} from '../packages/server/dist/index.js';
import { getCardDef } from '../packages/shared/dist/index.js';
import type { CombatState, CardInstance, CardDef } from '../packages/shared/dist/index.js';

const MAX_TURNS = 60;

function buildDeck(cardIds: string[]): CardInstance[] {
  return cardIds.map(id => makeCardInstance(id));
}

function bestTargetCol(state: CombatState): number {
  let best = 0, bestS = -1;
  for (let c = 0; c < 5; c++) {
    const col = state.columns[c];
    if (col.enemies.length === 0) continue;
    let s = 0;
    for (const e of col.enemies) {
      s += (e.row + 1) * 20 + (e.intent.type === 'attack' ? e.intent.value * 3 : 0);
      if (e.row >= 3) s += 500;
    }
    if (s > bestS) { bestS = s; best = c; }
  }
  return best;
}

function scorePlay(def: CardDef, tCol: number, state: CombatState): number {
  const ec = state.columns.reduce((s, c) => s + c.enemies.length, 0);
  const urgent = state.columns.some(c => c.enemies.some(e => e.row >= 2));
  const lowHp = state.gateHp < state.gateMaxHp * 0.4;
  let score = 0;

  for (const e of def.effects) {
    switch (e.type) {
      case 'damage': {
        const m = e.target === 'all' ? Math.min(ec, 6) : e.target === 'column' ? Math.max(state.columns[tCol]?.enemies.length ?? 0, 1) * 1.2 : 1;
        const col = state.columns[tCol];
        let killBonus = 0;
        if (e.target === 'single' && col?.enemies.length) {
          const front = col.enemies.reduce((a, b) => a.row >= b.row ? a : b);
          if (e.value >= front.hp) killBonus = 25;
          if (front.row >= 3) killBonus += 30;
        }
        score += e.value * m + killBonus;
        break;
      }
      case 'block': score += e.value * (urgent ? 2.5 : lowHp ? 2.0 : 0.5); break;
      case 'heal': score += e.value * (lowHp ? 2.0 : 0.3); break;
      case 'draw': score += e.value * 5; break;
      case 'resolve': score += e.value * 8; break;
      case 'vulnerable': case 'weak':
        score += e.value * (e.target === 'all' ? 3 * Math.min(ec, 4) : 4);
        break;
      case 'burn':
        score += e.value * (e.target === 'all' ? Math.min(ec, 4) : 1);
        break;
    }
  }
  return score / Math.max(1, def.cost);
}

function playTurn(state: CombatState): void {
  if (state.phase !== 'player' || state.outcome !== 'undecided') return;

  for (let pass = 0; pass < 30; pass++) {
    if (state.phase !== 'player' || state.outcome !== 'undecided' || state.hand.length === 0) break;

    type C = { idx: number; target: number; score: number; prio: number };
    const cands: C[] = [];

    for (let i = 0; i < state.hand.length; i++) {
      const def = getCardDef(state.hand[i].defId);
      if (!def || def.id === 'pale_curse') continue;

      const isFirst = !state.events.some(e => e.type === 'card_played' && e.turn === state.turn);
      const cost = (hasFirstCardFree(state.relics) && isFirst) ? 0 : def.cost;
      if (cost > state.resolve) continue;

      const hasDraw = def.effects.some(e => e.type === 'draw');
      const hasRes = def.effects.some(e => e.type === 'resolve');
      const prio = def.cost === 0 ? 200 + (hasDraw ? 50 : 0) : (hasDraw || hasRes) ? 100 : 0;

      const cols = new Set<number>();
      cols.add(bestTargetCol(state));
      for (let c = 0; c < 5; c++) if (state.columns[c].enemies.length > 0) cols.add(c);

      let bestS = -999, bestT = 0;
      for (const t of cols) { const s = scorePlay(def, t, state); if (s > bestS) { bestS = s; bestT = t; } }

      if (bestS > 0) cands.push({ idx: i, target: bestT, score: bestS, prio });
    }

    if (cands.length === 0) break;
    cands.sort((a, b) => a.prio !== b.prio ? b.prio - a.prio : b.score - a.score);

    const pick = cands[0];
    const evtBefore = state.events.length;
    playCard(state, pick.idx, pick.target, false);
    if (state.events.length === evtBefore) break;
  }

  if (state.phase === 'player' && state.outcome === 'undecided') endPlayerTurn(state);
}

function runBossFight(deck: CardInstance[], act: number, gateHp: number, gateMax: number, relics: string[], seed: number): { won: boolean; hpLeft: number; turns: number } {
  const diff = getDifficultyModifiers(act, 0);
  const wave = getBossWave(act);
  const state = createCombatState([...deck], seed, gateHp, gateMax, wave, relics, diff);

  for (let t = 0; t < MAX_TURNS; t++) {
    if (state.outcome !== 'undecided') break;
    playTurn(state);
  }

  return { won: state.outcome === 'win', hpLeft: state.gateHp, turns: state.turn };
}

// ── Test various deck builds ──
const deckConfigs = [
  {
    name: 'Lean damage (12 cards)',
    cards: ['strike', 'strike', 'ember', 'spark', 'guard', 'brace',
            'inferno', 'barrage', 'keen_eye', 'battle_cry', 'cleave', 'volley'],
    relics: [] as string[],
  },
  {
    name: 'Draw engine (14 cards)',
    cards: ['strike', 'strike', 'ember', 'guard', 'brace',
            'keen_eye', 'battle_cry', 'scout', 'slash', 'rally',
            'inferno', 'barrage', 'volley', 'flare'],
    relics: [] as string[],
  },
  {
    name: 'Burn build (14 cards)',
    cards: ['strike', 'ember', 'guard', 'brace', 'spark',
            'ignite', 'pale_fire', 'firestorm', 'conflagration', 'keen_eye',
            'battle_cry', 'barrage', 'flare', 'inferno'],
    relics: [] as string[],
  },
  {
    name: 'With relics (14 cards)',
    cards: ['strike', 'strike', 'ember', 'guard', 'brace',
            'keen_eye', 'battle_cry', 'slash', 'rally',
            'inferno', 'barrage', 'volley', 'flare', 'cleave'],
    relics: ['siege_engine', 'wardens_signet'],
  },
  {
    name: 'God build (16 cards + 4 relics)',
    cards: ['ember', 'brace',
            'keen_eye', 'battle_cry', 'scout', 'slash',
            'inferno', 'barrage', 'volley', 'conflagration',
            'pale_fire', 'annihilate', 'wardens_wrath', 'rally_the_keep',
            'cleave', 'firestorm'],
    relics: ['siege_engine', 'wardens_signet', 'void_prism', 'pale_lens'],
  },
  {
    name: 'Starter only (10 cards)',
    cards: ['strike', 'strike', 'strike', 'guard', 'guard',
            'spark', 'ember', 'brace', 'bolster', 'mend'],
    relics: [] as string[],
  },
];

console.log('═══════════════════════════════════════════════════════');
console.log('  WINNABILITY PROOF — Boss fights per deck build');
console.log('═══════════════════════════════════════════════════════');

for (const cfg of deckConfigs) {
  console.log(`\n  ▸ ${cfg.name}`);
  const gateMax = 70;
  let allWon = true;

  for (let act = 1; act <= 3; act++) {
    const deck = buildDeck(cfg.cards);
    const results: { won: boolean; hpLeft: number; turns: number }[] = [];
    for (let seed = 1; seed <= 50; seed++) {
      results.push(runBossFight(deck, act, gateMax, gateMax, cfg.relics, seed * 10000 + act));
    }
    const winCount = results.filter(r => r.won).length;
    const avgHp = results.filter(r => r.won).reduce((s, r) => s + r.hpLeft, 0) / Math.max(1, winCount);
    const avgTurns = results.filter(r => r.won).reduce((s, r) => s + r.turns, 0) / Math.max(1, winCount);
    console.log(`    Boss ${act}: ${winCount}/50 wins (avg HP left: ${avgHp.toFixed(0)}, avg turns: ${avgTurns.toFixed(1)})`);

    if (winCount === 0) allWon = false;
  }

  console.log(`    ${allWon ? '✓ CAN beat all 3 bosses' : '✗ Cannot beat all 3 bosses'}`);
}

console.log('\n═══════════════════════════════════════════════════════');
