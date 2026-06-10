/**
 * AstraX - plugins/commands/network/traceroute.js
 * Traceroute Path Analysis with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'traceroute',
  alias: ['trace', 'tracert', 'path', 'route'],
  desc: 'Trace network path to any host',
  category: 'network',
  usage: 'traceroute <host>',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── VALIDATE INPUT ───────────────────────────────────
      let host = args[0]?.trim().toLowerCase()

      if (!host) {
        const errorText = `
╭─────〔 TRACEROUTE 〕─────┈⊷
│ ◦➛ Usage: ${prefix}traceroute <host>
│ ◦➛ Example: ${prefix}traceroute google.com
│ ◦➛ Example: ${prefix}traceroute 8.8.8.8
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── CLEAN HOST ───────────────────────────────────────
      host = host.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0]

      // ─── SEND PROCESSING MESSAGE ──────────────────────────
      const processingMsg = await sock.sendMessage(from, {
        text: `╭─────〔 TRACING 〕─────┈⊷\n│ ◦➛ Tracing route to ${host}...\n│ ◦➛ This may take 10-30s\n╰─────────────────────────⊷`,
        contextInfo
      }, { quoted: m })

      // ─── TRACEROUTE APIS - 20 FREE FALLBACKS ──────────────
      const traceApis = [
        `https://api.hackertarget.com/mtr/?q=${host}`,
        `https://api.viewdns.info/traceroute/?host=${host}&apikey=demo&output=json`,
        `https://api.geekflare.com/v1/traceroute?url=${host}`,
        `https://api.dnslytics.com/v1/traceroute/${host}`,
        `https://api.networkcalc.com/api/traceroute/${host}`,
        `https://api.urlscan.io/v1/search/?q=domain:${host}`,
        `https://api.threatminer.org/v2/host.php?q=${host}&rt=5`,
        `https://api.robtex.com/trace/${host}`,
        `https://api.securitytrails.com/v1/domain/${host}/traceroute`,
        `https://api.censys.io/v1/view/ipv4/${host}`,
        `https://api.shodan.io/dns/domain/${host}`,
        `https://api.binaryedge.io/v2/query/ip/${host}`,
        `https://api.fullhunt.io/v1/domain/${host}/trace`,
        `https://api.whoisxmlapi.com/tracerouteapi?apiKey=demo&domainName=${host}`,
        `https://api.greynoise.io/v3/community/${host}`,
        `https://api.ipgeolocation.io/ipgeo?apiKey=demo&ip=${host}`,
        `https://api.db-ip.com/v2/free/${host}`,
        `https://api.ipdata.co/${host}?api-key=test`,
        `https://api.bigdatacloud.net/data/ip-geolocation?ip=${host}`,
        `https://api.2ip.io/${host}?token=demo`
      ]

      let traceData = null
      let hops = []

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < traceApis.length; i++) {
        try {
          const response = await axios.get(traceApis[i], {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          const data = response.data

          // Text format like "1 192.168.1.1 5.2ms"
          if (typeof data === 'string' && data.includes('ms')) {
            const lines = data.split('\n').filter(line => line.trim())
            hops = lines.slice(0, 15).map((line, idx) => {
              const parts = line.trim().split(/\s+/)
              return {
                hop: idx + 1,
                ip: parts[1] || '*',
                time: parts[2] || 'N/A'
              }
            })
            if (hops.length > 0) {
              traceData = { host, hops }
              break
            }
          }

          // JSON format
          if (data?.hops || data?.trace || data?.route) {
            const traceHops = data.hops || data.trace || data.route
            if (Array.isArray(traceHops)) {
              hops = traceHops.slice(0, 15).map((hop, idx) => ({
                hop: hop.hop || idx + 1,
                ip: hop.ip || hop.address || hop.host || '*',
                time: hop.rtt || hop.time || hop.latency || 'N/A'
              }))
              traceData = { host, hops }
              break
            }
          }

          // Generic array format
          if (Array.isArray(data) && data.length > 0) {
            hops = data.slice(0, 15).map((hop, idx) => ({
              hop: idx + 1,
              ip: hop.ip || hop.address || '*',
              time: hop.time || hop.rtt || 'N/A'
            }))
            traceData = { host, hops }
            break
          }
        } catch (e) {
          continue
        }
      }

      // ─── IF ALL FAILED ────────────────────────────────────
      if (!traceData || hops.length === 0) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to trace route
│ ◦➛ Host may be unreachable
╰─────────────────────────⊷
`
        await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: processingMsg })
        return
      }

      // ─── FORMAT HOPS ──────────────────────────────────────
      const hopList = hops.map(h => {
        const ip = h.ip === '*'? '***' : h.ip
        const time = typeof h.time === 'number'? `${h.time}ms` : h.time
        return `│ ◦➛ ${h.hop}. ${ip} ${time}`
      }).join('\n')

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 TRACEROUTE 〕─────┈⊷
│ ◦➛ Target: ${host}
│ ◦➛ Hops: ${hops.length}
│ ◦➛ Status: Complete
╰─────────────────────────⊷

╭─────〔 ROUTE PATH 〕─────┈⊷
${hopList}
${hops.length >= 15? '│ ◦➛...' : ''}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: processingMsg })

      logger.success('TRACEROUTE', `Traceroute: ${host} - ${hops.length} hops`)

    } catch (e) {
      logger.error('TRACEROUTE', 'Traceroute failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to trace route
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}