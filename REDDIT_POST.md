# Reddit Post Draft

## Title
I built a roguelike that runs in your terminal and gets stronger when you commit code

## Subreddit Targets (in order)
1. r/programming (Day 1)
2. r/commandline (Day 1)
3. Hacker News — Show HN (Day 1)
4. r/roguelikes (Day 4, Sharing Saturday)
5. r/gamedev (Day 5)
6. r/typescript (Day 7)

---

## Post Body (r/programming / r/commandline version)

**Try it now:**

```
npx codekeep
```

No download. No account. No telemetry. Just a terminal.

---

I've been working on **CodeKeep: The Pale** — a Slay the Spire-inspired deck-building roguelike that runs entirely in your terminal.

**What it is:**

- 🃏 70+ cards across 4 categories (Armament, Fortification, Edict, Wild)
- ⚔️ Tactical combat on a 5-column grid — enemies advance toward your Gate
- 🏰 **Emplacements** — dual-use cards that can be played for an instant effect *or* placed as a permanent structure on the battlefield that triggers every turn
- 🗺️ 3-act campaign with procedural maps, shops, events, rest sites
- 👑 3 multi-phase bosses (The Suture, The Archivist, The Pale Itself)
- 🏠 The Keep — a persistent hub with 5 upgradeable structures and 5 NPCs with evolving dialogue
- 📖 A layered narrative that unfolds across 50+ runs
- 🔥 15 Ascension levels for the masochists
- 💾 Autosaves on every action — crash-proof

[Screenshot: combat view]

**The weird part: it reads your git.**

If you run it from a git repo, CodeKeep optionally detects your activity and grants bonus Gate HP:

- Commits today → +2 HP each (max +10)
- Staged changes → +3 HP
- Unstaged changes → +2 HP
- Commit streak → +1 HP per day (max +5)
- Total cap: +20 HP

Your Gate's health is *literally tied to your productivity*. It's opt-in (toggle in Settings), reads only local git state, and sends nothing anywhere.

[Screenshot: forge report]

**Tech stack:**

Built with TypeScript and Ink (React for the terminal). Three packages: `shared` (types/constants), `server` (pure game engine, no UI), `cli` (thin render layer). Every game function is pure and testable. Combat is fully deterministic — same seed + same plays = identical outcome.

**It's fully open source (MIT):**

GitHub: https://github.com/tooyipjee/codekeep

I'd love feedback — especially on the combat feel, card balance, and whether the git integration is cool or cursed. If you survive Act 1, let me know what killed you in Act 2.

```
npx codekeep
```

---

## Show HN Version (Title + First Comment)

**Title:** Show HN: CodeKeep – deck-building roguelike in the terminal (TypeScript, Ink)

**Link:** https://github.com/tooyipjee/codekeep

**First comment:**

Hey HN! I play a lot of roguelikes (StS, Into the Breach, DCSS) and spend most of my day in the terminal, so I built a deck-builder you can play with `npx codekeep`.

The core mechanic that makes it different: every "emplace" card is dual-use. You can cast it for an immediate effect (damage, block, etc.) or spend it to place a permanent structure on the 5-column grid that triggers every turn. Turrets shoot, barricades block, beacons heal. Choosing between instant value and long-term infrastructure is where the interesting decisions live.

The slightly unhinged part: if you run it from a git repo, it detects your commit activity and grants bonus HP. Commits today? +2 HP each. Multi-day streak? Even more. Capped at +20 so it doesn't break balance. It's opt-in and reads only local git metadata.

Tech-wise: TypeScript monorepo, Ink (React for CLI) for rendering, pure functional game engine with seeded deterministic combat (mulberry32 PRNG). All game logic is in a separate `server` package with no UI dependencies — testable, portable.

Would love feedback on the combat balance and whether the emplace mechanic feels meaningful. Happy to discuss the architecture if anyone's curious about building games with Ink.

---

## r/roguelikes Version (Title)

**Title:** CodeKeep: The Pale — a deck-building tactical roguelike with a 5-column grid and permanent emplacements, played in your terminal

**Body:** Same as above but remove the "Tech stack" section and lead with the emplace mechanic instead. De-emphasize git integration (mention it as "the weird bit" at the end).

---

## Storyboard Reference

| Frame | File | Caption |
|-------|------|---------|
| 1 | `screenshots/01_title.png` | `npx codekeep` — that's it. No download. No account. |
| 2 | `screenshots/02_combat.png` | 5-column tactical grid. Read enemy intents. Protect the Gate. |
| 3 | `screenshots/03_emplace.png` | Every emplace card is a choice: burn it now, or invest as a permanent structure. |
| 4 | `screenshots/04_map.png` | 3-act procedural maps. Shops, events, rest sites, bosses. |
| 5 | `screenshots/05_git.png` | Your commit streak is a game mechanic. Play alongside your work. |
| 6 | `screenshots/06_cta.png` | Open source. MIT. TypeScript. Star it if you survive Act 1. |

## Posting Schedule

| Day | Platform | Post Type |
|-----|----------|-----------|
| Tue AM | r/programming | Image post (combat screenshot) + body in comments |
| Tue AM | r/commandline | Image post (title screenshot) + body in comments |
| Tue AM | Hacker News | Show HN link to GitHub |
| Tue PM | Twitter/X | Thread: 6 tweets matching the 6 storyboard frames |
| Sat | r/roguelikes | Text post, mechanic-focused |
| Sat | r/gamedev | Screenshot Saturday, architecture angle |
| Mon | r/typescript | Text post, "I built a game with React in the terminal" |
| Wed | dev.to | Full article: "Building a terminal roguelike with TypeScript and Ink" |
