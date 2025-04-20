// This is a simple in-memory database for demonstration
// In a real bot, you would use a proper database like MongoDB, SQLite, etc.
const fs = require("node:fs")
const path = require("node:path")

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, "../data/database.json")
    this.data = this.load()
  }

  load() {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Create file if it doesn't exist
      if (!fs.existsSync(this.dbPath)) {
        fs.writeFileSync(
          this.dbPath,
          JSON.stringify({
            users: {},
            guilds: {},
            reactionRoles: {},
          }),
        )
      }

      const data = JSON.parse(fs.readFileSync(this.dbPath, "utf8"))
      return data
    } catch (error) {
      console.error("Error loading database:", error)
      return { users: {}, guilds: {}, reactionRoles: {} }
    }
  }

  save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2))
      return true
    } catch (error) {
      console.error("Error saving database:", error)
      return false
    }
  }

  // User methods
  getUser(userId) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        lastfm: null,
        economy: {
          balance: 0,
          lastDaily: null,
          lastWork: null,
          buffs: {},
        },
        xp: {
          level: 1,
          xp: 0,
          totalXp: 0,
          lastMessageTime: null,
        },
      }
      this.save()
    }
    return this.data.users[userId]
  }

  setLastFM(userId, username) {
    const user = this.getUser(userId)
    user.lastfm = username
    return this.save()
  }

  getLastFM(userId) {
    return this.getUser(userId).lastfm
  }

  // Guild methods
  getGuild(guildId) {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {
        prefix: "!",
        welcomeChannel: null,
        autoRole: null,
        modLogChannel: null,
        voiceMaster: {
          enabled: false,
          categoryId: null,
          createChannelId: null,
          channels: {},
        },
        levelSystem: {
          enabled: false,
          announceChannel: null,
          roles: {},
        },
        customCommands: {},
      }
      this.save()
    }
    return this.data.guilds[guildId]
  }

  setPrefix(guildId, prefix) {
    const guild = this.getGuild(guildId)
    guild.prefix = prefix
    return this.save()
  }

  getPrefix(guildId) {
    return this.getGuild(guildId).prefix
  }
}

module.exports = new Database()
