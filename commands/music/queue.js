const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the music queue")
    .addIntegerOption((option) => option.setName("page").setDescription("Page number of the queue").setMinValue(1)),
  async execute(interaction) {
    // Get the guild's music queue
    const queue = interaction.client.musicQueues?.get(interaction.guildId)
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({
        content: "There is nothing in the queue right now!",
        ephemeral: true,
      })
    }

    // Calculate the number of pages
    const songsPerPage = 10
    const pageCount = Math.ceil(queue.songs.length / songsPerPage)
    const page = interaction.options.getInteger("page") || 1

    // Check if the page is valid
    if (page > pageCount) {
      return interaction.reply({
        content: `Invalid page. There are only ${pageCount} pages of songs.`,
        ephemeral: true,
      })
    }

    // Get the songs for the current page
    const startIndex = (page - 1) * songsPerPage
    const endIndex = startIndex + songsPerPage
    const currentSongs = queue.songs.slice(startIndex, endIndex)

    // Create the queue embed
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Music Queue")
      .setDescription(
        currentSongs
          .map(
            (song, index) =>
              `${startIndex + index + 1}. [${song.title}](${song.url}) | \`${song.duration}\` | Requested by: ${song.requestedBy}`,
          )
          .join("\n"),
      )
      .setFooter({ text: `Page ${page} of ${pageCount} | ${queue.songs.length} songs in queue` })

    // Add the now playing field
    if (page === 1) {
      embed.addFields({
        name: "Now Playing",
        value: `[${queue.songs[0].title}](${queue.songs[0].url}) | \`${queue.songs[0].duration}\` | Requested by: ${queue.songs[0].requestedBy}`,
      })
    }

    await interaction.reply({ embeds: [embed] })
  },
}
