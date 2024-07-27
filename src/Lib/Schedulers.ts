import _ from 'lodash';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Client, Message, TextChannel } from 'discord.js';
import { getServerStatusEmbed, getServerAdminEmbed, getRankingEmbed } from 'Discord/Embed';
import { getConfigs } from "Config";
import { AppStorage, BIServer, getRanking, getStorage, saveRanking, saveStorage } from 'Storage';
import { CommonServerQueries } from 'Types';
import { Arma3ServerQueries, queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { ArmaResistanceServerQueries, queryArmaResistance } from 'Server/Games/ArmaResistance';
import { ArmaReforgerServerQueries, queryArmaReforger } from 'Server/Games/ArmaReforger';
import { channelTrack, instanceTrack, logError, logNormal, guildTrack } from './Log';
import { Socket as RconSocket, Connection as RconConnection } from '@senfo/battleye';

let client: Client<true>;
// let rcon: RconSocket = new RconSocket();
let connections: Map<string, RconConnection> = new Map();

const Scheduler = new ToadScheduler();
const Storage = getStorage();
const Ranking = getRanking();

const REFRESH_SERVER_TASKNAME = 'REFRESH_SERVER_TASKNAME';
const REFRESH_EMBED_TASKNAME = 'REFRESH_EMBED_TASKNAME';
const REFRESH_RANKING_TASKNAME = 'REFRESH_RANKING_TASKNAME';

let refreshServerTask: AsyncTask | null = null;
let refreshServerJob: SimpleIntervalJob | null = null;
let refreshEmbedTask: AsyncTask | null = null;
let refreshEmbedJob: SimpleIntervalJob | null = null;
let refreshRankingTask: AsyncTask | null = null;
let refreshRankingJob: SimpleIntervalJob | null = null;

export function initDiscordClient(readyClient: Client<true>) {
    client = readyClient;
}

export function initServerRefresher() {
    const configs = getConfigs();

    refreshServerTask = new AsyncTask(REFRESH_SERVER_TASKNAME, async () => { await refreshServerEntire() });
    refreshServerJob = new SimpleIntervalJob(
        {
            seconds: configs.localRefreshInterval,
            runImmediately: true
        },
        refreshServerTask,
        {
            preventOverrun: true
        }
    );

    refreshEmbedTask = new AsyncTask(REFRESH_EMBED_TASKNAME, async () => { await refreshEmbedEntire() });
    refreshEmbedJob = new SimpleIntervalJob(
        {
            seconds: configs.embedRefreshInterval,
            runImmediately: true
        },
        refreshEmbedTask,
        {
            preventOverrun: true
        }
    );

    refreshRankingTask = new AsyncTask(REFRESH_RANKING_TASKNAME, async () => { await refreshRanking() });
    refreshRankingJob = new SimpleIntervalJob(
        {
            seconds: configs.rankingRefreshInterval,
            runImmediately: false
        },
        refreshRankingTask,
        {
            preventOverrun: true
        }
    );

    Scheduler.addSimpleIntervalJob(refreshServerJob);
    Scheduler.addSimpleIntervalJob(refreshEmbedJob);
    Scheduler.addSimpleIntervalJob(refreshRankingJob);
}

export function initRankingRefresher() {
    for (const guildId of Storage.keys()) {
        for (const serverId of Storage.get(guildId)!.servers.keys()) {
            const server = Storage.get(guildId)!.servers.get(serverId)!;
            if (server.priority && server.rcon) {
                try {
                    addRankingConnection({ 
                        id: serverId, 
                        host: server.connect.host, 
                        rconPort: server.rcon.port, 
                        rconPassword: server.rcon.password 
                    });
                }

                catch (e) {
                    logError(`[App|Rcon] initRankingRefresher Error: ${e}`);
                }
            }
        }
    }
}

export function addRankingConnection(server: { id: string, host: string, rconPort: number, rconPassword: string }) {
    try {
        const socket = new RconSocket();
        const conn = socket.connection(
            { 
                name: server.id,
                ip: server.host,
                port: server.rconPort,
                password: server.rconPassword
            },
            {
                reconnect: true,
                reconnectTimeout: 60000,
                keepAlive: true,
                keepAliveInterval: 15000
            }
        );

        socket.on('error', (e) => {
            logNormal(`[App|Rcon] Rcon Socket Error: ${conn.ip}:${conn.port}|${e.name}:${e.message}`, true);
        });

        conn.on('connected', () => {
            logNormal(`[App|Rcon] Rcon connected: ${conn.ip}:${conn.port}`);
        });

        conn.on('command', (data) => {
            logNormal(`[App|Rcon] Rcon command: ${conn.ip}:${conn.port}|${data}`, true);
        });

        conn.on('error', (e) => {
            logNormal(`[App|Rcon] Rcon Error: ${conn.ip}:${conn.port}|${e.name}:${e.message}`, true);
        });

        connections.set(server.id, conn);
    }

    catch (e) {
        logError(`[App|Rcon] addRankingConnection Error: ${server.host}:${server.rconPort}|${e}`);
    }
}

export async function refreshRanking() {
    for (const guildId of Storage.keys()) {
        for (const serverId of Storage.get(guildId)!.servers.keys()) {
            const conn = connections.get(serverId);
            const hasRanking = Ranking.has(serverId);

            if (conn && conn.connected && hasRanking) {
                try {
                    const command = await conn.command('Players');
                    if (!command.data) return;

                    const players = command.data.split('\n').slice(3);
                    for (let i = 0; i < players.length - 1; i++) {
                        /**
                         * [0] - #
                         * [1] - IP:Port
                         * [2] - Ping
                         * [3] - GUID(OK)
                         * [4] - Name
                         * [5]? - (Lobby)
                         */
                        const rows = players[i].split(' ').filter(x => !_.isEmpty(x));
                        const guid = rows[3].replace('(OK)', '').replace('(?)', '');

                        if (rows.length === 6 && rows[rows.length] === '(Lobby)') continue;
                        if (guid.length !== 32) continue;
                        if (rows[1].split(':')[0] === '127.0.0.1' && rows[4] === 'headlessclient') continue;

                        const name = rows.slice(4).join();
                        const serverRanking = Ranking.get(serverId)!;
                        const currentPlaytime = serverRanking.get(guid)?.playtime ?? 0;

                        serverRanking.set(guid, {
                            name: name,
                            playtime: currentPlaytime + 15
                        });
                    }

                    saveRanking();
                    logNormal(`[App|Rcon] refreshRanking Complete`, true);
                }

                catch (e) {
                    logError(`[App|Rcon] refreshRanking: Error: ${e}`);
                    return;
                }
            }
        }
    }
}

export function stopRefresherEntire() {
    refreshServerJob?.stop();
    refreshEmbedJob?.stop();
    refreshRankingJob?.stop();
}

export function startRefresherEntire() {
    refreshServerJob?.start();
    refreshEmbedJob?.start();
    refreshRankingJob?.start();
}

async function refreshServerEntire(serverId?: string) {
    let guildStorages: [string, AppStorage][];

    if (serverId) {
        const p = Storage.get(serverId);
        if (p) {
            guildStorages = [[serverId, p]];
        }
        else {
            return;
        }
    }

    else {
        guildStorages = Array.from(Storage);
    }

    let tasks = [];
    for (const guildId of Storage.keys()) {
        for (const serverId of Storage.get(guildId)!.servers.keys()) {
            tasks.push(refreshServer({ guildId: guildId, serverId: serverId }))
        }
    }

    await Promise.all(tasks);
    logNormal('[Discord] refreshServerEntire Complete', true);
}

export async function refreshServer(server?: { guildId: string, serverId: string }) {
    if (server) {
        const { guildId, serverId } = server;
        const guild = Storage.get(guildId);

        if (!guild) {
            logError(`[App] refreshServer: failed: Cannot get guild: ${guildId}`);
            return;
        }

        const { servers: serverStorage } = guild;
        const currentServer = serverStorage.get(serverId);

        if (!currentServer) {
            logError(`[App] refreshServer: failed: Cannot get server: ${serverId}`);
            return;
        }

        if (currentServer.maintenance) {
            logNormal(`[App] refreshServer: passed: in maintenance: ${serverId}`, true);
            return;
        }

        const trackLog = `${guildTrack(guildId)}${instanceTrack(currentServer)}`;
        const { type, connect, priority, discord, information, connection } = currentServer;

        let queries: CommonServerQueries;
        let newServer = { ...currentServer };

        switch (type) {
            case 'arma3': {
                queries = await queryArma3(connect);
                if (queries.query?.tags) {
                    const newAddonsHash = queries.query.tags.loadedContentHash;
                    if (information.addonsHash !== newAddonsHash) {
                        await Promise.all([
                            savePresetHtml(`${currentServer.nonce}-${newAddonsHash}-p`, queries.query.preset.purchased),
                            savePresetHtml(`${currentServer.nonce}-${newAddonsHash}-c`, queries.query.preset.compatibility)
                        ]);

                        newServer.information.addonsHash = newAddonsHash;
                        logNormal(`[App|Discord] refreshServer: DiffCheck: [HashChanged]: ${trackLog}`);
                    }
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

                logNormal(`[Discord] refreshServer: failed: Unsupported type, delete server: ${trackLog}`);
                return;
            }
        }

        if (queries.query) {
            newServer = {
                ...newServer,
                information: {
                    ...newServer.information,
                    hostname: queries.query.info.name,
                    players: queries.query.info.players.map((x: any) => ({
                        name: x.name
                    })),
                    lastQueries: queries,
                },
                connection: {
                    status: 'connected',
                    count: 4
                }
            }

            logNormal(`[App] refreshServer: Server responses: ${trackLog}`, true);
        }

        else {
            logNormal(`[Discord] refreshServer: failed: Cannot connect server: ${trackLog}`, true);

            if (!priority && connection.count === 0) {
                const discordGuild = await client.guilds.cache.get(guildId)?.fetch();

                if (!discordGuild) {
                    return;
                }

                const { status, admin } = guild.channels;

                const listChannel = await discordGuild.channels.cache.get(status.channelId)?.fetch() as TextChannel;
                const rconChannel = await discordGuild.channels.cache.get(admin.channelId)?.fetch() as TextChannel;

                if (!listChannel || !rconChannel) {
                    logError(`[App|Discord] refreshServer: There's no channel, delete server: [${status.channelId}|${admin.channelId}]${trackLog}`);
                    serverStorage.delete(serverId);
                    saveStorage();
                    return;
                }

                const [statusMessage, rconMessage] = await Promise.all([
                    listChannel.messages.fetch(discord.statusEmbedMessageId),
                    rconChannel.messages.fetch(discord.adminEmbedMessageId)
                ]);

                await Promise.all([
                    statusMessage.delete(),
                    rconMessage.delete()
                ]);

                serverStorage.delete(serverId);
                saveStorage();

                logNormal(`[Discord] refreshServer: autodetele: ${trackLog}`);
                return;
            }

            if (connection.count <= 0) {
                newServer = {
                    ...newServer,
                    connection: {
                        ...newServer.connection,
                        status: 'disconnected',
                    },
                    information: {
                        ...newServer.information,
                        lastQueries: queries,
                    }
                }
            }

            else if (connection.count > 0) {
                newServer = {
                    ...newServer,
                    connection: {
                        status: 'losing',
                        count: newServer.connection.count -= 1
                    }
                }
            }
        }

        if (serverStorage.has(serverId)) {
            serverStorage.set(serverId, newServer);
            saveStorage();
        }

        let flagRefresh = false;
        const curQueries = information.lastQueries.query;
        const newQueries = queries.query;

        if (!curQueries) {
            if (newQueries) {
                flagRefresh = true;
                logNormal(`[App|Discord] refreshServer: DiffCheck: [Refreshed:ToOnline]: ${trackLog}`);
            }
        }

        else {
            if (!newQueries) {
                flagRefresh = true;
                logNormal(`[App|Discord] refreshServer: DiffCheck: [Refresh:ToOffline]: ${trackLog}`);
            }

            else {
                switch (type) {
                    case 'arma3': {
                        const { info: curInfo, tags: curTags } = curQueries as Arma3ServerQueries;
                        const { info: newInfo, tags: newTags } = newQueries as Arma3ServerQueries;

                        /* implementing CDLC deep comparison logic is too cumbersome, so pass right now */
                        const none = 'None';
                        const curCDLCs = curTags.mods ? Object.entries(curTags.mods) : none;
                        const newCDLCs = curTags.mods ? Object.entries(newTags.mods) : none;

                        if (
                            curTags.serverState !== newTags.serverState ||
                            curInfo.map !== newInfo.map ||
                            curInfo.version !== newInfo.version ||
                            curInfo.numplayers !== newInfo.numplayers ||
                            curInfo.maxplayers !== newInfo.maxplayers ||
                            curCDLCs.length !== newCDLCs.length
                            // pass memo
                        ) {
                            flagRefresh = true;
                            logNormal(`[App|Discord] refreshServer: DiffCheck: [Refreshed:Diff]: ${trackLog}`);
                        }

                        break;
                    }

                    case 'armareforger': {
                        const { info: curInfo } = curQueries as ArmaReforgerServerQueries;
                        const { info: newInfo } = newQueries as ArmaReforgerServerQueries;

                        if (
                            curInfo.map !== newInfo.map ||
                            curInfo.version !== newInfo.version ||
                            curInfo.numplayers !== newInfo.numplayers ||
                            curInfo.maxplayers !== newInfo.maxplayers
                            // pass memo
                        ) {
                            flagRefresh = true;
                            logNormal(`[App|Discord] refreshServer: DiffCheck: [Refreshed:Diff]: ${trackLog}`);
                        }

                        break;
                    }

                    case 'armaresistance': {
                        const { info: curInfo } = curQueries as ArmaResistanceServerQueries;
                        const { info: newInfo } = newQueries as ArmaResistanceServerQueries;

                        if (
                            curInfo.raw.mod !== newInfo.raw.mod ||
                            curInfo.raw.gamemode !== newInfo.raw.gamemode ||
                            curInfo.map !== newInfo.map ||
                            curInfo.numplayers !== newInfo.numplayers ||
                            curInfo.maxplayers !== newInfo.maxplayers
                            // pass memo
                        ) {
                            flagRefresh = true;
                            logNormal(`[App|Discord] refreshServer: DiffCheck: [Refreshed:Diff]: ${trackLog}`);
                        }

                        break;
                    }

                    /* not going to happen
                    default: {
                        break;
                    }
                    */
                }

                logNormal(`[App] refreshServer: DiffCheck: Passed: ${trackLog}`, true);
            }
        }

        if (flagRefresh) {
            await Promise.all([
                refreshStatusEmbed(guildId, serverId),
                refreshAdminEmbed(guildId, serverId)
            ]);
        }
    }

    else {
        refreshServerJob?.start();
    }
}

async function refreshEmbedEntire() {
    const tasks = Array.from(Storage).map(async ([guildId, guildStorage]) => {
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
                    refreshStatusEmbed(guildId, serverId),
                    refreshAdminEmbed(guildId, serverId)
                ]);
            }

            catch (e) {
                servers.delete(serverId);
                saveStorage();

                logNormal(`[Discord] refreshEmbedEntire failed: There's no message, delete: ${trackLog}`);
                return;
            }
        });
    });

    await Promise.all(tasks);
}

