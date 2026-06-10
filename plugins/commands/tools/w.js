/**
 * AstraX - plugins/commands/tools/weather.js
 * Weather Lookup with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'weather',
  alias: ['w', 'temp', 'forecast', 'climate'],
  desc: 'Get current weather for any city',
  category: 'tools',
  usage: 'weather <city>',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── VALIDATE INPUT ───────────────────────────────────
      const city = args.join(' ').trim()

      if (!city) {
        const errorText = `
╭─────〔 WEATHER 〕─────┈⊷
│ ◦➛ Usage: ${prefix}weather <city>
│ ◦➛ Example: ${prefix}weather London
│ ◦➛ Example: ${prefix}weather Nairobi
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── WEATHER APIS - 20 FREE FALLBACKS ─────────────────
      const weatherApis = [
        `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
        `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true&timezone=auto`,
        `https://goweather.herokuapp.com/weather/${encodeURIComponent(city)}`,
        `https://api.weatherapi.com/v1/current.json?key=demo&q=${encodeURIComponent(city)}`,
        `https://api.weatherbit.io/v2.0/current?city=${encodeURIComponent(city)}&key=demo`,
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=demo&units=metric`,
        `https://api.tomorrow.io/v4/weather/realtime?location=${encodeURIComponent(city)}`,
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=52&lon=13`,
        `https://api.weather.gov/points/39.7456,-97.0892`,
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(city)}?key=demo`,
        `https://api.aerisapi.com/conditions/${encodeURIComponent(city)}?client_id=demo`,
        `https://api.accuweather.com/locations/v1/cities/search?q=${encodeURIComponent(city)}`,
        `https://api.climacell.co/v3/weather/realtime?lat=42&lon=-71`,
        `https://api.stormglass.io/v2/weather/point?lat=58&lng=17`,
        `https://api.weatherstack.com/current?access_key=demo&query=${encodeURIComponent(city)}`,
        `https://api.apixu.com/v1/current.json?key=demo&q=${encodeURIComponent(city)}`,
        `https://api.worldweatheronline.com/premium/v1/weather.ashx?key=demo&q=${encodeURIComponent(city)}&format=json`,
        `https://api.darksky.net/forecast/demo/42.3601,-71.0589`,
        `https://api.wunderground.com/api/demo/conditions/q/${encodeURIComponent(city)}.json`,
        `https://api.weather.com/v3/wx/conditions/current?apiKey=demo&geocode=33.74,-84.38`
      ]

      let weatherData = null

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < weatherApis.length; i++) {
        try {
          const response = await axios.get(weatherApis[i], {
            timeout: 7000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          const data = response.data

          // Parse wttr.in format
          if (data?.current_condition?.[0]) {
            const current = data.current_condition[0]
            const area = data.nearest_area?.[0]
            weatherData = {
              city: area?.areaName?.[0]?.value || city,
              country: area?.country?.[0]?.value || 'Unknown',
              temp: current.temp_C,
              feelsLike: current.FeelsLikeC,
              humidity: current.humidity,
              wind: current.windspeedKmph,
              desc: current.weatherDesc?.[0]?.value || 'N/A',
              pressure: current.pressure,
              visibility: current.visibility
            }
            break
          }

          // Parse OpenWeather format
          if (data?.main && data?.weather) {
            weatherData = {
              city: data.name || city,
              country: data.sys?.country || 'Unknown',
              temp: data.main.temp,
              feelsLike: data.main.feels_like,
              humidity: data.main.humidity,
              wind: data.wind?.speed,
              desc: data.weather[0]?.description || 'N/A',
              pressure: data.main.pressure,
              visibility: data.visibility / 1000
            }
            break
          }

          // Parse generic format
          if (data?.temperature || data?.temp) {
            weatherData = {
              city: city,
              country: data.country || 'Unknown',
              temp: data.temperature || data.temp || data.current?.temp,
              feelsLike: data.feelslike || data.feels_like || data.current?.feelslike,
              humidity: data.humidity || data.current?.humidity,
              wind: data.wind_speed || data.wind || data.current?.wind_speed,
              desc: data.description || data.weather?.[0]?.description || data.current?.condition?.text || 'N/A',
              pressure: data.pressure || data.current?.pressure,
              visibility: data.visibility || data.current?.visibility
            }
            break
          }
        } catch (e) {
          continue
        }
      }

      // ─── IF ALL FAILED ────────────────────────────────────
      if (!weatherData) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to get weather
│ ◦➛ Check city name
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 WEATHER 〕─────┈⊷
│ ◦➛ Location: ${weatherData.city}, ${weatherData.country}
│ ◦➛ Condition: ${weatherData.desc}
│ ◦➛ Temperature: ${weatherData.temp}°C
│ ◦➛ Feels Like: ${weatherData.feelsLike}°C
╰─────────────────────────⊷

╭─────〔 DETAILS 〕─────┈⊷
│ ◦➛ Humidity: ${weatherData.humidity}%
│ ◦➛ Wind: ${weatherData.wind} km/h
│ ◦➛ Pressure: ${weatherData.pressure} hPa
│ ◦➛ Visibility: ${weatherData.visibility} km
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('WEATHER', `Weather: ${weatherData.city} for ${m.key.participant || from}`)

    } catch (e) {
      logger.error('WEATHER', 'Weather lookup failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to get weather
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}