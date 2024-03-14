import _ from 'lodash';
import { getInstances, savePresetHtml, saveInstances } from 'Config';
import { Client, Message, TextChannel } from 'discord.js';
import { channelTrack, instanceTrack, logError, logNormal } from './Log';
import { ServerQueries } from 'Server';
import { queryArma3 } from 'Server/Games/Arma3';
import { queryArmaResistance } from 'Server/Games/ArmaResistance';
import { getServerEmbed } from 'Discord/Embed';

export function taskRefresh(client: Client<true>) {
    const storage = getInstances();
    return Array.from(storage).map(async ([serverId, server]) => {
        const { instances } = server;
        const { cache } = client.channels;
        const channelId = server.channels.servers.channelId;
        const channel = await cache.get(channelId)?.fetch() as TextChannel;
        if (!channel) {
            return;
        }
        const textChannel = channel as TextChannel;
        return Array.from(instances).map(async ([instanceId, instance]) => {
            const trackLog = `${channelTrack(textChannel)}${instanceTrack(instance)}`;
            const { isPriority, messageId, game, connect, loadedContentHash } = instance;
            let message: Message<true> | undefined;
            let queries: ServerQueries;
            let embed;

            /* message exist check */
            try {
                if (_.isEmpty(messageId)) {
                    throw new Error();
                }
                message = await textChannel.messages.fetch(messageId);
                if (!message) throw new Error();
            }
            catch {
                instances.delete(instanceId);
                saveInstances();
                logNormal(`[Discord] 새로고침 실패: 메세지가 존재하지 않는 것 같음, 인스턴스 삭제: ${trackLog}`);
                return;
            }

            if (message) {
                switch (game) {
                    case 'arma3': {
                        queries = await queryArma3(connect);
                        if (queries && loadedContentHash !== queries.online?.tags.loadedContentHash) {
                            savePresetHtml(messageId, queries.online?.preset);
                            instance.loadedContentHash = queries.online?.tags.loadedContentHash ?? '';
                            saveInstances();
                        }
                        break;
                    }
                    /*
                    case 'armareforger': {
                        break;
                    }
                    */
                    case 'armaresistance': {
                        queries = await queryArmaResistance(connect);
                        break;
                    }
                    default: {
                        instances.delete(instanceId);
                        saveInstances();
                        logNormal(`[Discord] 새로고침 실패: 지원하지 않는 게임, 인스턴스 삭제: ${trackLog}`);
                        return;
                    }
                }

                embed = getServerEmbed(message.id, queries, instance, instance.memo);
                if (queries.online) {
                    instance.disconnectedFlag = 4;
                    instances.set(instanceId, {
                        ...instance,
                        players: queries.online.info.players.map((x: any) => ({
                            name: x.name
                        })),
                    });
                    await message.edit(embed as any);
                    logNormal(`[Discord] 새로고침 완료: ${trackLog}`);
                }
                else {
                    /* todo: if status not changed -> do not update embed (api call reduce) */
                    logNormal(`[Discord] 새로고침 실패: ${trackLog}`);
                    if (!isPriority && instance.disconnectedFlag === 0) {
                        instances.delete(instanceId);
                        await message.delete();
                        logNormal(`[Discord] 인스턴스 삭제: ${trackLog}`);
                        saveInstances();
                        return;
                    }
                    if (instance.disconnectedFlag > 0) instance.disconnectedFlag -= 1;
                    await message.edit(embed as any);
                }
            }
            else {
                instances.delete(instanceId);
                logError(`[Discord] 새로고침할 메세지 ID가 없습니다, 인스턴스를 삭제합니다: ${trackLog}`);
            }
            saveInstances();
        });
    });
}