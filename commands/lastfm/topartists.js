const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = require("node:fetch")
const { lastfmApiKey } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("topartists")
    .setDescription("Shows your top artists on Last.fm")
    .addStringOption((option) =>
      option.setName("username").setDescription("Your Last.fm username (or leave empty to use saved username)"),
    )
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Time period")
        .addChoices(
          { name: "7 days", value: "7day" },
          { name: "1 month", value: "1month" },
          { name: "3 months", value: "3month" },
          { name: "6 months", value: "6month" },
          { name: "12 months", value: "12month" },
          { name: "Overall", value: "overall" },
        )
        .setRequired(false),
    ),
  async execute(interaction) {
    await interaction.deferReply()

    // In a real implementation, you would fetch the user's saved username from a database
    let username = interaction.options.getString("username")
    if (!username) {
      // Mock implementation - in reality, you'd fetch this from a database
      username = "lastfm_user" // Default fallback
    }

    const period = interaction.options.getString("period") || "7day"
    const periodNames = {
      "7day": "Last 7 Days",
      "1month": "Last Month",
      "3month": "Last 3 Months",
      "6month": "Last 6 Months",
      "12month": "Last 12 Months",
      overall: "All Time",
    }

    try {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=${period}&api_key=${lastfmApiKey}&format=json&limit=10`,
      )

      if (!response.ok) {
        throw new Error(`Last.fm API returned ${response.status}`)
      }

      const data = await response.json()

      if (!data.topartists || !data.topartists.artist || data.topartists.artist.length === 0) {
        return interaction.editReply("No top artists found for this user in the selected time period.")
      }

      const artists = data.topartists.artist
        .map((artist, index) => `**${index + 1}.** ${artist.name} (${artist.playcount} plays)`)
        .join("\n")

      const embed = new EmbedBuilder()
        .setColor(0xd51007)
        .setAuthor({
          name: `${username}'s Top Artists - ${periodNames[period]}`,
          iconURL: "https://www.last.fm/static/images/lastfm_avatar_twitter.52a5d69a85ac.png",
        })
        .setDescription(artists)
        .setTimestamp()
        .setFooter({ text: "Powered by Last.fm" })

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error(error)
      await interaction.editReply("There was an error fetching data from Last.fm. Please try again later.")
    }
  },
}
