import { GatewayIntentBits } from "discord.js";
import { createClient, Vimcord } from "vimcord";
import { GuildSchema } from "./db";

export function createBot(): Vimcord {
    // Create a new Vimcord client
    const bot = createClient(
        {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        },
        {
            useDefaultSlashCommandHandler: true,
            useDefaultContextCommandHandler: true,
            useDefaultPrefixCommandHandler: true,
            useGlobalErrorHandlers: true,
            maxLoginAttempts: 3,

            importModules: {
                events: "./events",
                slashCommands: "./commands/slash",
                prefixCommands: "./commands/prefix",
                contextCommands: "./commands/context"
            }
        }
    );

    // Configure the app
    bot.configure("app", {
        name: "My Amazing Bot",
        verbose: process.argv.includes("--verbose")
    });

    // Configure the prefix commands
    bot.configure("prefixCommands", {
        defaultPrefix: bot.$devMode ? "!" : "?",
        async guildPrefixResolver(client, guildId) {
            const guildData = await GuildSchema.fetch({ guildId }, { _id: 0, prefix: 1 });
            return guildData?.prefix;
        }
    });

    return bot;
}
