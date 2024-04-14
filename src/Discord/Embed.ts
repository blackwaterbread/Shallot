import _ from "lodash";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { DateTime } from "luxon";
import { CommonServerQueries, ServerQueries } from "Types";
import { BIServer, getStorage } from "Storage";
import { getConfigs } from "Config";
import { Games, SERVER_STATUS_COLOR } from "Types";
import { Arma3ServerQueries } from "Server/Games/Arma3";
import { ArmaResistanceServerQueries } from "Server/Games/ArmaResistance";
import { ArmaReforgerServerQueries } from "Server/Games/ArmaReforger";
import { Interactions } from "./Interactions";
import { getStringTable } from "Language";

const configs = getConfigs();
const lang = getStringTable();

export function getNoticeEmbed() {
    const embed = new EmbedBuilder()
        .setTitle(lang.embed.notice.title)
        .setDescription(
            lang.embed.notice.description
        )
        // .setImage('https://files.hirua.me/images/width.png');
        .setImage(configs.static ? `${configs.static?.url}/images/width.png` : null);

    return {
        embeds: [embed]
    }
}

export function getServerRegisterInteractionEmbed() {
    const { serverRegister } = Interactions.button;
    const { arma3, armareforger, armaresistance } = Games;

    const embed = new EmbedBuilder()
        .setColor(0x41F097)
        .setTitle(lang.embed.serverRegister.title)
        .setDescription(lang.embed.serverRegister.description)
        // .setImage('https://files.hirua.me/images/width.png')
        .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
        .setFooter({ text: 
            lang.embed.serverRegister.footer
        });

    const arma3Button = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${arma3.type}`)
        .setLabel(lang.embed.serverRegister.button.labelArma3)
        .setStyle(ButtonStyle.Primary)

    const reforgerButton = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${armareforger.type}`)
        .setLabel(lang.embed.serverRegister.button.labelReforger)
        .setStyle(ButtonStyle.Primary)

    const ofpButton = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${armaresistance.type}`)
        .setLabel(lang.embed.serverRegister.button.labelOfp)
        .setStyle(ButtonStyle.Primary)

    const row = new ActionRowBuilder()
        .addComponents(arma3Button, reforgerButton, ofpButton);

    return {
        embeds: [embed],
        components: [row as any]
    }
}

export function getServerDeleteInteractionEmbed() {
    const { serverDelete } = Interactions.button;

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(lang.embed.serverDelete.title)
        .setDescription(lang.embed.serverDelete.description)
        .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
        .setFooter({ text: lang.embed.serverDelete.footer });

    const del = new ButtonBuilder()
        .setCustomId(`${serverDelete}_user`)
        .setLabel(lang.embed.serverDelete.button.labelDetele)
        .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder()
        .addComponents(del);

    return {
        embeds: [embed],
        components: [row as any]
    }
}

export function getPlayersEmbed(serverId: string, instanceId: string) {
    const storage = getStorage();
    const instance = storage.get(serverId)!.servers.get(instanceId);
    if (!instance) return;

    const { hostname, players } = instance.information;
    const p = players.map(x => x.name).join('\n');
    const time = DateTime.now().toMillis();
    const embed = new EmbedBuilder()
        .setColor(SERVER_STATUS_COLOR['discord'])
        .setTitle(lang.embed.players.title)
        .setDescription(`${hostname}\n\n\`\`\`\n${p}\n\`\`\``)
        .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
        .setTimestamp(time)
        .setFooter({ text: lang.embed.players.footer });

    return { content: '', embeds: [embed], ephemeral: true };
}

export function getMaintenanceEmbed(key: string, server: BIServer) {
    const time = DateTime.now().toMillis();
    const { type } = server;
    const game = Games[type];

    return {
        content: '',
        embeds: [
            new EmbedBuilder()
                .setColor(SERVER_STATUS_COLOR['discord'])
                .setTitle(lang.embed.maintenance.title)
                .setDescription(
                    `${game.name}` +
                    "```\n" + `${key}` + "\n```\n" +
                    lang.embed.maintenance.description
                )
                .setImage(configs.static ? `${configs.static.url}/images/maintenance.png` : null)
                .setTimestamp(time)
        ],
        components: []
    }
}

