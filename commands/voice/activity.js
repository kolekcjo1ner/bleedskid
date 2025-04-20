const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder().setName("activity").setDescription("Start a Discord activity in your voice channel"),
  async execute(interaction) {
    // Check if the user is in a voice channel
    const voiceChannel = interaction.member.voice.channel
    if (!voiceChannel) {
      return interaction.reply({
        content: "You need to be in a voice channel to use this command!",
        ephemeral: true,
      })
    }

    // Get guild settings
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.voiceMaster || !guildSettings.voiceMaster.enabled) {
      return interaction.reply({
        content: "Voice Master system is not enabled on this server.",
        ephemeral: true,
      })
    }

    // Check if the voice channel is a Voice Master channel
    const voiceChannels = guildSettings.voiceMaster.channels || {}
    if (!voiceChannels[voiceChannel.id]) {
      return interaction.reply({
        content: "This is not a Voice Master channel.",
        ephemeral: true,
      })
    }

    // Check if the user is the owner
    if (voiceChannels[voiceChannel.id].ownerId !== interaction.user.id) {
      return interaction.reply({
        content: "You are not the owner of this voice channel!",
        ephemeral: true,
      })
    }

    // Create a select menu for activities
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("activity_select")
        .setPlaceholder("Select an activity")
        .addOptions([
          {
            label: "YouTube Together",
            description: "Watch YouTube videos together",
            value: "youtube",
            emoji: "📺",
          },
          {
            label: "Poker Night",
            description: "Play Poker with friends",
            value: "poker",
            emoji: "🃏",
          },
          {
            label: "Chess in the Park",
            description: "Play Chess with friends",
            value: "chess",
            emoji: "♟️",
          },
          {
            label: "Betrayal.io",
            description: "Play Betrayal.io with friends",
            value: "betrayal",
            emoji: "🔪",
          },
          {
            label: "Fishington.io",
            description: "Play Fishington.io with friends",
            value: "fishing",
            emoji: "🎣",
          },
          {
            label: "Letter Tile",
            description: "Play Letter Tile with friends",
            value: "lettertile",
            emoji: "🔤",
          },
          {
            label: "Word Snack",
            description: "Play Word Snack with friends",
            value: "wordsnack",
            emoji: "🔠",
          },
          {
            label: "Doodle Crew",
            description: "Play Doodle Crew with friends",
            value: "doodlecrew",
            emoji: "🎨",
          },
        ]),
    )

    await interaction.reply({
      content: "Select an activity to start in your voice channel:",
      components: [row],
      ephemeral: true,
    })

    // Create a collector for the select menu
    const filter = (i) => i.customId === "activity_select" && i.user.id === interaction.user.id
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 })

    collector.on("collect", async (i) => {
      const activity = i.values[0]

      // Map of activity IDs
      const activityIds = {
        youtube: "880218394199220334",
        poker: "755827207812677713",
        chess: "832012774040141894",
        betrayal: "773336526917861400",
        fishing: "814288819477020702",
        lettertile: "879863686565621790",
        wordsnack: "879863976006127627",
        doodlecrew: "878067389634314250",
      }

      try {
        // Create the invite with the activity
        const invite = await voiceChannel.createInvite({
          targetType: 2, // Voice Channel Activity
          targetApplication: activityIds[activity],
          maxAge: 86400, // 24 hours
        })

        await i.update({
          content: `Activity created! Click the link to start: https://discord.gg/${invite.code}`,
          components: [],
        })
      } catch (error) {
        console.error("Error creating activity:", error)
        await i.update({
          content: "There was an error creating the activity. Please try again later.",
          components: [],
        })
      }
    })

    collector.on("end", async (collected, reason) => {
      if (reason === "time" && collected.size === 0) {
        await interaction.editReply({
          content: "You didn't select an activity in time. Please try again.",
          components: [],
        })
      }
    })
  },
}
