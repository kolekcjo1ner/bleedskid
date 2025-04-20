const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")
const ms = require("ms")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Schedule messages to be sent later")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("message")
        .setDescription("Schedule a message to be sent later")
        .addStringOption((option) =>
          option.setName("time").setDescription("When to send the message (e.g. 1h, 30m, 1d)").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("content").setDescription("The content of the message").setRequired(true),
        )
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to send the message to").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("embed")
        .setDescription("Schedule an embed to be sent later")
        .addStringOption((option) =>
          option.setName("time").setDescription("When to send the embed (e.g. 1h, 30m, 1d)").setRequired(true),
        )
        .addStringOption((option) => option.setName("title").setDescription("The title of the embed").setRequired(true))
        .addStringOption((option) =>
          option.setName("description").setDescription("The description of the embed").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("color").setDescription("The color of the embed (hex code)").setRequired(false),
        )
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to send the embed to").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all scheduled messages")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cancel")
        .setDescription("Cancel a scheduled message")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the scheduled message").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize scheduled messages in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.scheduledMessages) {
      guildSettings.scheduledMessages = []
    }

    if (subcommand === "message") {
      const timeString = interaction.options.getString("time")
      const content = interaction.options.getString("content")
      const channel = interaction.options.getChannel("channel") || interaction.channel

      // Parse time
      let duration
      try {
        duration = ms(timeString)
        if (!duration || duration < 10000 || duration > 2592000000) {
          // Between 10 seconds and 30 days
          return interaction.reply({
            content: "Please provide a valid time between 10 seconds and 30 days.",
            ephemeral: true,
          })
        }
      } catch (error) {
        return interaction.reply({
          content: "Invalid time format. Please use formats like 1d, 12h, 30m, etc.",
          ephemeral: true,
        })
      }

      const now = Date.now()
      const scheduledTime = now + duration

      // Generate a unique ID for the scheduled message
      const messageId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

      // Store scheduled message in database
      const scheduledMessage = {
        id: messageId,
        type: "message",
        content,
        channelId: channel.id,
        scheduledTime,
        createdBy: interaction.user.id,
        createdAt: now,
      }

      guildSettings.scheduledMessages.push(scheduledMessage)
      database.save()

      // Format time for display
      const scheduledTimeFormatted = Math.floor(scheduledTime / 1000)

      await interaction.reply({
        content: `Message scheduled to be sent in ${channel} <t:${scheduledTimeFormatted}:R>.\nID: \`${messageId}\``,
        ephemeral: true,
      })
    } else if (subcommand === "embed") {
      const timeString = interaction.options.getString("time")
      const title = interaction.options.getString("title")
      const description = interaction.options.getString("description")
      const color = interaction.options.getString("color") || "#5865F2"
      const channel = interaction.options.getChannel("channel") || interaction.channel

      // Parse time
      let duration
      try {
        duration = ms(timeString)
        if (!duration || duration < 10000 || duration > 2592000000) {
          // Between 10 seconds and 30 days
          return interaction.reply({
            content: "Please provide a valid time between 10 seconds and 30 days.",
            ephemeral: true,
          })
        }
      } catch (error) {
        return interaction.reply({
          content: "Invalid time format. Please use formats like 1d, 12h, 30m, etc.",
          ephemeral: true,
        })
      }

      // Validate hex color
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          content: "Please provide a valid hex color code (e.g. #FF5555).",
          ephemeral: true,
        })
      }

      const now = Date.now()
      const scheduledTime = now + duration

      // Generate a unique ID for the scheduled message
      const messageId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

      // Store scheduled message in database
      const scheduledMessage = {
        id: messageId,
        type: "embed",
        title,
        description,
        color,
        channelId: channel.id,
        scheduledTime,
        createdBy: interaction.user.id,
        createdAt: now,
      }

      guildSettings.scheduledMessages.push(scheduledMessage)
      database.save()

      // Format time for display
      const scheduledTimeFormatted = Math.floor(scheduledTime / 1000)

      await interaction.reply({
        content: `Embed scheduled to be sent in ${channel} <t:${scheduledTimeFormatted}:R>.\nID: \`${messageId}\``,
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      const scheduledMessages = guildSettings.scheduledMessages

      if (scheduledMessages.length === 0) {
        return interaction.reply({
          content: "There are no scheduled messages.",
          ephemeral: true,
        })
      }

      // Sort by scheduled time
      scheduledMessages.sort((a, b) => a.scheduledTime - b.scheduledTime)

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Scheduled Messages")
        .setColor(0x5865f2)
        .setDescription(
          scheduledMessages
            .map(
              (msg) =>
                `**ID:** \`${msg.id}\`\n` +
                `**Type:** ${msg.type}\n` +
                `**Channel:** <#${msg.channelId}>\n` +
                `**Scheduled for:** <t:${Math.floor(msg.scheduledTime / 1000)}:F> (<t:${Math.floor(
                  msg.scheduledTime / 1000,
                )}:R>)`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total scheduled messages: ${scheduledMessages.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else if (subcommand === "cancel") {
      const messageId = interaction.options.getString("id")

      // Find the scheduled message
      const messageIndex = guildSettings.scheduledMessages.findIndex((msg) => msg.id === messageId)
      if (messageIndex === -1) {
        return interaction.reply({
          content: "Could not find a scheduled message with that ID.",
          ephemeral: true,
        })
      }

      // Remove the scheduled message
      guildSettings.scheduledMessages.splice(messageIndex, 1)
      database.save()

      await interaction.reply({
        content: `Scheduled message with ID \`${messageId}\` has been cancelled.`,
        ephemeral: true,
      })
    }
  },
}
