/**
 * AstraX - plugins/commands/tools/shorturl.js
 * URL Shortener with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'shorturl',
  alias: ['short', 'shorten', 'tinyurl', 'surl'],
  desc: 'Shorten long URLs',
  category: 'tools',
  usage: 'shorturl <url>',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── VALIDATE INPUT ───────────────────────────────────
      let url = args[0]?.trim()

      if (!url) {
        const errorText = `
╭─────〔 URL SHORTENER 〕─────┈⊷
│ ◦➛ Usage: ${prefix}short <url>
│ ◦➛ Example: ${prefix}short https://google.com
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

      // ─── URL SHORTENER APIS - 20 FREE FALLBACKS ───────────
      const shortApis = [
        { url: `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(url)}`, type: 'json', key: 'result.full_short_link' },
        { url: `https://clck.ru/--?url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://ulvis.net/api.php?url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://cutt.ly/api.php?key=demo&short=${encodeURIComponent(url)}`, type: 'json', key: 'url.shortLink' },
        { url: `https://api.tiny.cc/v1/shorten?url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://tny.im/yourls-api.php?format=simple&action=shorturl&url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://cleanuri.com/api/v1/shorten`, type: 'post', data: { url }, key: 'result_url' },
        { url: `https://spoo.me/`, type: 'post', data: { url }, key: 'short_url' },
        { url: `https://1pt.co/addURL?long=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://url.vin/api/short?url=${encodeURIComponent(url)}`, type: 'json', key: 'shorturl' },
        { url: `https://chilp.it/api.php?url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://kutt.it/api/v2/links`, type: 'post', data: { target: url }, key: 'link' },
        { url: `https://short.io/api/shorten`, type: 'post', data: { originalURL: url }, key: 'shortURL' },
        { url: `https://linkn.co/api/short`, type: 'post', data: { url }, key: 'short_url' },
        { url: `https://qps.ru/api?url=${encodeURIComponent(url)}`, type: 'text' },
        { url: `https://0x0.st`, type: 'post', data: { url }, key: 'text' },
        { url: `https://da.gd/s?url=${encodeURIComponent(url)}`, type: 'text' }
      ]

      let shortUrl = null

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < shortApis.length; i++) {
        try {
          const api = shortApis[i]
          let response

          if (api.type === 'post') {
            response = await axios.post(api.url, api.data, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json'
              }
            })
          } else {
            response = await axios.get(api.url, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            })
          }

          // Parse response based on type
          if (api.type === 'text' && typeof response.data === 'string' && response.data.startsWith('http')) {
            shortUrl = response.data.trim()
            break
          }

          if (api.type === 'json' || api.type === 'post') {
            const data = response.data
            if (api.key) {
              // Navigate nested keys like 'result.full_short_link'
              const keys = api.key.split('.')
              let value = data
              for (const k of keys) {
                value = value?.[k]
              }
              if (value && typeof value === 'string' && value.startsWith('http')) {
                shortUrl = value
                break
              }
            } else if (data?.short_url || data?.shortUrl || data?.url) {
              shortUrl = data.short_url || data.shortUrl || data.url
              break
            }
          }
        } catch (e) {
          continue
        }
      }

      // ─── IF ALL FAILED ────────────────────────────────────
      if (!shortUrl) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to shorten URL
│ ◦➛ Try again later
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── SEND SHORT URL ───────────────────────────────────
      const resultText = `
╭─────〔 SHORT URL 〕─────┈⊷
│ ◦➛ Original: ${url.length > 40? url.slice(0, 40) + '...' : url}
│ ◦➛ Short: ${shortUrl}
╰─────────────────────────⊷

╭─────〔 INFO 〕─────┈⊷
│ ◦➛ Tap to copy link
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('SHORTURL', `Shortened: ${url} -> ${shortUrl}`)

    } catch (e) {
      logger.error('SHORTURL', 'Shorten failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to shorten URL
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}