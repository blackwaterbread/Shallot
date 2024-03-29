import _ from "lodash";
import { ActivityType, Client, Guild, TextChannel } from "discord.js";
import { logNormal, logWarning } from "Lib/Log";
import { getConfigs, saveConfigs, getInstances, saveInstances, getAppInfo } from "Config";
import { getNoticeMessage, getRegisterInteractionMessage, getDeleteInteractionMessage } from "./Message";
import revision from 'child_process';

export async function initBotPresence(client: Client<true>) {
    const app = getAppInfo();
    const commitHash = revision
        .execSync('git rev-parse HEAD')
        .toString().trim().substring(0, 7);

    const version = app.isDevelopment ? `develop/${commitHash}` : `v${app.version}/${commitHash}`;

    client.user.setPresence({
        activities: [{ name: version, type: ActivityType.Playing }],
        status: 'online',
    });

    logNormal('[Discord] 봇 상태 설정 완료');
}

export async function initRegisterInteractMessages(client: Client<true>) {
    const guilds = await client.guilds.fetch();
    const configs = getConfigs();
    const instances = getInstances();
    if (_.isEmpty(instances)) {
        throw new Error('[App] 등록된 서버가 없습니다.');
    }
    for (const [guildId, guild] of guilds) {
        const server = instances.get(guildId);
        if (server) {
            const { channelId, noticeMessageId, registerMessageId, deleteMessageId } = server.channels.interaction;
            const channel = await client.channels.fetch(channelId) as TextChannel;
            if (configs.refresh) {
                logNormal('[App|Discord] Interaction Message를 업데이트합니다.');
                const [noticeMessage, registerMessage, deleteMessage] = await Promise.all([
                    channel.messages.fetch(noticeMessageId),
                    channel.messages.fetch(registerMessageId),
                    channel.messages.fetch(deleteMessageId)
                ]);
                await Promise.all(
                    [
                        noticeMessage.edit({ ...getNoticeMessage() }),
                        registerMessage.edit({ ...getRegisterInteractionMessage() }),
                        deleteMessage.edit({ ...getDeleteInteractionMessage() })
                    ]
                );
                continue;
            }
            if (_.isEmpty(noticeMessageId) || _.isUndefined(noticeMessageId)) {
                const form = getNoticeMessage();
                const message = await channel.send(form);
                server.channels.interaction.noticeMessageId = message.id;
                saveInstances();
            }
            if (_.isEmpty(registerMessageId) || _.isUndefined(registerMessageId)) {
                const form = getRegisterInteractionMessage();
                const message = await channel.send(form);
                server.channels.interaction.registerMessageId = message.id;
                saveInstances();
            }
            if (_.isEmpty(deleteMessageId) || _.isUndefined(deleteMessageId)) {
                const form = getDeleteInteractionMessage();
                const message = await channel.send(form);
                server.channels.interaction.deleteMessageId = message.id;
                saveInstances();
            }
        }
    }
    configs.refresh = false;
    saveConfigs();
    logNormal('[Discord] Interaction 메세지 등록 완료');
}

export function checkUnregisteredServer(guild: Guild) {
    const storage = getInstances();
    if (!storage.get(guild.id)) {
        logWarning(`[App] ID가 등록되지 않은 서버가 있습니다: [${guild.id}|${guild.name}]`);
    }
}