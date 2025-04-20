const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Manage server channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new channel")
        .addStringOption((option) => option.setName("name").setDescription("The name of the channel").setRequired(true))
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("The type of channel to create")
            .setRequired(true)
            .addChoices(
              { name: "Text", value: "text" },
              { name: "Voice", value: "voice" },
              { name: "Category", value: "category" },
              { name: "Announcement", value: "announcement" },
              { name: "Stage", value: "stage" },
            ),
        )
        .addChannelOption((option) =>
          option
            .setName("parent")
            .setDescription("The category to place the channel in")
            .addChannelTypes(ChannelType.GuildCategory),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a channel")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to delete").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit a channel")
        .addChannelOption((option) => option.setName("channel").setDescription("The channel to edit").setRequired(true))
        .addStringOption((option) => option.setName("name").setDescription("The new name of the channel"))
        .addChannelOption((option) =>
          option
            .setName("parent")
            .setDescription("The new category for the channel")
            .addChannelTypes(ChannelType.GuildCategory),
        )
        .addBooleanOption((option) =>
          option.setName("nsfw").setDescription("Whether the channel should be NSFW (text channels only)"),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Get information about a channel")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to get info about").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all channels in the server")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "create") {
      const name = interaction.options.getString("name")
      const type = interaction.options.getString("type")
      const parent = interaction.options.getChannel("parent")

      try {
        // Map channel type string to Discord.js channel type
        let channelType
        switch (type) {
          case "text":
            channelType = ChannelType.GuildText
            break
          case "voice":
            channelType = ChannelType.GuildVoice
            break
          case "category":
            channelType = ChannelType.GuildCategory
            break
          case "announcement":
            channelType = ChannelType.GuildAnnouncement
            break
          case "stage":
            channelType = ChannelType.GuildStageVoice
            break
          default:
            channelType = ChannelType.GuildText
        }

        // Create channel
        const channel = await interaction.guild.channels.create({
          name,
          type: channelType,
          parent: parent ? parent.id : null,
          reason: `Created by ${interaction.user.tag}`,
        })

        await interaction.reply({
          content: `Channel ${channel} has been created!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error creating channel:", error)
        await interaction.reply({
          content: "There was an error creating the channel. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "delete") {
      const channel = interaction.options.getChannel("channel")

      // Check if the channel is deletable
      if (!channel.deletable) {
        return interaction.reply({
          content: "I don't have permission to delete this channel.",
          ephemeral: true,
        })
      }

      try {
        // Delete channel
        await channel.delete(`Deleted by ${interaction.user.tag}`)

        await interaction.reply({
          content: `Channel "${channel.name}" has been deleted!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error deleting channel:", error)
        await interaction.reply({
          content: "There was an error deleting the channel. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "edit") {
      const channel = interaction.options.getChannel("channel")
      const name = interaction.options.getString("name")
      const parent = interaction.options.getChannel("parent")
      const nsfw = interaction.options.getBoolean("nsfw")

      // Check if the channel is manageable
      if (!channel.manageable) {
        return interaction.reply({
          content: "I don't have permission to edit this channel.",
          ephemeral: true,
        })
      }

      // Check if at least one option is provided
      if (!name && !parent && nsfw === null) {
        return interaction.reply({
          content: "Please provide at least one property to edit.",
          ephemeral: true,
        })
      }

      try {
        // Edit channel
        const options = {}
        if (name) options.name = name
        if (parent) options.parent = parent.id
        if (nsfw !== null && channel.type === ChannelType.GuildText) options.nsfw = nsfw

        await channel.edit(options, `Edited by ${interaction.user.tag}`)

        await interaction.reply({
          content: `Channel ${channel} has been edited!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error editing channel:", error)
        await interaction.reply({
          content: "There was an error editing the channel. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "info") {
      const channel = interaction.options.getChannel("channel")

      // Get channel information
      const createdAt = Math.floor(channel.createdTimestamp / 1000)
      const type = getChannelTypeName(channel.type)
      const parent = channel.parent ? channel.parent.name : "None"

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Channel: ${channel.name}`)
        .setColor(0x5865f2)
        .addFields(
          { name: "ID", value: channel.id, inline: true },
          { name: "Type", value: type, inline: true },
          { name: "Category", value: parent, inline: true },
          { name: "Created", value: `<t:${createdAt}:R>`, inline: true },
        )
        .setTimestamp()

      // Add channel-specific fields
      if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
        embed.addFields(
          { name: "NSFW", value: channel.nsfw ? "Yes" : "No", inline: true },
          { name: "Topic", value: channel.topic || "None", inline: false },
        )
      } else if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
        embed.addFields(
          { name: "Bitrate", value: `${channel.bitrate / 1000} kbps`, inline: true },
          { name: "User Limit", value: channel.userLimit ? channel.userLimit.toString() : "Unlimited", inline: true },
        )
      }

      await interaction.reply({ embeds: [embed] })
    } else if (subcommand === "list") {
      // Get all channels
      const categories = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory)
      const textChannels = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildText)
      const voiceChannels = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice)
      const announcementChannels = interaction.guild.channels.cache.filter(
        (c) => c.type === ChannelType.GuildAnnouncement,
      )
      const stageChannels = interaction.guild.channels.cache.filter((c) => c.type === ChannelType.GuildStageVoice)

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Channels in ${interaction.guild.name}`)
        .setColor(0x5865f2)
        .addFields(
          {
            name: `Categories (${categories.size})`,
            value: categories.size > 0 ? categories.map((c) => c.name).join("\n") : "None",
          },
          {
            name: `Text Channels (${textChannels.size})`,
            value: textChannels.size > 0 ? textChannels.map((c) => `${c}`).join("\n") : "None",
          },
          {
            name: `Voice Channels (${voiceChannels.size})`,
            value: voiceChannels.size > 0 ? voiceChannels.map((c) => `${c}`).join("\n") : "None",
          },
        )
        .setFooter({ text: `Total channels: ${interaction.guild.channels.cache.size}` })
        .setTimestamp()

      // Add announcement and stage channels if they exist
      if (announcementChannels.size > 0) {
        embed.addFields({
          name: `Announcement Channels (${announcementChannels.size})`,
          value: announcementChannels.map((c) => `${c}`).join("\n"),
        })
      }

      if (stageChannels.size > 0) {
        embed.addFields({
          name: `Stage Channels (${stageChannels.size})`,
          value: stageChannels.map((c) => `${c}`).join("\n"),
        })
      }

      await interaction.reply({ embeds: [embed] })
    }
  },
}

// Helper function to get channel type name
function getChannelTypeName(type) {
  switch (type) {
    case ChannelType.GuildText:
      return "Text Channel"
    case ChannelType.GuildVoice:
      return "Voice Channel"
    case ChannelType.GuildCategory:
      return "Category"
    case ChannelType.GuildAnnouncement:
      return "Announcement Channel"
    case ChannelType.GuildStageVoice:
      return "Stage Channel"
    default:
      return "Unknown"
  }
}
