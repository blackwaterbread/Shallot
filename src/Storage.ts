import _ from 'lodash';
import fs from 'fs';
import dotenv from "dotenv";
import { AvailableGame, CommonServerQueries } from 'Types';
import { advStringify } from 'Lib/Utils';
import path from 'path';
dotenv.config();

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
        lastQueries: CommonServerQueries;
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

const STORAGE_PATH = path.join(__dirname, '/configs/storage.json');
const STORAGE = new Map<string, AppStorage>(JSON.parse(fs.readFileSync(STORAGE_PATH).toString('utf8')));

for (const [k, v] of STORAGE) {
    v.servers = new Map(v.servers);
}

export function getStorage() {
    return STORAGE;
}

export function saveStorage() {
    /* it will be problem if server processing many instances */
    const p = advStringify(Array.from(_.cloneDeep(STORAGE).entries()));
    fs.writeFileSync(STORAGE_PATH, p);
}