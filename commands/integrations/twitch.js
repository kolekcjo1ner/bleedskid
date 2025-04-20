const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")
const database = require("../../utils/database")
const fetch = require("node:fetch")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("twitch")
    .setDescription("Manage Twitch notifications")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a Twitch streamer to notify when they go live")
        .addStringOption((option) =>
          option.setName("username").setDescription("The Twitch username to add").setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send notifications to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Custom notification message (use {streamer} and {game} as placeholders)")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a Twitch streamer from notifications")
        .addStringOption((option) =>
          option.setName("username").setDescription("The Twitch username to remove").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all Twitch notification settings")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize Twitch settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.twitch) {
      guildSettings.twitch = {
        streamers: [],
      }
    }

    if (subcommand === "add") {
      const username = interaction.options.getString("username").toLowerCase()
      const channel = interaction.options.getChannel("channel")
      const customMessage =
        interaction.options.getString("message") ||
        "{streamer} is now live on Twitch! They're playing {game}. Come watch at https://twitch.tv/{streamer}"

      // Check if streamer is already added
      const existingStreamer = guildSettings.twitch.streamers.find(
        (s) => s.username.toLowerCase() === username.toLowerCase(),
      )
      if (existingStreamer) {
        return interaction.reply({
          content: `${username} is already set up for notifications in <#${existingStreamer.channelId}>.`,
          ephemeral: true,
        })
      }

      // Verify that the Twitch channel exists (mock implementation)
      try {
        // In a real implementation, you would verify with the Twitch API
        // For this example, we'll assume all channels exist

        // Add streamer to database
        guildSettings.twitch.streamers.push({
          username,
          channelId: channel.id,
          message: customMessage,
          addedAt: Date.now(),
          lastNotification: null,
          isLive: false,
        })
        database.save()

        await interaction.reply({
          content: `Successfully added ${username} to Twitch notifications in ${channel}!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error adding Twitch streamer:", error)
        await interaction.reply({
          content: "There was an error adding the Twitch streamer. Please make sure the username is correct.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "remove") {
      const username = interaction.options.getString("username").toLowerCase()

      // Find streamer
      const streamerIndex = guildSettings.twitch.streamers.findIndex(
        (s) => s.username.toLowerCase() === username.toLowerCase(),
      )
      if (streamerIndex === -1) {
        return interaction.reply({
          content: `${username} is not set up for notifications.`,
          ephemeral: true,
        })
      }

      // Remove streamer
      guildSettings.twitch.streamers.splice(streamerIndex, 1)
      database.save()

      await interaction.reply({
        content: `Successfully removed ${username} from Twitch notifications.`,
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      const streamers = guildSettings.twitch.streamers

      if (streamers.length === 0) {
        return interaction.reply({
          content: "There are no Twitch streamers set up for notifications.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Twitch Notifications")
        .setColor(0x6441a5) // Twitch purple
        .setDescription(
          streamers
            .map(
              (s) =>
                `**${s.username}**\n` +
                `Channel: <#${s.channelId}>\n` +
                `Status: ${s.isLive ? "🔴 Live" : "⚫ Offline"}\n` +
                `Last Notification: ${s.lastNotification ? `<t:${Math.floor(s.lastNotification / 1000)}:R>` : "Never"}`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total streamers: ${streamers.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}
