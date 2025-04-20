const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption((option) => option.setName("user").setDescription("The user to warn").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the warning").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const user = interaction.options.getUser("user")
    const reason = interaction.options.getString("reason") || "No reason provided"

    // Get guild settings
    const guildSettings = database.getGuild(interaction.guild.id)

    // Create embed for warning
    const warnEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("Warning")
      .setDescription(`${user} has been warned.`)
      .addFields({ name: "Reason", value: reason }, { name: "Warned by", value: `${interaction.user}` })
      .setTimestamp()

    // Send warning to user
    try {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle(`You have been warned in ${interaction.guild.name}`)
            .setDescription(`Reason: ${reason}`)
            .setTimestamp(),
        ],
      })
    } catch (error) {
      console.error(`Could not DM user ${user.tag}:`, error)
    }

    // Reply to interaction
    await interaction.reply({ embeds: [warnEmbed] })

    // Log warning to mod log channel if set
    if (guildSettings.modLogChannel) {
      const logChannel = interaction.guild.channels.cache.get(guildSettings.modLogChannel)

      if (logChannel) {
        await logChannel.send({ embeds: [warnEmbed] })
      }
    }
  },
}
