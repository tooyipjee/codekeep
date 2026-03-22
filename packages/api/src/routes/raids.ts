import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { findKeepByPlayerId, updateKeepResources } from '@codekeep/db';
import { findPlayerById, updatePlayerTrophies, updatePlayerShield } from '@codekeep/db';
import { createRaid, findRaidsByAttacker, findRaidsByDefender, findRaidById, findIncomingRaids } from '@codekeep/db';
import { simulateRaid } from '@codekeep/server';
import {
  RULES_VERSION, TROPHY_CONFIG, SHIELD_DURATION_MS, LEAGUE_BRACKETS, PVP_LOOT_CAP_PERCENT,
  type KeepGridState, type Resources, type ProbeType, type RaidOutcome, type League, type RaidSpawnSpec,
} from '@codekeep/shared';
import type { Env } from '../app.js';

function getLeague(trophies: number): League {
  for (const b of LEAGUE_BRACKETS) {
    if (trophies >= b.min && trophies <= b.max) return b.name;
  }
  return 'copper';
}

function computeTrophyDelta(outcome: RaidOutcome, isAttacker: boolean): number {
  if (isAttacker) {
    if (outcome === 'full_breach') return TROPHY_CONFIG.attackFullBreach;
    if (outcome === 'partial_breach') return TROPHY_CONFIG.attackPartialBreach;
    return TROPHY_CONFIG.attackDefenseWin;
  }
  if (outcome === 'defense_win') return TROPHY_CONFIG.defendDefenseWin;
  if (outcome === 'partial_breach') return TROPHY_CONFIG.defendPartialBreach;
  return TROPHY_CONFIG.defendFullBreach;
}

export const raidRoutes = new Hono<Env>();

raidRoutes.use('*', requireAuth);

