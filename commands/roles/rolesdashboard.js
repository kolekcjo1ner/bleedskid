const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolesdashboard")
    .setDescription("Create an interactive role management dashboard")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel to send the dashboard to (defaults to current channel)"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel

    // Get all role menus from the database
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.roleMenus || guildSettings.roleMenus.length === 0) {
      return interaction.reply({
        content: "You don't have any role menus set up. Create some with `/rolemenu create` first.",
        ephemeral: true,
      })
    }

    // Create dashboard embed
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Role Management Dashboard")
      .setDescription(
        "Use this dashboard to manage your server's role menus and reaction roles.\n\n" +
          "**Available Role Menus:**\n" +
          guildSettings.roleMenus
            .map((menu, index) => `${index + 1}. **${menu.title}** - ${menu.roles.length} roles`)
            .join("\n"),
      )
      .setFooter({ text: "Use the buttons below to manage role menus" })
      .setTimestamp()

    // Create control buttons
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("roles_view_1")
        .setLabel("View Menu 1")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(guildSettings.roleMenus.length < 1),
      new ButtonBuilder()
        .setCustomId("roles_view_2")
        .setLabel("View Menu 2")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(guildSettings.roleMenus.length < 2),
      new ButtonBuilder()
        .setCustomId("roles_view_3")
        .setLabel("View Menu 3")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(guildSettings.roleMenus.length < 3),
    )

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("roles_create")
        .setLabel("Create Menu")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder().setCustomId("roles_edit").setLabel("Edit Menu").setStyle(ButtonStyle.Secondary).setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId("roles_delete")
        .setLabel("Delete Menu")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️"),
    )

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("roles_refresh")
        .setLabel("Refresh Dashboard")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄"),
    )

    // Send dashboard
    const message = await channel.send({
      embeds: [embed],
      components: [row1, row2, row3],
    })

    // Store dashboard message ID in client for updating
    if (!interaction.client.roleDashboards) {
      interaction.client.roleDashboards = new Map()
    }

    interaction.client.roleDashboards.set(interaction.guild.id, {
      channelId: channel.id,
      messageId: message.id,
      lastUpdated: Date.now(),
    })

    await interaction.reply({
      content: `Role management dashboard created in ${channel}!`,
      ephemeral: true,
    })
  },
}
