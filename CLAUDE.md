# CodeKeep — Team Working Agreements

## Project Overview
CodeKeep is an async tower defense terminal game where developers build ASCII fortresses powered by real coding activity. This is the local-first build — all game logic runs locally, no backend required.

## Architecture
- **`packages/shared`** — Types, constants, balance tables. Zero dependencies. Imported by both server and cli.
- **`packages/server`** — Pure game engine: grid logic, raid simulation, economy, NPC generation, persistence. No UI. No network. All functions are pure and testable.
- **`packages/cli`** — Ink (React for CLI) TUI client. Renders the game, handles input, calls server functions directly (local mode).

## Key Conventions

### Game Logic Lives in `server`, Never in `cli`
All game rules, validation, simulation, and state mutations happen in `packages/server`. The CLI is a thin rendering + input layer. This ensures the engine is testable without TUI and portable to a real backend later.

### Types Live in `shared`
All shared type definitions (`GameSave`, `Keep`, `PlacedStructure`, `Resources`, `RaidRecord`, etc.) live in `packages/shared/src/types.ts`. Balance constants live in `packages/shared/src/constants.ts`.

### ASCII Rendering Rules
- Safe character set: `· # % $ @ ^` for structures, box-drawing `─│┌┐└┘├┤┬┴┼` for borders
- 16-color baseline (bold + red/yellow/green/cyan/white). Never require truecolor for readability
- Fallback: set `CODEKEEP_ASCII=1` for pure ASCII (no Unicode box drawing)
- Grid is 16 lines of monospace Text, not nested Box components (performance)

### Deterministic Raid Simulation
- All RNG uses mulberry32 seeded from `hash(rulesVersion, keepId, raidId, nonce)`
- Probes iterated in sorted `probeId` order; structures sorted by `id` for tie-breaks
- Fixed timestep: 8 Hz tick rate, max 2400 ticks
- Same seed + same keep layout = identical outcome, always

### Balance Changes
1. Update constants in `packages/shared/src/constants.ts`
2. Run `pnpm test` — balance smoke tests must pass
3. Never hardcode numbers in engine or UI code

### Sim Mode is First-Class
The game must be fully playable without git integration. Sim mode (resource faucet) is the default for local play. Git hook integration is optional and additive.

## Testing
- Framework: Vitest everywhere + ink-testing-library for TUI
- Test game logic in `packages/server/test/` with pure function unit tests
- Test TUI components in `packages/cli/test/` with `render()` + `lastFrame()`
- Raid simulation tests must verify determinism (same seed = same result)

## Commands
- `pnpm install` — install all deps
- `pnpm build` — build all packages
- `pnpm test` — run all tests
- `pnpm play` — launch the game in dev mode
- `pnpm dev` — watch mode for all packages

## Terminal Compatibility
Minimum: 80x24. Support iTerm2, Terminal.app, Alacritty, Windows Terminal. Test on at least 2 terminals per release.

## Quality Bar
- Startup < 2s cold, < 1s warm
- Input latency ≤ 50ms median
- Autosave on every action; crash recovery on next launch
- No structure > 70% usage in > 80% of seeded test runs
- Raids: same seed, different layout → different outcome
