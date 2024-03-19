import _ from "lodash";
import fs from 'fs';
import { Interaction, PermissionsBitField, TextChannel } from "discord.js";
import { AvailableGame } from "Types";
import { registerStanbyMessage } from "./Message";
import { getInstances, savePresetHtml, saveInstances } from "Config";
import { getServerEmbed, getPlayersEmbed } from "./Embed";
import { channelTrack, logError, logNormal, userTrack } from "Lib/Log";
import { createRegisterModal } from "./Modal";
import { ServerQueries } from "Server";
import { queryArma3 } from "Server/Games/Arma3";
import { queryArmaResistance } from "Server/Games/ArmaResistance";
import { queryArmaReforger } from "Server/Games/ArmaReforger";

export async function handleInteractions(interaction: Interaction) {
    if (!interaction.guild) return;

    const storage = getInstances();
    const guild = interaction.guild;
    const server = storage.get(guild.id);

    if (!server) return;

    const { channelId } = server.channels.servers;
    const { cache } = interaction.client.channels;
    const { user, channel } = interaction;

    if (!channel) return;

    const serverChannel = await cache.get(channelId)?.fetch() as TextChannel;
    if (!serverChannel) {
        logError(`[App|Discord] ModalSubmitInteract: 등록된 서버가 아닙니다: ${channelTrack(channel)}`);
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
                const target = Array.from(server.instances).find(([k, v]) => v.registeredUser.id === user.id);
                if (target) {
                    const key = target[0];
                    const instance = server.instances.get(key)!;
                    const message = await serverChannel.messages.fetch(instance.messageId);
                    await message.delete();
                    await interaction.reply({
                        content: ':wave: 등록하신 서버가 삭제되었습니다.',
                        ephemeral: true
                    });
                    if (fs.existsSync(instance.presetPath)) fs.unlinkSync(instance.presetPath);
                    server.instances.delete(key);
                    saveInstances();
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

                if (server) {
                    const instanceKey = `${ipAddr}:${port}`;
                    const isAlreadyExist = server.instances.has(instanceKey);
                    const isUserAlreadyRegistered = Array.from(server.instances).find(([k, v]) => v.registeredUser.id === user.id);
                    const isAdmin = permissions.has(PermissionsBitField.Flags.Administrator);

                    if (isAlreadyExist) {
                        await ephemeralReplyMessage.edit({ content: ':x: 이미 리스트에 존재하는 서버입니다.' });
                        return;
                    }

                    if (!isAdmin && isUserAlreadyRegistered) {
                        await ephemeralReplyMessage.edit({ content: ':x: 서버는 1인당 하나만 등록할 수 있습니다.' });
                        return;
                    }

                    let stanbyMessage;
                    let serverQueries: ServerQueries;
                    let presetPath: string;
                    let embed;
                    const instanceUser = {
                        id: user.id,
                        displayName: user.displayName,
                        url: `https://discordapp.com/users/${user.id}`,
                        avatarUrl: user.avatarURL() ?? ''
                    }

                    /* quering server */
                    try {
                        stanbyMessage = await registerStanbyMessage(serverChannel);
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
                                await stanbyMessage.delete();
                                await ephemeralReplyMessage.edit({ content: ':x: 잘못된 customId입니다.' });
                                return;
                            }
                        }
                        if (!serverQueries.online) {
                            await stanbyMessage.delete();
                            await ephemeralReplyMessage.edit({ content: ':x: 서버에 연결할 수 없습니다.' });
                            return;
                        }
                        else {
                            const { info, tags, rules, preset } = serverQueries.online;
                            presetPath = savePresetHtml(stanbyMessage.id, preset);
                            const instance = {
                                isPriority: isAdmin,
                                hostname: info.name,
                                messageId: stanbyMessage.id,
                                game: serverQueries.game,
                                registeredUser: instanceUser,
                                connect: {
                                    host: ipAddr,
                                    port: port,
                                },
                                players: info.players.map((x: any) => ({
                                    name: x.name,
                                    // score: x.raw.score,
                                    // time: x.raw.time
                                })),
                                memo: serverMemo,
                                disconnectedFlag: 4,
                                loadedContentHash: tags?.loadedContentHash ?? '',
                                presetPath: presetPath
                            };
                            embed = getServerEmbed(stanbyMessage.id, serverQueries, instance, serverMemo);
                            server.instances.set(instanceKey, instance);
                            saveInstances();

                            await stanbyMessage.edit(embed as any);
                            await ephemeralReplyMessage.edit({ content: ':white_check_mark: 서버가 등록되었습니다.' });
                            logNormal(`[Discord] 서버 등록: [${serverQueries.game},${info.connect}]${userTrack(user)}`);
                        }
                    }
                    catch (e) {
                        await stanbyMessage?.delete();
                        logError(`[App|Discord] Error while registering server: ${e}, ${userTrack(user)}`);
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