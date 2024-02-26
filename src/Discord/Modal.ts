import { AvailableGame } from "Types";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export function createRegisterModal(game: AvailableGame) {
    const modal = new ModalBuilder()
        .setCustomId(`modal_${game}`)
        .setTitle('서버 등록')

    const serverAddress = new TextInputBuilder()
        .setCustomId('serverAddress')
        .setLabel('서버 주소 (포트 기본값: 2302)')
        .setPlaceholder('127.0.0.1 or 127.0.0.1:2302')
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const serverPreset = new TextInputBuilder()
        .setCustomId('serverMemo')
        .setLabel('메모')
        .setPlaceholder('자동으로 제공되는 정보 외에 따로 공지할만한 내용')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder().addComponents(serverAddress);
    const secondActionRow = new ActionRowBuilder().addComponents(serverPreset);
    modal.addComponents(firstActionRow, secondActionRow as any);
    return modal;
}