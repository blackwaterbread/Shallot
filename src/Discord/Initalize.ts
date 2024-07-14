import _ from "lodash";
import { ActivityType, Client, Guild } from "discord.js";
import { logNormal, logWarning } from "Lib/Log";
import { getAppInfo } from "Config";
import { getStorage } from "Storage";
import revision from 'child_process';

const storage = getStorage();

export async function initBotPresence(client: Client<true>) {
    const app = getAppInfo();
    const commitHash = revision
        .execSync('git rev-parse HEAD')
        .toString().trim().substring(0, 7);

    const version = app.isDevelopment ? `develop/${commitHash}` : `v${app.version}/${commitHash}`;

    client.user.setPresence({
        activities: [{ name: version, type: ActivityType.Playing }],
        status: 'online',
    });

    logNormal('[Discord] Completed setPresence');
}

export function checkUnregisteredServer(guild: Guild) {
    if (!storage.get(guild.id)) {
        logWarning(`[App] There's unregistered guild: [${guild.id}|${guild.name}]`);
    }
}