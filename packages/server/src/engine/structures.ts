import {
  type PlacedStructure,
  type StructureKind,
  type UpgradeLevel,
  type GridCoord,
  type KeepGridState,
  FIREWALL_HP,
  HONEYPOT_STUN_TICKS,
  HONEYPOT_COOLDOWN_TICKS,
  VAULT_CAPACITY,
  ENCRYPTION_MITIGATION,
  RELAY_RANGE,
  SCANNER_DAMAGE,
  SCANNER_RANGE,
  SCANNER_COOLDOWN_TICKS,
} from '@codekeep/shared';

export function getFirewallHp(level: UpgradeLevel): number {
  return FIREWALL_HP[level];
}

export function getHoneypotStunTicks(level: UpgradeLevel): number {
  return HONEYPOT_STUN_TICKS[level];
}

export function getHoneypotCooldown(level: UpgradeLevel): number {
  return HONEYPOT_COOLDOWN_TICKS[level];
}

export function getVaultCapacity(level: UpgradeLevel): number {
  return VAULT_CAPACITY[level];
}

export function getEncryptionMitigation(level: UpgradeLevel): number {
  return ENCRYPTION_MITIGATION[level];
}

export function getRelayRange(level: UpgradeLevel): number {
  return RELAY_RANGE[level];
}

export function getScannerDamage(level: UpgradeLevel): number {
  return SCANNER_DAMAGE[level];
}

export function getScannerRange(level: UpgradeLevel): number {
  return SCANNER_RANGE[level];
}

export function getScannerCooldown(level: UpgradeLevel): number {
  return SCANNER_COOLDOWN_TICKS[level];
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
 * Compute effective encryption mitigation for a vault, considering
 * encryption nodes and relay towers that extend their range.
 */
export function getEffectiveMitigation(
  grid: KeepGridState,
  vaultPos: GridCoord,
): number {
  const encryptions = grid.structures.filter((s) => s.kind === 'encryptionNode');
  const relays = grid.structures.filter((s) => s.kind === 'relayTower');

  let maxMitigation = 0;

  for (const enc of encryptions) {
    let effectiveRange = 1; // base adjacency

    for (const relay of relays) {
      if (chebyshevDistance(enc.pos, relay.pos) <= 1) {
        effectiveRange = Math.max(effectiveRange, 1 + getRelayRange(relay.level));
      }
    }

    if (chebyshevDistance(enc.pos, vaultPos) <= effectiveRange) {
      maxMitigation = Math.max(maxMitigation, getEncryptionMitigation(enc.level));
    }
  }

  return maxMitigation;
}
