import { InteractionContextType } from "discord.js";
import { SlashCommandBuilder } from "vimcord";

export default new SlashCommandBuilder({
    builder: builder =>
        builder
            .setName("ping")
            .setDescription("Check how fast the bot is right now. (less ms = faster)")
            .setContexts(InteractionContextType.Guild),

    metadata: { category: "General/App" },

    async execute(client, interaction) {
        // Reply to the interaction
        interaction.reply({ content: `Client: **${client.ws.ping}ms**` });
    }
});
