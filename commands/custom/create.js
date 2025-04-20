const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("customcommand")
    .setDescription("Manage custom commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a custom command")
        .addStringOption((option) => option.setName("name").setDescription("The name of the command").setRequired(true))
        .addStringOption((option) =>
          option.setName("response").setDescription("The response for the command").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a custom command")
        .addStringOption((option) =>
          option.setName("name").setDescription("The name of the command to delete").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all custom commands"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const guildSettings = database.getGuild(interaction.guild.id)

    if (!guildSettings.customCommands) {
      guildSettings.customCommands = {}
    }

    if (subcommand === "create") {
      const name = interaction.options.getString("name").toLowerCase()
      const response = interaction.options.getString("response")

      // Check if the command already exists
      if (guildSettings.customCommands[name]) {
        return interaction.reply({
          content: `The command \`!${name}\` already exists. Use \`/customcommand delete\` to delete it first.`,
          ephemeral: true,
        })
      }

      // Add the command
      guildSettings.customCommands[name] = {
        response,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
      }
      database.save()

      await interaction.reply(`Custom command \`!${name}\` has been created!`)
    } else if (subcommand === "delete") {
      const name = interaction.options.getString("name").toLowerCase()

      // Check if the command exists
      if (!guildSettings.customCommands[name]) {
        return interaction.reply({
          content: `The command \`!${name}\` doesn't exist.`,
          ephemeral: true,
        })
      }

      // Delete the command
      delete guildSettings.customCommands[name]
      database.save()

      await interaction.reply(`Custom command \`!${name}\` has been deleted.`)
    } else if (subcommand === "list") {
      const commands = Object.keys(guildSettings.customCommands)

      if (commands.length === 0) {
        return interaction.reply("There are no custom commands on this server.")
      }

      const commandList = commands.map((cmd) => `\`!${cmd}\``).join(", ")
      await interaction.reply(`**Custom Commands:**\n${commandList}`)
    }
  },
}
