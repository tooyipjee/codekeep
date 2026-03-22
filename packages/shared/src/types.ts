// ── Card System ──

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CardType = 'cast' | 'emplace';
export type CardCategory = 'armament' | 'fortification' | 'edict' | 'wild';

export interface CardEffect {
  type:
    | 'damage' | 'block' | 'draw' | 'heal' | 'resolve' | 'burn' | 'vulnerable' | 'weak' | 'fortify' | 'self_damage'
    | 'trigger_emplacements' | 'damage_per_burn' | 'damage_equal_block' | 'draw_per_kills'
    | 'damage_if_vulnerable' | 'damage_per_kill_this_action' | 'exhaust_draw' | 'burn_if_burning'
    | 'damage_plus_block' | 'replay_last' | 'damage_if_emplaced' | 'exhaust_self'
    | 'damage_if_low_hp' | 'damage_per_emplace' | 'draw_per_empty_potions';
  value: number;
  target?: 'single' | 'column' | 'all' | 'self' | 'adjacent';
}

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  category: CardCategory;
  rarity: CardRarity;
  description: string;
  effects: CardEffect[];
  emplaceCost?: number;
  emplaceHp?: number;
  emplaceEffects?: CardEffect[];
  upgraded?: boolean;
}

export interface CardInstance {
  instanceId: string;
  defId: string;
  upgraded: boolean;
}

// ── Enemy System ──

export type IntentType = 'advance' | 'attack' | 'buff' | 'debuff' | 'summon' | 'shield';

export interface Intent {
  type: IntentType;
  value: number;
  targetColumn?: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  symbol: string;
  hp: number;
  damage: number;
  speed: number;
  act: 1 | 2 | 3;
  description: string;
}

export interface EnemyInstance {
  instanceId: string;
  templateId: string;
  hp: number;
  maxHp: number;
  column: number;
  row: number;
  intent: Intent | null;
  statusEffects: StatusEffect[];
}

// ── Status Effects ──

export type StatusType = 'vulnerable' | 'weak' | 'fortified' | 'burn' | 'empowered';

export interface StatusEffect {
  type: StatusType;
  stacks: number;
  duration: number;
}

// ── Combat ──

export interface Emplacement {
  cardDefId: string;
  hp: number;
  maxHp: number;
  effects: CardEffect[];
}

export interface Column {
  index: number;
  enemies: EnemyInstance[];
  emplacement: Emplacement | null;
}

export interface DifficultyModifiers {
  enemyHpMult: number;
  enemyDamageMult: number;
  startingGateHp: number;
  extraEnemies: number;
  shopCostMult: number;
  healMult: number;
  startWithCurse: boolean;
  enemyBlitz: boolean;
  reducedRewards: boolean;
  enemyStartFortified: boolean;
  voidColumns: number;
  paleHunger: boolean;
  bossExtraMinions: number;
  reducedHandSize: boolean;
  reducedMaxResolve: boolean;
}

export interface CombatState {
  columns: Column[];
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  gateHp: number;
  gateMaxHp: number;
  gateBlock: number;
  resolve: number;
  maxResolve: number;
  turn: number;
  phase: 'player' | 'enemy' | 'ended';
  outcome: 'undecided' | 'win' | 'lose';
  events: CombatEvent[];
  seed: number;
  killsThisCombat: number;
  relics: string[];
  difficulty?: DifficultyModifiers;
  lastCardPlayed?: string;
}

export type CombatEventType =
  | 'card_played'
  | 'damage_dealt'
  | 'enemy_advance'
  | 'gate_hit'
  | 'enemy_killed'
  | 'block_gained'
  | 'emplacement_placed'
  | 'emplacement_triggered'
  | 'emplacement_destroyed'
  | 'status_applied'
  | 'turn_start'
  | 'turn_end'
  | 'combat_end';

export interface CombatEvent {
  type: CombatEventType;
  turn: number;
  data: Record<string, unknown>;
}

// ── Run / Map ──

export type NodeType = 'combat' | 'elite' | 'rest' | 'shop' | 'event' | 'boss';

export interface MapNode {
  id: string;
  type: NodeType;
  row: number;
  column: number;
  connections: string[];
  visited: boolean;
}

export interface ActMap {
  act: number;
  nodes: MapNode[];
}

export interface PotionDef {
  id: string;
  name: string;
  description: string;
  effects: CardEffect[];
}

export type RelicEffect =
  | { type: 'gain_block'; value: number }
  | { type: 'gain_resolve'; value: number }
  | { type: 'draw_cards'; value: number }
  | { type: 'deal_damage_all'; value: number }
  | { type: 'deal_damage_column'; value: number }
  | { type: 'heal'; value: number }
  | { type: 'apply_vulnerable_all'; value: number }
  | { type: 'apply_weak_all'; value: number }
  | { type: 'emplace_hp_bonus'; value: number }
  | { type: 'max_resolve_bonus'; value: number }
  | { type: 'extra_card_reward'; value: number }
  | { type: 'fragment_bonus'; value: number }
  | { type: 'first_card_free'; value: number }
  | { type: 'burn_on_kill'; value: number }
  | { type: 'block_on_emplace'; value: number };

export type RelicTrigger = 'on_combat_start' | 'on_turn_start' | 'on_card_play' | 'on_enemy_kill' | 'on_emplace' | 'on_elite_kill' | 'passive';

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  trigger: RelicTrigger;
  effect: RelicEffect;
}

export interface RunState {
  id: string;
  seed: string;
  act: number;
  map: ActMap;
  currentNodeId: string | null;
  deck: CardInstance[];
  gateHp: number;
  gateMaxHp: number;
  fragments: number;
  potions: (string | null)[];
  relics: string[];
  ascensionLevel: number;
  combat: CombatState | null;
}

// ── The Keep (meta-progression) ──

export interface NpcState {
  id: string;
  tier: number;
  echoesGiven: number;
  dialoguesSeen: string[];
}

export interface KeepState {
  structures: Record<string, number>;
  npcs: NpcState[];
  echoes: number;
  highestAscension: number;
  totalRuns: number;
  totalWins: number;
  unlockedCardIds: string[];
  achievements: string[];
  narrativeFlags: string[];
}

// ── Save ──

export interface GameSave {
  schemaVersion: number;
  savedAtUnixMs: number;
  playerName: string;
  keep: KeepState;
  activeRun: RunState | null;
}
