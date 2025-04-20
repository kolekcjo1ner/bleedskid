const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay another user")
    .addUserOption((option) => option.setName("user").setDescription("The user to pay").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("amount").setDescription("The amount to pay").setRequired(true).setMinValue(1),
    ),
  async execute(interaction) {
    const sender = interaction.user
    const recipient = interaction.options.getUser("user")
    const amount = interaction.options.getInteger("amount")

    // Check if the user is trying to pay themselves
    if (sender.id === recipient.id) {
      return interaction.reply({
        content: "You can't pay yourself!",
        ephemeral: true,
      })
    }

    // Check if the user is trying to pay a bot
    if (recipient.bot) {
      return interaction.reply({
        content: "You can't pay a bot!",
        ephemeral: true,
      })
    }

    // Get user data
    const senderData = database.getUser(sender.id)
    const recipientData = database.getUser(recipient.id)

    // Check if the sender has enough money
    if (senderData.economy.balance < amount) {
      return interaction.reply({
        content: `You don't have enough coins! You have ${senderData.economy.balance} coins.`,
        ephemeral: true,
      })
    }

    // Transfer the money
    senderData.economy.balance -= amount
    recipientData.economy.balance += amount
    database.save()

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("Payment Successful")
      .setDescription(`${sender} has paid ${recipient} **${amount} coins**!`)
      .addFields(
        {
          name: `${sender.username}'s New Balance`,
          value: `💰 ${senderData.economy.balance.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: `${recipient.username}'s New Balance`,
          value: `💰 ${recipientData.economy.balance.toLocaleString()} coins`,
          inline: true,
        },
      )
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
