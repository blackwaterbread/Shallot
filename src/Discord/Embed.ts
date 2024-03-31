import _ from "lodash";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";
import { ServerQueries } from "Types";
import { BIServer, getStorage } from "Storage";
import { judgePing } from "Lib/Utils";
import { Games, SERVER_STATUS_COLOR } from "Types";
import { Arma3ServerQueries } from "Server/Games/Arma3";
import { ArmaResistanceServerQueries } from "Server/Games/ArmaResistance";
import { ArmaReforgerServerQueries } from "Server/Games/ArmaReforger";
import { Interactions } from "./Interactions";

export function getPlayersEmbed(serverId: string, instanceId: string) {
    const storage = getStorage();
    const instance = storage.get(serverId)!.servers.get(instanceId);
    if (!instance) return;

    const { hostname, players } = instance.information;
    const p = players.map(x => x.name).join('\n');
    const time = DateTime.now().toMillis();
    const embed = new EmbedBuilder()
        .setColor(SERVER_STATUS_COLOR['discord'])
        .setTitle(':playground_slide: 플레이어 현황')
        .setDescription(`${hostname}\n\n\`\`\`\n${p}\n\`\`\``)
        .setImage('https://files.hirua.me/images/width.png')
        .setTimestamp(time)
        .setFooter({ text: '플레이어 확인 버튼을 누른 시점의 목록입니다.', iconURL: 'https://files.hirua.me/images/status/warning.png' });

    return { content: '', embeds: [embed], ephemeral: true };
}

export function getServerRconEmbed(key: string, instance: BIServer) {
    const time = DateTime.now().toMillis();
    const { type, nonce, priority, connect, discord, information, rcon, connection } = instance;
    const { adminStartRcon, adminRconRegister, adminRconDelete, serverModify, serverDelete } = Interactions.button;
    const status = connection.status ? 'connected' : 'disconnected';
    const game = Games[type];
    const isRconEnabled = rcon ? true : false;
    const isRconAvailable = rcon ? true : !(type === 'armaresistance');
    // const owned = getRconOwnedString(rconSession);

    const rconSessionButton = new ButtonBuilder()
        .setCustomId(`${adminStartRcon}_${key}`)
        .setLabel('RCon 세션 시작/중단')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!isRconEnabled);

    const rconActiveButton = new ButtonBuilder()
        .setCustomId(rcon ? `${adminRconDelete}_${key}` : `${adminRconRegister}_${key}`)
        .setLabel(rcon ? 'RCon 비활성화' : 'RCon 활성화')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isRconAvailable);

    const modifyButton = new ButtonBuilder()
        .setCustomId(`${serverModify}_${key}`)
        .setLabel('수정')
        .setStyle(ButtonStyle.Secondary);

    const delButton = new ButtonBuilder()
        .setCustomId(`${serverDelete}_${connect.host}:${connect.port}`)
        .setLabel('서버 삭제')
        .setStyle(ButtonStyle.Danger);

    const onlineRow = new ActionRowBuilder()
        .addComponents(rconSessionButton)
        .addComponents(rconActiveButton)
        .addComponents(modifyButton)
        .addComponents(delButton);

    const offlineRow = new ActionRowBuilder()
        .addComponents(modifyButton)
        .addComponents(delButton);

    return {
        content: '',
        embeds: [
            new EmbedBuilder()
                .setColor(SERVER_STATUS_COLOR[status])
                .setTitle(information.hostname)
                .setDescription(
                    `${game.name}` +
                    "```\n" + `${key}` + "\n```"
                )
                .setAuthor({
                    name: discord.owner.displayName,
                    url: discord.owner.url,
                    iconURL: discord.owner.avatarUrl
                })
                .addFields(
                    // { name: 'RCon 점유', value: owned, inline: false },
                    { name: 'RCon 활성화', value: `${rcon ? true : false}`, inline: true },
                    { name: '우선권', value: `${priority}`, inline: true },
                    { name: '컨텐츠 해시', value: `${information.addonsHash ? information.addonsHash : 'None'}`, inline: true },
                )
                .setImage('https://files.hirua.me/images/width.png')
                .setTimestamp(time)
                .setFooter({ text: 'Updated: ' })
        ],
        components: connection.status ? [onlineRow] : [offlineRow]
    }
}

