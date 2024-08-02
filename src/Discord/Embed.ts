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
import { logError } from "Lib/Log";
import { getRankingTable } from "Lib/Utils";

const Configs = getConfigs();
const Storage = getStorage();
const StringTable = getStringTable();

export function getNoticeEmbed() {
    const embed = new EmbedBuilder()
        .setTitle(StringTable.embed.notice.title)
        .setDescription(
            StringTable.embed.notice.description
        )
        // .setImage('https://files.hirua.me/images/width.png');
        // .setImage(configs.static ? `${configs.static?.url}/images/width.png` : null);
        .setImage(Configs.imagesUrl.blank);

    return {
        embeds: [embed]
    }
}

export function getServerRegisterInteractionEmbed() {
    const { serverRegister } = Interactions.button;
    const { arma3, armareforger, armaresistance } = Games;

    const embed = new EmbedBuilder()
        .setColor(0x41F097)
        .setTitle(StringTable.embed.serverRegister.title)
        .setDescription(StringTable.embed.serverRegister.description)
        // .setImage('https://files.hirua.me/images/width.png')
        // .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
        .setImage(Configs.imagesUrl.blank)
        .setFooter({
            text:
                StringTable.embed.serverRegister.footer
        });

    const arma3Button = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${arma3.type}`)
        .setLabel(StringTable.embed.serverRegister.button.labelArma3)
        .setStyle(ButtonStyle.Primary)

    const reforgerButton = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${armareforger.type}`)
        .setLabel(StringTable.embed.serverRegister.button.labelReforger)
        .setStyle(ButtonStyle.Primary)

    const ofpButton = new ButtonBuilder()
        .setCustomId(`${serverRegister}_${armaresistance.type}`)
        .setLabel(StringTable.embed.serverRegister.button.labelOfp)
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
        .setTitle(StringTable.embed.serverDelete.title)
        .setDescription(StringTable.embed.serverDelete.description)
        // .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
        .setImage(Configs.imagesUrl.blank)
        .setFooter({ text: StringTable.embed.serverDelete.footer });

    const del = new ButtonBuilder()
        .setCustomId(`${serverDelete}_user`)
        .setLabel(StringTable.embed.serverDelete.button.labelDetele)
        .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder()
        .addComponents(del);

    return {
        embeds: [embed],
        components: [row as any]
    }
}

export function getPlayersEmbed(serverId: string, instanceId: string) {
    const instance = Storage.get(serverId)!.servers.get(instanceId);
    if (!instance) return;

    const { hostname, players } = instance.information;
    const p = players.map(x => x.name).join('\n');
    const time = DateTime.now().toMillis();
    const embed = new EmbedBuilder()
        .setColor(SERVER_STATUS_COLOR['discord'])
        .setTitle(StringTable.embed.players.title)
        .setDescription(`${hostname}\n\n\`\`\`\n${p}\n\`\`\``)
        // .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
        .setImage(Configs.imagesUrl.blank)
        .setTimestamp(time)
        .setFooter({ text: StringTable.embed.players.footer });

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
                .setTitle(StringTable.embed.maintenance.title)
                .setDescription(
                    `${game.name}` +
                    "```\n" + `${key}` + "\n```\n" +
                    StringTable.embed.maintenance.description
                )
                // .setImage(configs.static ? `${configs.static.url}/images/maintenance.png` : null)
                .setImage(Configs.imagesUrl.maintenance)
                .setTimestamp(time)
        ],
        components: []
    }
}

