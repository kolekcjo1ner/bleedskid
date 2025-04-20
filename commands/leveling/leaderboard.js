const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("levels").setDescription("Show the server's level leaderboard"),
  async execute(interaction) {
    await interaction.deferReply()

    // Get all users from the database
    const users = database.data.users

    // Convert to array and sort by total XP
    const sortedUsers = Object.entries(users)
      .map(([id, data]) => ({
        id,
        level: data.xp?.level || 1,
        totalXp: data.xp?.totalXp || 0,
      }))
      .sort((a, b) => b.totalXp - a.totalXp)
      .slice(0, 10) // Get top 10

    // Fetch user data for each user
    const leaderboard = []
    for (const user of sortedUsers) {
      try {
        const fetchedUser = await interaction.client.users.fetch(user.id)
        leaderboard.push({
          username: fetchedUser.username,
          level: user.level,
          totalXp: user.totalXp,
        })
      } catch (error) {
        console.error(`Failed to fetch user ${user.id}:`, error)
        leaderboard.push({
          username: "Unknown User",
          level: user.level,
          totalXp: user.totalXp,
        })
      }
    }

    // Create the leaderboard embed
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Level Leaderboard")
      .setDescription(
        leaderboard
          .map(
            (user, index) =>
              `**${index + 1}.** ${user.username} - Level ${user.level} (${user.totalXp.toLocaleString()} XP)`,
          )
          .join("\n"),
      )
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  },
}
