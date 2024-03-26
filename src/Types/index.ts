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