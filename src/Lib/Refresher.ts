import _ from 'lodash';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Client, Message, TextChannel } from 'discord.js';
import { getServerStatusEmbed, getServerRconEmbed } from 'Discord/Embed';
import { getConfigs } from "Config";
import { AppStorage, getStorage, saveStorage } from 'Storage';
import { CommonServerQueries, ServerQueries } from 'Types';
import { Arma3ServerMod, Arma3ServerQueries, queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { ArmaResistanceServerQueries, queryArmaResistance } from 'Server/Games/ArmaResistance';
import { ArmaReforgerServerQueries, queryArmaReforger } from 'Server/Games/ArmaReforger';
import { channelTrack, instanceTrack, logError, logNormal, guildTrack } from './Log';

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
    let guildStorages: [string, AppStorage][];

    if (serverId) {
        const p = storage.get(serverId);
        if (p) {
            guildStorages = [[serverId, p]];
        }
        else {
            return;
        }
    }

    else {
        guildStorages = Array.from(storage);
    }

    let tasks = [];
    for (const guildId of storage.keys()) {
        for (const serverId of storage.get(guildId)!.servers.keys()) {
            tasks.push(serverRefresh({ guildId: guildId, serverId: serverId }))
        }
    }

    await Promise.all(tasks);
    logNormal('[Discord] serverRefreshEntire Complete');
}

