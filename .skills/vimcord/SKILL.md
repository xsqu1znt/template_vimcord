---
name: vimcord
description: >
    Build, scaffold, migrate, and extend Discord bots using TypeScript and the Vimcord framework (a discord.js wrapper).
    Use this skill whenever the user is working on a Discord bot — including creating new bots from scratch, adding commands
    or events to existing bots, migrating from plain discord.js to Vimcord, building advanced features like economy systems,
    moderation tools, scheduled jobs, or interactive UIs, or when they paste any Vimcord/discord.js code and ask for help.
    Always load this skill before writing any bot code, even for "simple" changes — the patterns here are strict and deviation
    leads to slop that won't type-check or integrate correctly.
---

# Vimcord Skill

You are building a Discord bot using **TypeScript + Vimcord** (a discord.js wrapper). Before writing any code, internalize this file completely. Deviation from these patterns produces broken, inconsistent code.

---

## Non-Negotiable Rules

These apply to **every line of code** you write. No exceptions.

1. **Never use `any`** — use `unknown` with type guards, or proper generic types
2. **Always explicit return types** on functions — `async function foo(): Promise<void>`
3. **Always use path aliases** — never relative imports (`../../`) — see alias table below
4. **One command per file**, always `export default`
5. **Use `const` over `let`**, never `var`
6. **Always `async/await`** — never `.then()` chains
7. **No comments** unless explaining genuinely complex business logic
8. **Semicolons required** everywhere
9. **Import order**: Node built-ins → third-party packages → local modules
10. **Never hardcode tokens or secrets** — always from environment variables via `client.useEnv()`
11. **Always `deferReply: true`** for commands that hit DB or take > 1 second
12. **Use `editReply`** after deferring, never `reply`

---

## Path Aliases (always use these)

| Alias                | Resolves To                                             |
| -------------------- | ------------------------------------------------------- |
| `@/*`                | `./src/*`                                               |
| `@commands/*`        | `./src/commands/*`                                      |
| `@slashCommands/*`   | `./src/commands/slash/*`                                |
| `@prefixCommands/*`  | `./src/commands/prefix/*`                               |
| `@contextCommands/*` | `./src/commands/context/*`                              |
| `@events/*`          | `./src/events/*`                                        |
| `@jobs/*`            | `./src/jobs/*`                                          |
| `@db/*`              | `./src/db/*` (always include subpath, e.g. `@db/index`) |
| `@features/*`        | `./src/features/*`                                      |
| `@utils/*`           | `./src/utils/*`                                         |
| `@constants/*`       | `./src/constants/*`                                     |
| `@ctypes/*`          | `./src/types/*`                                         |

---

## Project Structure

```
my-bot/
├── constants/              # JSON config files (outside src/ for hot reload)
│   └── config.json
├── src/
│   ├── index.ts            # Entry point
│   ├── bot.ts              # Bot factory (createClient call)
│   ├── constants.ts        # Re-exports from ../constants/*.json
│   ├── commands/
│   │   ├── slash/          # *.slash.ts
│   │   ├── prefix/         # *.prefix.ts
│   │   └── context/        # *.ctx.ts
│   ├── events/             # *.event.ts
│   │   ├── interaction/    # Autocomplete, button collectors
│   │   ├── intervals/      # Periodic polling
│   │   ├── presence/       # Presence updates
│   │   └── state/          # Client lifecycle
│   ├── jobs/               # Scheduled cron jobs
│   ├── features/           # Complex business logic classes
│   ├── db/
│   │   ├── index.ts        # Schema barrel export
│   │   └── schemas/        # *.schema.ts
│   ├── utils/              # Shared utility functions
│   └── types/              # TypeScript type definitions
├── .env
├── .env.example
├── tsconfig.json
└── package.json
```

**File naming**: `kebab-case` with type suffix — `ping.slash.ts`, `ready.hello.event.ts`, `user.schema.ts`

---

## Quick Patterns

### Minimal Slash Command

```typescript
import { InteractionContextType } from "discord.js";
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: builder => builder.setName("ping").setDescription("Check latency").setContexts(InteractionContextType.Guild),

    deferReply: true,
    metadata: { category: "General" },

    async execute(client, interaction): Promise<void> {
        await interaction.editReply(`Pong! ${client.ws.ping}ms`);
    }
});
```

### Event Handler

```typescript
import { Events } from "discord.js";
import { EventBuilder } from "vimcord";

export default new EventBuilder({
    event: Events.MessageCreate,
    name: "messageCreate.AutoMod",

    async execute(client, message): Promise<void> {
        if (message.author.bot) return;
        // logic
    }
});
```

### DB Schema

```typescript
import { createMongoSchema } from "vimcord";

export interface IUser {
    userId: string;
    balance: number;
    createdAt: Date;
}

export const UserSchema = createMongoSchema<IUser>("Users", {
    userId: { type: String, unique: true, required: true, index: true },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() }
});
```

---

## Reference Files

For more patterns and API details, read the relevant reference file **before writing code**:

| Task                                                                    | Reference                        |
| ----------------------------------------------------------------------- | -------------------------------- |
| Scaffolding a new bot from scratch                                      | `.skills/vimcord/scaffolding.md` |
| Slash / prefix / context commands (full API)                            | `.skills/vimcord/commands.md`    |
| Events, conditions, priorities, EventManager                            | `.skills/vimcord/events.md`      |
| MongoDB schemas, CRUD, transactions, plugins                            | `.skills/vimcord/database.md`    |
| BetterEmbed, Paginator, Prompt, Modal, BetterCollector, BetterContainer | `.skills/vimcord/ui.md`          |
| Fetch helpers, mention parsing, utilities                               | `.skills/vimcord/utilities.md`   |
| Scheduled jobs (cron)                                                   | `.skills/vimcord/jobs.md`        |
| Feature classes (complex business logic)                                | `.skills/vimcord/features.md`    |
| Migrating from plain discord.js                                         | `.skills/vimcord/migration.md`   |
| Client config, status, logging, CLI, ToolsConfig                        | `.skills/vimcord/client.md`      |

**Always read the reference file before implementing anything in its domain.** These contain correct API signatures, working examples, and gotchas that prevent slop.

---

## Anti-Slop Checklist

Before submitting any code, verify:

- [ ] No `any` types anywhere
- [ ] All functions have explicit return types
- [ ] All imports use path aliases (no `../../`)
- [ ] `deferReply: true` on commands that do async work
- [ ] `editReply` used after deferred, `reply` used otherwise
- [ ] `export default` on all command/event files
- [ ] No hardcoded tokens/IDs in code (use constants or env vars)
- [ ] `strictNullChecks` respected — `null`/`undefined` always handled
- [ ] `noUncheckedIndexedAccess` respected — array access returns `T | undefined`
- [ ] DB schemas barrel-exported from `@db/index`
- [ ] `async/await` used everywhere, no `.then()`
- [ ] Semicolons on every statement
- [ ] Prettier formatting: 4-space tabs, double quotes, 125 char line width, no trailing commas
