import { Arma3ServerQueries } from "Server/Games/Arma3";
import { ArmaReforgerServerQueries } from "Server/Games/ArmaReforger";
import { ArmaResistanceServerQueries } from "Server/Games/ArmaResistance";

export const Games = {
    arma3: {
        name: 'Arma 3',
        type: 'arma3'
    },
    armareforger: {
        name: 'Arma Reforger',
        type: 'armareforger'
    },
    armaresistance: {
        name: 'Operation Flashpoint: Resistance',
        type: 'armaresistance'
    },
    unknown: {
        name: 'Unknown',
        type: 'unknown'
    }
} as const;

export const SERVER_STATUS_COLOR = {
    connected: 0x41F097,
    disconnected: 0xFF0000,
    losing: 0xFFCC00,
    discord: 0x5865F2
} as const;

export interface ConnectInfo { 
    host: string; 
    port: number;
}

export type AvailableGame = keyof typeof Games;

export type ServerQueries = Arma3ServerQueries | ArmaReforgerServerQueries | ArmaResistanceServerQueries;