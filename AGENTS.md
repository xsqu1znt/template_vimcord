# AGENTS.md - Agent Coding Guidelines for TEMPLATE-vimcord

---

## Project Overview

This is a Discord bot template using TypeScript, Vimcord framework, and MongoDB. The bot uses slash commands, prefix commands, and event handlers.

Keep this up-to-date with any new structural changes or new project specific guidelines.
For deep-dive patterns and API references beyond what this file covers, see [DOCS.md](./DOCS.md).
For more information on API usage, look up documentation online for the following packages: discord.js, MongoDB, mongoose.

---

## Build & Development Commands

### Development

```bash
pnpm run dev    # Start development server with hot reload (nodemon + tsx)
```

### Build

```bash
pnpm run build    # Compile TypeScript with tsc and tsc-alias
pnpm run check    # Type-check without emitting (tsc --noEmit)
pnpm run start    # Run compiled JavaScript from dist/
```

### Formatting

```bash
pnpm run format   # Format all .ts and .json files with Prettier
```

### Testing

No test framework is currently configured. To add one, install Jest or Vitest, then add and document your test command here (e.g., `pnpm run test`).

---

## Code Style Guidelines

### Formatting (Prettier)

- **Tab width:** 4 spaces
- **Print width:** 125 characters
- **Trailing commas:** None
- **Arrow parens:** Avoid (prefer `x => x` over `(x) => x`)
- **Quotes:** Double quotes
- **Semicolons:** Required
- **Line endings:** LF

### TypeScript Configuration

The project uses strict TypeScript:

- `strict: true` - Full strict mode enabled
- `noImplicitAny: true` - No implicit `any` types
- `strictNullChecks: true` - Null/undefined must be explicitly handled
- `noUncheckedIndexedAccess: true` - Array access returns `T | undefined`
- `noFallthroughCasesInSwitch: true` - All switch cases must break/return
- `moduleDetection: force` - Each file is treated as a module

### Import Order

Always follow this order:

1. Node built-ins (e.g., `import { randomUUID } from "node:crypto"`)
2. Third-party packages (e.g., `import { PermissionFlagsBits } from "discord.js"`)
3. Local modules (e.g., `import { UserSchema } from "@/schemas/user.schema"`)

### Imports & Path Aliases

**Always prefer path aliases over relative imports:**

```typescript
// Good - use aliases
import { GuildSchema } from "@db/index";
import { SlashCommandBuilder } from "vimcord";
import { EMOJIS } from "@/constants";

// Bad - avoid relative paths
import { GuildSchema } from "../../db";
import { SomeUtil } from "../../../utils/some.util";
```

**Available aliases:**

- `@/*` - Source root (`./src/*`)
- `@commands/*` - Commands (`./src/commands/*`)
- `@slashCommands/*` - Slash commands (`./src/commands/slash/*`)
- `@prefixCommands/*` - Prefix commands (`./src/commands/prefix/*`)
- `@contextCommands/*` - Context menu commands (`./src/commands/context/*`)
- `@events/*` - Event handlers (`./src/events/*`)
- `@jobs/*` - Scheduled jobs (`./src/jobs/*`)
- `@db/*` - Database schemas (`./src/db/*`) — always include the subpath, e.g. `@db/index`
- `@features/*` - Planned out feature classes (`./src/features/*`)
- `@utils/*` - Utility functions (`./src/utils/*`)
- `@constants/*` - Constants (`./src/constants/*`)
- `@ctypes/*` - Custom types (`./src/types/*`)

### Naming Conventions

- **Files:** Use kebab-case: `ping.slash.ts`, `ready.hello.event.ts`
- **Commands:** Lowercase, use dots for namespacing: `ping`, `moderator.ban`
- **Events:** Use dot notation with category: `ready.Hello`, `messageCreate.Moderation`
- **Classes/Types:** PascalCase
- **Variables/Functions:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE

### Type Safety

- **Never use `any`** - Use `unknown` with type guards only when necessary instead
- **Use explicit return types** for functions

### Function Signatures

```typescript
// Good
async function getUserData(userId: string): Promise<UserData | null> {
    return await UserSchema.fetch({ userId });
}

// Bad (relying on inference)
async function getUserData(userId: string) {
    return await UserSchema.fetch({ userId });
}
```

### Error Handling

