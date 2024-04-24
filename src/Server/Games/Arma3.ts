import _ from 'lodash';
import fs from 'fs';
import { BufferList } from 'bl';
import { HTMLElement, parse } from 'node-html-parser';
import format from 'html-format';
import { GameDig } from 'gamedig';
import { Socket as RconSocket } from '@senfo/battleye';
import { ConnectInfo, ServerQueries } from 'Types';
import { getBoolean, insertChar, toEmptySafeObject } from 'Lib/Utils';
import { logError, logNormal } from 'Lib/Log';
import { getConfigs } from "Config";
import { BIServer } from 'Storage';
import { getStringTable } from "Language";
import appJson from 'Root/package.json';

const Config = getConfigs();
const lang = getStringTable();

const ARMA_3_SERVER_STATE = new Map([
    ['0', "NONE"],                /* no server */
    ['1', "SELECTING MISSION"],   /* server created, no mission selected */
    ['2', "EDITING MISSION"],     /* mission is in editing phase */
    ['3', "ASSIGNING ROLES"],     /* mission is selected, assigning roles */
    ['4', "SENDING MISSION"],     /* mission is in sending phase*/
    ['5', "LOADING GAME"],        /* game (island, vehicles etc.) is loading */
    ['6', "BRIEFING"],            /* prepared to launch game */
    ['7', "PLAYING"],             /* game is launched */
    ['8', "DEBRIEFING"],          /* game is finished */
    ['9', "MISSION ABORTED"]      /* game is aborted */
]);

const ARMA_3_GAME_TYPE = new Map([
    ['apex', "Campaign - Apex Protocol"],
    ['coop', "Cooperative Mission"],
    ['ctf', "Capture The Flag"],
    ['cti', "Capture The Island"],
    ['dm', "Deathmatch"],
    ['endgame', "End Game"],
    ['escape', "Escape"],
    ['koth', "King Of The Hill"],
    ['lastman', "Last Man Standing"],
    ['patrol', "Combat Patrol"],
    ['rpg', "Role-Playing Game"],
    ['sandbox', "Sandbox"],
    ['sc', "Sector Control"],
    ['support', "Support"],
    ['survive', "Survival"],
    ['tdm', "Team Deathmatch"],
    ['unknown', "Undefined Game Mode"],
    ['vanguar', "Vanguard"],
    ['warlord', "Warlords"],
    ['zeus', "Zeus"]
]);

const ARMA_3_SERVER_TYPE = new Map([
    ['d', 'Dedicated'],
    ['l', 'Listen'],
    ['p', 'SourceTV']
]);

const ARMA_3_SERVER_PLATFORM = new Map([
    ['l', 'Linux'],
    ['w', 'Windows'],
    ['m', 'Others'],
    ['o', 'Others']
]);

const ARMA_3_SERVER_VISIBILITY = new Map([
    [0, 'Public'],
    [1, 'Secured']
]);

const ARMA_3_SERVER_VAC = new Map([
    [0, 'Unsecured'],
    [1, 'Secured']
]);

const ARMA_3_DLCs = new Map<string, number>([
    ['Kart', 0x1],
    ['Marksmen', 0x2],
    ['Heli', 0x4],
    ['Curator', 0x8],
    ['Expansion', 0x10],
    ['Jets', 0x20],
    ['Orange', 0x40],
    ['Argo', 0x80],
    ['TacOps', 0x100],
    ['Tanks', 0x200],
    ['Contact', 0x400],
    ['Enoch', 0x800],
    ['AOW', 0x1000]
]);

const ARMA_3_CDLCS = new Map<number, { name: string, compatibility: number }>([
    [
        1042220, 
        {
            name: 'Global Mobilization - Cold War Germany',
            compatibility: 1776428269
        }
    ],
    [
        1227700, 
        {
            name: 'S.O.G. Prairie Fire',
            compatibility: 2477276806
        }
    ],
    [
        1294440, 
        {
            name: 'CSLA Iron Curtain',
            compatibility: 2503886780
        }
    ],
    [
        1175380, 
        {
            name: 'Spearhead 1944',
            compatibility: 2991828484
        }
    ],
    [
        1681170, 
        {
            name: 'Western Sahara',
            compatibility: 2636962953
        }
    ],
    [
        2647760, 
        {
            name: 'Reaction Forces',
            compatibility: 3150497912
        }
    ]
]);

const RULES_ESCAPED = new Map([
    ['0101', '01'],
    ['0102', '00'],
    ['0103', 'FF'],
]);

