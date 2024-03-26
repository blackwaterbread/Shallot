import _ from "lodash";
import fs from 'fs';
import crypto from 'crypto';
import { Interaction, PermissionsBitField, TextChannel } from "discord.js";
import { AvailableGame, Games } from "Types";
import { registerStanbyMessage } from "./Message";
import { getStorage, saveStorage, BIServer, getConfigs } from "Config";
import { getServerInformationEmbed, getPlayersEmbed, getServerRconEmbed } from "./Embed";
import { logError, logNormal, messageTrack, userTrack } from "Lib/Log";
import { createServerModifyModal, createServerRegisterModal } from "./Modal";
import { ServerQueries } from "Server";
import { queryArma3, savePresetHtml } from "Server/Games/Arma3";
import { queryArmaResistance } from "Server/Games/ArmaResistance";
import { queryArmaReforger } from "Server/Games/ArmaReforger";
import { startRefresherEntire, stopRefresherEntire } from "Lib/Refresher";
import { validationAddress } from "Lib/Utils";

const configs = getConfigs();

export const Interactions = {
    button: {
        serverRegister: 'serverRegister',
        serverDelete: 'serverDelete',
        serverModify: 'serverModify',
        serverCheckPlayers: 'serverCheckPlayers',
        adminStartRcon: 'adminStartRcon',
        adminRconRegister: 'adminRconRegister',
        adminRconDelete: 'adminRconDelete',
    },
    modal: {
        serverRegister: 'serverRegisterSubmit',
        serverModify: 'serverModifySubmit',
        rconRegister: 'rconRegister'
    },
    modalComponents: {
        serverAddress: 'serverAddress',
        serverMemo: 'serverMemo',
        rconPort: 'rconPort',
        rconPassword: 'rconPassword'
    }
} as const;