- Use Vimcord's built-in global error handlers: `useGlobalErrorHandlers: true`
- Wrap all async operations in try/catch
- Prefer async/await over `.then()` chains
- Always handle potential `null`/`undefined` values (strictNullChecks enabled)
- Use optional chaining `?.` when accessing potentially undefined properties

### Logging

Use `console.log` for general logging — Vimcord intercepts and formats these in production. Use `console.warn` and `console.error` for degraded states and errors respectively. Do not introduce a third-party logger unless the project explicitly adopts one and documents it here.

### General Guidelines

1. **No comments** unless explaining complex business logic
2. **Always use semicolons**
3. **Use `const` over `let`**, avoid `var`
4. **Export default** for command/event files
5. **Use `async/await`** for all asynchronous operations
6. **One command per file**
7. **Extract shared logic into utilities**

---

## Project Structure

```
constants/                    # Static JSON configuration (outside src for hot reloading)
├── config.json               # JSON files imported into src/constants.ts
src/
├── index.ts                  # Bot entry point (client creation, configuration, start)
├── constants.ts              # Re-exports constants from ../constants/*.json
├── db/
│   ├── index.ts              # Database schema exports (barrel file)
│   └── schemas/              # Mongoose schemas (*.schema.ts)
├── commands/
│   ├── slash/                # Slash commands (*.slash.ts)
│   ├── prefix/               # Prefix commands (*.prefix.ts)
│   └── context/              # Context menu commands (*.ctx.ts)
├── events/                   # Event handlers (*.event.ts)
├── jobs/                     # Scheduled jobs
├── features/                 # Feature classes (complex business logic)
├── utils/                    # Utility functions
└── types/                    # TypeScript type definitions
```

### About the constants/ Directory

Static JSON configuration files are placed in `constants/` (outside `src/`) for **hot reloading without rebuilding**:

- During development (`pnpm run dev`), changes to JSON files in `constants/` are picked up automatically by tsx
- This is ideal for configuration that changes frequently (colors, messages, IDs, etc.)
- No need to rebuild the project when updating these files

**To add new constants:**

1. Create a new JSON file in `constants/` (e.g., `constants/emojis.json`)
2. Import and re-export it in `src/constants.ts`:

```typescript
// src/constants.ts
import _emojis from "../constants/emojis.json";
export const EMOJIS = _emojis;
```

3. Import the constant where needed:

```typescript
import { EMOJIS } from "@/constants";
```

### About the events/ Directory

Events can be organized by type in subdirectories for better discoverability:

| Subdirectory   | Purpose                         | Example                          |
| -------------- | ------------------------------- | -------------------------------- |
| `interaction/` | Autocomplete, button collectors | `autocomplete.cards.event.ts`    |
| `intervals/`   | Periodic polling/checks         | `interval.autoReminder.event.ts` |
| `presence/`    | User presence updates           | `presence.vanity.event.ts`       |
| `state/`       | Client lifecycle events         | `state.restarted.event.ts`       |

### About the jobs/ Directory

Scheduled jobs use cron patterns for recurring tasks:

- `_BaseCronJob.ts` - Abstract base class with singleton pattern
- `*.job.ts` - Individual job implementations
- `index.ts` - Initialization function called on client ready

```typescript
// Example job implementation
export class Backups extends _BaseCronJob {
    constructor() {
        super("0 0 */6 * * *", false); // Every 6 hours
    }

    async execute(): Promise<void> {
        // Job logic here
    }
}
```

### About the features/ Directory

Feature classes encapsulate complex business logic that spans multiple commands. Use feature classes when:

- Logic is shared across multiple commands
- State needs to be maintained during an operation
- Business rules are complex and deserve their own test suite

---

## Quick Reference

### Creating a Slash Command

Key points: use builder function pattern, set `metadata.category`, use `deferReply` for longer operations.

```typescript
import { InteractionContextType } from "discord.js";
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: builder =>
        builder.setName("command-name").setDescription("Description here").setContexts(InteractionContextType.Guild),

    deferReply: true,
    metadata: { category: "Category/Name" },

    async execute(client, interaction): Promise<void> {
        await interaction.editReply("Response");
    }
});
```

### Creating a Staff Command

```typescript
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: builder => builder.setName("admin").setDescription("Admin command (STAFF)"),

    deferReply: true,
    permissions: { guildOnly: true, botStaffOnly: true },
    metadata: { category: "Staff" },

    async execute(client, interaction): Promise<void> {
        // Only bot staff can reach here
    }
});
```

