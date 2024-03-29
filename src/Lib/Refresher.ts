import _ from 'lodash';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Channel, Client, Message, TextChannel } from 'discord.js';
import { getServerInformationEmbed, getServerRconEmbed } from 'Discord/Embed';
import { ServerQueries } from 'Server';
import { queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { queryArmaResistance } from 'Server/Games/ArmaResistance';
import { queryArmaReforger } from 'Server/Games/ArmaReforger';
import { channelTrack, instanceTrack, logError, logNormal, guildTrack } from './Log';
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

async function serverRefreshEntire(serverId?: string) {
    const storage = getStorage();
    let guildInstances: [string, AppStorage][];

    if (serverId) {
        const p = storage.get(serverId);
        if (p) {
            guildInstances = [[serverId, p]];
        }
        else {
            return;
        }
    }

    else {
        guildInstances = Array.from(storage);
    }

    let tasks = [];
    for (const guildId of storage.keys()) {
        for (const serverId of storage.get(guildId)!.servers.keys()) {
            tasks.push(serverRefresh({ guildId: guildId, serverId: serverId }))
        }
    }

    await Promise.all(tasks);
    logNormal('[Discord] serverRefreshEntire 완료');
}

export async function serverRefresh(target?: { guildId: string, serverId: string }) {
    if (target) {
        const storage = getStorage();
        const { guildId, serverId } = target;
        const guild = storage.get(guildId);

        if (!guild) {
            logError('[App] forcedServerRefresh: 존재하지 않는 디스코드 서버입니다.');
            return;
        }

        const { servers: serverStorage } = guild;
        const server = serverStorage.get(serverId);

        if (!server) {
            logError('[App] serverRefresh: 존재하지 않는 서버입니다.');
            return;
        }

        const trackLog = `${guildTrack(guildId)}${instanceTrack(server)}`;
        const { type, connect, priority, discord, information, connection } = server;

        let queries: ServerQueries;
        let newInstance = { ...server };

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
                serverStorage.delete(serverId);
                saveStorage();

                logNormal(`[Discord] serverRefresh 실패: 지원하지 않는 게임, 인스턴스 삭제: ${trackLog}`);
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

            logNormal(`[App] serverRefresh: 서버 응답함: ${trackLog}`);
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
                const discordGuild = await client.guilds.cache.get(guildId)?.fetch();

                if (!discordGuild) {
                    logError(`[Discord] serverRefresh: 서버 ID를 찾을 수 없습니다.`);
                    return;
                }

                const listChannel = await discordGuild.channels.cache.get(guild.channels.status.channelId)?.fetch() as TextChannel;
                const rconChannel = await discordGuild.channels.cache.get(guild.channels.admin.channelId)?.fetch() as TextChannel;

                if (!listChannel || !rconChannel) {
                    logError('[App|Discord] serverRefresh: 채널이 존재하지 않습니다.');
                    return;
                }

                const [statusMessage, rconMessage] = await Promise.all([
                    listChannel.messages.fetch(discord.statusEmbedMessageId),
                    rconChannel.messages.fetch(discord.rconEmbedMessageId)
                ]);

                await Promise.all([
                    statusMessage.delete(),
                    rconMessage.delete()
                ]);

                serverStorage.delete(serverId);
                saveStorage();

                logNormal(`[Discord] serverRefresh: 자동 삭제: 인스턴스 삭제: ${trackLog}`);
                return;
            }

            else if (connection.count > 0) {
                newInstance = {
                    ...newInstance,
                    connection: {
                        status: false,
                        count: newInstance.connection.count -= 1
                    }
                }
            }
        }

        serverStorage.set(serverId, newInstance);
        saveStorage();

        logNormal(`[Discord] serverRefresh 완료 ${trackLog}`);
    }

    else {
        localJob?.start();
    }
}

