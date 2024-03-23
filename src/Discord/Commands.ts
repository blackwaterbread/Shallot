import { 
    PermissionFlagsBits, 
    ApplicationCommandOptionType, 
    ChatInputApplicationCommandData, 
    CommandInteraction, 
    ApplicationCommandType, 
    Client,
    Interaction
} from "discord.js";
import { logNormal, userTrack } from "Lib/Log";
import { uid2guid } from "Lib/Utils";
import { getServerRconEmbed } from "./Embed";
import { getInstances } from "Config";

type SlashCommand = ChatInputApplicationCommandData &  {
    execute: (interaction: CommandInteraction) => void;
}

const commands: Array<SlashCommand> = [
    /*
    {
        type: ApplicationCommandType.ChatInput,
        name: 'server_list',
        description: '서버 리스트를 불러옵니다.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            // in direct message
            if (!interaction.guildId) {
                await interaction.followUp({
                    content: ':x: 서버 관리 채널에서 명령어를 입력해주세요.',
                    ephemeral: true
                });
            }
            else {
                const server = getInstances().get(interaction.guildId);
                if (server) {
                    const contents = getServerListEmbeds(server.instances);
                    await interaction.followUp({ ...embed, ephemeral: true });
                }
                else {
                    await interaction.followUp({
                        content: ':x: 올바르지 않은 접근',
                        ephemeral: true
                    });
                }
            }
        }
    },
    */
    {
        type: ApplicationCommandType.ChatInput,
        name: 'start_rcon_session',
        description: '새로운 RCon 세션을 시작합니다. 추가 상호작용이 없을 시 세션은 300초 후에 자동으로 닫힙니다.',
        options: [
            {
                name: 'server_id',
                description: '세션을 열고자 하는 서버 ID',
                type: ApplicationCommandOptionType.String
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            // 
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'close_rcon_session',
        description: '현재 할당된 RCon 세션을 닫습니다.',
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'rcon',
        description: 'rcon 명령어로 서버를 제어합니다.',
        options: [
            {
                name: 'params',
                description: '명령 파라미터',
                type: ApplicationCommandOptionType.String
            }
        ],
        defaultMemberPermissions: PermissionFlagsBits.Administrator,
        execute: async interaction => {
            // await interaction.followUp({ content: 'Hello', ephemeral: true });
        }
    },
    {
        type: ApplicationCommandType.ChatInput,
        name: 'uid2guid',
        description: 'SteamID를 GUID로 변환합니다.',
        options: [
            {
                name: 'steamid',
                description: '변환하고자 하는 SteamID',
                type: ApplicationCommandOptionType.String
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
            logNormal(`[Discord] 명령어: ${comm.name}, ${userTrack(interaction.user)}`);
        }
    }
}