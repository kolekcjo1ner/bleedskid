const {
  Events,
  InteractionType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const database = require("../utils/database")

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName)

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`)
        return
      }

      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(error)
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true })
        } else {
          await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true })
        }
      }
    }
    // Handle autocomplete interactions
    else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName)

      if (!command || !command.autocomplete) {
        return
      }

      try {
        await command.autocomplete(interaction)
      } catch (error) {
        console.error(error)
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      // Check if it's a reaction role button
      if (interaction.customId.startsWith("role_")) {
        const roleId = interaction.customId.replace("role_", "")
        const member = interaction.member

        // Check if the member has the role
        if (member.roles.cache.has(roleId)) {
          // Remove the role
          await member.roles.remove(roleId)
          await interaction.reply({ content: `Removed the <@&${roleId}> role.`, ephemeral: true })
        } else {
          // Add the role
          await member.roles.add(roleId)
          await interaction.reply({ content: `Added the <@&${roleId}> role.`, ephemeral: true })
        }
      }
      // Handle Voice Master panel buttons
      else if (interaction.customId.startsWith("voice_")) {
        // Check if the user is in a voice channel
        const voiceChannel = interaction.member.voice.channel
        if (!voiceChannel) {
          return interaction.reply({
            content: "You need to be in a voice channel to use these controls!",
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
            content: "You are not in a Voice Master channel.",
            ephemeral: true,
          })
        }

        // Check if the user is the owner (except for claim button)
        if (interaction.customId !== "voice_claim" && voiceChannels[voiceChannel.id].ownerId !== interaction.user.id) {
          return interaction.reply({
            content: "You are not the owner of this voice channel!",
            ephemeral: true,
          })
        }

        // Handle different button actions
        switch (interaction.customId) {
          case "voice_lock":
            await handleVoiceLock(interaction, voiceChannel, voiceChannels)
            break
          case "voice_limit":
            await handleVoiceLimit(interaction, voiceChannel)
            break
          case "voice_rename":
            await handleVoiceRename(interaction, voiceChannel)
            break
          case "voice_kick":
            await handleVoiceKick(interaction, voiceChannel)
            break
          case "voice_invite":
            await handleVoiceInvite(interaction, voiceChannel)
            break
          case "voice_claim":
            await handleVoiceClaim(interaction, voiceChannel, voiceChannels)
            break
        }
      }
      // Handle ticket system buttons
      else if (interaction.customId === "create_ticket") {
        // Get guild settings
        const guildSettings = database.getGuild(interaction.guild.id)
        if (!guildSettings.tickets || !guildSettings.tickets.enabled) {
          return interaction.reply({
            content: "The ticket system is not enabled on this server.",
            ephemeral: true,
          })
        }

        // Check if user already has an open ticket
        const activeTickets = guildSettings.tickets.activeTickets || {}
        const userTicket = Object.entries(activeTickets).find(([_, ticket]) => ticket.userId === interaction.user.id)

        if (userTicket) {
          return interaction.reply({
            content: `You already have an open ticket: <#${userTicket[0]}>`,
            ephemeral: true,
          })
        }

        // Create ticket modal
        const modal = new ModalBuilder().setCustomId("ticket_create_modal").setTitle("Create a Support Ticket")

        // Add components to modal
        const subjectInput = new TextInputBuilder()
          .setCustomId("ticket_subject")
          .setLabel("Subject")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Brief description of your issue")
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(100)

        const descriptionInput = new TextInputBuilder()
          .setCustomId("ticket_description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Please describe your issue in detail")
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(1000)

        // Add inputs to the modal
        const firstActionRow = new ActionRowBuilder().addComponents(subjectInput)
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput)
        modal.addComponents(firstActionRow, secondActionRow)

        // Show the modal
        await interaction.showModal(modal)
      }
      // Handle ticket close confirmation
      else if (interaction.customId === "confirm_close") {
        // Get guild settings
        const guildSettings = database.getGuild(interaction.guild.id)
        if (!guildSettings.tickets || !guildSettings.tickets.enabled) {
          return interaction.reply({
            content: "The ticket system is not enabled on this server.",
            ephemeral: true,
          })
        }

        // Check if the channel is a ticket
        const channelId = interaction.channel.id
        if (!guildSettings.tickets.activeTickets[channelId]) {
          return interaction.reply({
            content: "This channel is not a ticket.",
            ephemeral: true,
          })
        }

        // Get ticket data
        const ticketData = guildSettings.tickets.activeTickets[channelId]

        try {
          // Update message
          await interaction.update({
            content: "Ticket will be closed in 5 seconds...",
            components: [],
          })

          // Wait 5 seconds
          setTimeout(async () => {
            try {
              // Delete the channel
              await interaction.channel.delete(`Ticket closed by ${interaction.user.tag}`)

              // Remove from active tickets
              delete guildSettings.tickets.activeTickets[channelId]
              database.save()
            } catch (error) {
              console.error("Error closing ticket:", error)
            }
          }, 5000)
        } catch (error) {
          console.error("Error closing ticket:", error)
          await interaction.reply({
            content: "There was an error closing the ticket.",
            ephemeral: true,
          })
        }
      }
      // Handle ticket close cancellation
      else if (interaction.customId === "cancel_close") {
        await interaction.update({
          content: "Ticket close cancelled.",
          components: [],
        })
      }
      // Handle verification button
      else if (interaction.customId === "verify_button") {
        // Get guild settings
        const guildSettings = database.getGuild(interaction.guild.id)
        if (!guildSettings.verification || !guildSettings.verification.enabled) {
          return interaction.reply({
            content: "The verification system is not enabled on this server.",
            ephemeral: true,
          })
        }

        // Get verification role
        const role = await interaction.guild.roles.fetch(guildSettings.verification.roleId).catch(() => null)
        if (!role) {
          return interaction.reply({
            content: "The verification role could not be found. Please contact an administrator.",
            ephemeral: true,
          })
        }

        try {
          // Add role to user
          await interaction.member.roles.add(role, "User verified through button")

          await interaction.reply({
            content: "You have been successfully verified!",
            ephemeral: true,
          })
        } catch (error) {
          console.error("Error verifying user:", error)
          await interaction.reply({
            content: "There was an error verifying you. Please contact an administrator.",
            ephemeral: true,
          })
        }
      }
      // Handle verification question button
      else if (interaction.customId === "verify_question") {
        // Get guild settings
        const guildSettings = database.getGuild(interaction.guild.id)
        if (!guildSettings.verification || !guildSettings.verification.enabled) {
          return interaction.reply({
            content: "The verification system is not enabled on this server.",
            ephemeral: true,
          })
        }

        // Create modal for verification question
        const modal = new ModalBuilder().setCustomId("verify_question_modal").setTitle("Verification Question")

        // Add components to modal
        const answerInput = new TextInputBuilder()
          .setCustomId("verification_answer")
          .setLabel(guildSettings.verification.question)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Your answer")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100)

        // Add inputs to the modal
        const actionRow = new ActionRowBuilder().addComponents(answerInput)
        modal.addComponents(actionRow)

        // Show the modal
        await interaction.showModal(modal)
      }
      // Handle music dashboard buttons
      else if (interaction.customId.startsWith("music_")) {
        // Get the music queue
        const queue = interaction.client.musicQueues?.get(interaction.guild.id)

        if (!queue && interaction.customId !== "music_queue") {
          return interaction.reply({
            content: "There is no active music playback.",
            ephemeral: true,
          })
        }

        // Handle different music controls
        switch (interaction.customId) {
          case "music_previous":
            // This would require keeping track of previous songs
            await interaction.reply({
              content: "Previous track feature is not implemented yet.",
              ephemeral: true,
            })
            break
          case "music_playpause":
            if (queue.playing) {
              queue.player.pause()
              queue.playing = false
              await interaction.reply({
                content: "⏸️ Music paused.",
                ephemeral: true,
              })
            } else {
              queue.player.unpause()
              queue.playing = true
              await interaction.reply({
                content: "▶️ Music resumed.",
                ephemeral: true,
              })
            }
            break
          case "music_skip":
            queue.player.stop()
            await interaction.reply({
              content: "⏭️ Skipped to the next song.",
              ephemeral: true,
            })
            break
          case "music_stop":
            queue.songs = []
            queue.player.stop()
            queue.connection.destroy()
            interaction.client.musicQueues.delete(interaction.guild.id)
            await interaction.reply({
              content: "⏹️ Music playback stopped.",
              ephemeral: true,
            })
            break
          case "music_volume_down":
            if (queue.volume > 0) {
              queue.volume = Math.max(0, queue.volume - 10)
              queue.resource.volume.setVolume(queue.volume / 100)
              await interaction.reply({
                content: `🔉 Volume set to ${queue.volume}%`,
                ephemeral: true,
              })
            } else {
              await interaction.reply({
                content: "Volume is already at 0%",
                ephemeral: true,
              })
            }
            break
          case "music_volume_up":
            if (queue.volume < 100) {
              queue.volume = Math.min(100, queue.volume + 10)
              queue.resource.volume.setVolume(queue.volume / 100)
              await interaction.reply({
                content: `🔊 Volume set to ${queue.volume}%`,
                ephemeral: true,
              })
            } else {
              await interaction.reply({
                content: "Volume is already at 100%",
                ephemeral: true,
              })
            }
            break
          case "music_loop":
            queue.loop = !queue.loop
            await interaction.reply({
              content: queue.loop ? "🔁 Loop enabled" : "➡️ Loop disabled",
              ephemeral: true,
            })
            break
          case "music_shuffle":
            // Shuffle the queue (except the currently playing song)
            const currentSong = queue.songs[0]
            const remainingSongs = queue.songs.slice(1)

            for (let i = remainingSongs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]]
            }

            queue.songs = [currentSong, ...remainingSongs]

            await interaction.reply({
              content: "🔀 Queue shuffled",
              ephemeral: true,
            })
            break
          case "music_queue":
            // Display the queue
            if (!queue || queue.songs.length === 0) {
              return interaction.reply({
                content: "The queue is empty.",
                ephemeral: true,
              })
            }

            const embed = new EmbedBuilder()
              .setTitle("Music Queue")
              .setColor(0xff0000)
              .setDescription(
                queue.songs
                  .slice(0, 10)
                  .map((song, index) => `${index + 1}. [${song.title}](${song.url}) | \`${song.duration}\``)
                  .join("\n") + (queue.songs.length > 10 ? `\n\n...and ${queue.songs.length - 10} more` : ""),
              )
              .setFooter({ text: `Total songs: ${queue.songs.length}` })
              .setTimestamp()

            await interaction.reply({ embeds: [embed], ephemeral: true })
            break
          case "music_lyrics":
            // This would require a lyrics API
            await interaction.reply({
              content: "Lyrics feature is not implemented yet.",
              ephemeral: true,
            })
            break
          case "music_nowplaying":
            if (!queue || queue.songs.length === 0) {
              return interaction.reply({
                content: "Nothing is currently playing.",
                ephemeral: true,
              })
            }

            const currentSongEmbed = new EmbedBuilder()
              .setTitle("Now Playing")
              .setColor(0xff0000)
              .setDescription(`[${queue.songs[0].title}](${queue.songs[0].url})`)
              .addFields(
                { name: "Duration", value: queue.songs[0].duration, inline: true },
                { name: "Requested By", value: queue.songs[0].requestedBy, inline: true },
                { name: "Volume", value: `${queue.volume}%`, inline: true },
              )
              .setThumbnail(queue.songs[0].thumbnail)
              .setTimestamp()

            await interaction.reply({ embeds: [currentSongEmbed], ephemeral: true })
            break
        }

        // Update the music dashboard if it exists
        updateMusicDashboard(interaction.client, interaction.guild.id)
      }
      // Handle roles dashboard buttons
      else if (interaction.customId.startsWith("roles_")) {
        // Handle different role dashboard controls
        switch (interaction.customId) {
          case "roles_refresh":
            await refreshRolesDashboard(interaction)
            break
          case "roles_view_1":
          case "roles_view_2":
          case "roles_view_3":
            const menuIndex = Number.parseInt(interaction.customId.split("_")[2]) - 1
            await viewRoleMenu(interaction, menuIndex)
            break
          case "roles_create":
            // This would open a modal to create a new role menu
            await interaction.reply({
              content: "Please use the `/rolemenu create` command to create a new role menu.",
              ephemeral: true,
            })
            break
          case "roles_edit":
            // This would open a modal to edit a role menu
            await interaction.reply({
              content: "Please use the `/rolemenu add` or `/rolemenu remove` commands to edit role menus.",
              ephemeral: true,
            })
            break
          case "roles_delete":
            // This would open a modal to delete a role menu
            await interaction.reply({
              content: "Please use the `/rolemenu delete` command to delete a role menu.",
              ephemeral: true,
            })
            break
        }
      }
    }
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "activity_select") {
        // This is handled in the activity.js command
      }
      // Handle role menu select
      else if (interaction.customId.startsWith("rolemenu_")) {
        const menuId = interaction.customId.replace("rolemenu_", "")

        // Get guild settings
        const guildSettings = database.getGuild(interaction.guild.id)
        if (!guildSettings.roleMenus) {
          return interaction.reply({
            content: "Role menus are not set up on this server.",
            ephemeral: true,
          })
        }

        // Find the menu
        const menu = guildSettings.roleMenus.find((m) => m.id === menuId)
        if (!menu) {
          return interaction.reply({
            content: "This role menu no longer exists.",
            ephemeral: true,
          })
        }

        // Get selected role IDs
        const selectedRoleIds = interaction.values

        // Get all roles in the menu
        const menuRoleIds = menu.roles.map((r) => r.id)

        try {
          // If single selection, remove all other roles from the menu
          if (!menu.allowMultiple) {
            for (const roleId of menuRoleIds) {
              if (!selectedRoleIds.includes(roleId) && interaction.member.roles.cache.has(roleId)) {
                await interaction.member.roles.remove(roleId)
              }
            }
          }

          // Add selected roles
          for (const roleId of selectedRoleIds) {
            if (!interaction.member.roles.cache.has(roleId)) {
              await interaction.member.roles.add(roleId)
            }
          }

          await interaction.reply({
            content: `Your roles have been updated!`,
            ephemeral: true,
          })
        } catch (error) {
          console.error("Error updating roles:", error)
          await interaction.reply({
            content: "There was an error updating your roles.",
            ephemeral: true,
          })
        }
      }
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === "rename_modal") {
        await handleRenameModalSubmit(interaction)
      } else if (interaction.customId === "limit_modal") {
        await handleLimitModalSubmit(interaction)
      } else if (interaction.customId === "kick_modal") {
        await handleKickModalSubmit(interaction)
      } else if (interaction.customId === "invite_modal") {
        await handleInviteModalSubmit(interaction)
      } else if (interaction.customId === "ticket_create_modal") {
        await handleTicketCreateModalSubmit(interaction)
      } else if (interaction.customId === "verify_question_modal") {
        await handleVerifyQuestionModalSubmit(interaction)
      }
    }
  },
}

