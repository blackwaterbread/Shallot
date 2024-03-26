import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { Interactions } from "./Interactions";
import { Games } from "Types";

export async function registerStanbyMessage(channel: TextChannel) {
    const message = await channel.send({ content: 'Embed를 생성 중입니다...' });
    return message;
}

export function getNoticeMessage() {
    const embed = new EmbedBuilder()
        .setTitle(':beginner: 안내')
        .setDescription(
            '[Shallot](https://github.com/blackwaterbread/Shallot)은 서버 정보를 실시간으로 나타내 주는 봇입니다.\n' +
            '각종 문의 / 버그 신고: [@dayrain](https://discordapp.com/users/119027576692801536)\n'
        )
        .setImage('https://files.hirua.me/images/width.png');

    return {
        embeds: [embed]
    }
}

export function getRegisterInteractionMessage() {
    const { serverRegister } = Interactions.button;
    const { arma3, armareforger, armaresistance } = Games;

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

    const arma3Button = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${arma3.type}`)
        .setLabel('아르마 3')
        .setStyle(ButtonStyle.Primary)

    const reforgerButton = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${armareforger.type}`)
        .setLabel('아르마: 리포저')
        .setStyle(ButtonStyle.Primary)

    const ofpButton = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${armaresistance.type}`)
        .setLabel('오플포')
        .setStyle(ButtonStyle.Primary)

    const row = new ActionRowBuilder()
        .addComponents(arma3Button, reforgerButton, ofpButton);

    return {
        embeds: [embed],
        components: [row as any]
    }
}

export function getDeleteInteractionMessage() {
    const { serverDelete } = Interactions.button;

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(':x: 내 서버 삭제')
        .setDescription('내가 등록한 서버를 삭제합니다.')
        .setImage('https://files.hirua.me/images/width.png')
        .setFooter({ text: '* 짧은 시간에 너무 많은 요청 시 잠시 이용이 제한될 수 있습니다.' });

    const del = new ButtonBuilder()
        .setCustomId(`${serverDelete}_user`)
        .setLabel('삭제')
        .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder()
        .addComponents(del);

    return {
        embeds: [embed],
        components: [row as any]
    }
}