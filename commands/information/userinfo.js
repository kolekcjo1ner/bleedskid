const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user")
    .addUserOption((option) => option.setName("user").setDescription("The user to get info about").setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user
    const member = interaction.guild.members.cache.get(user.id)

    // Get user status and activity
    let status = "Offline"
    let activity = "None"

    if (member) {
      status = member.presence?.status || "Offline"
      status = {
        online: "Online",
        idle: "Idle",
        dnd: "Do Not Disturb",
        offline: "Offline",
      }[status]

      const activities = member.presence?.activities
      if (activities && activities.length > 0) {
        const act = activities[0]
        activity = `${act.type === 0 ? "Playing" : act.type === 1 ? "Streaming" : act.type === 2 ? "Listening to" : act.type === 3 ? "Watching" : "Custom"} ${act.name}`
      }
    }

    // Get roles
    const roles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guild.id)
          .map((r) => `<@&${r.id}>`)
          .join(", ") || "None"
      : "N/A"

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor || 0x5865f2)
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Nickname", value: member?.nickname || "None", inline: true },
        { name: "Status", value: status, inline: true },
        { name: "Activity", value: activity, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        {
          name: "Joined Server",
          value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "N/A",
          inline: true,
        },
        { name: "Roles", value: roles },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