// Handle lock/unlock button
async function handleVoiceLock(interaction, voiceChannel, voiceChannels) {
  const isLocked = voiceChannels[voiceChannel.id].locked

  try {
    if (isLocked) {
      // Unlock the channel
      await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: null, // Reset to default
      })
      voiceChannels[voiceChannel.id].locked = false
      database.save()
      await interaction.reply({ content: "🔓 Your voice channel has been unlocked.", ephemeral: true })
    } else {
      // Lock the channel
      await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        Connect: false,
      })
      voiceChannels[voiceChannel.id].locked = true
      database.save()
      await interaction.reply({ content: "🔒 Your voice channel has been locked.", ephemeral: true })
    }
  } catch (error) {
    console.error("Error toggling voice channel lock:", error)
    await interaction.reply({
      content: "There was an error changing your voice channel's lock status.",
      ephemeral: true,
    })
  }
}

// Handle user limit button
async function handleVoiceLimit(interaction, voiceChannel) {
  // Create a modal for user input
  const modal = new ModalBuilder().setCustomId("limit_modal").setTitle("Set User Limit")

  // Add components to modal
  const limitInput = new TextInputBuilder()
    .setCustomId("limit_input")
    .setLabel("User Limit (0 for unlimited)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter a number between 0 and 99")
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2)
    .setValue(voiceChannel.userLimit.toString())

  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(limitInput)
  modal.addComponents(firstActionRow)

  // Show the modal
  await interaction.showModal(modal)
}

