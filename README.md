```
   ____          _       _  __              
  / ___|___   __| | ___ | |/ /___  ___ _ __ 
 | |   / _ \ / _` |/ _ \| ' // _ \/ _ \ '_ \
 | |__| (_) | (_| |  __/| . \  __/  __/ |_) |
  \____\___/ \__,_|\___||_|\_\___|\___| .__/ 
                                      |_|    
```

Async tower defense terminal game — build ASCII fortresses while you vibe code.

```bash
npx codekeep
```

---

## Quickstart

**Play instantly** (no install):

```bash
npx codekeep@latest
```

**From source:**

```bash
git clone <repo-url>
cd codekeep
pnpm install
pnpm build
pnpm play
```

**Prerequisites:** Node.js **≥ 20**

---

## How to Play

Build a keep on a 16×16 grid, place defensive structures, and fend off NPC raiders. Resources come from a sim-mode faucet (press `f`), foraging fragments on the grid, and winning raids.

### Controls

| Keys | Action |
|------|--------|
| `h` `j` `k` `l` / `WASD` / Arrows | Move cursor |
| `[` `]` | Cycle selected structure |
| `1`–`7` | Select structure by number |
| `e` or `Enter` | Place structure at cursor |
| `u` | Upgrade structure (Lv.1 → 2 → 3) |
| `x` | Demolish structure (50% refund) |
| `z` | Undo last build/upgrade/demolish |
| `r` | Quick defend (instant raid result) |
| `v` | Watch replay of last defense |
| `f` | Kingdom boon (sim-mode resources) |
| `g` + coords | Jump to coordinate (e.g. `g 5,3`) |
| `Tab` | Jump to next structure |
| `p` | Copy keep postcard to clipboard |
| `?` | Toggle full help screen |
| `Esc` | Back to main menu |
| `q` | Save and quit |

**Raid replay:** `p` pause · `1` / `2` / `4` / `8` speed · `n` skip to end · `q` exit

### Structures

| # | Symbol | Structure | Role |
|---|--------|-----------|------|
| 1 | `#` | Stone Wall | Blocks raiders, has HP |
| 2 | `%` | Bear Trap | Stuns raiders on contact |
| 3 | `$` | Treasury | Stores loot, generates passive income |
| 4 | `@` | Ward | Reduces loot stolen from nearby treasuries |
| 5 | `^` | Watchtower | Extends ward range, auto-gathers forage |
| 6 | `!` | Archer Tower | Fires arrows at raiders in range |
| 7 | `&` | Vault | Protects stored resources from raids |

Empty cells render as `·`.

### Structure Synergies

Place structures in specific patterns for bonus effects:

| Synergy | Pattern | Bonus |
|---------|---------|-------|
| **Killbox** | Trap + Archer Tower adjacent | +30% archer damage to stunned |
| **Fortress** | 3+ walls in a line | +25% wall HP in line |
| **Sanctum** | Ward + Treasury + Watchtower adjacent | 2x treasury mitigation |
| **Gauntlet** | 2+ traps within 3 tiles | +2 stun ticks |

### Resources

| Icon | Resource | Sources |
|------|----------|---------|
| ● | **Gold** | Events, foraging, raids, passive income |
| ♣ | **Wood** | Events, treasuries, foraging |
| ■ | **Stone** | Events, watchtowers, foraging |

Treasuries and watchtowers generate passive income over time.

### Raider Types

| Type | HP | Dmg | Speed | Behavior |
|------|---:|----:|------:|----------|
| Raider | 15 | 4 | 1 | Standard foot soldier |
| Scout | 8 | 2 | 2 | Fast, attacks weakest blocker |
| Brute | 30 | 6 | 1 | Targets defenses first |

### Raid Difficulty (Lv.1–10)

Difficulty scales with total raids completed. Higher levels bring more raiders, scouts, and brutes. At difficulty 2+, random **anomalies** modify raid rules (Fog of War, Speed Raid, Fortified, Swarm, etc.). At difficulty 6+, you may face two anomalies at once.

---

## Roguelike Features

### Raid Anomalies

Random modifiers applied to raids: faster raiders, double brute chance, halved watchtower range, all-from-one-edge flanking, and more. Displayed during raids and in the HUD.

### Choice-based Rewards

After winning a raid, pick 1-of-3 rewards:
- **Gold Cache** — big gold payout
- **Supply Crate** — balanced resources
- **Buff** — temporary modifier lasting 2-3 raids (e.g. Fortified Walls, Archer Focus)

Active buffs stack multiplicatively with anomaly modifiers.

### Prestige / Ascension

Once you've won 50 raids, you can **prestige** from the menu. This resets your keep and structures but grants permanent unlocks:

| Level | Unlock | Effect |
|------:|--------|--------|
| 1 | War Chest | Start with 2x resources |
| 2 | Veteran Builder | New structures start at Lv.2 |
| 3 | Deep Wells | +3 faucet uses before diminishing |
| 4 | Trade Routes | +50% passive income |
| 5 | Oracle | Choose from 2 anomalies (coming soon) |

Achievements, daily challenge scores, and lifetime stats are preserved across prestiges.

### Daily Challenge

Date-seeded escalating waves on a fixed grid. Compete for the best score each day.

---

## Git Integration (optional)

Wire your real repo so commits feed the coding event system:

```bash
cp /path/to/codekeep/packages/cli/scripts/hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

**No git required:** the game is fully playable in **sim mode**. Press `f` to simulate a coding event.

---

## CLI Flags

```bash
codekeep                  # Launch the game
codekeep --tutorial       # Force tutorial replay
codekeep --resume         # Skip menu, jump to keep
codekeep --ascii          # Pure ASCII (no Unicode box drawing)
codekeep --compact        # Compact layout for small terminals
codekeep --no-save        # Dry-run mode (no save writes)
codekeep --stats          # Print save file stats as JSON and exit
```

---

## Architecture

| Package | Role |
|---------|------|
| **`packages/shared`** | Types, constants, balance tables — zero deps |
| **`packages/server`** | Pure game engine: grid, raids, economy, prestige, NPC keeps |
| **`packages/cli`** | Ink TUI: rendering, input, local-first gameplay |
| **`packages/db`** | Database persistence (Turso/SQLite) |
| **`packages/api`** | Hono HTTP API for future online PvP |

## Development

```bash
pnpm install   # Install all deps
pnpm build     # Build all packages
pnpm test      # Run all tests (Vitest)
pnpm play      # Launch the game
pnpm dev       # Watch mode
```

Minimum terminal: 80×24. Tested on iTerm2, Terminal.app, Alacritty, Windows Terminal.

---

## License

MIT
