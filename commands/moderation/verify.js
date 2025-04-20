const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Manage the verification system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the verification system")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the verification message to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("The role to give to verified users").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("title").setDescription("The title of the verification message").setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("The description of the verification message")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("The type of verification to use")
            .setRequired(false)
            .addChoices(
              { name: "Button", value: "button" },
              { name: "Reaction", value: "reaction" },
              { name: "Captcha", value: "captcha" },
              { name: "Question", value: "question" },
            ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable the verification system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("question")
        .setDescription("Set the verification question and answer")
        .addStringOption((option) =>
          option.setName("question").setDescription("The question to ask users").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("answer").setDescription("The answer to the question").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("manual")
        .setDescription("Manually verify a user")
        .addUserOption((option) => option.setName("user").setDescription("The user to verify").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize verification settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.verification) {
      guildSettings.verification = {
        enabled: false,
        channelId: null,
        roleId: null,
        type: "button",
        title: "Verification Required",
        description: "Please verify yourself to access the server.",
        question: null,
        answer: null,
        messageId: null,
      }
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel")
      const role = interaction.options.getRole("role")
      const title = interaction.options.getString("title") || "Verification Required"
      const description = interaction.options.getString("description") || "Please verify yourself to access the server."
      const type = interaction.options.getString("type") || "button"

      // Check if the role is manageable by the bot
      if (!role.editable) {
        return interaction.reply({
          content: "I don't have permission to assign this role. Make sure my role is above the target role.",
          ephemeral: true,
        })
      }

      // Create verification embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Create verification button/reaction based on type
      let components = []
      if (type === "button") {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("verify_button")
            .setLabel("Verify")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅"),
        )
        components = [row]
      }

      // Send verification message
      const message = await channel.send({
        embeds: [embed],
        components,
      })

      // If using reaction verification, add reaction
      if (type === "reaction") {
        await message.react("✅")
      }

      // Update verification settings
      guildSettings.verification.enabled = true
      guildSettings.verification.channelId = channel.id
      guildSettings.verification.roleId = role.id
      guildSettings.verification.type = type
      guildSettings.verification.title = title
      guildSettings.verification.description = description
      guildSettings.verification.messageId = message.id
      database.save()

      await interaction.reply({
        content: `Verification system has been set up in ${channel}!`,
        ephemeral: true,
      })
    } else if (subcommand === "disable") {
      if (!guildSettings.verification.enabled) {
        return interaction.reply({
          content: "Verification system is not enabled.",
          ephemeral: true,
        })
      }

      // Try to delete the verification message
      try {
        const channel = await interaction.guild.channels.fetch(guildSettings.verification.channelId).catch(() => null)
        if (channel) {
          const message = await channel.messages.fetch(guildSettings.verification.messageId).catch(() => null)
          if (message) {
            await message.delete().catch(() => null)
          }
        }
      } catch (error) {
        console.error("Error deleting verification message:", error)
      }

      // Disable verification
      guildSettings.verification.enabled = false
      database.save()

      await interaction.reply({
        content: "Verification system has been disabled.",
        ephemeral: true,
      })
    } else if (subcommand === "question") {
      if (!guildSettings.verification.enabled) {
        return interaction.reply({
          content: "Verification system is not enabled. Please set it up first with `/verify setup`.",
          ephemeral: true,
        })
      }

      const question = interaction.options.getString("question")
      const answer = interaction.options.getString("answer")

      // Update verification settings
      guildSettings.verification.question = question
      guildSettings.verification.answer = answer.toLowerCase() // Store answer in lowercase for case-insensitive comparison
      guildSettings.verification.type = "question" // Change type to question
      database.save()

      // Update verification message if it exists
      try {
        const channel = await interaction.guild.channels.fetch(guildSettings.verification.channelId).catch(() => null)
        if (channel) {
          const message = await channel.messages.fetch(guildSettings.verification.messageId).catch(() => null)
          if (message) {
            const embed = EmbedBuilder.from(message.embeds[0])
            embed.setDescription(
              `${guildSettings.verification.description}\n\n**Question:** ${question}\n\nClick the button below to answer.`,
            )

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("verify_question")
                .setLabel("Answer Question")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✅"),
            )

            await message.edit({
              embeds: [embed],
              components: [row],
            })
          }
        }
      } catch (error) {
        console.error("Error updating verification message:", error)
      }

      await interaction.reply({
        content: "Verification question and answer have been set!",
        ephemeral: true,
      })
    } else if (subcommand === "manual") {
      if (!guildSettings.verification.enabled) {
        return interaction.reply({
          content: "Verification system is not enabled. Please set it up first with `/verify setup`.",
          ephemeral: true,
        })
      }

      const user = interaction.options.getUser("user")
      const member = await interaction.guild.members.fetch(user.id).catch(() => null)

      if (!member) {
        return interaction.reply({
          content: "Could not find that user in this server.",
          ephemeral: true,
        })
      }

      // Get verification role
      const role = await interaction.guild.roles.fetch(guildSettings.verification.roleId).catch(() => null)
      if (!role) {
        return interaction.reply({
          content: "The verification role could not be found. Please set up verification again.",
          ephemeral: true,
        })
      }

      try {
        // Add role to user
        await member.roles.add(role, `Manually verified by ${interaction.user.tag}`)

        await interaction.reply({
          content: `${user} has been manually verified and given the ${role} role.`,
          ephemeral: true,
        })
      } catch (error) {
        console.error("Error manually verifying user:", error)
        await interaction.reply({
          content: "There was an error verifying the user. Make sure I have the necessary permissions.",
          ephemeral: true,
        })
      }
    }
  },
}
