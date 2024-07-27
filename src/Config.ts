import _ from 'lodash';
import fs from 'fs';
import dotenv from "dotenv";
import path from 'path';
import { advStringify } from 'Lib/Utils';
import appJson from 'Root/package.json';
import { StringTable } from 'Language';
import { AvailableGame, EmbedStatusImage } from 'Types';
dotenv.config();

export interface AppConfigs {
    token: string;
    appId: string;
    static: {
        path: string;
        url: string;
    } | null;
    imagesUrl: {
        blank: string;
        maintenance: string;
        game: { [key in AvailableGame]: EmbedStatusImage }
    };
    lang: keyof typeof StringTable;
    localRefreshInterval: number;
    embedRefreshInterval: number;
    rankingRefreshInterval: number;
    serverAutoDeleteCount: number;
    verbose: boolean;
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const CONFIGS_PATH = path.join(__dirname, '/configs/configs.json');
const CONFIGS = JSON.parse(fs.readFileSync(CONFIGS_PATH).toString('utf8')) as AppConfigs;

const { token, appId } = CONFIGS;

if (!token || !appId) {
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

export function saveConfigs() {
    const p = advStringify(CONFIGS);
    fs.writeFileSync(CONFIGS_PATH, p);
}