// Handle rename button
async function handleVoiceRename(interaction, voiceChannel) {
  // Create a modal for user input
  const modal = new ModalBuilder().setCustomId("rename_modal").setTitle("Rename Voice Channel")

  // Add components to modal
  const nameInput = new TextInputBuilder()
    .setCustomId("name_input")
    .setLabel("New Channel Name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter a new name for your voice channel")
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(100)
    .setValue(voiceChannel.name)

  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(nameInput)
  modal.addComponents(firstActionRow)

  // Show the modal
  await interaction.showModal(modal)
}

// Handle kick button
async function handleVoiceKick(interaction, voiceChannel) {
  // Create a modal for user input
  const modal = new ModalBuilder().setCustomId("kick_modal").setTitle("Kick User from Voice Channel")

  // Add components to modal
  const userInput = new TextInputBuilder()
    .setCustomId("user_input")
    .setLabel("User to Kick")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the username or ID of the user to kick")
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(100)

  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(userInput)
  modal.addComponents(firstActionRow)

  // Show the modal
  await interaction.showModal(modal)
}

// Handle invite button
async function handleVoiceInvite(interaction, voiceChannel) {
  // Create a modal for user input
  const modal = new ModalBuilder().setCustomId("invite_modal").setTitle("Invite User to Voice Channel")

  // Add components to modal
  const userInput = new TextInputBuilder()
    .setCustomId("user_input")
    .setLabel("User to Invite")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the username or ID of the user to invite")
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(100)

  // Add inputs to the modal
  const firstActionRow = new ActionRowBuilder().addComponents(userInput)
  modal.addComponents(firstActionRow)

  // Show the modal
  await interaction.showModal(modal)
}

