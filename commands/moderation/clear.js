const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete a specified number of messages")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Only delete messages from this user").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger("amount")
    const user = interaction.options.getUser("user")

    await interaction.deferReply({ ephemeral: true })

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 })

      let filteredMessages = messages

      // Filter by user if specified
      if (user) {
        filteredMessages = messages.filter((m) => m.author.id === user.id)
      }

      // Take only the requested amount
      filteredMessages = filteredMessages.first(amount)

      // Delete messages
      await interaction.channel.bulkDelete(filteredMessages, true)

      const deletedCount = filteredMessages.length

      await interaction.editReply({
        content: `Successfully deleted ${deletedCount} message${deletedCount !== 1 ? "s" : ""}${user ? ` from ${user.tag}` : ""}.`,
        ephemeral: true,
      })
    } catch (error) {
      console.error(error)
      await interaction.editReply({
        content: "There was an error trying to delete messages. Messages older than 14 days cannot be bulk deleted.",
        ephemeral: true,
      })
    }
  },
}
