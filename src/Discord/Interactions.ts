import { Interaction, TextChannel } from "discord.js";
import fs from 'fs';
import { queryArma3 } from "Server/Arma3";
import { AvailableGame } from "Types";
import { registerStanbyMessage } from "./Message";
import Config, { savePresetHtml, saveStorage } from "Config";
import { registerArma3ServerEmbed, registerArmaResistanceServerEmbed, registerPlayersEmbed } from "./Embed";
import { channelTrack, logError } from "Lib/Log";
import { createRegisterModal } from "./Modal";
import { queryArmaResistance } from "Server/ArmaResistance";

export async function handleInteractions(interaction: Interaction) {
    const storage = Config.storage.get(interaction.guildId!);
    if (!storage) return;

    const guild = interaction.guild!;
    const { user } = interaction;
    const interactChannel = interaction.channel as TextChannel;
    const serverChannel = await interaction.client.channels.fetch(storage.channels.servers.channelId) as TextChannel;

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
                const instance = storage.instances.get(user.id);
                if (!instance) break;
                const message = await serverChannel.messages.fetch(instance.messageId);
                await message.delete();
                await interaction.reply({
                    content: ':wave: 등록하신 서버가 삭제되었습니다.',
                    ephemeral: true
                });
                if (fs.existsSync(instance.presetPath)) fs.unlinkSync(instance.presetPath);
                storage.instances.delete(user.id);
                saveStorage();
                break;
            }
            case 'checkPlayers': {
                const targetId = buttonId[1];
                await registerPlayersEmbed(interaction, guild.id, targetId);
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
        const serverAddress = interaction.fields.getTextInputValue('serverAddress').split(':'); // 127.0.0.1:8080
        const serverMemo = interaction.fields.getTextInputValue('serverMemo');
        const reply = await interaction.reply({
            content: ':tools: 유효성 확인 중입니다...',
            ephemeral: true
        });

        let port = serverAddress.length === 2 ? Number(serverAddress[1]) : 2302;
        if (0 > port || 65535 < port) {
            await reply.edit({ content: ':x: 잘못된 포트입니다. 포트는 0 ~ 65535의 범위를 가집니다.' });
        }

        const sepIP = serverAddress[0].split('.');
        if (sepIP.length === 4) {
            if (sepIP.map(x => Number(x)).find(v => v < 0 || v > 255)) {
                await reply.edit({ content: ':x: 잘못된 IP입니다. IP 주소는 0 ~ 255의 범위를 가집니다.' });
            }
            else {
                if (!serverChannel) {
                    logError(`[App|Discord] ModalInteract: 등록된 서버가 아닙니다: ${channelTrack(interactChannel)}`);
                    return;
                }
                await reply.edit({ content: ':rocket: 서버 연결 중입니다...' });
                if (storage) {
                    /* 1 user 1 server */
                    if (storage.instances.get(interaction.user.id)) {
                        await reply.edit({ content: ':x: 1인당 하나의 서버만 등록할 수 있습니다.' });
                        return;
                    }
                    try {
                        const ipAddr = serverAddress[0];
                        switch (customId) {
                            case 'modal_arma3': {
                                const serverQueries = await queryArma3({ host: ipAddr, port: port });
                                if (!serverQueries) {
                                    await reply.edit({
                                        content: ':x: 서버에 연결할 수 없습니다.'
                                    });
                                    break;
                                }
                                const stanbyMessage = await registerStanbyMessage(serverChannel);
                                const presetPath = savePresetHtml(stanbyMessage.id, serverQueries.preset);
                                const instanceUser = {
                                    id: user.id,
                                    displayName: user.displayName,
                                    url: `https://discordapp.com/users/${user.id}`,
                                    avatarUrl: user.avatarURL() ?? ''
                                }
                                const embed = await registerArma3ServerEmbed(stanbyMessage, instanceUser, user.id, serverQueries, serverMemo);
                                storage.instances.set(user.id, {
                                    isPriority: false,
                                    hostname: serverQueries.info.name,
                                    messageId: embed.message.id,
                                    game: 'arma3',
                                    registeredUser: instanceUser,
                                    connection: {
                                        host: ipAddr,
                                        port: port,
                                    },
                                    players: serverQueries.info.players.map((x: any) => ({
                                        name: x.name, 
                                        score: x.raw.score,
                                        time: x.raw.time
                                    })),
                                    memo: serverMemo,
                                    disconnectedFlag: 4,
                                    loadedContentHash: serverQueries.tags.loadedContentHash,
                                    presetPath: presetPath
                                });
                                await reply.edit({ content: ':white_check_mark: 서버가 등록되었습니다.' });
                                // Config.storage.set(guild!.id, storage);
                                saveStorage();
                                break;
                            }
                            /*
                            case 'modal_armareforger': {
                                break;
                            }
                            */
                            case 'modal_armaresistance': {
                                const serverQueries = await queryArmaResistance({ host: ipAddr, port: port });
                                if (!serverQueries) {
                                    await reply.edit({ content: ':x: 서버에 연결할 수 없습니다.' });
                                    break;
                                }
                                const stanbyMessage = await registerStanbyMessage(serverChannel);
                                const instanceUser = {
                                    id: user.id,
                                    displayName: user.displayName,
                                    url: `https://discordapp.com/users/${user.id}`,
                                    avatarUrl: user.avatarURL() ?? ''
                                }
                                const embed = await registerArmaResistanceServerEmbed(stanbyMessage, instanceUser, user.id, serverQueries, serverMemo);
                                storage.instances.set(user.id, {
                                    isPriority: false,
                                    hostname: serverQueries.info.name,
                                    messageId: embed.message.id,
                                    game: 'armaresistance',
                                    registeredUser: instanceUser,
                                    connection: {
                                        host: ipAddr,
                                        port: port,
                                    },
                                    players: serverQueries.info.players.map((x: any) => ({
                                        name: x.name
                                    })),
                                    memo: serverMemo,
                                    disconnectedFlag: 4,
                                    loadedContentHash: '',
                                    presetPath: ''
                                });
                                await reply.edit({ content: ':white_check_mark: 서버가 등록되었습니다.' });
                                // Config.storage.set(guild!.id, storage);
                                saveStorage();
                                break;
                            }
                        }
                    }
                    catch (e) {
                        logError(`[App|Discord] Error while registering server: ${e}`);
                    }
                }
                else {
                    logError(`[App|Discord] 등록된 서버에서 온 상호작용이 아닙니다: [${interaction.guild?.id}, ${interaction.guild?.name}]`);
                }
            }
        }
        else {
            await reply.edit({ content: ':x: 잘못된 IP입니다.' });
        }
    }
}