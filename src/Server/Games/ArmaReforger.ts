import _ from "lodash";
import { ConnectInfo } from "Types";
import { logError } from "Lib/Log";
import { toEmptySafeObject } from "Lib/Utils";
import { query } from "Server";

export interface ArmaReforgerServerQueries {
    game: 'armareforger';
    connect: ConnectInfo;
    online?: {
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
}

export async function queryArmaReforger(connection: ConnectInfo): Promise<ArmaReforgerServerQueries> {
    const { host, port } = connection;
    try {
        const state: any = await query({
            type: 'armareforger',
            host: host,
            // port: port
            port: 17777
        });
        const info = toEmptySafeObject(state) as any;
        return {
            game: 'armareforger',
            connect: connection,
            online: {
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