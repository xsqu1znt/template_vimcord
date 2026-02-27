# Setup Skill — Vimcord Project Initialization

You have been triggered because `setup: true` is set in AGENTS.md. Your job is to initialize this project correctly before any code is written. Follow every phase in order. Do not skip phases. Do not write any source code until Phase 4 is explicitly approved by the user.

When setup is fully complete, set `setup: false` in AGENTS.md.

---

## Phase 1 — Environment

Run the following and confirm it succeeds before proceeding:

```bash
pnpm i
```

If it fails, report the error to the user and stop. Do not proceed until dependencies are installed cleanly.

---

## Phase 2 — Bot Identity

Ask the user for the bot's name if they haven't already provided one. The name should be a proper name (e.g. "Orbit", "Sentinel", "Mingo") — not a description.

Once you have the name:

**2a. Update `package.json`**
Set `"name"` to the lowercase-kebab-case version of the bot name:

```json
{ "name": "orbit" }
```

**2b. Update `src/bot.ts`**
Set the bot name in the client app configuration:

```typescript
client.configure("app", { name: "Orbit" });
```

**2c. Update `AGENTS.md` — Bot Identity block**
Fill in the Bot Name field in the Project Registry:

```
Bot name: Orbit
```

After these three edits, confirm to the user: _"Bot name set to [Name] in package.json, client config, and AGENTS.md."_

---

## Phase 3 — Brief & Planning

This is the most important phase. Do not rush it.

### 3a. Assess what you already know

Check whether the user's initial message (the one that triggered this session) already contains a brief describing what the bot should do.

- **If a detailed brief was provided** (clear purpose, several features described, enough to plan from): summarize your understanding back to the user and move to 3b to fill gaps.
- **If no brief or only a vague brief was provided**: ask the user directly before doing anything else.

### 3b. Interview questions

Ask these questions conversationally — not as a numbered list dump. Adapt based on what the user has already told you. Skip questions that are already answered. Group related ones. You do not need answers to every single question to proceed, but you must have enough to produce a meaningful plan.

**Purpose & scope**

- What does this bot do, in one sentence?
- Is this for a specific server or meant to be multi-server?
- Roughly how many commands are you envisioning?

**Users & permissions**

- Who uses the bot — everyone in the server, specific roles, staff only, or a mix?
- Does it need a staff-only command set separate from the public commands?

**Data & persistence**

- Does any data need to be stored between sessions (user balances, server settings, logs, etc.)?
- If yes: what's the core data — what are users or guilds "tracking"?

**Interactions**

- Are interactions mostly slash commands, or does it need prefix commands too?
- Any context menu commands (right-click on message/user)?
- Any interactive UI — buttons, dropdowns, paginated embeds, confirmation prompts?

**Automation**

- Does anything need to run on a schedule (daily rewards, reminders, cleanup jobs)?
- Does it need to react to Discord events automatically (member join, message delete, etc.)?

**Integrations**

- Does it call any external APIs?
- Any third-party services (payment processors, external databases, etc.)?

### 3c. Clarify and confirm

Once you have enough answers, play them back to the user in a short structured summary:

```
Bot: [Name]
Purpose: [One sentence]
Audience: [Who uses it]
Persistence: [Yes/No — what's stored]
Command types: [Slash / Prefix / Context]
Key features:
  - [Feature 1]
  - [Feature 2]
  - [Feature 3]
Automation: [Any scheduled jobs or event listeners]
```

Ask: _"Does this capture everything, or is there anything to add or change before I plan the implementation?"_

Do not proceed to Phase 4 until the user confirms this summary is correct.

---

## Phase 4 — Implementation Plan

Produce a concrete plan organized by build layer. The plan should reflect actual Vimcord structure — not generic pseudocode.

Format it like this:

```
## Implementation Plan — [Bot Name]

### Schemas
- UserSchema (src/db/schemas/user.schema.ts) — fields: userId, balance, createdAt
- GuildSchema (src/db/schemas/guild.schema.ts) — fields: guildId, prefix, logChannelId

### Commands
Slash:
- /ping (General) — latency check
- /balance (Economy) — show user balance
- /daily (Economy) — claim daily reward, 24h cooldown
- /leaderboard (Economy) — top 10 by balance, paginated

Prefix:
- ?setprefix — change server prefix (admin only)

### Events
- guildMemberAdd.Welcome — send welcome embed to configured channel
- messageCreate.AutoMod — filter banned words (if applicable)

### Jobs
- DailyReset.job.ts — midnight reset of daily flags (0 0 0 * * *)

### Feature Classes
- EconomyManager (src/features/EconomyManager.ts) — shared economy logic used by /daily, /transfer, /leaderboard

### Build Order
1. Schemas (UserSchema, GuildSchema)
2. Feature classes (EconomyManager)
3. Utilities (if any shared logic)
4. Commands (in dependency order)
5. Events
6. Jobs
```

Present this plan to the user. Ask: _"Does this plan look right? Any features to add, remove, or change before I start building?"_

**Do not write a single source file until the user explicitly approves the plan.**

---

## Phase 5 — Seed the Registry & Notes

Once the plan is approved, populate AGENTS.md before writing any code:

**5a. Update Bot Identity block** with description, prefix (if prefix commands planned), and staff guild ID if known.

**5b. Pre-populate the Project Registry** with the planned schemas, commands, events, jobs, and feature classes from the plan — marked as `(planned)` so future agents know they're not yet built:

```markdown
| `UserSchema` | `Users` | `userId`, `balance`, `createdAt` | (planned) |
| `/daily` | `src/commands/slash/daily.slash.ts` | Economy | Daily reward command | (planned) |
```

**5c. Add a Project-Specific Notes entry** capturing anything architectural that came out of the planning conversation — single-guild vs multi-guild, any unusual permission model, key design decisions.

---

## Phase 6 — Hand Off

Tell the user:

> "Setup complete. AGENTS.md has been updated with the project plan. I'll now start building — beginning with the schemas."

Then set `setup: false` in AGENTS.md.

Begin building immediately using `.skills/vimcord/SKILL.md` and the appropriate reference files. Follow the build order from the approved plan.

---

## Handling the Partial Case

If the user's first message is a specific feature request rather than a full bot brief (e.g. _"add a /ban command"_ or _"build me an economy system"_), do not force full setup on them.

Instead:

1. Run Phase 1 (install deps) silently
2. Run Phase 2 (bot name) only if Bot Identity in AGENTS.md is still `[BOT_NAME]`
3. **Skip Phase 3 full planning** — ask only the minimum questions needed to implement their specific request well (e.g. "Should this be ephemeral?", "Do you have a UserSchema already or should I create one?")
4. Skip Phase 4 full plan — instead, give a short _"Here's what I'll build:"_ summary for just the requested feature and ask for a thumbs up
5. After building, set `setup: false`

The goal is to never block a user who just wants to get something built. Planning is for when they're starting from scratch.

---

## Rules for This Skill

- Never write source files during Phases 1–4
- Never assume answers to interview questions — ask them
- Never present a wall of questions at once — group and pace them conversationally
- Always confirm the plan before building
- Always set `setup: false` when done, regardless of path taken
- If the user says "just start building" after a vague brief, acknowledge you're working with limited info, list your assumptions explicitly, and proceed
