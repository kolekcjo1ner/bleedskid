const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the ticket system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the ticket system")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the ticket panel to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addRoleOption((option) =>
          option.setName("support_role").setDescription("The role that can see and manage tickets").setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to create tickets in")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory),
        )
        .addStringOption((option) =>
          option.setName("welcome_message").setDescription("The message to send when a ticket is created"),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("panel")
        .setDescription("Create a ticket panel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the ticket panel to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("The title of the ticket panel").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("description").setDescription("The description of the ticket panel").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("button_label").setDescription("The label for the create ticket button").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("emoji").setDescription("The emoji to use on the button (optional)").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a user to a ticket")
        .addUserOption((option) => option.setName("user").setDescription("The user to add").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a user from a ticket")
        .addUserOption((option) => option.setName("user").setDescription("The user to remove").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("close").setDescription("Close the current ticket")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize ticket settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.tickets) {
      guildSettings.tickets = {
        enabled: false,
        supportRoleId: null,
        categoryId: null,
        welcomeMessage: "Thank you for creating a ticket. Support will be with you shortly.",
        panels: [],
        activeTickets: {},
      }
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel")
      const supportRole = interaction.options.getRole("support_role")
      const category = interaction.options.getChannel("category")
      const welcomeMessage =
        interaction.options.getString("welcome_message") ||
        "Thank you for creating a ticket. Support will be with you shortly."

      // Update ticket settings
      guildSettings.tickets.enabled = true
      guildSettings.tickets.supportRoleId = supportRole.id
      guildSettings.tickets.categoryId = category.id
      guildSettings.tickets.welcomeMessage = welcomeMessage
      database.save()

      // Create default ticket panel
      const embed = new EmbedBuilder()
        .setTitle("Support Tickets")
        .setDescription("Click the button below to create a support ticket.")
        .setColor(0x5865f2)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Create Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫"),
      )

      await channel.send({ embeds: [embed], components: [row] })

      await interaction.reply({
        content: `Ticket system has been set up! A default ticket panel has been sent to ${channel}.`,
        ephemeral: true,
      })
    } else if (subcommand === "panel") {
      if (!guildSettings.tickets.enabled) {
        return interaction.reply({
          content: "The ticket system is not set up. Please use `/ticket setup` first.",
          ephemeral: true,
        })
      }

      const channel = interaction.options.getChannel("channel")
      const title = interaction.options.getString("title")
      const description = interaction.options.getString("description")
      const buttonLabel = interaction.options.getString("button_label")
      const emoji = interaction.options.getString("emoji")

      // Create ticket panel
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x5865f2)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      const button = new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel(buttonLabel)
        .setStyle(ButtonStyle.Primary)

      if (emoji) {
        button.setEmoji(emoji)
      }

      const row = new ActionRowBuilder().addComponents(button)

      const message = await channel.send({ embeds: [embed], components: [row] })

      // Store panel in database
      guildSettings.tickets.panels.push({
        messageId: message.id,
        channelId: channel.id,
      })
      database.save()

      await interaction.reply({
        content: `Ticket panel has been created in ${channel}.`,
        ephemeral: true,
      })
    } else if (subcommand === "add") {
      // Check if the current channel is a ticket
      const channelId = interaction.channel.id
      if (!guildSettings.tickets.activeTickets[channelId]) {
        return interaction.reply({
          content: "This command can only be used in a ticket channel.",
          ephemeral: true,
        })
      }

      const user = interaction.options.getUser("user")
      const member = await interaction.guild.members.fetch(user.id).catch(() => null)

      if (!member) {
        return interaction.reply({
          content: "Could not find that user in this server.",
          ephemeral: true,
        })
      }

      try {
        // Add user to ticket
        await interaction.channel.permissionOverwrites.edit(user, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        })

        await interaction.reply({
          content: `${user} has been added to the ticket.`,
        })
      } catch (error) {
        console.error("Error adding user to ticket:", error)
        await interaction.reply({
          content: "There was an error adding the user to the ticket.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "remove") {
      // Check if the current channel is a ticket
      const channelId = interaction.channel.id
      if (!guildSettings.tickets.activeTickets[channelId]) {
        return interaction.reply({
          content: "This command can only be used in a ticket channel.",
          ephemeral: true,
        })
      }

      const user = interaction.options.getUser("user")

      // Don't allow removing the ticket creator
      if (guildSettings.tickets.activeTickets[channelId].userId === user.id) {
        return interaction.reply({
          content: "You cannot remove the ticket creator.",
          ephemeral: true,
        })
      }

      try {
        // Remove user from ticket
        await interaction.channel.permissionOverwrites.delete(user)

        await interaction.reply({
          content: `${user} has been removed from the ticket.`,
        })
      } catch (error) {
        console.error("Error removing user from ticket:", error)
        await interaction.reply({
          content: "There was an error removing the user from the ticket.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "close") {
      // Check if the current channel is a ticket
      const channelId = interaction.channel.id
      if (!guildSettings.tickets.activeTickets[channelId]) {
        return interaction.reply({
          content: "This command can only be used in a ticket channel.",
          ephemeral: true,
        })
      }

      // Create confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirm_close").setLabel("Close").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("cancel_close").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      )

      await interaction.reply({
        content: "Are you sure you want to close this ticket?",
        components: [row],
      })
    }
  },
}
