import { TextChannel } from "discord.js";
import { getStringTable } from "Language";

const StringTable = getStringTable();

export async function registerStanbyMessage(channel: TextChannel) {
    const message = await channel.send({ content: StringTable.message.stanbyEmbed.content });
    return message;
}