export async function handleInteractions(interaction: Interaction) {
    if (!interaction.guild) return;

    const storage = getStorage();
    const guild = interaction.guild;
    const serverInstance = storage.get(guild.id);

    if (!serverInstance) return;

    const { channelId: listChannelId } = serverInstance.channels.status;
    const { channelId: rconChannelId } = serverInstance.channels.admin;
    const { cache } = interaction.client.channels;
    const { user, channel } = interaction;

    if (!channel) return;

    const listChannel = await cache.get(listChannelId)?.fetch() as TextChannel;
    const rconChannel = await cache.get(rconChannelId)?.fetch() as TextChannel;

    if (!listChannel || !rconChannel) {
        logError('[App|Discord] handleInteractions: 채널 정보를 등록하지 않았습니다.');
        return;
    }

    const permissions = interaction.member!.permissions as Readonly<PermissionsBitField>;
    const isMemberAdmin = permissions.has(PermissionsBitField.Flags.Administrator);

    /* Button Interaction */
    if (interaction.isButton()) {
        const buttonId = interaction.customId.split('_');
        const {
            serverRegister, serverDelete, serverModify, serverCheckPlayers,
            adminStartRcon, adminRconRegister, adminRconDelete
        } = Interactions.button;

        switch (buttonId[0]) {
            case serverRegister: {
                const modal = createServerRegisterModal(buttonId[1] as AvailableGame);
                await interaction.showModal(modal);
                break;
            }

            case serverModify: {
                const key = buttonId[1];
                const instance = serverInstance.servers.get(key);

                if (instance) {
                    const modal = createServerModifyModal(key, instance);
                    await interaction.showModal(modal);
                }

                else {
                    await interaction.reply({
                        content: ':x: 오류: 존재하지 않는 인스턴스입니다.',
                        ephemeral: true
                    });
                }

                break;
            }

            case serverDelete: {
                const userId = interaction.user.id;
                const key = buttonId[1];
                const target = key === 'user' ?
                    Array.from(serverInstance.servers).find(([k, v]) => v.discord.owner.id === userId) :
                    Array.from(serverInstance.servers).find(([k, v]) => k === key);

                if (target) {
                    stopRefresherEntire();
                    const key = target[0];
                    const instance = serverInstance.servers.get(key)!;
                    const [statusMessage, rconMessage] = await Promise.all([
                        listChannel.messages.fetch(instance.discord.statusEmbedMessageId),
                        rconChannel.messages.fetch(instance.discord.rconEmbedMessageId)
                    ]);

                    await Promise.all([
                        statusMessage.delete(),
                        rconMessage.delete()
                    ]);

                    await interaction.reply({
                        content: ':wave: 서버가 삭제되었습니다.',
                        ephemeral: true
                    });

                    if (fs.existsSync(instance.presetPath)) fs.unlinkSync(instance.presetPath);
                    serverInstance.servers.delete(key);

                    saveStorage();
                    startRefresherEntire();
                }

                break;
            }

            case serverCheckPlayers: {
                const targetId = buttonId[1];
                const embed = getPlayersEmbed(guild.id, targetId);
                await interaction.reply(embed as any);
                break;
            }

            /*
            case adminStartRcon: {
                if (!isMemberAdmin) {
                    await handleRestrictedInteraction(interaction, isMemberAdmin);
                    break;
                }

                const ephemeralReplyMessage = await interaction.reply({
                    content: ':tools: RCon 세션 연결 시도 중입니다...',
                    ephemeral: true
                });

                const instanceId = buttonId[1];
                const instance = serverInstance.servers.get(instanceId);

                if (instance) {
                    try {
                        const configs = getConfigs();
                        const sessions = getRconSessions();
                        const { connect, rcon } = instance;
                        const { user } = interaction;

                        if (!rcon) {
                            await ephemeralReplyMessage.edit({
                                content: ':x: RCon 연결이 비활성화된 서버입니다.',
                            });
                            break;
                        }

                        const socket = await startRconSession(connect.host, connect.port, rcon.password);
                        sessions.set(instanceId, {
                            user: {
                                id: user.id,
                                displayName: user.displayName,
                                url: `https://discordapp.com/users/${user.id}`,
                                avatarUrl: user.avatarURL() ?? ''
                            },
                            session: socket,
                            expired: DateTime.now().toUnixInteger() + configs.sessionExpiredSec,
                        });

                        await ephemeralReplyMessage.edit({
                            content: `:satellite: RCon 세션을 점유했습니다. ${configs.sessionExpiredSec}초가 지나면 자동으로 세션이 닫힙니다.`,
                        });
                    }

                    catch (e) {
                        await ephemeralReplyMessage.edit({
                            content: ':x: RCon 연결에 실패했습니다.',
                        });
                    }
                }

                else {
                    await ephemeralReplyMessage.edit({
                        content: ':x: 오류: 존재하지 않는 인스턴스입니다.',
                    });
                }

                break;
            }

            case adminRconRegister: {
                if (!isMemberAdmin) {
                    await handleRestrictedInteraction(interaction, isMemberAdmin);
                    break;
                }

                const key = buttonId[1];
                const instance = serverInstance.servers.get(key);

                if (instance) {
                    const modal = createRconRegisterModal(key);
                    await interaction.showModal(modal);
                }

                else {
                    await interaction.reply({
                        content: ':x: 오류: 존재하지 않는 인스턴스입니다.',
                        ephemeral: true
                    });
                }

                break;
            }

            case adminRconDelete: {
                if (!isMemberAdmin) {
                    await handleRestrictedInteraction(interaction, isMemberAdmin);
                    break;
                }

                const key = buttonId[1];
                const instance = serverInstance.servers.get(key);

                if (instance) {
                    const newInstance: BIServer = { 
                        ...instance,
                        rcon: null
                    }

                    serverInstance.servers.set(key, newInstance);
                    saveStorage();
                    forcedEmbedRefresh();

                    await interaction.reply({
                        content: ':wave: RCon이 비활성화 되었습니다.',
                        ephemeral: true
                    });
                }

                else {
                    await interaction.reply({
                        content: ':x: 오류: 존재하지 않는 인스턴스입니다.',
                        ephemeral: true
                    });
                }

                break;
            }
            */

            default: {
                logError(`[App] 등록되지 않은 버튼 상호작용: ${buttonId}`);
                break;
            }
        }
    }

    /* ModalSubmit Interaction */
    else if (interaction.isModalSubmit()) {
        const modalId = interaction.customId.split('_');
        const { serverRegister, serverModify, rconRegister } = Interactions.modal;
        const { serverAddress, serverMemo } = Interactions.modalComponents;
        const { arma3, armareforger, armaresistance } = Games;

        switch (modalId[0]) {
            case serverRegister: {
                const ephemeralReplyMessage = await interaction.reply({
                    content: ':tools: 유효성 확인 중입니다...',
                    ephemeral: true
                });

                const inputAddress = interaction.fields.getTextInputValue(serverAddress); // 127.0.0.1:8080
                const inputMemo = interaction.fields.getTextInputValue(serverMemo);
                let validatedAddress;

                try {
                    validatedAddress = validationAddress(inputAddress);
                }

                catch (e) {
                    await ephemeralReplyMessage.edit({ content: e as string });
                    break;
                }

                await ephemeralReplyMessage.edit({ content: ':rocket: 서버 연결 중입니다...' });

                const instanceKey = inputAddress;
                const isAlreadyExist = serverInstance.servers.has(instanceKey);
                const isUserAlreadyRegistered = Array.from(serverInstance.servers).find(([k, v]) => v.discord.owner.id === user.id);

                if (isAlreadyExist) {
                    await ephemeralReplyMessage.edit({ content: ':x: 이미 리스트에 존재하는 서버입니다.' });
                    return;
                }

                if (!isMemberAdmin && isUserAlreadyRegistered) {
                    await ephemeralReplyMessage.edit({ content: ':x: 서버는 1인당 하나만 등록할 수 있습니다.' });
                    return;
                }

                let statusMessage, rconMessage;
                let statusEmbed, rconEmbed;
                let serverQueries: ServerQueries;
                let presetPath: string;

                const instanceUser = {
                    id: user.id,
                    displayName: user.displayName,
                    url: `https://discordapp.com/users/${user.id}`,
                    avatarUrl: user.avatarURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png'
                }

                statusMessage = await registerStanbyMessage(listChannel);
                rconMessage = await registerStanbyMessage(rconChannel);

                logNormal(`[Discord] 서버 Embed 생성 시도: ${messageTrack(statusMessage)}`);

                switch (modalId[1]) {
                    case arma3.type: {
                        serverQueries = await queryArma3({ host: validatedAddress[0], port: validatedAddress[1] });
                        break;
                    }

                    case armareforger.type: {
                        serverQueries = await queryArmaReforger({ host: validatedAddress[0], port: validatedAddress[1] });
                        break;
                    }

                    case armaresistance.type: {
                        serverQueries = await queryArmaResistance({ host: validatedAddress[0], port: validatedAddress[1] });
                        break;
                    }

                    default: {
                        await ephemeralReplyMessage.edit({ content: ':x: Shallot 오류입니다: 지원하지 않는 게임입니다.' });
                        return;
                    }
                }

                try {
                    if (!serverQueries.online) {
                        await statusMessage.delete();
                        await rconMessage.delete();
                        await ephemeralReplyMessage.edit({ content: ':x: 서버에 연결할 수 없습니다.' });
                        return;
                    }

                    else {
                        /* registering new server */
                        const { info, tags, rules, preset } = serverQueries.online;
                        presetPath = savePresetHtml(statusMessage.id, preset);

                        const instance: BIServer = {
                            type: serverQueries.game,
                            nonce: crypto.randomBytes(4).toString('hex'),
                            priority: isMemberAdmin,
                            connect: { host: validatedAddress[0], port: validatedAddress[1] },
                            presetPath: presetPath,
                            discord: {
                                statusEmbedMessageId: statusMessage.id,
                                rconEmbedMessageId: rconMessage.id,
                                owner: instanceUser
                            },
                            information: {
                                hostname: info.name,
                                players: info.players.map((x: any) => ({
                                    name: x.name,
                                    // score: x.raw.score,
                                    // time: x.raw.time
                                })),
                                memo: inputMemo,
                                addonsHash: tags?.loadedContentHash ?? '',
                                lastQueries: serverQueries
                            },
                            rcon: null,
                            connection: {
                                status: true,
                                count: configs.serverAutoDeleteCount
                            }
                        };

                        statusEmbed = getServerInformationEmbed(statusMessage.id, serverQueries, instance, inputMemo);
                        rconEmbed = getServerRconEmbed(instanceKey, instance);

                        serverInstance.servers.set(instanceKey, instance);
                        saveStorage();

                        await statusMessage.edit(statusEmbed as any);
                        await rconMessage.edit(rconEmbed as any);
                        await ephemeralReplyMessage.edit({ content: ':white_check_mark: 서버가 등록되었습니다.' });

                        logNormal(`[Discord] 서버 등록: [${serverQueries.game},${info.connect}]${userTrack(user)}`);
                    }
                }

                catch (e) {
                    await statusMessage?.delete();
                    await rconMessage?.delete();
                    await ephemeralReplyMessage.edit({ content: ':x: Shallot 오류로 인해 서버에 연결할 수 없습니다.' });

                    logError(`[App|Discord] Error while registering server: ${e}`);
                    return;
                }

                break;
            }

            case serverModify: {
                const origInstanceKey = modalId[1];
                const ephemeralReplyMessage = await interaction.reply({
                    content: ':tools: 유효성 확인 중입니다...',
                    ephemeral: true
                });

                const inputAddress = interaction.fields.getTextInputValue(serverAddress);
                const inputMemo = interaction.fields.getTextInputValue(serverMemo);
                let validatedAddress;

                try {
                    validatedAddress = validationAddress(inputAddress);
                }

                catch (e) {
                    await ephemeralReplyMessage.edit({ content: e as string });
                    break;
                }

                const newInstanceKey = inputAddress;
                const origInstance = serverInstance.servers.get(origInstanceKey);

                if (!origInstance) {
                    await ephemeralReplyMessage.edit({ content: ':x: 인스턴스가 존재하지 않습니다.' });
                    break;
                }

                const newInstance: BIServer = {
                    ...origInstance,
                    connect: { host: validatedAddress[0], port: validatedAddress[1] },
                    information: {
                        ...origInstance.information,
                        memo: inputMemo
                    }
                }

                if (origInstanceKey !== newInstanceKey) {
                    serverInstance.servers.delete(origInstanceKey);
                }

                serverInstance.servers.set(newInstanceKey, newInstance);
                saveStorage();

                await ephemeralReplyMessage.edit({ content: ':white_check_mark: 서버 정보가 수정되었습니다.' });
                break;
            }

            /*
            case rconRegister: {
                const ephemeralReplyMessage = await interaction.reply({
                    content: ':tools: 유효성 확인 중입니다...',
                    ephemeral: true
                });
                
                const instanceId = modalId[1];
                const { rconPort, rconPassword } = Interactions.modalComponents;
                const inputRconPort = interaction.fields.getTextInputValue(rconPort);
                const inputRconPassword = interaction.fields.getTextInputValue(rconPassword);
                let validatedAddress;

                try {
                    // need validate only port, so pass some any ip
                    validatedAddress = validationAddress(`127.0.0.1:${inputRconPort}`);
                }

                catch (e) {
                    await ephemeralReplyMessage.edit({ content: e as string });
                    break;
                }

                const port = validatedAddress[1];
                const instance = serverInstance.servers.get(instanceId);
                
                if (!instance) {
                    await ephemeralReplyMessage.edit({ content: ':x: 인스턴스가 존재하지 않습니다.' });
                    break;
                }

                const newInstance: BIServer = { 
                    ...instance,
                    rcon: {
                        port: port,
                        password: inputRconPassword
                    }
                }

                serverInstance.servers.set(instanceId, newInstance);
                saveStorage();

                await ephemeralReplyMessage.edit({ content: ':white_check_mark: RCon 접속 정보를 추가했습니다.' });
                forcedEmbedRefresh();

                break;
            }
            */

            default: {
                // invalid Submit
                return;
            }
        }
    }
}

async function handleRestrictedInteraction(interaction: Interaction, isMemberAdmin: boolean) {
    if (!isMemberAdmin) {
        if (interaction.isRepliable()) {
            await interaction.reply({
                content: ':x: 권한이 없습니다.',
                ephemeral: true
            });
        }
    }
}