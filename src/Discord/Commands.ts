import _ from "lodash";
import { 
    PermissionFlagsBits, 
    ApplicationCommandOptionType, 
    ChatInputApplicationCommandData, 
    CommandInteraction, 
    ApplicationCommandType, 
    Client,
    Interaction,
    TextChannel
} from "discord.js";
import { getStorage, saveStorage } from "Config";
import { logError, logNormal, serverTrack, userTrack } from "Lib/Log";
import { getDeleteInteractionMessage, getNoticeMessage, getRegisterInteractionMessage } from "./Message";
import { uid2guid } from "Lib/Utils";

type SlashCommand = ChatInputApplicationCommandData &  {
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
            const { guild } = interaction;

            if (guild?.id) {
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

            else {
                await interaction.followUp({
                    content: ':x: GuildID가 존재하지 않습니다.',
                    ephemeral: true
                });
            }
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'initalize',
        description: 'Shallot을 사용하기 위해 초기 설정 작업을 시작합니다.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const { guild } = interaction;

            if (guild?.id) {
                const serverStorage = storage.get(guild.id);

                if (!serverStorage) {
                    await interaction.followUp({
                        content: ':x: 아직 채널 설정을 완료하지 않은 것 같습니다.',
                        ephemeral: true
                    });
                    return;
                }

                const { channelId, noticeMessageId, registerMessageId, deleteMessageId } = serverStorage.channels.interaction;
                const channel = await guild.channels.fetch(channelId) as TextChannel;
                
                if (!channel) {
                    await interaction.followUp({
                        content: `:x: 채널 ${channelId}는 존재하지 않는 것 같습니다.`,
                        ephemeral: true
                    });
                    return;
                }

                const newStorage = { ...serverStorage }

                if (_.isEmpty(noticeMessageId) || _.isUndefined(noticeMessageId)) {
                    const form = getNoticeMessage();
                    const message = await channel.send(form);
                    newStorage.channels.interaction.noticeMessageId = message.id;
                }

                if (_.isEmpty(registerMessageId) || _.isUndefined(registerMessageId)) {
                    const form = getRegisterInteractionMessage();
                    const message = await channel.send(form);
                    newStorage.channels.interaction.registerMessageId = message.id;
                }

                if (_.isEmpty(deleteMessageId) || _.isUndefined(deleteMessageId)) {
                    const form = getDeleteInteractionMessage();
                    const message = await channel.send(form);
                    newStorage.channels.interaction.deleteMessageId = message.id;
                }

                storage.set(guild.id, newStorage);
                saveStorage();

                await interaction.followUp({
                    content: ':white_check_mark: 초기 설정이 완료되었습니다.',
                    ephemeral: true
                });
            }
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'clear_servers',
        description: '서버 리스트를 전부 삭제합니다.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const storage = getStorage();
            const { guild } = interaction;

            if (guild?.id) {
                const serverStorage = storage.get(guild.id);

                if (!serverStorage) {
                    await interaction.followUp({
                        content: ':x: 아직 채널 설정을 완료하지 않은 것 같습니다.',
                        ephemeral: true
                    });
                    return;
                }

                const { status, admin } = serverStorage.channels;
                const tasks = Array.from(serverStorage.servers).map(async ([instanceId, instance]) => {
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
                    ...serverStorage,
                    servers: new Map()
                });

                saveStorage();

                await interaction.followUp({
                    content: ':white_check_mark: 서버 리스트를 초기화 했습니다.',
                    ephemeral: true
                });
            }
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
                if (!steamid || typeof steamid === 'number' || typeof steamid === 'boolean') throw new Error();
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
    }
    /*
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon_players',
        description: '서버 플레이어 목록 로드',
        options: [
            {
                name: 'server_id',
                description: '해당 서버 ID',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const sessions = getRconSessions();
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon_banlist',
        description: '서버 밴 리스트 로드',
        options: [
            {
                name: 'server_id',
                description: '해당 서버 ID',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const sessions = getRconSessions();
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon_kick',
        description: '서버 플레이어 킥',
        options: [
            {
                name: 'guid',
                description: '유저 GUID',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const sessions = getRconSessions();
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon_ban',
        description: '서버 플레이어 밴',
        options: [
            {
                name: 'guid',
                description: '유저 GUID',
                type: ApplicationCommandOptionType.String,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const sessions = getRconSessions();
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon_unban',
        description: '서버 플레이어 밴 해제',
        options: [
            {
                name: 'index',
                description: '밴 리스트 유저 번호',
                type: ApplicationCommandOptionType.Number,
                required: true
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const sessions = getRconSessions();
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon_logout',
        description: 'RCon 세션을 종료하고 점유를 중단합니다.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            const sessions = getRconSessions();
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    */
] as const;

export async function initCommands(client: Client<true>) {
    await client.application.commands.set(commands);
}

export async function handleCommands(interaction: Interaction) {
    if (interaction.isCommand()) {
        const comm = commands.find(({name}) => name === interaction.commandName);
        if(comm){
            await interaction.deferReply({ ephemeral: true });
            await comm.execute(interaction);
            logNormal(`[Discord] 명령어: ${comm.name}, ${serverTrack(interaction.guildId!)} ${userTrack(interaction.user)}`);
        }
    }
}