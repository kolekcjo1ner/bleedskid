const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Displays information about the server"),
  async execute(interaction) {
    const { guild } = interaction

    // Get verification level
    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High",
    }

    // Get boost level
    const boostLevel = guild.premiumTier ? `Level ${guild.premiumTier}` : "None"

    // Count channels by type
    const channels = guild.channels.cache
    const textChannels = channels.filter((c) => c.type === 0).size
    const voiceChannels = channels.filter((c) => c.type === 2).size
    const categoryChannels = channels.filter((c) => c.type === 4).size

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "Verification Level", value: verificationLevels[guild.verificationLevel], inline: true },
        { name: "Boost Level", value: boostLevel, inline: true },
        { name: "Boost Count", value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
        { name: "Member Count", value: `${guild.memberCount}`, inline: true },
        {
          name: "Channels",
          value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`,
          inline: true,
        },
        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
        { name: "Emojis", value: `${guild.emojis.cache.size}`, inline: true },
      )
      .setFooter({ text: `Server ID: ${guild.id}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
