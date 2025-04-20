const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const database = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure the auto-moderation system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enable auto-moderation features")
        .addStringOption((option) =>
          option
            .setName("feature")
            .setDescription("The auto-moderation feature to enable")
            .setRequired(true)
            .addChoices(
              { name: "Anti-Spam", value: "antispam" },
              { name: "Anti-Invite", value: "antiinvite" },
              { name: "Anti-Link", value: "antilink" },
              { name: "Anti-Mention", value: "antimention" },
              { name: "Anti-Caps", value: "anticaps" },
              { name: "Anti-Swear", value: "antiswear" },
              { name: "All Features", value: "all" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable auto-moderation features")
        .addStringOption((option) =>
          option
            .setName("feature")
            .setDescription("The auto-moderation feature to disable")
            .setRequired(true)
            .addChoices(
              { name: "Anti-Spam", value: "antispam" },
              { name: "Anti-Invite", value: "antiinvite" },
              { name: "Anti-Link", value: "antilink" },
              { name: "Anti-Mention", value: "antimention" },
              { name: "Anti-Caps", value: "anticaps" },
              { name: "Anti-Swear", value: "antiswear" },
              { name: "All Features", value: "all" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("exempt")
        .setDescription("Exempt a role or channel from auto-moderation")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("What to exempt")
            .setRequired(true)
            .addChoices({ name: "Role", value: "role" }, { name: "Channel", value: "channel" }),
        )
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the role or channel to exempt").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unexempt")
        .setDescription("Remove an exemption from auto-moderation")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("What to unexempt")
            .setRequired(true)
            .addChoices({ name: "Role", value: "role" }, { name: "Channel", value: "channel" }),
        )
        .addStringOption((option) =>
          option.setName("id").setDescription("The ID of the role or channel to unexempt").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("action")
        .setDescription("Set the action to take when auto-moderation is triggered")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("The action to take")
            .setRequired(true)
            .addChoices(
              { name: "Delete Message", value: "delete" },
              { name: "Warn User", value: "warn" },
              { name: "Timeout User (5 minutes)", value: "timeout" },
              { name: "Delete and Warn", value: "delete_warn" },
              { name: "Delete and Timeout", value: "delete_timeout" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("threshold")
        .setDescription("Set thresholds for auto-moderation features")
        .addStringOption((option) =>
          option
            .setName("feature")
            .setDescription("The feature to set a threshold for")
            .setRequired(true)
            .addChoices(
              { name: "Anti-Spam (messages per 10s)", value: "antispam" },
              { name: "Anti-Mention (mentions per message)", value: "antimention" },
              { name: "Anti-Caps (percentage of caps)", value: "anticaps" },
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("The threshold value")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("wordlist")
        .setDescription("Manage the list of banned words")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("The action to take")
            .setRequired(true)
            .addChoices(
              { name: "Add Word", value: "add" },
              { name: "Remove Word", value: "remove" },
              { name: "List Words", value: "list" },
            ),
        )
        .addStringOption((option) =>
          option.setName("word").setDescription("The word to add or remove").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("settings").setDescription("View current auto-moderation settings"),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()

    // Initialize automod settings in database if they don't exist
    const guildSettings = database.getGuild(interaction.guild.id)
    if (!guildSettings.automod) {
      guildSettings.automod = {
        enabled: false,
        features: {
          antispam: false,
          antiinvite: false,
          antilink: false,
          antimention: false,
          anticaps: false,
          antiswear: false,
        },
        exemptRoles: [],
        exemptChannels: [],
        action: "delete",
        thresholds: {
          antispam: 5, // 5 messages per 10 seconds
          antimention: 5, // 5 mentions per message
          anticaps: 70, // 70% caps
        },
        bannedWords: [],
      }
    }

    if (subcommand === "enable") {
      const feature = interaction.options.getString("feature")

      if (feature === "all") {
        // Enable all features
        guildSettings.automod.enabled = true
        Object.keys(guildSettings.automod.features).forEach((key) => {
          guildSettings.automod.features[key] = true
        })
        database.save()

        await interaction.reply({
          content: "All auto-moderation features have been enabled.",
          ephemeral: true,
        })
      } else {
        // Enable specific feature
        guildSettings.automod.enabled = true
        guildSettings.automod.features[feature] = true
        database.save()

        const featureNames = {
          antispam: "Anti-Spam",
          antiinvite: "Anti-Invite",
          antilink: "Anti-Link",
          antimention: "Anti-Mention",
          anticaps: "Anti-Caps",
          antiswear: "Anti-Swear",
        }

        await interaction.reply({
          content: `${featureNames[feature]} has been enabled.`,
          ephemeral: true,
        })
      }
    } else if (subcommand === "disable") {
      const feature = interaction.options.getString("feature")

      if (feature === "all") {
        // Disable all features
        guildSettings.automod.enabled = false
        Object.keys(guildSettings.automod.features).forEach((key) => {
          guildSettings.automod.features[key] = false
        })
        database.save()

        await interaction.reply({
          content: "All auto-moderation features have been disabled.",
          ephemeral: true,
        })
      } else {
        // Disable specific feature
        guildSettings.automod.features[feature] = false

        // Check if any features are still enabled
        const anyEnabled = Object.values(guildSettings.automod.features).some((value) => value === true)
        if (!anyEnabled) {
          guildSettings.automod.enabled = false
        }

        database.save()

        const featureNames = {
          antispam: "Anti-Spam",
          antiinvite: "Anti-Invite",
          antilink: "Anti-Link",
          antimention: "Anti-Mention",
          anticaps: "Anti-Caps",
          antiswear: "Anti-Swear",
        }

        await interaction.reply({
          content: `${featureNames[feature]} has been disabled.`,
          ephemeral: true,
        })
      }
    } else if (subcommand === "exempt") {
      const type = interaction.options.getString("type")
      const id = interaction.options.getString("id")

      // Validate ID
      if (!/^\d+$/.test(id)) {
        return interaction.reply({
          content: "Please provide a valid ID.",
          ephemeral: true,
        })
      }

      // Check if ID exists
      if (type === "role") {
        const role = await interaction.guild.roles.fetch(id).catch(() => null)
        if (!role) {
          return interaction.reply({
            content: "Could not find a role with that ID.",
            ephemeral: true,
          })
        }

        // Add role to exempt list if not already there
        if (!guildSettings.automod.exemptRoles.includes(id)) {
          guildSettings.automod.exemptRoles.push(id)
          database.save()
        }

        await interaction.reply({
          content: `${role.name} has been exempted from auto-moderation.`,
          ephemeral: true,
        })
      } else if (type === "channel") {
        const channel = await interaction.guild.channels.fetch(id).catch(() => null)
        if (!channel) {
          return interaction.reply({
            content: "Could not find a channel with that ID.",
            ephemeral: true,
          })
        }

        // Add channel to exempt list if not already there
        if (!guildSettings.automod.exemptChannels.includes(id)) {
          guildSettings.automod.exemptChannels.push(id)
          database.save()
        }

        await interaction.reply({
          content: `${channel.name} has been exempted from auto-moderation.`,
          ephemeral: true,
        })
      }
    } else if (subcommand === "unexempt") {
      const type = interaction.options.getString("type")
      const id = interaction.options.getString("id")

      if (type === "role") {
        // Remove role from exempt list
        const index = guildSettings.automod.exemptRoles.indexOf(id)
        if (index !== -1) {
          guildSettings.automod.exemptRoles.splice(index, 1)
          database.save()

          const role = await interaction.guild.roles.fetch(id).catch(() => null)
          const roleName = role ? role.name : "Role"

          await interaction.reply({
            content: `${roleName} is no longer exempted from auto-moderation.`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: "That role is not exempted from auto-moderation.",
            ephemeral: true,
          })
        }
      } else if (type === "channel") {
        // Remove channel from exempt list
        const index = guildSettings.automod.exemptChannels.indexOf(id)
        if (index !== -1) {
          guildSettings.automod.exemptChannels.splice(index, 1)
          database.save()

          const channel = await interaction.guild.channels.fetch(id).catch(() => null)
          const channelName = channel ? channel.name : "Channel"

          await interaction.reply({
            content: `${channelName} is no longer exempted from auto-moderation.`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: "That channel is not exempted from auto-moderation.",
            ephemeral: true,
          })
        }
      }
    } else if (subcommand === "action") {
      const action = interaction.options.getString("action")

      // Set action
      guildSettings.automod.action = action
      database.save()

      const actionDescriptions = {
        delete: "Delete Message",
        warn: "Warn User",
        timeout: "Timeout User (5 minutes)",
        delete_warn: "Delete and Warn",
        delete_timeout: "Delete and Timeout",
      }

      await interaction.reply({
        content: `Auto-moderation action has been set to: ${actionDescriptions[action]}.`,
        ephemeral: true,
      })
    } else if (subcommand === "threshold") {
      const feature = interaction.options.getString("feature")
      const value = interaction.options.getInteger("value")

      // Set threshold
      guildSettings.automod.thresholds[feature] = value
      database.save()

      const featureDescriptions = {
        antispam: `Anti-Spam threshold set to ${value} messages per 10 seconds.`,
        antimention: `Anti-Mention threshold set to ${value} mentions per message.`,
        anticaps: `Anti-Caps threshold set to ${value}% capital letters.`,
      }

      await interaction.reply({
        content: featureDescriptions[feature],
        ephemeral: true,
      })
    } else if (subcommand === "wordlist") {
      const action = interaction.options.getString("action")

      if (action === "add") {
        const word = interaction.options.getString("word")
        if (!word) {
          return interaction.reply({
            content: "Please provide a word to add.",
            ephemeral: true,
          })
        }

        // Add word to banned list if not already there
        if (!guildSettings.automod.bannedWords.includes(word.toLowerCase())) {
          guildSettings.automod.bannedWords.push(word.toLowerCase())
          database.save()

          await interaction.reply({
            content: `"${word}" has been added to the banned words list.`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: `"${word}" is already in the banned words list.`,
            ephemeral: true,
          })
        }
      } else if (action === "remove") {
        const word = interaction.options.getString("word")
        if (!word) {
          return interaction.reply({
            content: "Please provide a word to remove.",
            ephemeral: true,
          })
        }

        // Remove word from banned list
        const index = guildSettings.automod.bannedWords.indexOf(word.toLowerCase())
        if (index !== -1) {
          guildSettings.automod.bannedWords.splice(index, 1)
          database.save()

          await interaction.reply({
            content: `"${word}" has been removed from the banned words list.`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: `"${word}" is not in the banned words list.`,
            ephemeral: true,
          })
        }
      } else if (action === "list") {
        // List banned words
        if (guildSettings.automod.bannedWords.length === 0) {
          await interaction.reply({
            content: "There are no words in the banned words list.",
            ephemeral: true,
          })
        } else {
          const embed = new EmbedBuilder()
            .setTitle("Banned Words List")
            .setDescription(guildSettings.automod.bannedWords.join(", "))
            .setColor(0x5865f2)
            .setFooter({ text: `Total: ${guildSettings.automod.bannedWords.length} words` })
            .setTimestamp()

          await interaction.reply({ embeds: [embed], ephemeral: true })
        }
      }
    } else if (subcommand === "settings") {
      // Create embed with current settings
      const embed = new EmbedBuilder()
        .setTitle("Auto-Moderation Settings")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "Status",
            value: guildSettings.automod.enabled ? "Enabled" : "Disabled",
            inline: true,
          },
          {
            name: "Action",
            value: {
              delete: "Delete Message",
              warn: "Warn User",
              timeout: "Timeout User",
              delete_warn: "Delete and Warn",
              delete_timeout: "Delete and Timeout",
            }[guildSettings.automod.action],
            inline: true,
          },
          {
            name: "Features",
            value: Object.entries(guildSettings.automod.features)
              .map(([key, value]) => {
                const featureNames = {
                  antispam: "Anti-Spam",
                  antiinvite: "Anti-Invite",
                  antilink: "Anti-Link",
                  antimention: "Anti-Mention",
                  anticaps: "Anti-Caps",
                  antiswear: "Anti-Swear",
                }
                return `${value ? "✅" : "❌"} ${featureNames[key]}`
              })
              .join("\n"),
          },
          {
            name: "Thresholds",
            value:
              `Anti-Spam: ${guildSettings.automod.thresholds.antispam} messages/10s\n` +
              `Anti-Mention: ${guildSettings.automod.thresholds.antimention} mentions/message\n` +
              `Anti-Caps: ${guildSettings.automod.thresholds.anticaps}% capital letters`,
          },
          {
            name: "Exempt Roles",
            value:
              guildSettings.automod.exemptRoles.length > 0
                ? guildSettings.automod.exemptRoles.map((id) => `<@&${id}>`).join(", ")
                : "None",
          },
          {
            name: "Exempt Channels",
            value:
              guildSettings.automod.exemptChannels.length > 0
                ? guildSettings.automod.exemptChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
          },
          {
            name: "Banned Words",
            value:
              guildSettings.automod.bannedWords.length > 0
                ? `${guildSettings.automod.bannedWords.length} words in list`
                : "None",
          },
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed], ephemeral: true })
    }
  },
}
