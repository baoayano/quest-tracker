const { Client, GatewayIntentBits } = require('discord.js');
const { handleQuest } = require('./utils');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.error('❔〡Cannot find guild with ID:', process.env.GUILD_ID);
        return;
    }

    const channel = guild.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) {
        console.error('❔〡Cannot find channel with ID:', process.env.CHANNEL_ID);
        return;
    }

    setInterval(() => handleQuest(channel), 60 * 1000); // check every 1 minutes
    handleQuest(channel); // check immediately on startup
});

client.login(process.env.BOT_TOKEN);