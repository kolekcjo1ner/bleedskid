const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("template")
    .setDescription("Manage voice channel templates")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("save")
        .setDescription("Save your current voice channel as a template")
        .addStringOption((option) =>
          option.setName("name").setDescription("The name for this template").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List your saved voice channel templates"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("load")
        .setDescription("Load a saved template to your current voice channel")
        .addStringOption((option) =>
          option.setName("name").setDescription("The name of the template to load").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a saved template")
        .addStringOption((option) =>
          option.setName("name").setDescription("The name of the template to delete").setRequired(true),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const userData = database.getUser(interaction.user.id)

    // Initialize templates if they don't exist
    if (!userData.voiceTemplates) {
      userData.voiceTemplates = {}
    }

    if (subcommand === "list") {
      const templates = Object.keys(userData.voiceTemplates)

      if (templates.length === 0) {
        return interaction.reply({
          content: "You don't have any saved voice channel templates.",
          ephemeral: true,
        })
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Your Voice Channel Templates")
        .setDescription(templates.map((name) => `• **${name}**`).join("\n"))
        .setFooter({ text: `Use /template load to apply a template` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else if (subcommand === "save") {
      // Check if the user is in a voice channel
      const voiceChannel = interaction.member.voice.channel
      if (!voiceChannel) {
        return interaction.reply({
          content: "You need to be in a voice channel to save a template!",
          ephemeral: true,
        })
      }

      // Get guild settings
      const guildSettings = database.getGuild(interaction.guild.id)
      if (!guildSettings.voiceMaster || !guildSettings.voiceMaster.enabled) {
        return interaction.reply({
          content: "Voice Master system is not enabled on this server.",
          ephemeral: true,
        })
      }

      // Check if the voice channel is a Voice Master channel
      const voiceChannels = guildSettings.voiceMaster.channels || {}
      if (!voiceChannels[voiceChannel.id]) {
        return interaction.reply({
          content: "This is not a Voice Master channel.",
          ephemeral: true,
        })
      }

      // Check if the user is the owner
      if (voiceChannels[voiceChannel.id].ownerId !== interaction.user.id) {
        return interaction.reply({
          content: "You are not the owner of this voice channel!",
          ephemeral: true,
        })
      }

      const templateName = interaction.options.getString("name")

      // Check if template name already exists
      if (userData.voiceTemplates[templateName]) {
        return interaction.reply({
          content: `A template with the name "${templateName}" already exists. Please choose a different name or delete the existing template first.`,
          ephemeral: true,
        })
      }

      // Save the template
      userData.voiceTemplates[templateName] = {
        name: voiceChannel.name,
        userLimit: voiceChannel.userLimit,
        bitrate: voiceChannel.bitrate,
        region: voiceChannel.rtcRegion,
        createdAt: Date.now(),
      }
      database.save()

      await interaction.reply({
        content: `✅ Your voice channel settings have been saved as template "${templateName}".`,
        ephemeral: true,
      })
    } else if (subcommand === "load") {
      // Check if the user is in a voice channel
      const voiceChannel = interaction.member.voice.channel
      if (!voiceChannel) {
        return interaction.reply({
          content: "You need to be in a voice channel to load a template!",
          ephemeral: true,
        })
      }

      // Get guild settings
      const guildSettings = database.getGuild(interaction.guild.id)
      if (!guildSettings.voiceMaster || !guildSettings.voiceMaster.enabled) {
        return interaction.reply({
          content: "Voice Master system is not enabled on this server.",
          ephemeral: true,
        })
      }

      // Check if the voice channel is a Voice Master channel
      const voiceChannels = guildSettings.voiceMaster.channels || {}
      if (!voiceChannels[voiceChannel.id]) {
        return interaction.reply({
          content: "This is not a Voice Master channel.",
          ephemeral: true,
        })
      }

      // Check if the user is the owner
      if (voiceChannels[voiceChannel.id].ownerId !== interaction.user.id) {
        return interaction.reply({
          content: "You are not the owner of this voice channel!",
          ephemeral: true,
        })
      }

      const templateName = interaction.options.getString("name")

      // Check if template exists
      if (!userData.voiceTemplates[templateName]) {
        return interaction.reply({
          content: `Template "${templateName}" not found. Use /template list to see your saved templates.`,
          ephemeral: true,
        })
      }

      const template = userData.voiceTemplates[templateName]

      try {
        // Apply template settings
        await voiceChannel.setName(template.name)
        await voiceChannel.setUserLimit(template.userLimit)
        await voiceChannel.setBitrate(template.bitrate)
        await voiceChannel.setRTCRegion(template.region)

        // Update database
        voiceChannels[voiceChannel.id].name = template.name
        voiceChannels[voiceChannel.id].userLimit = template.userLimit
        database.save()

        await interaction.reply({
          content: `✅ Template "${templateName}" has been applied to your voice channel.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error applying voice channel template:", error)
        await interaction.reply({
          content: "There was an error applying the template to your voice channel.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "delete") {
      const templateName = interaction.options.getString("name")

      // Check if template exists
      if (!userData.voiceTemplates[templateName]) {
        return interaction.reply({
          content: `Template "${templateName}" not found. Use /template list to see your saved templates.`,
          ephemeral: true,
        })
      }

      // Delete the template
      delete userData.voiceTemplates[templateName]
      database.save()

      await interaction.reply({
        content: `✅ Template "${templateName}" has been deleted.`,
        ephemeral: true,
      })
    }
  },
}