const ARMA_3_GAMETAG_MAP = new Map<string, {
    name: keyof Arma3ServerGametag;
    getter: (value: string) => any;
}>([
    [
        'b', // 0x62, BattleEye, boolean
        {
            name: 'battleEye',
            getter: value => getBoolean(value)
        }
    ],
    [
        'r', // 0x72, RequiredVesion, string
        {
            name: 'reqVersion',
            getter: value => insertChar(value, '.', 1)
        }
    ],
    [
        'n', // 0x6E, RequiredBuildNo, string
        {
            name: 'reqBuild',
            getter: value => value
        }
    ],
    [
        's', // 0x73, ServerState, number
        {
            name: 'serverState',
            getter: value => ARMA_3_SERVER_STATE.get(value),
        }
    ],
    [
        'i', // 0x69, Difficulty, number
        {
            name: 'difficulty',
            getter: value => Number(value),
        }
    ],
    [
        'm', // 0x6D, EqualModRequired, boolean
        {
            name: 'equalModRequired',
            getter: value => getBoolean(value)
        }
    ],
    [
        'l', // 0x6C, Lock, boolean
        {
            name: 'lock',
            getter: value => getBoolean(value)
        }
    ],
    [
        'v', // 0x76, VerifySignatures, boolean
        {
            name: 'verifySignatures',
            getter: value => getBoolean(value)
        }
    ],
    [
        'd', // 0x64, Dedicated, boolean
        {
            name: 'dedicated',
            getter: value => getBoolean(value)
        }
    ],
    [
        't', // 0x74 GameType, string
        {
            name: 'gameType',
            getter: value => ARMA_3_GAME_TYPE.get(value)
        }
    ],
    [
        'g', // 0x67, Language, string
        {
            name: 'language',
            getter: value => value
        }
    ],
    [
        'c', // 0x63, LongLat, string
        {
            name: 'longLat',
            getter: value => value
        }
    ],
    [
        'p', // 0x70, Platform, string
        {
            name: 'platform',
            getter: value => ARMA_3_SERVER_PLATFORM.get(value)
        }
    ],
    [
        'h', // 0x68, LoadedContentHash, string
        {
            name: 'loadedContentHash',
            getter: value => value
        }
    ],
    [
        'o', // 0x6F, Country, string
        {
            name: 'country',
            getter: value => value
        }
    ],
    [
        'e', // 0x65, timeLeft, number
        {
            name: 'timeLeft',
            getter: value => Number(value)
        }
    ],
    [
        'j', // 0x6A, param1, string (?)
        {
            name: 'param1',
            getter: value => value
        }
    ],
    [
        'k', // 0x6B, param2, string (?)
        {
            name: 'param2',
            getter: value => value
        }
    ],
    [
        'f', // 0x66, allowedFilePatching, string
        {
            name: 'allowedFilePatching',
            getter: value => getBoolean(value)
        }
    ],
    [
        'y', // 0x79, island? (unimplemented), string
        {
            name: 'unknown0',
            getter: value => value
        }
    ]
]);

const ARMA_3_HTML_TARGET_TD = 'DisplayName';
const ARMA_3_HTML_TARGET_ATTR = 'data-type';
const ARMA_3_HTML_TARGET_A_ATTR = 'href';
const ARMA_3_HTML_KEYS = {
    TARGET_MOD_LIST: 'mod-list',
    TARGET_MOD_CONTAINER: 'ModContainer',
    TARGET_DLC_LIST: 'dlc-list',
    TARGET_DLC_CONTAINER: 'DlcContainer'
} as const;

export interface Arma3ServerInfo {
    protocol: number;
    hostname: string;
    hostport: number;
    folder: string;
    mapname: string;
    gamename: string;
    appid: number;
    // mod: string;
    numplayers: number;
    maxplayers: number;
    bots: number;
    type: typeof ARMA_3_SERVER_TYPE[keyof typeof ARMA_3_SERVER_TYPE];
    platform: typeof ARMA_3_SERVER_PLATFORM[keyof typeof ARMA_3_SERVER_PLATFORM]; // 'm' | 'o' = others
    visibility: typeof ARMA_3_SERVER_VISIBILITY[keyof typeof ARMA_3_SERVER_VISIBILITY]; // 0 | 1
    vac: typeof ARMA_3_SERVER_VAC[keyof typeof ARMA_3_SERVER_VAC]; // 0 | 1
    version: string;
    gametags: Arma3ServerGametag
}