export function getServerAdminEmbed(key: string, server: BIServer) {
    const time = DateTime.now().toMillis();
    const { type, priority, maintenance, connect, discord, information, rcon, connection } = server;
    const { serverModify, serverDelete, adminMaintenance, adminRconRegister, adminRconDelete } = Interactions.button;
    const game = Games[type];
    const isRconAvailable = rcon ? true : !(type === 'armaresistance');

    const rconActiveButton = new ButtonBuilder()
        .setCustomId(rcon ? `${adminRconDelete}_${key}` : `${adminRconRegister}_${key}`)
        .setLabel(rcon ? StringTable.embed.rcon.button.labelRconDeactivate : StringTable.embed.rcon.button.labelRconActivate)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isRconAvailable);

    const maintenanceButton = new ButtonBuilder()
        .setCustomId(`${adminMaintenance}_${key}`)
        .setLabel(maintenance ? StringTable.embed.rcon.button.labelServerMaintenanceDeactivate : StringTable.embed.rcon.button.labelServerMaintenanceActivate)
        .setStyle(ButtonStyle.Secondary);

    const modifyButton = new ButtonBuilder()
        .setCustomId(`${serverModify}_${key}`)
        .setLabel(StringTable.embed.rcon.button.labelServerModify)
        .setStyle(ButtonStyle.Secondary);

    const delButton = new ButtonBuilder()
        .setCustomId(`${serverDelete}_${connect.host}:${connect.port}`)
        .setLabel(StringTable.embed.rcon.button.labelServerDelete)
        .setStyle(ButtonStyle.Danger);

    const onlineRow = new ActionRowBuilder()
        .addComponents(rconActiveButton)
        .addComponents(maintenanceButton)
        .addComponents(modifyButton)
        .addComponents(delButton);

    const offlineRow = new ActionRowBuilder()
        .addComponents(modifyButton)
        .addComponents(maintenanceButton)
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
                    { name: StringTable.embed.rcon.field.nameRconActivated, value: `${rcon ? true : false}`, inline: true },
                    { name: StringTable.embed.rcon.field.namePriority, value: `${priority}`, inline: true },
                    { name: StringTable.embed.rcon.field.nameAddonsHash, value: `${information.addonsHash ? information.addonsHash : 'None'}`, inline: true },
                )
                // .setImage(configs.static ? `${configs.static.url}/images/width.png` : null)
                .setImage(Configs.imagesUrl.blank)
                .setTimestamp(time)
                .setFooter({ text: 'Updated: ' })
        ],
        components: connection.status ? [onlineRow] : [offlineRow] as any
    }
}

