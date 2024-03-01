export const GAMES = {
    arma3: 'Arma 3',
    armareforger: 'Arma Reforger',
    armaresistance: 'Operation Flashpoint: Resistance',
    unknown: 'Unknown'
} as const;

export const SERVER_STATUS_COLOR = {
    connected: 0x41F097,
    disconnected: 0xFF0000,
    discord: 0x5865F2
} as const;

export interface ConnectInfo { 
    host: string; 
    port: number;
}

export type AvailableGame = keyof typeof GAMES;