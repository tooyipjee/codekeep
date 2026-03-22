# CodeKeep: The Pale — Team Working Agreements

## Project Overview
CodeKeep: The Pale is a deck-building tactical roguelike played in the terminal. Navigate procedural maps, fight enemies on a 5-column grid, build your deck, emplace structures, and uncover a layered narrative. Local-first — all game logic runs locally, no backend required.

## Architecture
- **`packages/shared`** — Types, constants, narrative data, balance tables. Zero dependencies. Imported by both server and cli.
- **`packages/server`** — Pure game engine: combat, deck, enemies, map generation, run state, economy, Keep meta-progression, narrative, persistence. No UI. No network. All functions are pure and testable.
- **`packages/cli`** — Ink (React for CLI) TUI client. Renders the game, handles input, calls server functions directly (local mode).

## Key Conventions

### Game Logic Lives in `server`, Never in `cli`
All game rules, validation, simulation, and state mutations happen in `packages/server`. The CLI is a thin rendering + input layer. This ensures the engine is testable without TUI and portable to a real backend later.

### Types Live in `shared`
All shared type definitions (`GameSave`, `KeepState`, `RunState`, `CombatState`, `CardDef`, `EnemyTemplate`, etc.) live in `packages/shared/src/types.ts`. Balance constants and card/enemy definitions live in `packages/shared/src/constants.ts`. Narrative data lives in `packages/shared/src/narrative/`.

### ASCII Rendering Rules
- Safe character set: `· # % $ @ ^ ◆ ★ ☠ ↑ ≈ ⚒ ↔ ◇ ∞ ◈ ▣ ◉` for entities, box-drawing for borders
- 16-color baseline (bold + red/yellow/green/cyan/white). Never require truecolor for readability
- Fallback: set `CODEKEEP_ASCII=1` for pure ASCII (no Unicode)
- Grid is rendered as monospace Text components (performance)

### Deterministic Combat
- All RNG uses mulberry32 seeded from `hash(seed, turn, context)`
- Enemies sorted by instanceId for tie-breaks
- Same seed + same deck layout + same plays = identical outcome, always

### Balance Changes
1. Update constants in `packages/shared/src/constants.ts`
2. Run `pnpm test` — balance smoke tests must pass
3. Never hardcode numbers in engine or UI code

### Card Pool
- 70+ cards across 4 categories (Armament, Fortification, Edict, Wild)
- Cards can be `cast` (immediate) or `emplace` (dual-use: cast for instant effect, or emplace as permanent column structure)
- Rarities: Common, Uncommon, Rare, Legendary

### Combat System
- 5-column, 4-row tactical grid
- Players spend Resolve (3/turn) to play cards
- Enemies advance, attack, or use special intents (buff, debuff, shield, summon)
- Status effects: Vulnerable, Weak, Fortified, Burn, Empowered
- Emplacements trigger at the start of each turn

## Testing
- Framework: Vitest everywhere + ink-testing-library for TUI
- Test game logic in `packages/server/test/` with pure function unit tests
- Test TUI components in `packages/cli/test/` with `render()` + `lastFrame()`

## Commands
- `pnpm install` — install all deps
- `pnpm build` — build all packages
- `pnpm test` — run all tests
- `pnpm play` — launch the game in dev mode
- `pnpm dev` — watch mode for all packages

## Terminal Compatibility
Minimum: 60x18. Support iTerm2, Terminal.app, Alacritty, Windows Terminal.

## Quality Bar
- Startup < 2s cold, < 1s warm
- Input latency ≤ 50ms median
- Autosave on every action; crash recovery on next launch
- No card > 70% pick rate in > 80% of test runs