export function getServerRconEmbed(key: string, server: BIServer) {
    const time = DateTime.now().toMillis();
    const { type, priority, connect, discord, information, rcon, connection } = server;
    const { adminRconRegister, adminRconDelete, serverModify, serverDelete } = Interactions.button;
    const game = Games[type];
    const isRconAvailable = rcon ? true : !(type === 'armaresistance');

    const rconActiveButton = new ButtonBuilder()
        .setCustomId(rcon ? `${adminRconDelete}_${key}` : `${adminRconRegister}_${key}`)
        .setLabel(rcon ? lang.embed.rcon.button.labelRconDeactivate : lang.embed.rcon.button.labelRconActivate)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isRconAvailable);

    const modifyButton = new ButtonBuilder()
        .setCustomId(`${serverModify}_${key}`)
        .setLabel(lang.embed.rcon.button.labelServerModify)
        .setStyle(ButtonStyle.Secondary);

    const delButton = new ButtonBuilder()
        .setCustomId(`${serverDelete}_${connect.host}:${connect.port}`)
        .setLabel(lang.embed.rcon.button.labelServerDelete)
        .setStyle(ButtonStyle.Danger);

    const onlineRow = new ActionRowBuilder()
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
                .setColor(SERVER_STATUS_COLOR[connection.status])
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
                    { name: lang.embed.rcon.field.nameRconActivated, value: `${rcon ? true : false}`, inline: true },
                    { name: lang.embed.rcon.field.namePriority, value: `${priority}`, inline: true },
                    { name: lang.embed.rcon.field.nameAddonsHash, value: `${information.addonsHash ? information.addonsHash : 'None'}`, inline: true },
                )
                .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
                .setTimestamp(time)
                .setFooter({ text: 'Updated: ' })
        ],
        components: connection.status ? [onlineRow] : [offlineRow] as any
    }
}

