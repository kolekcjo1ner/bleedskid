const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = require("node:fetch")

module.exports = {
  data: new SlashCommandBuilder().setName("meme").setDescription("Get a random meme from Reddit"),
  async execute(interaction) {
    await interaction.deferReply()

    try {
      const response = await fetch("https://www.reddit.com/r/memes/hot.json?limit=100")
      const data = await response.json()

      // Filter out stickied posts and posts without images
      const posts = data.data.children.filter(
        (post) => !post.data.stickied && post.data.post_hint === "image" && !post.data.over_18, // Filter out NSFW content
      )

      if (posts.length === 0) {
        return interaction.editReply("Couldn't find any memes at the moment. Try again later.")
      }

      // Get a random post
      const randomPost = posts[Math.floor(Math.random() * posts.length)].data

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(randomPost.title)
        .setURL(`https://reddit.com${randomPost.permalink}`)
        .setImage(randomPost.url)
        .setFooter({
          text: `👍 ${randomPost.ups} | 💬 ${randomPost.num_comments} | Posted by u/${randomPost.author}`,
        })

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error(error)
      await interaction.editReply("There was an error fetching a meme. Please try again later.")
    }
  },
}
