const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
  async execute(interaction) {
    const sent = await interaction.reply({ content: "Pinging...", fetchReply: true })
    const ping = sent.createdTimestamp - interaction.createdTimestamp

    await interaction.editReply(
      `Pong! Latency is ${ping}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms`,
    )
  },
}
