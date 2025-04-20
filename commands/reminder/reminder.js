const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")
const ms = require("ms")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Set and manage reminders")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set a new reminder")
        .addStringOption((option) =>
          option.setName("time").setDescription("When to remind you (e.g. 1h, 30m, 1d)").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("message").setDescription("What to remind you about").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List your active reminders"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cancel")
        .setDescription("Cancel a reminder")
        .addIntegerOption((option) =>
          option.setName("id").setDescription("The ID of the reminder to cancel").setRequired(true),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize user reminders in database if they don't exist
    const userData = database.getUser(interaction.user.id)
    if (!userData.reminders) {
      userData.reminders = []
    }

    if (subcommand === "set") {
      const timeString = interaction.options.getString("time")
      const message = interaction.options.getString("message")

      // Parse time
      let duration
      try {
        duration = ms(timeString)
        if (!duration || duration < 1000 || duration > 2592000000) {
          // Between 1 second and 30 days
          return interaction.reply({
            content: "Please provide a valid time between 1 second and 30 days.",
            ephemeral: true,
          })
        }
      } catch (error) {
        return interaction.reply({
          content: "Invalid time format. Please use formats like 1d, 12h, 30m, etc.",
          ephemeral: true,
        })
      }

      const now = Date.now()
      const endTime = now + duration

      // Create reminder
      const reminder = {
        id: userData.reminders.length > 0 ? Math.max(...userData.reminders.map((r) => r.id)) + 1 : 1,
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        message,
        createdAt: now,
        endTime,
        completed: false,
      }

      // Add reminder to database
      userData.reminders.push(reminder)
      database.save()

      // Schedule reminder
      setTimeout(() => {
        sendReminder(interaction.client, reminder)
      }, duration)

      // Format time for display
      const endTimeFormatted = Math.floor(endTime / 1000)

      await interaction.reply({
        content: `✅ I'll remind you about "${message}" <t:${endTimeFormatted}:R>.`,
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      // Get active reminders
      const activeReminders = userData.reminders.filter((r) => !r.completed)

      if (activeReminders.length === 0) {
        return interaction.reply({
          content: "You don't have any active reminders.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Your Reminders")
        .setColor(0x5865f2)
        .setDescription(
          activeReminders
            .map((r) => `**ID: ${r.id}** • <t:${Math.floor(r.endTime / 1000)}:R>\n` + `"${r.message}"`)
            .join("\n\n"),
        )
        .setFooter({ text: `Total active reminders: ${activeReminders.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else if (subcommand === "cancel") {
      const id = interaction.options.getInteger("id")

      // Find the reminder
      const reminderIndex = userData.reminders.findIndex((r) => r.id === id && !r.completed)
      if (reminderIndex === -1) {
        return interaction.reply({
          content: "Could not find an active reminder with that ID.",
          ephemeral: true,
        })
      }

      // Mark reminder as completed
      userData.reminders[reminderIndex].completed = true
      database.save()

      await interaction.reply({
        content: `✅ Reminder #${id} has been cancelled.`,
        ephemeral: true,
      })
    }
  },
}

// Function to send a reminder
async function sendReminder(client, reminder) {
  // Get user data
  const userData = database.getUser(reminder.userId)

  // Find the reminder in the database
  const reminderIndex = userData.reminders.findIndex((r) => r.id === reminder.id && !r.completed)
  if (reminderIndex === -1) return // Reminder was cancelled

  // Mark reminder as completed
  userData.reminders[reminderIndex].completed = true
  database.save()

  try {
    // Try to send in the original channel
    const guild = await client.guilds.fetch(reminder.guildId).catch(() => null)
    if (!guild) return

    const channel = await guild.channels.fetch(reminder.channelId).catch(() => null)
    if (channel) {
      await channel.send({
        content: `<@${reminder.userId}> ⏰ Reminder: ${reminder.message}`,
      })
      return
    }

    // If channel not found, try to DM the user
    const user = await client.users.fetch(reminder.userId).catch(() => null)
    if (user) {
      await user.send({
        content: `⏰ Reminder: ${reminder.message}`,
      })
    }
  } catch (error) {
    console.error("Error sending reminder:", error)
  }
}
