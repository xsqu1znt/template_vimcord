import { ApplicationCommandType, InteractionContextType } from "discord.js";
import { ContextCommandBuilder } from "vimcord";

export default new ContextCommandBuilder({
    builder: builder =>
        builder.setName("User Info").setContexts(InteractionContextType.Guild).setType(ApplicationCommandType.User),

    metadata: { category: "General" },

    async execute(client, interaction) {
        const targetId = interaction.targetId;
        const guild = interaction.guild;

        const user = await client.fetchUser(targetId);
        if (!user) {
            return interaction.reply({ content: "User not found.", ephemeral: true });
        }

        const member = await guild?.members.fetch(targetId);
        if (!member) {
            return interaction.reply({ content: "Member not found.", ephemeral: true });
        }

        const joinDate = member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Unknown";
        const createdAt = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`;

        await interaction.reply({
            content: `**${user.username}**\nJoined: ${joinDate}\nCreated: ${createdAt}`
        });
    }
});
