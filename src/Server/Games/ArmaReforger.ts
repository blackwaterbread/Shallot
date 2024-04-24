import _ from "lodash";
import { GameDig } from "gamedig";
import { ConnectInfo, ServerQueries } from "Types";
import { logError } from "Lib/Log";
import { toEmptySafeObject } from "Lib/Utils";

export interface ArmaReforgerServerQueries {
    info: {
        name: string;
        map: string;
        password: boolean;
        raw: {
            protocol: number;
            folder: string;
            game: string;
            appId: number;
            numbots: number;
            listentype: string;
            environment: string;
            secure: number;
            tags: string[];
            players: any[];
            rules: any;
            rulesBytes: Buffer;
        };
        version: string;
        maxplayers: number;
        numplayers: number;
        players: any[];
        bots: any[];
        queryPort: number;
        connect: string;
        ping: number;
    },
    tags: undefined;
    rules: undefined;
    preset: undefined;
}

export async function queryArmaReforger(connection: ConnectInfo): Promise<ServerQueries<ArmaReforgerServerQueries>> {
    const { host, port } = connection;
    try {
        const state: any = await GameDig.query({
            type: 'armareforger',
            host: host,
            // port: port
            port: 17777
        });
        const info = toEmptySafeObject(state) as any;
        return {
            game: 'armareforger',
            connect: connection,
            query: {
                info: info, tags: undefined, rules: undefined, preset: undefined
            }
        }
    }
    catch (e) {
        logError(`[App] Failed query ArmaReforger Server: ${e}: [${host}:${port}]`);
        return { 
            game: 'armareforger',
            connect: connection
        }
    }
}