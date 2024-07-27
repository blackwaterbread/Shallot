import { Connection, Socket } from '@senfo/battleye';

/*
// RCon UDP connection is must be continuously, so sessions are volatile
const SESSIONS = new Map<string, RconSession>();

export interface RconSession {
    user: DiscordUser;
    session: Connection;
    expired: number;
}

export function getRconSessions() {
    return SESSIONS;
}
*/

/*
export function startRconSession(ipAddr: string, port: number, password: string) {
    return new Promise<Connection>((resolve, reject) => {
        const socket = new Socket()
        const connection = socket.connection({
            name: `${ipAddr}:${port}`,
            password: password,
            ip: ipAddr,
            port: port
        }, {
            reconnect: false,
            keepAlive: true,
            keepAliveInterval: 15000,
            timeout: true,
            timeoutInterval: 1000,
            serverTimeout: 3000,
            packetTimeout: 1000,
            packetTimeoutThresholded: 5
        });

        socket.once('received', () => {
            resolve(connection);
        });

        socket.once('error', (err) => {
            reject(err);
        });
    });
}
*/