export async function refreshStatusEmbed(guildId: string, serverId: string) {
    const guild = Storage.get(guildId);

    if (!guild) {
        logError(`[App] refreshStatusEmbed: Cannot get guild: ${guildId}`);
        return;
    }

    const statusChannelId = guild.channels.status.channelId;
    const statusChannel = await client.channels.cache.get(statusChannelId)?.fetch();

    if (!statusChannel) {
        logError(`[App] refreshStatusEmbed: Cannot get channel: ${statusChannelId}`);
        return;
    }

    const server = guild.servers.get(serverId);

    if (!server) {
        logError(`[App] refreshStatusEmbed: Cannot get server: ${serverId}`);
        return;
    }

    if (server.maintenance) {
        logNormal(`[App] refreshStatusEmbed: passed: in maintenance: ${serverId}`, true);
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
        logError(`[Discord] refreshStatusEmbed: Error on fetching Message: ${e}`);
        throw new Error();
    }

    statusEmbed = getServerStatusEmbed(lastQueries, server, memo);
    await statusMessage.edit(statusEmbed);

    logNormal(`[Discord] refreshStatusEmbed Complete: ${trackLog}`, true);
}

export async function refreshAdminEmbed(guildId: string, serverId: string) {
    const guild = Storage.get(guildId);

    if (!guild) {
        logError(`[App] refreshAdminEmbed: Cannot get guild: ${guildId}`);
        return;
    }

    const adminChannelId = guild.channels.admin.channelId;
    const adminChannel = await client.channels.cache.get(adminChannelId)?.fetch();

    if (!adminChannel) {
        logError(`[App] refreshAdminEmbed: Cannot get channel: ${adminChannelId}`);
        return;
    }

    const server = guild.servers.get(serverId);

    if (!server) {
        logError(`[App] refreshAdminEmbed: Cannot get server: ${serverId}`);
        return;
    }

    const trackLog = `${channelTrack(adminChannel)}${instanceTrack(server)}`;
    const { discord } = server;

    let rconEmbed;
    let rconMessage: Message<true> | null = null;

    try {
        rconMessage = await (adminChannel as TextChannel).messages.fetch(discord.adminEmbedMessageId);
    }

    catch (e) {
        logError(`[Discord] refreshAdminEmbed: Error on fetching Message: ${e}`);
        throw new Error();
    }

    rconEmbed = getServerAdminEmbed(serverId, server);
    await rconMessage.edit(rconEmbed as any);

    logNormal(`[Discord] refreshAdminEmbed Complete: ${trackLog}`, true);
}

