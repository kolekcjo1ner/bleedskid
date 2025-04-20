const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("lock").setDescription("Lock your voice channel"),
  async execute(interaction) {
    // Check if the user is in a voice channel
    const voiceChannel = interaction.member.voice.channel
    if (!voiceChannel) {
      return interaction.reply({
        content: "You need to be in a voice channel to use this command!",
        ephemeral: true,
      })
    }

    // Get guild settings
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.voiceMaster || !guildSettings.voiceMaster.enabled) {
      return interaction.reply({
        content: "Voice Master system is not enabled on this server.",
        ephemeral: true,
      })
    }

    // Check if the user is the owner of the voice channel
    const voiceChannels = guildSettings.voiceMaster.channels || {}
    if (!voiceChannels[voiceChannel.id] || voiceChannels[voiceChannel.id].ownerId !== interaction.user.id) {
      return interaction.reply({
        content: "You are not the owner of this voice channel!",
        ephemeral: true,
      })
    }

    try {
      // Lock the channel by denying connect permission for @everyone
      await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: false,
      })

      // Update channel status in database
      voiceChannels[voiceChannel.id].locked = true
      database.save()

      await interaction.reply(`🔒 Your voice channel has been locked. Only you can invite users now.`)
    } catch (error) {
      console.error("Error locking voice channel:", error)
      await interaction.reply({
        content: "There was an error locking your voice channel.",
        ephemeral: true,
      })
    }
  },
}
