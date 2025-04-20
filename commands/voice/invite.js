const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Invite a user to your locked voice channel")
    .addUserOption((option) => option.setName("user").setDescription("The user to invite").setRequired(true)),
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

    // Check if the channel is locked
    if (!voiceChannels[voiceChannel.id].locked) {
      return interaction.reply({
        content: "Your voice channel is not locked. Anyone can join without an invitation.",
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

    try {
      // Allow the user to connect to the voice channel
      await voiceChannel.permissionOverwrites.edit(targetMember, {
        Connect: true,
      })

      await interaction.reply(`✅ ${targetUser} has been invited to your voice channel.`)

      // Try to send a DM to the invited user
      try {
        await targetUser.send(
          `${interaction.user.tag} has invited you to join their voice channel in ${interaction.guild.name}.`,
        )
      } catch (error) {
        // Ignore errors from DM (user might have DMs disabled)
      }
    } catch (error) {
      console.error("Error inviting user to voice channel:", error)
      await interaction.reply({
        content: "There was an error inviting that user to your voice channel.",
        ephemeral: true,
      })
    }
  },
}
