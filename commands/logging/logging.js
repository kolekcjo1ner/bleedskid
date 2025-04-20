const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logging")
    .setDescription("Configure the server logging system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the logging system")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send logs to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enable specific log events")
        .addStringOption((option) =>
          option
            .setName("event")
            .setDescription("The event to enable logging for")
            .setRequired(true)
            .addChoices(
              { name: "Message Events", value: "message" },
              { name: "Member Events", value: "member" },
              { name: "Channel Events", value: "channel" },
              { name: "Role Events", value: "role" },
              { name: "Server Events", value: "server" },
              { name: "Voice Events", value: "voice" },
              { name: "All Events", value: "all" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable specific log events")
        .addStringOption((option) =>
          option
            .setName("event")
            .setDescription("The event to disable logging for")
            .setRequired(true)
            .addChoices(
              { name: "Message Events", value: "message" },
              { name: "Member Events", value: "member" },
              { name: "Channel Events", value: "channel" },
              { name: "Role Events", value: "role" },
              { name: "Server Events", value: "server" },
              { name: "Voice Events", value: "voice" },
              { name: "All Events", value: "all" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ignore")
        .setDescription("Ignore a channel or role in logs")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("What to ignore")
            .setRequired(true)
            .addChoices({ name: "Channel", value: "channel" }, { name: "Role", value: "role" }),
        )
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the channel or role to ignore").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unignore")
        .setDescription("Stop ignoring a channel or role in logs")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("What to unignore")
            .setRequired(true)
            .addChoices({ name: "Channel", value: "channel" }, { name: "Role", value: "role" }),
        )
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the channel or role to unignore").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("settings").setDescription("View current logging settings")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize logging settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.logging) {
      guildSettings.logging = {
        enabled: false,
        channelId: null,
        events: {
          message: false, // Message deleted, edited, bulk deleted
          member: false, // Member joined, left, updated
          channel: false, // Channel created, deleted, updated
          role: false, // Role created, deleted, updated
          server: false, // Server updated, emoji updated, etc.
          voice: false, // Voice state updates
        },
        ignoredChannels: [],
        ignoredRoles: [],
      }
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel")

      // Update logging settings
      guildSettings.logging.enabled = true
      guildSettings.logging.channelId = channel.id
      database.save()

      await interaction.reply({
        content: `Logging has been set up! Logs will be sent to ${channel}.`,
        ephemeral: true,
      })
    } else if (subcommand === "enable") {
      if (!guildSettings.logging.channelId) {
        return interaction.reply({
          content: "Please set up logging first with `/logging setup`.",
          ephemeral: true,
        })
      }

      const event = interaction.options.getString("event")

      if (event === "all") {
        // Enable all events
        Object.keys(guildSettings.logging.events).forEach((key) => {
          guildSettings.logging.events[key] = true
        })
        guildSettings.logging.enabled = true
        database.save()

        await interaction.reply({
          content: "All logging events have been enabled.",
          ephemeral: true,
        })
      } else {
        // Enable specific event
        guildSettings.logging.events[event] = true
        guildSettings.logging.enabled = true
        database.save()

        const eventNames = {
          message: "Message Events",
          member: "Member Events",
          channel: "Channel Events",
          role: "Role Events",
          server: "Server Events",
          voice: "Voice Events",
        }

        await interaction.reply({
          content: `${eventNames[event]} logging has been enabled.`,
          ephemeral: true,
        })
      }
    } else if (subcommand === "disable") {
      const event = interaction.options.getString("event")

      if (event === "all") {
        // Disable all events
        Object.keys(guildSettings.logging.events).forEach((key) => {
          guildSettings.logging.events[key] = false
        })
        guildSettings.logging.enabled = false
        database.save()

        await interaction.reply({
          content: "All logging events have been disabled.",
          ephemeral: true,
        })
      } else {
        // Disable specific event
        guildSettings.logging.events[event] = false

        // Check if any events are still enabled
        const anyEnabled = Object.values(guildSettings.logging.events).some((value) => value === true)
        if (!anyEnabled) {
          guildSettings.logging.enabled = false
        }

        database.save()

        const eventNames = {
          message: "Message Events",
          member: "Member Events",
          channel: "Channel Events",
          role: "Role Events",
          server: "Server Events",
          voice: "Voice Events",
        }

        await interaction.reply({
          content: `${eventNames[event]} logging has been disabled.`,
          ephemeral: true,
        })
      }
    } else if (subcommand === "ignore") {
      const type = interaction.options.getString("type")
      const id = interaction.options.getString("id")

      // Validate ID
      if (!/^\d+$/.test(id)) {
        return interaction.reply({
          content: "Please provide a valid ID.",
          ephemeral: true,
        })
      }

      // Check if ID exists
      if (type === "channel") {
        const channel = await interaction.guild.channels.fetch(id).catch(() => null)
        if (!channel) {
          return interaction.reply({
            content: "Could not find a channel with that ID.",
            ephemeral: true,
          })
        }

        // Add channel to ignored list if not already there
        if (!guildSettings.logging.ignoredChannels.includes(id)) {
          guildSettings.logging.ignoredChannels.push(id)
          database.save()
        }

        await interaction.reply({
          content: `${channel.name} will now be ignored in logs.`,
          ephemeral: true,
        })
      } else if (type === "role") {
        const role = await interaction.guild.roles.fetch(id).catch(() => null)
        if (!role) {
          return interaction.reply({
            content: "Could not find a role with that ID.",
            ephemeral: true,
          })
        }

        // Add role to ignored list if not already there
        if (!guildSettings.logging.ignoredRoles.includes(id)) {
          guildSettings.logging.ignoredRoles.push(id)
          database.save()
        }

        await interaction.reply({
          content: `${role.name} will now be ignored in logs.`,
          ephemeral: true,
        })
      }
    } else if (subcommand === "unignore") {
      const type = interaction.options.getString("type")
      const id = interaction.options.getString("id")

      if (type === "channel") {
        // Remove channel from ignored list
        const index = guildSettings.logging.ignoredChannels.indexOf(id)
        if (index !== -1) {
          guildSettings.logging.ignoredChannels.splice(index, 1)
          database.save()

          const channel = await interaction.guild.channels.fetch(id).catch(() => null)
          const channelName = channel ? channel.name : "Channel"

          await interaction.reply({
            content: `${channelName} will no longer be ignored in logs.`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: "That channel is not being ignored in logs.",
            ephemeral: true,
          })
        }
      } else if (type === "role") {
        // Remove role from ignored list
        const index = guildSettings.logging.ignoredRoles.indexOf(id)
        if (index !== -1) {
          guildSettings.logging.ignoredRoles.splice(index, 1)
          database.save()

          const role = await interaction.guild.roles.fetch(id).catch(() => null)
          const roleName = role ? role.name : "Role"

          await interaction.reply({
            content: `${roleName} will no longer be ignored in logs.`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: "That role is not being ignored in logs.",
            ephemeral: true,
          })
        }
      }
    } else if (subcommand === "settings") {
      // Create embed with current settings
      const embed = new EmbedBuilder()
        .setTitle("Logging Settings")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "Status",
            value: guildSettings.logging.enabled ? "Enabled" : "Disabled",
            inline: true,
          },
          {
            name: "Log Channel",
            value: guildSettings.logging.channelId ? `<#${guildSettings.logging.channelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Enabled Events",
            value: Object.entries(guildSettings.logging.events)
              .map(([key, value]) => {
                const eventNames = {
                  message: "Message Events",
                  member: "Member Events",
                  channel: "Channel Events",
                  role: "Role Events",
                  server: "Server Events",
                  voice: "Voice Events",
                }
                return `${value ? "✅" : "❌"} ${eventNames[key]}`
              })
              .join("\n"),
          },
          {
            name: "Ignored Channels",
            value:
              guildSettings.logging.ignoredChannels.length > 0
                ? guildSettings.logging.ignoredChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
          },
          {
            name: "Ignored Roles",
            value:
              guildSettings.logging.ignoredRoles.length > 0
                ? guildSettings.logging.ignoredRoles.map((id) => `<@&${id}>`).join(", ")
                : "None",
          },
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}
