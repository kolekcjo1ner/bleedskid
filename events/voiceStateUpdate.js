const { Events } = require("discord.js")
const database = require("../utils/database")

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const { guild, member } = newState
    if (!guild || !member) return

    // Get guild settings
    const guildSettings = database.getGuild(guild.id)
    if (!guildSettings.voiceMaster || !guildSettings.voiceMaster.enabled) return

    // Get Voice Master settings
    const voiceMaster = guildSettings.voiceMaster
    const createChannelId = voiceMaster.createChannelId
    const categoryId = voiceMaster.categoryId
    const voiceChannels = voiceMaster.channels || {}

    // Check if user joined the create channel
    if (newState.channelId === createChannelId) {
      try {
        // Create a new voice channel for the user
        const channelName = `${member.user.username}'s Channel`
        const newChannel = await guild.channels.create({
          name: channelName,
          type: 2, // Voice channel
          parent: categoryId,
          permissionOverwrites: [
            {
              id: member.id,
              allow: ["ManageChannels", "MuteMembers", "DeafenMembers", "MoveMembers"],
            },
          ],
        })

        // Move the user to the new channel
        await member.voice.setChannel(newChannel)

        // Save the channel to the database
        voiceChannels[newChannel.id] = {
          ownerId: member.id,
          name: channelName,
          locked: false,
          userLimit: 0,
          createdAt: Date.now(),
        }
        database.save()
      } catch (error) {
        console.error("Error creating voice channel:", error)
      }
    }

    // Check if a user left a Voice Master channel
    if (oldState.channelId && voiceChannels[oldState.channelId]) {
      const channel = guild.channels.cache.get(oldState.channelId)

      // If the channel exists and is empty, delete it
      if (channel && channel.members.size === 0) {
        try {
          await channel.delete("Voice channel empty")
          delete voiceChannels[oldState.channelId]
          database.save()
        } catch (error) {
          console.error("Error deleting voice channel:", error)
        }
      }
    }
  },
}
