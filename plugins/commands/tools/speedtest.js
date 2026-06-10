/**
 * AstraX - plugins/commands/tools/speedtest.js
 * Bot Response Time + Network Latency Test
 * 20 fallback ping methods for accuracy
 */

import axios from 'axios'
import { performance } from 'perf_hooks'
import os from 'os'

export default {
  name: 'speedtest',
  alias: ['nettest', 'latency', 'speed', 'network'],
  desc: 'Check bot response speed and network latency',
  category: 'tools',
  usage: 'speedtest',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── START TIMER ──────────────────────────────────────
      const startTime = performance.now()

      // ─── TEST ENDPOINTS - 20 FREE FALLBACKS ───────────────
      const pingUrls = [
        'https://www.google.com/generate_204',
        'https://www.cloudflare.com/cdn-cgi/trace',
        'https://1.1.1.1/cdn-cgi/trace',
        'https://www.youtube.com/generate_204',
        'https://www.facebook.com/generate_204',
        'https://www.amazon.com/generate_204',
        'https://www.wikipedia.org/generate_204',
        'https://www.github.com/generate_204',
        'https://www.netflix.com/generate_204',
        'https://www.twitter.com/generate_204',
        'https://www.reddit.com/generate_204',
        'https://www.tiktok.com/generate_204',
        'https://www.instagram.com/generate_204',
        'https://www.linkedin.com/generate_204',
        'https://www.microsoft.com/generate_204',
        'https://www.apple.com/generate_204',
        'https://www.yahoo.com/generate_204',
        'https://www.bing.com/generate_204',
        'https://httpbin.org/get',
        'https://api.github.com/zen'
      ]

      let networkLatency = null
      let testedEndpoint = ''

      // ─── TRY ALL ENDPOINTS SILENTLY ───────────────────────
      for (let i = 0; i < pingUrls.length; i++) {
        try {
          const pingStart = performance.now()
          const response = await axios.get(pingUrls[i], {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cache-Control': 'no-cache'
            }
          })
          const pingEnd = performance.now()

          if (response.status >= 200 && response.status < 400) {
            networkLatency = Math.round(pingEnd - pingStart)
            testedEndpoint = new URL(pingUrls[i]).hostname
            break
          }
        } catch (e) {
          continue
        }
      }

      // ─── CALCULATE BOT RESPONSE TIME ──────────────────────
      const endTime = performance.now()
      const botResponse = Math.round(endTime - startTime)

      // ─── GET SYSTEM INFO ──────────────────────────────────
      const uptime = process.uptime()
      const hours = Math.floor(uptime / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)
      const seconds = Math.floor(uptime % 60)

      const memUsage = process.memoryUsage()
      const ramUsed = (memUsage.heapUsed / 1024).toFixed(2)
      const ramTotal = (os.totalmem() / 1024).toFixed(2)

      // ─── DETERMINE SPEED STATUS ───────────────────────────
      let speedStatus = 'Fast'
      let speedEmoji = '🟢'

      if (botResponse > 500) {
        speedStatus = 'Slow'
        speedEmoji = '🔴'
      } else if (botResponse > 200) {
        speedStatus = 'Medium'
        speedEmoji = '🟡'
      }

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 SPEED TEST 〕─────┈⊷
│ ◦➛ Status: ${speedEmoji} ${speedStatus}
│ ◦➛ Response: ${botResponse}ms
│ ◦➛ Network: ${networkLatency? `${networkLatency}ms` : 'N/A'}
╰─────────────────────────⊷

╭─────〔 SYSTEM 〕─────┈⊷
│ ◦➛ Uptime: ${hours}h ${minutes}m ${seconds}s
│ ◦➛ RAM: ${ramUsed}MB / ${ramTotal}GB
│ ◦➛ Platform: ${os.platform()}
╰─────────────────────────⊷

╭─────〔 NETWORK 〕─────┈⊷
│ ◦➛ Tested: ${testedEndpoint || 'Multiple'}
│ ◦➛ Node: ${process.version}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('SPEEDTEST', `Ping: ${botResponse}ms | Network: ${networkLatency}ms`)

    } catch (e) {
      logger.error('SPEEDTEST', 'Speed test failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Speed test failed
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}