export interface Arma3ServerGametag {
    [key: string]: any,
    battleEye: boolean;
    reqVersion: string;
    reqBuild: string;
    serverState: string;
    difficulty: number;
    equalModRequired: boolean;
    lock: boolean;
    verifySignatures: boolean;
    dedicated: boolean;
    gameType: string;
    language: string;
    longLat: string;
    platform: string;
    loadedContentHash: string;
    country: string;
    timeLeft: string; // always 15 ?
    param1: string;
    param2: string;
    allowedFilePatching: string;
    unknown0: string;
}

export interface Arma3ServerMod {
    hash: string,
    steamid: number,
    isCDLC: boolean,
    isServerside: boolean
}

export interface Arma3ServerRules {
    protocol: number,
    difficulty: number, // todo: parse
    mods: {
        [name: string]: Arma3ServerMod
    },
    signatures: Buffer[]
}

export interface Arma3ServerQueries {
    info: {
        name: string,
        map: string,
        password: boolean,
        version: string,
        raw: any,
        maxplayers: number,
        numplayers: number,
        players: any[],
        bots: any[],
        queryPort: number,
        connect: string,
        ping: number,
    };
    tags: Arma3ServerGametag;
    rules: Arma3ServerRules;
    preset: { purchased: string, compatibility: string };
}

export type Arma3ServerPlayers = Array<{
    name: string;
}>

export async function queryArma3(connection: ConnectInfo): Promise<ServerQueries<Arma3ServerQueries>> {
    const { host, port } = connection;

    try {
        const state: any = await GameDig.query({
            type: 'arma3',
            host: host,
            port: port,
            requestRules: true
        });

        const info = toEmptySafeObject(state) as any;
        const r: { [k: keyof Arma3ServerGametag]: any } = {};

        state.raw.tags.forEach((x: string, i: number) => {
            if (_.isEmpty(x)) return;
            const p = ARMA_3_GAMETAG_MAP.get(x[0]);
            if (p) {
                let value = p.getter(x.slice(1));
                r[p.name] = value;
            }
        });

        const tags = toEmptySafeObject(r);
        const rules = parseArma3Rules(state.raw.rulesBytes);
        const presetPurchased = format(buildArma3PresetHtml(state.name, rules.mods, false), " ".repeat(4), 200);
        const presetCompatibility = format(buildArma3PresetHtml(state.name, rules.mods, true), " ".repeat(4), 200);

        return {
            game: 'arma3',
            connect: connection,
            query: {
                info: info, 
                tags: tags as Arma3ServerGametag, 
                rules: rules, 
                preset: { 
                    purchased: presetPurchased, 
                    compatibility: presetCompatibility 
                }
            }
        }
    }

    catch (e) {
        logError(`[App] Failed query Arma3 Server: ${e}: [${host}:${port}]`);
        return { 
            game: 'arma3',
            connect: connection
        }
    }
}

export async function rconArma3(instance: BIServer, password: string) {
    const socket = new RconSocket();
    const connection = socket.connection({
        name: instance.information.hostname,
        ip: instance.connect.host,
        port: instance.connect.port,
        password: password
    }, {
        reconnect: false,
        reconnectTimeout: 3000,
        keepAlive: false,
        timeout: false
    });

    return connection;
}

