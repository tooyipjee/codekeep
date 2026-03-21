# CodeKeep — Testing Strategy (Local-First)

This document defines frameworks, layout, named cases, manual QA, and helper scripts for the CodeKeep pnpm monorepo (`cli`, `server`, `shared`).

---

## 1. Test Infrastructure Setup

### Framework choices (by package)

| Package | Primary runner | Rationale |
|--------|----------------|-----------|
| **shared** | **Vitest** | Fast, native ESM/TS, great watch mode, `vi.mock` for tiny pure modules. |
| **server** | **Vitest** | Same toolchain; colocate tests with game logic; snapshot optional for serialized state. |
| **cli** | **Vitest** + **ink-testing-library** | Official Ink pattern: render to string/stream, assert stdout and stdin events. |

**Avoid Jest** unless you already depend on it: Vitest’s defaults align better with modern TS + ESM monorepos and pnpm.

**Optional additions**

- **`@testing-library/react`** — only if you mix non-Ink React in `cli`; for Ink, prefer `ink-testing-library`.
- **`happy-dom` or `jsdom`** — Vitest `environment: 'node'` is usually enough for Ink; add a DOM env only if you mount non-Ink UI.
- **`execa` or `tinyspawn`** — subprocess tests for “real” CLI entry (optional smoke layer).

### Testing Ink / React TUI components

1. **Unit-ish (component)**  
   - Use `ink-testing-library` `render()` → `lastFrame()` for **ASCII snapshot or string includes**.  
   - Prefer **targeted assertions** (`expect(frame).toContain('█')`) over huge full-screen snapshots unless the layout is stable.

2. **Integration (screen + input)**  
   - `stdin.write()` arrow keys / letters; `waitFor` until `lastFrame()` matches expected HUD or grid substring.  
   - **Snapshots**: commit golden files for stable screens (main grid, HUD); use **inline snapshots** sparingly for small widgets.

3. **What not to over-test in Ink**  
   - Pixel-perfect layout across terminals — defer to **manual matrix** (section 6).

### Local test git repository (for hooks)

- Create a **dedicated directory outside the game repo** (e.g. `../codekeep-hook-fixture`) or under `fixtures/git-sandbox/` **gitignored**, generated at test time.
- Tests should **`git init` in `os.tmpdir()`** with a unique folder per test file or use **`tmp`** / **`fs.mkdtempSync`** to avoid collisions in parallel runs.
- Install **only the hook under test** (e.g. symlink or copy `post-commit` from `packages/cli/scripts/hooks/post-commit` into `.git/hooks/`).
- Use **real `git` binary** in CI (install git in the runner image). Mock git only for “git not available” scenarios (section 4).

### Monorepo test directory structure

```
packages/
  shared/
    src/
    test/                    # or **/*.test.ts colocated — pick one convention
      constants.test.ts
  server/
    src/
    test/
      raid/
      resources/
      structures/
      keep/
      mock-server/
  cli/
    src/
    test/
      components/
      integration/
      git/
e2e/                         # optional: subprocess + real TTY smoke
  smoke.spec.ts
fixtures/                    # static files only; generated sandboxes stay in /tmp or gitignored
  sample-game-state.json
```

**Convention**: Either **colocate** `foo.test.ts` next to `foo.ts` or use **`test/` mirrors** — do not mix both without a written rule.

**Root `vitest.workspace.ts`** (or `vitest.config.ts` per package) ties workspaces; shared `test` setup can live in `packages/server/test/setup.ts` (e.g. reset RNG seeds).

---

## 2. Game Logic Unit Tests (Highest Priority)

### Focus areas

- **Raid simulation**: deterministic RNG (seeded), tick order, pathfinding, structure effects, raid end conditions.
- **Resources**: map coding events → grants, caps, rounding, idempotency.
- **Structures**: placement rules, adjacency, upgrade gates, cost/refund if applicable.
- **Keep state**: `serialize` ↔ `deserialize` round-trip, migrations/version field, invalid input rejection.

### At least 15 named test cases (what they verify)

