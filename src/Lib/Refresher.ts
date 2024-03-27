import _ from 'lodash';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Client, TextChannel } from 'discord.js';
import { getServerInformationEmbed, getServerRconEmbed } from 'Discord/Embed';
import { ServerQueries } from 'Server';
import { queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { queryArmaResistance } from 'Server/Games/ArmaResistance';
import { queryArmaReforger } from 'Server/Games/ArmaReforger';
import { channelTrack, instanceTrack, logError, logNormal } from './Log';
import { InstanceStorage, getConfigs, getInstances, saveInstances } from 'Config';

let client: Client<true>;

const scheduler = new ToadScheduler();

const localTaskName = 'localTask';
const embedTaskName = 'embedTask';

let localTask: AsyncTask | null = null;
let embedTask: AsyncTask | null = null;
let localJob: SimpleIntervalJob | null = null;
let embedJob: SimpleIntervalJob | null = null;

export function initRefresher(readyClient: Client<true>) {
    const configs = getConfigs();

    localTask = new AsyncTask(localTaskName, async () => { await serverRefresh() });
    localJob = new SimpleIntervalJob({ 
        seconds: configs.localRefreshInterval, 
        runImmediately: true 
    }, 
        localTask, 
    { 
        preventOverrun: true 
    });

    embedTask = new AsyncTask(embedTaskName, async () => { await embedRefresh(readyClient) });
    embedJob = new SimpleIntervalJob({ 
        seconds: configs.embedRefreshInterval, 
        runImmediately: false 
    }, 
        embedTask, 
    { 
        preventOverrun: true 
    });

    scheduler.addSimpleIntervalJob(localJob);
    scheduler.addSimpleIntervalJob(embedJob);

    client = readyClient;
}

export function stopRefresher() {
    localJob?.stop();
    embedJob?.stop();
}

export function startRefresher() {
    localJob?.start();
    embedJob?.start();
}

export function forcedLocalRefresh() {
    localJob?.start();
}

export function forcedEmbedRefresh() {
    embedJob?.start();
}

async function serverRefresh(serverId?: string) {
    const storage = getInstances();
    let serverInstances: [string, InstanceStorage][];

    if (serverId) {
        const p = storage.get(serverId);
        if (p) {
            serverInstances = [[serverId, p]];
        }
        else {
            return;
        }
    }

    else {
        serverInstances = Array.from(storage);
    }

    const tasks = serverInstances.map(async ([serverId, server]) => {
        const { instances } = server;
        return Array.from(server.instances).map(async ([instanceId, instance]) => {
            const trackLog = `${instanceTrack(instance)}`;
            const { type, connect, priority, discord, information, connection } = instance;

            let queries: ServerQueries;
            let newInstance = { ...instance };

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

                    logNormal(`[Discord] Local Refresh 실패: 지원하지 않는 게임, 인스턴스 삭제: ${trackLog}`);
                    return;
                }
            }

            if (queries.online) {
                newInstance = {
                    ...newInstance,
                    information: {
                        ...newInstance.information,
                        hostname: queries.online.info.name,
                        players: queries.online.info.players.map((x: any) => ({
                            name: x.name
                        })),
                        lastQueries: queries,
                    },
                    connection: {
                        status: true,
                        count: 4
                    }
                }

                logNormal(`[Discord] 서버 응답함: ${trackLog}`);
            }

            else {
                newInstance = {
                    ...newInstance,
                    information: {
                        ...newInstance.information,
                        lastQueries: queries,
                    }
                }

                logNormal(`[Discord] 서버 연결 실패: ${trackLog}`);

                if (!priority && connection.count === 0) {
                    const guild = await client.guilds.cache.get(serverId)?.fetch();

                    if (!guild) {
                        logError(`[Discord] Local Refresh: 서버 ID를 찾을 수 없습니다.`);
                        return;
                    }

                    const listChannel = await guild.channels.cache.get(server.channels.list.channelId)?.fetch() as TextChannel;
                    const rconChannel = await guild.channels.cache.get(server.channels.rcon.channelId)?.fetch() as TextChannel;

                    if (!listChannel || !rconChannel) {
                        logError('[App|Discord] Local Refresh: 채널이 존재하지 않습니다.');
                        return;
                    }

                    const [statusMessage, rconMessage] = await Promise.all([
                        listChannel.messages.fetch(instance.discord.statusEmbedMessageId),
                        rconChannel.messages.fetch(instance.discord.rconEmbedMessageId)
                    ]);

                    await Promise.all([
                        statusMessage.delete(),
                        rconMessage.delete()
                    ]);

                    instances.delete(instanceId);
                    saveInstances();

                    logNormal(`[Discord] Local Refresh: 자동 삭제: 인스턴스 삭제: ${trackLog}`);
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

        });
    });

    logNormal('[Discord] Local Refresh 완료');
    await Promise.all(tasks);
}

async function embedRefresh(client: Client<true>) {
    const storage = getInstances();
    const tasks = Array.from(storage).map(async ([serverId, server]) => {
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
            const { discord, information } = instance;
            const { memo, lastQueries } = information;
            let statusEmbed, rconEmbed;

            try {
                const [statusMessage, rconMessage] = await Promise.all([
                    (listChannel as TextChannel).messages.fetch(discord.statusEmbedMessageId),
                    (rconChannel as TextChannel).messages.fetch(discord.rconEmbedMessageId)
                ]);

                statusEmbed = getServerInformationEmbed(statusMessage.id, lastQueries, instance, memo);
                rconEmbed = getServerRconEmbed(instanceId, instance);

                await statusMessage.edit(statusEmbed as any);
                await rconMessage.edit(rconEmbed as any);

                logNormal(`[Discord] Embed Refresh 완료: ${trackLog}`);
            }

            catch (e) {
                instances.delete(instanceId);
                saveInstances();

                logNormal(`[Discord] Embed Refresh 실패: 메세지가 존재하지 않는 것 같음, 인스턴스 삭제: ${trackLog}`);
                logError(`[Discord] ${e}`);

                return;
            }
        });
    });

    await Promise.all(tasks);
}