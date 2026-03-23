# CodeKeep: The Pale

A deck-building tactical roguelike played in your terminal.

Build a deck. Defend the Gate. Push back the Pale.

## Install

**Via npx** (requires npm):
```bash
npx codekeep
```

**Via curl** (requires Node.js 20+, no npm needed):
```bash
curl -fsSL https://raw.githubusercontent.com/tooyipjee/codekeep/main/install.sh | sh
```

**Via npm** (global install):
```bash
npm install -g codekeep
codekeep
```

## What Is It?

CodeKeep is a Slay the Spire-inspired roguelike that runs entirely in your terminal. Navigate procedural maps, fight enemies on a 5-column tactical grid, build your deck with 70+ unique cards, and uncover a layered narrative across dozens of runs.

### Core Loop

1. **Draw** — 5 cards each turn from your deck
2. **Play** — Spend Resolve to cast cards (damage, block, heal) or **emplace** them as permanent column structures
3. **End Turn** — Enemies advance, attack, and execute their telegraphed intents
4. **Win** — Kill all enemies before they destroy your Gate

### Features

- **70+ cards** across 4 categories: Armament, Fortification, Edict, Wild
- **Emplacements** — Dual-use cards that can be placed as persistent structures on the 5-column grid
- **13 enemy types** + 3 multi-phase bosses (The Suture, The Archivist, The Pale Itself)
- **3-act campaign** with procedural branching maps, shops, events, rest sites
- **The Keep** — Persistent hub with 5 structures to upgrade and 5 NPCs with evolving relationships
- **15 Ascension levels** — Stacking difficulty modifiers for replayability
- **15 relics** — Passive bonuses from bosses and elites
- **5 potions** — Consumable tactical options
- **30 achievements** with Echo rewards
- **Daily challenge** — Seeded runs with scoring
- **Layered narrative** — Inscryption-style story that unfolds across 50+ runs
- **12 lore entries** revealing the mystery of the Pale
- **Git integration** (optional) — Small damage bonuses from daily commits (capped at 10%)
- **Save/resume** — Autosaves on every action; crash recovery on next launch
- **Local-first** — No backend, no account, no telemetry

### Controls

| Key | Action |
|-----|--------|
| `1-9` | Select card |
| `←→` or `h/l` | Target column |
| `Enter` | Play selected card |
| `Space` | End turn |
| `e` | Toggle emplace mode |
| `d` | View deck |
| `q` | Quit / back |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm play      # launch the game
pnpm dev       # watch mode
```

### Architecture

```
packages/
  shared/     — Types, constants, narrative data. Zero dependencies.
  server/     — Pure game engine. No UI. All functions testable.
  cli/        — Ink (React for CLI) TUI. Thin render layer.
```

### Testing

```bash
pnpm test              # all tests
pnpm --filter @codekeep/server test   # engine only
pnpm --filter codekeep test           # CLI only
```

## License

MIT
