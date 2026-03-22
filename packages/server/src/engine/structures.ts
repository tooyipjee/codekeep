import {
  type PlacedStructure,
  type StructureKind,
  type UpgradeLevel,
  type GridCoord,
  type KeepGridState,
  WALL_HP,
  ARCHER_TOWER_HP,
  WATCHTOWER_HP,
  VAULT_HP,
  TRAP_STUN_TICKS,
  TRAP_COOLDOWN_TICKS,
  TREASURY_CAPACITY,
  WARD_MITIGATION,
  WATCHTOWER_RANGE,
  ARCHER_DAMAGE,
  ARCHER_RANGE,
  ARCHER_COOLDOWN_TICKS,
} from '@codekeep/shared';

export function getWallHp(level: UpgradeLevel): number {
  return WALL_HP[level];
}

export function getArcherTowerHp(level: UpgradeLevel): number {
  return ARCHER_TOWER_HP[level];
}

export function getWatchtowerHp(level: UpgradeLevel): number {
  return WATCHTOWER_HP[level];
}

export function getVaultHp(level: UpgradeLevel): number {
  return VAULT_HP[level];
}

export function getTrapStunTicks(level: UpgradeLevel): number {
  return TRAP_STUN_TICKS[level];
}

export function getTrapCooldown(level: UpgradeLevel): number {
  return TRAP_COOLDOWN_TICKS[level];
}

export function getTreasuryCapacity(level: UpgradeLevel): number {
  return TREASURY_CAPACITY[level];
}

export function getWardMitigation(level: UpgradeLevel): number {
  return WARD_MITIGATION[level];
}

export function getWatchtowerRange(level: UpgradeLevel): number {
  return WATCHTOWER_RANGE[level];
}

export function getArcherDamage(level: UpgradeLevel): number {
  return ARCHER_DAMAGE[level];
}

export function getArcherRange(level: UpgradeLevel): number {
  return ARCHER_RANGE[level];
}

export function getArcherCooldown(level: UpgradeLevel): number {
  return ARCHER_COOLDOWN_TICKS[level];
}

export function getAdjacentCoords(pos: GridCoord): GridCoord[] {
  return [
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
  ];
}

export function chebyshevDistance(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattanDistance(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Compute effective ward mitigation for a treasury, considering
 * wards and watchtowers that extend their range.
 */
export function getEffectiveMitigation(
  grid: KeepGridState,
  treasuryPos: GridCoord,
  watchtowerRangeMult = 1,
): number {
  const wards = grid.structures.filter((s) => s.kind === 'ward');
  const watchtowers = grid.structures.filter((s) => s.kind === 'watchtower');

  let maxMitigation = 0;

  for (const w of wards) {
    let effectiveRange = 1;

    for (const wt of watchtowers) {
      if (chebyshevDistance(w.pos, wt.pos) <= 1) {
        effectiveRange = Math.max(effectiveRange, 1 + Math.floor(getWatchtowerRange(wt.level) * watchtowerRangeMult));
      }
    }

    if (chebyshevDistance(w.pos, treasuryPos) <= effectiveRange) {
      maxMitigation = Math.max(maxMitigation, getWardMitigation(w.level));
    }
  }

  return maxMitigation;
}
