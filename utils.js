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
                "x-super-properties": superProperties,
            }
        })

        if (response.status !== 200) {
            console.error('❌〡Failed to fetch quests:', response.status, response.statusText);
            return null;
        }

        const quests = response.data.quests || [];
        const excludedQuests = response.data.excluded_quests || [];
        console.log(`😈〡Fetched ${(quests.length + excludedQuests.length)} quests.`);
        return response.data;
    } catch (error) {
        console.error('❌〡Error fetching quests:', error);
        return null;
    }
}

async function trackingNewQuests() {
    try {
        if (!fs.existsSync('data.json') || !fs.existsSync('excluded_data.json')) {
            console.log('📖〡Initializing data.json and excluded_data.json with current quests...');

            const questData = await fetchQuests();

            if (questData) {
                fs.writeFileSync('data.json', JSON.stringify(questData.quests || [], null, 2));
                fs.writeFileSync('excluded_data.json', JSON.stringify(questData.excluded_quests || [], null, 2));
                console.log('✅〡Initialization complete. data.json and excluded_data.json have been created.');
            }

            return null;
        }

        console.log('🤫〡Checking for quest updates: ' + new Date().toLocaleTimeString());

        const data = fs.readFileSync('data.json', 'utf8');
        const oldQuests = JSON.parse(data);
        const excludedData = fs.readFileSync('excluded_data.json', 'utf8');
        const oldExcludedQuests = JSON.parse(excludedData);
        const newQuestData = await fetchQuests();
        const newQuests = newQuestData ? newQuestData.quests || [] : null;
        const newExcludedQuests = newQuestData ? newQuestData.excluded_quests || [] : null;

        if (newQuests && newExcludedQuests) {
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

            const oldExcludedQuestIds = oldExcludedQuests.map(q => q.id);
            const newExcludedQuestIds = newExcludedQuests.map(q => q.id);
            const addedExcludedQuests = newExcludedQuests.filter(q => !oldExcludedQuestIds.includes(q.id));
            const removedExcludedQuests = oldExcludedQuests.filter(q => !newExcludedQuestIds.includes(q.id));
            // you cant detect updated excluded quests because the API doesn't return the config for excluded quests, so we will just ignore that case

            // update data.json and excluded_data.json
            fs.writeFileSync('data.json', JSON.stringify(newQuests, null, 2));
            fs.writeFileSync('excluded_data.json', JSON.stringify(newExcludedQuests, null, 2));
            return { addedQuests, removedQuests, updatedQuests, addedExcludedQuests, removedExcludedQuests };
        }

        return null;
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

        const { addedQuests, removedQuests, updatedQuests, addedExcludedQuests, removedExcludedQuests } = data;

        try {
            if (addedQuests.length > 0) {
                addedQuests.forEach(q => {
                    const result = channel.send({ ...questEmbed(q) });
                    mentionRole(result);
                });
            }

            if (removedQuests.length > 0) {
                removedQuests.forEach(q => {
                    const result = channel.send({ ...questEmbed(q, true) });
                    mentionRole(result);
                });
            }

            if (updatedQuests.length > 0) {
                updatedQuests.forEach(q => {
                    const result = channel.send({ ...questEmbed(q, false, true) });
                    mentionRole(result);
                });
            }

            if (addedExcludedQuests.length > 0) {
                // getQuestById for each addedExcludedQuests and then post them in the channel with a note that they are excluded quests
                for (const q of addedExcludedQuests) {
                    const fullQuest = await getQuestById(q.id);
                    if (fullQuest) {
                        const result = channel.send({ ...questEmbed(fullQuest, false, false, true) });
                        mentionRole(result);
                    }
                }
            }

            if (removedExcludedQuests.length > 0) {
                for (const q of removedExcludedQuests) {
                    const fullQuest = await getQuestById(q.id);
                    if (fullQuest) {
                        const result = channel.send({ ...questEmbed(fullQuest, false, false, true) });
                        mentionRole(result);
                    }
                }
            }
        } catch (error) {
            console.error('❌〡Error handling quests:', error);
        }
    })
}

function mentionRole(msg) {
    if (!process.env.MENTION_ROLE_ID) return;
    const roleId = process.env.MENTION_ROLE_ID;
    msg.then(sentMsg => {
        sentMsg.reply({ content: `<@&${roleId}>`, allowedMentions: { roles: [roleId] } });
    }).catch(err => {
        console.error('❌〡Error mentioning role:', err);
    });
}

async function getQuestById(questId) {
    try {
        const superProperties = await getSuperProperties();

        if (!superProperties) {
            console.error('❌〡Failed to get super properties. Aborting getQuestById.');
            return null;
        }

        const response = await axios.get(`https://discord.com/api/v9/quests/${questId}`, {
            headers: {
                'Authorization': process.env.TOKEN,
                "x-super-properties": superProperties,
            }
        });

        if (response.status !== 200) {
            console.error('❌〡Failed to fetch quest by ID:', response.status, response.statusText);
            return null;
        }

        return response.data;
    } catch (error) {
        console.error('❌〡Error fetching quest by ID:', error);
        return null;
    }
}

function getQuestType(quest) {
    const taskConfig = quest.task_config_v2.tasks;
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

function questEmbed(q, isRemoved = false, isUpdated = false, isExcluded = false) {
    const quest = isExcluded ? q : q.config;
    const embed = new EmbedBuilder()
        .setTitle(quest.messages.game_title)
        .addFields(
            {
                name: 'Quest Name',
                value: quest.messages.quest_name,
                inline: true
            },
            {
                name: 'Quest Type',
                value: getQuestType(quest).join(', '),
                inline: true
            },
            {
                name: 'Publisher',
                value: quest.messages.game_publisher,
                inline: true
            },
            {
                name: 'Rewards',
                value: quest.rewards_config.rewards.map(r => r.messages.name).join(', '),
                inline: true
            },
            {
                name: 'Start Date',
                value: discordTimestamp(new Date(quest.starts_at)),
                inline: true
            },
            {
                name: 'End Date',
                value: discordTimestamp(new Date(quest.expires_at)),
                inline: true
            }
        )
        .setDescription(isRemoved ? 
            `This quest has been deleted.` : isUpdated ? 
            `This quest has been updated.\n\n___\n\n*If you can't see the quest in the Discord app, first try restarting Discord. If the quest still doesn't appear, try using a US, UK, or another supported IP address. We will post an announcement around noon whenever a quest has specific IP requirements (if applicable).*\n\n___` : 
            `A new quest has been added!${isExcluded ? '\n**This Quest is not available in your region.**' : ''}\n\n___\n\n*If you can't see the quest in the Discord app, first try restarting Discord. If the quest still doesn't appear, try using a US, UK, or another supported IP address. We will post an announcement around noon whenever a quest has specific IP requirements (if applicable).*\n\n___`
        )
        .setImage(`https://cdn.discordapp.com/${quest.assets.hero}`)
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
    handleQuest,
    getSuperProperties,
}