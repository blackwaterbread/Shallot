import _ from 'lodash';
import fs from 'fs';
import dotenv from "dotenv";
import { AvailableGame, CommonServerQueries, EmbedStatusImage, SERVER_STATUS_COLOR } from 'Types';
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
    maintenance: boolean;
    connect: BIConnection;
    presetPath: string[];
    discord: {
        statusEmbedMessageId: string;
        adminEmbedMessageId: string;
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
    customImage: EmbedStatusImage | null,
    connection: {
        status: keyof typeof SERVER_STATUS_COLOR;
        count: number;
    }
}

export type PlaytimeRanking = Map<string, { name: string, playtime: number }>;

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
        },
        ranking: {
            channelId: string;
            rankingMessageId: string;
        }
    },
    servers: Map<string, BIServer>; // connectionString, Instance
}

const STORAGE_PATH = path.join(__dirname, '/configs/storage.json');
const STORAGE = new Map<string, AppStorage>(JSON.parse(fs.readFileSync(STORAGE_PATH).toString('utf8')));
const RANKING_PATH = path.join(__dirname, '/configs/ranking.json');
const RANKING = new Map<string, PlaytimeRanking>(JSON.parse(fs.readFileSync(RANKING_PATH).toString('utf8')));

for (const [k, v] of STORAGE) {
    v.servers = new Map(v.servers);
}

for (let [k, v] of RANKING) {
    RANKING.set(k, new Map(v));
}

export function getStorage() {
    return STORAGE;
}

export function saveStorage() {
    /* it will be problem if server processing many instances */
    const p = advStringify(Array.from(_.cloneDeep(STORAGE).entries()));
    fs.writeFileSync(STORAGE_PATH, p);
}

export function getRanking() {
    return RANKING;
}

export function saveRanking() {
    const p = advStringify(Array.from(_.cloneDeep(RANKING).entries()));
    fs.writeFileSync(RANKING_PATH, p);
}