### Creating a Command with Subcommand Routes

```typescript
import { SlashCommandBuilder } from "vimcord";
import subAdd from "./subcommand/add";
import subDelete from "./subcommand/delete";

export default new SlashCommandBuilder({
    builder: builder =>
        builder
            .setName("card")
            .setDescription("Card management")
            .addSubcommand(sub => sub.setName("add").setDescription("Add a card"))
            .addSubcommand(sub => sub.setName("delete").setDescription("Delete a card")),

    deferReply: true,
    routes: [
        { name: "add", handler: (client, interaction) => subAdd(interaction) },
        { name: "delete", handler: (client, interaction) => subDelete(interaction) }
    ]
});
```

### Creating an Event Handler

Key points: use `EventBuilder`, provide unique dot-namespaced `name`, implement `execute`.

```typescript
import { Events } from "discord.js";
import { EventBuilder } from "vimcord";

export default new EventBuilder({
    event: Events.Ready,
    name: "Ready.Hello",

    async execute(client): Promise<void> {
        console.log("Bot is ready!");
    }
});
```

### Creating an Environment-Specific Event

```typescript
import { Events } from "discord.js";
import { EventBuilder } from "vimcord";

export default new EventBuilder({
    event: Events.PresenceUpdate,
    name: "Presence.Vanity",
    deployment: { environments: ["production"] }, // Only in production

    async execute(client, oldPresence, newPresence): Promise<void> {
        // Handle presence update
    }
});
```

### Client Setup Pattern

```typescript
// src/index.ts
import {
    createClient,
    defineClientOptions,
    defineVimcordFeatures,
    defineGlobalToolsConfig,
    MongoDatabase,
    StatusType
} from "vimcord";
import { GatewayIntentBits, ActivityType } from "discord.js";
import { initializeJobs } from "./jobs";

// Global tools configuration
defineGlobalToolsConfig({
    embedColor: ["#5865F2", "#57F287"],
    paginator: {
        notAParticipantMessage: "These buttons aren't for you."
    }
});

// Define client options
const clientOptions = defineClientOptions({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Define features
const vimcordFeatures = defineVimcordFeatures({
    useGlobalErrorHandlers: true,
    useDefaultSlashCommandHandler: true,
    useDefaultPrefixCommandHandler: true,
    importModules: {
        events: "./events",
        slashCommands: "./commands/slash",
        prefixCommands: "./commands/prefix"
    }
});

// Create client
const client = createClient(clientOptions, vimcordFeatures);

client.useEnv();
client.useDatabase(new MongoDatabase(client));

client
    .configure("app", { name: "MyBot", verbose: false })
    .configure("staff", {
        ownerId: "BOT_OWNER_ID",
        superUsers: ["STAFF_ID_1", "STAFF_ID_2"],
        guild: { id: "STAFF_GUILD_ID" }
    })
    .configure("slashCommands", {
        async beforeExecute(client, interaction) {
            // Runs before every slash command
        },
        async afterExecute(result, client, interaction) {
            // Runs after every slash command
        }
    });

// Start with callback
client.start(() => {
    client.status.set({
        production: { activity: { name: "Online", type: ActivityType.Playing } }
    });
    initializeJobs(client);
});
```

---

## Additional Notes

- The bot uses environment variables via `client.useEnv()` method
- MongoDB connection configured in `src/db/` - use `client.useDatabase(new MongoDatabase(client))` before `client.start()`
- Database schemas use `createMongoSchema<T>()` with TypeScript interfaces for type safety
- Use `Schema.extend({ method1, method2 })` to add custom methods to schemas
- Use `Schema.useTransaction(async session => { ... })` for atomic operations
- Default command prefix is configurable via `.configure("prefixCommands", { defaultPrefix: "?" })`
- Development mode is auto-detected from `NODE_ENV` or `--dev` flag
- Staff permissions use `permissions: { botStaffOnly: true }` which checks `ownerId` and `superUsers`
- Use the builder function pattern: `builder: builder => builder.setName(...)`
- Always use `deferReply: true` for commands that may take longer than 3 seconds
- Organize events by type in subdirectories: `interaction/`, `intervals/`, `presence/`, `state/`
- Feature classes in `src/features/` encapsulate complex business logic shared across commands
