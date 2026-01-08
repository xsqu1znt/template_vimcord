import { PrefixCommandBuilder } from "vimcord";

export default new PrefixCommandBuilder({
    name: "ping",
    description: "Check how fast the bot is right now. (less ms = faster)",
    metadata: { category: "General/App" },
    permissions: { guildOnly: true },

    async execute(client, message) {
        // Reply to the message
        return message.reply({ content: `Client: **${client.ws.ping}ms**`, allowedMentions: { repliedUser: false } });
    }
});
