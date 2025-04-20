const { Events, EmbedBuilder } = require("discord.js")
const database = require("../utils/database")

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return

    // Ignore messages in DMs
    if (!message.guild) {
      // Handle modmail if enabled
      handleModmail(message)
      return
    }

    // Get guild settings
    const guildSettings = database.getGuild(message.guild.id)

    // Handle AFK status
    handleAfkStatus(message)

    // Handle leveling system
    if (guildSettings.levelSystem && guildSettings.levelSystem.enabled) {
      handleLeveling(message, guildSettings)
    }

    // Handle custom commands
    if (message.content.startsWith("!")) {
      const args = message.content.slice(1).trim().split(/ +/)
      const commandName = args.shift().toLowerCase()

      if (guildSettings.customCommands && guildSettings.customCommands[commandName]) {
        const command = guildSettings.customCommands[commandName]
        message.channel.send(command.response)
      }
    }

    // Handle tags
    if (message.content.startsWith("?")) {
      const tagName = message.content.slice(1).trim().toLowerCase()

      if (guildSettings.tags && guildSettings.tags[tagName]) {
        const tag = guildSettings.tags[tagName]
        tag.uses++
        database.save()
        message.channel.send(tag.content)
      }
    }

    // Handle auto-responders
    if (guildSettings.autoResponders && guildSettings.autoResponders.enabled) {
      handleAutoResponders(message, guildSettings)
    }

    // You can add custom message handling here
    // For example, auto-moderation, etc.

    // Example: Log messages for debugging
    console.log(`[${message.guild.name}] ${message.author.tag}: ${message.content}`)
  },
}

// Function to handle AFK status
function handleAfkStatus(message) {
  // Check if the message author is AFK
  const userData = database.getUser(message.author.id)
  if (userData.afk && userData.afk.status) {
    // Remove AFK status
    userData.afk.status = false
    database.save()

    // Try to remove [AFK] from nickname
    try {
      const member = message.guild.members.cache.get(message.author.id)
      if (member && member.manageable && member.nickname?.startsWith("[AFK]")) {
        const newNick = member.nickname.replace("[AFK] ", "")
        member.setNickname(newNick === message.author.username ? null : newNick)
      }
    } catch (error) {
      console.error("Error removing AFK nickname:", error)
    }

    message.reply(`Welcome back! I've removed your AFK status.`).then((msg) => {
      setTimeout(() => msg.delete().catch(() => {}), 5000)
    })
  }

  // Check for mentions of AFK users
  message.mentions.users.forEach((user) => {
    const mentionedUserData = database.getUser(user.id)
    if (mentionedUserData.afk && mentionedUserData.afk.status) {
      const timeSince = Math.floor((Date.now() - mentionedUserData.afk.since) / 60000)
      message.reply(
        `${user.username} is AFK: ${mentionedUserData.afk.reason} (${timeSince} minute${timeSince !== 1 ? "s" : ""} ago)`,
      )
    }
  })
}

