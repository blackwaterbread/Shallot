import { TextChannel } from "discord.js";

export async function registerStanbyMessage(channel: TextChannel) {
    const message = await channel.send({ content: 'Embed를 생성 중입니다...' });
    return message;
}