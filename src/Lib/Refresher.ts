import _ from 'lodash';
import { InstanceStorage, getInstances, saveInstances } from 'Config';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Client, Message, TextChannel } from 'discord.js';
import { channelTrack, instanceTrack, logError, logNormal } from './Log';
import { ServerQueries } from 'Server';
import { queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { queryArmaResistance } from 'Server/Games/ArmaResistance';
import { getServerInformationEmbed, getServerRconEmbed } from 'Discord/Embed';
import { queryArmaReforger } from 'Server/Games/ArmaReforger';

const scheduler = new ToadScheduler();
let task: AsyncTask | null = null;
let job: SimpleIntervalJob | null = null;

export function initRefresher(client: Client<true>) {
    task = new AsyncTask('serverRefresh', async () => taskRefresh(client));
    job = new SimpleIntervalJob({ seconds: 30, runImmediately: true }, task, { preventOverrun: true });
    scheduler.addSimpleIntervalJob(job);
}

export function stopRefresher() {
    job?.stop();
}

export function startRefresher() {
    job?.start();
}

function taskRefresh(client: Client<true>) {
    const storage = getInstances();
    return Array.from(storage).map(async ([serverId, server]) => {
        const { instances } = server;
        const listChannelId = server.channels.list.channelId;
        const rconChannelId = server.channels.rcon.channelId;

        const [listChannel, rconChannel] = await Promise.all([
            client.channels.cache.get(listChannelId)?.fetch(),
            client.channels.cache.get(rconChannelId)?.fetch()
        ]);

        if (!listChannel || !rconChannel) {
            return;
        }

        return Array.from(server.instances).map(async ([instanceId, instance]) => {
            const trackLog = `${channelTrack(listChannel)}${channelTrack(rconChannel)}${instanceTrack(instance)}`;
            const { type, connect, priority, discord, information, connection } = instance;

            let queries: ServerQueries;
            let statusEmbed, rconEmbed;
            let newInstance = { ...instance };

            try {
                const [statusMessage, rconMessage] = await Promise.all([
                    (listChannel as TextChannel).messages.fetch(discord.statusEmbedMessageId),
                    (rconChannel as TextChannel).messages.fetch(discord.rconEmbedMessageId)
                ]);

                switch (type) {
                    case 'arma3': {
                        queries = await queryArma3(connect);
                        if (information.addonsHash !== queries.online?.tags.loadedContentHash) {
                            savePresetHtml(discord.statusEmbedMessageId, queries.online?.preset);
                            newInstance.information.addonsHash = queries.online?.tags.loadedContentHash ?? '';
                        }
                        break;
                    }
                    case 'armareforger': {
                        queries = await queryArmaReforger(connect);
                        break;
                    }
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

                statusEmbed = getServerInformationEmbed(statusMessage.id, queries, instance, information.memo);
                rconEmbed = getServerRconEmbed(instanceId, instance);

                if (queries.online) {
                    newInstance = {
                        ...newInstance,
                        information: {
                            ...newInstance.information,
                            hostname: queries.online.info.name,
                            players: queries.online.info.players.map((x: any) => ({
                                name: x.name
                            })),
                        },
                        connection: {
                            status: true,
                            count: 4
                        }
                    }
                }

                else {
                    logNormal(`[Discord] 새로고침 실패: ${trackLog}`);
                    if (!priority && connection.count === 0) {
                        instances.delete(instanceId);
                        await statusMessage.delete();
                        await rconMessage.delete();
                        logNormal(`[Discord] 인스턴스 삭제: ${trackLog}`);
                        saveInstances();
                        return;
                    }
                    else if (connection.count > 0) {
                        newInstance = {
                            ...newInstance,
                            connection: {
                                status: false,
                                count: instance.connection.count -= 1
                            }
                        }
                    }
                }

                instances.set(instanceId, newInstance);
                saveInstances();
                await statusMessage.edit(statusEmbed as any);
                await rconMessage.edit(rconEmbed as any);
                logNormal(`[Discord] 새로고침 완료: ${trackLog}`);
            }

            catch (e) {
                instances.delete(instanceId);
                saveInstances();
                logNormal(`[Discord] 새로고침 실패: 메세지가 존재하지 않는 것 같음, 인스턴스 삭제: ${trackLog}`);
                logError(`[Discord] ${e}`);
                return;
            }
        });
    });
}