// Function to handle leveling
async function handleLeveling(message, guildSettings) {
  const userId = message.author.id
  const userData = database.getUser(userId)
  const xpData = userData.xp

  // Check if the user can earn XP (cooldown of 1 minute)
  const now = Date.now()
  if (xpData.lastMessageTime && now - xpData.lastMessageTime < 60000) {
    return
  }

  // Generate random XP between 15-25
  const earnedXp = Math.floor(Math.random() * 11) + 15

  // Add XP to user
  xpData.xp += earnedXp
  xpData.totalXp += earnedXp
  xpData.lastMessageTime = now

  // Calculate XP needed for next level
  const xpNeeded = xpData.level * 100

  // Check if user leveled up
  if (xpData.xp >= xpNeeded) {
    xpData.xp -= xpNeeded
    xpData.level += 1

    // Save the data
    database.save()

    // Check for role rewards
    if (guildSettings.levelSystem.roles && guildSettings.levelSystem.roles[xpData.level]) {
      const roleId = guildSettings.levelSystem.roles[xpData.level]
      const role = message.guild.roles.cache.get(roleId)

      if (role) {
        try {
          await message.member.roles.add(role)
        } catch (error) {
          console.error(`Failed to add role ${roleId} to user ${userId}:`, error)
        }
      }
    }

    // Send level up message
    if (guildSettings.levelSystem.announceChannel) {
      const channel = message.guild.channels.cache.get(guildSettings.levelSystem.announceChannel)
      if (channel) {
        channel.send(
          `🎉 Congratulations ${message.author}! You've reached level ${xpData.level}!${
            guildSettings.levelSystem.roles && guildSettings.levelSystem.roles[xpData.level]
              ? ` You've been awarded the <@&${guildSettings.levelSystem.roles[xpData.level]}> role!`
              : ""
          }`,
        )
      }
    } else {
      message.channel.send(
        `🎉 Congratulations ${message.author}! You've reached level ${xpData.level}!${
          guildSettings.levelSystem.roles && guildSettings.levelSystem.roles[xpData.level]
            ? ` You've been awarded the <@&${guildSettings.levelSystem.roles[xpData.level]}> role!`
            : ""
        }`,
      )
    }
  } else {
    // Just save the data
    database.save()
  }
}

// Function to handle modmail
async function handleModmail(message) {
  // Check if the message is from a user DMing the bot
  if (message.channel.type !== 1) return // 1 is DM channel

  // Get all guilds the bot is in
  const guilds = message.client.guilds.cache.values()

  for (const guild of guilds) {
    // Get guild settings
    const guildSettings = database.getGuild(guild.id)

    // Check if modmail is enabled in this guild
    if (!guildSettings.modmail || !guildSettings.modmail.enabled) continue

    // Check if user is blocked
    if (guildSettings.modmail.blockedUsers.some((u) => u.id === message.author.id)) {
      // Find the block entry to get the reason
      const blockEntry = guildSettings.modmail.blockedUsers.find((u) => u.id === message.author.id)
      message.author.send(`You are blocked from using modmail in ${guild.name}. Reason: ${blockEntry.reason}`)
      return
    }

    // Check if user already has an active thread
    const activeThread = guildSettings.modmail.activeThreads[message.author.id]
    if (activeThread) {
      // Forward message to the thread
      try {
        const channel = await guild.channels.fetch(activeThread.channelId).catch(() => null)
        if (channel) {
          // Create embed for the message
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({
              name: message.author.tag,
              iconURL: message.author.displayAvatarURL(),
            })
            .setDescription(message.content)
            .setTimestamp()

          // Handle attachments
          if (message.attachments.size > 0) {
            embed.addFields({
              name: "Attachments",
              value: message.attachments.map((a) => a.url).join("\n"),
            })
          }

          await channel.send({ embeds: [embed] })
          message.react("✅").catch(() => {})
        } else {
          // Channel was deleted, remove from active threads
          delete guildSettings.modmail.activeThreads[message.author.id]
          database.save()
          message.author.send(
            `Your modmail thread in ${guild.name} could not be found. Please send your message again to create a new thread.`,
          )
        }
      } catch (error) {
        console.error("Error forwarding modmail message:", error)
        message.author.send("There was an error forwarding your message. Please try again later.")
      }
      return
    }

    // Create a new thread for the user
    try {
      // Get the modmail category
      const category = await guild.channels.fetch(guildSettings.modmail.categoryId).catch(() => null)
      if (!category) continue

      // Get the staff role
      const staffRole = await guild.roles.fetch(guildSettings.modmail.staffRoleId).catch(() => null)
      if (!staffRole) continue

      // Create the thread channel
      const threadChannel = await guild.channels.create({
        name: `modmail-${message.author.username}`,
        type: 0, // Text channel
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: ["ViewChannel"],
          },
          {
            id: staffRole.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
        ],
      })

      // Send initial message with user info
      const userInfoEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("New Modmail Thread")
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: "User", value: `${message.author.tag} (${message.author.id})` },
          { name: "Account Created", value: `<t:${Math.floor(message.author.createdTimestamp / 1000)}:R>` },
          {
            name: "Server Member Since",
            value: `${
              guild.members.cache.has(message.author.id)
                ? `<t:${Math.floor(guild.members.cache.get(message.author.id).joinedTimestamp / 1000)}:R>`
                : "Not a member"
            }`,
          },
        )
        .setFooter({ text: "Use /modmail close to close this thread" })
        .setTimestamp()

      await threadChannel.send({ embeds: [userInfoEmbed] })

      // Send the user's message
      const messageEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL(),
        })
        .setDescription(message.content)
        .setTimestamp()

      // Handle attachments
      if (message.attachments.size > 0) {
        messageEmbed.addFields({
          name: "Attachments",
          value: message.attachments.map((a) => a.url).join("\n"),
        })
      }

      await threadChannel.send({ embeds: [messageEmbed] })

      // Add to active threads
      guildSettings.modmail.activeThreads[message.author.id] = {
        channelId: threadChannel.id,
        createdAt: Date.now(),
      }
      database.save()

      // Send confirmation to user
      message.author.send(
        `Your message has been sent to the staff team of **${guild.name}**. You will be notified when they respond.`,
      )
      message.react("✅").catch(() => {})
      return
    } catch (error) {
      console.error("Error creating modmail thread:", error)
    }
  }

  // If we get here, no valid guild was found or an error occurred
  message.author.send(
    "I couldn't process your message. Make sure we share a server and that the modmail system is set up.",
  )
}

// Function to handle auto-responders
function handleAutoResponders(message, guildSettings) {
  const autoResponders = guildSettings.autoResponders.responses

  for (const responder of autoResponders) {
    let shouldRespond = false
    const content = responder.caseSensitive ? message.content : message.content.toLowerCase()
    const trigger = responder.caseSensitive ? responder.trigger : responder.trigger.toLowerCase()

    if (responder.exact) {
      // Exact match
      shouldRespond = content === trigger
    } else {
      // Contains match
      shouldRespond = content.includes(trigger)
    }

    if (shouldRespond) {
      // Increment uses counter
      responder.uses++
      database.save()

      // Send response
      message.channel.send(responder.response)
      break // Only trigger one auto-responder per message
    }
  }
}
