const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlog")
    .setDescription("Configure moderation logs")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Set the moderation log channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send moderation logs to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable moderation logs"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const guildSettings = database.getGuild(interaction.guild.id)

    if (subcommand === "channel") {
      const channel = interaction.options.getChannel("channel")
      guildSettings.modLogChannel = channel.id
      database.save()

      await interaction.reply(`Moderation logs will now be sent to ${channel}.`)
    } else if (subcommand === "disable") {
      guildSettings.modLogChannel = null
      database.save()

      await interaction.reply("Moderation logs have been disabled.")
    }
  },
}
