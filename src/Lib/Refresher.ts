import _ from 'lodash';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { Client, Message, TextChannel } from 'discord.js';
import { getServerStatusEmbed, getServerRconEmbed } from 'Discord/Embed';
import { getConfigs } from "Config";
import { AppStorage, getStorage, saveStorage } from 'Storage';
import { ServerQueries } from 'Types';
import { queryArma3, savePresetHtml } from 'Server/Games/Arma3';
import { queryArmaResistance } from 'Server/Games/ArmaResistance';
import { queryArmaReforger } from 'Server/Games/ArmaReforger';
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
        const server = serverStorage.get(serverId);

        if (!server) {
            logError(`[App] serverRefresh: failed: Cannot get server: ${serverId}`);
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

                logNormal(`[Discord] serverRefresh: failed: Unsupported type, delete server: ${trackLog}`);
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

            logNormal(`[App] serverRefresh: Server responses: ${trackLog}`);
        }

        else {
            newInstance = {
                ...newInstance,
                information: {
                    ...newInstance.information,
                    lastQueries: queries,
                }
            }

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

        logNormal(`[Discord] serverRefresh Complete: ${trackLog}`);
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
    await statusMessage.edit(statusEmbed as any);

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