const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")
const database = require("../../utils/database")
const fetch = require("node:fetch")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("Manage YouTube notifications")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a YouTube channel to notify when they upload")
        .addStringOption((option) =>
          option.setName("channel_id").setDescription("The YouTube channel ID to add").setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The Discord channel to send notifications to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Custom notification message (use {channel} and {title} as placeholders)")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a YouTube channel from notifications")
        .addStringOption((option) =>
          option.setName("channel_id").setDescription("The YouTube channel ID to remove").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all YouTube notification settings")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize YouTube settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.youtube) {
      guildSettings.youtube = {
        channels: [],
      }
    }

    if (subcommand === "add") {
      const channelId = interaction.options.getString("channel_id")
      const discordChannel = interaction.options.getChannel("channel")
      const customMessage =
        interaction.options.getString("message") ||
        "{channel} just uploaded a new video: **{title}**! Check it out: {url}"

      // Check if channel is already added
      const existingChannel = guildSettings.youtube.channels.find((c) => c.channelId === channelId)
      if (existingChannel) {
        return interaction.reply({
          content: `This YouTube channel is already set up for notifications in <#${existingChannel.discordChannelId}>.`,
          ephemeral: true,
        })
      }

      // Verify that the YouTube channel exists (mock implementation)
      try {
        // In a real implementation, you would verify with the YouTube API
        // For this example, we'll assume all channels exist

        // Add channel to database
        guildSettings.youtube.channels.push({
          channelId,
          channelName: "YouTube Channel", // In a real implementation, you would get the actual name
          discordChannelId: discordChannel.id,
          message: customMessage,
          addedAt: Date.now(),
          lastVideoId: null,
          lastNotification: null,
        })
        database.save()

        await interaction.reply({
          content: `Successfully added YouTube channel to notifications in ${discordChannel}!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error adding YouTube channel:", error)
        await interaction.reply({
          content: "There was an error adding the YouTube channel. Please make sure the channel ID is correct.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "remove") {
      const channelId = interaction.options.getString("channel_id")

      // Find channel
      const channelIndex = guildSettings.youtube.channels.findIndex((c) => c.channelId === channelId)
      if (channelIndex === -1) {
        return interaction.reply({
          content: "This YouTube channel is not set up for notifications.",
          ephemeral: true,
        })
      }

      // Remove channel
      guildSettings.youtube.channels.splice(channelIndex, 1)
      database.save()

      await interaction.reply({
        content: "Successfully removed YouTube channel from notifications.",
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      const channels = guildSettings.youtube.channels

      if (channels.length === 0) {
        return interaction.reply({
          content: "There are no YouTube channels set up for notifications.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("YouTube Notifications")
        .setColor(0xff0000) // YouTube red
        .setDescription(
          channels
            .map(
              (c) =>
                `**${c.channelName || c.channelId}**\n` +
                `Discord Channel: <#${c.discordChannelId}>\n` +
                `Last Notification: ${c.lastNotification ? `<t:${Math.floor(c.lastNotification / 1000)}:R>` : "Never"}`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total channels: ${channels.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}
