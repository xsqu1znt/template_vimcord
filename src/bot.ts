import { GatewayIntentBits } from "discord.js";
import { createClient, Vimcord } from "vimcord";

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

    return bot;
}
