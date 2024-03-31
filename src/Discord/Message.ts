import { TextChannel } from "discord.js";
import { getStringTable } from "Language";

const lang = getStringTable();

export async function registerStanbyMessage(channel: TextChannel) {
    const message = await channel.send({ content: lang.message.stanbyEmbed.content });
    return message;
}