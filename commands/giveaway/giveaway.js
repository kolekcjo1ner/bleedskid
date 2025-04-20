const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")
const ms = require("ms")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create and manage giveaways")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a new giveaway")
        .addStringOption((option) =>
          option.setName("prize").setDescription("What are you giving away?").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("duration").setDescription("Duration of the giveaway (e.g. 1d, 12h, 30m)").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("Number of winners")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addChannelOption((option) => option.setName("channel").setDescription("Channel to start the giveaway in"))
        .addStringOption((option) => option.setName("description").setDescription("Description of the giveaway"))
        .addRoleOption((option) =>
          option.setName("required_role").setDescription("Role required to enter the giveaway"),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End a giveaway early")
        .addStringOption((option) =>
          option.setName("message_id").setDescription("The message ID of the giveaway").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reroll")
        .setDescription("Reroll a giveaway")
        .addStringOption((option) =>
          option.setName("message_id").setDescription("The message ID of the giveaway").setRequired(true),
        )
        .addIntegerOption((option) =>
          option.setName("winners").setDescription("Number of new winners").setMinValue(1).setMaxValue(10),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all active giveaways in this server"),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize giveaways in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.giveaways) {
      guildSettings.giveaways = []
    }

    if (subcommand === "start") {
      const prize = interaction.options.getString("prize")
      const durationString = interaction.options.getString("duration")
      const winnerCount = interaction.options.getInteger("winners")
      const channel = interaction.options.getChannel("channel") || interaction.channel
      const description = interaction.options.getString("description") || "React with 🎉 to enter!"
      const requiredRole = interaction.options.getRole("required_role")

      // Parse duration
      let duration
      try {
        duration = ms(durationString)
        if (!duration || duration < 10000) {
          return interaction.reply({
            content: "Please provide a valid duration (minimum 10 seconds).",
            ephemeral: true,
          })
        }
      } catch (error) {
        return interaction.reply({
          content: "Invalid duration format. Please use formats like 1d, 12h, 30m, etc.",
          ephemeral: true,
        })
      }

      const endTime = Date.now() + duration
      const endTimeFormatted = Math.floor(endTime / 1000)

      // Create giveaway embed
      const embed = new EmbedBuilder()
        .setTitle(`🎉 ${prize}`)
        .setDescription(
          `${description}\n\n` +
            `**Winners:** ${winnerCount}\n` +
            `**Ends:** <t:${endTimeFormatted}:R>\n` +
            (requiredRole ? `**Required Role:** <@&${requiredRole.id}>\n` : "") +
            `**Hosted by:** ${interaction.user}`,
        )
        .setColor(0x5865f2)
        .setFooter({ text: `Ends at • ${new Date(endTime).toLocaleString()}` })
        .setTimestamp()

      // Send giveaway message
      const giveawayMessage = await channel.send({
        content: "🎉 **GIVEAWAY** 🎉",
        embeds: [embed],
      })

      // Add reaction
      await giveawayMessage.react("🎉")

      // Store giveaway in database
      guildSettings.giveaways.push({
        messageId: giveawayMessage.id,
        channelId: channel.id,
        prize,
        description,
        winnerCount,
        endTime,
        hostId: interaction.user.id,
        requiredRoleId: requiredRole ? requiredRole.id : null,
        ended: false,
      })
      database.save()

      // Schedule end of giveaway
      setTimeout(() => {
        endGiveaway(interaction.client, interaction.guild.id, giveawayMessage.id)
      }, duration)

      await interaction.reply({
        content: `Giveaway for **${prize}** started in ${channel}!`,
        ephemeral: true,
      })
    } else if (subcommand === "end") {
      const messageId = interaction.options.getString("message_id")

      // Find the giveaway
      const giveawayIndex = guildSettings.giveaways.findIndex((g) => g.messageId === messageId && !g.ended)
      if (giveawayIndex === -1) {
        return interaction.reply({
          content: "Could not find an active giveaway with that message ID.",
          ephemeral: true,
        })
      }

      // End the giveaway
      await endGiveaway(interaction.client, interaction.guild.id, messageId)

      await interaction.reply({
        content: "Giveaway ended successfully!",
        ephemeral: true,
      })
    } else if (subcommand === "reroll") {
      const messageId = interaction.options.getString("message_id")
      const newWinnerCount = interaction.options.getInteger("winners")

      // Find the giveaway
      const giveaway = guildSettings.giveaways.find((g) => g.messageId === messageId)
      if (!giveaway) {
        return interaction.reply({
          content: "Could not find a giveaway with that message ID.",
          ephemeral: true,
        })
      }

      if (!giveaway.ended) {
        return interaction.reply({
          content: "That giveaway hasn't ended yet.",
          ephemeral: true,
        })
      }

      // Reroll the giveaway
      await rerollGiveaway(interaction.client, interaction.guild.id, messageId, newWinnerCount || giveaway.winnerCount)

      await interaction.reply({
        content: "Giveaway rerolled successfully!",
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      // Get active giveaways
      const activeGiveaways = guildSettings.giveaways.filter((g) => !g.ended)

      if (activeGiveaways.length === 0) {
        return interaction.reply({
          content: "There are no active giveaways in this server.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Active Giveaways")
        .setColor(0x5865f2)
        .setDescription(
          activeGiveaways
            .map(
              (g, i) =>
                `**${i + 1}.** [${g.prize}](https://discord.com/channels/${interaction.guild.id}/${g.channelId}/${
                  g.messageId
                })\n` + `Ends: <t:${Math.floor(g.endTime / 1000)}:R> • Winners: ${g.winnerCount}`,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total active giveaways: ${activeGiveaways.length}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}

// Function to end a giveaway
async function endGiveaway(client, guildId, messageId) {
  const guildSettings = database.getGuild(guildId)
  const giveawayIndex = guildSettings.giveaways.findIndex((g) => g.messageId === messageId && !g.ended)

  if (giveawayIndex === -1) return

  const giveaway = guildSettings.giveaways[giveawayIndex]
  const guild = await client.guilds.fetch(guildId)
  const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null)

  if (!channel) {
    // Channel was deleted, mark giveaway as ended
    guildSettings.giveaways[giveawayIndex].ended = true
    database.save()
    return
  }

  const message = await channel.messages.fetch(messageId).catch(() => null)
  if (!message) {
    // Message was deleted, mark giveaway as ended
    guildSettings.giveaways[giveawayIndex].ended = true
    database.save()
    return
  }

  // Get reaction users
  const reaction = message.reactions.cache.get("🎉")
  if (!reaction) {
    await message.reply("No one entered the giveaway.")
    guildSettings.giveaways[giveawayIndex].ended = true
    database.save()
    return
  }

  await reaction.users.fetch()
  let users = Array.from(reaction.users.cache.filter((u) => !u.bot).values())

  // Filter users by required role if needed
  if (giveaway.requiredRoleId) {
    const requiredRole = await guild.roles.fetch(giveaway.requiredRoleId).catch(() => null)
    if (requiredRole) {
      const members = await Promise.all(users.map((user) => guild.members.fetch(user.id).catch(() => null)))
      users = users.filter((user, index) => members[index] && members[index].roles.cache.has(requiredRole.id))
    }
  }

  // Update embed
  const embed = EmbedBuilder.from(message.embeds[0])
    .setColor(0x808080)
    .setFooter({ text: `Ended at • ${new Date().toLocaleString()}` })

  if (users.length === 0) {
    embed.setDescription(`${giveaway.description}\n\nGiveaway ended: No valid entries.`)
    await message.edit({ content: "🎉 **GIVEAWAY ENDED** 🎉", embeds: [embed] })
    await message.reply("No one with the required role entered the giveaway.")
  } else {
    // Select winners
    const winnerCount = Math.min(giveaway.winnerCount, users.length)
    const winners = []

    for (let i = 0; i < winnerCount; i++) {
      const winnerIndex = Math.floor(Math.random() * users.length)
      winners.push(users[winnerIndex])
      users.splice(winnerIndex, 1)
    }

    embed.setDescription(
      `${giveaway.description}\n\n` +
        `**Winners:** ${winners.map((w) => `<@${w.id}>`).join(", ")}\n` +
        `**Ended:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
        (giveaway.requiredRoleId ? `**Required Role:** <@&${giveaway.requiredRoleId}>\n` : "") +
        `**Hosted by:** <@${giveaway.hostId}>`,
    )

    await message.edit({ content: "🎉 **GIVEAWAY ENDED** 🎉", embeds: [embed] })
    await message.reply({
      content: `Congratulations ${winners.map((w) => `<@${w.id}>`).join(", ")}! You won **${giveaway.prize}**!`,
    })
  }

  // Mark giveaway as ended
  guildSettings.giveaways[giveawayIndex].ended = true
  guildSettings.giveaways[giveawayIndex].winners = users.map((u) => u.id)
  database.save()
}

// Function to reroll a giveaway
async function rerollGiveaway(client, guildId, messageId, winnerCount) {
  const guildSettings = database.getGuild(guildId)
  const giveaway = guildSettings.giveaways.find((g) => g.messageId === messageId && g.ended)

  if (!giveaway) return

  const guild = await client.guilds.fetch(guildId)
  const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null)

  if (!channel) return

  const message = await channel.messages.fetch(messageId).catch(() => null)
  if (!message) return

  // Get reaction users
  const reaction = message.reactions.cache.get("🎉")
  if (!reaction) {
    await message.reply("No one entered the giveaway.")
    return
  }

  await reaction.users.fetch()
  let users = Array.from(reaction.users.cache.filter((u) => !u.bot).values())

  // Filter users by required role if needed
  if (giveaway.requiredRoleId) {
    const requiredRole = await guild.roles.fetch(giveaway.requiredRoleId).catch(() => null)
    if (requiredRole) {
      const members = await Promise.all(users.map((user) => guild.members.fetch(user.id).catch(() => null)))
      users = users.filter((user, index) => members[index] && members[index].roles.cache.has(requiredRole.id))
    }
  }

  if (users.length === 0) {
    await message.reply("No one with the required role entered the giveaway.")
    return
  }

  // Select new winners
  const newWinnerCount = Math.min(winnerCount, users.length)
  const winners = []

  for (let i = 0; i < newWinnerCount; i++) {
    const winnerIndex = Math.floor(Math.random() * users.length)
    winners.push(users[winnerIndex])
    users.splice(winnerIndex, 1)
  }

  await message.reply({
    content: `Rerolled! New winners: ${winners.map((w) => `<@${w.id}>`).join(", ")}! You won **${giveaway.prize}**!`,
  })
}
