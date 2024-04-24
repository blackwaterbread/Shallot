import _ from "lodash";
import fs from 'fs';
import crypto from 'crypto';
import { Interaction, PermissionsBitField, TextChannel } from "discord.js";
import { AvailableGame, Games } from "Types";
import { registerStanbyMessage } from "./Message";
import { getConfigs } from "Config";
import { getStorage, saveStorage, BIServer } from "Storage";
import { getServerStatusEmbed, getPlayersEmbed, getServerRconEmbed } from "./Embed";
import { logError, logNormal, messageTrack, userTrack } from "Lib/Log";
import { createRconRegisterModal, createServerModifyModal, createServerRegisterModal } from "./Modal";
import { CommonServerQueries } from "Types";
import { queryArma3, savePresetHtml } from "Server/Games/Arma3";
import { queryArmaResistance } from "Server/Games/ArmaResistance";
import { queryArmaReforger } from "Server/Games/ArmaReforger";
import { rconEmbedRefresh, startRefresherEntire, statusEmbedRefresh, stopRefresherEntire } from "Lib/Refresher";
import { getBoolean } from "Lib/Utils";
import { getStringTable } from "Language";

const configs = getConfigs();
const lang = getStringTable();

export const Interactions = {
    button: {
        serverRegister: 'serverRegister',
        serverDelete: 'serverDelete',
        serverModify: 'serverModify',
        serverCheckPlayers: 'serverCheckPlayers',
        // adminStartRcon: 'adminStartRcon',
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
        serverPriority: 'serverPriority',
        rconPort: 'rconPort',
        rconPassword: 'rconPassword'
    }
} as const;

