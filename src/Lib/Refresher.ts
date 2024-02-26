import { setInterval, setTimeout } from "timers";
import { Client, TextChannel } from "discord.js";
import Config, { Instance, savePresetHtml, saveStorage } from "Config";
import { channelTrack, instanceTrack, logError, logNormal } from "./Log";
import { registerArma3ServerEmbed, registerArmaResistanceServerEmbed } from "Discord/Embed";
import { queryArma3 } from "Server/Arma3";
import { queryArmaResistance } from "Server/ArmaResistance";

const INTERVAL = 15000;

async function handleRefresh(listChannel: TextChannel, instance: Instance, instanceId: string, instanceStorage: Map<string, Instance>, isPriority: boolean) {
    const trackLog = `${channelTrack(listChannel)}${instanceTrack(instance)}`;
    const message = await listChannel.messages.fetch(instance.messageId);
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
                else if (!isPriority) {
                    instance.disconnectedFlag -= 1;
                }
                await registerArma3ServerEmbed(message, queries, instance.user, instance.memo);
                break;
            }
            case 'armareforger': {
                break;
            }
            case 'armaresistance': {
                queries = await queryArmaResistance(instance.connection);
                if (!queries) if (!isPriority) instance.disconnectedFlag -= 1;
                await registerArmaResistanceServerEmbed(message, queries, instance.user, instance.memo);
                break;
            }
        }

        if (queries) {
            logNormal(`[Discord] 새로고침 완료: ${trackLog}`);
        }
        else {
            logNormal(`[Discord] 새로고침 실패: ${trackLog}`);
            if (!isPriority && instance.disconnectedFlag < 0) {
                instanceStorage.delete(instanceId);
                await message.delete();
                saveStorage();
                logNormal(`[Discord] 인스턴스 자동 삭제: ${trackLog}`);
            }
        }
    }
    else {
        instanceStorage.delete(instanceId);
        logError(`[Discord] 새로고침할 메세지 ID가 없습니다, 인스턴스를 삭제합니다: ${trackLog}`);
    }
}

class Refresher {
    /* todo: request balancing */
    private timeoutInit: NodeJS.Timeout;
    private timeoutRefresh?: NodeJS.Timeout;
    constructor(client: Client<true>) {
        this.timeoutInit = setTimeout(() => {
            var self = this;
            self.timeoutRefresh = setInterval(async () => {
                await Promise.all(
                    Array.from(Config.storage)
                        .map(async ([serverId, instanceStorage]) => {
                            const { channelId } = instanceStorage.channels.servers;
                            const { priority, normal } = instanceStorage.instances;
                            const listChannel = await client.channels.fetch(channelId) as TextChannel;
                            await Promise.all(Array.from(priority).map(([userId, instance]) => handleRefresh(listChannel, instance, userId, priority, true)));
                            await Promise.all(Array.from(normal).map(([userId, instance]) => handleRefresh(listChannel, instance, userId, normal, false)));
                        }
                    )
                );
            }, INTERVAL);
        }, INTERVAL);
    }
}

export default Refresher;