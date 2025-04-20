const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fs = require("node:fs")
const path = require("node:path")

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Shows all available commands"),
  async execute(interaction) {
    const commandFolders = fs
      .readdirSync(path.join(__dirname, ".."))
      .filter((folder) => fs.statSync(path.join(__dirname, "..", folder)).isDirectory())

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Help Menu")
      .setDescription("Here are all the available commands:")
      .setTimestamp()

    for (const folder of commandFolders) {
      const commandFiles = fs.readdirSync(path.join(__dirname, "..", folder)).filter((file) => file.endsWith(".js"))

      const commands = []
      for (const file of commandFiles) {
        const command = require(path.join(__dirname, "..", folder, file))
        commands.push(`\`/${command.data.name}\` - ${command.data.description}`)
      }

      if (commands.length > 0) {
        embed.addFields({ name: folder.toUpperCase(), value: commands.join("\n") })
      }
    }

    await interaction.reply({ embeds: [embed] })
  },
}
