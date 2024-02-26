import { Client, Events, GatewayIntentBits } from "discord.js";
import { logError, logNormal, logWarning } from "Lib/Log";
import { checkUnregisteredServer, initBotPresence, initPriorityInstances, initRegisterInteractMessages } from "Discord/Initalize";
import { handleInteractions } from "Discord/Interactions";
import Refresher from "Lib/Refresher";
import Config from 'Config';

/* permissions=76800 */
async function app() {
    let refresher;
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent
        ]
    });
    logNormal('[App] Discord Instance 생성');

    client.once(Events.ClientReady, async readyClient => {
        logNormal(`[Discord] Discord 로그인 성공 [${readyClient.user.id}, ${readyClient.user.tag}]`);
        await initBotPresence(readyClient);
        await initRegisterInteractMessages(readyClient);
        await initPriorityInstances(readyClient);
        refresher = new Refresher(readyClient);
    });

    client.on(Events.GuildAvailable, async (guild) => {
        checkUnregisteredServer(guild);
    });

    client.on(Events.InteractionCreate, async interaction => {
        await handleInteractions(interaction);
    });

    client.login(Config.discord.token);
}

app().catch(e => { 
    logError(`${e}`);
    // throw new Error(e) 
});