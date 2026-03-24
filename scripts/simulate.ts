/**
 * Monte Carlo winnability simulation for CodeKeep.
 * Smart heuristic bot that plays 0-cost/draw cards first,
 * focuses damage, and builds a lean deck.
 */
import {
  createRun, advanceAct, visitNode, healGate, gainFragments,
  addCardToRunDeck, removeCardFromRunDeck,
  createCombatState, playCard, endPlayerTurn,
  generateCardRewards, pickEncounter,
  getReachableNodes,
  mulberry32, makeCardInstance,
  getDifficultyModifiers,
  getBossWave, hasFirstCardFree,
} from '../packages/server/dist/index.js';
import { getCardDef, FRAGMENT_REWARDS } from '../packages/shared/dist/index.js';
import type { CombatState, RunState, MapNode, Column, CardDef } from '../packages/shared/dist/index.js';

const NUM_RUNS = 1000;
const MAX_TURNS = 50;
const VERBOSE = process.argv.includes('--verbose');

function log(...args: any[]) { if (VERBOSE) console.log(...args); }

function enemyCount(state: CombatState): number {
  return state.columns.reduce((s, c) => s + c.enemies.length, 0);
}

function highestEnemyRow(state: CombatState): number {
  let max = 0;
  for (const c of state.columns)
    for (const e of c.enemies)
      if (e.row > max) max = e.row;
  return max;
}

function bestDamageCol(state: CombatState): number {
  let best = 0, bestS = -1;
  for (let c = 0; c < 5; c++) {
    const col = state.columns[c];
    if (col.enemies.length === 0) continue;
    let s = 0;
    for (const e of col.enemies) {
      s += (e.row + 1) * 20;
      if (e.row >= 3) s += 300;
      if (e.intent.type === 'attack') s += e.intent.value * 3;
    }
    if (s > bestS) { bestS = s; best = c; }
  }
  return best;
}

function cardPlayPriority(def: CardDef, state: CombatState): number {
  const hasDraw = def.effects.some(e => e.type === 'draw');
  const hasResolve = def.effects.some(e => e.type === 'resolve');
  if (def.cost === 0) return 100 + (hasDraw ? 50 : 0);
  if (hasDraw || hasResolve) return 80;
  return 0;
}

function scorePlay(def: CardDef, targetCol: number, state: CombatState): number {
  const ec = enemyCount(state);
  if (ec === 0) return -999;
  const gateRatio = state.gateHp / state.gateMaxHp;
  const urgent = highestEnemyRow(state) >= 3;

  let score = 0;
  for (const e of def.effects) {
    switch (e.type) {
      case 'damage': {
        if (e.target === 'all') {
          score += e.value * Math.min(ec, 5);
        } else if (e.target === 'column') {
          score += e.value * Math.max(state.columns[targetCol]?.enemies.length ?? 0, 1) * 1.2;
        } else {
          const col = state.columns[targetCol];
          if (col?.enemies.length) {
            const front = col.enemies.reduce((a, b) => a.row >= b.row ? a : b);
            const killBonus = e.value >= front.hp ? 20 : 0;
            const urgentBonus = front.row >= 3 ? 25 : front.row >= 2 ? 10 : 0;
            score += e.value + killBonus + urgentBonus;
          }
        }
        break;
      }
      case 'block':
        score += e.value * (urgent ? 2.0 : gateRatio < 0.4 ? 1.5 : 0.5);
        break;
      case 'heal':
        score += e.value * (gateRatio < 0.5 ? 1.5 : 0.3);
        break;
      case 'draw':
        score += e.value * 4;
        break;
      case 'resolve':
        score += e.value * 6;
        break;
      case 'vulnerable': case 'weak':
        score += e.value * (e.target === 'all' ? 3 * Math.min(ec, 3) : 3);
        break;
      case 'burn':
        score += e.value * (e.target === 'all' ? Math.min(ec, 4) : 1);
        break;
    }
  }

  return score / Math.max(1, def.cost);
}

