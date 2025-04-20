const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modmail")
    .setDescription("Manage the modmail system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up the modmail system")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to create modmail channels in")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory),
        )
        .addRoleOption((option) =>
          option.setName("staff_role").setDescription("The role that can see and respond to modmail").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable the modmail system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close a modmail thread")
        .addStringOption((option) =>
          option.setName("reason").setDescription("The reason for closing the thread").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reply")
        .setDescription("Reply to a modmail thread")
        .addStringOption((option) =>
          option.setName("message").setDescription("The message to send to the user").setRequired(true),
        )
        .addBooleanOption((option) =>
          option.setName("anonymous").setDescription("Send the reply anonymously").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("block")
        .setDescription("Block a user from using modmail")
        .addUserOption((option) => option.setName("user").setDescription("The user to block").setRequired(true))
        .addStringOption((option) =>
          option.setName("reason").setDescription("The reason for blocking the user").setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unblock")
        .setDescription("Unblock a user from using modmail")
        .addUserOption((option) => option.setName("user").setDescription("The user to unblock").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize modmail settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.modmail) {
      guildSettings.modmail = {
        enabled: false,
        categoryId: null,
        staffRoleId: null,
        blockedUsers: [],
        activeThreads: {},
      }
    }

    if (subcommand === "setup") {
      const category = interaction.options.getChannel("category")
      const staffRole = interaction.options.getRole("staff_role")

      // Update modmail settings
      guildSettings.modmail.enabled = true
      guildSettings.modmail.categoryId = category.id
      guildSettings.modmail.staffRoleId = staffRole.id
      database.save()

      await interaction.reply({
        content: `Modmail system has been set up! Users can now DM me to create a modmail thread.`,
        ephemeral: true,
      })
    } else if (subcommand === "disable") {
      // Disable modmail
      guildSettings.modmail.enabled = false
      database.save()

      await interaction.reply({
        content: "Modmail system has been disabled.",
        ephemeral: true,
      })
    } else if (subcommand === "close") {
      // Check if the current channel is a modmail thread
      const channelId = interaction.channel.id
      const threadData = Object.entries(guildSettings.modmail.activeThreads).find(
        ([_, data]) => data.channelId === channelId,
      )

      if (!threadData) {
        return interaction.reply({
          content: "This command can only be used in a modmail thread.",
          ephemeral: true,
        })
      }

      const [userId, thread] = threadData
      const reason = interaction.options.getString("reason") || "No reason provided."

      try {
        // Notify the user
        const user = await interaction.client.users.fetch(userId).catch(() => null)
        if (user) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245) // Red
            .setTitle("Modmail Thread Closed")
            .setDescription(`Your modmail thread has been closed by a staff member.`)
            .addFields({ name: "Reason", value: reason })
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

          await user.send({ embeds: [embed] }).catch(() => null)
        }

        // Send closing message in the channel
        const closingEmbed = new EmbedBuilder()
          .setColor(0xed4245) // Red
          .setTitle("Thread Closed")
          .setDescription(`This modmail thread has been closed by ${interaction.user}.`)
          .addFields({ name: "Reason", value: reason })
          .setTimestamp()

        await interaction.reply({ embeds: [closingEmbed] })

        // Wait a moment before deleting the channel
        setTimeout(async () => {
          try {
            await interaction.channel.delete(`Modmail closed by ${interaction.user.tag}`)
          } catch (error) {
            console.error("Error deleting modmail channel:", error)
          }

          // Remove from active threads
          delete guildSettings.modmail.activeThreads[userId]
          database.save()
        }, 5000)
      } catch (error) {
        console.error("Error closing modmail thread:", error)
        await interaction.reply({
          content: "There was an error closing this modmail thread.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "reply") {
      // Check if the current channel is a modmail thread
      const channelId = interaction.channel.id
      const threadData = Object.entries(guildSettings.modmail.activeThreads).find(
        ([_, data]) => data.channelId === channelId,
      )

      if (!threadData) {
        return interaction.reply({
          content: "This command can only be used in a modmail thread.",
          ephemeral: true,
        })
      }

      const [userId, thread] = threadData
      const message = interaction.options.getString("message")
      const anonymous = interaction.options.getBoolean("anonymous") || false

      try {
        // Send message to the user
        const user = await interaction.client.users.fetch(userId).catch(() => null)
        if (!user) {
          return interaction.reply({
            content: "Could not find the user associated with this thread.",
            ephemeral: true,
          })
        }

        const userEmbed = new EmbedBuilder()
          .setColor(0x5865f2) // Blue
          .setDescription(message)
          .setFooter({
            text: anonymous ? "Staff Team" : interaction.user.tag,
            iconURL: anonymous ? interaction.guild.iconURL() : interaction.user.displayAvatarURL(),
          })
          .setTimestamp()

        await user.send({ embeds: [userEmbed] }).catch(() => null)

        // Send confirmation in the channel
        const staffEmbed = new EmbedBuilder()
          .setColor(0x57f287) // Green
          .setAuthor({
            name: anonymous ? "Anonymous Reply" : interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setDescription(message)
          .setTimestamp()

        await interaction.reply({ embeds: [staffEmbed] })
      } catch (error) {
        console.error("Error sending modmail reply:", error)
        await interaction.reply({
          content: "There was an error sending your reply.",
          ephemeral: true,
        })
      }
    } else if (subcommand === "block") {
      const user = interaction.options.getUser("user")
      const reason = interaction.options.getString("reason") || "No reason provided."

      // Check if user is already blocked
      if (guildSettings.modmail.blockedUsers.some((u) => u.id === user.id)) {
        return interaction.reply({
          content: `${user.tag} is already blocked from using modmail.`,
          ephemeral: true,
        })
      }

      // Add user to blocked list
      guildSettings.modmail.blockedUsers.push({
        id: user.id,
        reason,
        blockedBy: interaction.user.id,
        blockedAt: Date.now(),
      })
      database.save()

      // Close any active threads from this user
      const threadData = guildSettings.modmail.activeThreads[user.id]
      if (threadData) {
        try {
          const channel = await interaction.guild.channels.fetch(threadData.channelId).catch(() => null)
          if (channel) {
            const closingEmbed = new EmbedBuilder()
              .setColor(0xed4245) // Red
              .setTitle("Thread Closed - User Blocked")
              .setDescription(
                `This modmail thread has been closed because ${user.tag} was blocked by ${interaction.user.tag}.`,
              )
              .addFields({ name: "Reason", value: reason })
              .setTimestamp()

            await channel.send({ embeds: [closingEmbed] })
            await channel.delete(`User blocked by ${interaction.user.tag}`).catch(() => null)
          }

          // Remove from active threads
          delete guildSettings.modmail.activeThreads[user.id]
          database.save()
        } catch (error) {
          console.error("Error closing modmail thread for blocked user:", error)
        }
      }

      await interaction.reply({
        content: `${user.tag} has been blocked from using modmail. Reason: ${reason}`,
        ephemeral: true,
      })
    } else if (subcommand === "unblock") {
      const user = interaction.options.getUser("user")

      // Check if user is blocked
      const blockedIndex = guildSettings.modmail.blockedUsers.findIndex((u) => u.id === user.id)
      if (blockedIndex === -1) {
        return interaction.reply({
          content: `${user.tag} is not blocked from using modmail.`,
          ephemeral: true,
        })
      }

      // Remove user from blocked list
      guildSettings.modmail.blockedUsers.splice(blockedIndex, 1)
      database.save()

      await interaction.reply({
        content: `${user.tag} has been unblocked and can now use modmail again.`,
        ephemeral: true,
      })
    }
  },
}
