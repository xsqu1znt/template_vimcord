import { ActivityType, ClientOptions, GatewayIntentBits } from "discord.js";
import {
    createClient,
    defineGlobalToolsConfig,
    MongoDatabase,
    StatusType,
    VimcordConfigOptions,
    VimcordFeatures
} from "vimcord";
import { GuildSchema } from "./db";

// Globally configure tools
defineGlobalToolsConfig({
    embedColor: ["#ead8c0", "#dbcbb4", "#e0d8c7"],
    embedColorDev: ["#ead8c0", "#dbcbb4", "#e0d8c7"]
});

// Configure the Discord.js client
const clientOptions: ClientOptions = {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
};

// Configure Vimcord's features
const vimcordFeatures: VimcordFeatures = {
    useGlobalErrorHandlers: true,
    useDefaultSlashCommandHandler: true,
    useDefaultPrefixCommandHandler: true,
    useDefaultContextCommandHandler: true,

    // Automatically import the .env using dotEnv
    useEnv: true,
    hookToolsDevMode: true,

    // Automatically import event and command modules
    importModules: {
        events: "./events",
        slashCommands: "./commands/slash",
        prefixCommands: "./commands/prefix"
    }
};

// Configure the basics
const vimcordConfigOptions: VimcordConfigOptions = {
    app: { name: "My Amazing Bot", appVersion: "1.0.0" },
    prefixCommands: { defaultPrefix: "!" }
};

// Create a new client
const client = createClient(clientOptions, vimcordFeatures, vimcordConfigOptions);

// Globally configure prefix commands
client.configurePrefixCommands({
    async guildPrefixResolver(client, guildId) {
        const guildData = await GuildSchema.fetch({ guildId }, { _id: 0, prefix: 1 });
        return guildData?.prefix;
    }
});

// Configure our database of choice and then log in
client
    .start(async client => {
        // Use Mongo as our database
        await client.useDatabase(new MongoDatabase(client));
    })
    .then(async () => {
        // Set the client's status
        client.status.set({
            production: {
                activity: { name: "Check out our server!", type: ActivityType.Streaming, status: StatusType.Online }
            },
            development: {
                activity: { name: "Testing new features...", type: ActivityType.Custom, status: StatusType.DND }
            }
        });
    });
