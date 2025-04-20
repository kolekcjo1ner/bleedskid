const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome messages")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Set the welcome channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send welcome messages to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable welcome messages"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const guildSettings = database.getGuild(interaction.guild.id)

    if (subcommand === "channel") {
      const channel = interaction.options.getChannel("channel")
      guildSettings.welcomeChannel = channel.id
      database.save()

      await interaction.reply(`Welcome messages will now be sent to ${channel}.`)
    } else if (subcommand === "disable") {
      guildSettings.welcomeChannel = null
      database.save()

      await interaction.reply("Welcome messages have been disabled.")
    }
  },
}
