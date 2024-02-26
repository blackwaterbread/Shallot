export const GAMES = {
    arma3: 'Arma 3',
    armareforger: 'Arma Reforger',
    armaresistance: 'Operation Flashpoint: Resistance'
} as const;

export const SEVER_STATUS_COLOR = {
    connected: 0x41F097,
    disconnected: 0xFF0000
} as const;

export interface Connection { 
    host: string; 
    port: number;
}

export type AvailableGame = keyof typeof GAMES;