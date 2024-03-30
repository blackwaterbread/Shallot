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
import { AppStorage, getStorage, saveStorage } from "Storage";
import { logError, logNormal, guildTrack, userTrack } from "Lib/Log";
import { getDeleteInteractionMessage, getNoticeMessage, getRegisterInteractionMessage } from "./Message";
import { uid2guid } from "Lib/Utils";
import { startRconSession } from "Server/Rcon";

async function assertGuild(interaction: CommandInteraction) {
    const { guild } = interaction;
    if (!guild) {
        await interaction.followUp({
            content: ':x: GuildID가 존재하지 않습니다.',
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
            content: ':x: 아직 채널 설정을 완료하지 않은 것 같습니다.',
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
            content: ':x: 잘못된 서버 ID입니다.',
            ephemeral: true
        });
        return;
    }

    if (!server.rcon) {
        await interaction.followUp({
            content: ':x: RCon 기능이 활성화되지 않은 서버입니다.',
            ephemeral: true
        });
        return;
    }

    return server;
}

type SlashCommand = ChatInputApplicationCommandData & {
    execute: (interaction: CommandInteraction) => void;
}

const commands: Array<SlashCommand> = [
    {
        type: ApplicationCommandType.ChatInput,
        name: 'set_channels',
        description: '필수 채널 설정',
        options: [
            {
                name: 'interaction_channel_id',
                description: '서버 등록/삭제 채널 ID',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'status_channel_id',
                description: '서버 현황 채널 ID',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'admin_channel_id',
                description: '서버 관리 채널 ID',
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

            storage.set(guild.id, {
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
                content: ':white_check_mark: 채널이 등록되었습니다.',
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'initalize',
        description: 'Shallot을 사용하기 위해 초기 설정 작업을 시작합니다.',
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
                    content: `:x: 채널 ${channelId}는 존재하지 않는 것 같습니다.`,
                    ephemeral: true
                });
                return;
            }

            const newStorage = { ...guildStorage }

            const noticeMessage = await channel.send(getNoticeMessage());
            const interactionMessage = await channel.send(getRegisterInteractionMessage());
            const deleteMessage = await channel.send(getDeleteInteractionMessage());

            newStorage.channels.interaction.noticeMessageId = noticeMessage.id;
            newStorage.channels.interaction.registerMessageId = interactionMessage.id;
            newStorage.channels.interaction.deleteMessageId = deleteMessage.id;

            storage.set(guild.id, newStorage);
            saveStorage();

            await interaction.followUp({
                content: ':white_check_mark: 초기 설정이 완료되었습니다.',
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'clear_servers',
        description: '서버 리스트를 전부 삭제합니다.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();

            const guild = await assertGuild(interaction);
            if (!guild) return;

            const guildStorage = storage.get(guild.id);
            if (!guildStorage) {
                await interaction.followUp({
                    content: ':x: 아직 채널 설정을 완료하지 않은 것 같습니다.',
                    ephemeral: true
                });
                return;
            }

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
                content: ':white_check_mark: 서버 리스트를 초기화 했습니다.',
                ephemeral: true
            });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'uid2guid',
        description: 'SteamID를 GUID로 변환합니다.',
        options: [
            {
                name: 'steamid',
                description: 'SteamID',
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
                    content: ':x: 잘못된 입력값입니다.',
                    ephemeral: true
                });
            }
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon',
        description: 'RCon 명령 실행',
        options: [
            {
                name: 'server_id',
                description: '해당 서버 ID',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'command',
                description: '명령',
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
                await interaction.followUp({
                    content: query.data ?? ':grey_question: 연결은 정상적으로 되었으나 빈 데이터가 수신되었습니다.',
                    ephemeral: true
                });
            }
        
            catch (e) {
                logError(`[App|Discord] 명령어: rcon ${command}: ${e}`);
                await interaction.followUp({
                    content: ':x: 뭔가 잘못되었습니다.',
                    ephemeral: true
                });
            }
        }
    }
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
            logNormal(`[Discord] 명령어: ${comm.name}, ${guildTrack(interaction.guildId!)} ${userTrack(interaction.user)}`);
        }
    }
}