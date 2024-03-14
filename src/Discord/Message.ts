import { logNormal } from "Lib/Log";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";

export async function registerStanbyMessage(channel: TextChannel) {
    const message = await channel.send({ content: '서버 정보 Embed를 생성 중입니다...' });
    logNormal(`[Discord] 서버 정보 Embed 생성 시도: [${message.id}, ${message.channelId}, ${message.channel.name}]`);
    return message;
}

export function getNoticeMessage() {
    const embed = new EmbedBuilder()
        .setTitle(':beginner: 안내')
        .setDescription(
            '[Shallot](https://github.com/blackwaterbread/Shallot)은 서버 정보를 실시간으로 나타내 주는 봇입니다. ' +
            '현재 베타 서비스중으로 가끔 앙증맞은 찐빠가 있을 시 [@dayrain](https://discordapp.com/users/119027576692801536)에게 문의 해 주세요. ' +
            '서버를 등록하시거나 삭제하시려면 아래의 버튼을 눌러 진행해 주세요.' 
        )
        .setImage('https://files.hirua.me/images/width.png');

    return {
        embeds: [embed]
    }
}

export function getRegisterInteractionMessage() {
    const embed = new EmbedBuilder()
        .setColor(0x41F097)
        .setTitle(':rocket: 서버 등록')
        .setDescription('서버 리스트에 등록할 게임을 선택해주세요.')
        .setImage('https://files.hirua.me/images/width.png')
        .setFooter({ text: 
            '* 1인당 하나만 등록할 수 있습니다.\n' +
            '* 고정된 서버를 제외하고 1분간 응답이 없을 시 자동으로 삭제됩니다.\n' +
            '* 짧은 시간에 너무 많은 요청 시 잠시 이용이 제한될 수 있습니다.'
        });

    const arma3 = new ButtonBuilder()
        .setCustomId('register_arma3')
        .setLabel('아르마 3')
        .setStyle(ButtonStyle.Primary)
        // .setDisabled(true);

    const reforger = new ButtonBuilder()
        .setCustomId('register_reforger')
        .setLabel('아르마: 리포저')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const ofpres = new ButtonBuilder()
        .setCustomId('register_armaresistance')
        .setLabel('오플포')
        .setStyle(ButtonStyle.Primary)
        // .setDisabled(true);

    const row = new ActionRowBuilder()
        .addComponents(arma3, reforger, ofpres);

    return {
        embeds: [embed],
        components: [row as any]
    }
}

export function getDeleteInteractionMessage() {
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(':x: 내 서버 삭제')
        .setDescription('내가 등록한 서버를 삭제합니다.')
        .setImage('https://files.hirua.me/images/width.png')
        .setFooter({ text: '* 짧은 시간에 너무 많은 요청 시 잠시 이용이 제한될 수 있습니다.' });

    const del = new ButtonBuilder()
        .setCustomId('delete_all')
        .setLabel('삭제')
        .setStyle(ButtonStyle.Secondary)
        // .setDisabled(true);

    const row = new ActionRowBuilder()
        .addComponents(del);

    return {
        embeds: [embed],
        components: [row as any]
    }
}