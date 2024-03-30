import { getAppInfo } from 'Config';
import { BIServer } from 'Storage';
import { Channel, Message, User } from 'discord.js';
import { DateTime } from 'luxon';

const app = getAppInfo();

function now() {
    return DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}

export function logVerbose(msg: string) {
    console.log(`${msg}`);
}

export function logNormal(msg: string) {
    console.log(`[${now()}]: ${msg}`);
}

export function logDevelopment(message?: any, ...optionalParams: any[]) {
    if (app.isDevelopment) console.log(message, ...optionalParams);
}

export function logError(msg: any) {
    console.error(`[${now()}] [Error]: ${msg}`);
}

export function logWarning(msg: string) {
    console.warn(`[${now()}] [Warning]: ${msg}`);
}

export function messageTrack(message: Message<true>) {
    return `[${message.id}, ${message.channelId}, ${message.channel.name}]`;
}

export function guildTrack(guildId: string) {
    return `[Server:${guildId}]`;
}

export function instanceTrack(instance: BIServer) {
    return `[${instance.type}|${instance.discord.statusEmbedMessageId}|${instance.connect.host}:${instance.connect.port}]`;
}

export function channelTrack(channel: Channel) {
    if (channel.isDMBased()) {
        return `[${channel.id},${channel.flags}]`;
    }
    else if (channel.isTextBased()) {
        return `[${channel.guildId},${channel.guild.name},${channel.name}]`;
    }
}

export function userTrack(user: User) {
    return `[${user.id}|${user.globalName}|${user.displayName}]`;
}