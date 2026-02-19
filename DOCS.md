# Vimcord Technical Documentation

> A comprehensive technical guide for AI agents building Discord bots with Vimcord.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Scaffolding](#project-scaffolding)
3. [Core Concepts](#core-concepts)
4. [Command Builders](#command-builders)
5. [Event System](#event-system)
6. [Database Integration](#database-integration)
7. [UI Components](#ui-components)
8. [Error Handling](#error-handling)
9. [Configuration Patterns](#configuration-patterns)
10. [Best Practices](#best-practices)

---

## Architecture Overview

Vimcord is an opinionated Discord.js framework built on these architectural pillars:

### Core Philosophy

- **Builder Pattern**: All Discord entities use fluent builder APIs
- **Configuration Merging**: Layered config (global → type-specific → local) with deep merging
- **Automatic Error Boundaries**: Commands wrap in try/catch with automatic user feedback
- **Type Safety**: Full TypeScript inference with zero `any` usage

### Module Structure

```
Vimcord
├── Client (extends discord.js Client)
│   ├── EventManager - Event handler registry
│   ├── CommandManager - Command registry (slash/prefix/context)
│   ├── StatusManager - Bot presence rotation
│   └── DatabaseManager - Database abstraction
│
├── Builders (instantiable classes)
│   ├── SlashCommandBuilder
│   ├── PrefixCommandBuilder
│   ├── ContextCommandBuilder
│   └── EventBuilder
│
├── Tools (UI/UX helpers)
│   ├── BetterEmbed - Auto-formatting embeds
│   ├── Paginator - Multi-page navigation
│   ├── Prompt - Confirmation dialogs
│   ├── BetterModal - Modal V2 components
│   └── DynaSend - Universal send method
│
└── Database (MongoDB abstraction)
    ├── MongoDatabase - Connection manager
    └── MongoSchemaBuilder - CRUD + plugins
```

### Configuration Hierarchy

Vimcord merges configuration in this priority order (later overrides earlier):

```typescript
1. Framework defaults (embedded in Vimcord)
2. Global client config (passed to createClient)
3. Type-specific config (slashCommands/prefixCommands/contextCommands)
4. Local command options (individual command config)
```

---

## Client Configuration

### Type-Safe Configuration Factories

Vimcord provides factory functions for type-safe client configuration:

```typescript
import { createClient, defineClientOptions, defineVimcordFeatures, defineGlobalToolsConfig, StatusType } from "vimcord";
import { GatewayIntentBits, ActivityType } from "discord.js";

// Define Discord.js client options
const clientOptions = defineClientOptions({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Define Vimcord features
const vimcordFeatures = defineVimcordFeatures({
    useGlobalErrorHandlers: true,
    useDefaultSlashCommandHandler: true,
    useDefaultPrefixCommandHandler: true,
    useDefaultContextCommandHandler: true,

    // Show error message to users when commands fail
    enableCommandErrorMessage: {
        inviteButtonLabel: "Support Server",
        inviteUrl: "https://discord.gg/your-invite"
    },

    // Auto-import modules
    importModules: {
        events: "./events",
        slashCommands: "./commands/slash",
        prefixCommands: "./commands/prefix",
        contextCommands: "./commands/context"
    }
});

// Create client with type-safe options
const client = createClient(clientOptions, vimcordFeatures);
```

### Global Tools Configuration

Configure tools globally to avoid repeating options:

```typescript
import { defineGlobalToolsConfig, PaginationType } from "vimcord";

defineGlobalToolsConfig({
    // Default embed colors (randomly selected)
    embedColor: ["#5865F2", "#57F287", "#FEE75C", "#EB459E"],
    embedColorDev: ["#FF0000"], // Dev mode colors

    // Paginator configuration
    paginator: {
        notAParticipantMessage: "These buttons aren't for you.",
        buttons: {
            first: { label: "", emoji: { name: "⏪", id: null } },
            back: { label: "", emoji: { name: "◀️", id: null } },
            next: { label: "", emoji: { name: "▶️", id: null } },
            last: { label: "", emoji: { name: "⏩", id: null } }
        }
    }
});
```

### Configuration Methods

Chain multiple `configure()` calls:

```typescript
client
    // App configuration
    .configure("app", {
        name: "MyBot",
        verbose: false
    })
    // Staff configuration
    .configure("staff", {
        ownerId: "123456789",
        superUsers: ["111222333", "444555666"], // Additional staff
        guild: {
            id: "987654321",
            inviteUrl: "https://discord.gg/invite",
            channels: {
                staffSpam: "123456789"
            }
        }
    })
    // Slash command hooks
    .configure("slashCommands", {
        async beforeExecute(client, interaction) {
            // Runs before every slash command
            await UserSchema.update({ userId: interaction.user.id }, { lastActive: new Date() }, { upsert: true });
        },
        async afterExecute(result, client, interaction) {
            // Runs after every slash command
            await logCommandUsage(interaction);
        }
    })
    // Prefix command configuration
    .configure("prefixCommands", {
        defaultPrefix: "!",
        async guildPrefixResolver(client, guildId) {
            // Dynamic prefix per guild
            const guildData = await GuildSchema.fetch({ guildId }, { prefix: 1 });
            return guildData?.prefix;
        }
    });
```

### Status Configuration

```typescript
client.start(() => {
    client.status.set({
        production: {
            activity: {
                name: "with code",
                type: ActivityType.Playing,
                status: StatusType.Online
            }
        },
        development: {
            interval: 15,
            randomize: true,
            activity: [
                { name: "Dev Mode", type: ActivityType.Custom, status: StatusType.DND },
                { name: "Testing", type: ActivityType.Custom, status: StatusType.Idle }
            ]
        }
    });
});
```

---

## BetterCollector

Enhanced interaction collector with participant tracking and timeout handling:

```typescript
import { BetterCollector, CollectorTimeoutType } from "vimcord";
import { ComponentType, ButtonStyle, ButtonBuilder, ActionRowBuilder } from "discord.js";

const message = await interaction.editReply({
    content: "Choose an option:",
    components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder({ customId: "btn_yes", label: "Yes", style: ButtonStyle.Success }),
            new ButtonBuilder({ customId: "btn_no", label: "No", style: ButtonStyle.Danger })
        )
    ]
});

const collector = new BetterCollector(message, {
    type: ComponentType.Button,
    participants: [interaction.user], // Only these users can interact
    idle: 60_000,
    onTimeout: CollectorTimeoutType.DisableComponents
});

// Lock tracking for async operations
const pendingRequests = new Set<string>();

// General listener (runs for all interactions)
collector.on(async i => {
    if (pendingRequests.has(i.user.id)) {
        return i.reply({ content: "Please wait...", flags: "Ephemeral" });
    }
});

// Specific button handlers
collector
    .on(
        "btn_yes",
        async i => {
            pendingRequests.add(i.user.id);
            await i.deferReply();

            await doSomething();
            await i.editReply({ content: "Done!" });
        },
        {
            finally: i => pendingRequests.delete(i.user.id)
        }
    )
    .on(
        "btn_no",
        async i => {
            await i.reply({ content: "Cancelled", flags: "Ephemeral" });
        },
        {
            defer: { update: true }
        }
    );
```

### CollectorTimeoutType Options

| Value               | Behavior                          |
| ------------------- | --------------------------------- |
| `DisableComponents` | Disable all buttons after timeout |
| `ClearComponents`   | Remove all buttons after timeout  |
| `DeleteMessage`     | Delete the message after timeout  |
| `DoNothing`         | Leave message as-is               |

---

## BetterContainer (V2 Components)

Build Discord V2 component layouts:

```typescript
import { BetterContainer } from "vimcord";
import { ButtonStyle } from "discord.js";

const container = new BetterContainer()
    // Add text content
    .addText(["## Welcome to the Shop", "Check out our daily deals!"])
    // Add media (image)
    .addMedia({ url: "https://example.com/banner.png" })
    // Add visual separator
    .addSeparator({ divider: true, spacing: 2 })
    // Add section with button
    .addSection({
        text: ["**Premium Card**", "-# Price: 1000 Mingcoins"],
        thumbnail: { media: { url: card.imageUrl } },
        button: {
            customId: "btn_buy:card123",
            label: "Buy Now",
            style: ButtonStyle.Primary
        }
    })
    .addSeparator({ divider: true })
    // Another section
    .addSection({
        text: "Regular Item - 500 coins",
        button: {
            customId: "btn_buy:item456",
            label: "Purchase",
            style: ButtonStyle.Secondary
        }
    });

// Send the container
await container.send(interaction);
```

### Container Methods

| Method                                      | Description                        |
| ------------------------------------------- | ---------------------------------- |
| `addText(content)`                          | Add text content (string or array) |
| `addMedia({ url })`                         | Add image/media                    |
| `addSeparator({ divider, spacing })`        | Add visual separator               |
| `addSection({ text, button?, thumbnail? })` | Add section with optional button   |
| `send(target)`                              | Send to interaction/channel        |

---

## Utility Functions

### fetchMember

Fetch a guild member with caching:

```typescript
import { fetchMember } from "vimcord";

const member = await fetchMember(guild, userId);
if (member) {
    console.log(member.user.username);
}
```

### fetchChannel

Fetch a channel with type checking:

```typescript
import { fetchChannel } from "vimcord";
import { ChannelType } from "discord.js";

const channel = await fetchChannel(guild, channelId, ChannelType.GuildText);
if (channel) {
    await channel.send("Hello!");
}
```

### dynaSend

Universal send method that works with any Discord object:

```typescript
import { dynaSend } from "vimcord";

// Works with interactions, channels, messages, users
await dynaSend(interaction, {
    content: "Hello!",
    embeds: [embed],
    files: [attachment],
    flags: "Ephemeral"
});
```

### \_\_zero Helper

Null/undefined coercion helper:

```typescript
import { __zero } from "vimcord";

// Returns value or undefined (never null)
const guild = client.guilds.cache.get(__zero(config.guildId));
```

---

## Project Scaffolding

### Minimum Project Structure

```
my-bot/
├── constants/                 # Static JSON configuration (outside src for hot reloading)
│   └── example.config.json   # JSON files imported into src/constants.ts
├── src/
│   ├── index.ts              # Entry point
│   ├── bot.ts                # Bot factory
│   ├── constants.ts          # Re-exports constants from ../constants/*.json
│   ├── commands/
│   │   ├── slash/            # Slash commands (*.slash.ts)
│   │   ├── prefix/          # Prefix commands (*.prefix.ts)
│   │   └── context/         # Context menu commands (*.ctx.ts)
│   ├── events/              # Event handlers (*.event.ts)
│   ├── db/                  # Database schemas and connection
│   │   ├── index.ts         # Database exports
│   │   └── schemas/         # MongoDB schemas (*.schema.ts)
│   └── utils/               # Shared utilities
├── .env                     # Environment variables
├── .env.example             # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

**Why constants/ is outside src/:**

Placing static JSON configuration files outside `src/` allows the bot to read updated values without rebuilding. During development with hot reload (tsx), changes to JSON files in `constants/` are picked up automatically. This is ideal for:

- Bot configuration (colors, prefixes, IDs)
- Response messages/templates
- Any data that may change without deploying new code

To add new constants:

1. Create a new JSON file in `constants/`
2. Import and re-export it in `src/constants.ts`

### Essential Configuration Files

**tsconfig.json** (Required settings with recommended path aliases):

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "commonjs",
        "moduleResolution": "node",
        "esModuleInterop": true,
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "skipLibCheck": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"],

            "@commands/*": ["./src/commands/*"],
            "@slashCommands/*": ["./src/commands/slash/*"],
            "@prefixCommands/*": ["./src/commands/prefix/*"],
            "@contextCommands/*": ["./src/commands/context/*"],

            "@events/*": ["./src/events/*"],
            "@jobs/*": ["./src/jobs/*"],

            "@db/*": ["./src/db/*"],
            "@features/*": ["./src/features/*"],
            "@utils/*": ["./src/utils/*"],

            "@constants/*": ["./src/constants/*"],
            "@ctypes/*": ["./src/types/*"]
        }
    },
    "include": ["src/**/*"]
}
```

> **Important:** Always use path aliases over relative imports. All aliases use wildcard patterns — always include the subpath when importing (e.g. `@db/index`, `@utils/permissions`). This makes refactoring easier and keeps imports consistent across the codebase.

**.env.example**:

```bash
# Discord Bot Tokens
TOKEN=your_production_bot_token
TOKEN_DEV=your_development_bot_token

# MongoDB (optional)
MONGO_URI=mongodb://localhost:27017/discord-bot
MONGO_URI_DEV=mongodb://localhost:27017/discord-bot-dev
```

### Package Dependencies

```json
{
    "dependencies": {
        "vimcord": "latest",
        "discord.js": "latest"
    },
    "devDependencies": {
        "@types/node": "latest",
        "typescript": "latest"
    },
    "optionalDependencies": {
        "mongoose": "latest"
    }
}
```

### Entry Point Pattern

**src/bot.ts**:

> **Note:** The `GatewayIntentBits` values below are illustrative. Add only the intents your bot actually requires — refer to the Discord developer docs to determine which apply.

```typescript
import { GatewayIntentBits } from "discord.js";
import { createClient, Vimcord } from "vimcord";

export function createBot(): Vimcord {
    return createClient(
        {
            // Add only the intents your bot requires
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        },
        {
            // Feature flags
            useDefaultSlashCommandHandler: true,
            useDefaultContextCommandHandler: true,
            useDefaultPrefixCommandHandler: true,
            useGlobalErrorHandlers: true,
            maxLoginAttempts: 3,

            // Auto-import modules
            importModules: {
                events: "./events",
                slashCommands: "./commands/slash",
                prefixCommands: "./commands/prefix",
                contextCommands: "./commands/context"
            }
        }
    );
}
```

**src/index.ts**:

```typescript
import { createBot } from "./bot";
import { MongoDatabase } from "vimcord";

async function main(): Promise<void> {
    const client = createBot();

    // Load environment variables
    client.useEnv();

    // Configure app settings
    client.configure("app", {
        name: "MyBot",
        verbose: process.argv.includes("--verbose")
    });

    // Connect to database (optional) — must be called before client.start()
    if (process.env.MONGO_URI) {
        await client.useDatabase(new MongoDatabase(client));
    }

    // Start the bot
    await client.start();
}

main().catch(console.error);
```

---

## Core Concepts

### The Client Instance

Vimcord extends discord.js Client with these additions:

```typescript
// Access via client property
client.$name; // Bot name (get/set)
client.$version; // Bot version (get/set)
client.$devMode; // Development mode flag (get/set)
client.$verboseMode; // Verbose logging flag (get/set)

// Managers
client.events; // EventManager
client.commands; // CommandManager (slash/prefix/context)
client.status; // StatusManager
client.db; // DatabaseManager (after useDatabase)
client.logger; // Logger instance
client.error; // ErrorHandler

// Utilities
client.fetchUser(id); // Cached user fetch
client.fetchGuild(id); // Cached guild fetch
```

### Module Importing System

Vimcord automatically imports modules using file suffixes:

| Module Type      | Default Suffix | Example Filename |
| ---------------- | -------------- | ---------------- |
| Slash Commands   | `.slash`       | `ping.slash.ts`  |
| Prefix Commands  | `.prefix`      | `help.prefix.ts` |
| Context Commands | `.ctx`         | `avatar.ctx.ts`  |
| Events           | `.event`       | `ready.event.ts` |

**Custom Suffix Configuration**:

```typescript
createClient({...}, {
    importModules: {
        slashCommands: {
            dir: "./commands",
            suffix: ".cmd",        // Custom suffix
            recursive: true         // Include subdirectories
        }
    }
})
```

---

## Command Builders

### Slash Commands

**Basic Structure (Builder Function Pattern)**:

The builder function pattern (`builder => builder...`) is preferred for cleaner code:

```typescript
import { InteractionContextType } from "discord.js";
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    // Builder function receives Discord.js SlashCommandBuilder
    builder: builder =>
        builder.setName("ping").setDescription("Check bot latency").setContexts(InteractionContextType.Guild),

    // Auto-defer reply (prevents 3-second timeout)
    deferReply: true,
    // Or with options: deferReply: { ephemeral: true }

    // Command metadata for help/categorization
    metadata: { category: "General/App" },

    async execute(client, interaction): Promise<void> {
        await interaction.editReply(`Pong! Latency: ${client.ws.ping}ms`);
    }
});
```

**Staff-Only Command with Permissions**:

```typescript
import { InteractionContextType, PermissionFlagsBits } from "discord.js";
import { SlashCommandBuilder } from "vimcord";
import { BlacklistedUserSchema } from "@db/index";

export default new SlashCommandBuilder({
    builder: builder =>
        builder
            .setName("blacklist")
            .setDescription("Manage blacklisted users (STAFF)")
            .setContexts(InteractionContextType.Guild)
            .addUserOption(option => option.setName("user").setDescription("User to blacklist").setRequired(true))
            .addStringOption(option => option.setName("reason").setDescription("Reason for blacklist")),

    deferReply: true,

    permissions: {
        guildOnly: true,
        botStaffOnly: true // Only bot owner + superUsers
    },

    metadata: { category: "Staff" },

    async execute(client, interaction): Promise<void> {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason") ?? "No reason provided";

        await BlacklistedUserSchema.create([
            {
                userId: user.id,
                staffId: interaction.user.id,
                reason
            }
        ]);

        await interaction.editReply(`Blacklisted **${user.username}**.`);
    }
});
```

**With Subcommand Routing**:

Use `routes` to split complex commands into separate handlers:

```typescript
import { SlashCommandBuilder } from "vimcord";
import cardAdd from "./card/add";
import cardDelete from "./card/delete";
import cardEdit from "./card/edit";

export default new SlashCommandBuilder({
    builder: builder =>
        builder
            .setName("card")
            .setDescription("Card management (STAFF)")

            .addSubcommand(sub =>
                sub
                    .setName("add")
                    .setDescription("Add a new card")
                    .addAttachmentOption(opt => opt.setName("image").setRequired(true))
                    .addStringOption(opt => opt.setName("id").setRequired(true))
            )
            .addSubcommand(sub =>
                sub
                    .setName("delete")
                    .setDescription("Delete a card")
                    .addStringOption(opt => opt.setName("card").setAutocomplete(true).setRequired(true))
            )
            .addSubcommand(sub =>
                sub
                    .setName("edit")
                    .setDescription("Edit a card")
                    .addStringOption(opt => opt.setName("card").setAutocomplete(true).setRequired(true))
            ),

    deferReply: true,
    permissions: { botStaffOnly: true },

    // Route subcommands to separate handlers
    routes: [
        { name: "add", handler: (client, interaction) => cardAdd(interaction) },
        { name: "delete", handler: (client, interaction) => cardDelete(interaction) },
        { name: "edit", handler: (client, interaction) => cardEdit(interaction) }
    ]
});
```

**With Database Integration**:

```typescript
import { InteractionContextType } from "discord.js";
import { SlashCommandBuilder } from "vimcord";
import { UserSchema, CooldownSchema } from "@db/index";

export default new SlashCommandBuilder({
    builder: builder =>
        builder.setName("daily").setDescription("Claim your daily reward").setContexts(InteractionContextType.Guild),

    deferReply: true,
    metadata: { category: "Economy" },

    async execute(client, interaction): Promise<void> {
        const userId = interaction.user.id;

        // Check cooldown
        const cooldown = await CooldownSchema.check(userId, interaction.channel, "daily");
        if (cooldown?.isActive) {
            return cooldown.onActiveMessage(interaction, "Daily not ready yet.");
        }

        // Fetch user data
        const user = await UserSchema.fetch({ userId }, { balance: 1, dailyStreak: 1 });

        // Update balance and streak
        await UserSchema.update(
            { userId },
            {
                $inc: { balance: 100, dailyStreak: 1 },
                $set: { dailyClaimedAt: Date.now() }
            },
            { upsert: true }
        );

        await interaction.editReply(`Claimed daily! Streak: ${(user?.dailyStreak ?? 0) + 1}`);
    }
});
```

**Full Permissions Reference**:

```typescript
new SlashCommandBuilder({
    builder: {...},
    permissions: {
        // Discord permissions
        user: [PermissionFlagsBits.ManageMessages],
        bot: [PermissionFlagsBits.SendMessages],

        // Role-based
        roles: ["ROLE_ID_1", "ROLE_ID_2"], // User must have any of these
        roleBlacklist: ["BANNED_ROLE_ID"], // Block users with these roles

        // User-based
        userWhitelist: ["USER_ID_1"], // Only these users can use
        userBlacklist: ["BANNED_USER_ID"], // Block these users

        // Context restrictions
        guildOnly: true, // No DMs
        guildOwnerOnly: false, // Only server owner
        botOwnerOnly: false, // Only bot owner
        botStaffOnly: false // Bot owner + superUsers
    }
});
```

### Prefix Commands

**Basic Structure**:

```typescript
import { PrefixCommandBuilder } from "vimcord";
import { BlacklistedUserSchema } from "@db/index";

export default new PrefixCommandBuilder({
    name: "blacklist",
    aliases: ["bl"],
    description: "Add or remove a user from the blacklist.",

    metadata: {
        category: "Staff",
        examples: ["blacklist add @user --rs reason"]
    },

    permissions: {
        guildOnly: true,
        botStaffOnly: true
    },

    async execute(client, message, args): Promise<void> {
        const op = args[0]?.toLowerCase();
        const userId = message.mentions.users.first()?.id || args[1];

        if (!op || !["add", "remove"].includes(op)) {
            return message.reply("Please specify: `add` OR `remove`.");
        }

        if (op === "add") {
            await BlacklistedUserSchema.create([
                {
                    userId,
                    staffId: message.author.id,
                    reason: "Manual blacklist"
                }
            ]);
            return message.reply(`Blacklisted <@${userId}>.`);
        } else {
            await BlacklistedUserSchema.delete({ userId });
            return message.reply(`Whitelisted <@${userId}>.`);
        }
    }
});
```

### Context Menu Commands

```typescript
import { ApplicationCommandType, InteractionContextType, MessageContextMenuCommandInteraction } from "discord.js";
import { ContextCommandBuilder, BetterModal } from "vimcord";

export default new ContextCommandBuilder({
    builder: builder =>
        builder.setName("Reply").setContexts(InteractionContextType.Guild).setType(ApplicationCommandType.Message),

    async execute(client, interaction): Promise<void> {
        // Fetch target message
        const targetMessage = await interaction.channel?.messages.fetch(interaction.targetId);
        if (!targetMessage) return;

        // Show modal for input
        const modal = await new BetterModal({
            title: "Reply",
            components: [{ textInput: { label: "Message", required: true, style: "Paragraph" } }]
        }).showAndAwait(interaction as MessageContextMenuCommandInteraction);

        if (!modal?.values[0]) return;

        await modal.interaction.deferReply({ flags: "Ephemeral" });
        await targetMessage.reply({ content: modal.values[0] });
        await modal.interaction.editReply({ content: "Message sent!" });
    }
});
```

**Rate Limiting**:

```typescript
import { RateLimitScope, SlashCommandBuilder } from "vimcord";
import { SlashCommandBuilder as DJSSlashCommandBuilder } from "discord.js";

new SlashCommandBuilder({
    builder: new DJSSlashCommandBuilder().setName("example").setDescription("Example command"),
    rateLimit: {
        max: 3, // Max uses
        interval: 60_000, // Per 60 seconds
        scope: RateLimitScope.User // Per user (User/Guild/Channel/Global)
    },
    onRateLimit: async (client, interaction): Promise<void> => {
        await interaction.reply({
            content: "Please slow down!",
            flags: "Ephemeral"
        });
    }
});
```

**Deployment Options**:

```typescript
new SlashCommandBuilder({
    builder: {...},
    deployment: {
        global: true,              // Deploy globally
        guilds: ["guild_id_1"],    // Or specific guilds
        environments: ["production"] // dev/prod only
    }
});
```

**Lifecycle Hooks**:

```typescript
new SlashCommandBuilder({
    builder: {...},
    beforeExecute: async (client, interaction): Promise<void> => {
        console.log("Command starting...");
    },
    execute: async (client, interaction): Promise<void> => {
        // Main logic
    },
    afterExecute: async (result, client, interaction): Promise<void> => {
        console.log("Command finished:", result);
    },
    onError: async (error, client, interaction): Promise<void> => {
        console.error("Command failed:", error);
    }
});
```

---

## Event System

### Event Builder Pattern

```typescript
import { Events } from "discord.js";
import { EventBuilder } from "vimcord";

export default new EventBuilder({
    event: Events.MessageCreate,
    name: "AutoMod", // Optional identifier
    enabled: true,
    once: false, // Run once or continuously
    priority: 0, // Execution order (higher = first)

    // Conditions that must all pass
    conditions: [async message => !message.author.bot, async message => message.guild !== null],

    // Rate limiting
    rateLimit: {
        max: 5,
        interval: 10_000
    },

    execute: async (client, message): Promise<void> => {
        // Event logic
    },

    onError: async (error, client, message): Promise<void> => {
        console.error("Event error:", error);
    }
});
```

### Event Priorities

Events execute by priority (highest first). Use for ordering dependencies:

```typescript
new EventBuilder({
    event: Events.GuildMemberAdd,
    name: "Logging",
    priority: 100, // Runs first
    execute: async (client, member): Promise<void> => {
        await logMemberJoin(member);
    }
});

new EventBuilder({
    event: Events.GuildMemberAdd,
    name: "WelcomeMessage",
    priority: 50, // Runs second
    execute: async (client, member): Promise<void> => {
        await sendWelcome(member);
    }
});
```

---

## Database Integration

### MongoDB Setup

**1. Initialize Connection**:

```typescript
import { MongoDatabase } from "vimcord";
import { createBot } from "./bot";

const client = createBot();

// useDatabase must be called before client.start()
client.useDatabase(new MongoDatabase(client));
await client.start();
```

### createMongoSchema

Creates a typed MongoDB schema with built-in CRUD methods:

```typescript
import { createMongoSchema } from "vimcord";

// Define interface for type safety
export interface IUser {
    userId: string;
    username: string;
    balance: number;
    experience: number;
    isPremium: boolean;
    favoriteCardIds: string[];
    lastActive: Date;
    createdAt: number;
}

export const UserSchema = createMongoSchema<IUser>("Users", {
    // Required unique field
    userId: { type: String, unique: true, required: true },

    // Required field
    username: { type: String, required: true },

    // Field with default value
    balance: { type: Number, default: 0 },

    // Indexed field for faster queries
    experience: { type: Number, default: 0, index: true },

    // Boolean with default
    isPremium: { type: Boolean, default: false },

    // Array type
    favoriteCardIds: { type: [String], default: [] },

    // Date with function default
    lastActive: { type: Date, default: () => new Date() },

    // Number with function default
    createdAt: { type: Number, default: Date.now }
});
```

#### Field Options Reference

| Option     | Type      | Description                |
| ---------- | --------- | -------------------------- | --------------------------------- | ---- | ------- | ----------------------------------- |
| `type`     | `String   | Number                     | Boolean                           | Date | Object` | Field type. Use `[Type]` for arrays |
| `required` | `boolean` | Field must be present      |
| `unique`   | `boolean` | Creates unique index       |
| `default`  | `any      | () => any`                 | Default value or factory function |
| `index`    | `boolean` | Creates single-field index |

#### Nested Object Fields

```typescript
export interface IUserMetrics {
    userId: string;
    // Nested economy metrics
    mingcoins: { spent: number; received: number };
    mingkis: { spent: number; received: number };
    date: Date;
}

export const UserMetricsSchema = createMongoSchema<IUserMetrics>("UserMetrics", {
    userId: { type: String, unique: true, required: true },
    // Nested objects with their own field definitions
    mingcoins: {
        spent: { type: Number, default: 0 },
        received: { type: Number, default: 0 }
    },
    mingkis: {
        spent: { type: Number, default: 0 },
        received: { type: Number, default: 0 }
    },
    date: { type: Date, required: true, index: true }
});
```

### Schema Indexing

Add compound and special indexes after schema creation:

```typescript
import { createMongoSchema } from "vimcord";

export const GuildSchema = createMongoSchema<IGuild>("Guilds", {
    guildId: { type: String, unique: true, required: true },
    prefix: { type: String, default: null }
});

// Compound unique index
GuildSchema.schema.index({ guildId: 1, prefix: 1 }, { unique: true });

// TTL index (auto-delete after 5 minutes)
CooldownSchema.schema.index({ endsAt: 1 }, { expireAfterSeconds: 300 });

// Compound index for queries
AlbumCardSchema.schema.index({ userId: 1, claimedAt: -1 });
AlbumCardSchema.schema.index({ userId: 1, cardId: 1 }, { unique: true });
```

### CRUD Operations

#### Create

```typescript
// Single document
await UserSchema.create([{ userId: "123", username: "John" }]);

// With session (transaction)
await UserSchema.create([{ userId: "123" }], { session });

// Multiple documents
await UserSchema.create([
    { userId: "1", username: "User1" },
    { userId: "2", username: "User2" }
]);
```

#### Read

```typescript
// Fetch single document
const user = await UserSchema.fetch({ userId: "123" });

// With projection (only specific fields)
const user = await UserSchema.fetch({ userId: "123" }, { balance: 1, experience: 1 });

// With options
const user = await UserSchema.fetch(
    { userId: "123" },
    { balance: 1 },
    { upsert: true } // Create if doesn't exist
);

// Fetch all matching documents
const users = await UserSchema.fetchAll({ isPremium: true });

// With lean option (faster, returns plain objects)
const users = await UserSchema.fetchAll({}, null, { lean: true });

// With limit and sort
const topUsers = await UserSchema.fetchAll({ balance: { $gt: 0 } }, null, { limit: 10, sort: { balance: -1 } });

// Check existence
const exists = await UserSchema.exists({ userId: "123" });

// Get distinct values
const groups = await CardSchema.distinct("group", { released: true });
```

#### Update

```typescript
// Update single document
await UserSchema.update({ userId: "123" }, { $inc: { balance: 100 } });

// With options
await UserSchema.update(
    { userId: "123" },
    { $set: { lastActive: new Date() } },
    { upsert: true, new: true } // Create if missing, return updated
);

// Update multiple documents
await CardSchema.updateAll({ released: false }, { $set: { released: true } });

// With session
await UserSchema.update({ userId: "123" }, { $inc: { balance: -50 } }, { session });
```

#### Delete

```typescript
// Delete single document
await UserSchema.delete({ userId: "123" });

// Delete all matching documents
await CooldownSchema.deleteAll({ endsAt: { $lt: new Date() } });
```

### Aggregation

```typescript
import { PipelineStage } from "mongoose";

// Simple aggregation
const topUsers = await UserSchema.aggregate([
    { $match: { balance: { $gt: 0 } } },
    { $sort: { balance: -1 } },
    { $limit: 10 }
]);

// Complex pipeline with types
const pipeline: PipelineStage[] = [{ $match: { tier: CardTier.Public, released: true } }, { $sample: { size: 3 } }];
const cards = await CardSchema.aggregate<ICard>(pipeline);

// With session
const results = await CardSchema.aggregate(pipeline, { session });
```

### extend() - Custom Schema Methods

Add custom methods to schemas for reusable business logic:

```typescript
import { createMongoSchema, Vimcord } from "vimcord";
import { ClientSession } from "mongoose";

export const UserSchema = createMongoSchema<IUser>("Users", {
    userId: { type: String, unique: true, required: true },
    balance: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    premiumSyncedAt: { type: Number, default: null }
}).extend({ modifyBalance, addExperience, getLeaderboard, resetPremiumStatus });

// Method to modify balance with metrics tracking
async function modifyBalance(userId: string, query: { balance?: number }) {
    if (!Object.values(query).some(Boolean)) return;

    await UserSchema.update({ userId }, { $inc: query });
}

// Method returning typed data
async function getLeaderboard(limit: number = 10) {
    return this.aggregate([{ $sort: { experience: -1 } }, { $limit: limit }]);
}

// Method with client parameter for Discord API access
async function syncPremiumStatus(client: Vimcord<true>, userId: string) {
    const userData = await UserSchema.fetch({ userId }, { isPremium: 1, premiumSyncedAt: 1 });
    if (!userData) return;

    // Access Discord API through client
    const guild = await client.fetchGuild(client.config.staff.guild.id);
    const member = guild?.members.cache.get(userId);

    const isPremium = member?.roles.cache.has("ROLE_ID");
    await UserSchema.update({ userId }, { isPremium, premiumSyncedAt: Date.now() });
}

// Simple update method
async function resetPremiumStatus(userId: string) {
    return await UserSchema.update({ userId }, { isPremium: false }, { new: true });
}

// Usage
await UserSchema.modifyBalance("123", { balance: 100 });
const topUsers = await UserSchema.getLeaderboard(5);
await UserSchema.syncPremiumStatus(client, "123");
```

### Transactions

Use transactions for atomic operations across multiple schemas:

```typescript
// Automatic session management
await UserSchema.useTransaction(async session => {
    // Deduct from sender
    await UserSchema.update({ userId: senderId }, { $inc: { balance: -amount } }, { session });

    // Add to recipient
    await UserSchema.update({ userId: recipientId }, { $inc: { balance: amount } }, { session });

    // Log the trade
    await TradeSchema.create(
        [
            {
                senderId,
                recipientId,
                amount
            }
        ],
        { session }
    );
});

// Multi-schema transaction
await UserSchema.useTransaction(async session => {
    await UserSchema.update({ userId }, { $inc: { balance: -price } }, { session });
    await ScrapbookCardSchema.add(userId, [{ cardId, quantity: 1 }], undefined, { session });
    await TransactionSchema.create([{ userId, cardId }], { session });
});
```

### execute() - Direct Model Access

For operations not covered by built-in methods:

```typescript
// Bulk write operations
await UserCardMetricSchema.execute(async model => {
    await model.bulkWrite(
        cardIds.map(cardId => ({
            insertOne: { document: { userId, cardId, type: CardMetricType.Claimed } }
        }))
    );
});

// Complex updates
await AlbumCardSchema.execute(async model => {
    await model.bulkWrite(
        query.map(q => ({
            updateOne: {
                filter: { userId, cardId: q.cardId },
                update: { $addToSet: { prints: { $each: q.prints } } },
                upsert: true
            }
        }))
    );
});
```

### Utility Methods

```typescript
// Generate unique hex ID
const transactionId = await DailyMenuTransactionSchema.createHexId(12, "transactionId");

// Upsert pattern (update or insert)
await UserSchema.update({ userId: "123" }, { $set: { lastActive: new Date() } }, { upsert: true });
```

### Full Schema Example

```typescript
import { createMongoSchema } from "vimcord";
import { PipelineStage, FilterQuery, ProjectionFields } from "mongoose";

export interface ICard {
    cardId: string;
    name: string;
    group: string;
    rarity: number | null;
    type: CardType;
    tier: CardTier;
    imageUrl: string;
    released: boolean;
    locked: boolean;
    globalPrint: number | null;
    createdAt: number;
}

export const CardSchema = createMongoSchema<ICard>("Cards", {
    cardId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    group: { type: String, required: true },
    rarity: { type: Number, default: null, index: true },
    type: { type: Number, required: true, index: true },
    tier: { type: Number, default: CardTier.Public, index: true },
    imageUrl: { type: String, required: true },
    released: { type: Boolean, default: false, index: true },
    locked: { type: Boolean, default: true, index: true },
    globalPrint: { type: Number, default: null },
    createdAt: { type: Number, default: Date.now }
}).extend({ sampleRandom, lookup });

// Compound indexes
CardSchema.schema.index({ type: 1, rarity: 1, tier: 1, released: 1 });

// Extended method: Random card sampling
async function sampleRandom(quantity: number, options: { type?: CardType[] } = {}) {
    const pipeline: PipelineStage[] = [
        {
            $match: {
                tier: CardTier.Public,
                type: { $in: options.type ?? [CardType.Regular] },
                released: true,
                locked: false
            }
        },
        { $sample: { size: quantity } }
    ];

    return await CardSchema.aggregate<ICard>(pipeline);
}

// Extended method: Card lookup with options
async function lookup(
    filter: FilterQuery<ICard> = {},
    options: { projection?: ProjectionFields<ICard>; limit?: number } = {}
) {
    const pipeline: PipelineStage[] = [{ $match: filter }];
    if (options.projection) pipeline.push({ $project: options.projection });
    if (options.limit) pipeline.push({ $limit: options.limit });

    return await CardSchema.aggregate<ICard>(pipeline);
}
```

---

## UI Components

### BetterEmbed

**Auto Context Formatting (ACF)**:

```typescript
import { BetterEmbed } from "vimcord";

const embed = new BetterEmbed({
    context: { interaction }, // Enables ACF
    title: "Welcome, $USER!",
    description: ["Your avatar: $USER_AVATAR", "Server: $DISPLAY_NAME", "Today: $MONTH/$DAY/$YEAR"],
    color: "#5865F2"
});

await embed.send(interaction);
```

**Available ACF Tokens**:

- `$USER` - User mention
- `$USER_NAME` - Username
- `$DISPLAY_NAME` - Server nickname
- `$USER_AVATAR` - User avatar URL
- `$BOT_AVATAR` - Bot avatar URL
- `$YEAR/$MONTH/$DAY` - Date (2-digit month/day)
- `$year/$month/$day` - Short date format
- `$INVIS` - Invisible character (zero-width space)

**Escape ACF**: Use backslash: `\$USER`

### Paginator

```typescript
import { BetterEmbed, Paginator, PaginationType } from "vimcord";

const paginator = new Paginator({
    type: PaginationType.LongJump, // first | back | jump | next | last
    timeout: 120_000, // 2 minutes
    onTimeout: 1 // 0=disable, 1=clear, 2=delete, 3=nothing
});

// Add chapters (grouped pages)
paginator.addChapter(
    [
        new BetterEmbed({ title: "Help Page 1", description: "..." }),
        new BetterEmbed({ title: "Help Page 2", description: "..." })
    ],
    { label: "General Help", emoji: "📖" }
);

paginator.addChapter([new BetterEmbed({ title: "Mod Page 1", description: "..." })], { label: "Moderation", emoji: "🛡️" });

// Send and get message
const message = await paginator.send(interaction);

// Events
paginator.on("pageChange", (page, index) => {
    console.log(`Chapter ${index.chapter}, Page ${index.nested}`);
});
```

### Prompt

```typescript
import { BetterEmbed, Prompt, PromptResolveType } from "vimcord";

const prompt = new Prompt({
    embed: new BetterEmbed({
        context: { interaction },
        title: "Delete this message?",
        description: "This action cannot be undone."
    }),
    timeout: 30_000,
    onResolve: [PromptResolveType.DisableComponents, PromptResolveType.DeleteOnConfirm]
});

await prompt.send(interaction);
const result = await prompt.awaitResponse();

if (result.confirmed) {
    await message.delete();
}
```

### BetterModal

```typescript
import { TextInputStyle } from "discord.js";
import { BetterModal } from "vimcord";

const modal = new BetterModal({
    title: "Create Ticket",
    components: [
        {
            textInput: {
                label: "Subject",
                custom_id: "subject",
                style: TextInputStyle.Short,
                required: true,
                max_length: 100
            }
        },
        {
            textInput: {
                label: "Description",
                custom_id: "description",
                style: TextInputStyle.Paragraph,
                max_length: 1000
            }
        }
    ]
});

// Show and await in one call
const result = await modal.showAndAwait(interaction, {
    timeout: 60_000,
    autoDefer: true // Close modal after submission
});

if (result) {
    const subject = result.getField("subject", true);
    const description = result.getField("description");

    await result.reply({
        content: `Ticket created: ${subject}`,
        flags: "Ephemeral"
    });
}
```

### DynaSend

Universal send method that works with any Discord object:

```typescript
import { dynaSend } from "vimcord";

// Works with: interactions, channels, messages, users
await dynaSend(interaction, {
    content: "Hello!",
    embeds: [myEmbed],
    components: [actionRow],
    files: [attachment],
    flags: "Ephemeral"
});
```

Auto-detects the correct method:

- Interactions → reply/editReply/followUp
- Channels → channel.send()
- Messages → message.reply() / message.edit()
- Users → user.send()

---

## Error Handling

### Command Error Handling

Vimcord automatically handles command errors with user-friendly embeds:

```typescript
new SlashCommandBuilder({
    builder: {...},
    execute: async (client, interaction): Promise<void> => {
        try {
            // Risky operation
        } catch (err) {
            // Throw to trigger Vimcord's error handling
            throw new Error("Custom error message");
        }
    },
    onError: async (error, client, interaction): Promise<void> => {
        // Handle error locally (re-throw for global handling)
        await interaction.reply({ content: "Custom error handling", flags: "Ephemeral" });
        throw error;
    }
});
```

### Global Error Handlers

```typescript
createClient({...}, {
    useGlobalErrorHandlers: true  // Catches uncaught exceptions
});

// Or manual setup:
process.on("unhandledRejection", error => {
    client.logger.error("Unhandled rejection", error as Error);
});
```

### Logger

```typescript
import { Logger } from "vimcord";

const logger = new Logger({
    prefix: "Economy",
    prefixEmoji: "💰",
    colors: { primary: "#57F287" },
    minLevel: 1 // 0=debug, 1=info, 2=success, 3=warn, 4=error
});

logger.info("Processing transaction...");
logger.success("Transaction complete!");
logger.warn("Low balance detected");
logger.error("Transaction failed", error);

// Loader for async operations
const stopLoader = logger.loader("Connecting to database...");
await connectToDB();
stopLoader("Connected successfully!");

// Table output
logger.table("Stats", {
    users: 150,
    revenue: "$420.69"
});
```

---

## Scheduled Jobs

For recurring tasks, use a cron-based job system:

### Base Job Classes

```typescript
// src/jobs/_BaseCronJob.ts
import { schedule, ScheduledTask } from "node-cron";

export abstract class _BaseCronJob {
    protected task: ScheduledTask | null = null;
    private static instances = new Map<any, any>();

    static getInstance<T extends _BaseCronJob>(this: new (...args: any[]) => T): T {
        let instance = _BaseCronJob.instances.get(this);

        if (!instance) {
            instance = new this();
        }

        return instance as T;
    }

    constructor(
        private interval: string,
        private immediate?: boolean
    ) {
        _BaseCronJob.instances.set(this.constructor, this);
        this.start();
    }

    abstract execute(): Promise<any>;

    async start(): Promise<void> {
        if (this.task) {
            this.task.start();
            return;
        }

        this.task = schedule(this.interval, () => this.execute(), { noOverlap: true });

        if (this.immediate) {
            await this.execute();
        }
    }

    stop(): void {
        this.task?.stop();
    }
}
```

### Implementing a Job

```typescript
// src/jobs/Backups.job.ts
import { BackupManager } from "@/utils/app/BackupManager";
import { logger } from "@/utils/logger";
import { _BaseCronJob } from "./_BaseCronJob";

export class Backups extends _BaseCronJob {
    constructor() {
        // Run every 6 hours: "0 0 */6 * * *"
        super("0 0 */6 * * *", false);
        logger.job("Backups", "Initialized");
    }

    async execute(): Promise<void> {
        await BackupManager.create();
    }
}
```

### Job Initialization

```typescript
// src/jobs/index.ts
import { Vimcord } from "vimcord";
import { Backups } from "./Backups.job";
import { CooldownReminders } from "./CooldownReminders.job";
import { DailyMenuRotator } from "./DailyMenuRotator.job";

export async function initializeJobs(client: Vimcord): Promise<void> {
    new Backups();
    new CooldownReminders(client);
    new DailyMenuRotator();
}
```

### Cron Schedule Reference

| Pattern         | Description       |
| --------------- | ----------------- |
| `* * * * * *`   | Every second      |
| `0 * * * * *`   | Every hour        |
| `0 0 */6 * * *` | Every 6 hours     |
| `0 0 0 * * *`   | Daily at midnight |
| `0 30 4 * * *`  | Daily at 4:30 AM  |

Format: `second minute hour day month weekday`

---

## Feature Classes

For complex business logic that spans multiple commands, use feature classes:

```typescript
// src/features/PlayerTradeManager.ts
import { User } from "discord.js";
import { Vimcord } from "vimcord";
import { UserSchema, ScrapbookCardSchema } from "@db/index";

export class PlayerTrade {
    sender: User;
    recipient: User;
    senderOffer: TradeOffer;
    recipientOffer: TradeOffer;

    constructor(sender: User, recipient: User) {
        this.sender = sender;
        this.recipient = recipient;
        this.senderOffer = PlayerTrade.createTradeOffer();
        this.recipientOffer = PlayerTrade.createTradeOffer();
    }

    static createTradeOffer(): TradeOffer {
        return { cards: [], mingcoins: 0 };
    }

    async isEligible(client: Vimcord): Promise<{ success: boolean; failReason?: string }> {
        const userData = await UserSchema.fetchAll({
            userId: { $in: [this.sender.id, this.recipient.id] }
        });

        if (userData.length < 2) {
            return { success: false, failReason: "Both users must be registered." };
        }

        return { success: true };
    }

    async execute(): Promise<{ success: boolean; failReason?: string }> {
        // Validate offers
        // Apply trade with transaction
        await UserSchema.useTransaction(async session => {
            await UserSchema.update(
                { userId: this.sender.id },
                { $inc: { balance: -this.senderOffer.mingcoins } },
                { session }
            );
            await UserSchema.update(
                { userId: this.recipient.id },
                { $inc: { balance: this.senderOffer.mingcoins } },
                { session }
            );
        });

        return { success: true };
    }
}
```

### Using Feature Classes in Commands

```typescript
// In a command file
import { PlayerTrade } from "@/features/PlayerTradeManager";

export default new SlashCommandBuilder({
    builder: builder => builder.setName("trade").setDescription("Trade with another player"),

    async execute(client, interaction): Promise<void> {
        const targetUser = interaction.options.getUser("user", true);

        const trade = new PlayerTrade(interaction.user, targetUser);

        const eligibility = await trade.isEligible(client);
        if (!eligibility.success) {
            return interaction.reply({ content: eligibility.failReason, flags: "Ephemeral" });
        }

        // ... trade UI logic

        const result = await trade.execute();
        if (result.failReason) {
            return interaction.reply({ content: result.failReason, flags: "Ephemeral" });
        }
    }
});
```

---

## Configuration Patterns

### App Configuration

```typescript
client.configure("app", {
    name: "MyBot",
    devMode: false, // Uses TOKEN_DEV, MONGO_URI_DEV
    verbose: false, // Extra logging
    enableCLI: false, // Interactive CLI
    disableBanner: false // Hide ASCII banner
});
```

### Staff Configuration

```typescript
client.configure("staff", {
    ownerId: "123456789",
    staffRoleIds: ["111222333"]
});
```

### Command Type Configuration

Global defaults for all commands of a type:

```typescript
client.configure("slashCommands", {
    enabled: true,
    logExecution: true,
    permissions: {
        bot: [PermissionFlagsBits.SendMessages]
    }
});
```

---

## Best Practices

### Code Style

**Import Order**:

```typescript
// 1. Node built-ins
import { randomUUID } from "node:crypto";

// 2. Third-party packages
import { PermissionFlagsBits } from "discord.js";
import { SlashCommandBuilder } from "vimcord";

// 3. Local modules
import { UserSchema } from "@db/schemas/user.schema";
```

**Function Signatures**: Always use explicit return types

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

### Security

**Never hardcode tokens**:

```typescript
// ❌ BAD
const token = "abc123...";

// ✅ GOOD
const token = process.env.TOKEN;
```

**Validate permissions before operations**:

```typescript
import { GuildMember, PermissionFlagsBits } from "discord.js";

execute: async (client, interaction): Promise<void> => {
    const member = interaction.member as GuildMember;

    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
            content: "Missing permission: Ban Members",
            flags: "Ephemeral"
        });
    }

    // Proceed with ban...
};
```

### Performance

**Use caching for frequently accessed data**:

```typescript
const cache = new Map<string, unknown>();

async function getCachedData(key: string): Promise<unknown> {
    if (cache.has(key)) return cache.get(key);
    const data = await expensiveOperation(key);
    cache.set(key, data);
    return data;
}
```

**Database: Use lean queries for read-only operations**:

```typescript
// Fast - returns plain objects
const users = await UserSchema.fetchAll({}, null, { lean: true });

// Slower - returns Mongoose documents with full functionality
const users = await UserSchema.fetchAll();
```

### Type Safety

**Never use `any`**: Use `unknown` with type guards

```typescript
// ❌ BAD
function process(data: any) {
    return data.value;
}

// ✅ GOOD
function process(data: unknown): string | null {
    if (typeof data === "object" && data !== null && "value" in data) {
        return (data as { value: string }).value;
    }
    return null;
}
```

**Use `satisfies` for shape validation**:

```typescript
const config = {
    name: "MyBot"
} satisfies { name: string };
```

### Error Handling

**Wrap all async operations**:

```typescript
execute: async (client, interaction): Promise<void> => {
    try {
        await riskyOperation();
    } catch (err) {
        client.logger.error("Operation failed", err as Error);
        await interaction.reply({
            content: "An error occurred",
            flags: "Ephemeral"
        });
    }
};
```

**Use discriminated unions for state**:

```typescript
type CommandState = { status: "loading" } | { status: "success"; data: unknown } | { status: "error"; error: Error };

// Better than: { isLoading: boolean; error?: Error; data?: unknown }
```

### Module Structure

**One command per file**:

```typescript
// commands/slash/ping.slash.ts
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({...});
```

**Extract shared logic into utilities**:

```typescript
// utils/permissions.ts
import { GuildMember, PermissionFlagsBits } from "discord.js";

export async function checkModPermissions(member: GuildMember): Promise<boolean> {
    return member.permissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers]);
}

// Use in multiple commands
import { checkModPermissions } from "@utils/permissions";
```

### Database Patterns

**Use transactions for related operations**:

```typescript
await UserSchema.useTransaction(async (session, model) => {
    await model.updateOne({ userId: sender }, { $inc: { balance: -amount } }, { session });
    await model.updateOne({ userId: receiver }, { $inc: { balance: amount } }, { session });
});
```

**Index frequently queried fields**:

```typescript
export const UserSchema = createMongoSchema("Users", {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, index: true }
});
```

---

## Common Patterns

### Help Command with Categories

```typescript
import { SlashCommandBuilder as DJSSlashCommandBuilder } from "discord.js";
import { BetterEmbed, Paginator, PaginationType, SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: new DJSSlashCommandBuilder().setName("help").setDescription("View all commands"),

    execute: async (client, interaction): Promise<void> => {
        const categories = client.commands.slash.sortByCategory();

        const paginator = new Paginator({
            type: PaginationType.Short
        });

        for (const category of categories) {
            const embed = new BetterEmbed({
                context: { interaction },
                title: `${category.emoji || "📋"} ${category.name}`,
                description: category.commands
                    .map(cmd => {
                        const name = cmd.builder.name;
                        const desc = cmd.builder.description;
                        return `**/${name}** - ${desc}`;
                    })
                    .join("\n")
            });

            paginator.addChapter([embed], {
                label: category.name,
                emoji: category.emoji
            });
        }

        await paginator.send(interaction);
    }
});
```

### Guild-Only Command with Database

```typescript
import { PermissionFlagsBits, SlashCommandBuilder as DJSSlashCommandBuilder } from "discord.js";
import { SlashCommandBuilder } from "vimcord";
import { GuildConfigSchema } from "@db/schemas/guild.schema";

export default new SlashCommandBuilder({
    builder: new DJSSlashCommandBuilder()
        .setName("setprefix")
        .setDescription("Change server prefix")
        .addStringOption(opt => opt.setName("prefix").setDescription("New prefix").setRequired(true).setMaxLength(5)),

    permissions: {
        user: [PermissionFlagsBits.ManageGuild],
        guildOnly: true
    },

    execute: async (client, interaction): Promise<void> => {
        const prefix = interaction.options.getString("prefix", true);
        const guildId = interaction.guildId;

        await GuildConfigSchema.upsert({ guildId }, { $set: { prefix, updatedAt: new Date() } });

        await interaction.reply({
            content: `Prefix updated to: ${prefix}`,
            flags: "Ephemeral"
        });
    }
});
```

### Confirmation Flow

```typescript
import { PermissionFlagsBits, SlashCommandBuilder as DJSSlashCommandBuilder } from "discord.js";
import { BetterEmbed, Prompt, PromptResolveType, SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: new DJSSlashCommandBuilder().setName("purge").setDescription("Delete messages"),

    permissions: {
        user: [PermissionFlagsBits.ManageMessages],
        bot: [PermissionFlagsBits.ManageMessages]
    },

    execute: async (client, interaction): Promise<void> => {
        const prompt = new Prompt({
            embed: new BetterEmbed({
                context: { interaction },
                title: "⚠️ Warning",
                description: "This will delete 100 messages. Continue?",
                color: "#FEE75C"
            }),
            timeout: 30_000,
            onResolve: [PromptResolveType.DisableComponents]
        });

        await prompt.send(interaction);
        const result = await prompt.awaitResponse();

        if (result.confirmed) {
            await interaction.channel?.bulkDelete(100);
        }
    }
});
```

---

## Debugging

### Enable Verbose Mode

```bash
node dist/index.js --verbose
# or
client.configure("app", { verbose: true });
```

### Use the Logger

```typescript
client.logger.debug("Debug info");
client.logger.table("State", { key: "value" });

// Custom logger per module
const modLogger = new Logger({
    prefix: "Moderation",
    prefixEmoji: "🛡️"
});
```

### Check Client State

```typescript
console.log(client.toJSON());
// Shows: { options, features, config }
```

---

## Migration Guide

### From Raw Discord.js

**Before**:

```typescript
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply("Pong!");
    }
});
```

**After**:

```typescript
import { SlashCommandBuilder as DJSSlashCommandBuilder } from "discord.js";
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: new DJSSlashCommandBuilder().setName("ping").setDescription("Ping command"),
    execute: async (client, interaction): Promise<void> => {
        await interaction.reply("Pong!");
    }
});
```

### Adding Vimcord to Existing Project

1. Install Vimcord alongside existing discord.js
2. Keep existing event handlers, migrate incrementally
3. Use Vimcord tools (BetterEmbed, Paginator) with existing code
4. Gradually replace command handlers with builders

---

## Environment Reference

| Variable        | Required | Description                                       |
| --------------- | -------- | ------------------------------------------------- |
| `TOKEN`         | Yes      | Production bot token                              |
| `TOKEN_DEV`     | No       | Development bot token (used when `devMode: true`) |
| `MONGO_URI`     | No       | Production MongoDB URI                            |
| `MONGO_URI_DEV` | No       | Development MongoDB URI                           |

---

## Quick Reference

### Import Map

```typescript
// Core
import { createClient, Vimcord } from "vimcord";

// Configuration factories
import { defineClientOptions, defineVimcordFeatures, defineGlobalToolsConfig } from "vimcord";

// Builders
import { SlashCommandBuilder, PrefixCommandBuilder, ContextCommandBuilder, EventBuilder } from "vimcord";

// Tools
import { BetterEmbed, Paginator, Prompt, BetterModal, Logger, dynaSend } from "vimcord";

// Collectors & Components
import { BetterCollector, BetterContainer, CollectorTimeoutType, PaginationTimeoutType } from "vimcord";

// Database
import { MongoDatabase, createMongoSchema } from "vimcord";

// Types
import { RateLimitScope, MissingPermissionReason, CommandType, StatusType, SendMethod } from "vimcord";

// Utilities
import { fetchMember, fetchChannel, __zero } from "vimcord";
```

### Common Types

```typescript
// Rate limiting scopes
RateLimitScope.User; // Per user
RateLimitScope.Guild; // Per guild
RateLimitScope.Channel; // Per channel
RateLimitScope.Global; // Across all users

// Pagination types
PaginationType.Short; // back, next
PaginationType.ShortJump; // back, jump, next
PaginationType.Long; // first, back, next, last
PaginationType.LongJump; // first, back, jump, next, last

// Prompt resolve types
PromptResolveType.DisableComponents; // Disable buttons after response
PromptResolveType.ClearComponents; // Remove buttons after response
PromptResolveType.DeleteOnConfirm; // Delete message on confirm
PromptResolveType.DeleteOnReject; // Delete message on reject

// Collector timeout types
CollectorTimeoutType.DisableComponents;
CollectorTimeoutType.ClearComponents;
CollectorTimeoutType.DeleteMessage;
CollectorTimeoutType.DoNothing;

// Status types
StatusType.Online;
StatusType.Idle;
StatusType.DND;
StatusType.Invisible;
```

---

_End of DOCS.md_
