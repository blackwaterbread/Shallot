import _ from "lodash";
import {
    PermissionFlagsBits,
    ApplicationCommandOptionType,
    ChatInputApplicationCommandData,
    CommandInteraction,
    ApplicationCommandType,
    Client,
    Interaction,
    TextChannel,
    Guild
} from "discord.js";
import { AppStorage, BIServer, getStorage, saveStorage } from "Storage";
import { logError, logNormal, guildTrack, userTrack } from "Lib/Log";
import { getServerDeleteInteractionEmbed, getNoticeEmbed, getServerRegisterInteractionEmbed, getMaintenanceEmbed, getServerStatusEmbed } from "./Embed";
import { uid2guid } from "Lib/Utils";
import { startRconSession } from "Server/Rcon";
import { getStringTable } from "Language";

const lang = getStringTable();

type SlashCommand = ChatInputApplicationCommandData & {
    execute: (interaction: CommandInteraction) => void;
}

async function assertGuild(interaction: CommandInteraction) {
    const { guild } = interaction;
    if (!guild) {
        await interaction.followUp({
            content: lang.commands.assertGuild.noGuild,
            ephemeral: true
        });
        return;
    }
    else {
        return guild;
    }
}

async function assertGuildStorage(interaction: CommandInteraction, storage: Map<string, AppStorage>, guild: Guild) {
    const serverStorage = storage.get(guild.id);

    if (!serverStorage) {
        await interaction.followUp({
            content: lang.commands.assertGuildStorage.noGuild,
            ephemeral: true
        });
        return;
    }

    return serverStorage;
}

async function assertServer(interaction: CommandInteraction, guildStorage: AppStorage, serverId: string) {
    const server = guildStorage.servers.get(serverId);

    if (!server) {
        await interaction.followUp({
            content: lang.commands.assertServer.noServer,
            ephemeral: true
        });
        return;
    }

    if (!server.rcon) {
        await interaction.followUp({
            content: lang.commands.assertServer.noRcon,
            ephemeral: true
        });
        return;
    }

    return server;
}