// Handle claim button
async function handleVoiceClaim(interaction, voiceChannel, voiceChannels) {
  // Check if the user is already the owner
  if (voiceChannels[voiceChannel.id].ownerId === interaction.user.id) {
    return interaction.reply({
      content: "You are already the owner of this voice channel!",
      ephemeral: true,
    })
  }

  // Check if the owner is still in the channel
  const owner = voiceChannel.members.get(voiceChannels[voiceChannel.id].ownerId)
  if (owner) {
    return interaction.reply({
      content: "The owner is still in the channel. You cannot claim it.",
      ephemeral: true,
    })
  }

  try {
    // Transfer ownership
    voiceChannels[voiceChannel.id].ownerId = interaction.user.id
    database.save()

    // Update permissions
    await voiceChannel.permissionOverwrites.edit(interaction.user, {
      ManageChannels: true,
      MuteMembers: true,
      DeafenMembers: true,
      MoveMembers: true,
    })

    await interaction.reply({ content: "👑 You are now the owner of this voice channel!", ephemeral: true })
  } catch (error) {
    console.error("Error claiming voice channel:", error)
    await interaction.reply({
      content: "There was an error claiming this voice channel.",
      ephemeral: true,
    })
  }
}

// Handle rename modal submit
async function handleRenameModalSubmit(interaction) {
  // Get the new name from the modal
  const newName = interaction.fields.getTextInputValue("name_input")

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

  try {
    // Rename the voice channel
    await voiceChannel.setName(newName)

    // Update the database
    voiceChannels[voiceChannel.id].name = newName
    database.save()

    await interaction.reply({ content: `✅ Your voice channel has been renamed to "${newName}".`, ephemeral: true })
  } catch (error) {
    console.error("Error renaming voice channel:", error)
    await interaction.reply({
      content: "There was an error renaming your voice channel.",
      ephemeral: true,
    })
  }
}