export function parseArma3Rules(message: Buffer, startOffset: number = 0x00): Arma3ServerRules {
    /* joining chunks */
    let offset = startOffset;
    const bl = new BufferList();
    const rulesBit = message.readUInt8(offset++);
    offset += 0x04;
    for (let i = 0; i < rulesBit; i++) {
        bl.append(message.subarray(offset, offset += 0x7F)) // 127 B
        offset += 0x04;
    }

    /* replace escapes */
    let p = bl.toString('hex');
    for (const [k, v] of RULES_ESCAPED) {
        let flag = true;
        while (flag) {
            const bytePatternPos = p.indexOf(k);
            if (bytePatternPos !== -1) {
                p = p.replace(k, v);
            }
            else {
                flag = false;
            }
        }
    }

    const buf = Buffer.from(p, 'hex');
    offset = 0x00;

    const protocol = buf.readUInt8(offset++);
    const extraBit = buf.readUInt8(offset++);
    const dlcsBits = buf.readUInt16LE(offset);
    offset += 0x02;
    const diffBits = buf.readUInt16LE(offset);
    offset += 0x02;
    const DLCs = new Map<string, boolean | Buffer>(
        Array.from(ARMA_3_DLCs).map(
            ([k, v]) => [k, Boolean(v & dlcsBits)]
        )
    );

    for (const [dlc, enabled] of DLCs) {
        if (enabled) {
            DLCs.set(dlc, buf.subarray(offset, offset += 0x04));
        }
    }

    /* parse mods information */
    const modsBit = buf.readUInt8(offset++);
    const mods: any = {};

    for (let i = 0; i < modsBit; i++) {
        const modHash = buf.readUInt32LE(offset);
        offset += 0x04;
        const steamidBit = buf.readUInt8(offset++);
        const steamidLength = steamidBit & 0b1111;
        let steamid: number;
        switch (steamidLength) {
            case 0x04:
                steamid = buf.readUInt32LE(offset);
                offset += 0x04;
                break;
            case 0x03:
                // steamid = buf.readUInt24LE(offset);
                steamid = parseInt(buf.subarray(offset, offset + 0x03).reverse().toString('hex'), 16);
                offset += 0x03;
                break;
            case 0x02:
                steamid = buf.readUInt16LE(offset);
                offset += 0x02;
                break;
            case 0x01:
                steamid = buf.readUint8(offset++);
                break;
            default:
                steamid = 0x00;
                break;
        }

        let isServerside = false;
        const isCDLC = Boolean(steamidBit & 0b10000);
        if (steamidLength === 0) isServerside = true;

        let modName: string;
        const modNameLength = buf.readUInt8(offset++);
        if (isCDLC) {
            const cdlc = ARMA_3_CDLCS.get(steamid);
            modName = cdlc?.name ?? `Unknown CDLC[${modHash.toString()}]`;
        }
        else {
            modName = buf.subarray(offset, offset += modNameLength).toString('utf8');
        }

        mods[modName] = {
            hash: modHash,
            steamid: steamid,
            isCDLC: isCDLC,
            isServerside: isServerside
        }
    }

    /* parse signatures */
    const signaturesBit = buf.readUInt8(offset++);
    const signatures = [];
    for (let i = 0; i < signaturesBit; i++) {
        const signLength = buf.readUInt8(offset++);
        const sign = buf.subarray(offset, offset += signLength);
        signatures.push(sign);
    }

    return {
        protocol: protocol,
        difficulty: diffBits,
        mods: mods,
        signatures: signatures
    }
}

export function savePresetHtml(filename: string, preset?: string) {
    if (!Config.static) {
        logNormal(`[App] Cannot generate Arma 3 preset: no static config`);
        return '';
    }

    if (preset) {
        try {
            const path = `${Config.static.path}/presets/${filename}.html`;
            fs.writeFileSync(path, preset);
            logNormal(`[App] savePresetHtml: Arma 3 preset generated: ${path}`);
            return path;
        }
        catch (e) {
            throw new Error(`[App] savePresetHtml Error: ${e}`);
        }
    }

    else {
        return '';
    }
}

function generateAddonElement(name: string, id?: number) {
    if (id) {
        const url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`;
        return `<tr data-type="${ARMA_3_HTML_KEYS.TARGET_MOD_CONTAINER}">
            <td data-type="DisplayName">
                ${name}
            </td>
            <td>
                <span class="from-steam">Steam</span>
            </td>
            <td>
                <a href="${url}" data-type="Link">${url}</a>
            </td>
        </tr>`;
    }
    else {
        return;
    }
}

function generateCDLCElement(name: string, id?: number) {
    if (id) {
        const url = `https://store.steampowered.com/app/${id}`;
        return `<tr data-type="${ARMA_3_HTML_KEYS.TARGET_DLC_CONTAINER}">
            <td data-type="DisplayName">
                ${name}
            </td>
            <td>
                <a href="${url}" data-type="Link">${url}</a>
            </td>
        </tr>`;
    }
    else {
        return;
    }
}

function createContainers(mods: { [name: string]: Arma3ServerMod }, compatibility: boolean = false) {
    const modNames = Object.keys(mods);

    if (compatibility) {
        const containersAddons = `<div class="${ARMA_3_HTML_KEYS.TARGET_MOD_LIST}">
            <table>
                ${modNames.map(name => {
                    const mod = mods[name];
                    if (mod.isCDLC) {
                        const CDLC = ARMA_3_CDLCS.get(mod.steamid);
                        return generateAddonElement(name, CDLC?.compatibility); 
                    }

                    else if (!mod.isServerside) {
                        return generateAddonElement(name, mod.steamid);
                    }

                    else {
                        return;
                    }
                }).join('\r\n')}
            </table>
        </div>`;

        return containersAddons;
    }

    else {
        const containersAddons = `<div class="${ARMA_3_HTML_KEYS.TARGET_MOD_LIST}">
            <table>
                ${modNames.map(name => {
                    const mod = mods[name];
                    if (!mod.isCDLC && !mod.isServerside) {
                        return generateAddonElement(name, mod.steamid);
                    }

                    else {
                        return;
                    }
                }).join('\r\n')}
            </table>
        </div>`;

        let containersCDLCs = '';

        if (_.findKey(mods, x => x.isCDLC === true)) {
            containersCDLCs = `\n<div class="${ARMA_3_HTML_KEYS.TARGET_DLC_LIST}">
                <table>
                    ${modNames.map(name => {
                        const mod = mods[name];
                        if (mod.isCDLC) {
                            return generateCDLCElement(name, mod.steamid);
                        }
                        else {
                            return;
                        }
                    }).join('\r\n')}
                </table>
            </div>`;
        }

        return containersAddons + containersCDLCs;
    }
}

