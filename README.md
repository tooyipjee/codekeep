```
   ____          _       _  __              
  / ___|___   __| | ___ | |/ /___  ___ _ __ 
 | |   / _ \ / _` |/ _ \| ' // _ \/ _ \ '_ \
 | |__| (_) | (_| |  __/| . \  __/  __/ |_) |
  \____\___/ \__,_|\___||_|\_\___|\___| .__/ 
                                      |_|    
```

Async tower defense terminal game powered by your coding activity

---

**Demo GIF (placeholder)** — Add a short screen recording here (e.g. `docs/demo.gif` or inline in this README) showing menu → build → raid playback.

---

## Quickstart

**Prerequisites:** Node.js **≥ 20**, **pnpm**

```bash
git clone <repo-url>
cd vibe-td
pnpm install
pnpm build
pnpm play
# or, after build:
node packages/cli/dist/index.js
```

**Dev (watch):** `pnpm dev`

---

## How to Play

### Controls

| Keys | Action |
|------|--------|
| `h` `j` `k` `l` | Move cursor (vim-style) |
| `W` `A` `S` `D` | Move cursor |
| Arrow keys | Move cursor |
| `[` `]` | Cycle selected structure type |
| `Enter` or `e` | Place structure at cursor |
| `u` | Upgrade structure at cursor |
| `x` | Demolish structure at cursor |
| `f` | Simulate a coding event (resource faucet — **sim mode**) |
| `?` | Toggle help |
| `Esc` | Back to main menu (from keep) |
| `q` | Save and quit |

**Main menu:** `j`/`k`, `W`/`S`, or arrows to move selection; `Enter` to choose; `q` to quit.

**Raid replay:** `p` or `Space` pause; `1` / `2` / `4` speed; `q` or `Esc` to exit.

### Structures (grid symbols)

| Symbol | Structure | Role |
|--------|-------------|------|
| `#` | Firewall | Blocks probe movement |
| `%` | Honeypot | Stuns probes that enter |
| `$` | Data Vault | Stores resources (raid target) |
| `@` | Encryption | Reduces loot from adjacent vaults |
| `^` | Relay Tower | Extends encryption range |

Empty cells render as `·`.

### Resources

Building and upgrading spend three resource types (see HUD):

- **Compute** — primary construction budget for many structures.
- **Memory** — used heavily by vaults and some defensive pieces.
- **Bandwidth** — ties to connectivity-heavy structures (e.g. relays, firewalls).

Daily caps apply; excess is clamped by the economy rules in the engine.

---

## Git integration (optional)

Wire your real repo so commits can feed the same **coding event** system the game already understands.

### Install the `post-commit` hook

From your **project git repo** (not necessarily this monorepo), install the hook so it runs after each commit:

```bash
cp /path/to/codekeep/packages/cli/scripts/hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

Point `cp` at your CodeKeep checkout (a symlink is fine). If that path is not in your tree yet, see `docs/testing-strategy-codekeep.md` for the intended layout and sandbox testing via `scripts/git-test-sandbox.sh`. The hook should record a **`git_commit`**-style event into the game’s local save (behavior is defined by the hook script).

### Event types the engine grants

Resource grants are keyed by event type (see `CODING_EVENT_GRANTS` in shared constants):

| Event | Typical source |
|-------|----------------|
| `git_commit` | Post-commit hook / git activity |
| `build_success` | Successful builds (CI or local tooling, when wired) |
| `tests_pass` | Test runs passing (when wired) |
| `session_reward` | Session-style rewards |
| `daily_login` | Daily check-in style rewards |

**No git required:** the game is fully playable in **sim mode**. Press **`f`** in the keep view to simulate a coding event and receive resources without any hooks.

---

## Architecture

Monorepo layout:

| Package | Role |
|---------|------|
| **`packages/shared`** | Shared types, constants, balance tables — no runtime deps; imported by server and CLI. |
| **`packages/server`** | Pure game engine: grid, raids, economy, NPC keeps, persistence. No UI, no network. |
| **`packages/cli`** | Ink-based TUI: rendering and input; calls server code directly (local-first). |

Game rules and mutations stay in **`server`**; the CLI stays a thin client.

---

## Development

```bash
pnpm test    # all packages (Vitest)
pnpm build   # turbo build across packages
```

---

## Local simulation note

This is the **local-first** build: raids are against **NPC-generated keeps**, saves live on disk, and there is **no** networked multiplayer yet. **Async multiplayer is planned for v2.**

---

## License

MIT
