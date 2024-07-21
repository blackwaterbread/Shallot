import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { AvailableGame } from "Types";
import { BIServer } from "Storage";
import { Interactions } from "./Interactions";
import { getStringTable } from "Language";

const lang = getStringTable();

export function createServerRegisterModal(type: AvailableGame) {
    const { serverRegister } = Interactions.modal;
    const { serverAddress, serverMemo } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${serverRegister}_${type}`)
        .setTitle(lang.modal.serverRegister.title)

    const inputAddress = new TextInputBuilder()
        .setCustomId(serverAddress)
        .setLabel(lang.modal.serverRegister.inputIpAddr.label)
        .setPlaceholder(lang.modal.serverRegister.inputIpAddr.placeholder)
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const inputMemo = new TextInputBuilder()
        .setCustomId(serverMemo)
        .setLabel(lang.modal.serverRegister.inputMemo.label)
        .setPlaceholder(lang.modal.serverRegister.inputMemo.placeholder)
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
    const { serverAddress, serverPriority, serverMemo, serverImageOnline, serverImageOffline } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${serverModify}_${instanceId}`)
        .setTitle(lang.modal.serverModify.title)

    const inputAddress = new TextInputBuilder()
        .setCustomId(serverAddress)
        .setLabel(lang.modal.serverModify.inputIpAddr.label)
        .setValue(instanceId)
        .setRequired(true)
        .setMaxLength(120)
        .setStyle(TextInputStyle.Short);

    const inputPriority = new TextInputBuilder()
        .setCustomId(serverPriority)
        .setLabel(lang.modal.serverModify.inputPriority.label)
        .setValue(instance.priority.toString())
        .setRequired(true)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

    const inputMemo = new TextInputBuilder()
        .setCustomId(serverMemo)
        .setLabel(lang.modal.serverModify.inputMemo.label)
        .setValue(instance.information.memo)
        .setRequired(false)
        .setStyle(TextInputStyle.Short);

    const inputImageOnline = new TextInputBuilder()
        .setCustomId(serverImageOnline)
        .setLabel(lang.modal.serverModify.inputImage.online.label)
        .setValue(instance.customImage?.online ?? '')
        .setPlaceholder(lang.modal.serverModify.inputImage.placeholder)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)

    const inputImageOffline = new TextInputBuilder()
        .setCustomId(serverImageOffline)
        .setLabel(lang.modal.serverModify.inputImage.offline.label)
        .setValue(instance.customImage?.offline ?? '')
        .setPlaceholder(lang.modal.serverModify.inputImage.placeholder)
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

/*
export function createRconRegisterModal(instanceId: string) {
    const { rconRegister } = Interactions.modal;
    const { rconPort, rconPassword } = Interactions.modalComponents;
    const modal = new ModalBuilder()
        .setCustomId(`${rconRegister}_${instanceId}`)
        .setTitle(lang.modal.rconRegister.title)

    const inputRconPort = new TextInputBuilder()
        .setCustomId(rconPort)
        .setLabel(lang.modal.rconRegister.inputRconPort.label)
        .setRequired(true)
        .setMaxLength(5)
        .setStyle(TextInputStyle.Short);

    const inputRconPassword = new TextInputBuilder()
        .setCustomId(rconPassword)
        .setLabel(lang.modal.rconRegister.inputRconPassword.label)
        .setRequired(true)
        .setMaxLength(64)
        .setStyle(TextInputStyle.Short);

    modal.addComponents(
        new ActionRowBuilder().addComponents(inputRconPort), 
        new ActionRowBuilder().addComponents(inputRconPassword) as any
    );

    return modal;
}
*/