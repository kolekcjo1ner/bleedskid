const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Claim ownership of a voice channel if the owner left"),
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

    // Check if the voice channel is a Voice Master channel
    const voiceChannels = guildSettings.voiceMaster.channels || {}
    if (!voiceChannels[voiceChannel.id]) {
      return interaction.reply({
        content: "This is not a Voice Master channel.",
        ephemeral: true,
      })
    }

    // Check if the user is already the owner
    if (voiceChannels[voiceChannel.id].ownerId === interaction.user.id) {
      return interaction.reply({
        content: "You are already the owner of this voice channel!",
        ephemeral: true,
      })
    }

    // Check if the owner is still in the channel
    const owner = voiceChannel.members.get(voiceChannels[voiceChannel.id].ownerId)
    if (owner) {
      return interaction.reply({
        content: "The owner is still in the channel. You cannot claim it.",
        ephemeral: true,
      })
    }

    try {
      // Transfer ownership
      voiceChannels[voiceChannel.id].ownerId = interaction.user.id
      database.save()

      await interaction.reply(`✅ You are now the owner of this voice channel!`)
    } catch (error) {
      console.error("Error claiming voice channel:", error)
      await interaction.reply({
        content: "There was an error claiming this voice channel.",
        ephemeral: true,
      })
    }
  },
}
