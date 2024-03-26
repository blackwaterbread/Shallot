import _ from "lodash";
import { ActivityType, Client, Guild } from "discord.js";
import { logNormal, logWarning } from "Lib/Log";
import { getStorage, getAppInfo } from "Config";
import revision from 'child_process';

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

    logNormal('[Discord] 봇 상태 설정 완료');
}

export function checkUnregisteredServer(guild: Guild) {
    const storage = getStorage();
    if (!storage.get(guild.id)) {
        logWarning(`[App] ID가 등록되지 않은 서버가 있습니다: [${guild.id}|${guild.name}]`);
    }
}