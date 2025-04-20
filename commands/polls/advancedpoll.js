const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("advancedpoll")
    .setDescription("Create an advanced poll with multiple options")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new poll")
        .addStringOption((option) => option.setName("question").setDescription("The poll question").setRequired(true))
        .addStringOption((option) =>
          option.setName("options").setDescription("Poll options separated by | (max 10)").setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the poll to (defaults to current channel)")
            .addChannelTypes(ChannelType.GuildText),
        )
        .addBooleanOption((option) =>
          option.setName("multiple").setDescription("Allow users to vote for multiple options").setRequired(false),
        )
        .addIntegerOption(
          (option) =>
            option
              .setName("duration")
              .setDescription("Duration of the poll in minutes (0 for no time limit)")
              .setMinValue(0)
              .setMaxValue(10080), // 1 week
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End a poll early")
        .addStringOption((option) =>
          option.setName("poll_id").setDescription("The ID of the poll to end").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List all active polls")),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize polls in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.polls) {
      guildSettings.polls = []
    }

    if (subcommand === "create") {
      const question = interaction.options.getString("question")
      const optionsString = interaction.options.getString("options")
      const channel = interaction.options.getChannel("channel") || interaction.channel
      const allowMultiple = interaction.options.getBoolean("multiple") || false
      const duration = interaction.options.getInteger("duration") || 0

      // Parse options
      const options = optionsString
        .split("|")
        .map((option) => option.trim())
        .filter(Boolean)

      // Check if there are too many options
      if (options.length > 10) {
        return interaction.reply({
          content: "You can only have up to 10 options in a poll.",
          ephemeral: true,
        })
      }

      // Check if there are too few options
      if (options.length < 2) {
        return interaction.reply({
          content: "You need at least 2 options for a poll.",
          ephemeral: true,
        })
      }

      // Generate a unique ID for the poll
      const pollId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)

      // Create poll embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📊 ${question}`)
        .setDescription(
          options.map((option, index) => `${index + 1}. ${option}`).join("\n\n") +
            `\n\n${allowMultiple ? "You can vote for multiple options." : "You can only vote for one option."}`,
        )
        .setFooter({
          text: `Poll ID: ${pollId} • Created by ${interaction.user.tag}${
            duration > 0 ? ` • Ends in ${formatDuration(duration * 60000)}` : ""
          }`,
        })
        .setTimestamp()

      // Create buttons for voting
      const rows = []
      let currentRow = new ActionRowBuilder()

      options.forEach((option, index) => {
        // Discord allows max 5 buttons per row
        if (index > 0 && index % 5 === 0) {
          rows.push(currentRow)
          currentRow = new ActionRowBuilder()
        }

        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_${pollId}_${index}`)
            .setLabel(`${index + 1}`)
            .setStyle(ButtonStyle.Primary),
        )
      })

      // Add the last row if it has any buttons
      if (currentRow.components.length > 0) {
        rows.push(currentRow)
      }

      // Send poll
      const message = await channel.send({
        embeds: [embed],
        components: rows,
      })

      // Store poll in database
      const poll = {
        id: pollId,
        messageId: message.id,
        channelId: channel.id,
        question,
        options,
        votes: {},
        allowMultiple,
        createdAt: Date.now(),
        createdBy: interaction.user.id,
        endsAt: duration > 0 ? Date.now() + duration * 60000 : null,
      }

      guildSettings.polls.push(poll)
      database.save()

      // Schedule end of poll if duration is set
      if (duration > 0) {
        setTimeout(() => {
          endPoll(interaction.client, interaction.guild.id, pollId)
        }, duration * 60000)
      }

      await interaction.reply({
        content: `Poll created in ${channel}!`,
        ephemeral: true,
      })
    } else if (subcommand === "end") {
      const pollId = interaction.options.getString("poll_id")

      // Find the poll
      const pollIndex = guildSettings.polls.findIndex((p) => p.id === pollId && !p.ended)
      if (pollIndex === -1) {
        return interaction.reply({
          content: "Could not find an active poll with that ID.",
          ephemeral: true,
        })
      }

      // Check if the user is the poll creator or has manage messages permission
      const poll = guildSettings.polls[pollIndex]
      if (
        poll.createdBy !== interaction.user.id &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        return interaction.reply({
          content: "You don't have permission to end this poll.",
          ephemeral: true,
        })
      }

      await interaction.deferReply({ ephemeral: true })

      // End the poll
      try {
        await endPoll(interaction.client, interaction.guild.id, pollId)
        await interaction.editReply("Poll ended successfully!")
      } catch (error) {
        console.error("Error ending poll:", error)
        await interaction.editReply("There was an error ending the poll.")
      }
    } else if (subcommand === "list") {
      // Get active polls
      const activePolls = guildSettings.polls.filter((p) => !p.ended)

      if (activePolls.length === 0) {
        return interaction.reply({
          content: "There are no active polls in this server.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Active Polls")
        .setColor(0x5865f2)
        .setDescription(
          activePolls
            .map(
              (p, i) =>
                `**${i + 1}.** [${p.question}](https://discord.com/channels/${interaction.guild.id}/${p.channelId}/${
                  p.messageId
                })\n` +
                `ID: \`${p.id}\` • Created <t:${Math.floor(p.createdAt / 1000)}:R>` +
                (p.endsAt ? ` • Ends <t:${Math.floor(p.endsAt / 1000)}:R>` : ""),
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total active polls: ${activePolls.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}

// Function to end a poll
async function endPoll(client, guildId, pollId) {
  const guildSettings = database.getGuild(guildId)
  const pollIndex = guildSettings.polls.findIndex((p) => p.id === pollId && !p.ended)

  if (pollIndex === -1) return

  const poll = guildSettings.polls[pollIndex]
  const guild = await client.guilds.fetch(guildId)
  const channel = await guild.channels.fetch(poll.channelId).catch(() => null)

  if (!channel) {
    // Channel was deleted, mark poll as ended
    guildSettings.polls[pollIndex].ended = true
    database.save()
    return
  }

  const message = await channel.messages.fetch(poll.messageId).catch(() => null)
  if (!message) {
    // Message was deleted, mark poll as ended
    guildSettings.polls[pollIndex].ended = true
    database.save()
    return
  }

  // Count votes
  const votes = poll.votes || {}
  const results = {}

  // Initialize results
  poll.options.forEach((option, index) => {
    results[index] = 0
  })

  // Count votes
  Object.values(votes).forEach((userVotes) => {
    userVotes.forEach((optionIndex) => {
      results[optionIndex] = (results[optionIndex] || 0) + 1
    })
  })

  // Find the winner(s)
  const maxVotes = Math.max(...Object.values(results), 0)
  const winners = Object.entries(results)
    .filter(([_, count]) => count === maxVotes)
    .map(([index, _]) => Number.parseInt(index))

  // Create results embed
  const embed = EmbedBuilder.from(message.embeds[0])
    .setColor(0x808080)
    .setTitle(`📊 ${poll.question} (Ended)`)
    .setDescription(
      poll.options
        .map((option, index) => {
          const count = results[index] || 0
          const percentage = Object.values(votes).length > 0 ? (count / Object.values(votes).length) * 100 : 0
          const bar = createProgressBar(percentage)
          const isWinner = winners.includes(index) && maxVotes > 0

          return `${index + 1}. ${option}\n${bar} ${count} votes (${percentage.toFixed(1)}%)${isWinner ? " 👑" : ""}`
        })
        .join("\n\n") + `\n\n**Total Votes:** ${Object.values(votes).length}`,
    )
    .setFooter({
      text: `Poll ID: ${poll.id} • Created by ${message.embeds[0].footer.text
        .split("•")[1]
        .split("•")[0]
        .trim()} • Ended`,
    })

  // Update message
  await message.edit({
    embeds: [embed],
    components: [],
  })

  // Mark poll as ended
  guildSettings.polls[pollIndex].ended = true
  guildSettings.polls[pollIndex].endedAt = Date.now()
  database.save()
}

// Function to create a progress bar
function createProgressBar(percentage) {
  const filledCount = Math.round(percentage / 10)
  const emptyCount = 10 - filledCount

  return "█".repeat(filledCount) + "░".repeat(emptyCount)
}

// Function to format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else {
    return `${minutes}m`
  }
}
