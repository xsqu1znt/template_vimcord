import { ApplicationCommandType, InteractionContextType, MessageContextMenuCommandInteraction } from "discord.js";
import { BetterModal, ContextCommandBuilder } from "vimcord";

export default new ContextCommandBuilder({
    builder: builder =>
        builder.setName("Reply").setContexts(InteractionContextType.Guild).setType(ApplicationCommandType.Message),

    permissions: { botStaffOnly: true },

    async execute(client, interaction) {
        const targetMessage = await interaction.channel?.messages.fetch(interaction.targetId);
        if (!targetMessage) return;

        const modal = new BetterModal({
            title: "Reply",
            components: [{ textInput: { custom_id: "messageContent", label: "Message", required: true } }]
        });

        const modalResult = await modal.showAndAwait(interaction as MessageContextMenuCommandInteraction, {
            autoDefer: true
        });
        if (!modalResult) return;

        const content = modalResult.getField("messageContent", true);
        if (!content) return;

        await targetMessage.reply({ content });
        return modalResult.followUp({ content: "Message sent!", flags: "Ephemeral" });
    }
});
