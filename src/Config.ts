import _ from 'lodash';
import fs from 'fs';
import dotenv from "dotenv";
import { AvailableGame } from 'Types';
import { advStringify } from 'Lib/Utils';
import appJson from 'Root/package.json';
import { ServerQueries } from 'Server';
dotenv.config();

export interface AppConfigs {
    token: string;
    appId: string;
    staticPath: string;
    refresh: boolean;
    localRefreshInterval: number;
    embedRefreshInterval: number;
}

export interface InstanceUser {
    id: string;
    displayName: string;
    url: string;
    avatarUrl: string;
}

export interface InstanceConnection {
    host: string;
    port: number;
}

export type InstancePlayers = Array<{
    name: string;
    score?: number;
    time?: number;
}>

export interface Instance {
    type: AvailableGame;
    nonce: string;
    priority: boolean;
    connect: InstanceConnection;
    presetPath: string;
    discord: {
        statusEmbedMessageId: string;
        rconEmbedMessageId: string;
        owner: InstanceUser;
    },
    information: {
        hostname: string;
        players: InstancePlayers;
        memo: string;
        addonsHash: string;
        lastQueries: ServerQueries;
    },
    rcon: {
        enabled: boolean;
        port: number;
        password: string;
        owned: string | null;
    },
    connection: {
        status: boolean;
        count: number;
    }
}

export interface InstanceStorage {
    channels: {
        interaction: {
            channelId: string;
            noticeMessageId: string;
            registerMessageId: string;
            deleteMessageId: string;
        },
        list: {
            channelId: string;
        },
        rcon: {
            channelId: string;
        }
    },
    instances: Map<string, Instance>; // connectionString, Instance
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const CONFIGS_PATH = `${__dirname}/configs/configs.json`;
const INSTANCE_PATH = `${__dirname}/configs/instances.json`;

const CONFIGS = JSON.parse(fs.readFileSync(CONFIGS_PATH).toString('utf8')) as AppConfigs;
const STORAGE = new Map<string, InstanceStorage>(JSON.parse(fs.readFileSync(INSTANCE_PATH).toString('utf8')));

for (const [k, v] of STORAGE) {
    v.instances = new Map(v.instances);
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

export function getInstances() {
    return STORAGE;
}

export function saveConfigs() {
    const p = advStringify(CONFIGS);
    fs.writeFileSync(CONFIGS_PATH, p);
}

export function saveInstances() {
    /* it will be problem if server processing many instances */
    const p = advStringify(Array.from(_.cloneDeep(STORAGE).entries()));
    fs.writeFileSync(INSTANCE_PATH, p);
}