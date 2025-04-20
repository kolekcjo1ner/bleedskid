const { Events, EmbedBuilder } = require("discord.js")
const database = require("../utils/database")

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // Get guild settings from database
    const guildSettings = database.getGuild(member.guild.id)

    // Check if welcome channel is set
    if (guildSettings.welcomeChannel) {
      const channel = member.guild.channels.cache.get(guildSettings.welcomeChannel)

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("Welcome to the server!")
          .setDescription(`Welcome to **${member.guild.name}**, ${member.user}! We hope you enjoy your stay.`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `Member #${member.guild.memberCount}` })
          .setTimestamp()

        await channel.send({ embeds: [embed] })
      }
    }

    // Auto-role
    if (guildSettings.autoRole) {
      const role = member.guild.roles.cache.get(guildSettings.autoRole)

      if (role) {
        try {
          await member.roles.add(role)
        } catch (error) {
          console.error(`Failed to add auto-role to ${member.user.tag}:`, error)
        }
      }
    }
  },
}
