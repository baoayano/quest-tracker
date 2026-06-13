# Discord Quest Tracker

A Discord bot built with [`discord.js`](https://discord.js.org/) that tracks
**Discord Quests** and sends notifications to a Discord channel when a quest is
added, removed, or updated.

The application calls the Discord Quests API every minute, compares the latest
available and region-excluded quests with the snapshots stored in `data.json`
and `excluded_data.json`, and sends changes as Discord embeds.

## Features

- Checks the Discord Quest list immediately on startup and every minute.
- Detects newly added quests.
- Detects removed or expired quests.
- Detects changes to start times, expiration times, and rewards.
- Tracks quests excluded from the current account's region and identifies them
  in notifications.
- Fetches full quest details by ID when an excluded quest enters or leaves the
  excluded quest list.
- Displays the quest title, quest type, publisher, rewards, dates, and cover
  in Discord embeds.
- Stores available and excluded quest snapshots separately in `data.json` and
  `excluded_data.json`.

## Requirements

- [Node.js](https://nodejs.org/) 18 or later.
- A Discord bot added to the server that will receive notifications.
- Permission for the bot to view the channel, send messages, and embed links.
- The Discord server ID and notification channel ID.
- A token used to access the Discord Quests API.

## Installation

```bash
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Using PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the environment variables in `.env`:

```env
TOKEN=your_discord_token
BOT_TOKEN=your_discord_bot_token
GUILD_ID=your_guild_id
CHANNEL_ID=your_channel_id
MENTION_ROLE_ID=your_mention_role_id
```

| Variable | Description |
| --- | --- |
| `TOKEN` | User account token used to call the Discord Quests API. |
| `BOT_TOKEN` | Discord bot token used to send notifications. |
| `GUILD_ID` | ID of the Discord server containing the notification channel. |
| `CHANNEL_ID` | ID of the Discord channel that receives quest notifications. |
| `MENTION_ROLE_ID` | The ID of the role in the Discord server you are using for notifications. |

To obtain the server and channel IDs, enable **Developer Mode** in Discord,
right-click the server or channel, and select **Copy ID**.

## Running the Application

```bash
node app.js
```

After the bot logs in successfully, the application checks for quests
immediately and continues checking every minute.

On the first run, or when either snapshot file is missing, the application
stores the current available quests in `data.json` and region-excluded quests
in `excluded_data.json`. Change notifications are sent from subsequent checks.

## How It Works

1. `app.js` logs in to the Discord bot and locates the configured server and
   channel.
2. `utils.js` reads `device.json`, encodes it as `x-super-properties`, and calls
   the Discord Quests API.
3. Available quests are compared with `data.json`, while region-excluded
   quests are compared with `excluded_data.json`.
4. Added, removed, and updated available quests are sent to the Discord
   channel.
5. When a quest enters or leaves the excluded list, the bot fetches its full
   details from the quest-by-ID endpoint and sends an embed that marks it as
   unavailable in the current region.
6. Both snapshot files are overwritten with the latest state.

A quest is considered updated when any of the following values change:

- Start time.
- Expiration time.
- Reward list.

Updated excluded quests cannot be detected because the excluded quest list
does not include full quest configuration data.

## Project Structure

```text
quest_tracker/
├── app.js          # Initializes the bot and schedules quest checks
├── utils.js        # Calls the API, compares data, and creates Discord embeds
├── device.json     # Client information used for x-super-properties
├── data.json       # Latest available quest state
├── excluded_data.json # Latest region-excluded quest state
├── .env.example    # Environment variable configuration template
└── package.json    # Project dependencies
```

## Changing the Check Interval

The default check interval is one minute. Change the following value in
`app.js` to use a different interval:

```js
setInterval(() => handleQuest(channel), 60 * 1000);
```

For example, use `5 * 60 * 1000` to check every five minutes.

## Troubleshooting

- **Server or channel cannot be found:** verify `GUILD_ID` and `CHANNEL_ID`, and
  make sure the bot has been added to the server.
- **The bot cannot send embeds:** grant the bot `View Channel`, `Send Messages`,
  and `Embed Links` permissions in the notification channel.
- **Quests API request fails:** verify `TOKEN`, the network connection, and the
  contents of `device.json`.
- **Reset the initial state:** delete both `data.json` and
  `excluded_data.json`, then restart the application.

## Security and Important Notes

- Do not commit or share the `.env` file. Discord tokens may grant access to the
  corresponding user account or bot.
- This project uses a user account token to call a non-public Discord API.
  Automating a user account with its token may violate Discord's Terms of
  Service. Evaluate the risks and only use the project with accounts and
  servers you are authorized to manage.
- The Discord API structure and behavior may change without notice.

## Dependencies

- [`discord.js`](https://discord.js.org/) - logs in to the bot and sends
  Discord embeds.
- [`axios`](https://axios-http.com/) - calls the Discord Quests API.
- [`dotenv`](https://github.com/motdotla/dotenv) - loads environment variables
  from `.env`.
