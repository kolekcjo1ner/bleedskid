const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const fetch = require("node:fetch")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Get the current weather for a location")
    .addStringOption((option) =>
      option.setName("location").setDescription("The city or location to get weather for").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("units")
        .setDescription("The units to display temperature in")
        .setRequired(false)
        .addChoices({ name: "Celsius", value: "metric" }, { name: "Fahrenheit", value: "imperial" }),
    ),
  async execute(interaction) {
    await interaction.deferReply()

    const location = interaction.options.getString("location")
    const units = interaction.options.getString("units") || "metric"
    const unitSymbol = units === "metric" ? "°C" : "°F"
    const speedUnit = units === "metric" ? "m/s" : "mph"

    try {
      // This is a mock implementation since we don't have actual API keys
      // In a real bot, you would use a weather API like OpenWeatherMap
      const weatherData = await mockWeatherAPI(location, units)

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(getWeatherColor(weatherData.weather.id))
        .setTitle(`Weather for ${weatherData.name}, ${weatherData.sys.country}`)
        .setDescription(`**${weatherData.weather.main}**: ${weatherData.weather.description}`)
        .setThumbnail(`https://openweathermap.org/img/wn/${weatherData.weather.icon}@2x.png`)
        .addFields(
          { name: "Temperature", value: `${weatherData.main.temp}${unitSymbol}`, inline: true },
          { name: "Feels Like", value: `${weatherData.main.feels_like}${unitSymbol}`, inline: true },
          { name: "Humidity", value: `${weatherData.main.humidity}%`, inline: true },
          { name: "Wind", value: `${weatherData.wind.speed} ${speedUnit}`, inline: true },
          { name: "Pressure", value: `${weatherData.main.pressure} hPa`, inline: true },
          { name: "Visibility", value: `${(weatherData.visibility / 1000).toFixed(1)} km`, inline: true },
        )
        .setFooter({ text: "Weather data provided by OpenWeatherMap" })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error("Weather API error:", error)
      await interaction.editReply("There was an error fetching weather data. Please try again later.")
    }
  },
}

// Mock weather API function (in a real bot, you would use an actual weather API)
async function mockWeatherAPI(location, units) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Generate random weather data based on location
  const locationHash = location
    .toLowerCase()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const rand = (min, max) => Math.floor(locationHash % (max - min + 1)) + min

  // Weather condition codes (simplified from OpenWeatherMap)
  const weatherConditions = [
    { id: 800, main: "Clear", description: "clear sky", icon: "01d" },
    { id: 801, main: "Clouds", description: "few clouds", icon: "02d" },
    { id: 802, main: "Clouds", description: "scattered clouds", icon: "03d" },
    { id: 803, main: "Clouds", description: "broken clouds", icon: "04d" },
    { id: 500, main: "Rain", description: "light rain", icon: "10d" },
    { id: 501, main: "Rain", description: "moderate rain", icon: "10d" },
    { id: 600, main: "Snow", description: "light snow", icon: "13d" },
    { id: 601, main: "Snow", description: "snow", icon: "13d" },
    { id: 701, main: "Mist", description: "mist", icon: "50d" },
    { id: 741, main: "Fog", description: "fog", icon: "50d" },
    { id: 781, main: "Tornado", description: "tornado", icon: "50d" },
    { id: 300, main: "Drizzle", description: "light intensity drizzle", icon: "09d" },
    { id: 200, main: "Thunderstorm", description: "thunderstorm with light rain", icon: "11d" },
  ]

  const weatherIndex = rand(0, weatherConditions.length - 1)
  const weather = weatherConditions[weatherIndex]

  // Temperature range based on weather condition
  let tempMin, tempMax
  if (weather.main === "Snow") {
    tempMin = -10
    tempMax = 2
  } else if (weather.main === "Rain" || weather.main === "Drizzle") {
    tempMin = 5
    tempMax = 15
  } else if (weather.main === "Thunderstorm") {
    tempMin = 15
    tempMax = 25
  } else if (weather.main === "Clear") {
    tempMin = 20
    tempMax = 35
  } else {
    tempMin = 10
    tempMax = 25
  }

  // Convert to Fahrenheit if needed
  if (units === "imperial") {
    tempMin = Math.round((tempMin * 9) / 5 + 32)
    tempMax = Math.round((tempMax * 9) / 5 + 32)
  }

  const temp = rand(tempMin, tempMax)
  const feelsLike = temp + rand(-3, 3)

  return {
    name: location.split(",")[0],
    sys: {
      country: location.includes(",") ? location.split(",")[1].trim() : "Unknown",
    },
    weather: weather,
    main: {
      temp,
      feels_like: feelsLike,
      humidity: rand(30, 90),
      pressure: rand(990, 1030),
    },
    wind: {
      speed: rand(0, 20),
      deg: rand(0, 359),
    },
    visibility: rand(5000, 10000),
  }
}

// Get color based on weather condition
function getWeatherColor(conditionId) {
  if (conditionId >= 200 && conditionId < 300) return 0x282828 // Thunderstorm - dark gray
  if (conditionId >= 300 && conditionId < 400) return 0x82a8d9 // Drizzle - light blue
  if (conditionId >= 500 && conditionId < 600) return 0x4287f5 // Rain - blue
  if (conditionId >= 600 && conditionId < 700) return 0xffffff // Snow - white
  if (conditionId >= 700 && conditionId < 800) return 0xc9c9c9 // Atmosphere - light gray
  if (conditionId === 800) return 0xffdd00 // Clear - yellow
  if (conditionId > 800) return 0xa4c2f4 // Clouds - light blue
  return 0x5865f2 // Default - Discord blue
}
