import _ from "lodash";
import { Arma3ServerQueries } from "Server/Arma3";
import { SERVER_STATUS_COLOR } from "Types";
import { ArmaResistanceServerQueries } from "Server/ArmaResistance";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import { DateTime } from "luxon";
import Config, { InstanceUser } from "Config";

export function getPlayersEmbed(serverId: string, instanceId: string) {
    const instance = Config.storage.get(serverId)!.instances.get(instanceId);
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

export function getArma3ServerEmbed(messageId: string, user: InstanceUser, instanceId: string, queries?: Arma3ServerQueries, memo?: string) {
    const ping = queries ? queries.info.ping < 80 ? 'good.png' : queries.info.ping > 200 ? 'poor.png' : 'bad.png' : 'poor.png';
    const status = queries ? 'connected' : 'disconnected';
    const time = DateTime.now().toMillis();
    const pp = SERVER_STATUS_COLOR[status];

    const playersButton = new ButtonBuilder()
        .setCustomId(`checkPlayers_${instanceId}`)
        .setLabel('플레이어 확인')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!queries);

    const row = new ActionRowBuilder()
        .addComponents(playersButton);

    let embed;
    if (queries) {
        const CDLCs = Object.entries(queries.rules.mods)
            .filter(([k, v]) => v.isDLC === true)
            .map(([k, v]) => `[${k}](https://store.steampowered.com/app/${v.steamid})`);

        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[status])
            .setTitle(queries.info.name)
            .setURL(`https://files.hirua.me/presets/${messageId}.html`)
            .setAuthor({
                name: user.displayName,
                url: user.url,
                iconURL: user.avatarUrl
            })
            .setDescription(
                "Arma 3 | " +
                `BattlEye ${queries.tags.battleEye ? 'On' : 'Off'}` +
                "\n```\n" + queries.info.connect +
                "\n```"
            )
            .setThumbnail('https://files.hirua.me/images/games/arma3.png')
            .addFields(
                { name: '모드', value: queries.info.raw.game, inline: false },
                // { name: '\u200B', value: '\u200B' },
                { name: '상태', value: queries.tags.serverState, inline: false },
                { name: '맵', value: queries.info.map, inline: true },
                { name: '버전', value: queries.info.version, inline: true },
                { name: '플레이어', value: `${queries.info.numplayers} / ${queries.info.maxplayers}`, inline: true },
                { name: 'CDLC', value: `${CDLCs.length < 1 ? '없음' : `${CDLCs.join('\n')}`}`, inline: false },
                // { name: '배틀아이', value: queries.tags.battleEye ? '적용' : '미적용', inline: true },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage('https://files.hirua.me/images/announcement.png')
            .setTimestamp(time)
            .setFooter({ text: `Online - ${queries.info.ping}ms`, iconURL: `https://files.hirua.me/images/status/${ping}` });

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
            .setDescription("Arma 3" + "\n```\n" + "Offline" + "\n```")
            .setThumbnail('https://files.hirua.me/images/games/arma3_offline.png')
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

export function getArmaResistanceServerEmbed(user: InstanceUser, instanceId: string, queries?: ArmaResistanceServerQueries, memo?: string) {
    const ping = queries ? queries.info.ping < 80 ? 'good.png' : queries.info.ping > 200 ? 'poor.png' : 'bad.png' : 'poor.png';
    const status = queries ? 'connected' : 'disconnected';
    const time = DateTime.now().toMillis();

    const playersButton = new ButtonBuilder()
        .setCustomId(`checkPlayers_${instanceId}`)
        .setLabel('플레이어 확인')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!queries);

    const row = new ActionRowBuilder()
        .addComponents(playersButton);

    let embed;
    if (queries) {
        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[status])
            .setTitle(queries.info.name)
            .setURL('https://discord.gg/9HzjsbjDD9')
            .setAuthor({
                name: user.displayName,
                url: user.url,
                iconURL: user.avatarUrl
            })
            .setDescription("Operation FlashPoint: Resistance" + "\n```\n" + queries.info.connect + "\n```")
            .setThumbnail('https://files.hirua.me/images/games/armaresistance.png')
            .addFields(
                { name: '모드', value: _.isEmpty(queries.info.raw.mod) ? '--' : queries.info.raw.mod, inline: false },
                // { name: '\u200B', value: '\u200B' },
                { name: '상태', value: queries.info.raw.gamemode, inline: false },
                { name: '맵', value: _.isEmpty(queries.info.map) ? '없음' : queries.info.map, inline: true },
                { name: '버전', value: queries.info.raw.gamever.toString(), inline: true },
                { name: '플레이어', value: `${queries.info.numplayers} / ${queries.info.maxplayers}`, inline: true },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage('https://files.hirua.me/images/banner.png')
            .setTimestamp(time)
            .setFooter({ text: `Online - ${queries.info.ping}ms`, iconURL: `https://files.hirua.me/images/status/${ping}` });
    }
    else {
        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[status])
            .setTitle('오프라인')
            .setURL('https://discord.gg/9HzjsbjDD9')
            .setAuthor({
                name: user.displayName,
                url: user.url,
                iconURL: user.avatarUrl
            })
            .setDescription("Operation FlashPoint: Resistance" + "\n```\n" + "Offline" + "\n```")
            .setThumbnail('https://files.hirua.me/images/games/armaresistance_offline.png')
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