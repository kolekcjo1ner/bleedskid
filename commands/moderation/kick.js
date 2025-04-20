const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .addUserOption((option) => option.setName("user").setDescription("The user to kick").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("The reason for kicking"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser("user")
    const member = interaction.guild.members.cache.get(user.id)
    const reason = interaction.options.getString("reason") || "No reason provided"

    if (!member) {
      return interaction.reply({
        content: "That user isn't in this server!",
        ephemeral: true,
      })
    }

    try {
      await member.kick(reason)
      await interaction.reply(`Successfully kicked ${user.tag} for reason: ${reason}`)
    } catch (error) {
      console.error(error)
      await interaction.reply({
        content: `Failed to kick ${user.tag}. Make sure I have the right permissions and the user is kickable.`,
        ephemeral: true,
      })
    }
  },
}
