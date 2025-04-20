const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("musicdashboard")
    .setDescription("Create an interactive music control dashboard")
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel to send the dashboard to (defaults to current channel)"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel

    // Create music dashboard embed
    const embed = new EmbedBuilder()
      .setColor(0xff0000) // YouTube red
      .setTitle("🎵 Music Dashboard")
      .setDescription(
        "**Currently Playing:** Nothing\n" +
          "**Duration:** 0:00 / 0:00\n" +
          "**Volume:** 50%\n\n" +
          "Use the buttons below to control music playback.\n" +
          "Queue a song with `/play`.",
      )
      .setFooter({ text: "Music dashboard | Updated just now" })
      .setTimestamp()

    // Create control buttons
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("music_previous")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⏮️"),
      new ButtonBuilder()
        .setCustomId("music_playpause")
        .setLabel("Play/Pause")
        .setStyle(ButtonStyle.Success)
        .setEmoji("⏯️"),
      new ButtonBuilder().setCustomId("music_skip").setLabel("Skip").setStyle(ButtonStyle.Primary).setEmoji("⏭️"),
      new ButtonBuilder().setCustomId("music_stop").setLabel("Stop").setStyle(ButtonStyle.Danger).setEmoji("⏹️"),
    )

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("music_volume_down")
        .setLabel("Volume -")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔉"),
      new ButtonBuilder()
        .setCustomId("music_volume_up")
        .setLabel("Volume +")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔊"),
      new ButtonBuilder().setCustomId("music_loop").setLabel("Loop").setStyle(ButtonStyle.Secondary).setEmoji("🔁"),
      new ButtonBuilder()
        .setCustomId("music_shuffle")
        .setLabel("Shuffle")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔀"),
    )

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("music_queue").setLabel("Queue").setStyle(ButtonStyle.Secondary).setEmoji("📜"),
      new ButtonBuilder().setCustomId("music_lyrics").setLabel("Lyrics").setStyle(ButtonStyle.Secondary).setEmoji("📝"),
      new ButtonBuilder()
        .setCustomId("music_nowplaying")
        .setLabel("Now Playing")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("ℹ️"),
    )

    // Send dashboard
    const message = await channel.send({
      embeds: [embed],
      components: [row1, row2, row3],
    })

    // Store dashboard message ID in client for updating
    if (!interaction.client.musicDashboards) {
      interaction.client.musicDashboards = new Map()
    }

    interaction.client.musicDashboards.set(interaction.guild.id, {
      channelId: channel.id,
      messageId: message.id,
      lastUpdated: Date.now(),
    })

    await interaction.reply({
      content: `Music dashboard created in ${channel}!`,
      ephemeral: true,
    })
  },
}