export async function serverRefresh(target?: { guildId: string, serverId: string }) {
    if (target) {
        const storage = getStorage();
        const { guildId, serverId } = target;
        const guild = storage.get(guildId);

        if (!guild) {
            logError(`[App] serverRefresh: failed: Cannot get guild: ${guildId}`);
            return;
        }

        const { servers: serverStorage } = guild;
        const currentServer = serverStorage.get(serverId);

        if (!currentServer) {
            logError(`[App] serverRefresh: failed: Cannot get server: ${serverId}`);
            return;
        }

        if (currentServer.maintenance) {
            logNormal(`[App] serverRefresh: passed: in maintenance: ${serverId}`);
            return;
        }

        const trackLog = `${guildTrack(guildId)}${instanceTrack(currentServer)}`;
        const { type, connect, priority, discord, information, connection } = currentServer;

        let queries: CommonServerQueries;
        let newServer = { ...currentServer };

        switch (type) {
            case 'arma3': {
                queries = await queryArma3(connect);
                if (queries.online?.tags) {
                    if (information.addonsHash !== queries.online.tags.loadedContentHash) {
                        savePresetHtml(discord.statusEmbedMessageId, queries.online.preset);
                        newServer.information.addonsHash = queries.online.tags.loadedContentHash;
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

                logNormal(`[Discord] serverRefresh: failed: Unsupported type, delete server: ${trackLog}`);
                return;
            }
        }

        if (queries.online) {
            newServer = {
                ...newServer,
                information: {
                    ...newServer.information,
                    hostname: queries.online.info.name,
                    players: queries.online.info.players.map((x: any) => ({
                        name: x.name
                    })),
                    lastQueries: queries,
                },
                connection: {
                    status: 'connected',
                    count: 4
                }
            }

            logNormal(`[App] serverRefresh: Server responses: ${trackLog}`);
        }

        else {
            logNormal(`[Discord] serverRefresh: failed: Cannot connect server: ${trackLog}`);

            if (!priority && connection.count === 0) {
                const discordGuild = await client.guilds.cache.get(guildId)?.fetch();

                if (!discordGuild) {
                    return;
                }

                const { status, admin } = guild.channels;

                const listChannel = await discordGuild.channels.cache.get(status.channelId)?.fetch() as TextChannel;
                const rconChannel = await discordGuild.channels.cache.get(admin.channelId)?.fetch() as TextChannel;

                if (!listChannel || !rconChannel) {
                    logError(`[App|Discord] serverRefresh: There's no channel, delete server: [${status.channelId}|${admin.channelId}]${trackLog}`);
                    serverStorage.delete(serverId);
                    saveStorage();
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

                logNormal(`[Discord] serverRefresh: autodetele: ${trackLog}`);
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

        serverStorage.set(serverId, newServer);
        saveStorage();

        let flagRefresh = false;
        const curQueries = information.lastQueries.online;
        const newQueries = queries.online;

        if (!curQueries) {
            if (newQueries) {
                flagRefresh = true;
                logNormal(`[App|Discord] serverRefresh: DiffCheck: [Refreshed:ToOnline]: ${trackLog}`);
            }
        }

        else {
            if (!newQueries) {
                flagRefresh = true;
                logNormal(`[App|Discord] serverRefresh: DiffCheck: [Refresh:ToOffline]: ${trackLog}`);
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
                            logNormal(`[App|Discord] serverRefresh: DiffCheck: [Refreshed:Diff]: ${trackLog}`);
                        }

                        logNormal(`[App] serverRefresh: DiffCheck: Passed: ${trackLog}`);
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
                            logNormal(`[App|Discord] serverRefresh: DiffCheck: [Refreshed:Diff]: ${trackLog}`);
                        }

                        logNormal(`[App] serverRefresh: DiffCheck: Passed: ${trackLog}`);
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
                            logNormal(`[App|Discord] serverRefresh: DiffCheck: [Refreshed:Diff]: ${trackLog}`);
                        }

                        logNormal(`[App] serverRefresh: DiffCheck: Passed: ${trackLog}`);
                        break;
                    }

                    /* not going to happen
                    default: {
                        break;
                    }
                    */
                }
            }
        }

        if (flagRefresh) {
            await Promise.all([
                statusEmbedRefresh(guildId, serverId),
                rconEmbedRefresh(guildId, serverId)
            ]);
        }
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

                logNormal(`[Discord] embedRefreshEntire failed: There's no message, delete: ${trackLog}`);
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
        logError(`[App] statusEmbedRefresh: Cannot get guild: ${guildId}`);
        return;
    }

    const statusChannelId = guild.channels.status.channelId;
    const statusChannel = await client.channels.cache.get(statusChannelId)?.fetch();

    if (!statusChannel) {
        logError(`[App] statusEmbedRefresh: Cannot get channel: ${statusChannelId}`);
        return;
    }

    const server = guild.servers.get(serverId);

    if (!server) {
        logError(`[App] statusEmbedRefresh: Cannot get server: ${serverId}`);
        return;
    }

    if (server.maintenance) {
        logNormal(`[App] statusEmbedRefresh: passed: in maintenance: ${serverId}`);
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
        logError(`[Discord] statusEmbedRefresh: Error on fetching Message: ${e}`);
        throw new Error();
    }

    statusEmbed = getServerStatusEmbed(statusMessage.id, lastQueries, server, memo);
    await statusMessage.edit(statusEmbed);

    logNormal(`[Discord] statusEmbedRefresh Complete: ${trackLog}`);
}

export async function rconEmbedRefresh(guildId: string, serverId: string) {
    const storage = getStorage();
    const guild = storage.get(guildId);

    if (!guild) {
        logError(`[App] rconEmbedRefresh: Cannot get guild: ${guildId}`);
        return;
    }

    const adminChannelId = guild.channels.admin.channelId;
    const adminChannel = await client.channels.cache.get(adminChannelId)?.fetch();

    if (!adminChannel) {
        logError(`[App] statusEmbedRefresh: Cannot get channel: ${adminChannelId}`);
        return;
    }

    const server = guild.servers.get(serverId);

    if (!server) {
        logError(`[App] statusEmbedRefresh: Cannot get server: ${serverId}`);
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
        logError(`[Discord] rconEmbedRefresh: Error on fetching Message: ${e}`);
        throw new Error();
    }

    rconEmbed = getServerRconEmbed(serverId, server);
    await rconMessage.edit(rconEmbed as any);

    logNormal(`[Discord] rconEmbedRefresh Complete: ${trackLog}`);
}