const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily reward"),
  async execute(interaction) {
    const user = interaction.user
    const userData = database.getUser(user.id)

    // Check if the user has already claimed their daily reward
    const now = Date.now()
    const lastDaily = userData.economy.lastDaily
    const cooldown = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

    if (lastDaily && now - lastDaily < cooldown) {
      const timeLeft = cooldown - (now - lastDaily)
      const hours = Math.floor(timeLeft / (60 * 60 * 1000))
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))

      return interaction.reply({
        content: `You've already claimed your daily reward. Come back in ${hours}h ${minutes}m.`,
        ephemeral: true,
      })
    }

    // Give the user their daily reward
    const reward = Math.floor(Math.random() * 401) + 100 // Random amount between 100 and 500
    userData.economy.balance += reward
    userData.economy.lastDaily = now
    database.save()

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Daily Reward")
      .setDescription(`You've claimed your daily reward of **${reward} coins**!`)
      .addFields({ name: "New Balance", value: `💰 ${userData.economy.balance.toLocaleString()} coins` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