export function getServerInformationEmbed(messageId: string, queries: ServerQueries, instance: BIServer, memo?: string) {
    const owner = instance.discord.owner;
    const ping = judgePing(queries.online?.info.ping);
    const time = DateTime.now().toMillis();
    const key = `${queries.connect.host}:${queries.connect.port}`;
    const { serverCheckPlayers } = Interactions.button;

    const playersButton = new ButtonBuilder()
        .setCustomId(`${serverCheckPlayers}_${key}`)
        .setLabel('플레이어 확인')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!queries);

    const row = new ActionRowBuilder()
        .addComponents(playersButton);

    let embed;
    const banner = queries.online ?
        `https://files.hirua.me/images/games/${queries.game}_banner_online.png` :
        `https://files.hirua.me/images/games/${queries.game}_banner_offline.png`;

    if (queries.online) {
        switch (queries.game) {
            case 'arma3': {
                queries as Arma3ServerQueries;
                const { info, tags, rules } = queries.online;
                const CDLCs = Object.entries(rules.mods)
                    .filter(([k, v]) => v.isDLC === true)
                    .map(([k, v]) => `[${k}](https://store.steampowered.com/app/${v.steamid})`);

                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR['connected'])
                    .setTitle(info.name)
                    // .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    .setAuthor({
                        name: owner.displayName,
                        url: owner.url,
                        iconURL: owner.avatarUrl
                    })
                    .setDescription(
                        `[**[프리셋 다운로드]**](https://files.hirua.me/presets/${messageId}.html)` +
                        // `BattlEye ${tags.battleEye ? 'On' : 'Off'}` +
                        "```\n" + info.connect + "\n```"
                    )
                    // .setThumbnail(thumbnail)
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
                    .setImage(banner)
                    .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms` });

                break;
            }
            case 'armareforger': {
                queries as ArmaReforgerServerQueries;
                const { info } = queries.online;
                const { host, port } = instance.connect;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR['connected'])
                    .setTitle(info.name)
                    // .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    .setAuthor({
                        name: owner.displayName,
                        url: owner.url,
                        iconURL: owner.avatarUrl
                    })
                    .setDescription(
                        "Arma Reforger" +
                        "```\n" + `${host}:${port}` + "\n```"
                    )
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: '맵', value: info.map, inline: false },
                        { name: '버전', value: info.version, inline: true },
                        { name: '플레이어', value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
                    )
                    .setImage(banner)
                    .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms` });

                break;
            }
            case 'armaresistance': {
                queries as ArmaResistanceServerQueries;
                const { info } = queries.online;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR['connected'])
                    .setTitle(queries.online.info.name)
                    .setURL('https://discord.gg/9HzjsbjDD9')
                    .setAuthor({
                        name: owner.displayName,
                        url: owner.url,
                        iconURL: owner.avatarUrl
                    })
                    .setDescription("Operation FlashPoint: Resistance" + "```\n" + info.connect + "\n```")
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: '모드', value: _.isEmpty(info.raw.mod) ? '--' : info.raw.mod, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: '상태', value: info.raw.gamemode, inline: false },
                        { name: '맵', value: _.isEmpty(info.map) ? '없음' : info.map, inline: true },
                        { name: '버전', value: info.raw.gamever.toString(), inline: true },
                        { name: '플레이어', value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
                    )
                    .setImage(banner)
                    .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms` });

                break;
            }
        }
    }

    else {
        const status = instance.connection.count > 0 ? 'losing' : 'disconnected';
        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[status])
            .setTitle('오프라인')
            // .setURL(`https://files.hirua.me/presets/${message.id}.html`)
            .setAuthor({
                name: owner.displayName,
                url: owner.url,
                iconURL: owner.avatarUrl
            })
            .setDescription("```\n" + `${queries.connect.host}:${queries.connect.port}` + "\n```")
            // .setThumbnail(thumbnail)
            .addFields(
                { name: '상태', value: 'None', inline: false },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage(banner)
            .setTimestamp(time)
            .setFooter({ text: 'Offline' });
    }

    return { content: '', embeds: [embed], components: [row as any] };
}