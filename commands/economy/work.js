const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("work").setDescription("Work to earn coins"),
  async execute(interaction) {
    const user = interaction.user
    const userData = database.getUser(user.id)

    // Check if the user is on cooldown
    const now = Date.now()
    const lastWork = userData.economy.lastWork || 0
    const cooldown = 30 * 60 * 1000 // 30 minutes in milliseconds

    if (lastWork && now - lastWork < cooldown) {
      const timeLeft = cooldown - (now - lastWork)
      const minutes = Math.floor(timeLeft / (60 * 1000))
      const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000)

      return interaction.reply({
        content: `You're still on cooldown. You can work again in ${minutes}m ${seconds}s.`,
        ephemeral: true,
      })
    }

    // Generate a random job and earnings
    const jobs = [
      "You worked as a programmer and fixed a critical bug",
      "You helped an old lady cross the street",
      "You delivered some packages",
      "You worked as a cashier at a local store",
      "You wrote an article for a blog",
      "You walked someone's dog",
      "You mowed your neighbor's lawn",
      "You worked as a babysitter",
      "You washed cars in your neighborhood",
      "You helped clean up the local park",
    ]

    const job = jobs[Math.floor(Math.random() * jobs.length)]
    const earnings = Math.floor(Math.random() * 201) + 50 // Random amount between 50 and 250

    // Update user data
    userData.economy.balance += earnings
    userData.economy.lastWork = now
    database.save()

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Work Completed")
      .setDescription(`${job} and earned **${earnings} coins**!`)
      .addFields({ name: "New Balance", value: `💰 ${userData.economy.balance.toLocaleString()} coins` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
