# Bleed JS (Updated)

A modern Discord bot built with discord.js v14, updated from the original bleed.js bot.

## Features

- Slash command support
- Modern discord.js v14 architecture
- Modular command and event handling
- Music system with YouTube support
- Economy system with daily rewards, work, and shop
- Last.fm integration
- Moderation commands
- Fun commands
- Utility commands
- Information commands
- Welcome messages and auto-roles
- Reaction roles
- Server settings configuration
- Voice Master system for user-created voice channels
- Leveling system with role rewards
- Custom commands
- AFK system
- Giveaway system
- Ticket system
- Auto-moderation system
- Logging system
- Reminder system
- Starboard
- Server backup system
- Welcome image generator
- Advanced poll system
- Translation system
- Role menu system
- Suggestion system
- Twitch and YouTube notifications
- Weather command
- Urban Dictionary lookup
- Modmail system
- Tag system
- Scheduled announcements
- Role management commands
- Channel management commands

## Setup

1. Clone this repository
2. Install dependencies with `npm install`
3. Update the `config.json` file with your:
   - Bot token
   - Client ID (your bot's application ID)
   - Guild ID (for testing in a specific server)
   - Last.fm API key (if you want to use Last.fm commands)
4. Run the bot with `npm start`

## Command Categories

- **Fun**: 8ball, coinflip, meme
- **Information**: serverinfo, userinfo
- **Last.fm**: nowplaying, topartists, set
- **Moderation**: ban, kick, clear, timeout, warn
- **Utility**: ping, help, avatar, poll, afk, translate, weather, urban, tag, schedule
- **Music**: play, skip, queue, stop
- **Economy**: balance, daily, work, pay, leaderboard, shop
- **Settings**: welcome, autorole, modlog
- **Reaction Roles**: reactionrole, rolemenu
- **Voice**: voicemaster, lock, unlock, invite, vkick, limit, rename, claim, transfer, bitrate, region, activity, permissions, template, voiceinfo
- **Leveling**: rank, levels, levelsetup
- **Custom Commands**: customcommand
- **Giveaway**: giveaway start, end, reroll, list
- **Tickets**: ticket setup, panel, add, remove, close
- **Auto-Moderation**: automod enable, disable, exempt, unexempt, action, threshold, wordlist, settings
- **Logging**: logging setup, enable, disable, ignore, unignore, settings
- **Reminder**: reminder set, list, cancel
- **Starboard**: starboard setup, disable, threshold, emoji, ignore, unignore, settings
- **Backup**: backup create, list, load, delete, info
- **Welcome Images**: welcomeimage setup, disable, test, background, message, color
- **Advanced Polls**: advancedpoll create, end, list
- **Suggestions**: suggestion setup, disable, create, approve, reject, implement, consider
- **Integrations**: twitch add/remove/list, youtube add/remove/list
- **Modmail**: modmail setup, disable, close, reply, block, unblock
- **Role Management**: role create, delete, edit, add, remove, info, list
- **Channel Management**: channel create, delete, edit, info, list

## Voice Master System

The Voice Master system allows users to create and manage their own voice channels. Here's how it works:

1. Set up the system with `/voicemaster setup`
2. Create a control panel with `/voicepanel` for easy management
3. Users join the designated "create channel" to get their own voice channel
4. The channel owner can manage their channel through the panel or commands:
   - Lock/unlock the channel
   - Set user limits
   - Rename the channel
   - Kick users
   - Invite users to locked channels
   - Transfer ownership
   - Set bitrate and region
   - Start Discord activities
   - Manage user permissions
   - Save and load channel templates
5. If the owner leaves, another user can claim ownership
6. When everyone leaves the channel, it's automatically deleted

## Giveaway System

The giveaway system allows server staff to create and manage giveaways:

1. Create a giveaway with `/giveaway start`
2. Set prize, duration, number of winners, and optional requirements
3. End a giveaway early with `/giveaway end`
4. Reroll winners with `/giveaway reroll`
5. View all active giveaways with `/giveaway list`

## Ticket System

The ticket system provides a way for users to get support:

1. Set up the system with `/ticket setup`
2. Create custom ticket panels with `/ticket panel`
3. Users can create tickets by clicking the button on the panel
4. Staff can add or remove users from tickets
5. Close tickets when the issue is resolved

## Auto-Moderation System

The auto-moderation system helps keep your server clean:

1. Enable features with `/automod enable`
2. Configure thresholds and actions
3. Exempt specific roles or channels
4. Manage banned words
5. View current settings with `/automod settings`

## Logging System

The logging system tracks events in your server:

1. Set up logging with `/logging setup`
2. Enable specific event categories
3. Ignore specific channels or roles
4. View current settings with `/logging settings`

## Starboard

The starboard highlights popular messages:

1. Set up the starboard with `/starboard setup`
2. Configure the threshold and emoji
3. Messages that receive enough reactions will be posted to the starboard channel

## Server Backup System

The backup system allows administrators to create and restore server backups:

1. Create a backup with `/backup create`
2. View available backups with `/backup list`
3. Get detailed information about a backup with `/backup info`
4. Load a backup with `/backup load`
5. Delete old backups with `/backup delete`

## Welcome Image System

The welcome image system creates custom images for new members:

1. Set up welcome images with `/welcomeimage setup`
2. Customize the background, message, and colors
3. Test the welcome image with `/welcomeimage test`

## Advanced Poll System

Create interactive polls with multiple options:

1. Create a poll with `/advancedpoll create`
2. Set options, duration, and whether users can vote for multiple options
3. End polls early with `/advancedpoll end`
4. View all active polls with `/advancedpoll list`

## Suggestion System

The suggestion system allows users to submit ideas:

1. Set up the system with `/suggestion setup`
2. Users can create suggestions with `/suggestion create`
3. Staff can approve, reject, implement, or consider suggestions
4. Users can vote on suggestions

## Modmail System

The modmail system provides a private way for users to contact staff:

1. Set up modmail with `/modmail setup`
2. Users can DM the bot to create a thread
3. Staff can reply to users through the thread
4. Close threads when issues are resolved
5. Block problematic users if needed

## License

MIT