function playOneTurn(state: CombatState): void {
  if (state.phase !== 'player' || state.outcome !== 'undecided') return;

  for (let pass = 0; pass < 25; pass++) {
    if (state.phase !== 'player' || state.outcome !== 'undecided' || state.hand.length === 0) break;

    type Candidate = { idx: number; target: number; score: number; priority: number; emplace: boolean };
    const candidates: Candidate[] = [];

    for (let i = 0; i < state.hand.length; i++) {
      const card = state.hand[i];
      const def = getCardDef(card.defId);
      if (!def) continue;

      const isFirst = !state.events.some(e => e.type === 'card_played' && e.turn === state.turn);
      const firstFree = hasFirstCardFree(state.relics) && isFirst;
      const cost = firstFree ? 0 : def.cost;
      if (cost > state.resolve) continue;
      if (def.id === 'pale_curse') continue;

      const priority = cardPlayPriority(def, state);
      const dmgCol = bestDamageCol(state);

      const colsToTry = new Set([dmgCol]);
      for (let c = 0; c < 5; c++) {
        if (state.columns[c].enemies.length > 0) colsToTry.add(c);
      }

      let bestScore = -999;
      let bestTarget = dmgCol;

      for (const tCol of colsToTry) {
        const s = scorePlay(def, tCol, state);
        if (s > bestScore) { bestScore = s; bestTarget = tCol; }
      }

      if (bestScore > 0) {
        candidates.push({ idx: i, target: bestTarget, score: bestScore, priority, emplace: false });
      }
    }

    if (candidates.length === 0) break;

    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.score - a.score;
    });

    const pick = candidates[0];
    const eventsBefore = state.events.length;
    playCard(state, pick.idx, pick.target, pick.emplace);
    if (state.events.length === eventsBefore) break;
  }

  if (state.phase === 'player' && state.outcome === 'undecided') {
    endPlayerTurn(state);
  }
}

function simulateCombat(state: CombatState): 'win' | 'lose' {
  for (let t = 0; t < MAX_TURNS; t++) {
    if (state.outcome !== 'undecided') break;
    playOneTurn(state);
  }
  return state.outcome === 'win' ? 'win' : 'lose';
}

function cardPickScore(def: CardDef | null): number {
  if (!def) return 0;
  let s = 0;
  for (const e of def.effects) {
    if (e.type === 'damage') {
      const m = e.target === 'all' ? 3 : e.target === 'column' ? 1.8 : 1;
      s += e.value * m;
    }
    if (e.type === 'block') s += e.value * 0.5;
    if (e.type === 'draw') s += e.value * 4;
    if (e.type === 'heal') s += e.value * 0.4;
    if (e.type === 'resolve') s += e.value * 6;
    if (e.type === 'vulnerable' || e.type === 'weak') s += e.value * 3;
    if (e.type === 'burn') s += e.value * 1.5;
  }
  return s / Math.max(1, def.cost);
}

function choosePath(reachable: MapNode[], run: RunState): MapNode | null {
  if (reachable.length === 0) return null;
  const hp = run.gateHp / run.gateMaxHp;
  const deckReady = run.deck.length >= 14;
  const score = (n: MapNode) => {
    switch (n.type) {
      case 'boss': return 10000;
      case 'rest': return hp < 0.5 ? 300 : 15;
      case 'shop': return hp < 0.3 ? 20 : 50;
      case 'event': return 40;
      case 'combat': return 60;
      case 'elite': return (deckReady && hp > 0.7) ? 75 : 5;
      default: return 30;
    }
  };
  return reachable.sort((a, b) => score(b) - score(a))[0];
}

interface SimResult {
  seed: string; won: boolean; diedInAct: number; diedAt: string;
  finalGateHp: number; totalCombats: number;
}

