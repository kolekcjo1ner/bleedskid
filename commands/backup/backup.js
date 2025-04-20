const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Create and manage server backups")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) => subcommand.setName("create").setDescription("Create a new server backup"))
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all available backups"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("load")
        .setDescription("Load a backup")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the backup to load").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a backup")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the backup to delete").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Get information about a backup")
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the backup to get info about").setRequired(true),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize backups in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.backups) {
      guildSettings.backups = []
    }

    if (subcommand === "create") {
      await interaction.deferReply({ ephemeral: true })

      try {
        // Create backup
        const backup = await createBackup(interaction.guild)

        // Add to database
        guildSettings.backups.push(backup)
        database.save()

        await interaction.editReply({
          content: `✅ Backup created successfully! Backup ID: \`${backup.id}\``,
        })
      } catch (error) {
        console.error("Error creating backup:", error)
        await interaction.editReply({
          content: "There was an error creating the backup. Please try again later.",
        })
      }
    } else if (subcommand === "list") {
      // Get backups
      const backups = guildSettings.backups

      if (backups.length === 0) {
        return interaction.reply({
          content: "There are no backups for this server.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Server Backups")
        .setColor(0x5865f2)
        .setDescription(
          backups
            .map(
              (b) =>
                `**ID:** \`${b.id}\`\n` +
                `**Created:** <t:${Math.floor(b.createdAt / 1000)}:R>\n` +
                `**Channels:** ${b.channels.length} | **Roles:** ${b.roles.length} | **Emojis:** ${b.emojis.length}`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total backups: ${backups.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else if (subcommand === "load") {
      const backupId = interaction.options.getString("id")

      // Find the backup
      const backup = guildSettings.backups.find((b) => b.id === backupId)
      if (!backup) {
        return interaction.reply({
          content: "Could not find a backup with that ID.",
          ephemeral: true,
        })
      }

      // Confirm loading
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Warning: Loading Backup")
        .setDescription(
          "Loading a backup will:\n" +
            "- Delete all current channels\n" +
            "- Delete all current roles (except the highest bot role and @everyone)\n" +
            "- Create new channels and roles from the backup\n\n" +
            "This action cannot be undone. Are you sure you want to continue?",
        )
        .setColor(0xff0000)
        .setTimestamp()

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirm_backup_load").setLabel("Yes, load backup").setStyle(4),
        new ButtonBuilder().setCustomId("cancel_backup_load").setLabel("Cancel").setStyle(2),
      )

      const message = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      })

      // Create collector for confirmation
      const filter = (i) => i.user.id === interaction.user.id
      const collector = message.createMessageComponentCollector({ filter, time: 60000 })

      collector.on("collect", async (i) => {
        if (i.customId === "confirm_backup_load") {
          await i.update({
            content: "Loading backup... This may take a while.",
            embeds: [],
            components: [],
          })

          try {
            // Load backup
            await loadBackup(interaction.guild, backup)

            await i.editReply({
              content: "✅ Backup loaded successfully!",
            })
          } catch (error) {
            console.error("Error loading backup:", error)
            await i.editReply({
              content: "There was an error loading the backup. Please try again later.",
            })
          }
        } else if (i.customId === "cancel_backup_load") {
          await i.update({
            content: "Backup loading cancelled.",
            embeds: [],
            components: [],
          })
        }
      })

      collector.on("end", async (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          await interaction.editReply({
            content: "Backup loading cancelled (timed out).",
            embeds: [],
            components: [],
          })
        }
      })
    } else if (subcommand === "delete") {
      const backupId = interaction.options.getString("id")

      // Find the backup
      const backupIndex = guildSettings.backups.findIndex((b) => b.id === backupId)
      if (backupIndex === -1) {
        return interaction.reply({
          content: "Could not find a backup with that ID.",
          ephemeral: true,
        })
      }

      // Delete the backup
      guildSettings.backups.splice(backupIndex, 1)
      database.save()

      await interaction.reply({
        content: `✅ Backup \`${backupId}\` has been deleted.`,
        ephemeral: true,
      })
    } else if (subcommand === "info") {
      const backupId = interaction.options.getString("id")

      // Find the backup
      const backup = guildSettings.backups.find((b) => b.id === backupId)
      if (!backup) {
        return interaction.reply({
          content: "Could not find a backup with that ID.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Backup Info: ${backupId}`)
        .setColor(0x5865f2)
        .addFields(
          { name: "Created", value: `<t:${Math.floor(backup.createdAt / 1000)}:F>`, inline: true },
          { name: "Created By", value: `<@${backup.createdBy}>`, inline: true },
          { name: "Server Name", value: backup.name, inline: true },
          { name: "Channels", value: `${backup.channels.length} channels`, inline: true },
          { name: "Roles", value: `${backup.roles.length} roles`, inline: true },
          { name: "Emojis", value: `${backup.emojis.length} emojis`, inline: true },
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}

// Function to create a backup
async function createBackup(guild) {
  // Generate a random ID
  const id = Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(2, 8)

  // Fetch all channels, roles, and emojis
  await guild.channels.fetch()
  await guild.roles.fetch()
  await guild.emojis.fetch()

  // Create backup object
  const backup = {
    id,
    name: guild.name,
    iconURL: guild.iconURL(),
    createdAt: Date.now(),
    createdBy: guild.client.user.id,
    channels: [],
    roles: [],
    emojis: [],
  }

  // Backup channels
  guild.channels.cache.forEach((channel) => {
    const channelData = {
      name: channel.name,
      type: channel.type,
      position: channel.position,
      parentId: channel.parentId,
      permissionOverwrites: [],
    }

    // Add channel-specific properties
    if (channel.type === 0) {
      // Text channel
      channelData.topic = channel.topic
      channelData.nsfw = channel.nsfw
      channelData.rateLimitPerUser = channel.rateLimitPerUser
    } else if (channel.type === 2) {
      // Voice channel
      channelData.bitrate = channel.bitrate
      channelData.userLimit = channel.userLimit
      channelData.rtcRegion = channel.rtcRegion
    }

    // Add permission overwrites
    channel.permissionOverwrites.cache.forEach((overwrite) => {
      channelData.permissionOverwrites.push({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.bitfield.toString(),
      })
    })

    backup.channels.push(channelData)
  })

  // Backup roles
  guild.roles.cache
    .filter((role) => !role.managed && role.id !== guild.id) // Skip managed roles and @everyone
    .sort((a, b) => b.position - a.position) // Sort by position (highest first)
    .forEach((role) => {
      backup.roles.push({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
      })
    })

  // Backup emojis
  guild.emojis.cache.forEach((emoji) => {
    backup.emojis.push({
      name: emoji.name,
      url: emoji.url,
      animated: emoji.animated,
    })
  })

  return backup
}

// Function to load a backup
async function loadBackup(guild, backup) {
  // Delete all channels
  await Promise.all(guild.channels.cache.map((channel) => channel.delete().catch(() => null)))

  // Delete all roles (except highest bot role and @everyone)
  const botRole = guild.me.roles.highest
  await Promise.all(
    guild.roles.cache
      .filter((role) => role.id !== guild.id && role.id !== botRole.id && !role.managed)
      .map((role) => role.delete().catch(() => null)),
  )

  // Create roles (in reverse order, lowest position first)
  const roleMap = new Map()
  for (const roleData of [...backup.roles].reverse()) {
    try {
      const role = await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        position: roleData.position,
        permissions: BigInt(roleData.permissions),
        mentionable: roleData.mentionable,
      })
      roleMap.set(roleData.name, role.id)
    } catch (error) {
      console.error(`Error creating role ${roleData.name}:`, error)
    }
  }

  // Create categories first
  const categoryMap = new Map()
  for (const channelData of backup.channels.filter((c) => c.type === 4)) {
    try {
      const category = await guild.channels.create({
        name: channelData.name,
        type: 4, // Category
        position: channelData.position,
        permissionOverwrites: channelData.permissionOverwrites.map((overwrite) => ({
          id: overwrite.id === guild.id ? guild.id : roleMap.get(overwrite.id) || overwrite.id,
          type: overwrite.type,
          allow: BigInt(overwrite.allow),
          deny: BigInt(overwrite.deny),
        })),
      })
      categoryMap.set(channelData.name, category.id)
    } catch (error) {
      console.error(`Error creating category ${channelData.name}:`, error)
    }
  }

  // Create other channels
  for (const channelData of backup.channels.filter((c) => c.type !== 4)) {
    try {
      // Map parent ID if it exists
      const parentId = channelData.parentId ? categoryMap.get(channelData.name) : null

      // Create channel
      const channelOptions = {
        name: channelData.name,
        type: channelData.type,
        position: channelData.position,
        permissionOverwrites: channelData.permissionOverwrites.map((overwrite) => ({
          id: overwrite.id === guild.id ? guild.id : roleMap.get(overwrite.id) || overwrite.id,
          type: overwrite.type,
          allow: BigInt(overwrite.allow),
          deny: BigInt(overwrite.deny),
        })),
        parent: parentId,
      }

      // Add channel-specific properties
      if (channelData.type === 0) {
        // Text channel
        channelOptions.topic = channelData.topic
        channelOptions.nsfw = channelData.nsfw
        channelOptions.rateLimitPerUser = channelData.rateLimitPerUser
      } else if (channelData.type === 2) {
        // Voice channel
        channelOptions.bitrate = channelData.bitrate
        channelOptions.userLimit = channelData.userLimit
        channelOptions.rtcRegion = channelData.rtcRegion
      }

      await guild.channels.create(channelOptions)
    } catch (error) {
      console.error(`Error creating channel ${channelData.name}:`, error)
    }
  }

  // Create emojis
  for (const emojiData of backup.emojis) {
    try {
      await guild.emojis.create({
        attachment: emojiData.url,
        name: emojiData.name,
      })
    } catch (error) {
      console.error(`Error creating emoji ${emojiData.name}:`, error)
    }
  }

  // Set guild icon and name
  if (backup.iconURL) {
    try {
      await guild.setIcon(backup.iconURL)
    } catch (error) {
      console.error("Error setting guild icon:", error)
    }
  }

  try {
    await guild.setName(backup.name)
  } catch (error) {
    console.error("Error setting guild name:", error)
  }
}