export function getServerStatusEmbed(queries: CommonServerQueries, server: BIServer, memo?: string) {
    const { connection, information } = server;
    const key = `${queries.connect.host}:${queries.connect.port}`;
    const time = DateTime.now().toLocaleString(DateTime.TIME_WITH_SECONDS);
    const { serverCheckPlayers } = Interactions.button;

    const playersButton = new ButtonBuilder()
        .setCustomId(`${serverCheckPlayers}_${key}`)
        .setLabel(StringTable.embed.serverStatus.button.labelCheckPlayers)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!queries);

    /*
    const connectButton = new ButtonBuilder()
        .setLabel(lang.embed.serverStatus.button.labelConnect)
        .setStyle(ButtonStyle.Link)
        .setDisabled(!queries);
    */

    const row = new ActionRowBuilder().addComponents(playersButton);
    let embed;

    /*
    const banner =  configs.static ? 
        (queries.query ?
            `${configs.static.url}/images/banner/${queries.game}_banner_online.png` :
            `${configs.static.url}/images/banner/${queries.game}_banner_offline.png`
        ) : null;
 
    const bannerType = configs.imagesUrl.game[queries.game];
    const bannerUrl = queries.query ? bannerType.online : bannerType.offline;
    */

    const bannerType = server.customImage ? server.customImage : Configs.imagesUrl.game[queries.game];
    const bannerUrl = queries.query ? bannerType.online : bannerType.offline;

    if (queries.query) {
        const { host, port } = server.connect;

        switch (queries.game) {
            case 'arma3': {
                const assertedQueries = queries.query as Arma3ServerQueries;
                const { info, tags, rules } = assertedQueries;

                const CDLCs = Object.entries(rules.mods)
                    .filter(([k, v]) => v.isCDLC === true)
                    .map(([k, v]) => `[${k}](https://store.steampowered.com/app/${v.steamid})`);

                const presetLabel = generatePresetLabel(Configs.static, server.nonce, information.addonsHash, !_.isEmpty(CDLCs));

                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[connection.status])
                    .setTitle(info.name)
                    // .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    // .setAuthor({
                    //     name: discord.owner.displayName,
                    //     url: discord.owner.url,
                    //     iconURL: discord.owner.avatarUrl
                    // })
                    .setDescription(
                        presetLabel + "```" + `${host}:${port}` + "```"
                    )
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: StringTable.embed.serverStatus.arma3.field.labelMod, value: info.raw.game, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: StringTable.embed.serverStatus.arma3.field.labelStatus, value: tags.serverState, inline: false },
                        { name: StringTable.embed.serverStatus.arma3.field.labelMap, value: info.map, inline: true },
                        { name: StringTable.embed.serverStatus.arma3.field.labelVersion, value: info.version, inline: true },
                        { name: StringTable.embed.serverStatus.arma3.field.labelPlayers, value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: StringTable.embed.serverStatus.arma3.field.labelCDLC, value: `${CDLCs.length < 1 ? StringTable.none : `${CDLCs.join('\n')}`}`, inline: false },
                        // { name: '배틀아이', value: queries.tags.battleEye ? '적용' : '미적용', inline: true },
                        { name: StringTable.embed.serverStatus.arma3.field.labelMemo, value: `> ${memo ? memo : StringTable.embed.serverStatus.labelBlankMemo}`, inline: false },
                    )
                    .setImage(bannerUrl)
                    // .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms, ${time}` });

                /*
                connectButton.setURL(`https://files.hirua.me/connect/?107410//-connect=${queries.connect.host}%20-port=${queries.connect.port}`)
                row.addComponents(connectButton);
 
                if (queries.connect.port !== 2302) {
                    // as far as i know, there is no way to change the 2302 port using -connect parameter
                    connectButton.setDisabled(true);
                }
                */

                break;
            }

            case 'armareforger': {
                const assertedQueries = queries.query as ArmaReforgerServerQueries;
                const { info } = assertedQueries;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[connection.status])
                    .setTitle(info.name)
                    // .setURL(`https://files.hirua.me/presets/${messageId}.html`)
                    // .setAuthor({
                    //     name: discord.owner.displayName,
                    //     url: discord.owner.url,
                    //     iconURL: discord.owner.avatarUrl
                    // })
                    .setDescription(
                        "```" + `${host}:${port}` + "```"
                    )
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: StringTable.embed.serverStatus.armareforger.field.labelMap, value: info.map, inline: false },
                        { name: StringTable.embed.serverStatus.armareforger.field.labelVersion, value: info.version, inline: true },
                        { name: StringTable.embed.serverStatus.armareforger.field.labelPlayers, value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: StringTable.embed.serverStatus.armareforger.field.labelMemo, value: `> ${memo ? memo : StringTable.embed.serverStatus.labelBlankMemo}`, inline: false },
                    )
                    .setImage(bannerUrl)
                    // .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms, ${time}` });

                break;
            }

            case 'armaresistance': {
                const assertedQueries = queries.query as ArmaResistanceServerQueries;
                const { info } = assertedQueries;
                embed = new EmbedBuilder()
                    .setColor(SERVER_STATUS_COLOR[connection.status])
                    .setTitle(queries.query.info.name)
                    .setURL('https://discord.gg/9HzjsbjDD9')
                    // .setAuthor({
                    //     name: discord.owner.displayName,
                    //     url: discord.owner.url,
                    //     iconURL: discord.owner.avatarUrl
                    // })
                    .setDescription("Operation FlashPoint: Resistance" + "```" + `${host}:${port}` + "```")
                    // .setThumbnail(thumbnail)
                    .addFields(
                        { name: StringTable.embed.serverStatus.armaresistance.field.labelMods, value: _.isEmpty(info.raw.mod) ? '--' : info.raw.mod, inline: false },
                        // { name: '\u200B', value: '\u200B' },
                        { name: StringTable.embed.serverStatus.armaresistance.field.labelStatus, value: info.raw.gamemode, inline: false },
                        { name: StringTable.embed.serverStatus.armaresistance.field.labelMap, value: _.isEmpty(info.map) ? StringTable.none : info.map, inline: true },
                        { name: StringTable.embed.serverStatus.armaresistance.field.labelVersion, value: info.raw.gamever.toString(), inline: true },
                        { name: StringTable.embed.serverStatus.armaresistance.field.labelPlayers, value: `${info.numplayers} / ${info.maxplayers}`, inline: true },
                        { name: StringTable.embed.serverStatus.armaresistance.field.labelMemo, value: `> ${memo ? memo : StringTable.embed.serverStatus.labelBlankMemo}`, inline: false },
                    )
                    .setImage(bannerUrl)
                    // .setTimestamp(time)
                    .setFooter({ text: `Online - ${info.ping}ms, ${time}` });

                break;
            }
        }
    }

    else {
        embed = new EmbedBuilder()
            .setColor(SERVER_STATUS_COLOR[connection.status])
            .setTitle(StringTable.embed.serverStatus.offline.title)
            // .setURL(`https://files.hirua.me/presets/${message.id}.html`)
            // .setAuthor({
            //     name: discord.owner.displayName,
            //     url: discord.owner.url,
            //     iconURL: discord.owner.avatarUrl
            // })
            .setDescription("```" + `${queries.connect.host}:${queries.connect.port}` + "```")
            // .setThumbnail(thumbnail)
            .addFields(
                { name: StringTable.embed.serverStatus.offline.field.labelMemo, value: `> ${memo ? memo : StringTable.embed.serverStatus.labelBlankMemo}`, inline: false },
            )
            .setImage(bannerUrl)
            //.setTimestamp(time)
            .setFooter({ text: `Offline, ${time}` });
    }

    return { content: '', embeds: [embed as EmbedBuilder], components: [row as any] };

    /*
    else {
        const embed = new EmbedBuilder()
            .setTitle(StringTable.embed.serverStatus.titleNoServer)

        return { content: '', embeds: [embed as EmbedBuilder] };
    }
    */
}