export async function handleInteractions(interaction: Interaction) {
    if (!interaction.guild) return;

    const storage = getStorage();
    const guild = interaction.guild;
    const guildStorage = storage.get(guild.id);

    if (!guildStorage) return;

    const { channelId: listChannelId } = guildStorage.channels.status;
    const { channelId: rconChannelId } = guildStorage.channels.admin;
    const { cache } = interaction.client.channels;
    const { user, channel } = interaction;

    if (!channel) return;

    const listChannel = await cache.get(listChannelId)?.fetch() as TextChannel;
    const rconChannel = await cache.get(rconChannelId)?.fetch() as TextChannel;

    if (!listChannel || !rconChannel) {
        logError(`[App|Discord] handleInteractions: There's no channel: [${listChannelId}|${rconChannelId}]`);
        return;
    }

    const permissions = interaction.member!.permissions as Readonly<PermissionsBitField>;
    const isMemberAdmin = permissions.has(PermissionsBitField.Flags.Administrator);

    /* Button Interaction */
    if (interaction.isButton()) {
        logNormal(`[Discord] Interaction: ${interaction.customId}: ${userTrack(interaction.user)}`);

        const buttonId = interaction.customId.split('_');
        const {
            serverRegister, serverDelete, serverModify, serverCheckPlayers,
            adminRconRegister, adminRconDelete
        } = Interactions.button;

        switch (buttonId[0]) {
            case serverRegister: {
                const modal = createServerRegisterModal(buttonId[1] as AvailableGame);
                await interaction.showModal(modal);
                break;
            }

            case serverModify: {
                const serverKey = buttonId[1];
                const server = guildStorage.servers.get(serverKey);

                if (server) {
                    const modal = createServerModifyModal(serverKey, server);
                    await interaction.showModal(modal);
                }

                else {
                    await interaction.reply({
                        content: lang.interaction.button.serverModify.noServer,
                        ephemeral: true
                    });
                }

                break;
            }

            case serverDelete: {
                const userId = interaction.user.id;
                const buttonKey = buttonId[1];
                const target = buttonKey === 'user' ?
                    Array.from(guildStorage.servers).find(([k, v]) => v.discord.owner.id === userId) :
                    Array.from(guildStorage.servers).find(([k, v]) => k === buttonKey);

                if (target) {
                    stopRefresherEntire();
                    const serverKey = target[0];
                    const server = guildStorage.servers.get(serverKey)!;
                    const [statusMessage, rconMessage] = await Promise.all([
                        listChannel.messages.fetch(server.discord.statusEmbedMessageId),
                        rconChannel.messages.fetch(server.discord.rconEmbedMessageId)
                    ]);

                    await Promise.all([
                        statusMessage.delete(),
                        rconMessage.delete()
                    ]);

                    await interaction.reply({
                        content: lang.interaction.button.serverDelete.deletedServer,
                        ephemeral: true
                    });

                    server.presetPath.forEach(x => { if (fs.existsSync(x)) fs.unlinkSync(x) });
                    guildStorage.servers.delete(serverKey);

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
            */

            case adminRconRegister: {
                if (!isMemberAdmin) {
                    await handleRestrictedInteraction(interaction, isMemberAdmin);
                    break;
                }

                const serverKey = buttonId[1];
                const server = guildStorage.servers.get(serverKey);

                if (server) {
                    const modal = createRconRegisterModal(serverKey);
                    await interaction.showModal(modal);
                }

                else {
                    await interaction.reply({
                        content: lang.interaction.button.adminRconRegister.noServer,
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

                const serverKey = buttonId[1];
                const curServer = guildStorage.servers.get(serverKey);

                if (curServer) {
                    const newServer: BIServer = { 
                        ...curServer,
                        rcon: null
                    }

                    guildStorage.servers.set(serverKey, newServer);
                    saveStorage();

                    // await forcedEmbedRefresh(newInstance.discord.rconEmbedMessageId);
                    await interaction.reply({
                        content: lang.interaction.button.adminRconDelete.rconDeactivated,
                        ephemeral: true
                    });
                }

                else {
                    await interaction.reply({
                        content: lang.interaction.button.adminRconDelete.noServer,
                        ephemeral: true
                    });
                }

                break;
            }

            default: {
                logError(`[App] Unregistered button interaction: ${buttonId}`);
                break;
            }
        }
    }

    /* ModalSubmit Interaction */
    else if (interaction.isModalSubmit()) {
        logNormal(`[Discord] Interaction: ${interaction.customId}: ${userTrack(interaction.user)}`);

        const modalId = interaction.customId.split('_');
        const { serverRegister, serverModify, rconRegister } = Interactions.modal;
        const { serverAddress, serverPriority, serverMemo } = Interactions.modalComponents;
        const { arma3, armareforger, armaresistance } = Games;

        switch (modalId[0]) {
            case serverRegister: {
                const ephemeralReplyMessage = await interaction.reply({
                    content: lang.interaction.modalSubmit.serverRegister.checkingValidation,
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

                await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverRegister.connectingServer });

                const newServerKey = `${validatedAddress[0]}:${validatedAddress[1]}`;
                const isAlreadyExist = guildStorage.servers.has(newServerKey);
                // const isUserAlreadyRegistered = Array.from(serverInstance.servers).find(([k, v]) => v.discord.owner.id === user.id);

                if (isAlreadyExist) {
                    await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverRegister.duplicatedServer });
                    return;
                }

                /*
                if (!isMemberAdmin && isUserAlreadyRegistered) {
                    await ephemeralReplyMessage.edit({ content: ':x: 서버는 1인당 하나만 등록할 수 있습니다.' });
                    return;
                }
                */

                let statusMessage, rconMessage;
                let statusEmbed, rconEmbed;
                let serverQueries: CommonServerQueries;
                // let presetPath: string;

                const instanceUser = {
                    id: user.id,
                    displayName: user.displayName,
                    url: `https://discordapp.com/users/${user.id}`,
                    avatarUrl: user.avatarURL() ?? 'https://cdn.discordapp.com/embed/avatars/0.png'
                }

                statusMessage = await registerStanbyMessage(listChannel);
                rconMessage = await registerStanbyMessage(rconChannel);

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
                        await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverRegister.unsupportedSerrverType });
                        return;
                    }
                }

                try {
                    if (!serverQueries.query) {
                        await statusMessage.delete();
                        await rconMessage.delete();
                        await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverRegister.failedConnectServer });
                        return;
                    }

                    else {
                        /* registering new server */
                        let presets: string[] = [];
                        const { info, tags, rules, preset } = serverQueries.query;

                        if (preset) {
                            const presetPurchasedPath = savePresetHtml(`${statusMessage.id}-${tags?.loadedContentHash}-p`, preset!.purchased);
                            const presetCompatibilityPath = savePresetHtml(`${statusMessage.id}-${tags?.loadedContentHash}-c`, preset!.compatibility);
                            presets = [
                                presetPurchasedPath,
                                presetCompatibilityPath
                            ];
                        }

                        const newServer: BIServer = {
                            type: serverQueries.game,
                            nonce: crypto.randomBytes(4).toString('hex'),
                            priority: isMemberAdmin,
                            maintenance: false,
                            connect: { host: validatedAddress[0], port: validatedAddress[1] },
                            presetPath: presets,
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
                                status: 'connected',
                                count: configs.serverAutoDeleteCount
                            }
                        };

                        statusEmbed = getServerStatusEmbed(statusMessage.id, serverQueries, newServer, inputMemo);
                        rconEmbed = getServerRconEmbed(newServerKey, newServer);

                        guildStorage.servers.set(newServerKey, newServer);
                        saveStorage();

                        await statusMessage.edit(statusEmbed);
                        await rconMessage.edit(rconEmbed);
                        await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverRegister.success });

                        logNormal(`[App|Discord] Server registered: [${serverQueries.game},${info.connect}]${userTrack(user)}`);
                    }
                }

                catch (e) {
                    await statusMessage?.delete();
                    await rconMessage?.delete();
                    await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverRegister.uncatchedError });

                    logError(`[App|Discord] Error while registering server: ${e}`);
                    return;
                }

                break;
            }

            case serverModify: {
                const curServerKey = modalId[1];
                const ephemeralReplyMessage = await interaction.reply({
                    content: lang.interaction.modalSubmit.serverModify.checkingValidation,
                    ephemeral: true
                });

                const inputAddress = interaction.fields.getTextInputValue(serverAddress);
                const inputPriority = interaction.fields.getTextInputValue(serverPriority);
                const inputMemo = interaction.fields.getTextInputValue(serverMemo);
                let validatedAddress;

                try {
                    validatedAddress = validationAddress(inputAddress);
                }

                catch (e) {
                    await ephemeralReplyMessage.edit({ content: e as string });
                    break;
                }

                const newServerKey = inputAddress;
                const curServer = guildStorage.servers.get(curServerKey);

                if (!curServer) {
                    await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverModify.noServer });
                    break;
                }

                const newServer: BIServer = {
                    ...curServer,
                    priority: getBoolean(inputPriority),
                    connect: { host: validatedAddress[0], port: validatedAddress[1] },
                    information: {
                        ...curServer.information,
                        memo: inputMemo
                    }
                }

                if (curServerKey !== newServerKey) {
                    guildStorage.servers.delete(curServerKey);
                }

                guildStorage.servers.set(newServerKey, newServer);
                saveStorage();

                await Promise.all([ 
                    statusEmbedRefresh(guild.id, newServerKey), 
                    rconEmbedRefresh(guild.id, newServerKey) 
                ]);
                await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.serverModify.success });
                break;
            }

            case rconRegister: {
                const ephemeralReplyMessage = await interaction.reply({
                    content: lang.interaction.modalSubmit.rconRegister.checkingValidation,
                    ephemeral: true
                });
                
                const serverId = modalId[1];
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
                const curServer = guildStorage.servers.get(serverId);
                
                if (!curServer) {
                    await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.rconRegister.noServer });
                    break;
                }

                const newServer: BIServer = { 
                    ...curServer,
                    rcon: {
                        port: port,
                        password: inputRconPassword
                    }
                }

                guildStorage.servers.set(serverId, newServer);
                saveStorage();

                await rconEmbedRefresh(guild.id, serverId);
                await ephemeralReplyMessage.edit({ content: lang.interaction.modalSubmit.rconRegister.success });
                break;
            }

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
                content: lang.interaction.misc.noPermission,
                ephemeral: true
            });
        }
    }
}

function validationAddress(address: string): [string, number] {
    const inputAddress = address.split(':');
    let port = inputAddress.length === 2 ? Number(inputAddress[1]) : 2302;

    if (0 > port || 65535 < port) {
        throw new Error(lang.interaction.misc.wrongPort);
    }

    const sepIP = inputAddress[0].split('.');

    if (sepIP.length !== 4 || sepIP.map(x => Number(x)).find(v => v < 0 || v > 255)) {
        throw new Error(lang.interaction.misc.wrongIP);
    }

    return [inputAddress[0], port]
}