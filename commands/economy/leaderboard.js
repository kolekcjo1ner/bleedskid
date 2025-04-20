const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("leaderboard").setDescription("Show the economy leaderboard"),
  async execute(interaction) {
    await interaction.deferReply()

    // Get all users from the database
    const users = database.data.users

    // Convert to array and sort by balance
    const sortedUsers = Object.entries(users)
      .map(([id, data]) => ({
        id,
        balance: data.economy?.balance || 0,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10) // Get top 10

    // Fetch user data for each user
    const leaderboard = []
    for (const user of sortedUsers) {
      try {
        const fetchedUser = await interaction.client.users.fetch(user.id)
        leaderboard.push({
          username: fetchedUser.username,
          balance: user.balance,
        })
      } catch (error) {
        console.error(`Failed to fetch user ${user.id}:`, error)
        leaderboard.push({
          username: "Unknown User",
          balance: user.balance,
        })
      }
    }

    // Create the leaderboard embed
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Economy Leaderboard")
      .setDescription(
        leaderboard
          .map((user, index) => `**${index + 1}.** ${user.username} - 💰 ${user.balance.toLocaleString()} coins`)
          .join("\n"),
      )
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  },
}
