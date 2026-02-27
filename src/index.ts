import { ActivityType } from "discord.js";
import { MongoDatabase, StatusType } from "vimcord";
import { createBot } from "./bot";

async function main() {
    const bot = createBot();
    bot.useEnv();

    if (bot.$devMode ? process.env.MONGO_URI_DEV : process.env.MONGO_URI) {
        await bot.useDatabase(new MongoDatabase(bot));
    }

    await bot.start(() => {
        bot.status.set({
            production: {
                activity: { name: "Check out our server!", type: ActivityType.Streaming, status: StatusType.Online }
            },
            development: {
                activity: { name: "Testing new features...", type: ActivityType.Custom, status: StatusType.DND }
            }
        });
    });
}

main().catch(console.error);
