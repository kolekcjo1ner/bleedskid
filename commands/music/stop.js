const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop playing music and clear the queue"),
  async execute(interaction) {
    // Check if the user is in a voice channel
    const voiceChannel = interaction.member.voice.channel
    if (!voiceChannel) {
      return interaction.reply({
        content: "You need to be in a voice channel to use this command!",
        ephemeral: true,
      })
    }

    // Get the guild's music queue
    const queue = interaction.client.musicQueues?.get(interaction.guildId)
    if (!queue) {
      return interaction.reply({
        content: "There is nothing playing right now!",
        ephemeral: true,
      })
    }

    // Check if the user is in the same voice channel as the bot
    if (voiceChannel.id !== queue.voiceChannel.id) {
      return interaction.reply({
        content: "You need to be in the same voice channel as the bot to use this command!",
        ephemeral: true,
      })
    }

    // Clear the queue and stop playing
    queue.songs = []
    queue.player.stop()
    queue.connection.destroy()
    interaction.client.musicQueues.delete(interaction.guildId)

    await interaction.reply("⏹️ Stopped the music and cleared the queue.")
  },
}