1. **`raid_probe_pathfinding_avoids_blocked_tiles`** — Probes never step onto blocked cells; path exists when a valid corridor exists.
2. **`raid_probe_repaths_when_structure_blocks_mid_raid`** — If a tower is placed (or upgraded) such that the old path is blocked, behavior matches spec (repath vs fail vs despawn).
3. **`raid_structure_slow_applies_before_damage_tick_order`** — Slow effect order vs damage is fixed and documented in assertions.
4. **`raid_structure_max_range_does_not_hit_outside_radius`** — Targets only within Manhattan or Euclidean radius per design.
5. **`raid_empty_grid_probe_exits_map_without_crash`** — Edge case: no structures, probe leaves or despawns per rules.
6. **`raid_simulation_deterministic_with_same_seed`** — Same seed → identical outcome (positions, HP, result).
7. **`resources_coding_event_maps_commit_to_correct_grant`** — e.g. `commit` → +N of resource X per config.
8. **`resources_duplicate_event_id_is_idempotent`** — Same event processed twice does not double-grant.
9. **`resources_grant_respects_global_cap`** — Cannot exceed max storage; overflow handling matches spec (waste vs bank).
10. **`placement_valid_tile_places_structure_and_deducts_cost`** — Grid updates, balance decreases.
11. **`placement_invalid_out_of_bounds_rejected`** — Negative or ≥16 rejected with stable error.
12. **`placement_invalid_occupied_tile_rejected`** — Second structure on same cell fails.
13. **`upgrade_structure_level2_requires_level1_and_deducts_delta_cost`** — Cannot skip levels; cost is incremental.
14. **`keep_state_roundtrip_serialize_deserialize_equals_original`** — Full equality after JSON/binary round-trip.
15. **`keep_state_rejects_unknown_version_or_corrupt_payload`** — Clear error, no partial mutation.
16. **`keep_state_transition_pause_to_simulation_updates_phase_invariant`** — Illegal transitions rejected (bonus case).

---

## 3. TUI Integration Tests

### Keyboard navigation on the 16×16 grid

- Render the grid screen with `ink-testing-library`.
- **Simulate keys** with the library’s stdin API (or a thin wrapper): ArrowLeft/Right/Up/Down, Enter, Escape, shortcuts for build menu.
- **Assert cursor position** by either:
  - **Parsing** `lastFrame()` for a cursor marker (e.g. inverse video character or bracket), or
  - **Injecting a test-only prop** `data-cursor={row,col}` is *not* available in Ink the same way as DOM — prefer **exported pure function** `getCursorFromModel(state)` tested in `server`/`shared`, and TUI tests assert the **model** after key events by exporting handlers (see below).

**Recommended pattern**: Keep **grid navigation logic** in a pure module (`moveCursor(state, key)`) tested in **server/shared**; TUI test only verifies **wiring** (key → handler called) + **one** full frame check.

### Rendering output (ASCII correctness)

- **Golden string tests** on `lastFrame()` for:
  - Empty grid borders
  - One structure type at (0,0)
  - HUD line with three resource counts
- Normalize **trailing whitespace** in tests (`trimEnd` per line) to avoid flaky width differences.

### HUD updates when resources change

- Drive props/state: dispatch “coding event processed” or call `onResourceChange` with new numbers.
- `waitFor(() => expect(lastFrame()).toContain('Gold: 12'))` style assertions.

### Tutorial flow end-to-end

- **State-machine test** in `server`/`cli` shared module: `tutorialReducer` steps `INTRO → FIRST_BUILD → FIRST_RAID → DONE`.
- **Ink integration**: script **recorded input sequence** (array of keys) → assert frames contain expected prompts in order.
- Optionally **one** Playwright-style is overkill; prefer **Vitest + ink-testing-library** for CLI.

---

## 4. Git Hook Integration Tests

### Temporary repo setup

- `beforeEach`: `mkdtemp` → `git init` → `git config user.email/user.name` (local only) → create minimal file → `git add` → `git commit` to have HEAD.
- Install hook: copy or symlink CodeKeep’s `post-commit` into `.git/hooks/post-commit`; `chmod +x`.
- Point hook env vars at **mock server URL** or **CLI IPC file** (whatever the product uses) so the hook does not touch production.

