const { Events } = require("discord.js")
const database = require("../utils/database")

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return

    // Handle partial reactions
    if (reaction.partial) {
      try {
        await reaction.fetch()
      } catch (error) {
        console.error("Error fetching reaction:", error)
        return
      }
    }

    // Handle partial messages
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch()
      } catch (error) {
        console.error("Error fetching message:", error)
        return
      }
    }

    // Get guild settings
    const guildSettings = database.getGuild(reaction.message.guild.id)

    // Handle reaction roles
    if (guildSettings.reactionRoles) {
      const messageId = reaction.message.id
      const emojiId = reaction.emoji.id || reaction.emoji.name

      // Check if this message has reaction roles
      const reactionRole = guildSettings.reactionRoles.find((rr) => rr.messageId === messageId && rr.emoji === emojiId)

      if (reactionRole) {
        const member = await reaction.message.guild.members.fetch(user.id).catch(() => null)
        if (member) {
          try {
            await member.roles.remove(reactionRole.roleId)
          } catch (error) {
            console.error("Error removing reaction role:", error)
          }
        }
      }
    }

    // Handle starboard
    if (guildSettings.starboard && guildSettings.starboard.enabled) {
      // Check if the emoji matches the starboard emoji
      if (
        reaction.emoji.name === guildSettings.starboard.emoji ||
        reaction.emoji.toString() === guildSettings.starboard.emoji
      ) {
        // Check if the channel is ignored
        if (guildSettings.starboard.ignoredChannels.includes(reaction.message.channel.id)) return

        // Check if this message is in the starboard
        const starredMessages = guildSettings.starboard.starredMessages || {}
        if (starredMessages[reaction.message.id]) {
          // Get the count of this reaction
          const count = reaction.count || 0

          // If count is below threshold, remove from starboard
          if (count < guildSettings.starboard.threshold) {
            // Get the starboard channel
            const starboardChannel = await reaction.message.guild.channels
              .fetch(guildSettings.starboard.channelId)
              .catch(() => null)
            if (!starboardChannel) return

            // Get the starboard message
            const starMessage = await starboardChannel.messages
              .fetch(starredMessages[reaction.message.id].starboardMessageId)
              .catch(() => null)
            if (starMessage) {
              // Delete the message
              await starMessage.delete().catch(() => null)
            }

            // Remove from database
            delete starredMessages[reaction.message.id]
            database.save()
          } else {
            // Update the star count
            const starData = starredMessages[reaction.message.id]
            if (starData.count !== count) {
              // Get the starboard channel
              const starboardChannel = await reaction.message.guild.channels
                .fetch(guildSettings.starboard.channelId)
                .catch(() => null)
              if (!starboardChannel) return

              // Get the starboard message
              const starMessage = await starboardChannel.messages.fetch(starData.starboardMessageId).catch(() => null)
              if (starMessage) {
                // Update the count
                await starMessage.edit({
                  content: `${guildSettings.starboard.emoji} **${count}** <#${reaction.message.channel.id}>`,
                })

                // Update database
                starData.count = count
                database.save()
              }
            }
          }
        }
      }
    }
  },
}