// Handle limit modal submit
async function handleLimitModalSubmit(interaction) {
  // Get the limit from the modal
  const limitInput = interaction.fields.getTextInputValue("limit_input")
  const limit = Number.parseInt(limitInput)

  // Validate the input
  if (isNaN(limit) || limit < 0 || limit > 99) {
    return interaction.reply({
      content: "Please enter a valid number between 0 and 99.",
      ephemeral: true,
    })
  }

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

  try {
    // Set the user limit for the voice channel
    await voiceChannel.setUserLimit(limit)

    // Update the database
    voiceChannels[voiceChannel.id].userLimit = limit
    database.save()

    if (limit === 0) {
      await interaction.reply({ content: "✅ Your voice channel now has no user limit.", ephemeral: true })
    } else {
      await interaction.reply({ content: `✅ Your voice channel now has a limit of ${limit} users.`, ephemeral: true })
    }
  } catch (error) {
    console.error("Error setting voice channel limit:", error)
    await interaction.reply({
      content: "There was an error setting the user limit for your voice channel.",
      ephemeral: true,
    })
  }
}

// Handle kick modal submit
async function handleKickModalSubmit(interaction) {
  // Get the user input from the modal
  const userInput = interaction.fields.getTextInputValue("user_input")

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

  // Try to find the target user
  let targetMember = null

  // First try by ID
  if (userInput.match(/^[0-9]{17,19}$/)) {
    targetMember = await interaction.guild.members.fetch(userInput).catch(() => null)
  }

  // If not found, try by username
  if (!targetMember) {
    const members = await interaction.guild.members.fetch()
    targetMember = members.find(
      (m) =>
        m.user.username.toLowerCase() === userInput.toLowerCase() ||
        m.user.tag.toLowerCase() === userInput.toLowerCase(),
    )
  }

  if (!targetMember) {
    return interaction.reply({
      content: "Could not find that user in this server.",
      ephemeral: true,
    })
  }

  // Check if the target user is in the voice channel
  if (!targetMember.voice.channelId || targetMember.voice.channelId !== voiceChannel.id) {
    return interaction.reply({
      content: "That user is not in your voice channel.",
      ephemeral: true,
    })
  }

  try {
    // Disconnect the user from the voice channel
    await targetMember.voice.disconnect("Kicked by voice channel owner")

    // If the channel is locked, prevent them from rejoining
    if (voiceChannels[voiceChannel.id].locked) {
      await voiceChannel.permissionOverwrites.edit(targetMember, {
        Connect: false,
      })
    }

    await interaction.reply({
      content: `✅ ${targetMember.user.tag} has been kicked from your voice channel.`,
      ephemeral: true,
    })
  } catch (error) {
    console.error("Error kicking user from voice channel:", error)
    await interaction.reply({
      content: "There was an error kicking that user from your voice channel.",
      ephemeral: true,
    })
  }
}