async function embedRefreshEntire() {
    const storage = getStorage();
    const tasks = Array.from(storage).map(async ([guildId, guildStorage]) => {
        const { servers } = guildStorage;
        const listChannelId = guildStorage.channels.status.channelId;
        const rconChannelId = guildStorage.channels.admin.channelId;

        const [listChannel, rconChannel] = await Promise.all([
            client.channels.cache.get(listChannelId)?.fetch(),
            client.channels.cache.get(rconChannelId)?.fetch()
        ]);

        if (!listChannel || !rconChannel) {
            return;
        }

        return Array.from(guildStorage.servers).map(async ([serverId, server]) => {
            const trackLog = `${channelTrack(listChannel)}${channelTrack(rconChannel)}${instanceTrack(server)}`;

            try {
                Promise.all([
                    statusEmbedRefresh(guildId, serverId),
                    rconEmbedRefresh(guildId, serverId)
                ]);
            }

            catch (e) {
                servers.delete(serverId);
                saveStorage();

                logNormal(`[Discord] Embed Refresh 실패: 메세지가 존재하지 않는 것 같음, 인스턴스 삭제: ${trackLog}`);
                return;
            }
        });
    });

    await Promise.all(tasks);
}

export async function statusEmbedRefresh(guildId: string, serverId: string) {
    const storage = getStorage();
    const guild = storage.get(guildId);

    if (!guild) {
        logError('[App] statusEmbedRefresh: 존재하지 않는 디스코드 서버입니다.');
        return;
    }

    const statusChannelId = guild.channels.status.channelId;
    const statusChannel = await client.channels.cache.get(statusChannelId)?.fetch();

    if (!statusChannel) {
        logError('[App] statusEmbedRefresh: 존재하지 않는 채널입니다.');
        return;
    }

    const server = guild.servers.get(serverId);

    if (!server) {
        logError('[App] statusEmbedRefresh: 존재하지 않는 인스턴스입니다.');
        return;
    }

    const trackLog = `${channelTrack(statusChannel)}${instanceTrack(server)}`;
    const { discord, information } = server;
    const { memo, lastQueries } = information;

    let statusEmbed;
    let statusMessage: Message<true> | null = null;

    try {
        statusMessage = await (statusChannel as TextChannel).messages.fetch(discord.statusEmbedMessageId);
    }

    catch (e) {
        throw new Error(`[Discord] statusEmbedRefresh: Error on fetching Message: ${e}`);
    }

    statusEmbed = getServerInformationEmbed(statusMessage.id, lastQueries, server, memo);
    await statusMessage.edit(statusEmbed as any);

    logNormal(`[Discord] statusEmbedRefresh 완료: ${trackLog}`);
}

export async function rconEmbedRefresh(guildId: string, serverId: string) {
    const storage = getStorage();
    const guild = storage.get(guildId);

    if (!guild) {
        logError('[App] rconEmbedRefresh: 존재하지 않는 디스코드 서버입니다.');
        return;
    }

    const adminChannelId = guild.channels.admin.channelId;
    const adminChannel = await client.channels.cache.get(adminChannelId)?.fetch();

    if (!adminChannel) {
        logError('[App] rconEmbedRefresh: 존재하지 않는 채널입니다.');
        return;
    }

    const server = guild.servers.get(serverId);

    if (!server) {
        logError('[App] rconEmbedRefresh: 존재하지 않는 인스턴스입니다.');
        return;
    }

    const trackLog = `${channelTrack(adminChannel)}${instanceTrack(server)}`;
    const { discord } = server;

    let rconEmbed;
    let rconMessage: Message<true> | null = null;

    try {
        rconMessage = await (adminChannel as TextChannel).messages.fetch(discord.rconEmbedMessageId);
    }

    catch (e) {
        throw new Error(`[Discord] rconEmbedRefresh: Error on fetching Message: ${e}`);
    }

    rconEmbed = getServerRconEmbed(serverId, server);
    await rconMessage.edit(rconEmbed as any);

    logNormal(`[Discord] rconEmbedRefresh 완료: ${trackLog}`);
}