import _ from "lodash";
import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import Config, { saveStorage } from 'Config';
import { getDeleteInteractionMessage, getNoticeMessage, getRegisterInteractionMessage } from "Discord/Message";

async function app() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    client.once(Events.ClientReady, async readyClient => {
        await interactionMessageUpdate(readyClient);
    });

    client.login(Config.discord.token);
}

app().catch(e => { 
    throw new Error(e) 
});

async function interactionMessageUpdate(client: Client<true>) {
    const guilds = client.guilds.cache;
    const { storage } = Config;
    const noticeEmbed = getNoticeMessage();
    const registerEmbed = getRegisterInteractionMessage();
    const deleteEmbed = getDeleteInteractionMessage();

    for (const [guildId, guild] of guilds) {
        const instances = storage.get(guildId);
        if (instances) {
            const { channelId, noticeMessageId, registerMessageId, deleteMessageId } = instances.channels.interaction;
            const channel = await client.channels.fetch(channelId) as TextChannel;

            const [noticeMessage, registerMessage, deleteMessage] = await Promise.all([
                channel.messages.fetch(noticeMessageId),
                channel.messages.fetch(registerMessageId),
                channel.messages.fetch(deleteMessageId)
            ]);

            await noticeMessage.edit({ ...noticeEmbed });
            await registerMessage.edit({ ...registerEmbed });
            await deleteMessage.edit({ ...deleteEmbed });
        }
    }
}