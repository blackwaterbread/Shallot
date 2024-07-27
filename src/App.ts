import { Client, Events, GatewayIntentBits } from "discord.js";
import { logError, logNormal } from "Lib/Log";
import { checkUnregisteredServer, initBotPresence } from "Discord/Initalize";
import { handleInteractions } from "Discord/Interactions";
import { getConfigs } from 'Config';
import { handleCommands, initCommands } from "Discord/Commands";
import { initDiscordClient, initRankingRefresher, initServerRefresher } from "Lib/Schedulers";

/* permissions=76800 */
async function app() {
    const configs = getConfigs();
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent,
        ]
    });

    client.once(Events.ClientReady, async readyClient => {
        logNormal(`[Discord] Successfully Logged In: [${readyClient.user.id}, ${readyClient.user.tag}]`);
        await initCommands(readyClient);
        await initBotPresence(readyClient);
        initDiscordClient(readyClient);
        initServerRefresher();
        initRankingRefresher();
    });

    client.on(Events.GuildAvailable, async (guild) => {
        checkUnregisteredServer(guild);
    });

    client.on(Events.InteractionCreate, async interaction => {
        await handleInteractions(interaction);
        await handleCommands(interaction);
    });
    
    client.login(configs.token);
}

app().catch(e => { 
    logError(`${e}`);
});