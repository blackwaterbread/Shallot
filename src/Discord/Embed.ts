import _ from "lodash";
import { Arma3ServerQueries } from "Server/Arma3";
import { ArmaResistanceServerQueries } from "Server/ArmaResistance";
import { SEVER_STATUS_COLOR } from "Types";
import { EmbedBuilder, Message, User } from "discord.js";
import { DateTime } from "luxon";
import { InstanceUser } from "Config";

export async function registerArma3ServerEmbed(message: Message<true>, queries?: Arma3ServerQueries, user?: InstanceUser, memo?: string) {
    const ping = queries ? queries.info.ping < 80 ? 'good.png' : queries.info.ping > 200 ? 'poor.png' : 'bad.png' : 'poor.png';
    const status = queries ? 'connected' : 'disconnected';
    const time = DateTime.now().toMillis();
    let embed;
    if (queries) {
        embed = new EmbedBuilder()
            .setColor(SEVER_STATUS_COLOR[status])
            .setTitle(queries.info.name)
            .setURL(`https://files.hirua.me/presets/${message.id}.html`)
            .setAuthor({ 
                name: user ? user.displayName : '고정된 서버', 
                url: user ? user.url : undefined,
                iconURL: user ? user.avatarUrl : 'https://files.hirua.me/images/shallot.jpg'
            })
            .setDescription("Arma 3" + "\n```\n" + queries.info.connect +"\n```")
            .setThumbnail('https://files.hirua.me/images/games/arma3.png')
            .addFields(
                { name: '모드', value: queries.info.raw.game, inline: false },
                // { name: '\u200B', value: '\u200B' },
                { name: '상태', value: queries.tags.serverState, inline: false },
                { name: '맵', value: queries.info.map, inline: true },
                { name: '버전', value: queries.info.raw.version, inline: true },
                { name: '플레이어', value: `${queries.info.numplayers} / ${queries.info.maxplayers}`, inline: true },
                { name: '배틀아이', value: queries.tags.battleEye ? '적용' : '미적용', inline: true },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage('https://files.hirua.me/images/announcement.png')
            .setTimestamp(time)
            .setFooter({ text: `Online - ${queries.info.ping}ms`, iconURL: `https://files.hirua.me/images/status/${ping}` });
    }
    else {
        embed = new EmbedBuilder()
            .setColor(SEVER_STATUS_COLOR[status])
            .setTitle('오프라인')
            .setURL(`https://files.hirua.me/presets/${message.id}.html`)
            .setAuthor({ 
                name: user ? user.displayName : '고정된 서버', 
                url: user ? user.url : undefined,
                iconURL: user ? user.avatarUrl : 'https://files.hirua.me/images/shallot.jpg'
            })
            .setDescription("Arma 3" + "\n```\n" + "Offline" +"\n```")
            .setThumbnail('https://files.hirua.me/images/games/arma3_offline.png')
            .addFields(
                { name: '상태', value: '오프라인', inline: false },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage('https://files.hirua.me/images/announcement.png')
            .setTimestamp(time)
            .setFooter({ text: 'Offline', iconURL: `https://files.hirua.me/images/status/${ping}` });
    }
    await message.edit({ content: '', embeds: [embed] });
    return { message: message };
}

export async function registerArmaResistanceServerEmbed(message: Message<true>, queries?: ArmaResistanceServerQueries, user?: InstanceUser, memo?: string) {
    const ping = queries ? queries.info.ping < 80 ? 'good.png' : queries.info.ping > 200 ? 'poor.png' : 'bad.png' : 'poor.png';
    const status = queries ? 'connected' : 'disconnected';
    const time = DateTime.now().toMillis();
    let embed;
    if (queries) {
        embed = new EmbedBuilder()
            .setColor(SEVER_STATUS_COLOR[status])
            .setTitle(queries.info.name)
            .setURL('https://discord.gg/9HzjsbjDD9')
            .setAuthor({ 
                name: user ? user.displayName : '고정된 서버', 
                url: user ? user.url : undefined,
                iconURL: user ? user.avatarUrl : 'https://files.hirua.me/images/shallot.jpg'
            })
            .setDescription("Operation FlashPoint: Resistance" + "\n```\n" + queries.info.connect +"\n```")
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
            .setColor(SEVER_STATUS_COLOR[status])
            .setTitle('오프라인')
            .setURL('https://discord.gg/9HzjsbjDD9')
            .setAuthor({ 
                name: user ? user.displayName : '고정된 서버', 
                url: user ? user.url : undefined,
                iconURL: user ? user.avatarUrl : 'https://files.hirua.me/images/shallot.jpg'
            })
            .setDescription("Operation FlashPoint: Resistance" + "\n```\n" + "Offline" +"\n```")
            .setThumbnail('https://files.hirua.me/images/games/armaresistance_offline.png')
            .addFields(
                { name: '상태', value: '오프라인', inline: false },
                { name: '메모', value: `> ${memo ? memo : '메모가 없습니다.'}`, inline: false },
            )
            .setImage('https://files.hirua.me/images/banner.png')
            .setTimestamp(time)
            .setFooter({ text: 'Offline', iconURL: `https://files.hirua.me/images/status/${ping}` });
    }
    await message.edit({ content: '', embeds: [embed] });
    return { message: message };
}