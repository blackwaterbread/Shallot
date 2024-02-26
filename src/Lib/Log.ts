import Configs, { Instance } from 'Config';
import { Channel, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';

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
    if (Configs.isDevelopment) console.log(message, ...optionalParams);
}

export function logError(msg: any) {
    console.error(`[${now()}] [Error]: ${msg}`);
}

export function logWarning(msg: string) {
    console.warn(`[${now()}] [Warning]: ${msg}`);
}

export function instanceTrack(instance: Instance) {
    return `[${instance.game}|${instance.messageId}|${instance.connection.host}:${instance.connection.port}]`;
}

export function channelTrack(channel: TextChannel) {
    return `[${channel.guildId},${channel.guild.name},${channel.name}]`
}