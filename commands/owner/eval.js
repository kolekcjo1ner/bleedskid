const { SlashCommandBuilder } = require("discord.js")
const { inspect } = require("node:util")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluates JavaScript code")
    .addStringOption((option) => option.setName("code").setDescription("The code to evaluate").setRequired(true)),
  async execute(interaction) {
    // Check if the user is the bot owner
    const ownerId = "YOUR_DISCORD_ID" // Replace with your Discord ID
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "This command can only be used by the bot owner.",
        ephemeral: true,
      })
    }

    const code = interaction.options.getString("code")

    try {
      // Evaluate the code
      const evaled = eval(code)
      const result = inspect(evaled, { depth: 0 })

      // Format the result
      const formattedResult = result.length > 1900 ? result.substring(0, 1900) + "... (output truncated)" : result

      await interaction.reply({
        content: `\`\`\`js\n${formattedResult}\n\`\`\``,
        ephemeral: true,
      })
    } catch (error) {
      await interaction.reply({
        content: `Error: \`\`\`js\n${error}\n\`\`\``,
        ephemeral: true,
      })
    }
  },
}
