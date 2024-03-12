import _ from "lodash";
import { ActivityType, Client, Guild, TextChannel } from "discord.js";
import { logNormal, logWarning } from "Lib/Log";
import Config, { getStorage, saveStorage } from "Config";
import { getNoticeMessage, getRegisterInteractionMessage, getDeleteInteractionMessage } from "./Message";
import appJson from 'Root/package.json';

export async function initBotPresence(client: Client<true>) {
    client.user.setPresence({
        activities: [{ name: `${appJson.name}/${Config.version}-beta`, type: ActivityType.Playing }],
        status: 'online',
    });
    logNormal('[Discord] 봇 상태 설정 완료');
}

export async function initRegisterInteractMessages(client: Client<true>) {
    const guilds = client.guilds.cache;
    const storage = getStorage();
    if (_.isEmpty(storage)) {
        throw new Error('[App] 등록된 서버가 없습니다.');
    }
    for (const [guildId, guild] of guilds) {
        const server = storage.get(guildId);
        if (server) {
            const { channelId, noticeMessageId, registerMessageId, deleteMessageId } = server.channels.interaction;
            const channel = await client.channels.fetch(channelId) as TextChannel;
            if (_.isEmpty(noticeMessageId) || _.isUndefined(noticeMessageId)) {
                const form = getNoticeMessage();
                const message = await channel.send(form);
                server.channels.interaction.noticeMessageId = message.id;
                saveStorage();
            }
            if (_.isEmpty(registerMessageId) || _.isUndefined(registerMessageId)) {
                const form = getRegisterInteractionMessage();
                const message = await channel.send(form);
                server.channels.interaction.registerMessageId = message.id;
                saveStorage();
            }
            if (_.isEmpty(deleteMessageId) || _.isUndefined(deleteMessageId)) {
                const form = getDeleteInteractionMessage();
                const message = await channel.send(form);
                server.channels.interaction.deleteMessageId = message.id;
                saveStorage();
            }
        }
    }
    logNormal('[Discord] Interaction 메세지 등록 완료');
}

export function checkUnregisteredServer(guild: Guild) {
    const storage = getStorage();
    if (!storage.get(guild.id)) {
        logWarning(`[App] ID가 등록되지 않은 서버가 있습니다: [${guild.id}|${guild.name}]`);
    }
}