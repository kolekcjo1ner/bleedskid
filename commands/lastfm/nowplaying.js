const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = require("node:fetch")
const { lastfmApiKey } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Shows what you're currently listening to on Last.fm")
    .addStringOption((option) =>
      option.setName("username").setDescription("Your Last.fm username (or leave empty to use saved username)"),
    ),
  async execute(interaction) {
    await interaction.deferReply()

    // In a real implementation, you would fetch the user's saved username from a database
    let username = interaction.options.getString("username")
    if (!username) {
      // Mock implementation - in reality, you'd fetch this from a database
      username = "lastfm_user" // Default fallback
    }

    try {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${lastfmApiKey}&format=json&limit=1`,
      )

      if (!response.ok) {
        throw new Error(`Last.fm API returned ${response.status}`)
      }

      const data = await response.json()

      if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
        return interaction.editReply("No recent tracks found for this user.")
      }

      const track = data.recenttracks.track[0]
      const isNowPlaying = track["@attr"] && track["@attr"].nowplaying === "true"

      const embed = new EmbedBuilder()
        .setColor(0xd51007)
        .setAuthor({
          name: `${username}'s ${isNowPlaying ? "Now Playing" : "Last Played"} Track`,
          iconURL: "https://www.last.fm/static/images/lastfm_avatar_twitter.52a5d69a85ac.png",
        })
        .setThumbnail(
          track.image[3]["#text"] ||
            "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png",
        )
        .addFields(
          { name: "Track", value: track.name || "Unknown", inline: true },
          { name: "Artist", value: track.artist["#text"] || "Unknown", inline: true },
          { name: "Album", value: track.album["#text"] || "Unknown", inline: true },
        )
        .setTimestamp()
        .setFooter({ text: "Powered by Last.fm" })

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error(error)
      await interaction.editReply("There was an error fetching data from Last.fm. Please try again later.")
    }
  },
}
