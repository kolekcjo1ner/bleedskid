const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = require("node:fetch")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("urban")
    .setDescription("Look up a word on Urban Dictionary")
    .addStringOption((option) => option.setName("term").setDescription("The term to look up").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply()

    const term = interaction.options.getString("term")

    try {
      // In a real implementation, you would use the Urban Dictionary API
      // For this example, we'll use a mock implementation
      const result = await mockUrbanDictionary(term)

      if (!result || result.list.length === 0) {
        return interaction.editReply(`No results found for "${term}".`)
      }

      const definition = result.list[0]

      // Clean up text (remove square brackets)
      const cleanDefinition = definition.definition.replace(/\[|\]/g, "")
      const cleanExample = definition.example.replace(/\[|\]/g, "")

      // Truncate text if too long
      const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength - 3) + "..."
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x134fe6)
        .setTitle(`Urban Dictionary: ${definition.word}`)
        .setURL(definition.permalink)
        .setDescription(truncateText(cleanDefinition, 2048))
        .addFields(
          { name: "Example", value: truncateText(cleanExample || "No example provided", 1024) },
          {
            name: "Rating",
            value: `👍 ${definition.thumbs_up} | 👎 ${definition.thumbs_down}`,
            inline: true,
          },
        )
        .setFooter({ text: `Definition by ${definition.author}` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error("Urban Dictionary error:", error)
      await interaction.editReply("There was an error fetching the definition. Please try again later.")
    }
  },
}

// Mock Urban Dictionary API function
async function mockUrbanDictionary(term) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock definitions for common terms
  const mockDefinitions = {
    lol: {
      list: [
        {
          word: "lol",
          definition: "Laugh out loud, an expression of amusement or mockery.",
          example: "That joke was so funny, [lol]!",
          permalink: "https://www.urbandictionary.com/define.php?term=lol",
          thumbs_up: 10245,
          thumbs_down: 1234,
          author: "InternetUser123",
        },
      ],
    },
    yeet: {
      list: [
        {
          word: "yeet",
          definition:
            "To discard an item at a high velocity. Can also be used as an exclamation while throwing something.",
          example: "I [yeeted] that empty bottle across the room into the recycling bin.",
          permalink: "https://www.urbandictionary.com/define.php?term=yeet",
          thumbs_up: 8765,
          thumbs_down: 987,
          author: "YeetMaster2000",
        },
      ],
    },
    sus: {
      list: [
        {
          word: "sus",
          definition: "Suspicious, suspect. When someone is acting shady.",
          example: "You're acting kinda [sus] right now.",
          permalink: "https://www.urbandictionary.com/define.php?term=sus",
          thumbs_up: 7654,
          thumbs_down: 876,
          author: "AmongUsPlayer",
        },
      ],
    },
  }

  // Return mock definition if it exists, otherwise generate a random one
  if (mockDefinitions[term.toLowerCase()]) {
    return mockDefinitions[term.toLowerCase()]
  }

  // Generate a random definition for unknown terms
  return {
    list: [
      {
        word: term,
        definition: `A slang term that means "${term} but in a cool way". Often used by young people to sound hip.`,
        example: `Person 1: Did you just ${term}?\nPerson 2: Yeah, I ${term} all the time!`,
        permalink: `https://www.urbandictionary.com/define.php?term=${encodeURIComponent(term)}`,
        thumbs_up: Math.floor(Math.random() * 5000),
        thumbs_down: Math.floor(Math.random() * 1000),
        author: "RandomUser" + Math.floor(Math.random() * 1000),
      },
    ],
  }
}
