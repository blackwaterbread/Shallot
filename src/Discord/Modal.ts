import { AvailableGame } from "Types";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Interactions } from "./Interactions";
import { BIServer } from "Storage";

export function createServerRegisterModal(type: AvailableGame) {
    const { serverRegister } = Interactions.modal;
    const { serverAddress, serverMemo } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${serverRegister}_${type}`)
        .setTitle('서버 등록')

    const inputAddress = new TextInputBuilder()
        .setCustomId(serverAddress)
        .setLabel('서버 접속 주소 (포트 기본값: 2302)')
        .setPlaceholder('127.0.0.1 or 127.0.0.1:2302')
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const inputMemo = new TextInputBuilder()
        .setCustomId(serverMemo)
        .setLabel('메모')
        .setPlaceholder('자동으로 제공되는 정보 외에 따로 공지할만한 내용')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputAddress), 
        new ActionRowBuilder().addComponents(inputMemo) as any
    );

    return modal;
}

export function createServerModifyModal(instanceId: string, instance: BIServer) {
    const { serverModify } = Interactions.modal;
    const { serverAddress, serverPriority, serverMemo } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${serverModify}_${instanceId}`)
        .setTitle('서버 정보 수정')

    const inputAddress = new TextInputBuilder()
        .setCustomId(serverAddress)
        .setLabel('서버 접속 주소 (포트 기본값: 2302)')
        .setValue(instanceId)
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const inputPriority = new TextInputBuilder()
        .setCustomId(serverPriority)
        .setLabel('우선권 (true or false)')
        .setValue(instance.priority.toString())
        .setRequired(true)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

    const inputMemo = new TextInputBuilder()
        .setCustomId(serverMemo)
        .setLabel('메모')
        .setValue(instance.information.memo)
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputAddress), 
        new ActionRowBuilder().addComponents(inputPriority),
        new ActionRowBuilder().addComponents(inputMemo) as any
    );

    return modal;
}

export function createRconRegisterModal(instanceId: string) {
    const { rconRegister } = Interactions.modal;
    const { rconPort, rconPassword } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${rconRegister}_${instanceId}`)
        .setTitle('RCon 정보 수정')

    const inputRconPort = new TextInputBuilder()
        .setCustomId(rconPort)
        .setLabel('RCon 접속 포트')
        .setRequired(true)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

    const inputRconPassword = new TextInputBuilder()
        .setCustomId(rconPassword)
        .setLabel('RCon 접속 암호')
        .setRequired(true)
        .setMaxLength(64)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputRconPort), 
        new ActionRowBuilder().addComponents(inputRconPassword) as any
    );

    return modal;
}