import { logError } from "Lib/Log";
import { Connection, ServerQueries } from "Types";
import { GameDig } from "gamedig";

export interface ArmaResistanceServerQueries extends ServerQueries {
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
}

export async function queryArmaResistance(connection: Connection): Promise<ArmaResistanceServerQueries | undefined> {
    const { host, port } = connection;
    try {
        const state: any = await GameDig.query({
            type: 'armaresistance',
            host: host,
            port: port
        });
        return { info: state, tags: undefined, rules: undefined, preset: undefined };
    }
    catch (e) {
        logError(`[App] Failed query ArmaResistance Server: ${e}`);
    }
}