const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lastfm")
    .setDescription("Set your Last.fm username")
    .addStringOption((option) => option.setName("username").setDescription("Your Last.fm username").setRequired(true)),
  async execute(interaction) {
    const username = interaction.options.getString("username")

    // Save the username to the database
    database.setLastFM(interaction.user.id, username)

    await interaction.reply(`Your Last.fm username has been set to **${username}**!`)
  },
}
