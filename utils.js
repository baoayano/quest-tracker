const axios = require('axios');
const fs = require('fs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ENDPOINT = 'https://discord.com/api/v9/quests/@me';

async function getSuperProperties() {
    try {
        const superProperties = await fs.readFileSync('device.json', 'utf8');
        // base64 encode
        return Buffer.from(JSON.stringify(JSON.parse(superProperties))).toString('base64');
    } catch (error) {
        console.error('❌〡Error reading device.json:', error);
        return null;
    }
}

async function fetchQuests() {
    try {
        const superProperties = await getSuperProperties();
        if (!superProperties) {
            console.error('❌〡Failed to get super properties. Aborting fetchQuests.');
            return null;
        }
        const response = await axios.get(ENDPOINT, {
            headers: {
                'Authorization': process.env.TOKEN,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.993 Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36',
                "x-debug-options": "bugReporterEnabled",
                "x-discord-locale": "en-US",
                "x-discord-timezone": "Asia/Ho_Chi_Minh",
                "x-super-properties": superProperties,
            }
        })

        if (response.status !== 200) {
            console.error('❌〡Failed to fetch quests:', response.status, response.statusText);
            return null;
        }

        const quests = response.data.quests;
        console.log(`😈〡Fetched ${quests.length} quests.`);
        return quests;
    } catch (error) {
        console.error('❌〡Error fetching quests:', error);
        return null;
    }
}

async function trackingNewQuests() {
    try {
        if (!fs.existsSync('data.json')) {
            console.log('📖〡Initializing data.json with current quests...');
            const quests = await fetchQuests();
            if (quests) {
                fs.writeFileSync('data.json', JSON.stringify(quests, null, 2));
            }

            return null;
        } else {
            console.log('🤫〡Checking for quest updates: ' + new Date().toLocaleTimeString());
            const data = fs.readFileSync('data.json', 'utf8');
            const oldQuests = JSON.parse(data);
            const newQuests = await fetchQuests();

            if (newQuests) {
                const oldQuestIds = oldQuests.map(q => q.id);
                const newQuestIds = newQuests.map(q => q.id);
                const addedQuests = newQuests.filter(q => !oldQuestIds.includes(q.id));
                const removedQuests = oldQuests.filter(q => !newQuestIds.includes(q.id));
                const updatedQuests = newQuests.filter(q => 
                    oldQuestIds.includes(q.id) && 
                    (q.config.starts_at !== oldQuests.find(oq => oq.id === q.id).config.starts_at ||
                    q.config.expires_at !== oldQuests.find(oq => oq.id === q.id).config.expires_at ||
                    q.config.rewards_config.rewards.map(r => r.messages.name).join(',') !== oldQuests.find(oq => oq.id === q.id).config.rewards_config.rewards.map(r => r.messages.name).join(','))
                );

                // update data.json
                fs.writeFileSync('data.json', JSON.stringify(newQuests, null, 2));
                return { addedQuests, removedQuests, updatedQuests };
            }

            return null;
        }
    } catch (error) {
        console.error('❌〡Error reading old quests:', error);
        return null;
    }
}

function handleQuest(channel) {
    trackingNewQuests().then(async (data) => {
        if (!data) {
            console.log('💔〡No quest updates found.');
            return;
        }

        const { addedQuests, removedQuests, updatedQuests } = data;

        try {
            if (addedQuests.length > 0) {
                addedQuests.forEach(q => {
                    channel.send({ ...questEmbed(q) });
                });
            }

            if (removedQuests.length > 0) {
                removedQuests.forEach(q => {
                    channel.send({ ...questEmbed(q, true) });
                });
            }

            if (updatedQuests.length > 0) {
                updatedQuests.forEach(q => {
                    channel.send({ ...questEmbed(q, false, true) });
                });
            }
        } catch (error) {
            console.error('❌〡Error handling quests:', error);
        }
    })
}

function getQuestType(quest) {
    const taskConfig = quest.config.task_config_v2.tasks;
    const listType = [];

    if ('STREAM_ON_DESKTOP' in taskConfig) listType.push('STREAM_ON_DESKTOP');
    if ('PLAY_ON_DESKTOP' in taskConfig) listType.push('PLAY_ON_DESKTOP');
    if ('PLAY_ON_DESKTOP_V2' in taskConfig) listType.push('PLAY_ON_DESKTOP_V2');
    if ('PLAY_ON_XBOX' in taskConfig) listType.push('PLAY_ON_XBOX');
    if ('PLAY_ON_PLAYSTATION' in taskConfig) listType.push('PLAY_ON_PLAYSTATION');
    if ('WATCH_VIDEO' in taskConfig) listType.push('WATCH_VIDEO');
    if ('WATCH_VIDEO_ON_MOBILE' in taskConfig) listType.push('WATCH_VIDEO_ON_MOBILE');
    if ('PLAY_ACTIVITY' in taskConfig) listType.push('PLAY_ACTIVITY');
    if ('ACHIEVEMENT_IN_GAME' in taskConfig) listType.push('ACHIEVEMENT_IN_GAME');
    if ('ACHIEVEMENT_IN_ACTIVITY' in taskConfig) listType.push('ACHIEVEMENT_IN_ACTIVITY');
    return listType;
}

function questEmbed(quest, isRemoved = false, isUpdated = false) {
    const embed = new EmbedBuilder()
        .setTitle(quest.config.messages.game_title)
        .addFields(
            {
                name: 'Quest Name',
                value: quest.config.messages.quest_name,
                inline: true
            },
            {
                name: 'Quest Type',
                value: getQuestType(quest).join(', '),
                inline: true
            },
            {
                name: '\t',
                value: '\t',
            },
            {
                name: 'Publisher',
                value: quest.config.messages.game_publisher,
                inline: true
            },
            {
                name: 'Rewards',
                value: quest.config.rewards_config.rewards.map(r => r.messages.name).join(', '),
                inline: true
            },
            {
                name: '\t',
                value: '\t',
            },
            {
                name: 'Start Date',
                value: discordTimestamp(new Date(quest.config.starts_at)),
                inline: true
            },
            {
                name: 'End Date',
                value: discordTimestamp(new Date(quest.config.expires_at)),
                inline: true
            }
        )
        .setImage(`https://cdn.discordapp.com/${quest.config.assets.hero}`)
        .setThumbnail("https://cdn3.emoji.gg/emojis/66366-completed-a-quest.png")
        .setFooter({ text: `ID: ${quest.id} | Status: ${isRemoved ? 'Deleted' : isUpdated ? 'Updated' : 'New'}` })
        .setColor(isRemoved ? "#f12e2e" : isUpdated ? "#f1c40f" : "#28e285");

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('View Quest')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/quests/${quest.id}`)
    );

    return { embeds: [embed], components: [buttons] };
}

function discordTimestamp(date) {
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    return `<t:${unixTimestamp}:F>`;
}

module.exports = {
    handleQuest
}