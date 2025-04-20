const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("region")
    .setDescription("Set the region for your voice channel")
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("The region for the voice channel")
        .setRequired(true)
        .addChoices(
          { name: "Automatic", value: "auto" },
          { name: "Brazil", value: "brazil" },
          { name: "Europe", value: "europe" },
          { name: "Hong Kong", value: "hongkong" },
          { name: "India", value: "india" },
          { name: "Japan", value: "japan" },
          { name: "Rotterdam", value: "rotterdam" },
          { name: "Russia", value: "russia" },
          { name: "Singapore", value: "singapore" },
          { name: "South Africa", value: "southafrica" },
          { name: "Sydney", value: "sydney" },
          { name: "US Central", value: "us-central" },
          { name: "US East", value: "us-east" },
          { name: "US South", value: "us-south" },
          { name: "US West", value: "us-west" },
        ),
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

    // Check if the voice channel is a Voice Master channel
    const voiceChannels = guildSettings.voiceMaster.channels || {}
    if (!voiceChannels[voiceChannel.id]) {
      return interaction.reply({
        content: "This is not a Voice Master channel.",
        ephemeral: true,
      })
    }

    // Check if the user is the owner
    if (voiceChannels[voiceChannel.id].ownerId !== interaction.user.id) {
      return interaction.reply({
        content: "You are not the owner of this voice channel!",
        ephemeral: true,
      })
    }

    const region = interaction.options.getString("region")

    try {
      // Set the region for the voice channel
      await voiceChannel.setRTCRegion(region === "auto" ? null : region)

      // Update the database
      voiceChannels[voiceChannel.id].region = region
      database.save()

      await interaction.reply({
        content: `✅ Your voice channel's region has been set to ${region === "auto" ? "Automatic" : region}.`,
        ephemeral: true,
      })
    } catch (error) {
      console.error("Error setting voice channel region:", error)
      await interaction.reply({
        content: "There was an error setting the region for your voice channel.",
        ephemeral: true,
      })
    }
  },
}
