import { setInterval, setTimeout } from "timers";
import { Client, Message, TextChannel } from "discord.js";
import Config, { Instance, savePresetHtml, saveStorage } from "Config";
import { channelTrack, instanceTrack, logError, logNormal } from "./Log";
import { registerArma3ServerEmbed, registerArmaResistanceServerEmbed } from "Discord/Embed";
import { queryArma3 } from "Server/Arma3";
import { queryArmaResistance } from "Server/ArmaResistance";

const INTERVAL = 15000;

async function handleRefresh(listChannel: TextChannel, instance: Instance, instanceId: string, instanceStorage: Map<string, Instance>) {
    let message: Message<true> | undefined;
    const trackLog = `${channelTrack(listChannel)}${instanceTrack(instance)}`;

    /* message exist check */
    try {
        message = await listChannel.messages.fetch(instance.messageId);
    }
    catch {
        logNormal(`[Discord] 새로고침 실패: 메세지가 존재하지 않는 것 같음 ${trackLog}`);
        instanceStorage.delete(instanceId);
        saveStorage();
        logNormal(`[Discord] 인스턴스 삭제: ${trackLog}`);
    }

    if (message) {
        let queries;
        switch (instance.game) {
            case 'arma3': {
                queries = await queryArma3(instance.connection);
                if (queries && instance.loadedContentHash !== queries.tags.loadedContentHash) {
                    savePresetHtml(instance.messageId, queries.preset);
                    instance.loadedContentHash = queries.tags.loadedContentHash;
                    saveStorage();
                }
                else if (!instance.isPriority) {
                    instance.disconnectedFlag -= 1;
                }
                await registerArma3ServerEmbed(message, instance.registeredUser, instanceId, queries, instance.memo);
                instanceStorage.set(instanceId, {
                    ...instance,
                    players: queries?.info.players.map((x: any) => ({
                        name: x.name, 
                        score: x.raw.score,
                        time: x.raw.time
                    })),
                })
                break;
            }
            case 'armareforger': {
                break;
            }
            case 'armaresistance': {
                queries = await queryArmaResistance(instance.connection);
                if (!queries) if (!instance.isPriority) instance.disconnectedFlag -= 1;
                await registerArmaResistanceServerEmbed(message, instance.registeredUser, instanceId, queries, instance.memo);
                instanceStorage.set(instanceId, {
                    ...instance,
                    players: queries?.info.players.map((x: any) => ({
                        name: x.name
                    })) as any,
                })
                break;
            }
        }

        if (queries) {
            logNormal(`[Discord] 새로고침 완료: ${trackLog}`);
        }
        else {
            logNormal(`[Discord] 새로고침 실패: ${trackLog}`);
            if (!instance.isPriority && instance.disconnectedFlag < 0) {
                instanceStorage.delete(instanceId);
                await message.delete();
                saveStorage();
                logNormal(`[Discord] 인스턴스 삭제: ${trackLog}`);
            }
        }
    }
    else {
        instanceStorage.delete(instanceId);
        logError(`[Discord] 새로고침할 메세지 ID가 없습니다, 인스턴스를 삭제합니다: ${trackLog}`);
    }
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
    // private timeoutInit: NodeJS.Timeout;
    private timeoutRefresh?: NodeJS.Timeout;
    constructor(client: Client<true>) {
        this.timeoutRefresh = setInterval(async () => {
            await tasksRefresh(client);
        }, INTERVAL);
        // this.timeoutInit = setTimeout(() => {
        //     var self = this;
        //     self.timeoutRefresh = setInterval(async () => {
        //         await ppp(client);
        //     }, INTERVAL);
        // }, INTERVAL);
    }
}

export default Refresher;