// Handle invite modal submit
async function handleInviteModalSubmit(interaction) {
  // Get the user input from the modal
  const userInput = interaction.fields.getTextInputValue("user_input")

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

  // Check if the channel is locked
  if (!voiceChannels[voiceChannel.id].locked) {
    return interaction.reply({
      content: "Your voice channel is not locked. Anyone can join without an invitation.",
      ephemeral: true,
    })
  }

  // Try to find the target user
  let targetMember = null

  // First try by ID
  if (userInput.match(/^[0-9]{17,19}$/)) {
    targetMember = await interaction.guild.members.fetch(userInput).catch(() => null)
  }

  // If not found, try by username
  if (!targetMember) {
    const members = await interaction.guild.members.fetch()
    targetMember = members.find(
      (m) =>
        m.user.username.toLowerCase() === userInput.toLowerCase() ||
        m.user.tag.toLowerCase() === userInput.toLowerCase(),
    )
  }

  if (!targetMember) {
    return interaction.reply({
      content: "Could not find that user in this server.",
      ephemeral: true,
    })
  }

  try {
    // Allow the user to connect to the voice channel
    await voiceChannel.permissionOverwrites.edit(targetMember, {
      Connect: true,
    })

    await interaction.reply({
      content: `✅ ${targetMember.user.tag} has been invited to your voice channel.`,
      ephemeral: true,
    })

    // Try to send a DM to the invited user
    try {
      await targetMember.user.send(
        `${interaction.user.tag} has invited you to join their voice channel in ${interaction.guild.name}.`,
      )
    } catch (error) {
      // Ignore errors from DM (user might have DMs disabled)
    }
  } catch (error) {
    console.error("Error inviting user to voice channel:", error)
    await interaction.reply({
      content: "There was an error inviting that user to your voice channel.",
      ephemeral: true,
    })
  }
}

