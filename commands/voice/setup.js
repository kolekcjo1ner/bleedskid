const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("voicemaster")
    .setDescription("Configure the Voice Master system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the Voice Master system")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to create voice channels in")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("create_channel")
            .setDescription("The channel users will join to create their own voice channel")
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable the Voice Master system"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const guildSettings = database.getGuild(interaction.guild.id)

    if (subcommand === "setup") {
      const category = interaction.options.getChannel("category")
      const createChannel = interaction.options.getChannel("create_channel")

      // Initialize voice master settings if they don't exist
      if (!guildSettings.voiceMaster) {
        guildSettings.voiceMaster = {}
      }

      guildSettings.voiceMaster.enabled = true
      guildSettings.voiceMaster.categoryId = category.id
      guildSettings.voiceMaster.createChannelId = createChannel.id
      guildSettings.voiceMaster.channels = guildSettings.voiceMaster.channels || {}

      database.save()

      await interaction.reply(
        `Voice Master system has been set up!\n\nUsers can now join ${createChannel} to create their own voice channel.`,
      )
    } else if (subcommand === "disable") {
      if (!guildSettings.voiceMaster) {
        return interaction.reply("Voice Master system is not set up.")
      }

      guildSettings.voiceMaster.enabled = false
      database.save()

      await interaction.reply("Voice Master system has been disabled.")
    }
  },
}