const commands: Array<SlashCommand> = [
    {
        type: ApplicationCommandType.ChatInput,
        name: 'initalize',
        description: lang.commands.setChannels.description,
        options: [
            {
                name: 'interaction_channel_id',
                description: lang.commands.initalize.options.descriptionInteractionChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'status_channel_id',
                description: lang.commands.initalize.options.descriptionStatusChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'admin_channel_id',
                description: lang.commands.initalize.options.descriptionAdminChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const guild = await assertGuild(interaction);
            if (!guild) return;

            const interactionChannelId = (interaction.options.get('interaction_channel_id')?.value || '') as string;
            const statusChannelId = (interaction.options.get('status_channel_id')?.value || '') as string;
            const adminChannelId = (interaction.options.get('admin_channel_id')?.value || '') as string;

            const [interactionChannel, statusChannel, adminChannel] = await Promise.all([
                guild.channels.fetch(interactionChannelId),
                guild.channels.fetch(statusChannelId),
                guild.channels.fetch(adminChannelId)
            ]);

            if (!interactionChannel || !statusChannel || !adminChannel) {
                await interaction.followUp({
                    content: `${lang.commands.registerMessages.noChannel}`,
                    ephemeral: true
                });
                return;
            }

            const noticeMessage = await (interactionChannel as TextChannel).send(getNoticeEmbed());
            const interactionMessage = await (interactionChannel as TextChannel).send(getServerRegisterInteractionEmbed());
            const deleteMessage = await (interactionChannel as TextChannel).send(getServerDeleteInteractionEmbed());

            storage.set(guild.id, {
                channels: {
                    interaction: {
                        channelId: interactionChannelId,
                        noticeMessageId: noticeMessage.id,
                        registerMessageId: interactionMessage.id,
                        deleteMessageId: deleteMessage.id
                    },
                    status: {
                        channelId: statusChannelId
                    },
                    admin: {
                        channelId: adminChannelId
                    }
                },
                servers: new Map()
            });

            saveStorage();

            await interaction.followUp({
                content: lang.commands.initalize.success,
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'set_channels',
        description: lang.commands.setChannels.description,
        options: [
            {
                name: 'interaction_channel_id',
                description: lang.commands.setChannels.options.descriptionInteractionChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'status_channel_id',
                description: lang.commands.setChannels.options.descriptionStatusChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'admin_channel_id',
                description: lang.commands.setChannels.options.descriptionAdminChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const interactionChannelId = (interaction.options.get('interaction_channel_id')?.value || '') as string;
            const statusChannelId = (interaction.options.get('status_channel_id')?.value || '') as string;
            const adminChannelId = (interaction.options.get('admin_channel_id')?.value || '') as string;

            storage.set(guild.id, {
                ...guildStorage,
                channels: {
                    interaction: {
                        channelId: interactionChannelId,
                        noticeMessageId: '',
                        registerMessageId: '',
                        deleteMessageId: ''
                    },
                    status: {
                        channelId: statusChannelId
                    },
                    admin: {
                        channelId: adminChannelId
                    }
                },
                servers: new Map()
            });

            saveStorage();

            await interaction.followUp({
                content: lang.commands.setChannels.success,
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'register_interaction_messages',
        description: lang.commands.registerMessages.description,
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const { channelId } = guildStorage.channels.interaction;
            const channel = await guild.channels.fetch(channelId) as TextChannel;

            if (!channel) {
                await interaction.followUp({
                    content: `${lang.commands.registerMessages.noChannel}: ${channelId}`,
                    ephemeral: true
                });
                return;
            }

            const newStorage = { ...guildStorage }

            const noticeMessage = await channel.send(getNoticeEmbed());
            const interactionMessage = await channel.send(getServerRegisterInteractionEmbed());
            const deleteMessage = await channel.send(getServerDeleteInteractionEmbed());

            newStorage.channels.interaction.noticeMessageId = noticeMessage.id;
            newStorage.channels.interaction.registerMessageId = interactionMessage.id;
            newStorage.channels.interaction.deleteMessageId = deleteMessage.id;

            storage.set(guild.id, newStorage);
            saveStorage();

            await interaction.followUp({
                content: lang.commands.registerMessages.success,
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'servers',
        description: lang.commands.servers.description,
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();

            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const lists = Array.from(guildStorage.servers).map(([key, server]) => {
                const { type, rcon, priority, information } = server;
                return `${key} | [${type},rcon:${rcon ? 'enabled' : 'disabled'},priority:${priority},${information.hostname},${information.memo}]`;
            });

            await interaction.followUp({
                content: lists.join('\n'),
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'clear_servers',
        description: lang.commands.cleanServers.description,
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();

            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const { status, admin } = guildStorage.channels;
            const tasks = Array.from(guildStorage.servers).map(async ([instanceId, instance]) => {
                try {
                    const listChannel = await guild.channels.cache.get(status.channelId)?.fetch() as TextChannel;
                    const rconChannel = await guild.channels.cache.get(admin.channelId)?.fetch() as TextChannel;

                    if (!listChannel || !rconChannel) {
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
                }

                catch (e) {
                    logError(`[Discord] clear_servers: ${e}`);
                }
            });

            await Promise.all(tasks);

            storage.set(guild.id, {
                ...guildStorage,
                servers: new Map()
            });

            saveStorage();

            await interaction.followUp({
                content: lang.commands.cleanServers.success,
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'uid2guid',
        description: lang.commands.uid2guid.description,
        options: [
            {
                name: 'steamid',
                description: lang.commands.uid2guid.options.descriptionSteamID,
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const steamid = (interaction.options.get('steamid')?.value || '');
            try {
                if (typeof steamid === 'number' || typeof steamid === 'boolean') throw new Error();
                const guid = uid2guid(steamid);
                await interaction.followUp({
                    content: `GUID: ${guid}, SteamID: ${steamid}`,
                    ephemeral: true
                });
            }

            catch {
                await interaction.followUp({
                    content: lang.commands.uid2guid.uncatchedError,
                    ephemeral: true
                });
            }
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon',
        description: lang.commands.rcon.description,
        options: [
            {
                name: 'server_id',
                description: lang.commands.rcon.options.descriptionServerID,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'command',
                description: lang.commands.rcon.options.descriptionCommand,
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();

            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const serverId = (interaction.options.get('server_id')?.value || '');
            const command = (interaction.options.get('command')?.value || '');
            const server = await assertServer(interaction, guildStorage, serverId as string);
            if (!server) return;

            try {
                const connection = await startRconSession(server.connect.host, server.rcon!.port, server.rcon!.password);
                const query = await connection.command(command as string);

                logNormal(`[App] RCon Accessed: ${command} ${guildTrack(guild.id)}${userTrack(interaction.user)}`);

                await interaction.followUp({
                    content: query.data ?? lang.commands.rcon.blankDataReceived,
                    ephemeral: true
                });
            }

            catch (e) {
                logError(`[App|Discord] Command: rcon ${command}: ${e}`);
                await interaction.followUp({
                    content: lang.commands.rcon.uncatchedError,
                    ephemeral: true
                });
            }
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'set_maintenance',
        description: lang.commands.maintenance.description,
        options: [
            {
                name: 'server_id',
                description: lang.commands.maintenance.options.descriptionServerID, // id or 'all'
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'set',
                description: lang.commands.maintenance.options.descriptionActivation,
                type: ApplicationCommandOptionType.Boolean,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();

            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            let target: [string, BIServer][];
            const serverId = (interaction.options.get('server_id')?.value || '');
            const set = (interaction.options.get('set')?.value ?? false);

            if (serverId === 'all') {
                target = Array.from(guildStorage.servers);
            }

            else {
                const server = guildStorage.servers.get(serverId as string);
                if (server) {
                    target = [[serverId as string, server]];
                }

                else {
                    await interaction.followUp({
                        content: lang.commands.maintenance.noServer,
                        ephemeral: true
                    });
                    return;
                }
            }

            const { status } = guildStorage.channels;
            const tasks = target.map(async ([key, server]) => {
                try {
                    const listChannel = await guild.channels.cache.get(status.channelId)?.fetch() as TextChannel;

                    if (!listChannel) {
                        return;
                    }

                    const statusMessage = await listChannel.messages.fetch(server.discord.statusEmbedMessageId);

                    guildStorage.servers.set(key, {
                        ...server,
                        maintenance: set as boolean
                    });

                    if (set) return statusMessage.edit(getMaintenanceEmbed(key, server));
                    else return statusMessage.edit(getServerStatusEmbed(statusMessage.id, server.information.lastQueries, server));
                }

                catch (e) {
                    logError(`[Discord] set_maintenance: ${e}`);
                }
            });

            await Promise.all(tasks);
            saveStorage();

            await interaction.followUp({
                content: lang.commands.maintenance.success,
                ephemeral: true
            });
        }
    },
    /*
    {
        type: ApplicationCommandType.ChatInput,
        name: 'initalize',
        description: Lang.commands.initalize.description,
        options: [
            {
                name: 'interaction_channel_id',
                description: Lang.commands.initalize.options.descriptionInteractionChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'status_channel_id',
                description: Lang.commands.initalize.options.descriptionStatusChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'admin_channel_id',
                description: Lang.commands.initalize.options.descriptionAdminChannelId,
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const interactionChannelId = (interaction.options.get('interaction_channel_id')?.value || '') as string;
            const statusChannelId = (interaction.options.get('status_channel_id')?.value || '') as string;
            const adminChannelId = (interaction.options.get('admin_channel_id')?.value || '') as string;

            checkChannelsExist();

            storage.set(guild.id, {
                channels: {
                    interaction: {
                        channelId: interactionChannelId,
                        noticeMessageId: noticeId,
                        registerMessageId: regId,
                        deleteMessageId: delId
                    },
                    status: {
                        channelId: statusChannelId
                    },
                    admin: {
                        channelId: adminChannelId
                    }
                },
                servers: new Map()
            });

            saveStorage();

            await interaction.followUp({
                content: Lang.commands.initalize.success,
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'set_language',
        description: Lang.commands.setLanguage.description,
        options: [
            {
                name: 'lang',
                description: Lang.commands.setLanguage.options.descriptionLang,
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = await assertGuildStorage(interaction, storage, guild);
            if (!guildStorage) return;

            const lang = (interaction.options.get('lang')?.value || '') as string;

            try {
                getStringTable(lang as keyof typeof StringTable);

                storage.set(guild.id, {
                    ...guildStorage,
                    preferences: {
                        langauge: lang as keyof typeof Lang,
                    }
                });

                saveStorage();

                await interaction.followUp({
                    content: Lang.commands.setLanguage.success,
                    ephemeral: true
                });
            }

            catch (e) {
                await interaction.followUp({
                    content: Lang.commands.setLanguage.noLang,
                    ephemeral: true
                });
            }
        }
    },
    */
] as const;

export async function initCommands(client: Client<true>) {
    await client.application.commands.set(commands);
}

export async function handleCommands(interaction: Interaction) {
    if (interaction.isCommand()) {
        const comm = commands.find(({ name }) => name === interaction.commandName);
        if (comm) {
            await interaction.deferReply({ ephemeral: true });
            await comm.execute(interaction);
            logNormal(`[Discord] Command: ${comm.name}, ${guildTrack(interaction.guildId!)} ${userTrack(interaction.user)}`);
        }
    }
}