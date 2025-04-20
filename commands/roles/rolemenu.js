const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolemenu")
    .setDescription("Create and manage role selection menus")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new role menu")
        .addStringOption((option) => option.setName("title").setDescription("The title of the menu").setRequired(true))
        .addStringOption((option) =>
          option.setName("description").setDescription("The description of the menu").setRequired(true),
        )
        .addChannelOption((option) =>
          option.setName("channel").setDescription("The channel to send the menu to").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role1").setDescription("First role to add").setRequired(true))
        .addStringOption((option) =>
          option.setName("description1").setDescription("Description for the first role").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role2").setDescription("Second role to add").setRequired(false))
        .addStringOption((option) =>
          option.setName("description2").setDescription("Description for the second role").setRequired(false),
        )
        .addRoleOption((option) => option.setName("role3").setDescription("Third role to add").setRequired(false))
        .addStringOption((option) =>
          option.setName("description3").setDescription("Description for the third role").setRequired(false),
        )
        .addRoleOption((option) => option.setName("role4").setDescription("Fourth role to add").setRequired(false))
        .addStringOption((option) =>
          option.setName("description4").setDescription("Description for the fourth role").setRequired(false),
        )
        .addRoleOption((option) => option.setName("role5").setDescription("Fifth role to add").setRequired(false))
        .addStringOption((option) =>
          option.setName("description5").setDescription("Description for the fifth role").setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("multiple").setDescription("Allow users to select multiple roles").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a role to an existing menu")
        .addStringOption((option) =>
          option.setName("menu_id").setDescription("The ID of the menu to edit").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role").setDescription("The role to add").setRequired(true))
        .addStringOption((option) =>
          option.setName("description").setDescription("Description for the role").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from an existing menu")
        .addStringOption((option) =>
          option.setName("menu_id").setDescription("The ID of the menu to edit").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role").setDescription("The role to remove").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a role menu")
        .addStringOption((option) =>
          option.setName("menu_id").setDescription("The ID of the menu to delete").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all role menus")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize role menus in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.roleMenus) {
      guildSettings.roleMenus = []
    }

    if (subcommand === "create") {
      const title = interaction.options.getString("title")
      const description = interaction.options.getString("description")
      const channel = interaction.options.getChannel("channel")
      const allowMultiple = interaction.options.getBoolean("multiple") || false

      // Collect roles and descriptions
      const roles = []
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`role${i}`)
        const roleDescription = interaction.options.getString(`description${i}`)

        if (role && roleDescription) {
          // Check if the role is manageable by the bot
          if (!role.editable) {
            return interaction.reply({
              content: `I don't have permission to assign the role ${role.name}. Make sure my role is above this role.`,
              ephemeral: true,
            })
          }

          roles.push({
            id: role.id,
            name: role.name,
            description: roleDescription,
          })
        }
      }

      // Generate a unique ID for the menu
      const menuId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

      // Create menu embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(title)
        .setDescription(description)
        .addFields(
          roles.map((role) => ({
            name: role.name,
            value: role.description,
            inline: true,
          })),
        )
        .setFooter({ text: `Menu ID: ${menuId} • ${allowMultiple ? "Multiple selection" : "Single selection"}` })
        .setTimestamp()

      // Create select menu
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`rolemenu_${menuId}`)
          .setPlaceholder("Select a role")
          .setMinValues(1)
          .setMaxValues(allowMultiple ? roles.length : 1)
          .addOptions(
            roles.map((role) => ({
              label: role.name,
              description: role.description.length > 100 ? role.description.substring(0, 97) + "..." : role.description,
              value: role.id,
            })),
          ),
      )

      // Send menu
      const message = await channel.send({
        embeds: [embed],
        components: [row],
      })

      // Store menu in database
      const menu = {
        id: menuId,
        messageId: message.id,
        channelId: channel.id,
        title,
        description,
        roles,
        allowMultiple,
        createdAt: Date.now(),
        createdBy: interaction.user.id,
      }

      guildSettings.roleMenus.push(menu)
      database.save()

      await interaction.reply({
        content: `Role menu created in ${channel}!`,
        ephemeral: true,
      })
    } else if (subcommand === "add") {
      const menuId = interaction.options.getString("menu_id")
      const role = interaction.options.getRole("role")
      const roleDescription = interaction.options.getString("description")

      // Find the menu
      const menuIndex = guildSettings.roleMenus.findIndex((m) => m.id === menuId)
      if (menuIndex === -1) {
        return interaction.reply({
          content: "Could not find a menu with that ID.",
          ephemeral: true,
        })
      }

      const menu = guildSettings.roleMenus[menuIndex]

      // Check if the role is already in the menu
      if (menu.roles.some((r) => r.id === role.id)) {
        return interaction.reply({
          content: `The role ${role.name} is already in this menu.`,
          ephemeral: true,
        })
      }

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: `I don't have permission to assign the role ${role.name}. Make sure my role is above this role.`,
          ephemeral: true,
        })
      }

      // Add role to menu
      menu.roles.push({
        id: role.id,
        name: role.name,
        description: roleDescription,
      })

      // Update the menu message
      try {
        const channel = await interaction.guild.channels.fetch(menu.channelId)
        const message = await channel.messages.fetch(menu.messageId)

        // Update embed
        const embed = EmbedBuilder.from(message.embeds[0]).addFields({
          name: role.name,
          value: roleDescription,
          inline: true,
        })

        // Update select menu
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`rolemenu_${menuId}`)
            .setPlaceholder("Select a role")
            .setMinValues(1)
            .setMaxValues(menu.allowMultiple ? menu.roles.length : 1)
            .addOptions(
              menu.roles.map((r) => ({
                label: r.name,
                description: r.description.length > 100 ? r.description.substring(0, 97) + "..." : r.description,
                value: r.id,
              })),
            ),
        )

        await message.edit({
          embeds: [embed],
          components: [row],
        })

        // Save to database
        database.save()

        await interaction.reply({
          content: `Added role ${role.name} to the menu.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating role menu:", error)
        await interaction.reply({
          content: "There was an error updating the role menu.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "remove") {
      const menuId = interaction.options.getString("menu_id")
      const role = interaction.options.getRole("role")

      // Find the menu
      const menuIndex = guildSettings.roleMenus.findIndex((m) => m.id === menuId)
      if (menuIndex === -1) {
        return interaction.reply({
          content: "Could not find a menu with that ID.",
          ephemeral: true,
        })
      }

      const menu = guildSettings.roleMenus[menuIndex]

      // Check if the role is in the menu
      const roleIndex = menu.roles.findIndex((r) => r.id === role.id)
      if (roleIndex === -1) {
        return interaction.reply({
          content: `The role ${role.name} is not in this menu.`,
          ephemeral: true,
        })
      }

      // Remove role from menu
      menu.roles.splice(roleIndex, 1)

      // Check if there are any roles left
      if (menu.roles.length === 0) {
        return interaction.reply({
          content: "Cannot remove the last role from a menu. Use `/rolemenu delete` to delete the menu instead.",
          ephemeral: true,
        })
      }

      // Update the menu message
      try {
        const channel = await interaction.guild.channels.fetch(menu.channelId)
        const message = await channel.messages.fetch(menu.messageId)

        // Update embed
        const embed = EmbedBuilder.from(message.embeds[0])
        const fields = embed.data.fields.filter((field) => field.name !== role.name)
        embed.setFields(fields)

        // Update select menu
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`rolemenu_${menuId}`)
            .setPlaceholder("Select a role")
            .setMinValues(1)
            .setMaxValues(menu.allowMultiple ? menu.roles.length : 1)
            .addOptions(
              menu.roles.map((r) => ({
                label: r.name,
                description: r.description.length > 100 ? r.description.substring(0, 97) + "..." : r.description,
                value: r.id,
              })),
            ),
        )

        await message.edit({
          embeds: [embed],
          components: [row],
        })

        // Save to database
        database.save()

        await interaction.reply({
          content: `Removed role ${role.name} from the menu.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error updating role menu:", error)
        await interaction.reply({
          content: "There was an error updating the role menu.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "delete") {
      const menuId = interaction.options.getString("menu_id")

      // Find the menu
      const menuIndex = guildSettings.roleMenus.findIndex((m) => m.id === menuId)
      if (menuIndex === -1) {
        return interaction.reply({
          content: "Could not find a menu with that ID.",
          ephemeral: true,
        })
      }

      const menu = guildSettings.roleMenus[menuIndex]

      // Delete the menu message
      try {
        const channel = await interaction.guild.channels.fetch(menu.channelId).catch(() => null)
        if (channel) {
          const message = await channel.messages.fetch(menu.messageId).catch(() => null)
          if (message) {
            await message.delete().catch(() => null)
          }
        }
      } catch (error) {
        console.error("Error deleting role menu message:", error)
      }

      // Remove from database
      guildSettings.roleMenus.splice(menuIndex, 1)
      database.save()

      await interaction.reply({
        content: "Role menu deleted successfully.",
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      // Get role menus
      const roleMenus = guildSettings.roleMenus

      if (roleMenus.length === 0) {
        return interaction.reply({
          content: "There are no role menus in this server.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Role Menus")
        .setColor(0x5865f2)
        .setDescription(
          roleMenus
            .map(
              (m, i) =>
                `**${i + 1}.** [${m.title}](https://discord.com/channels/${interaction.guild.id}/${m.channelId}/${
                  m.messageId
                })\n` + `ID: \`${m.id}\` • Roles: ${m.roles.length} • Created <t:${Math.floor(m.createdAt / 1000)}:R>`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total role menus: ${roleMenus.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}
