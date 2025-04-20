const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
  async execute(interaction) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails"

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("Coin Flip")
      .setDescription(`The coin landed on: **${result}**!`)
      .setThumbnail(result === "Heads" ? "https://i.imgur.com/HAvGDfl.png" : "https://i.imgur.com/uIBYGJD.png")
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
