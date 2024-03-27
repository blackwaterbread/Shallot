import _ from "lodash";
import fs from 'fs';
import crypto from 'crypto';
import { Interaction, PermissionsBitField, TextChannel } from "discord.js";
import { AvailableGame } from "Types";
import { registerStanbyMessage } from "./Message";
import { getInstances, saveInstances, Instance } from "Config";
import { getServerInformationEmbed, getPlayersEmbed, getServerRconEmbed } from "./Embed";
import { logError, logNormal, messageTrack, userTrack } from "Lib/Log";
import { createRegisterModal } from "./Modal";
import { ServerQueries } from "Server";
import { queryArma3, savePresetHtml } from "Server/Games/Arma3";
import { queryArmaResistance } from "Server/Games/ArmaResistance";
import { queryArmaReforger } from "Server/Games/ArmaReforger";
import { startRefresher, stopRefresher } from "Lib/Refresher";

export async function handleInteractions(interaction: Interaction) {
    if (!interaction.guild) return;

    const storage = getInstances();
    const guild = interaction.guild;
    const serverInstance = storage.get(guild.id);

    if (!serverInstance) return;

    const { channelId: listChannelId } = serverInstance.channels.list;
    const { channelId: rconChannelId } = serverInstance.channels.rcon;
    const { cache } = interaction.client.channels;
    const { user, channel } = interaction;

    if (!channel) return;

    const listChannel = await cache.get(listChannelId)?.fetch() as TextChannel;
    const rconChannel = await cache.get(rconChannelId)?.fetch() as TextChannel;

    if (!listChannel || !rconChannel) {
        logError('[App|Discord] handleInteractions: 채널 정보를 등록하지 않았습니다.');
        return;
    }

    /* Button Interaction */
    if (interaction.isButton()) {
        const buttonId = interaction.customId.split('_'); // arma3 reforger ofpres delete
        switch (buttonId[0]) {
            case 'register': {
                const modal = createRegisterModal(buttonId[1] as AvailableGame);
                await interaction.showModal(modal);
                break;
            }
            case 'delete': {
                const target = Array.from(serverInstance.instances).find(([k, v]) => k === buttonId[1]);
                if (target) {
                    stopRefresher();
                    const key = target[0];
                    const instance = serverInstance.instances.get(key)!;

                    const [statusMessage, rconMessage] = await Promise.all([
                        listChannel.messages.fetch(instance.discord.statusEmbedMessageId),
                        rconChannel.messages.fetch(instance.discord.rconEmbedMessageId)
                    ]);

                    await Promise.all([
                        statusMessage.delete(),
                        rconMessage.delete()
                    ]);

                    await interaction.reply({
                        content: ':wave: 등록하신 서버가 삭제되었습니다.',
                        ephemeral: true
                    });

                    if (fs.existsSync(instance.presetPath)) fs.unlinkSync(instance.presetPath);
                    serverInstance.instances.delete(key);
                    saveInstances();
                    startRefresher();
                }
                break;
            }
            case 'checkPlayers': {
                const targetId = buttonId[1];
                const embed = getPlayersEmbed(guild.id, targetId);
                await interaction.reply(embed as any);
                break;
            }
            default: {
                logError(`[App] 등록되지 않은 버튼 상호작용: ${buttonId}`);
                break;
            }
        }
    }

    /* ModalSubmit Interaction */
    else if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        const permissions = interaction.member!.permissions as Readonly<PermissionsBitField>;
        const serverAddress = interaction.fields.getTextInputValue('serverAddress').split(':'); // 127.0.0.1:8080
        const serverMemo = interaction.fields.getTextInputValue('serverMemo');
        const ephemeralReplyMessage = await interaction.reply({
            content: ':tools: 유효성 확인 중입니다...',
            ephemeral: true
        });

        let port = serverAddress.length === 2 ? Number(serverAddress[1]) : 2302;
        if (0 > port || 65535 < port) {
            await ephemeralReplyMessage.edit({ content: ':x: 잘못된 포트입니다. 포트는 0 ~ 65535의 범위를 가집니다.' });
        }

        const sepIP = serverAddress[0].split('.');
        if (sepIP.length === 4) {
            if (sepIP.map(x => Number(x)).find(v => v < 0 || v > 255)) {
                await ephemeralReplyMessage.edit({ content: ':x: 잘못된 IP입니다. IP 주소는 0 ~ 255의 범위를 가집니다.' });
            }

            else {
                const ipAddr = serverAddress[0];
                await ephemeralReplyMessage.edit({ content: ':rocket: 서버 연결 중입니다...' });

                if (serverInstance) {
                    const instanceKey = `${ipAddr}:${port}`;
                    const isAlreadyExist = serverInstance.instances.has(instanceKey);
                    const isUserAlreadyRegistered = Array.from(serverInstance.instances).find(([k, v]) => v.discord.owner.id === user.id);
                    const isAdmin = permissions.has(PermissionsBitField.Flags.Administrator);

                    if (isAlreadyExist) {
                        await ephemeralReplyMessage.edit({ content: ':x: 이미 리스트에 존재하는 서버입니다.' });
                        return;
                    }

                    if (!isAdmin && isUserAlreadyRegistered) {
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

                    /* quering server */
                    try {
                        statusMessage = await registerStanbyMessage(listChannel);
                        rconMessage = await registerStanbyMessage(rconChannel);
                        logNormal(`[Discord] 서버 Embed 생성 시도: ${messageTrack(statusMessage)}`);
                        switch (customId) {
                            case 'modal_arma3': {
                                serverQueries = await queryArma3({ host: ipAddr, port: port });
                                break;
                            }
                            case 'modal_armareforger': {
                                serverQueries = await queryArmaReforger({ host: ipAddr, port: port });
                                break;
                            }
                            case 'modal_armaresistance': {
                                serverQueries = await queryArmaResistance({ host: ipAddr, port: port });
                                break;
                            }
                            default: {
                                await statusMessage.delete();
                                await ephemeralReplyMessage.edit({ content: ':x: 잘못된 customId입니다.' });
                                return;
                            }
                        }
                        if (!serverQueries.online) {
                            await statusMessage.delete();
                            await rconMessage.delete();
                            await ephemeralReplyMessage.edit({ content: ':x: 서버에 연결할 수 없습니다.' });
                            return;
                        }
                        else {
                            const { info, tags, rules, preset } = serverQueries.online;
                            presetPath = savePresetHtml(statusMessage.id, preset);
                            const instance: Instance = {
                                type: serverQueries.game,
                                nonce: crypto.randomBytes(4).toString('hex'),
                                priority: isAdmin,
                                connect: { host: ipAddr, port: port, },
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
                                    memo: serverMemo,
                                    addonsHash: tags?.loadedContentHash ?? '',
                                    lastQueries: serverQueries
                                },
                                rcon: {
                                    enabled: false,
                                    port: 0,
                                    password: '',
                                    owned: null
                                },
                                connection: {
                                    status: true,
                                    count: 4
                                }
                            };
                            statusEmbed = getServerInformationEmbed(statusMessage.id, serverQueries, instance, serverMemo);
                            rconEmbed = getServerRconEmbed(instanceKey, instance);
                            serverInstance.instances.set(instanceKey, instance);
                            saveInstances();

                            await statusMessage.edit(statusEmbed as any);
                            await rconMessage.edit(rconEmbed as any);
                            await ephemeralReplyMessage.edit({ content: ':white_check_mark: 서버가 등록되었습니다.' });
                            logNormal(`[Discord] 서버 등록: [${serverQueries.game},${info.connect}]${userTrack(user)}`);
                        }
                    }
                    catch (e) {
                        await statusMessage?.delete();
                        await rconMessage?.delete();
                        logError(`[App|Discord] Error while registering server: ${e}`);
                        await ephemeralReplyMessage.edit({ content: ':x: Shallot 오류로 인해 서버에 연결할 수 없습니다.' });
                        return;
                    }
                }
                else {
                    logError(`[App|Discord] 등록된 서버에서 온 상호작용이 아닙니다: [${interaction.guild?.id}, ${interaction.guild?.name}]`);
                }
            }
        }
        else {
            await ephemeralReplyMessage.edit({ content: ':x: 잘못된 IP입니다.' });
        }
    }
}