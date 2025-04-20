const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggestion")
    .setDescription("Create and manage suggestions")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the suggestion system")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send suggestions to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable the suggestion system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new suggestion")
        .addStringOption((option) =>
          option.setName("title").setDescription("The title of your suggestion").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("description").setDescription("The description of your suggestion").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("approve")
        .setDescription("Approve a suggestion")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the suggestion to approve").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("comment").setDescription("A comment about the approval").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reject")
        .setDescription("Reject a suggestion")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the suggestion to reject").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("The reason for rejection").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("implement")
        .setDescription("Mark a suggestion as implemented")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the suggestion to mark as implemented").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("comment").setDescription("A comment about the implementation").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("consider")
        .setDescription("Mark a suggestion as under consideration")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the suggestion to consider").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("comment").setDescription("A comment about the consideration").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize suggestion settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.suggestions) {
      guildSettings.suggestions = {
        enabled: false,
        channelId: null,
        suggestions: [],
      }
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel")

      // Update suggestion settings
      guildSettings.suggestions.enabled = true
      guildSettings.suggestions.channelId = channel.id
      database.save()

      await interaction.reply({
        content: `Suggestion system has been set up! Suggestions will be sent to ${channel}.`,
        ephemeral: true,
      })
    } else if (subcommand === "disable") {
      // Disable suggestion system
      guildSettings.suggestions.enabled = false
      database.save()

      await interaction.reply({
        content: "Suggestion system has been disabled.",
        ephemeral: true,
      })
    } else if (subcommand === "create") {
      if (!guildSettings.suggestions.enabled) {
        return interaction.reply({
          content: "The suggestion system is not enabled on this server.",
          ephemeral: true,
        })
      }

      const title = interaction.options.getString("title")
      const description = interaction.options.getString("description")

      // Generate a unique ID for the suggestion
      const suggestionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

      // Get the suggestion channel
      const channel = await interaction.guild.channels.fetch(guildSettings.suggestions.channelId).catch(() => null)
      if (!channel) {
        return interaction.reply({
          content: "The suggestion channel could not be found. Please contact an administrator.",
          ephemeral: true,
        })
      }

      // Create suggestion embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Suggestion: ${title}`)
        .setDescription(description)
        .addFields(
          { name: "Status", value: "Pending", inline: true },
          { name: "Submitted by", value: interaction.user.tag, inline: true },
          { name: "Votes", value: "👍 0 | 👎 0", inline: true },
        )
        .setFooter({ text: `Suggestion ID: ${suggestionId}` })
        .setTimestamp()

      // Create vote buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`suggestion_upvote_${suggestionId}`)
          .setEmoji("👍")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`suggestion_downvote_${suggestionId}`)
          .setEmoji("👎")
          .setStyle(ButtonStyle.Primary),
      )

      // Send suggestion
      const message = await channel.send({
        embeds: [embed],
        components: [row],
      })

      // Store suggestion in database
      const suggestion = {
        id: suggestionId,
        messageId: message.id,
        title,
        description,
        status: "pending",
        createdAt: Date.now(),
        createdBy: interaction.user.id,
        upvotes: [],
        downvotes: [],
      }

      guildSettings.suggestions.suggestions.push(suggestion)
      database.save()

      await interaction.reply({
        content: `Your suggestion has been submitted! You can view it in ${channel}.`,
        ephemeral: true,
      })
    } else if (subcommand === "approve") {
      const suggestionId = interaction.options.getString("id")
      const comment = interaction.options.getString("comment") || "No comment provided."

      // Find the suggestion
      const suggestionIndex = guildSettings.suggestions.suggestions.findIndex((s) => s.id === suggestionId)
      if (suggestionIndex === -1) {
        return interaction.reply({
          content: "Could not find a suggestion with that ID.",
          ephemeral: true,
        })
      }

      const suggestion = guildSettings.suggestions.suggestions[suggestionIndex]

      // Update suggestion status
      suggestion.status = "approved"
      suggestion.comment = comment
      suggestion.resolvedBy = interaction.user.id
      suggestion.resolvedAt = Date.now()

      // Update the suggestion message
      try {
        const channel = await interaction.guild.channels.fetch(guildSettings.suggestions.channelId)
        const message = await channel.messages.fetch(suggestion.messageId)

        // Update embed
        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor(0x57f287) // Green
          .spliceFields(0, 1, { name: "Status", value: "Approved ✅", inline: true })
          .addFields({ name: "Staff Comment", value: comment })

        await message.edit({
          embeds: [embed],
          components: [], // Remove vote buttons
        })

        // Save to database
        database.save()

        await interaction.reply({
          content: `Suggestion #${suggestionId} has been approved.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating suggestion:", error)
        await interaction.reply({
          content: "There was an error updating the suggestion.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "reject") {
      const suggestionId = interaction.options.getString("id")
      const reason = interaction.options.getString("reason") || "No reason provided."

      // Find the suggestion
      const suggestionIndex = guildSettings.suggestions.suggestions.findIndex((s) => s.id === suggestionId)
      if (suggestionIndex === -1) {
        return interaction.reply({
          content: "Could not find a suggestion with that ID.",
          ephemeral: true,
        })
      }

      const suggestion = guildSettings.suggestions.suggestions[suggestionIndex]

      // Update suggestion status
      suggestion.status = "rejected"
      suggestion.comment = reason
      suggestion.resolvedBy = interaction.user.id
      suggestion.resolvedAt = Date.now()

      // Update the suggestion message
      try {
        const channel = await interaction.guild.channels.fetch(guildSettings.suggestions.channelId)
        const message = await channel.messages.fetch(suggestion.messageId)

        // Update embed
        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor(0xed4245) // Red
          .spliceFields(0, 1, { name: "Status", value: "Rejected ❌", inline: true })
          .addFields({ name: "Reason", value: reason })

        await message.edit({
          embeds: [embed],
          components: [], // Remove vote buttons
        })

        // Save to database
        database.save()

        await interaction.reply({
          content: `Suggestion #${suggestionId} has been rejected.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating suggestion:", error)
        await interaction.reply({
          content: "There was an error updating the suggestion.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "implement") {
      const suggestionId = interaction.options.getString("id")
      const comment = interaction.options.getString("comment") || "No comment provided."

      // Find the suggestion
      const suggestionIndex = guildSettings.suggestions.suggestions.findIndex((s) => s.id === suggestionId)
      if (suggestionIndex === -1) {
        return interaction.reply({
          content: "Could not find a suggestion with that ID.",
          ephemeral: true,
        })
      }

      const suggestion = guildSettings.suggestions.suggestions[suggestionIndex]

      // Update suggestion status
      suggestion.status = "implemented"
      suggestion.comment = comment
      suggestion.resolvedBy = interaction.user.id
      suggestion.resolvedAt = Date.now()

      // Update the suggestion message
      try {
        const channel = await interaction.guild.channels.fetch(guildSettings.suggestions.channelId)
        const message = await channel.messages.fetch(suggestion.messageId)

        // Update embed
        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor(0x5865f2) // Blue
          .spliceFields(0, 1, { name: "Status", value: "Implemented 🚀", inline: true })
          .addFields({ name: "Staff Comment", value: comment })

        await message.edit({
          embeds: [embed],
          components: [], // Remove vote buttons
        })

        // Save to database
        database.save()

        await interaction.reply({
          content: `Suggestion #${suggestionId} has been marked as implemented.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating suggestion:", error)
        await interaction.reply({
          content: "There was an error updating the suggestion.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "consider") {
      const suggestionId = interaction.options.getString("id")
      const comment = interaction.options.getString("comment") || "No comment provided."

      // Find the suggestion
      const suggestionIndex = guildSettings.suggestions.suggestions.findIndex((s) => s.id === suggestionId)
      if (suggestionIndex === -1) {
        return interaction.reply({
          content: "Could not find a suggestion with that ID.",
          ephemeral: true,
        })
      }

      const suggestion = guildSettings.suggestions.suggestions[suggestionIndex]

      // Update suggestion status
      suggestion.status = "considering"
      suggestion.comment = comment
      suggestion.resolvedBy = interaction.user.id
      suggestion.resolvedAt = Date.now()

      // Update the suggestion message
      try {
        const channel = await interaction.guild.channels.fetch(guildSettings.suggestions.channelId)
        const message = await channel.messages.fetch(suggestion.messageId)

        // Update embed
        const embed = EmbedBuilder.from(message.embeds[0])
          .setColor(0xfee75c) // Yellow
          .spliceFields(0, 1, { name: "Status", value: "Considering 🤔", inline: true })
          .addFields({ name: "Staff Comment", value: comment })

        await message.edit({
          embeds: [embed],
          components: [message.components[0]], // Keep vote buttons
        })

        // Save to database
        database.save()

        await interaction.reply({
          content: `Suggestion #${suggestionId} has been marked as under consideration.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating suggestion:", error)
        await interaction.reply({
          content: "There was an error updating the suggestion.",
          ephemeral: true,
        })
      }
    }
  },
}
