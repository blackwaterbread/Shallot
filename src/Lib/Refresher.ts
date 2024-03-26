import _ from 'lodash';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Channel, Client, Message, TextChannel } from 'discord.js';
import { getServerInformationEmbed, getServerRconEmbed } from 'Discord/Embed';
import { ServerQueries } from 'Server';
import { queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { queryArmaResistance } from 'Server/Games/ArmaResistance';
import { queryArmaReforger } from 'Server/Games/ArmaReforger';
import { channelTrack, instanceTrack, logError, logNormal, serverTrack } from './Log';
import { BIServer, AppStorage, getConfigs, getStorage, saveStorage } from 'Config';
import { getRconSessions } from './Rcon';

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
    client = readyClient;

    localTask = new AsyncTask(localTaskName, async () => { await serverRefreshEntire() });
    localJob = new SimpleIntervalJob({ 
        seconds: configs.localRefreshInterval, 
        runImmediately: true 
    }, 
        localTask, 
    { 
        preventOverrun: true 
    });

    embedTask = new AsyncTask(embedTaskName, async () => { await embedRefreshEntire() });
    embedJob = new SimpleIntervalJob({ 
        seconds: configs.embedRefreshInterval, 
        runImmediately: true 
    }, 
        embedTask, 
    { 
        preventOverrun: true 
    });

    scheduler.addSimpleIntervalJob(localJob);
    scheduler.addSimpleIntervalJob(embedJob);

    client = readyClient;
}

export function stopRefresherEntire() {
    localJob?.stop();
    embedJob?.stop();
}

export function startRefresherEntire() {
    localJob?.start();
    embedJob?.start();
}

/*
export async function forcedServerRefresh(target?: { serverId: string, instanceId: string }) {
    if (target) {
        const storage = getStorage();
        const { serverId, instanceId } = target;
        const instance = storage.get(serverId)?.servers.get(instanceId);

        if (!instance) {
            logError('[App] forcedServerRefresh: 존재하지 않는 인스턴스입니다.')
            return;
        }

        const trackLog = `${instanceTrack(instance)}`;
        const { type, connect, priority, discord, information, connection } = instance;

        let queries: ServerQueries;
        let newInstance = { ...instance };

        code
    }

    else {
        localJob?.start();
    }
}

export async function forcedEmbedRefresh(instanceId?: string) {
    if (instanceId) {
        code
    }

    else {
        embedJob?.start();
    }
}

async function serverRefresh(serverId: string, instanceId: string) {
    const storage = getStorage();
    const instance = storage.get(serverId)?.servers.get(instanceId);
    code
}
*/

async function serverRefreshEntire(serverId?: string) {
    const storage = getStorage();
    let serverInstances: [string, AppStorage][];

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
        const { servers: instances } = server;
        return Array.from(server.servers).map(async ([instanceId, instance]) => {
            const trackLog = `${serverTrack(serverId)}${instanceTrack(instance)}`;
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
                    saveStorage();

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

                    const listChannel = await guild.channels.cache.get(server.channels.status.channelId)?.fetch() as TextChannel;
                    const rconChannel = await guild.channels.cache.get(server.channels.admin.channelId)?.fetch() as TextChannel;

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
                    saveStorage();

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
            saveStorage();

        });
    });

    logNormal('[Discord] Local Refresh 완료');
    await Promise.all(tasks);
}

async function embedRefreshEntire() {
    const storage = getStorage();
    const tasks = Array.from(storage).map(async ([serverId, server]) => {
        const { servers: instances } = server;
        const listChannelId = server.channels.status.channelId;
        const rconChannelId = server.channels.admin.channelId;

        const [listChannel, rconChannel] = await Promise.all([
            client.channels.cache.get(listChannelId)?.fetch(),
            client.channels.cache.get(rconChannelId)?.fetch()
        ]);

        if (!listChannel || !rconChannel) {
            return;
        }

        return Array.from(server.servers).map(async ([instanceId, instance]) => {
            const trackLog = `${channelTrack(listChannel)}${channelTrack(rconChannel)}${instanceTrack(instance)}`;

            try {
                Promise.all([
                    statusEmbedRefresh(listChannel, instanceId, instance),
                    rconEmbedRefresh(rconChannel, instanceId, instance)
                ]);
            }

            catch (e) {
                instances.delete(instanceId);
                saveStorage();

                logNormal(`[Discord] Embed Refresh 실패: 메세지가 존재하지 않는 것 같음, 인스턴스 삭제: ${trackLog}`);

                return;
            }
        });
    });

    await Promise.all(tasks);
}

async function statusEmbedRefresh(listChannel: Channel, instanceId: string, instance: BIServer) {
    const trackLog = `${channelTrack(listChannel)}${instanceTrack(instance)}`;
    const { discord, information } = instance;
    const { memo, lastQueries } = information;
    let statusEmbed;
    let statusMessage: Message<true> | null = null;

    try {
        statusMessage = await (listChannel as TextChannel).messages.fetch(discord.statusEmbedMessageId);
    }

    catch (e) {
        throw new Error(`[Discord] statusEmbedRefresh: Error on fetching Message: ${e}`);
    }

    statusEmbed = getServerInformationEmbed(statusMessage.id, lastQueries, instance, memo);
    await statusMessage.edit(statusEmbed as any);

    logNormal(`[Discord] statusEmbedRefresh 완료: ${trackLog}`);
}

async function rconEmbedRefresh(rconChannel: Channel, instanceId: string, instance: BIServer) {
    const rconSessions = getRconSessions();
    const trackLog = `${channelTrack(rconChannel)}${instanceTrack(instance)}`;
    const { discord } = instance;
    let rconEmbed;
    let rconMessage: Message<true> | null = null;

    try {
        rconMessage = await (rconChannel as TextChannel).messages.fetch(discord.rconEmbedMessageId);
    }

    catch (e) {
        throw new Error(`[Discord] rconEmbedRefresh: Error on fetching Message: ${e}`);
    }

    rconEmbed = getServerRconEmbed(instanceId, instance, rconSessions.get(instanceId));
    await rconMessage.edit(rconEmbed as any);

    logNormal(`[Discord] rconEmbedRefresh 완료: ${trackLog}`);
}