/**
 * AstraX - plugins/commands/network/headers.js
 * HTTP Headers Checker with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'headers',
  alias: ['httpheaders', 'header', 'response', 'reqheaders'],
  desc: 'Get HTTP response headers for any URL',
  category: 'network',
  usage: 'headers <url>',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── VALIDATE INPUT ───────────────────────────────────
      let url = args[0]?.trim()

      if (!url) {
        const errorText = `
╭─────〔 HTTP HEADERS 〕─────┈⊷
│ ◦➛ Usage: ${prefix}headers <url>
│ ◦➛ Example: ${prefix}headers google.com
│ ◦➛ Example: ${prefix}headers https://github.com
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── ADD HTTPS IF MISSING ─────────────────────────────
      if (!url.startsWith('http://') &&!url.startsWith('https://')) {
        url = 'https://' + url
      }

      // ─── VALIDATE URL FORMAT ──────────────────────────────
      try {
        new URL(url)
      } catch (e) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Invalid URL format
│ ◦➛ Example: google.com
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── HEADERS APIS - 20 FREE FALLBACKS ─────────────────
      const headersApis = [
        `https://api.hackertarget.com/httpheaders/?q=${url}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
        `https://api.urlscan.io/v1/result/`,
        `https://api.viewdns.info/httpheaders/?domain=${url}&apikey=demo&output=json`,
        `https://api.geekflare.com/v1/headers?url=${url}`,
        `https://api.dnslytics.com/v1/headers/${encodeURIComponent(url)}`,
        `https://api.securitytrails.com/v1/domain/${url}/headers`,
        `https://api.threatminer.org/v2/domain.php?q=${url}&rt=4`,
        `https://api.robtex.com/headers/${encodeURIComponent(url)}`,
        `https://api.binaryedge.io/v2/query/domains/${url}`,
        `https://api.fullhunt.io/v1/domain/${url}/headers`,
        `https://api.shodan.io/dns/domain/${url}`,
        `https://api.censys.io/v1/view/websites/${url}`,
        `https://api.whoisxmlapi.com/httpapi?apiKey=demo&url=${url}`,
        `https://api.builtwith.com/v1/api.json?KEY=demo&LOOKUP=${url}`,
        `https://api.whatweb.net/v1/check?url=${url}`,
        `https://api.wappalyzer.com/v2/lookup/?url=${url}`,
        `https://api.netcraft.com/api/v3/domain/${url}`
      ]

      let headersData = null
      let statusCode = null

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < headersApis.length; i++) {
        try {
          const response = await axios.get(headersApis[i], {
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 5
          })

          // Direct headers response
          if (response.headers && Object.keys(response.headers).length > 0) {
            headersData = response.headers
            statusCode = response.status
            break
          }

          // Proxy format with status/headers
          if (response.data?.status?.http_code) {
            headersData = response.data.headers || {}
            statusCode = response.data.status.http_code
            break
          }

          // JSON format
          if (response.data?.headers) {
            headersData = response.data.headers
            statusCode = response.data.status || response.data.status_code || 200
            break
          }

          // Text format
          if (typeof response.data === 'string' && response.data.includes('HTTP')) {
            const lines = response.data.split('\n')
            const parsedHeaders = {}
            lines.forEach(line => {
              const [key,...values] = line.split(':')
              if (key && values.length) {
                parsedHeaders[key.trim()] = values.join(':').trim()
              }
            })
            if (Object.keys(parsedHeaders).length > 0) {
              headersData = parsedHeaders
              statusCode = 200
              break
            }
          }
        } catch (e) {
          continue
        }
      }

      // ─── DIRECT REQUEST AS FINAL FALLBACK ─────────────────
      if (!headersData) {
        try {
          const response = await axios.head(url, {
            timeout: 8000,
            maxRedirects: 5,
            validateStatus: () => true
          })
          headersData = response.headers
          statusCode = response.status
        } catch (e) {
          // Silent fail
        }
      }

      // ─── IF ALL FAILED ────────────────────────────────────
      if (!headersData || Object.keys(headersData).length === 0) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to fetch headers
│ ◦➛ Check URL and try again
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── PRIORITY HEADERS TO SHOW ─────────────────────────
      const priorityHeaders = [
        'server', 'content-type', 'content-length', 'date', 'cache-control',
        'expires', 'last-modified', 'etag', 'location', 'set-cookie',
        'x-powered-by', 'x-frame-options', 'x-content-type-options',
        'strict-transport-security', 'content-security-policy', 'access-control-allow-origin'
      ]

      const foundHeaders = []
      const otherHeaders = []

      // Sort headers by priority
      Object.entries(headersData).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase()
        if (priorityHeaders.includes(lowerKey)) {
          foundHeaders.push({ key, value })
        } else if (otherHeaders.length < 5) {
          otherHeaders.push({ key, value })
        }
      })

      // ─── FORMAT HEADERS ───────────────────────────────────
      const formatValue = (val) => {
        if (typeof val!== 'string') val = String(val)
        return val.length > 60? val.slice(0, 60) + '...' : val
      }

      const headerList = [...foundHeaders,...otherHeaders].slice(0, 12).map(h => {
        return `│ ◦➛ ${h.key}: ${formatValue(h.value)}`
      }).join('\n')

      // ─── DETERMINE STATUS EMOJI ───────────────────────────
      let statusEmoji = '🟢'
      if (statusCode >= 400) statusEmoji = '🔴'
      else if (statusCode >= 300) statusEmoji = '🟡'

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 HTTP HEADERS 〕─────┈⊷
│ ◦➛ URL: ${url.length > 35? url.slice(0, 35) + '...' : url}
│ ◦➛ Status: ${statusEmoji} ${statusCode || 'N/A'}
╰─────────────────────────⊷

╭─────〔 HEADERS 〕─────┈⊷
${headerList}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('HEADERS', `Headers check: ${url} - ${statusCode}`)

    } catch (e) {
      logger.error('HEADERS', 'Headers check failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to fetch headers
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}