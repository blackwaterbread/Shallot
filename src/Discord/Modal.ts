import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { AvailableGame } from "Types";
import { BIServer } from "Storage";
import { Interactions } from "./Interactions";
import { getStringTable } from "Language";

const StringTable = getStringTable();

export function createServerRegisterModal(type: AvailableGame) {
    const { serverRegisterSubmit } = Interactions.modalSubmit;
    const { serverAddress, serverMemo } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${serverRegisterSubmit}_${type}`)
        .setTitle(StringTable.modal.serverRegister.title)

    const inputAddress = new TextInputBuilder()
        .setCustomId(serverAddress)
        .setLabel(StringTable.modal.serverRegister.inputIpAddr.label)
        .setPlaceholder(StringTable.modal.serverRegister.inputIpAddr.placeholder)
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const inputMemo = new TextInputBuilder()
        .setCustomId(serverMemo)
        .setLabel(StringTable.modal.serverRegister.inputMemo.label)
        .setPlaceholder(StringTable.modal.serverRegister.inputMemo.placeholder)
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputAddress), 
        new ActionRowBuilder().addComponents(inputMemo) as any
    );

    return modal;
}

export function createServerModifyModal(instanceId: string, instance: BIServer) {
    const { serverModifySubmit } = Interactions.modalSubmit;
    const { serverAddress, serverPriority, serverMemo, serverImageOnline, serverImageOffline } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${serverModifySubmit}_${instanceId}`)
        .setTitle(StringTable.modal.serverModify.title)

    const inputAddress = new TextInputBuilder()
        .setCustomId(serverAddress)
        .setLabel(StringTable.modal.serverModify.inputIpAddr.label)
        .setValue(instanceId)
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const inputPriority = new TextInputBuilder()
        .setCustomId(serverPriority)
        .setLabel(StringTable.modal.serverModify.inputPriority.label)
        .setValue(instance.priority.toString())
        .setRequired(true)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

    const inputMemo = new TextInputBuilder()
        .setCustomId(serverMemo)
        .setLabel(StringTable.modal.serverModify.inputMemo.label)
        .setValue(instance.information.memo)
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    const inputImageOnline = new TextInputBuilder()
        .setCustomId(serverImageOnline)
        .setLabel(StringTable.modal.serverModify.inputImage.online.label)
        .setValue(instance.customImage?.online ?? '')
        .setPlaceholder(StringTable.modal.serverModify.inputImage.placeholder)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)

    const inputImageOffline = new TextInputBuilder()
        .setCustomId(serverImageOffline)
        .setLabel(StringTable.modal.serverModify.inputImage.offline.label)
        .setValue(instance.customImage?.offline ?? '')
        .setPlaceholder(StringTable.modal.serverModify.inputImage.placeholder)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputAddress), 
        new ActionRowBuilder().addComponents(inputPriority),
        new ActionRowBuilder().addComponents(inputMemo),
        new ActionRowBuilder().addComponents(inputImageOnline),
        new ActionRowBuilder().addComponents(inputImageOffline) as any
    );

    return modal;
}

export function createRconRegisterModal(instanceId: string) {
    const { rconRegisterSubmit } = Interactions.modalSubmit;
    const { rconPort, rconPassword } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${rconRegisterSubmit}_${instanceId}`)
        .setTitle(StringTable.modal.rconRegister.title)

    const inputRconPort = new TextInputBuilder()
        .setCustomId(rconPort)
        .setLabel(StringTable.modal.rconRegister.inputRconPort.label)
        .setRequired(true)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

    const inputRconPassword = new TextInputBuilder()
        .setCustomId(rconPassword)
        .setLabel(StringTable.modal.rconRegister.inputRconPassword.label)
        .setRequired(true)
        .setMaxLength(64)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputRconPort), 
        new ActionRowBuilder().addComponents(inputRconPassword) as any
    );

    return modal;
}