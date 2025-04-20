const { Events } = require("discord.js")
const database = require("../utils/database")
const { EmbedBuilder } = require("discord.js")

module.exports = {
  name: Events.MessageReactionAdd,
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
            await member.roles.add(reactionRole.roleId)
          } catch (error) {
            console.error("Error adding reaction role:", error)
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

        // Check if the message is from a bot
        if (reaction.message.author.bot) return

        // Check if the message is in the starboard channel
        if (reaction.message.channel.id === guildSettings.starboard.channelId) return

        // Get the count of this reaction
        const count = reaction.count

        // Check if it meets the threshold
        if (count >= guildSettings.starboard.threshold) {
          // Check if this message is already in the starboard
          const starredMessages = guildSettings.starboard.starredMessages || {}

          if (!starredMessages[reaction.message.id]) {
            // Get the starboard channel
            const starboardChannel = await reaction.message.guild.channels
              .fetch(guildSettings.starboard.channelId)
              .catch(() => null)
            if (!starboardChannel) return

            // Create the starboard embed
            const embed = new EmbedBuilder()
              .setAuthor({
                name: reaction.message.author.tag,
                iconURL: reaction.message.author.displayAvatarURL({ dynamic: true }),
              })
              .setDescription(reaction.message.content || "")
              .addFields({
                name: "Source",
                value: `[Jump to message](${reaction.message.url})`,
              })
              .setColor(0xffd700)
              .setTimestamp(reaction.message.createdAt)

            // Add image if there is one
            if (reaction.message.attachments.size > 0) {
              const attachment = reaction.message.attachments.first()
              if (attachment.contentType.startsWith("image/")) {
                embed.setImage(attachment.url)
              }
            }

            // Send to starboard
            const starMessage = await starboardChannel.send({
              content: `${guildSettings.starboard.emoji} **${count}** <#${reaction.message.channel.id}>`,
              embeds: [embed],
            })

            // Save to database
            starredMessages[reaction.message.id] = {
              starboardMessageId: starMessage.id,
              count,
            }
            guildSettings.starboard.starredMessages = starredMessages
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
