import _ from 'lodash';
import fs from 'fs';
import dotenv from "dotenv";
import { AvailableGame } from 'Types';
import { logNormal } from 'Lib/Log';
import { advStringify } from 'Lib/Utils';
import nodePackage from '../package.json';
import path from 'path';
dotenv.config();

export interface AppConfigs {
    token: string;
    app_id: string;
    static_path: string;
}

export interface InstanceUser {
    displayName: string;
    url: string;
    avatarUrl: string;
}

export interface InstanceConnection {
    host: string;
    port: number;
}

export interface Instance {
    messageId: string;
    game: AvailableGame;
    user: InstanceUser;
    connection: InstanceConnection,
    memo: string;
    disconnectedFlag: number;
    loadedContentHash: string;
    presetPath: string;
}

export interface InstanceStorage {
    channels: {
        interaction: {
            channelId: string;
            noticeMessageId: string;
            registerMessageId: string;
            deleteMessageId: string;
        },
        servers: {
            channelId: string;
        }
    },
    instances: {
        normal: Map<string, Instance>; 
        priority: Map<string, Instance>;
    }
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const CONFIGS_PATH = IS_DEVELOPMENT ? path.join(`${__dirname}`, '../configs/configs.json') : `${__dirname}/configs/configs.json`;
const STORAGE_PATH = IS_DEVELOPMENT ? path.join(`${__dirname}`, '../configs/instances.json') : `${__dirname}/configs/instances.json`;

const CONFIGS = JSON.parse(fs.readFileSync(CONFIGS_PATH).toString('utf8')) as AppConfigs;
const STORAGE = new Map<string, InstanceStorage>(JSON.parse(fs.readFileSync(STORAGE_PATH).toString('utf8')));

for (const [k, v] of STORAGE) {
    v.instances.normal = new Map(v.instances.normal);
    v.instances.priority = new Map(v.instances.priority);
}

const { token, app_id, static_path } = CONFIGS;

if (!token || !app_id || !static_path) {
    throw new Error("[App] Missing environment variables");
}

export function saveStorage() {
    /* it will be problem if server processing many instances */
    const p = advStringify(Array.from(_.cloneDeep(STORAGE).entries()));
    fs.writeFileSync('./Configs/instances.json', p);
}

export function savePresetHtml(filename: string, preset: string) {
    try {
        const path = `${static_path}/presets/${filename}.html`;
        fs.writeFileSync(path, preset);
        logNormal(`[App] Arma 3 Preset Generated: ${path}`);
        return path;
    }
    catch (e) {
        throw new Error(`[App] savePresetHtml Error: ${e}`);
    }
}

export default {
    isDevelopment: IS_DEVELOPMENT,
    version: nodePackage.version,
    discord: {
        token: token,
        appid: app_id,
    },
    storage: STORAGE,
    staticPath: static_path
};