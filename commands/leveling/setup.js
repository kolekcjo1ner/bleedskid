const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelsetup")
    .setDescription("Configure the leveling system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enable the leveling system")
        .addChannelOption((option) =>
          option
            .setName("announce_channel")
            .setDescription("The channel to announce level ups in (optional)")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable the leveling system"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("addrole")
        .setDescription("Add a level role reward")
        .addIntegerOption((option) =>
          option.setName("level").setDescription("The level to reward the role at").setRequired(true).setMinValue(1),
        )
        .addRoleOption((option) => option.setName("role").setDescription("The role to reward").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removerole")
        .setDescription("Remove a level role reward")
        .addIntegerOption((option) =>
          option.setName("level").setDescription("The level to remove the role from").setRequired(true).setMinValue(1),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const guildSettings = database.getGuild(interaction.guild.id)

    if (!guildSettings.levelSystem) {
      guildSettings.levelSystem = {
        enabled: false,
        announceChannel: null,
        roles: {},
      }
    }

    if (subcommand === "enable") {
      const announceChannel = interaction.options.getChannel("announce_channel")

      guildSettings.levelSystem.enabled = true
      guildSettings.levelSystem.announceChannel = announceChannel ? announceChannel.id : null
      database.save()

      await interaction.reply(
        `Leveling system has been enabled!${
          announceChannel ? ` Level up announcements will be sent to ${announceChannel}.` : ""
        }`,
      )
    } else if (subcommand === "disable") {
      guildSettings.levelSystem.enabled = false
      database.save()

      await interaction.reply("Leveling system has been disabled.")
    } else if (subcommand === "addrole") {
      const level = interaction.options.getInteger("level")
      const role = interaction.options.getRole("role")

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to assign this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      guildSettings.levelSystem.roles[level] = role.id
      database.save()

      await interaction.reply(`The role ${role.name} will now be awarded at level ${level}.`)
    } else if (subcommand === "removerole") {
      const level = interaction.options.getInteger("level")

      if (!guildSettings.levelSystem.roles[level]) {
        return interaction.reply({
          content: `There is no role reward set for level ${level}.`,
          ephemeral: true,
        })
      }

      delete guildSettings.levelSystem.roles[level]
      database.save()

      await interaction.reply(`The role reward for level ${level} has been removed.`)
    }
  },
}
