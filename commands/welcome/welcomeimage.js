const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, ChannelType } = require("discord.js")
const { createCanvas, loadImage, registerFont } = require("canvas")
const database = require("../../utils/database")
const path = require("node:path")
const fs = require("node:fs")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcomeimage")
    .setDescription("Configure welcome images for new members")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set up welcome images")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send welcome images to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option
            .setName("background")
            .setDescription("The background type to use")
            .setRequired(true)
            .addChoices(
              { name: "Default", value: "default" },
              { name: "Blur", value: "blur" },
              { name: "Dark", value: "dark" },
              { name: "Light", value: "light" },
              { name: "Nature", value: "nature" },
              { name: "Abstract", value: "abstract" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("The welcome message (use {user} for username, {server} for server name)")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable welcome images"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("test")
        .setDescription("Test the welcome image with your profile")
        .addUserOption((option) => option.setName("user").setDescription("The user to test with").setRequired(false)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("background")
        .setDescription("Change the welcome image background")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("The background type to use")
            .setRequired(true)
            .addChoices(
              { name: "Default", value: "default" },
              { name: "Blur", value: "blur" },
              { name: "Dark", value: "dark" },
              { name: "Light", value: "light" },
              { name: "Nature", value: "nature" },
              { name: "Abstract", value: "abstract" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("message")
        .setDescription("Change the welcome message")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The welcome message (use {user} for username, {server} for server name)")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("color")
        .setDescription("Change the welcome image text color")
        .addStringOption((option) =>
          option
            .setName("hex")
            .setDescription("The hex color code (e.g. #FF5555)")
            .setRequired(true)
            .setMinLength(7)
            .setMaxLength(7),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize welcome image settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.welcomeImage) {
      guildSettings.welcomeImage = {
        enabled: false,
        channelId: null,
        background: "default",
        message: "Welcome to {server}, {user}!",
        textColor: "#FFFFFF",
      }
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel")
      const background = interaction.options.getString("background")
      const message = interaction.options.getString("message") || "Welcome to {server}, {user}!"

      // Update welcome image settings
      guildSettings.welcomeImage.enabled = true
      guildSettings.welcomeImage.channelId = channel.id
      guildSettings.welcomeImage.background = background
      guildSettings.welcomeImage.message = message
      database.save()

      await interaction.reply({
        content: `Welcome images have been set up! They will be sent to ${channel} when new members join.`,
        ephemeral: true,
      })
    } else if (subcommand === "disable") {
      // Disable welcome images
      guildSettings.welcomeImage.enabled = false
      database.save()

      await interaction.reply({
        content: "Welcome images have been disabled.",
        ephemeral: true,
      })
    } else if (subcommand === "test") {
      if (!guildSettings.welcomeImage.enabled) {
        return interaction.reply({
          content: "Welcome images are not enabled. Please set them up first with `/welcomeimage setup`.",
          ephemeral: true,
        })
      }

      await interaction.deferReply()

      const user = interaction.options.getUser("user") || interaction.user
      const member = await interaction.guild.members.fetch(user.id).catch(() => null)

      if (!member) {
        return interaction.editReply("Could not fetch member information.")
      }

      try {
        // Generate welcome image
        const image = await generateWelcomeImage(member, guildSettings.welcomeImage)
        const attachment = new AttachmentBuilder(image, { name: "welcome.png" })

        await interaction.editReply({
          content: "Here's how the welcome image will look:",
          files: [attachment],
        })
      } catch (error) {
        console.error("Error generating welcome image:", error)
        await interaction.editReply("There was an error generating the welcome image.")
      }
    } else if (subcommand === "background") {
      if (!guildSettings.welcomeImage.enabled) {
        return interaction.reply({
          content: "Welcome images are not enabled. Please set them up first with `/welcomeimage setup`.",
          ephemeral: true,
        })
      }

      const background = interaction.options.getString("type")

      // Update background
      guildSettings.welcomeImage.background = background
      database.save()

      await interaction.reply({
        content: `Welcome image background has been set to ${background}.`,
        ephemeral: true,
      })
    } else if (subcommand === "message") {
      if (!guildSettings.welcomeImage.enabled) {
        return interaction.reply({
          content: "Welcome images are not enabled. Please set them up first with `/welcomeimage setup`.",
          ephemeral: true,
        })
      }

      const message = interaction.options.getString("text")

      // Update message
      guildSettings.welcomeImage.message = message
      database.save()

      await interaction.reply({
        content: `Welcome message has been set to: "${message}"`,
        ephemeral: true,
      })
    } else if (subcommand === "color") {
      if (!guildSettings.welcomeImage.enabled) {
        return interaction.reply({
          content: "Welcome images are not enabled. Please set them up first with `/welcomeimage setup`.",
          ephemeral: true,
        })
      }

      const color = interaction.options.getString("hex")

      // Validate hex color
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          content: "Please provide a valid hex color code (e.g. #FF5555).",
          ephemeral: true,
        })
      }

      // Update text color
      guildSettings.welcomeImage.textColor = color
      database.save()

      await interaction.reply({
        content: `Welcome message text color has been set to ${color}.`,
        ephemeral: true,
      })
    }
  },
}

// Function to generate welcome image
async function generateWelcomeImage(member, settings) {
  // Create canvas
  const canvas = createCanvas(1000, 300)
  const ctx = canvas.getContext("2d")

  // Load background
  let background
  try {
    // In a real implementation, you would have these background images stored in your project
    // For this example, we'll use a solid color as a fallback
    const backgroundPath = getBackgroundPath(settings.background)
    if (backgroundPath) {
      background = await loadImage(backgroundPath)
    }
  } catch (error) {
    console.error("Error loading background:", error)
  }

  // Draw background
  if (background) {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
  } else {
    // Fallback to a gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, "#3a1c71")
    gradient.addColorStop(0.5, "#d76d77")
    gradient.addColorStop(1, "#ffaf7b")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Add semi-transparent overlay for better text visibility
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw avatar
  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: "png", size: 256 }))

    // Draw avatar circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(150, 150, 100, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.clip()

    // Draw avatar and border
    ctx.drawImage(avatar, 50, 50, 200, 200)
    ctx.restore()

    // Draw avatar border
    ctx.beginPath()
    ctx.arc(150, 150, 100, 0, Math.PI * 2, true)
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.closePath()
  } catch (error) {
    console.error("Error loading avatar:", error)
  }

  // Set up text
  ctx.font = "bold 50px Arial"
  ctx.fillStyle = settings.textColor || "#FFFFFF"
  ctx.textAlign = "center"

  // Format welcome message
  const welcomeMessage = settings.message.replace("{user}", member.user.username).replace("{server}", member.guild.name)

  // Draw welcome message
  ctx.fillText(welcomeMessage, 600, 150, 700)

  // Draw member count
  ctx.font = "30px Arial"
  ctx.fillText(`Member #${member.guild.memberCount}`, 600, 200, 700)

  return canvas.toBuffer()
}

// Function to get background path
function getBackgroundPath(type) {
  // In a real implementation, you would have these background images stored in your project
  // For this example, we'll return null to use the fallback gradient
  return null
}
