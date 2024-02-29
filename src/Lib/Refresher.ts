import _ from "lodash";
import { setInterval } from "timers";
import { Client, Message, TextChannel } from "discord.js";
import Config, { Instance, savePresetHtml, saveStorage } from "Config";
import { channelTrack, instanceTrack, logError, logNormal } from "./Log";
import { getArma3ServerEmbed, getArmaResistanceServerEmbed } from "Discord/Embed";
import { queryArma3 } from "Server/Arma3";
import { queryArmaResistance } from "Server/ArmaResistance";

const INTERVAL = 15000;

async function handleRefresh(listChannel: TextChannel, instance: Instance, instanceId: string, instanceStorage: Map<string, Instance>) {
    const trackLog = `${channelTrack(listChannel)}${instanceTrack(instance)}`;
    const { isPriority, registeredUser, messageId, game, connect, loadedContentHash } = instance;
    let message: Message<true> | undefined;
    let queries, embed;

    /* message exist check */
    try {
        if (_.isEmpty(messageId)) {
            throw new Error();
        }
        message = await listChannel.messages.fetch(messageId);
        if (!message) throw new Error();
    }
    catch {
        instanceStorage.delete(instanceId);
        saveStorage();
        logNormal(`[Discord] 새로고침 실패: 메세지가 존재하지 않는 것 같음, 인스턴스 삭제: ${trackLog}`);
        return;
    }

    if (message) {
        switch (game) {
            case 'arma3': {
                queries = await queryArma3(connect);
                if (queries && loadedContentHash !== queries.tags.loadedContentHash) {
                    savePresetHtml(messageId, queries.preset);
                    instance.loadedContentHash = queries.tags.loadedContentHash;
                    saveStorage();
                }
                embed = getArma3ServerEmbed(message.id, registeredUser, instanceId, queries, instance.memo);
                break;
            }
            case 'armareforger': {
                break;
            }
            case 'armaresistance': {
                queries = await queryArmaResistance(connect);
                embed = getArmaResistanceServerEmbed(registeredUser, instanceId, queries, instance.memo);
                break;
            }
        }

        if (queries) {
            instance.disconnectedFlag = 4;
            instanceStorage.set(instanceId, {
                ...instance,
                players: queries?.info.players.map((x: any) => ({
                    name: x.name
                })),
            });
            await message.edit(embed as any);
            logNormal(`[Discord] 새로고침 완료: ${trackLog}`);
        }
        else {
            if (!isPriority) instance.disconnectedFlag -= 1;
            logNormal(`[Discord] 새로고침 실패: ${trackLog}`);
            await message.edit(embed as any);
            if (!isPriority && instance.disconnectedFlag < 0) {
                instanceStorage.delete(instanceId);
                await message.delete();
                logNormal(`[Discord] 인스턴스 삭제: ${trackLog}`);
            }
        }
    }
    else {
        instanceStorage.delete(instanceId);
        logError(`[Discord] 새로고침할 메세지 ID가 없습니다, 인스턴스를 삭제합니다: ${trackLog}`);
    }
    saveStorage();
}

async function tasksRefresh(client: Client<true>) {
    const storageArray = Array.from(Config.storage);
    return storageArray.map(async ([serverId, instanceStorage]) => {
        const { channelId } = instanceStorage.channels.servers;
        const { instances } = instanceStorage;
        const listChannel = await client.channels.fetch(channelId) as TextChannel;
        const p = Array.from(instances);
        const tasks = p.map(([userId, instance]) => handleRefresh(listChannel, instance, userId, instances));
        return Promise.all(tasks);
    });
}

class Refresher {
    /* todo: request balancing */
    private timeoutRefresh?: NodeJS.Timeout;
    constructor(client: Client<true>) {
        this.timeoutRefresh = setInterval(async () => {
            await tasksRefresh(client);
        }, INTERVAL);
    }
}

export default Refresher;