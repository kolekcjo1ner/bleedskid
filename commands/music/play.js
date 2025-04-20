const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice")
const play = require("play-dl")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube")
    .addStringOption((option) =>
      option.setName("query").setDescription("The song title or YouTube URL").setRequired(true),
    ),
  async execute(interaction) {
    // Check if the user is in a voice channel
    const voiceChannel = interaction.member.voice.channel
    if (!voiceChannel) {
      return interaction.reply({
        content: "You need to be in a voice channel to use this command!",
        ephemeral: true,
      })
    }

    await interaction.deferReply()

    // Get the song query
    const query = interaction.options.getString("query")

    try {
      // Search for the song
      let songInfo
      let url = query

      // Check if the query is a YouTube URL
      if (!query.startsWith("https://")) {
        const searchResults = await play.search(query, { limit: 1 })
        if (!searchResults || searchResults.length === 0) {
          return interaction.editReply("No results found for your query.")
        }
        songInfo = searchResults[0]
        url = songInfo.url
      } else {
        // It's a URL, validate it
        const validateURL = await play.validate(url)
        if (validateURL !== "yt_video") {
          return interaction.editReply("Please provide a valid YouTube video URL.")
        }
        songInfo = await play.video_info(url)
        songInfo = songInfo.video_details
      }

      // Get the guild's music queue
      if (!interaction.client.musicQueues) {
        interaction.client.musicQueues = new Map()
      }

      let queue = interaction.client.musicQueues.get(interaction.guildId)

      // If there's no queue, create one
      if (!queue) {
        queue = {
          voiceChannel,
          textChannel: interaction.channel,
          connection: null,
          player: createAudioPlayer(),
          songs: [],
          volume: 50,
          playing: false,
        }
        interaction.client.musicQueues.set(interaction.guildId, queue)
      }

      // Add the song to the queue
      const song = {
        title: songInfo.title || "Unknown Title",
        url: songInfo.url,
        thumbnail: songInfo.thumbnails ? songInfo.thumbnails[0].url : null,
        duration: songInfo.durationRaw || "Unknown",
        requestedBy: interaction.user.tag,
      }

      queue.songs.push(song)

      // Create an embed for the song
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Added to Queue")
        .setDescription(`[${song.title}](${song.url})`)
        .setThumbnail(song.thumbnail)
        .addFields(
          { name: "Duration", value: song.duration, inline: true },
          { name: "Requested By", value: song.requestedBy, inline: true },
          {
            name: "Position in Queue",
            value: queue.songs.length > 1 ? `${queue.songs.length - 1}` : "Now Playing",
            inline: true,
          },
        )

      // If the bot isn't already playing, start playing
      if (!queue.playing) {
        try {
          // Join the voice channel
          queue.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          })

          // Start playing
          await playSong(interaction.client, interaction.guildId)
          queue.playing = true
        } catch (error) {
          console.error(error)
          interaction.client.musicQueues.delete(interaction.guildId)
          return interaction.editReply("There was an error joining the voice channel.")
        }
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error(error)
      await interaction.editReply("There was an error playing this song.")
    }
  },
}

// Function to play a song
async function playSong(client, guildId) {
  const queue = client.musicQueues.get(guildId)
  if (!queue || queue.songs.length === 0) {
    // If there are no songs left, leave the voice channel
    if (queue && queue.connection) {
      queue.connection.destroy()
    }
    client.musicQueues.delete(guildId)
    return
  }

  try {
    // Get the first song in the queue
    const song = queue.songs[0]

    // Create a stream from the song
    const stream = await play.stream(song.url)
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    })

    // Play the song
    queue.player.play(resource)
    queue.connection.subscribe(queue.player)

    // Send a now playing message
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Now Playing")
      .setDescription(`[${song.title}](${song.url})`)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: "Duration", value: song.duration, inline: true },
        { name: "Requested By", value: song.requestedBy, inline: true },
      )

    await queue.textChannel.send({ embeds: [embed] })

    // When the song ends, play the next song
    queue.player.on(AudioPlayerStatus.Idle, () => {
      queue.songs.shift()
      playSong(client, guildId)
    })
  } catch (error) {
    console.error(error)
    queue.textChannel.send("There was an error playing this song.")
    queue.songs.shift()
    playSong(client, guildId)
  }
}
