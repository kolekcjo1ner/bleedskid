const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js")
const { createCanvas, loadImage, registerFont } = require("canvas")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Check your or another user's rank")
    .addUserOption((option) => option.setName("user").setDescription("The user to check the rank of")),
  async execute(interaction) {
    await interaction.deferReply()

    const user = interaction.options.getUser("user") || interaction.user
    const userData = database.getUser(user.id)
    const xpData = userData.xp

    // Calculate XP needed for next level
    const xpNeeded = xpData.level * 100

    // Create canvas
    const canvas = createCanvas(800, 250)
    const ctx = canvas.getContext("2d")

    // Draw background
    ctx.fillStyle = "#36393f"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw progress bar background
    ctx.fillStyle = "#484b51"
    ctx.fillRect(250, 160, 500, 40)

    // Draw progress bar
    const progress = (xpData.xp / xpNeeded) * 500
    ctx.fillStyle = "#5865f2"
    ctx.fillRect(250, 160, progress, 40)

    // Draw avatar
    try {
      const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 256 }))
      ctx.save()
      ctx.beginPath()
      ctx.arc(125, 125, 100, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(avatar, 25, 25, 200, 200)
      ctx.restore()
    } catch (error) {
      console.error("Error loading avatar:", error)
    }

    // Draw text
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 36px Arial"
    ctx.fillText(user.username, 250, 80)

    ctx.fillStyle = "#b9bbbe"
    ctx.font = "24px Arial"
    ctx.fillText(`Level: ${xpData.level}`, 250, 120)
    ctx.fillText(`XP: ${xpData.xp}/${xpNeeded}`, 400, 120)
    ctx.fillText(`Total XP: ${xpData.totalXp}`, 600, 120)

    // Create attachment
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "rank.png" })

    // Send the image
    await interaction.editReply({ files: [attachment] })
  },
}