// Handle ticket create modal submit
async function handleTicketCreateModalSubmit(interaction) {
  // Get the input from the modal
  const subject = interaction.fields.getTextInputValue("ticket_subject")
  const description = interaction.fields.getTextInputValue("ticket_description")

  // Get guild settings
  const guildSettings = database.getGuild(interaction.guild.id)
  if (!guildSettings.tickets || !guildSettings.tickets.enabled) {
    return interaction.reply({
      content: "The ticket system is not enabled on this server.",
      ephemeral: true,
    })
  }

  // Check if user already has an open ticket
  const activeTickets = guildSettings.tickets.activeTickets || {}
  const userTicket = Object.entries(activeTickets).find(([_, ticket]) => ticket.userId === interaction.user.id)

  if (userTicket) {
    return interaction.reply({
      content: `You already have an open ticket: <#${userTicket[0]}>`,
      ephemeral: true,
    })
  }

  try {
    // Get the category
    const category = await interaction.guild.channels.fetch(guildSettings.tickets.categoryId).catch(() => null)
    if (!category) {
      return interaction.reply({
        content: "The ticket category could not be found. Please contact an administrator.",
        ephemeral: true,
      })
    }

    // Get the support role
    const supportRole = await interaction.guild.roles.fetch(guildSettings.tickets.supportRoleId).catch(() => null)
    if (!supportRole) {
      return interaction.reply({
        content: "The support role could not be found. Please contact an administrator.",
        ephemeral: true,
      })
    }

    // Create the ticket channel
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0, // Text channel
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id, // @everyone
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: supportRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ],
    })

    // Create ticket embed
    const embed = new EmbedBuilder()
      .setTitle(`Ticket: ${subject}`)
      .setDescription(description)
      .setColor(0x5865f2)
      .addFields(
        { name: "Created by", value: interaction.user.tag, inline: true },
        { name: "User ID", value: interaction.user.id, inline: true },
        { name: "Created at", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      )
      .setFooter({ text: "Use /ticket close to close this ticket" })
      .setTimestamp()

    // Create close button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_close")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔒"),
    )

    // Send welcome message
    await ticketChannel.send({
      content: `${interaction.user} ${supportRole}\n\n${guildSettings.tickets.welcomeMessage}`,
      embeds: [embed],
      components: [row],
    })

    // Store ticket in database
    if (!guildSettings.tickets.activeTickets) {
      guildSettings.tickets.activeTickets = {}
    }

    guildSettings.tickets.activeTickets[ticketChannel.id] = {
      userId: interaction.user.id,
      subject,
      createdAt: Date.now(),
    }
    database.save()

    // Reply to the user
    await interaction.reply({
      content: `Your ticket has been created: ${ticketChannel}`,
      ephemeral: true,
    })
  } catch (error) {
    console.error("Error creating ticket:", error)
    await interaction.reply({
      content: "There was an error creating your ticket. Please try again later.",
      ephemeral: true,
    })
  }
}

// Handle verification question modal submit
async function handleVerifyQuestionModalSubmit(interaction) {
  // Get the answer from the modal
  const answer = interaction.fields.getTextInputValue("verification_answer")

  // Get guild settings
  const guildSettings = database.getGuild(interaction.guild.id)
  if (!guildSettings.verification || !guildSettings.verification.enabled) {
    return interaction.reply({
      content: "The verification system is not enabled on this server.",
      ephemeral: true,
    })
  }

  // Check if the answer is correct
  if (answer.toLowerCase() !== guildSettings.verification.answer) {
    return interaction.reply({
      content: "Incorrect answer. Please try again.",
      ephemeral: true,
    })
  }

  // Get verification role
  const role = await interaction.guild.roles.fetch(guildSettings.verification.roleId).catch(() => null)
  if (!role) {
    return interaction.reply({
      content: "The verification role could not be found. Please contact an administrator.",
      ephemeral: true,
    })
  }

  try {
    // Add role to user
    await interaction.member.roles.add(role, "User verified through question")

    await interaction.reply({
      content: "You have been successfully verified!",
      ephemeral: true,
    })
  } catch (error) {
    console.error("Error verifying user:", error)
    await interaction.reply({
      content: "There was an error verifying you. Please contact an administrator.",
      ephemeral: true,
    })
  }
}

