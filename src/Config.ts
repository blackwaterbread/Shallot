import _ from 'lodash';
import fs from 'fs';
import dotenv from "dotenv";
import { AvailableGame } from 'Types';
import { advStringify } from 'Lib/Utils';
import appJson from 'Root/package.json';
import { ServerQueries } from 'Server';
import path from 'path';
dotenv.config();

export interface AppConfigs {
    token: string;
    appId: string;
    staticPath: string;
    localRefreshInterval: number;
    sessionRefreshInterval: number;
    embedRefreshInterval: number;
    sessionExpiredSec: number;
    serverAutoDeleteCount: number;
}

export interface DiscordUser {
    id: string;
    displayName: string;
    url: string;
    avatarUrl: string;
}

export interface BIConnection {
    host: string;
    port: number;
}

export type BIServerPlayers = Array<{
    name: string;
    score?: number;
    time?: number;
}>

export interface BIServer {
    type: AvailableGame;
    nonce: string;
    priority: boolean;
    connect: BIConnection;
    presetPath: string;
    discord: {
        statusEmbedMessageId: string;
        rconEmbedMessageId: string;
        owner: DiscordUser;
    },
    information: {
        hostname: string;
        players: BIServerPlayers;
        memo: string;
        addonsHash: string;
        lastQueries: ServerQueries;
    },
    rcon: {
        port: number;
        password: string;
    } | null,
    connection: {
        status: boolean;
        count: number;
    }
}

export interface AppStorage {
    channels: {
        interaction: {
            channelId: string;
            noticeMessageId: string;
            registerMessageId: string;
            deleteMessageId: string;
        },
        status: {
            channelId: string;
        },
        admin: {
            channelId: string;
        }
    },
    servers: Map<string, BIServer>; // connectionString, Instance
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const CONFIGS_PATH = path.join(__dirname, '/configs/configs.json');
const STORAGE_PATH = path.join(__dirname, '/configs/storage.json');

const CONFIGS = JSON.parse(fs.readFileSync(CONFIGS_PATH).toString('utf8')) as AppConfigs;
const STORAGE = new Map<string, AppStorage>(JSON.parse(fs.readFileSync(STORAGE_PATH).toString('utf8')));

for (const [k, v] of STORAGE) {
    v.servers = new Map(v.servers);
}

const { token, appId, staticPath } = CONFIGS;

if (!token || !appId || !staticPath) {
    throw new Error("[App] Missing environment variables");
}

export function getAppInfo() {
    return {
        name: appJson.name,
        version: appJson.version,
        isDevelopment: IS_DEVELOPMENT
    }
}

export function getConfigs() {
    return CONFIGS;
}

export function getStorage() {
    return STORAGE;
}

export function saveConfigs() {
    const p = advStringify(CONFIGS);
    fs.writeFileSync(CONFIGS_PATH, p);
}

export function saveStorage() {
    /* it will be problem if server processing many instances */
    const p = advStringify(Array.from(_.cloneDeep(STORAGE).entries()));
    fs.writeFileSync(STORAGE_PATH, p);
}