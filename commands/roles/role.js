const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage server roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new role")
        .addStringOption((option) => option.setName("name").setDescription("The name of the role").setRequired(true))
        .addStringOption((option) =>
          option.setName("color").setDescription("The color of the role (hex code)").setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("hoisted")
            .setDescription("Whether the role should be displayed separately")
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("mentionable").setDescription("Whether the role can be mentioned").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a role")
        .addRoleOption((option) => option.setName("role").setDescription("The role to delete").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit a role")
        .addRoleOption((option) => option.setName("role").setDescription("The role to edit").setRequired(true))
        .addStringOption((option) =>
          option.setName("name").setDescription("The new name of the role").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("color").setDescription("The new color of the role (hex code)").setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("hoisted")
            .setDescription("Whether the role should be displayed separately")
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("mentionable").setDescription("Whether the role can be mentioned").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to add the role to").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role").setDescription("The role to add").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a user")
        .addUserOption((option) =>
          option.setName("user").setDescription("The user to remove the role from").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role").setDescription("The role to remove").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Get information about a role")
        .addRoleOption((option) =>
          option.setName("role").setDescription("The role to get info about").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all roles in the server")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "create") {
      const name = interaction.options.getString("name")
      const color = interaction.options.getString("color") || "#000000"
      const hoisted = interaction.options.getBoolean("hoisted") || false
      const mentionable = interaction.options.getBoolean("mentionable") || false

      // Validate hex color
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          content: "Please provide a valid hex color code (e.g. #FF5555).",
          ephemeral: true,
        })
      }

      try {
        // Create role
        const role = await interaction.guild.roles.create({
          name,
          color,
          hoist: hoisted,
          mentionable,
          reason: `Created by ${interaction.user.tag}`,
        })

        await interaction.reply({
          content: `Role ${role} has been created!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error creating role:", error)
        await interaction.reply({
          content: "There was an error creating the role. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "delete") {
      const role = interaction.options.getRole("role")

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to delete this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      try {
        // Delete role
        await role.delete(`Deleted by ${interaction.user.tag}`)

        await interaction.reply({
          content: `Role "${role.name}" has been deleted!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error deleting role:", error)
        await interaction.reply({
          content: "There was an error deleting the role. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "edit") {
      const role = interaction.options.getRole("role")
      const name = interaction.options.getString("name")
      const color = interaction.options.getString("color")
      const hoisted = interaction.options.getBoolean("hoisted")
      const mentionable = interaction.options.getBoolean("mentionable")

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to edit this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      // Check if at least one option is provided
      if (!name && !color && hoisted === null && mentionable === null) {
        return interaction.reply({
          content: "Please provide at least one property to edit.",
          ephemeral: true,
        })
      }

      // Validate hex color if provided
      if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          content: "Please provide a valid hex color code (e.g. #FF5555).",
          ephemeral: true,
        })
      }

      try {
        // Edit role
        const options = {}
        if (name) options.name = name
        if (color) options.color = color
        if (hoisted !== null) options.hoist = hoisted
        if (mentionable !== null) options.mentionable = mentionable

        await role.edit(options, `Edited by ${interaction.user.tag}`)

        await interaction.reply({
          content: `Role ${role} has been edited!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error editing role:", error)
        await interaction.reply({
          content: "There was an error editing the role. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "add") {
      const user = interaction.options.getUser("user")
      const role = interaction.options.getRole("role")

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to assign this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      try {
        // Get member
        const member = await interaction.guild.members.fetch(user.id)

        // Add role
        await member.roles.add(role, `Added by ${interaction.user.tag}`)

        await interaction.reply({
          content: `Added role ${role} to ${user}!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error adding role:", error)
        await interaction.reply({
          content: "There was an error adding the role. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "remove") {
      const user = interaction.options.getUser("user")
      const role = interaction.options.getRole("role")

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to remove this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      try {
        // Get member
        const member = await interaction.guild.members.fetch(user.id)

        // Check if member has the role
        if (!member.roles.cache.has(role.id)) {
          return interaction.reply({
            content: `${user} doesn't have the role ${role}.`,
            ephemeral: true,
          })
        }

        // Remove role
        await member.roles.remove(role, `Removed by ${interaction.user.tag}`)

        await interaction.reply({
          content: `Removed role ${role} from ${user}!`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error removing role:", error)
        await interaction.reply({
          content: "There was an error removing the role. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "info") {
      const role = interaction.options.getRole("role")

      // Get role information
      const createdAt = Math.floor(role.createdTimestamp / 1000)
      const hexColor = role.hexColor.toUpperCase()
      const memberCount = role.members.size

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Role: ${role.name}`)
        .setColor(role.color)
        .addFields(
          { name: "ID", value: role.id, inline: true },
          { name: "Color", value: hexColor, inline: true },
          { name: "Members", value: memberCount.toString(), inline: true },
          { name: "Position", value: role.position.toString(), inline: true },
          { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
          { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
          { name: "Created", value: `<t:${createdAt}:R>`, inline: true },
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } else if (subcommand === "list") {
      // Get all roles
      const roles = interaction.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .filter((role) => role.id !== interaction.guild.id) // Filter out @everyone

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Roles in ${interaction.guild.name}`)
        .setColor(0x5865f2)
        .setDescription(roles.map((role) => `${role} (${role.members.size} members)`).join("\n"))
        .setFooter({ text: `Total roles: ${roles.size}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    }
  },
}