// Function to update music dashboard
async function updateMusicDashboard(client, guildId) {
  if (!client.musicDashboards || !client.musicDashboards.has(guildId)) return

  const dashboardData = client.musicDashboards.get(guildId)
  const guild = client.guilds.cache.get(guildId)
  if (!guild) return

  const channel = guild.channels.cache.get(dashboardData.channelId)
  if (!channel) return

  const message = await channel.messages.fetch(dashboardData.messageId).catch(() => null)
  if (!message) return

  // Get the music queue
  const queue = client.musicQueues?.get(guildId)

  // Create updated embed
  const embed = new EmbedBuilder()
    .setColor(0xff0000) // YouTube red
    .setTitle("🎵 Music Dashboard")
    .setTimestamp()

  if (!queue || queue.songs.length === 0) {
    embed.setDescription(
      "**Currently Playing:** Nothing\n" +
        "**Duration:** 0:00 / 0:00\n" +
        "**Volume:** 50%\n\n" +
        "Use the buttons below to control music playback.\n" +
        "Queue a song with `/play`.",
    )
  } else {
    const currentSong = queue.songs[0]
    embed
      .setDescription(
        `**Currently Playing:** [${currentSong.title}](${currentSong.url})\n` +
          `**Duration:** ${currentSong.duration}\n` +
          `**Volume:** ${queue.volume}%\n` +
          `**Requested By:** ${currentSong.requestedBy}\n\n` +
          `**Up Next:** ${queue.songs.length > 1 ? `${queue.songs[1].title}` : "Nothing"}\n` +
          `**Queue Size:** ${queue.songs.length} song${queue.songs.length !== 1 ? "s" : ""}`,
      )
      .setThumbnail(currentSong.thumbnail)
  }

  embed.setFooter({ text: `Music dashboard | Updated ${new Date().toLocaleTimeString()}` })

  // Update the message
  await message.edit({
    embeds: [embed],
    components: message.components,
  })

  // Update last updated timestamp
  dashboardData.lastUpdated = Date.now()
  client.musicDashboards.set(guildId, dashboardData)
}

// Function to refresh roles dashboard
async function refreshRolesDashboard(interaction) {
  if (!interaction.client.roleDashboards || !interaction.client.roleDashboards.has(interaction.guild.id)) {
    return interaction.reply({
      content: "Role dashboard not found. Please create one with `/rolesdashboard`.",
      ephemeral: true,
    })
  }

  const dashboardData = interaction.client.roleDashboards.get(interaction.guild.id)
  const channel = interaction.guild.channels.cache.get(dashboardData.channelId)
  if (!channel) {
    return interaction.reply({
      content: "The dashboard channel could not be found.",
      ephemeral: true,
    })
  }

  const message = await channel.messages.fetch(dashboardData.messageId).catch(() => null)
  if (!message) {
    return interaction.reply({
      content: "The dashboard message could not be found.",
      ephemeral: true,
    })
  }

  // Get all role menus from the database
  const guildSettings = database.getGuild(interaction.guild.id)
  if (!guildSettings.roleMenus || guildSettings.roleMenus.length === 0) {
    return interaction.reply({
      content: "You don't have any role menus set up. Create some with `/rolemenu create` first.",
      ephemeral: true,
    })
  }

  // Create updated embed
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Role Management Dashboard")
    .setDescription(
      "Use this dashboard to manage your server's role menus and reaction roles.\n\n" +
        "**Available Role Menus:**\n" +
        guildSettings.roleMenus
          .map((menu, index) => `${index + 1}. **${menu.title}** - ${menu.roles.length} roles`)
          .join("\n"),
    )
    .setFooter({ text: "Use the buttons below to manage role menus" })
    .setTimestamp()

  // Update the message
  await message.edit({
    embeds: [embed],
    components: message.components,
  })

  // Update last updated timestamp
  dashboardData.lastUpdated = Date.now()
  interaction.client.roleDashboards.set(interaction.guild.id, dashboardData)

  await interaction.reply({
    content: "Role dashboard has been refreshed!",
    ephemeral: true,
  })
}

// Function to view a specific role menu
async function viewRoleMenu(interaction, menuIndex) {
  // Get guild settings
  const guildSettings = database.getGuild(interaction.guild.id)
  if (!guildSettings.roleMenus || guildSettings.roleMenus.length <= menuIndex) {
    return interaction.reply({
      content: "That role menu doesn't exist.",
      ephemeral: true,
    })
  }

  const menu = guildSettings.roleMenus[menuIndex]

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Role Menu: ${menu.title}`)
    .setDescription(menu.description)
    .addFields(
      menu.roles.map((role) => ({
        name: role.name,
        value: role.description,
        inline: true,
      })),
    )
    .setFooter({ text: `Menu ID: ${menu.id} • ${menu.allowMultiple ? "Multiple selection" : "Single selection"}` })
    .setTimestamp()

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
