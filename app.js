const { Client, GatewayIntentBits } = require('discord.js');
const { handleQuest } = require('./utils');
const fs = require('fs');
require('dotenv').config();

if (
    !process.env.BOT_TOKEN ||
    !process.env.GUILD_ID ||
    !process.env.CHANNEL_ID ||
    !process.env.TOKEN
) {
    console.error('❌〡Missing required environment variables. Please check your .env file.');
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.error('❔〡Cannot find guild with ID:', process.env.GUILD_ID);
        process.exit(1);
    }

    const channel = guild.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) {
        console.error('❔〡Cannot find channel with ID:', process.env.CHANNEL_ID);
        process.exit(1);
    }

    setInterval(() => handleQuest(channel), 60 * 1000); // check every 1 minutes
    handleQuest(channel); // check immediately on startup
});

client.login(process.env.BOT_TOKEN);