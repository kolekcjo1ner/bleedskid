const { SlashCommandBuilder, PermissionsBitField } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("permissions")
    .setDescription("Manage permissions for your voice channel")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("allow")
        .setDescription("Allow a user to do something in your voice channel")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to give permissions to").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("permission")
            .setDescription("The permission to grant")
            .setRequired(true)
            .addChoices(
              { name: "Speak", value: "Speak" },
              { name: "Stream", value: "Stream" },
              { name: "Use Voice Activity", value: "UseVAD" },
              { name: "Priority Speaker", value: "PrioritySpeaker" },
              { name: "Mute Members", value: "MuteMembers" },
              { name: "Deafen Members", value: "DeafenMembers" },
              { name: "Move Members", value: "MoveMembers" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deny")
        .setDescription("Deny a user from doing something in your voice channel")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to deny permissions from").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("permission")
            .setDescription("The permission to deny")
            .setRequired(true)
            .addChoices(
              { name: "Connect", value: "Connect" },
              { name: "Speak", value: "Speak" },
              { name: "Stream", value: "Stream" },
              { name: "Use Voice Activity", value: "UseVAD" },
              { name: "Priority Speaker", value: "PrioritySpeaker" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription("Reset a user's permissions in your voice channel")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to reset permissions for").setRequired(true),
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

    const subcommand = interaction.options.getSubcommand()
    const user = interaction.options.getUser("user")
    const member = await interaction.guild.members.fetch(user.id).catch(() => null)

    if (!member) {
      return interaction.reply({
        content: "Could not find that user in this server.",
        ephemeral: true,
      })
    }

    try {
      if (subcommand === "allow") {
        const permission = interaction.options.getString("permission")
        await voiceChannel.permissionOverwrites.edit(member, {
          [permission]: true,
        })
        await interaction.reply({
          content: `✅ ${user.tag} can now ${permission
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .trim()} in your voice channel.`,
          ephemeral: true,
        })
      } else if (subcommand === "deny") {
        const permission = interaction.options.getString("permission")
        await voiceChannel.permissionOverwrites.edit(member, {
          [permission]: false,
        })
        await interaction.reply({
          content: `❌ ${user.tag} can no longer ${permission
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .trim()} in your voice channel.`,
          ephemeral: true,
        })
      } else if (subcommand === "reset") {
        // Reset all permissions for the user
        await voiceChannel.permissionOverwrites.delete(member)
        await interaction.reply({
          content: `🔄 ${user.tag}'s permissions have been reset to default in your voice channel.`,
          ephemeral: true,
        })
      }
    } catch (error) {
      console.error("Error managing voice channel permissions:", error)
      await interaction.reply({
        content: "There was an error managing permissions for your voice channel.",
        ephemeral: true,
      })
    }
  },
}
