import { Client, Events, GatewayIntentBits } from "discord.js";
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { logError, logNormal } from "Lib/Log";
import { checkUnregisteredServer, initBotPresence, initRegisterInteractMessages } from "Discord/Initalize";
import { handleInteractions } from "Discord/Interactions";
import { taskRefresh } from "Lib/Refresher";
import { getConfigs } from 'Config';

/* permissions=76800 */
async function app() {
    const configs = getConfigs();
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    client.once(Events.ClientReady, async readyClient => {
        logNormal(`[Discord] Discord 로그인 성공 [${readyClient.user.id}, ${readyClient.user.tag}]`);
        await initBotPresence(readyClient);
        await initRegisterInteractMessages(readyClient);
        const scheduler = new ToadScheduler();
        const task = new AsyncTask('serverRefresh', async () => taskRefresh(readyClient));
        const job = new SimpleIntervalJob({ seconds: 30, runImmediately: true }, task, { preventOverrun: true });
        scheduler.addSimpleIntervalJob(job);
    });

    client.on(Events.GuildAvailable, async (guild) => {
        checkUnregisteredServer(guild);
    });

    client.on(Events.InteractionCreate, async interaction => {
        await handleInteractions(interaction);
    });
    
    client.login(configs.token);
}

app().catch(e => { 
    logError(`${e}`);
    // throw new Error(e) 
});