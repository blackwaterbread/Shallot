import _ from "lodash";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";
import { ServerQueries } from "Server";
import Config, { InstanceUser, getStorage } from "Config";
import { judgePing } from "Lib/Utils";
import { SERVER_STATUS_COLOR } from "Types";
import { Arma3ServerQueries } from "Server/Games/Arma3";
import { ArmaResistanceServerQueries } from "Server/Games/ArmaResistance";

export function getPlayersEmbed(serverId: string, instanceId: string) {
    const storage = getStorage();
    const instance = storage.get(serverId)!.instances.get(instanceId);
    if (!instance) return;

    const players = instance.players.map(x => x.name).join('\n');
    const time = DateTime.now().toMillis();
    const embed = new EmbedBuilder()
        .setColor(SERVER_STATUS_COLOR['discord'])
        .setTitle(':playground_slide: 플레이어 현황')
        .setDescription(`${instance.hostname}\n\n\`\`\`\n${players}\n\`\`\``)
        .setImage('https://files.hirua.me/images/width.png')
        .setTimestamp(time)
        .setFooter({ text: '(주의) 이 임베드는 실시간으로 갱신되지 않습니다.', iconURL: 'https://files.hirua.me/images/status/warning.png' });

    // await interaction.reply({ content: '', embeds: [embed], ephemeral: true });
    return { content: '', embeds: [embed], ephemeral: true };
}

export function getServerEmbed(queries: ServerQueries, messageId: string, user: InstanceUser, memo?: string) {
    const ping = judgePing(queries.online?.info.ping);
    const status = queries.online ? 'connected' : 'disconnected';
    const time = DateTime.now().toMillis();
    const key = `${queries.connect.host}:${queries.connect.port}`;

    const playersButton = new ButtonBuilder()
        .setCustomId(`checkPlayers_${key}`)
        .setLabel('플레이어 확인')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!queries);

    const row = new ActionRowBuilder()
        .addComponents(playersButton);

    let embed;
    const thumbnail = queries.online ? 
        `https://files.hirua.me/images/thumbnail/${queries.game}_online.png` : 
        `https://files.hirua.me/images/thumbnail/${queries.game}_offline.png`;

    if (queries.online) {
        switch (queries.game) {
            case 'arma3': {
                queries as Arma3ServerQueries;
                const { info, tags, rules } = queries.online;
                const CDLCs = Object.entries(rules.mods)
                    .filter(([k, v]) => v.isDLC === true)
                    .map(([k, v]) => `[${k}](https://store.steampowered.com/app/${v.steamid})`);

                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[status])
                    .setTitle(info.name)
                    .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    .setAuthor({
                        name: user.displayName,
                        url: user.url,
                        iconURL: user.avatarUrl
                    })
                    .setDescription(
                        "Arma 3 | " +
                        `BattlEye ${tags.battleEye ? 'On' : 'Off'}` +
                        "\n```\n" + info.connect +
                        "\n```"
                    )
                    .setThumbnail(thumbnail)
                    .addFields(
                        { name: '모드', value: info.raw.game, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: '상태', value: tags.serverState, inline: false },
                        { name: '맵', value: info.map, inline: true },
                        { name: '버전', value: info.version, inline: true },
                        { name: '플레이어', value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: 'CDLC', value: `${CDLCs.length < 1 ? '없음' : `${CDLCs.join('\n')}`}`, inline: false },
                        // { name: '배틀아이', value: queries.tags.battleEye ? '적용' : '미적용', inline: true },
                        { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
                    )
                    .setImage('https://files.hirua.me/images/announcement.png')
                    .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms`, iconURL: `https://files.hirua.me/images/status/${ping}` });

                break;
            }
            /*
            case 'armareforger': {
                break;
            }
            */
            case 'armaresistance': {
                queries as ArmaResistanceServerQueries;
                const { info } = queries.online;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[status])
                    .setTitle(queries.online.info.name)
                    .setURL('https://discord.gg/9HzjsbjDD9')
                    .setAuthor({
                        name: user.displayName,
                        url: user.url,
                        iconURL: user.avatarUrl
                    })
                    .setDescription("Operation FlashPoint: Resistance" + "\n```\n" + info.connect + "\n```")
                    .setThumbnail(thumbnail)
                    .addFields(
                        { name: '모드', value: _.isEmpty(info.raw.mod) ? '--' : info.raw.mod, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: '상태', value: info.raw.gamemode, inline: false },
                        { name: '맵', value: _.isEmpty(info.map) ? '없음' : info.map, inline: true },
                        { name: '버전', value: info.raw.gamever.toString(), inline: true },
                        { name: '플레이어', value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
                    )
                    .setImage('https://files.hirua.me/images/banner.png')
                    .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms`, iconURL: `https://files.hirua.me/images/status/${ping}` });

                break;
            }
        }
    }

    else {
        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[status])
            .setTitle('오프라인')
            // .setURL(`https://files.hirua.me/presets/${message.id}.html`)
            .setAuthor({
                name: user.displayName,
                url: user.url,
                iconURL: user.avatarUrl
            })
            .setDescription("Arma 3" + "\n```\n" + `${queries.connect.host}:${queries.connect.port}` + "\n```")
            .setThumbnail(thumbnail)
            .addFields(
                { name: '상태', value: '오프라인', inline: false },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage('https://files.hirua.me/images/offline.png')
            .setTimestamp(time)
            .setFooter({ text: 'Offline', iconURL: `https://files.hirua.me/images/status/${ping}` });
    }

    // await message.edit({ content: '', embeds: [embed], components: [row as any] });
    return { content: '', embeds: [embed], components: [row as any] };
}