export function buildArma3PresetHtml(presetName: string, mods: { [name: string]: Arma3ServerMod }, compatibility: boolean = false) {
    return `<?xml version="1.0" encoding="utf-8"?>
    <html>
        <!--Created by ${appJson.displayName} Bot: https://github.com/blackwaterbread-->
        <head>
            <meta name="arma:Type" content="preset" />
            <meta name="arma:PresetName" content="${presetName}" />
            <meta name="generator" content="${appJson.displayName} Discord Bot" />
            <title>Arma 3</title>
            <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" type="text/css" />
            <style>
            body {
                margin: 0;
                padding: 0;
                color: #fff;
                background: #000;	
            }
            
            body, th, td {
                font: 95%/1.3 Roboto, Segoe UI, Tahoma, Arial, Helvetica, sans-serif;
            }
            
            td {
                padding: 3px 30px 3px 0;
            }
            
            h1 {
                padding: 20px 20px 0 20px;
                color: white;
                font-weight: 200;
                font-family: segoe ui;
                font-size: 3em;
                margin: 0;
            }
            
            em {
                font-variant: italic;
                color:silver;
            }
            
            .before-list {
                padding: 5px 20px 10px 20px;
            }
            
            .mod-list {
                background: #222222;
                padding: 20px;
            }
            
            .dlc-list {
                background: #222222;
                padding: 20px;
            }
            
            .footer {
                padding: 20px;
                color:gray;
            }
            
            .whups {
                color:gray;
            }
            
            a {
                color: #D18F21;
                text-decoration: underline;
            }
            
            a:hover {
                color:#F1AF41;
                text-decoration: none;
            }
            
            .from-steam {
                color: #449EBD;
            }
            .from-local {
                color: gray;
            }
            </style>
        </head>
        <body>
            <h1><strong>${presetName}</strong></h1>
            <p class="before-list">
                <em>${lang.preset.arma3.generated}</em>
            </p>
            ${createContainers(mods, compatibility)}
            <div class="footer">
                <span>Shallot - https://github.com/blackwaterbread/Shallot</span>
            </div>
        </body>
    </html>`;
}

/*
export function parseArma3PresetHtml(html: string): { name: string, mods: Arma3HtmlAddonsList, dlcs: Arma3HtmlAddonsList } {
    const root = parse(html);
    const presetName = root.getElementsByTagName('meta').find(x => x.attributes['name'] === 'arma:PresetName')?.attributes['content'];
    const listDLC = parseHtmlAddons(root, ARMA_3_HTML_KEYS.TARGET_DLC_LIST, ARMA_3_HTML_KEYS.TARGET_DLC_CONTAINER);
    const listMods = parseHtmlAddons(root, ARMA_3_HTML_KEYS.TARGET_MOD_LIST, ARMA_3_HTML_KEYS.TARGET_MOD_CONTAINER);
    return {
        name: presetName ?? 'Invalid HTML',
        dlcs: listDLC,
        mods: listMods
    }
}

function parseHtmlAddons(html: HTMLElement, targetListName: string, containerName: string): Arma3HtmlAddonsList {
    const divList = html.querySelector(`.${targetListName}`)?.getElementsByTagName('tr');
    const containers = divList?.filter(x => x.attributes[ARMA_3_HTML_TARGET_ATTR] === containerName);
    if (containers && containers.length > 0) {
        return containers.map((x) => {
            const name = x.getElementsByTagName('td').find(v => v.attributes[ARMA_3_HTML_TARGET_ATTR] === ARMA_3_HTML_TARGET_TD)?.childNodes[0].text;
            const url = x.getElementsByTagName('a')[0].attributes[ARMA_3_HTML_TARGET_A_ATTR];
            return {
                name: name,
                url: url
            }
        });
    }
    else {
        return [];
    }
}
*/