export function getRankingEmbed(data?: { server: BIServer, isConnected: boolean, ranking: { name: string, playtime: number }[] }) {
    let embed;

    if (data) {
        if (data.ranking) {
            const { server, isConnected, ranking } = data;
            const time = DateTime.now().toLocaleString(DateTime.TIME_WITH_SECONDS);
            const entireRankingTable = getRankingTable(ranking);

            embed = new EmbedBuilder()
                .setTitle(StringTable.embed.ranking.title)
                .setDescription(
                    `**${isConnected ? ':green_circle:' : ':red_circle:'} ${server.information.hostname}**\n` +
                    '```' + `${server.connect.host}:${server.connect.port}` + '```\n' +
                    '**' + StringTable.embed.ranking.field.entireRankingTitle + '**\n```' + entireRankingTable + '```\n' + 
                    '**' + StringTable.embed.ranking.field.monthlyRankingTitle + '**\n```준비중' + '```\n' + 
                    '**' + StringTable.embed.ranking.field.weeklyRankingTitle + '**\n```준비중' + '```'
                )
                .setFooter({ text: `Updated at ${time}` });
        }

        else {
            const { server } = data;

            embed = new EmbedBuilder()
                .setTitle(StringTable.embed.ranking.title)
                .setDescription(
                    `**${server.information.hostname}**\n` +
                    '```' + `${server.connect.host}:${server.connect.port}` + '```\n' +
                    StringTable.embed.ranking.labelNoRanking
                );
        }
    }

    else {
        embed = new EmbedBuilder()
            .setTitle(StringTable.embed.ranking.title)
            .setDescription(StringTable.embed.ranking.labelNoRanking);
    }

    embed.setImage(Configs.imagesUrl.blank);

    // return { content: '', embeds: [embed as EmbedBuilder] };
    return embed;
}

function generatePresetLabel(appStatic: typeof Configs.static, nonce: string, loadedContentsHash: string, compatibility: boolean = false) {
    if (!appStatic) return '';

    const presetLink = `${appStatic.url}/presets/${nonce}-${loadedContentsHash}`;
    const presetPurchasedLabel = `[**[${StringTable.embed.serverStatus.arma3.presetPurchasedDownload}]**](${presetLink}-p.html)`;
    const presetCompatibilityLabel = `[**[${StringTable.embed.serverStatus.arma3.presetCompatibilityDownload}]**](${presetLink}-c.html)`;

    return compatibility ? `${presetPurchasedLabel}\n${presetCompatibilityLabel}` : `${presetPurchasedLabel}`;
}