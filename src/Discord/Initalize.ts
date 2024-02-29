import _ from "lodash";
import { ActivityType, Client, Guild, TextChannel } from "discord.js";
import { logNormal, logWarning } from "Lib/Log";
import Config, { savePresetHtml, saveStorage } from "Config";
import { queryArma3 } from "Server/Arma3";
import { getDeleteInteractionMessage, getNoticeMessage, getRegisterInteractionMessage, registerStanbyMessage } from "./Message";
import { getArma3ServerEmbed, getArmaResistanceServerEmbed } from "./Embed";
import { queryArmaResistance } from "Server/ArmaResistance";
import appJson from 'root/package.json';

export async function initBotPresence(client: Client<true>) {
    client.user.setPresence({
        activities: [{ name: `${appJson.name}/${Config.version}-beta`, type: ActivityType.Playing }],
        status: 'online',
    });
    logNormal('[Discord] 봇 상태 설정 완료');
}

export async function initRegisterInteractMessages(client: Client<true>) {
    const guilds = client.guilds.cache;
    const { storage: instances } = Config;
    if (_.isEmpty(instances)) {
        throw new Error('[App] 등록된 서버가 없습니다.');
    }
    // todo: to Promise.all task
    for (const [guildId, guild] of guilds) {
        const storage = instances.get(guildId);
        if (storage) {
            const { channelId, noticeMessageId, registerMessageId, deleteMessageId } = storage.channels.interaction;
            const channel = await client.channels.fetch(channelId) as TextChannel;
            if (_.isEmpty(noticeMessageId) || _.isUndefined(noticeMessageId)) {
                const form = getNoticeMessage();
                const message = await channel.send(form);
                storage.channels.interaction.noticeMessageId = message.id;
                saveStorage();
            }
            if (_.isEmpty(registerMessageId) || _.isUndefined(registerMessageId)) {
                const form = getRegisterInteractionMessage();
                const message = await channel.send(form);
                storage.channels.interaction.registerMessageId = message.id;
                saveStorage();
            }
            if (_.isEmpty(deleteMessageId) || _.isUndefined(deleteMessageId)) {
                const form = getDeleteInteractionMessage();
                const message = await channel.send(form);
                storage.channels.interaction.deleteMessageId = message.id;
                saveStorage();
            }
        }
    }
    logNormal('[Discord] Interaction 메세지 등록 완료');
}

export async function initPriorityInstances(client: Client<true>) {
    const guilds = client.guilds.cache;
    const { storage: instances } = Config;
    if (_.isEmpty(instances)) {
        throw new Error('[App] 등록된 서버가 없습니다.');
    }
    // todo: to Promise.all task
    for (const [guildId, guild] of guilds) {
        const storage = instances.get(guildId);
        if (storage) {
            const listChannelId = storage.channels.servers.channelId;
            const channel = await client.channels.fetch(listChannelId) as TextChannel;
            const priority = Array.from(storage.instances).filter(([k, v]) => v.isPriority === true);
            if (_.isEmpty(priority)) {
                return;
            }
            else {
                for (const [index, instance] of priority) {
                    if (_.isEmpty(instance.messageId) || _.isUndefined(instance.messageId)) {
                        let queries, embed;
                        switch (instance.game) {
                            case 'arma3': {
                                queries = await queryArma3(instance.connect);
                                embed = getArma3ServerEmbed(instance.messageId, instance.registeredUser, index, queries);
                                break;
                            }
                            case 'armareforger': {
                                break;
                            }
                            case 'armaresistance': {
                                queries = await queryArmaResistance(instance.connect);
                                embed = getArmaResistanceServerEmbed(instance.registeredUser, index, queries);
                                break;
                            }
                        }
                        const stanbyMessage = await registerStanbyMessage(channel);
                        const presetPath = savePresetHtml(stanbyMessage.id, queries?.preset);
                        await stanbyMessage.edit({
                            content: '',
                            embeds: [embed as any]
                        });
                        storage.instances.set(index, {
                            ...instance,
                            messageId: stanbyMessage.id,
                            presetPath: presetPath
                        });
                        saveStorage();
                    }
                    else {
                        continue;
                    }
                }
            }
        }
    }
    logNormal('[Discord] 우선순위 Embed 등록 완료');
}

export function checkUnregisteredServer(guild: Guild) {
    const { storage } = Config;
    if (!storage.get(guild.id)) {
        logWarning(`[App] ID가 등록되지 않은 서버가 있습니다: [${guild.id}|${guild.name}]`);
    }
}