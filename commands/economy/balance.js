const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your or another user's balance")
    .addUserOption((option) => option.setName("user").setDescription("The user to check the balance of")),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user
    const userData = database.getUser(user.id)

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`${user.username}'s Balance`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields({ name: "Wallet", value: `💰 ${userData.economy.balance.toLocaleString()} coins` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
