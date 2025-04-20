const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename your voice channel")
    .addStringOption((option) =>
      option.setName("name").setDescription("The new name for your voice channel").setRequired(true),
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

    const newName = interaction.options.getString("name")

    // Check if the name is appropriate (you can add more checks here)
    if (newName.length > 100) {
      return interaction.reply({
        content: "The channel name is too long. Please choose a shorter name.",
        ephemeral: true,
      })
    }

    try {
      // Rename the voice channel
      await voiceChannel.setName(newName)

      // Update the database
      voiceChannels[voiceChannel.id].name = newName
      database.save()

      await interaction.reply(`✅ Your voice channel has been renamed to "${newName}".`)
    } catch (error) {
      console.error("Error renaming voice channel:", error)
      await interaction.reply({
        content: "There was an error renaming your voice channel.",
        ephemeral: true,
      })
    }
  },
}
