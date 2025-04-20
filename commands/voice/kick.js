const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vkick")
    .setDescription("Kick a user from your voice channel")
    .addUserOption((option) => option.setName("user").setDescription("The user to kick").setRequired(true)),
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

    const targetUser = interaction.options.getUser("user")
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

    if (!targetMember) {
      return interaction.reply({
        content: "Could not find that user in this server.",
        ephemeral: true,
      })
    }

    // Check if the target user is in the voice channel
    if (!targetMember.voice.channelId || targetMember.voice.channelId !== voiceChannel.id) {
      return interaction.reply({
        content: "That user is not in your voice channel.",
        ephemeral: true,
      })
    }

    try {
      // Disconnect the user from the voice channel
      await targetMember.voice.disconnect("Kicked by voice channel owner")

      // If the channel is locked, prevent them from rejoining
      if (voiceChannels[voiceChannel.id].locked) {
        await voiceChannel.permissionOverwrites.edit(targetMember, {
          Connect: false,
        })
      }

      await interaction.reply(`✅ ${targetUser} has been kicked from your voice channel.`)
    } catch (error) {
      console.error("Error kicking user from voice channel:", error)
      await interaction.reply({
        content: "There was an error kicking that user from your voice channel.",
        ephemeral: true,
      })
    }
  },
}
