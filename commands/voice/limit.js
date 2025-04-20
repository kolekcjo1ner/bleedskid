const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("limit")
    .setDescription("Set a user limit for your voice channel")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The maximum number of users (0 for unlimited)")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(99),
    ),
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

    const limit = interaction.options.getInteger("amount")

    try {
      // Set the user limit for the voice channel
      await voiceChannel.setUserLimit(limit)

      // Update the database
      voiceChannels[voiceChannel.id].userLimit = limit
      database.save()

      if (limit === 0) {
        await interaction.reply(`✅ Your voice channel now has no user limit.`)
      } else {
        await interaction.reply(`✅ Your voice channel now has a limit of ${limit} users.`)
      }
    } catch (error) {
      console.error("Error setting voice channel limit:", error)
      await interaction.reply({
        content: "There was an error setting the user limit for your voice channel.",
        ephemeral: true,
      })
    }
  },
}
