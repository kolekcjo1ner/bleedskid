const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Create and manage custom tags")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new tag")
        .addStringOption((option) => option.setName("name").setDescription("The name of the tag").setRequired(true))
        .addStringOption((option) =>
          option.setName("content").setDescription("The content of the tag").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit an existing tag")
        .addStringOption((option) => option.setName("name").setDescription("The name of the tag").setRequired(true))
        .addStringOption((option) =>
          option.setName("content").setDescription("The new content of the tag").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a tag")
        .addStringOption((option) => option.setName("name").setDescription("The name of the tag").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Get information about a tag")
        .addStringOption((option) => option.setName("name").setDescription("The name of the tag").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all tags")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize tags in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.tags) {
      guildSettings.tags = {}
    }

    if (subcommand === "create") {
      const name = interaction.options.getString("name").toLowerCase()
      const content = interaction.options.getString("content")

      // Check if tag already exists
      if (guildSettings.tags[name]) {
        return interaction.reply({
          content: `A tag with the name "${name}" already exists. Use \`/tag edit\` to edit it.`,
          ephemeral: true,
        })
      }

      // Create tag
      guildSettings.tags[name] = {
        content,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        uses: 0,
      }
      database.save()

      await interaction.reply({
        content: `Tag "${name}" has been created!`,
        ephemeral: true,
      })
    } else if (subcommand === "edit") {
      const name = interaction.options.getString("name").toLowerCase()
      const content = interaction.options.getString("content")

      // Check if tag exists
      if (!guildSettings.tags[name]) {
        return interaction.reply({
          content: `A tag with the name "${name}" doesn't exist.`,
          ephemeral: true,
        })
      }

      // Check if user is the tag owner or has manage messages permission
      if (
        guildSettings.tags[name].createdBy !== interaction.user.id &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        return interaction.reply({
          content: "You don't have permission to edit this tag.",
          ephemeral: true,
        })
      }

      // Edit tag
      guildSettings.tags[name].content = content
      guildSettings.tags[name].editedBy = interaction.user.id
      guildSettings.tags[name].editedAt = Date.now()
      database.save()

      await interaction.reply({
        content: `Tag "${name}" has been edited!`,
        ephemeral: true,
      })
    } else if (subcommand === "delete") {
      const name = interaction.options.getString("name").toLowerCase()

      // Check if tag exists
      if (!guildSettings.tags[name]) {
        return interaction.reply({
          content: `A tag with the name "${name}" doesn't exist.`,
          ephemeral: true,
        })
      }

      // Check if user is the tag owner or has manage messages permission
      if (
        guildSettings.tags[name].createdBy !== interaction.user.id &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        return interaction.reply({
          content: "You don't have permission to delete this tag.",
          ephemeral: true,
        })
      }

      // Delete tag
      delete guildSettings.tags[name]
      database.save()

      await interaction.reply({
        content: `Tag "${name}" has been deleted!`,
        ephemeral: true,
      })
    } else if (subcommand === "info") {
      const name = interaction.options.getString("name").toLowerCase()

      // Check if tag exists
      if (!guildSettings.tags[name]) {
        return interaction.reply({
          content: `A tag with the name "${name}" doesn't exist.`,
          ephemeral: true,
        })
      }

      const tag = guildSettings.tags[name]

      // Get user information
      const creator = await interaction.client.users.fetch(tag.createdBy).catch(() => null)
      const editor = tag.editedBy ? await interaction.client.users.fetch(tag.editedBy).catch(() => null) : null

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Tag: ${name}`)
        .setColor(0x5865f2)
        .addFields(
          { name: "Created by", value: creator ? creator.tag : "Unknown User", inline: true },
          { name: "Created at", value: `<t:${Math.floor(tag.createdAt / 1000)}:R>`, inline: true },
          { name: "Uses", value: tag.uses.toString(), inline: true },
        )
        .setTimestamp()

      // Add editor information if available
      if (editor) {
        embed.addFields(
          { name: "Edited by", value: editor.tag, inline: true },
          { name: "Edited at", value: `<t:${Math.floor(tag.editedAt / 1000)}:R>`, inline: true },
        )
      }

      await interaction.reply({ embeds: [embed] })
    } else if (subcommand === "list") {
      const tags = Object.keys(guildSettings.tags)

      if (tags.length === 0) {
        return interaction.reply({
          content: "There are no tags in this server.",
          ephemeral: true,
        })
      }

      // Sort tags by usage
      tags.sort((a, b) => guildSettings.tags[b].uses - guildSettings.tags[a].uses)

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Server Tags")
        .setColor(0x5865f2)
        .setDescription(tags.map((tag) => `\`${tag}\` (${guildSettings.tags[tag].uses} uses)`).join("\n"))
        .setFooter({ text: `Total tags: ${tags.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    }
  },
}
