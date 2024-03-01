import { GameDig } from "gamedig";
import { logError } from "Lib/Log";
import { ConnectInfo } from "Types";

export interface ArmaResistanceServerQueries {
    game: 'armaresistance',
    connect: ConnectInfo,
    online?: {
        info: {
            name: string,
            map: string,
            password: boolean,
            raw: {
                gamename: string, // 'opflashr'
                gamever: number, // 2.01
                groupid: number, // ?
                hostname: string,
                hostport: number,
                mapname: string,
                gametype: string,
                numplayers: number,
                maxplayers: number,
                gamemode: string, // 'openplaying', 'playing' ...
                timeleft: number,
                param1: number,
                param2: number,
                actver: number, // 201
                reqver: number, // 201
                mod: string, // mods
                equalmodrequired: number, // 0, 1
                password: number, // 0, 1
                gstate: number,
                impl: string,
                platform: string,
                teams: any
            },
            maxplayers: number,
            numplayers: number,
            players: any[],
            bots: any[],
            queryPort: number,
            connect: string,
            ping: number
        },
        tags: undefined,
        rules: undefined,
        preset: undefined
    }
}

export async function queryArmaResistance(connection: ConnectInfo): Promise<ArmaResistanceServerQueries> {
    const { host, port } = connection;
    try {
        const state: any = await GameDig.query({
            // this for 2.01, 1.99 : 'acwa'
            type: 'armaresistance',
            host: host,
            port: port
        });
        return {
            game: 'armaresistance',
            connect: connection, 
            online: { info: state, tags: undefined, rules: undefined, preset: undefined }
        };
    }
    catch (e) {
        logError(`[App] Failed query ArmaResistance Server: ${e}`);
        return {
            game: 'armaresistance',
            connect: connection
        }
    }
}