export function getServerStatusEmbed(messageId: string, queries: CommonServerQueries, server: BIServer, memo?: string) {
    const { discord, connection } = server;
    // const ping = judgePing(queries.online?.info.ping);
    const time = DateTime.now().toLocaleString(DateTime.TIME_WITH_SECONDS);
    const key = `${queries.connect.host}:${queries.connect.port}`;
    const presetLink = `${configs.static?.url}/presets/${messageId}-${server.information.addonsHash}.html`;
    const presetLabel = configs.static ? `[**[${lang.embed.serverStatus.arma3.presetDownload}]**](${presetLink})` : '';
    const { serverCheckPlayers } = Interactions.button;

    const playersButton = new ButtonBuilder()
        .setCustomId(`${serverCheckPlayers}_${key}`)
        .setLabel(lang.embed.serverStatus.button.labelCheckPlayers)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!queries);

    const row = new ActionRowBuilder()
        .addComponents(playersButton);

    let embed;
    const banner =  configs.static ? 
        (queries.online ?
            `${configs.static.url}/images/games/${queries.game}_banner_online.png` :
            `${configs.static.url}/images/games/${queries.game}_banner_offline.png`
        ) : null;

    if (queries.online) {
        switch (queries.game) {
            case 'arma3': {
                const assertedQueries = queries.online as Arma3ServerQueries;
                const { info, tags, rules } = assertedQueries;
                const CDLCs = Object.entries(rules.mods)
                    .filter(([k, v]) => v.isDLC === true)
                    .map(([k, v]) => `[${k}](https://store.steampowered.com/app/${v.steamid})`);

                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[connection.status])
                    .setTitle(info.name)
                    // .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    .setAuthor({
                        name: discord.owner.displayName,
                        url: discord.owner.url,
                        iconURL: discord.owner.avatarUrl
                    })
                    .setDescription(
                        presetLabel + "```" + info.connect + "```"
                    )
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: lang.embed.serverStatus.arma3.field.labelMod, value: info.raw.game, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: lang.embed.serverStatus.arma3.field.labelStatus, value: tags.serverState, inline: false },
                        { name: lang.embed.serverStatus.arma3.field.labelMap, value: info.map, inline: true },
                        { name: lang.embed.serverStatus.arma3.field.labelVersion, value: info.version, inline: true },
                        { name: lang.embed.serverStatus.arma3.field.labelPlayers, value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: lang.embed.serverStatus.arma3.field.labelCDLC, value: `${CDLCs.length < 1 ? lang.none : `${CDLCs.join('\n')}`}`, inline: false },
                        // { name: '배틀아이', value: queries.tags.battleEye ? '적용' : '미적용', inline: true },
                        { name: lang.embed.serverStatus.arma3.field.labelMemo, value: `> ${memo ? memo : lang.embed.serverStatus.labelBlankMemo}`, inline: false },
                    )
                    .setImage(banner)
                    // .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms, ${time}` });

                break;
            }

            case 'armareforger': {
                const assertedQueries = queries.online as ArmaReforgerServerQueries;
                const { info } = assertedQueries;
                const { host, port } = server.connect;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[connection.status])
                    .setTitle(info.name)
                    // .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    .setAuthor({
                        name: discord.owner.displayName,
                        url: discord.owner.url,
                        iconURL: discord.owner.avatarUrl
                    })
                    .setDescription(
                        "```" + `${host}:${port}` + "```"
                    )
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: lang.embed.serverStatus.armareforger.field.labelMap, value: info.map, inline: false },
                        { name: lang.embed.serverStatus.armareforger.field.labelVersion, value: info.version, inline: true },
                        { name: lang.embed.serverStatus.armareforger.field.labelPlayers, value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: lang.embed.serverStatus.armareforger.field.labelMemo, value: `> ${memo ? memo : lang.embed.serverStatus.labelBlankMemo}`, inline: false },
                    )
                    .setImage(banner)
                    // .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms, ${time}` });

                break;
            }

            case 'armaresistance': {
                const assertedQueries = queries.online as ArmaResistanceServerQueries;
                const { info } = assertedQueries;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[connection.status])
                    .setTitle(queries.online.info.name)
                    .setURL('https://discord.gg/9HzjsbjDD9')
                    .setAuthor({
                        name: discord.owner.displayName,
                        url: discord.owner.url,
                        iconURL: discord.owner.avatarUrl
                    })
                    .setDescription("Operation FlashPoint: Resistance" + "```" + info.connect + "```")
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: lang.embed.serverStatus.armaresistance.field.labelMods, value: _.isEmpty(info.raw.mod) ? '--' : info.raw.mod, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: lang.embed.serverStatus.armaresistance.field.labelStatus, value: info.raw.gamemode, inline: false },
                        { name: lang.embed.serverStatus.armaresistance.field.labelMap, value: _.isEmpty(info.map) ? lang.none : info.map, inline: true },
                        { name: lang.embed.serverStatus.armaresistance.field.labelVersion, value: info.raw.gamever.toString(), inline: true },
                        { name: lang.embed.serverStatus.armaresistance.field.labelPlayers, value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: lang.embed.serverStatus.armaresistance.field.labelMemo, value: `> ${memo ? memo : lang.embed.serverStatus.labelBlankMemo}`, inline: false },
                    )
                    .setImage(banner)
                    // .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms, ${time}` });

                break;
            }
        }
    }

    else {
        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[connection.status])
            .setTitle(lang.embed.serverStatus.offline.title)
            // .setURL(`https://files.hirua.me/presets/${message.id}.html`)
            .setAuthor({
                name: discord.owner.displayName,
                url: discord.owner.url,
                iconURL: discord.owner.avatarUrl
            })
            .setDescription("```" + `${queries.connect.host}:${queries.connect.port}` + "```")
            // .setThumbnail(thumbnail)
            .addFields(
                { name: lang.embed.serverStatus.offline.field.labelMemo, value: `> ${memo ? memo : lang.embed.serverStatus.labelBlankMemo}`, inline: false },
            )
            .setImage(banner)
            //.setTimestamp(time)
            .setFooter({ text: `Offline, ${time}` });
    }

    return { content: '', embeds: [embed as EmbedBuilder], components: [row as any] };
}