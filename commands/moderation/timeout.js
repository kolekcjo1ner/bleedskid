const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a user for a specified duration")
    .addUserOption((option) => option.setName("user").setDescription("The user to timeout").setRequired(true))
    .addIntegerOption(
      (option) =>
        option
          .setName("duration")
          .setDescription("Timeout duration in minutes")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(40320), // 28 days in minutes (Discord's max timeout)
    )
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the timeout").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser("user")
    const member = interaction.guild.members.cache.get(user.id)
    const duration = interaction.options.getInteger("duration")
    const reason = interaction.options.getString("reason") || "No reason provided"

    if (!member) {
      return interaction.reply({
        content: "That user isn't in this server!",
        ephemeral: true,
      })
    }

    // Check if the bot can timeout the user
    if (!member.moderatable) {
      return interaction.reply({
        content: "I don't have permission to timeout this user!",
        ephemeral: true,
      })
    }

    // Convert minutes to milliseconds
    const durationMs = duration * 60 * 1000

    try {
      await member.timeout(durationMs, reason)
      await interaction.reply(`Successfully timed out ${user.tag} for ${duration} minute(s). Reason: ${reason}`)
    } catch (error) {
      console.error(error)
      await interaction.reply({
        content: "There was an error trying to timeout this user.",
        ephemeral: true,
      })
    }
  },
}