raidRoutes.post('/launch', async (c) => {
  const db = c.get('db');
  const attackerId = c.get('playerId');
  const body = await c.req.json<{
    defenderPlayerId: string;
    probeTypes: ProbeType[];
    spawnSpecs?: RaidSpawnSpec[];
  }>();

  const defenderKeep = await findKeepByPlayerId(db, body.defenderPlayerId);
  if (!defenderKeep) return c.json({ error: 'Defender keep not found' }, 404);

  const defender = await findPlayerById(db, body.defenderPlayerId);
  if (!defender) return c.json({ error: 'Defender not found' }, 404);

  if (defender.shield_expires_at && defender.shield_expires_at > Date.now()) {
    return c.json({ error: 'Defender is shielded' }, 400);
  }

  const attackerKeep = await findKeepByPlayerId(db, attackerId);
  const defenderGrid: KeepGridState = JSON.parse(defenderKeep.grid_state);
  const defenderResources: Resources = JSON.parse(defenderKeep.resources);
  const seed = `pvp-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const replay = simulateRaid({
    probeCount: body.probeTypes.length,
    keepGrid: defenderGrid,
    seed,
    probeTypes: body.probeTypes,
    spawnSpecs: body.spawnSpecs,
  });

  const endEvent = replay.events.find((e) => e.type === 'raid_end');
  const outcome: RaidOutcome = endEvent?.type === 'raid_end' ? endEvent.outcome : 'defense_win';

  let rawLoot: Resources = { gold: 0, wood: 0, stone: 0 };
  for (const e of replay.events) {
    if (e.type === 'treasury_breach') {
      rawLoot.gold += e.lootTaken.gold;
      rawLoot.wood += e.lootTaken.wood;
      rawLoot.stone += e.lootTaken.stone;
    }
  }

  const lootGained: Resources = {
    gold: Math.min(rawLoot.gold, Math.floor(defenderResources.gold * PVP_LOOT_CAP_PERCENT)),
    wood: Math.min(rawLoot.wood, Math.floor(defenderResources.wood * PVP_LOOT_CAP_PERCENT)),
    stone: Math.min(rawLoot.stone, Math.floor(defenderResources.stone * PVP_LOOT_CAP_PERCENT)),
  };

  const newDefenderResources: Resources = {
    gold: Math.max(0, defenderResources.gold - lootGained.gold),
    wood: Math.max(0, defenderResources.wood - lootGained.wood),
    stone: Math.max(0, defenderResources.stone - lootGained.stone),
  };
  await updateKeepResources(db, defenderKeep.id, JSON.stringify(newDefenderResources));

  if (attackerKeep) {
    const attackerResources: Resources = JSON.parse(attackerKeep.resources);
    const newAttackerResources: Resources = {
      gold: attackerResources.gold + lootGained.gold,
      wood: attackerResources.wood + lootGained.wood,
      stone: attackerResources.stone + lootGained.stone,
    };
    await updateKeepResources(db, attackerKeep.id, JSON.stringify(newAttackerResources));
  }

  const attackerDelta = computeTrophyDelta(outcome, true);
  const defenderDelta = computeTrophyDelta(outcome, false);

  const attacker = (await findPlayerById(db, attackerId))!;
  const newAttackerTrophies = Math.max(TROPHY_CONFIG.minTrophies, attacker.trophies + attackerDelta);
  const newDefenderTrophies = Math.max(TROPHY_CONFIG.minTrophies, defender.trophies + defenderDelta);

  await updatePlayerTrophies(db, attackerId, newAttackerTrophies, getLeague(newAttackerTrophies));
  await updatePlayerTrophies(db, body.defenderPlayerId, newDefenderTrophies, getLeague(newDefenderTrophies));

  const shieldMs = SHIELD_DURATION_MS[outcome];
  await updatePlayerShield(db, body.defenderPlayerId, Date.now() + shieldMs);
  await updatePlayerShield(db, attackerId, null);

  const raidId = `r_${randomUUID().slice(0, 8)}`;
  await createRaid(db, {
    id: raidId,
    seed,
    rules_version: RULES_VERSION,
    attacker_id: attackerId,
    defender_keep_id: defenderKeep.id,
    defender_grid: JSON.stringify(defenderGrid),
    probe_types: JSON.stringify(body.probeTypes),
    outcome,
    loot_gained: JSON.stringify(lootGained),
    loot_lost: JSON.stringify(lootGained),
    replay: JSON.stringify(replay),
    attacker_trophies_delta: attackerDelta,
    defender_trophies_delta: defenderDelta,
    created_at: Date.now(),
  });

  return c.json({
    raidId,
    outcome,
    lootGained,
    trophyDelta: attackerDelta,
    newTrophies: newAttackerTrophies,
    newLeague: getLeague(newAttackerTrophies),
    replay,
  });
});

raidRoutes.get('/history', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = await findKeepByPlayerId(db, playerId);

  const attacks = await findRaidsByAttacker(db, playerId);
  const defenses = keep ? await findRaidsByDefender(db, keep.id) : [];

  const all = [...attacks, ...defenses]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 40)
    .map((r) => ({
      id: r.id,
      outcome: r.outcome,
      isAttacker: r.attacker_id === playerId,
      lootGained: JSON.parse(r.loot_gained),
      lootLost: JSON.parse(r.loot_lost),
      trophyDelta: r.attacker_id === playerId ? r.attacker_trophies_delta : r.defender_trophies_delta,
      createdAt: r.created_at,
    }));

  return c.json({ raids: all });
});

raidRoutes.get('/incoming', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = await findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ raids: [] });

  const since = parseInt(c.req.query('since') ?? '0', 10);
  const raids = await findIncomingRaids(db, keep.id, since);
  return c.json({
    raids: raids.map((r) => ({
      id: r.id,
      outcome: r.outcome,
      lootLost: JSON.parse(r.loot_lost),
      trophyDelta: r.defender_trophies_delta,
      createdAt: r.created_at,
    })),
  });
});

raidRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const raid = await findRaidById(db, c.req.param('id'));
  if (!raid) return c.json({ error: 'Raid not found' }, 404);

  return c.json({
    id: raid.id,
    outcome: raid.outcome,
    lootGained: JSON.parse(raid.loot_gained),
    lootLost: JSON.parse(raid.loot_lost),
    replay: JSON.parse(raid.replay),
    defenderGrid: JSON.parse(raid.defender_grid),
    createdAt: raid.created_at,
  });
});