### Cases

| Test | Verifies |
|------|----------|
| **`hook_post_commit_fires_and_emits_expected_payload`** | After commit, mock receives one event with branch, hash, message (shape in shared types). |
| **`hook_resource_grant_after_simulated_commit`** | End-to-end: commit in fixture repo → local mock applies grant → game state resource increases (integration with server mock). |
| **`hook_graceful_when_git_missing`** | If `PATH` excludes `git` or `spawn` throws, hook exits 0 (or non-blocking) and logs once — per product requirements. |

**Parallel runs**: use unique temp dirs; do not share one global repo.

---

## 5. Local Mock Server Tests

| Test | Verifies |
|------|----------|
| **`mock_persistence_save_then_load_restores_identical_state`** — Write state to mock store, new process loads, deep-equals. |
| **`mock_npc_keep_generation_is_deterministic_with_seed`** — Same seed → same NPC layout/stats. |
| **`mock_raid_npc_keep_returns_valid_result_schema`** — Result passes zod/schema; damage ≥ 0; no NaN; duration ≥ 0. |
| **`mock_raid_npc_keep_weak_defense_ends_in_success_for_attacker`** — Controlled fixture: attacker wins. |
| **`mock_concurrent_requests_are_serialized_or_safe`** — If async, no lost updates (optional if mock is single-threaded). |

---

## 6. Manual QA Checklist (Local Playable)

### What humans should verify (automation gaps)

- **Readability**: Font, line spacing, and color contrast (if any ANSI) across themes.
- **Resize behavior**: Narrow/wide terminal, sudden resize mid-game — no corrupted layout or stuck input.
- **Latency perception**: Large raid or log spam — UI stays responsive; no duplicate key handling.
- **Real workflow**: Point real project’s git at CodeKeep hook for a day — emotional sanity check.
- **Copy/paste** of in-terminal instructions (tutorial) if applicable.

### Terminal compatibility matrix

| Client | OS | Check |
|--------|----|--------|
| iTerm2 | macOS | Colors, alt-screen, mouse if used |
| Terminal.app | macOS | Default profile |
| Alacritty | macOS/Linux | Fast resize |
| Windows Terminal | Windows | UTF-8 box drawing, Ctrl+C behavior |
| WezTerm | cross | Font fallback |
| VS Code integrated | cross | Limited height, no true TTY quirks |

### Likely bugs / regressions

- **ANSI leakage** when piping stdout (`isTTY` branches).
- **16×16 off-by-one** at edges; cursor wrap.
- **Keyboard repeat** causing double placement.
- **Raid pause** vs animation desync.
- **Save file** corruption on crash mid-write (manual: kill -9 during save).
- **Hook** firing on `git commit --amend`, merge commits, or empty commits.

---

## 7. Test Git Repo — Structure and Scripts

### Structure

- **Not** committed inside the game repo as a `.git` tree.  
- **Generated** under:
  - `os.tmpdir()/codekeep-git-test-*` for automated tests, or
  - **Gitignored** path `fixtures/git-sandbox/generated/` for local debugging.

Contents of a generated sandbox:

```
.git/
  hooks/post-commit   # CodeKeep hook under test
  HEAD
  ...
README.txt            # committed file for new commits
```

### Scripts (see `scripts/git-test-sandbox.sh` in repo)

- **`create`**: init, config user, optional install hook from `PACKAGES/cli/...`.
- **`commit <message>`**: append to README, commit — for manual hook debugging.
- **`teardown`**: `rm -rf` the sandbox path.

CI should always **create fresh**; developers may reuse `FIXTURE_DIR` env for inspection.

---

## Summary Table

| Layer | Tooling |
|-------|---------|
| Unit / integration | Vitest |
| Ink | ink-testing-library |
| Git hooks | tmpdir + real git + hook file |
| E2E smoke (optional) | Vitest + spawn CLI |

This strategy keeps **deterministic logic** in Vitest with **seeded RNG**, **Ink** at the boundary with **frames + stdin**, and **git** as an **optional integration** with explicit “no git” coverage.
