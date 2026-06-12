# Discord Quest Tracker

A Node.js application that tracks **Discord Quests** and sends notifications to
a Discord channel when a quest is added, removed, or updated.

The application calls the Discord Quests API every minute, compares the latest
results with the data stored in `data.json`, and sends changes as Discord
embeds.

## Features

- Checks the Discord Quest list immediately on startup and every minute.
- Detects newly added quests.
- Detects removed or expired quests.
- Detects changes to start times, expiration times, and rewards.
- Displays the game title, quest type, publisher, rewards, dates, and artwork
  in Discord embeds.
- Stores the latest quest state in `data.json`.

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
```

| Variable | Description |
| --- | --- |
| `TOKEN` | User account token used to call the Discord Quests API. |
| `BOT_TOKEN` | Discord bot token used to send notifications. |
| `GUILD_ID` | ID of the Discord server containing the notification channel. |
| `CHANNEL_ID` | ID of the Discord channel that receives quest notifications. |

To obtain the server and channel IDs, enable **Developer Mode** in Discord,
right-click the server or channel, and select **Copy ID**.

## Running the Application

```bash
node app.js
```

After the bot logs in successfully, the application checks for quests
immediately and continues checking every minute.

On the first run, if `data.json` does not exist, the application stores the
current quest list as its initial state. Change notifications are sent from
subsequent checks.

## How It Works

1. `app.js` logs in to the Discord bot and locates the configured server and
   channel.
2. `utils.js` reads `device.json`, encodes it as `x-super-properties`, and calls
   the Discord Quests API.
3. The latest quest list is compared with the state stored in `data.json`.
4. Added, removed, and updated quests are sent to the Discord channel.
5. `data.json` is overwritten with the latest state.

A quest is considered updated when any of the following values change:

- Start time.
- Expiration time.
- Reward list.

## Project Structure

```text
quest_tracker/
├── app.js          # Initializes the bot and schedules quest checks
├── utils.js        # Calls the API, compares data, and creates Discord embeds
├── device.json     # Client information used for x-super-properties
├── data.json       # Latest stored quest state
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
- **Reset the initial state:** delete `data.json` and restart the application.

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