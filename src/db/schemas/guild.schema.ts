import { createMongoSchema } from "vimcord";

export interface IGuild {
    guildId: string;
    prefix: string | null;
    createdAt: number;
}

export const GuildSchema = createMongoSchema<IGuild>("Guilds", {
    guildId: { type: String, unique: true, required: true },
    prefix: { type: String, default: null },
    createdAt: { type: Number, default: Date.now }
});

GuildSchema.execute(() => {
    GuildSchema.schema.index({ guildId: 1, prefix: 1 }, { unique: true });
});
