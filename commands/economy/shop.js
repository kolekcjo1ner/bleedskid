const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")
const database = require("../../utils/database")

// Shop items
const shopItems = [
  {
    id: "vip_role",
    name: "VIP Role",
    description: "Get the VIP role in the server",
    price: 5000,
    role: true,
  },
  {
    id: "custom_color",
    name: "Custom Color Role",
    description: "Get a custom colored role",
    price: 2500,
    role: true,
  },
  {
    id: "lootbox",
    name: "Lootbox",
    description: "Open a lootbox for random rewards",
    price: 1000,
    consumable: true,
  },
  {
    id: "double_coins",
    name: "Double Coins (1 day)",
    description: "Earn double coins from work for 1 day",
    price: 3000,
    buff: true,
    duration: 24 * 60 * 60 * 1000, // 24 hours
  },
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View or buy items from the shop")
    .addSubcommand((subcommand) => subcommand.setName("view").setDescription("View the shop"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Buy an item from the shop")
        .addStringOption((option) =>
          option.setName("item").setDescription("The item to buy").setRequired(true).setAutocomplete(true),
        ),
    ),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused()
    const filtered = shopItems.filter((item) => item.name.toLowerCase().includes(focusedValue.toLowerCase()))
    await interaction.respond(filtered.map((item) => ({ name: `${item.name} - ${item.price} coins`, value: item.id })))
  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "view") {
      // Create the shop embed
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("Shop")
        .setDescription("Welcome to the shop! Use `/shop buy` to purchase an item.")
        .addFields(
          shopItems.map((item) => ({
            name: `${item.name} - ${item.price} coins`,
            value: item.description,
          })),
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } else if (subcommand === "buy") {
      const itemId = interaction.options.getString("item")
      const item = shopItems.find((i) => i.id === itemId)

      if (!item) {
        return interaction.reply({
          content: "That item doesn't exist!",
          ephemeral: true,
        })
      }

      // Get user data
      const userData = database.getUser(interaction.user.id)

      // Check if the user has enough money
      if (userData.economy.balance < item.price) {
        return interaction.reply({
          content: `You don't have enough coins to buy this item! You have ${userData.economy.balance} coins, but the item costs ${item.price} coins.`,
          ephemeral: true,
        })
      }

      // Process the purchase based on item type
      if (item.role) {
        // Handle role items
        let roleId
        if (item.id === "vip_role") {
          roleId = "VIP_ROLE_ID" // Replace with actual role ID
        } else if (item.id === "custom_color") {
          // For custom color, we'd need to create a new role
          // This is simplified for demonstration
          roleId = "CUSTOM_COLOR_ROLE_ID" // Replace with actual role ID
        }

        if (roleId) {
          try {
            const role = await interaction.guild.roles.fetch(roleId)
            if (role) {
              await interaction.member.roles.add(role)
            }
          } catch (error) {
            console.error("Failed to add role:", error)
            return interaction.reply({
              content: "There was an error giving you the role. Please contact an administrator.",
              ephemeral: true,
            })
          }
        }
      } else if (item.consumable) {
        // Handle consumable items
        if (item.id === "lootbox") {
          // Generate random rewards
          const reward = Math.floor(Math.random() * 2001) + 500 // Random amount between 500 and 2500
          userData.economy.balance += reward - item.price // Subtract price but add reward

          await interaction.reply({
            content: `You opened a lootbox and found **${reward} coins**!`,
            ephemeral: false,
          })
          database.save()
          return
        }
      } else if (item.buff) {
        // Handle buff items
        if (item.id === "double_coins") {
          userData.economy.buffs = userData.economy.buffs || {}
          userData.economy.buffs.doubleCoins = Date.now() + item.duration
        }
      }

      // Deduct the price
      userData.economy.balance -= item.price
      database.save()

      // Send confirmation
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("Purchase Successful")
        .setDescription(`You have successfully purchased **${item.name}** for **${item.price} coins**!`)
        .addFields({ name: "New Balance", value: `💰 ${userData.economy.balance.toLocaleString()} coins` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    }
  },
}
