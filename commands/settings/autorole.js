const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Configure auto-role for new members")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set the auto-role")
        .addRoleOption((option) =>
          option.setName("role").setDescription("The role to give to new members").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable auto-role"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const guildSettings = database.getGuild(interaction.guild.id)

    if (subcommand === "set") {
      const role = interaction.options.getRole("role")

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to assign this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      guildSettings.autoRole = role.id
      database.save()

      await interaction.reply(`Auto-role has been set to ${role.name}.`)
    } else if (subcommand === "disable") {
      guildSettings.autoRole = null
      database.save()

      await interaction.reply("Auto-role has been disabled.")
    }
  },
}
