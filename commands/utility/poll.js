const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll")
    .addStringOption((option) => option.setName("question").setDescription("The poll question").setRequired(true))
    .addStringOption((option) =>
      option.setName("options").setDescription("Poll options separated by | (max 10)").setRequired(false),
    ),
  async execute(interaction) {
    const question = interaction.options.getString("question")
    const optionsString = interaction.options.getString("options")

    // If no options provided, create a yes/no poll
    if (!optionsString) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📊 " + question)
        .setFooter({ text: `Poll created by ${interaction.user.tag}` })
        .setTimestamp()

      const message = await interaction.reply({ embeds: [embed], fetchReply: true })
      await message.react("👍")
      await message.react("👎")
      return
    }

    // Parse options
    const options = optionsString
      .split("|")
      .map((option) => option.trim())
      .filter(Boolean)

    // Check if there are too many options
    if (options.length > 10) {
      return interaction.reply({
        content: "You can only have up to 10 options in a poll.",
        ephemeral: true,
      })
    }

    // Create embed with options
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📊 " + question)
      .setDescription(options.map((option, index) => `${numberEmojis[index]} ${option}`).join("\n\n"))
      .setFooter({ text: `Poll created by ${interaction.user.tag}` })
      .setTimestamp()

    const message = await interaction.reply({ embeds: [embed], fetchReply: true })

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      await message.react(numberEmojis[i])
    }
  },
}

// Number emojis for poll options
const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
