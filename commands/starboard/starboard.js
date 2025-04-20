const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Configure the server starboard")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the starboard")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send starred messages to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addIntegerOption((option) =>
          option
            .setName("threshold")
            .setDescription("Number of stars needed to appear on the starboard")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(25),
        )
        .addStringOption((option) =>
          option.setName("emoji").setDescription("The emoji to use for stars (default: ⭐)").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable the starboard"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("threshold")
        .setDescription("Change the star threshold")
        .addIntegerOption((option) =>
          option
            .setName("count")
            .setDescription("Number of stars needed to appear on the starboard")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(25),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("emoji")
        .setDescription("Change the star emoji")
        .addStringOption((option) =>
          option.setName("emoji").setDescription("The emoji to use for stars").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ignore")
        .setDescription("Ignore a channel in the starboard")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to ignore")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unignore")
        .setDescription("Stop ignoring a channel in the starboard")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to unignore")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("settings").setDescription("View current starboard settings")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize starboard settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.starboard) {
      guildSettings.starboard = {
        enabled: false,
        channelId: null,
        threshold: 3,
        emoji: "⭐",
        ignoredChannels: [],
        starredMessages: {},
      }
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel")
      const threshold = interaction.options.getInteger("threshold")
      const emoji = interaction.options.getString("emoji") || "⭐"

      // Update starboard settings
      guildSettings.starboard.enabled = true
      guildSettings.starboard.channelId = channel.id
      guildSettings.starboard.threshold = threshold
      guildSettings.starboard.emoji = emoji
      database.save()

      await interaction.reply({
        content: `Starboard has been set up! Starred messages will be sent to ${channel} when they receive ${threshold} ${emoji} reactions.`,
        ephemeral: true,
      })
    } else if (subcommand === "disable") {
      // Disable starboard
      guildSettings.starboard.enabled = false
      database.save()

      await interaction.reply({
        content: "Starboard has been disabled.",
        ephemeral: true,
      })
    } else if (subcommand === "threshold") {
      if (!guildSettings.starboard.enabled) {
        return interaction.reply({
          content: "Starboard is not enabled. Please set it up first with `/starboard setup`.",
          ephemeral: true,
        })
      }

      const threshold = interaction.options.getInteger("count")

      // Update threshold
      guildSettings.starboard.threshold = threshold
      database.save()

      await interaction.reply({
        content: `Starboard threshold has been set to ${threshold} ${guildSettings.starboard.emoji} reactions.`,
        ephemeral: true,
      })
    } else if (subcommand === "emoji") {
      if (!guildSettings.starboard.enabled) {
        return interaction.reply({
          content: "Starboard is not enabled. Please set it up first with `/starboard setup`.",
          ephemeral: true,
        })
      }

      const emoji = interaction.options.getString("emoji")

      // Update emoji
      guildSettings.starboard.emoji = emoji
      database.save()

      await interaction.reply({
        content: `Starboard emoji has been set to ${emoji}.`,
        ephemeral: true,
      })
    } else if (subcommand === "ignore") {
      if (!guildSettings.starboard.enabled) {
        return interaction.reply({
          content: "Starboard is not enabled. Please set it up first with `/starboard setup`.",
          ephemeral: true,
        })
      }

      const channel = interaction.options.getChannel("channel")

      // Check if channel is already ignored
      if (guildSettings.starboard.ignoredChannels.includes(channel.id)) {
        return interaction.reply({
          content: `${channel} is already being ignored in the starboard.`,
          ephemeral: true,
        })
      }

      // Add channel to ignored list
      guildSettings.starboard.ignoredChannels.push(channel.id)
      database.save()

      await interaction.reply({
        content: `${channel} will now be ignored in the starboard.`,
        ephemeral: true,
      })
    } else if (subcommand === "unignore") {
      if (!guildSettings.starboard.enabled) {
        return interaction.reply({
          content: "Starboard is not enabled. Please set it up first with `/starboard setup`.",
          ephemeral: true,
        })
      }

      const channel = interaction.options.getChannel("channel")

      // Check if channel is ignored
      const index = guildSettings.starboard.ignoredChannels.indexOf(channel.id)
      if (index === -1) {
        return interaction.reply({
          content: `${channel} is not being ignored in the starboard.`,
          ephemeral: true,
        })
      }

      // Remove channel from ignored list
      guildSettings.starboard.ignoredChannels.splice(index, 1)
      database.save()

      await interaction.reply({
        content: `${channel} will no longer be ignored in the starboard.`,
        ephemeral: true,
      })
    } else if (subcommand === "settings") {
      // Create embed with current settings
      const embed = new EmbedBuilder()
        .setTitle("Starboard Settings")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "Status",
            value: guildSettings.starboard.enabled ? "Enabled" : "Disabled",
            inline: true,
          },
          {
            name: "Channel",
            value: guildSettings.starboard.channelId ? `<#${guildSettings.starboard.channelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Threshold",
            value: `${guildSettings.starboard.threshold} ${guildSettings.starboard.emoji} reactions`,
            inline: true,
          },
          {
            name: "Emoji",
            value: guildSettings.starboard.emoji,
            inline: true,
          },
          {
            name: "Ignored Channels",
            value:
              guildSettings.starboard.ignoredChannels.length > 0
                ? guildSettings.starboard.ignoredChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
          },
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}
