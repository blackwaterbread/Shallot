import { Socket } from '@senfo/battleye';
import { DiscordUser } from "Config";

/**
 * RCon UDP connection is must be continuously, so sessions are volatile
 */

const SESSIONS = new Map<string, RconSession>();

export interface RconSession {
    user: DiscordUser;
    session: Socket;
    expired: number;
}

export function startRconSession(ipAddr: string, port: number, password: string) {
    return new Promise<Socket>((resolve, reject) => {
        const socket = new Socket()
        socket.connection({
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
            resolve(socket);
        });

        socket.once('error', (err) => {
            reject(err);
        });
    });
}

export function getRconSessions() {
    return SESSIONS;
}