const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = require("node:fetch")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("Translate text to another language")
    .addStringOption((option) => option.setName("text").setDescription("The text to translate").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("to")
        .setDescription("The language to translate to")
        .setRequired(true)
        .addChoices(
          { name: "English", value: "en" },
          { name: "Spanish", value: "es" },
          { name: "French", value: "fr" },
          { name: "German", value: "de" },
          { name: "Italian", value: "it" },
          { name: "Portuguese", value: "pt" },
          { name: "Russian", value: "ru" },
          { name: "Japanese", value: "ja" },
          { name: "Chinese", value: "zh" },
          { name: "Korean", value: "ko" },
          { name: "Arabic", value: "ar" },
          { name: "Hindi", value: "hi" },
          { name: "Dutch", value: "nl" },
          { name: "Polish", value: "pl" },
          { name: "Turkish", value: "tr" },
          { name: "Swedish", value: "sv" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("from")
        .setDescription("The language to translate from (auto-detect if not specified)")
        .setRequired(false)
        .addChoices(
          { name: "Auto-detect", value: "auto" },
          { name: "English", value: "en" },
          { name: "Spanish", value: "es" },
          { name: "French", value: "fr" },
          { name: "German", value: "de" },
          { name: "Italian", value: "it" },
          { name: "Portuguese", value: "pt" },
          { name: "Russian", value: "ru" },
          { name: "Japanese", value: "ja" },
          { name: "Chinese", value: "zh" },
          { name: "Korean", value: "ko" },
          { name: "Arabic", value: "ar" },
          { name: "Hindi", value: "hi" },
          { name: "Dutch", value: "nl" },
          { name: "Polish", value: "pl" },
          { name: "Turkish", value: "tr" },
          { name: "Swedish", value: "sv" },
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply()

    const text = interaction.options.getString("text")
    const targetLang = interaction.options.getString("to")
    const sourceLang = interaction.options.getString("from") || "auto"

    try {
      // This is a mock implementation since we don't have actual API keys
      // In a real bot, you would use a translation API like Google Translate, DeepL, or LibreTranslate
      const translation = await mockTranslate(text, sourceLang, targetLang)

      // Get language names
      const sourceLanguage = getLanguageName(translation.detectedLanguage || sourceLang)
      const targetLanguage = getLanguageName(targetLang)

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Translation")
        .addFields(
          { name: `Original (${sourceLanguage})`, value: text },
          { name: `Translation (${targetLanguage})`, value: translation.translatedText },
        )
        .setFooter({ text: "Powered by Translation API" })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error("Translation error:", error)
      await interaction.editReply("There was an error translating your text. Please try again later.")
    }
  },
}

// Mock translation function (in a real bot, you would use an actual translation API)
async function mockTranslate(text, sourceLang, targetLang) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Simple mock translations for demonstration
  const mockTranslations = {
    en: {
      es: "Texto traducido al español",
      fr: "Texte traduit en français",
      de: "Text ins Deutsche übersetzt",
      ja: "日本語に翻訳されたテキスト",
    },
    es: {
      en: "Text translated to English",
      fr: "Texte traduit en français",
      de: "Text ins Deutsche übersetzt",
    },
    fr: {
      en: "Text translated to English",
      es: "Texto traducido al español",
      de: "Text ins Deutsche übersetzt",
    },
    auto: {
      en: "Text translated to English",
      es: "Texto traducido al español",
      fr: "Texte traduit en français",
      de: "Text ins Deutsche übersetzt",
      ja: "日本語に翻訳されたテキスト",
    },
  }

  // Detect language if auto
  let detectedLanguage = sourceLang
  if (sourceLang === "auto") {
    // Simple mock detection based on first character
    const firstChar = text.charAt(0).toLowerCase()
    if ("abcdefghijklmnopqrstuvwxyz".includes(firstChar)) {
      detectedLanguage = "en"
    } else if ("áéíóúüñ".includes(firstChar)) {
      detectedLanguage = "es"
    } else if ("àâçéèêëîïôùûü".includes(firstChar)) {
      detectedLanguage = "fr"
    } else if ("äöüß".includes(firstChar)) {
      detectedLanguage = "de"
    } else {
      detectedLanguage = "en" // Default to English
    }
  }

  // Get translation
  const translatedText =
    mockTranslations[detectedLanguage]?.[targetLang] ||
    mockTranslations.auto[targetLang] ||
    `[Translation to ${targetLang}]`

  return {
    translatedText,
    detectedLanguage,
  }

  return {
    translatedText,
    detectedLanguage,
  }
}

// Get language name from code
function getLanguageName(code) {
  const languages = {
    auto: "Auto-detect",
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    nl: "Dutch",
    pl: "Polish",
    tr: "Turkish",
    sv: "Swedish",
  }

  return languages[code] || code
}