export async function refreshRankingEmbed(guildId: string, serverId: string) {
    const guild = Storage.get(guildId);

    if (!guild) {
        logError(`[App] refreshRankingEmbed: Cannot get guild: ${guildId}`);
        return;
    }

    const rankingChannelId = guild.channels.ranking.channelId;
    const rankingMessageId = guild.channels.ranking.rankingMessageId;
    const rankingChannel = await client.channels.cache.get(rankingChannelId)?.fetch();

    if (!rankingChannel) {
        logError(`[App] refreshRankingEmbed: Cannot get channel: ${rankingChannelId}`);
        return;
    }

    const server = guild.servers.get(serverId);
    const ranks = Ranking.get(serverId);

    if (!ranks || !server) {
        logError(`[App] refreshRankingEmbed: Cannot get ranking or server: ${serverId}`);
        return;
    }

    const trackLog = `${channelTrack(rankingChannel)}`;

    let rankingEmbed;
    let rankingMessage: Message<true> | null = null;

    try {
        rankingMessage = await (rankingChannel as TextChannel).messages.fetch(rankingMessageId);
    }

    catch (e) {
        logError(`[Discord] refreshRankingEmbed: Error on fetching Message: ${e}`);
        throw new Error();
    }

    rankingEmbed = getRankingEmbed({ server: server, ranking: Array.from(ranks.values()) });
    await rankingMessage.edit(rankingEmbed as any);

    logNormal(`[Discord] refreshAdminEmbed Complete: ${trackLog}`, true);
}