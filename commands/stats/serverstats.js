const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("Manage server statistics")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up server statistics channels")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to create stats channels in")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable server statistics")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("customize")
        .setDescription("Customize server statistics channels")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("The type of statistic to customize")
            .setRequired(true)
            .addChoices(
              { name: "Members", value: "members" },
              { name: "Humans", value: "humans" },
              { name: "Bots", value: "bots" },
              { name: "Channels", value: "channels" },
              { name: "Roles", value: "roles" },
              { name: "Boosts", value: "boosts" },
              { name: "Online", value: "online" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("format")
            .setDescription("The format of the channel name (use {count} as placeholder)")
            .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) => subcommand.setName("refresh").setDescription("Manually refresh server statistics")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize server stats in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.serverStats) {
      guildSettings.serverStats = {
        enabled: false,
        categoryId: null,
        channels: {},
        formats: {
          members: "👥 Members: {count}",
          humans: "👤 Humans: {count}",
          bots: "🤖 Bots: {count}",
          channels: "📊 Channels: {count}",
          roles: "🏷️ Roles: {count}",
          boosts: "🚀 Boosts: {count}",
          online: "🟢 Online: {count}",
        },
        lastUpdated: null,
      }
    }

    if (subcommand === "setup") {
      const category = interaction.options.getChannel("category")

      await interaction.deferReply({ ephemeral: true })

      try {
        // Create stats channels
        const statsTypes = ["members", "humans", "bots", "channels", "roles", "boosts", "online"]
        const channels = {}

        for (const type of statsTypes) {
          // Get count for this stat type
          const count = await getStatCount(interaction.guild, type)

          // Create channel with formatted name
          const channelName = guildSettings.serverStats.formats[type].replace("{count}", count)
          const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: ["Connect"],
              },
            ],
          })

          channels[type] = channel.id
        }

        // Update database
        guildSettings.serverStats.enabled = true
        guildSettings.serverStats.categoryId = category.id
        guildSettings.serverStats.channels = channels
        guildSettings.serverStats.lastUpdated = Date.now()
        database.save()

        await interaction.editReply({
          content: "Server statistics channels have been set up!",
        })
      } catch (error) {
        console.error("Error setting up server stats:", error)
        await interaction.editReply({
          content: "There was an error setting up server statistics. Make sure I have the necessary permissions.",
        })
      }
    } else if (subcommand === "disable") {
      if (!guildSettings.serverStats.enabled) {
        return interaction.reply({
          content: "Server statistics are not enabled.",
          ephemeral: true,
        })
      }

      await interaction.deferReply({ ephemeral: true })

      try {
        // Delete stats channels
        for (const channelId of Object.values(guildSettings.serverStats.channels)) {
          const channel = await interaction.guild.channels.fetch(channelId).catch(() => null)
          if (channel) {
            await channel.delete("Server stats disabled")
          }
        }

        // Update database
        guildSettings.serverStats.enabled = false
        guildSettings.serverStats.channels = {}
        database.save()

        await interaction.editReply({
          content: "Server statistics have been disabled and channels deleted.",
        })
      } catch (error) {
        console.error("Error disabling server stats:", error)
        await interaction.editReply({
          content: "There was an error disabling server statistics.",
        })
      }
    } else if (subcommand === "customize") {
      if (!guildSettings.serverStats.enabled) {
        return interaction.reply({
          content: "Server statistics are not enabled. Please set them up first with `/serverstats setup`.",
          ephemeral: true,
        })
      }

      const type = interaction.options.getString("type")
      const format = interaction.options.getString("format")

      // Validate format
      if (!format.includes("{count}")) {
        return interaction.reply({
          content: "The format must include the {count} placeholder.",
          ephemeral: true,
        })
      }

      // Update format in database
      guildSettings.serverStats.formats[type] = format
      database.save()

      // Update channel name
      try {
        const channelId = guildSettings.serverStats.channels[type]
        if (channelId) {
          const channel = await interaction.guild.channels.fetch(channelId).catch(() => null)
          if (channel) {
            const count = await getStatCount(interaction.guild, type)
            const newName = format.replace("{count}", count)
            await channel.setName(newName)
          }
        }

        await interaction.reply({
          content: `Format for ${type} statistics has been updated to "${format}".`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating stats channel:", error)
        await interaction.reply({
          content: "There was an error updating the statistics channel.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "refresh") {
      if (!guildSettings.serverStats.enabled) {
        return interaction.reply({
          content: "Server statistics are not enabled. Please set them up first with `/serverstats setup`.",
          ephemeral: true,
        })
      }

      await interaction.deferReply({ ephemeral: true })

      try {
        // Update all stats channels
        for (const [type, channelId] of Object.entries(guildSettings.serverStats.channels)) {
          const channel = await interaction.guild.channels.fetch(channelId).catch(() => null)
          if (channel) {
            const count = await getStatCount(interaction.guild, type)
            const newName = guildSettings.serverStats.formats[type].replace("{count}", count)
            await channel.setName(newName)
          }
        }

        // Update last updated timestamp
        guildSettings.serverStats.lastUpdated = Date.now()
        database.save()

        await interaction.editReply({
          content: "Server statistics have been refreshed!",
        })
      } catch (error) {
        console.error("Error refreshing server stats:", error)
        await interaction.editReply({
          content: "There was an error refreshing server statistics.",
        })
      }
    }
  },
}

// Function to get count for a specific stat type
async function getStatCount(guild, type) {
  switch (type) {
    case "members":
      return guild.memberCount
    case "humans":
      // This requires fetching all members which might not be feasible for large servers
      // For a real bot, you might want to use a cache or database
      const members = await guild.members.fetch()
      return members.filter((member) => !member.user.bot).size
    case "bots":
      const allMembers = await guild.members.fetch()
      return allMembers.filter((member) => member.user.bot).size
    case "channels":
      return guild.channels.cache.size
    case "roles":
      return guild.roles.cache.size
    case "boosts":
      return guild.premiumSubscriptionCount || 0
    case "online":
      const onlineMembers = await guild.members.fetch()
      return onlineMembers.filter((member) => member.presence?.status === "online").size
    default:
      return 0
  }
}
