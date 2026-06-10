/**
 * AstraX - plugins/commands/utilities/timestamp.js
 * Unix Timestamp Converter with 20 free API fallbacks
 * Silent fallback - user never sees errors
 * Local fallback for offline conversion
 */

import axios from 'axios'

export default {
  name: 'timestamp',
  alias: ['time', 'ts', 'unix', 'epoch', 'date'],
  desc: 'Convert Unix timestamp or get current time',
  category: 'utilities',
  usage: 'timestamp [timestamp|date]',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      const input = args.join(' ').trim()

      // ─── NO INPUT = CURRENT TIMESTAMP ─────────────────────
      if (!input) {
        const now = Date.now()
        const unixSec = Math.floor(now / 1000)
        const unixMs = now
        const date = new Date(now)
        
        const resultText = `
╭─────〔 TIMESTAMP 〕─────┈⊷
│ ◦➛ Current Time
╰─────────────────────────⊷

╭─────〔 UNIX TIME 〕─────┈⊷
│ ◦➛ Seconds: ${unixSec}
│ ◦➛ Milliseconds: ${unixMs}
╰─────────────────────────⊷

╭─────〔 READABLE 〕─────┈⊷
│ ◦➛ UTC: ${date.toUTCString()}
│ ◦➛ ISO: ${date.toISOString()}
│ ◦➛ Local: ${date.toLocaleString()}
╰─────────────────────────⊷

╭─────〔 USAGE 〕─────┈⊷
│ ◦➛ ${prefix}timestamp 1735689600
│ ◦➛ ${prefix}timestamp 2025-01-01
╰─────────────────────────⊷
`
        const mainMsg = await sock.sendMessage(from, {
          text: resultText.trim(),
          contextInfo
        }, { quoted: m })

        // Send raw timestamp for easy copy
        await sock.sendMessage(from, {
          text: String(unixSec),
          contextInfo
        }, { quoted: mainMsg })

        return
      }

      // ─── CHECK IF INPUT IS NUMBER ─────────────────────────
      const isNumeric = /^\d+$/.test(input)
      let timestamp = null
      let dateObj = null

      if (isNumeric) {
        // Input is timestamp
        const num = parseInt(input)
        timestamp = num < 10000000000? num * 1000 : num
        dateObj = new Date(timestamp)
      } else {
        // Input is date string
        dateObj = new Date(input)
        if (isNaN(dateObj.getTime())) {
          const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Invalid date format
│ ◦➛ Use: YYYY-MM-DD or timestamp
╰─────────────────────────⊷
`
          return await sock.sendMessage(from, {
            text: errorText.trim(),
            contextInfo
          }, { quoted: m })
        }
        timestamp = dateObj.getTime()
      }

      // ─── TIMESTAMP APIS - 20 FREE FALLBACKS ───────────────
      const timeApis = [
        `https://api.timeapi.io/v1/timestamp/${Math.floor(timestamp / 1000)}`,
        `https://api.unixtimestamp.com/api/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.timeapi.io/v1/timestamp/${Math.floor(timestamp / 1000)}`)}`,
        `https://api.codetabs.com/v1/proxy?quest=https://api.timeapi.io/v1/timestamp/${Math.floor(timestamp / 1000)}`,
        `https://api.cors.lol/?url=https://api.timeapi.io/v1/timestamp/${Math.floor(timestamp / 1000)}`,
        `https://api.timestampapi.com/v1/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.timeutils.com/v1/timestamp/${Math.floor(timestamp / 1000)}`,
        `https://api.dateapi.com/v1/timestamp/${Math.floor(timestamp / 1000)}`,
        `https://api.epochapi.com/v1/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.unixtimeapi.com/v1/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.texttools.io/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.devutils.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.converttools.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.stringtools.io/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.enctools.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.webtools.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.online-tools.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.utilitytools.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.devtools.io/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`,
        `https://api.coderstools.com/v1/timestamp/convert/${Math.floor(timestamp / 1000)}`
      ]

      let apiData = null

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < timeApis.length; i++) {
        try {
          const response = await axios.get(timeApis[i], {
            timeout: 7000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          const data = response.data

          // JSON response with date info
          if (data?.datetime || data?.date || data?.timestamp || data?.unix) {
            apiData = {
              utc: data.datetime || data.utc || data.date,
              timezone: data.timezone || 'UTC',
              unix: data.timestamp || data.unix || Math.floor(timestamp / 1000)
            }
            break
          }
        } catch (e) {
          continue
        }
      }

      // ─── USE LOCAL DATA IF API FAILED ─────────────────────
      const unixSec = Math.floor(timestamp / 1000)
      const unixMs = timestamp
      const utc = apiData?.utc || dateObj.toUTCString()
      const iso = dateObj.toISOString()
      const local = dateObj.toLocaleString()

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 TIMESTAMP 〕─────┈⊷
│ ◦➛ ${isNumeric? 'Timestamp Input' : 'Date Input'}
╰─────────────────────────⊷

╭─────〔 UNIX TIME 〕─────┈⊷
│ ◦➛ Seconds: ${unixSec}
│ ◦➛ Milliseconds: ${unixMs}
╰─────────────────────────⊷

╭─────〔 READABLE 〕─────┈⊷
│ ◦➛ UTC: ${utc}
│ ◦➛ ISO: ${iso}
│ ◦➛ Local: ${local}
╰─────────────────────────⊷
`
      const mainMsg = await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      // ─── SEND RAW TIMESTAMP FOR EASY COPY ─────────────────
      await sock.sendMessage(from, {
        text: String(unixSec),
        contextInfo
      }, { quoted: mainMsg })

      logger.success('TIMESTAMP', `Timestamp converted: ${unixSec}`)

    } catch (e) {
      logger.error('TIMESTAMP', 'Timestamp conversion failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to convert
│ ◦➛ Check your input
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}