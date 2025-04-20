const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoresponder")
    .setDescription("Manage automatic responses to specific triggers")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new auto-responder")
        .addStringOption((option) =>
          option.setName("trigger").setDescription("The text that triggers the response").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("response").setDescription("The response to send").setRequired(true),
        )
        .addBooleanOption((option) =>
          option
            .setName("exact")
            .setDescription("Whether the trigger must match exactly (default: false)")
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("case_sensitive")
            .setDescription("Whether the trigger is case-sensitive (default: false)")
            .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove an auto-responder")
        .addStringOption((option) =>
          option.setName("trigger").setDescription("The trigger of the auto-responder to remove").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List all auto-responders")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enable the auto-responder system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable the auto-responder system")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize auto-responders in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.autoResponders) {
      guildSettings.autoResponders = {
        enabled: false,
        responses: [],
      }
    }

    if (subcommand === "add") {
      const trigger = interaction.options.getString("trigger")
      const response = interaction.options.getString("response")
      const exact = interaction.options.getBoolean("exact") || false
      const caseSensitive = interaction.options.getBoolean("case_sensitive") || false

      // Check if trigger already exists
      const existingTrigger = guildSettings.autoResponders.responses.find(
        (r) => r.trigger.toLowerCase() === trigger.toLowerCase(),
      )
      if (existingTrigger) {
        return interaction.reply({
          content: `An auto-responder with the trigger "${trigger}" already exists.`,
          ephemeral: true,
        })
      }

      // Add auto-responder
      guildSettings.autoResponders.responses.push({
        trigger,
        response,
        exact,
        caseSensitive,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        uses: 0,
      })
      database.save()

      await interaction.reply({
        content: `Auto-responder for "${trigger}" has been added!`,
        ephemeral: true,
      })
    } else if (subcommand === "remove") {
      const trigger = interaction.options.getString("trigger")

      // Find auto-responder
      const index = guildSettings.autoResponders.responses.findIndex(
        (r) => r.trigger.toLowerCase() === trigger.toLowerCase(),
      )
      if (index === -1) {
        return interaction.reply({
          content: `Could not find an auto-responder with the trigger "${trigger}".`,
          ephemeral: true,
        })
      }

      // Remove auto-responder
      guildSettings.autoResponders.responses.splice(index, 1)
      database.save()

      await interaction.reply({
        content: `Auto-responder for "${trigger}" has been removed!`,
        ephemeral: true,
      })
    } else if (subcommand === "list") {
      const autoResponders = guildSettings.autoResponders.responses

      if (autoResponders.length === 0) {
        return interaction.reply({
          content: "There are no auto-responders set up.",
          ephemeral: true,
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("Auto-Responders")
        .setColor(0x5865f2)
        .setDescription(
          autoResponders
            .map(
              (r, i) =>
                `**${i + 1}.** Trigger: \`${r.trigger}\`\n` +
                `Response: ${r.response.length > 100 ? r.response.substring(0, 97) + "..." : r.response}\n` +
                `Exact Match: ${r.exact ? "Yes" : "No"} | Case Sensitive: ${r.caseSensitive ? "Yes" : "No"} | Uses: ${
                  r.uses
                }`,
            )
            .join("\n\n"),
        )
        .setFooter({
          text: `Total auto-responders: ${autoResponders.length} | System: ${guildSettings.autoResponders.enabled ? "Enabled" : "Disabled"}`,
        })
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } else if (subcommand === "enable") {
      guildSettings.autoResponders.enabled = true
      database.save()

      await interaction.reply({
        content: "Auto-responder system has been enabled!",
        ephemeral: true,
      })
    } else if (subcommand === "disable") {
      guildSettings.autoResponders.enabled = false
      database.save()

      await interaction.reply({
        content: "Auto-responder system has been disabled!",
        ephemeral: true,
      })
    }
  },
}
