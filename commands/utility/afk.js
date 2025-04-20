const { SlashCommandBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status")
    .addStringOption((option) => option.setName("reason").setDescription("The reason you're AFK").setRequired(false)),
  async execute(interaction) {
    const reason = interaction.options.getString("reason") || "AFK"
    const user = interaction.user
    const userData = database.getUser(user.id)

    // Set AFK status
    userData.afk = {
      status: true,
      reason,
      since: Date.now(),
    }
    database.save()

    // Try to set nickname with [AFK] prefix if possible
    try {
      const member = interaction.guild.members.cache.get(user.id)
      if (member && member.manageable && !member.nickname?.startsWith("[AFK]")) {
        const newNick = `[AFK] ${member.nickname || member.user.username}`
        if (newNick.length <= 32) {
          // Discord nickname limit
          await member.setNickname(newNick)
        }
      }
    } catch (error) {
      console.error("Error setting AFK nickname:", error)
    }

    await interaction.reply(`I've set your status to AFK: ${reason}`)
  },
}
