const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Set up reaction roles")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new reaction role message")
        .addStringOption((option) =>
          option.setName("title").setDescription("The title of the reaction role message").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("The description of the reaction role message")
            .setRequired(true),
        )
        .addRoleOption((option) => option.setName("role1").setDescription("The first role to add").setRequired(true))
        .addStringOption((option) =>
          option.setName("emoji1").setDescription("The emoji for the first role").setRequired(true),
        )
        .addRoleOption((option) => option.setName("role2").setDescription("The second role to add").setRequired(false))
        .addStringOption((option) =>
          option.setName("emoji2").setDescription("The emoji for the second role").setRequired(false),
        )
        .addRoleOption((option) => option.setName("role3").setDescription("The third role to add").setRequired(false))
        .addStringOption((option) =>
          option.setName("emoji3").setDescription("The emoji for the third role").setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const title = interaction.options.getString("title")
    const description = interaction.options.getString("description")

    // Get roles and emojis
    const roles = []
    const emojis = []

    for (let i = 1; i <= 3; i++) {
      const role = interaction.options.getRole(`role${i}`)
      const emoji = interaction.options.getString(`emoji${i}`)

      if (role && emoji) {
        // Check if the role is manageable by the bot
        if (!role.editable) {
          return interaction.editReply({
            content: `I don't have permission to assign the role ${role.name}. Make sure my role is above this role.`,
          })
        }

        roles.push(role)
        emojis.push(emoji)
      }
    }

    // Create the embed
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setDescription(description)
      .addFields(
        roles.map((role, index) => ({
          name: `${emojis[index]} ${role.name}`,
          value: `Click the button below to get the ${role.name} role.`,
        })),
      )
      .setFooter({ text: "Click the buttons below to get or remove a role" })

    // Create the buttons
    const row = new ActionRowBuilder()
    roles.forEach((role, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`role_${role.id}`)
          .setLabel(role.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(emojis[index]),
      )
    })

    // Send the message
    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row],
    })

    // Save the reaction role message to the database
    if (!database.data.reactionRoles) {
      database.data.reactionRoles = {}
    }

    database.data.reactionRoles[message.id] = roles.map((role, index) => ({
      roleId: role.id,
      emoji: emojis[index],
    }))

    database.save()

    await interaction.editReply("Reaction role message created successfully!")
  },
}