function simulateRun(seedStr: string): SimResult {
  let run = createRun(seedStr, 0);
  let totalCombats = 0;
  log(`\n── Run: ${seedStr} ──`);

  for (let act = 1; act <= 3; act++) {
    if (act > 1) run = advanceAct(run);
    const diff = getDifficultyModifiers(act, 0);
    log(` Act ${act}: gate=${run.gateHp}/${run.gateMaxHp}, deck=${run.deck.length}`);
    let step = 0;

    while (step++ < 50) {
      const reachable = getReachableNodes(run.map, run.currentNodeId);
      if (reachable.length === 0) break;
      const target = choosePath(reachable, run);
      if (!target) break;
      run = visitNode(run, target.id);

      if (target.type === 'combat' || target.type === 'elite') {
        const seed = Math.abs(run.gateHp * 7919 + step * 6151 + act * 100003);
        const rng = mulberry32(seed);
        const enc = pickEncounter(act, rng, target.type === 'elite');
        const st = createCombatState([...run.deck], seed + 1, run.gateHp, run.gateMaxHp, enc.enemies, run.relics, diff);
        totalCombats++;
        const res = simulateCombat(st);
        if (res === 'lose') return { seed: seedStr, won: false, diedInAct: act, diedAt: `${target.type} (${enc.name})`, finalGateHp: st.gateHp, totalCombats };
        run = { ...run, gateHp: st.gateHp };
        run = gainFragments(run, target.type === 'elite' ? FRAGMENT_REWARDS.elite : FRAGMENT_REWARDS.combat);
        if (run.relics.includes('mending_stone')) run = healGate(run, 5);

        const rewardRng = mulberry32(seed + 99);
        const rewards = generateCardRewards(rewardRng);
        if (run.deck.length < 22) {
          let bestDef: CardDef | null = null;
          let bestS = 3;
          for (const c of rewards) {
            const s = cardPickScore(c);
            if (s > bestS) { bestS = s; bestDef = c; }
          }
          if (bestDef) {
            run = addCardToRunDeck(run, makeCardInstance(bestDef.id));
            log(`  + ${bestDef.name} (${bestS.toFixed(1)})`);
          }
        }
      } else if (target.type === 'boss') {
        const wave = getBossWave(act);
        const st = createCombatState([...run.deck], act * 99991, run.gateHp, run.gateMaxHp, wave, run.relics, diff);
        totalCombats++;
        const res = simulateCombat(st);
        if (res === 'lose') return { seed: seedStr, won: false, diedInAct: act, diedAt: `boss act ${act}`, finalGateHp: st.gateHp, totalCombats };
        run = { ...run, gateHp: st.gateHp };
        run = gainFragments(run, FRAGMENT_REWARDS.boss);
        log(` ✓ Boss ${act} done! gate=${run.gateHp}`);
        break;
      } else if (target.type === 'rest') {
        const heal = Math.floor(run.gateMaxHp * 0.3);
        run = healGate(run, heal);
        log(`  ♥ rest → ${run.gateHp}/${run.gateMaxHp}`);
      } else if (target.type === 'shop') {
        if (run.deck.length > 13 && run.fragments >= 50) {
          let worstId = ''; let worstS = Infinity;
          for (const c of run.deck) {
            const d = getCardDef(c.defId);
            if (!d) continue;
            const s = cardPickScore(d);
            if (s < worstS) { worstS = s; worstId = c.instanceId; }
          }
          if (worstId) {
            run = removeCardFromRunDeck(run, worstId);
            run = { ...run, fragments: run.fragments - 50 };
          }
        }
      } else if (target.type === 'event') {
        run = healGate(run, 10);
      }
    }
  }

  return { seed: seedStr, won: true, diedInAct: 0, diedAt: '', finalGateHp: run.gateHp, totalCombats };
}

// ── Main ──
const seed1 = process.argv.find(a => a.startsWith('--seed='))?.split('=')[1];
const count = seed1 ? 1 : NUM_RUNS;
console.log(`Simulating ${count} runs (Ascension 0)...\n`);

let wins = 0, losses = 0;
const actDeaths = [0,0,0,0];
const deathSpots: Record<string,number> = {};
const winSeeds: string[] = [];
const winHps: number[] = [];

for (let i = 0; i < count; i++) {
  const s = seed1 ?? `s${i}`;
  const r = simulateRun(s);
  if (r.won) { wins++; winHps.push(r.finalGateHp); winSeeds.push(r.seed); }
  else { losses++; actDeaths[r.diedInAct]++; deathSpots[r.diedAt] = (deathSpots[r.diedAt]??0)+1; }
}

console.log('═══════════════════════════════════════════');
console.log('        WINNABILITY REPORT');
console.log('═══════════════════════════════════════════');
console.log(`  Runs:   ${count}`);
console.log(`  Wins:   ${wins} (${(wins/count*100).toFixed(1)}%)`);
console.log(`  Losses: ${losses} (${(losses/count*100).toFixed(1)}%)`);
console.log('');
if (losses > 0) {
  console.log('  Deaths by act:');
  for (let a = 1; a <= 3; a++) if (actDeaths[a]) console.log(`    Act ${a}: ${actDeaths[a]} (${(actDeaths[a]/losses*100).toFixed(0)}%)`);
  console.log('');
  console.log('  Top death spots:');
  Object.entries(deathSpots).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([s,n])=>console.log(`    ${s}: ${n}`));
}
if (wins > 0) {
  console.log('');
  console.log(`  Win gate HP — avg: ${(winHps.reduce((a,b)=>a+b,0)/wins).toFixed(0)}, min: ${Math.min(...winHps)}, max: ${Math.max(...winHps)}`);
  console.log(`  Winning seeds: ${winSeeds.slice(0,10).join(', ')}`);
}
console.log('═══════════════════════════════════════════');
