/**
 * AstraX - plugins/commands/tools/qr.js
 * QR Code Generator with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'qr',
  alias: ['qrcode', 'createqr', 'genqr'],
  desc: 'Generate QR code from text or URL',
  category: 'tools',
  usage: '.qr <text/url> | Reply to message',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET INPUT TEXT ───────────────────────────────────
      let text = args.join(' ').trim()

      // Check if replying to message
      if (!text && m.quoted) {
        text = m.quoted.text || m.quoted.caption || ''
      }

      // ─── VALIDATE INPUT ───────────────────────────────────
      if (!text) {
        const botname = await db.get('botname') || 'Bot'
        const prefix = await db.get('prefix') || '.'

        const errorText = `
╭─────〔 QR GENERATOR 〕─────┈⊷
│ ◦➛ Usage: ${prefix}qr <text>
│ ◦➛ Reply: ${prefix}qr [reply to text]
│ ◦➛ Example: ${prefix}qr https://google.com
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      if (text.length > 2000) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Text too long
│ ◦➛ Max: 2000 characters
│ ◦➛ Your input: ${text.length}
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── QR API LIST - 20 FREE FALLBACKS ──────────────────
      const qrApis = [
        `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(text)}`,
        `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=500`,
        `https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=${encodeURIComponent(text)}`,
        `https://qr-generator.qrcode.studio/qr/custom?data=${encodeURIComponent(text)}&size=500`,
        `https://api.apgy.in/qr/?data=${encodeURIComponent(text)}`,
        `https://qr-api.vercel.app/api/qr?text=${encodeURIComponent(text)}&size=500`,
        `https://qrickit.com/api/qr.php?d=${encodeURIComponent(text)}&qrsize=500`,
        `https://www.qrtag.net/api/qr_4.png?url=${encodeURIComponent(text)}`,
        `https://api.happi.dev/v1/qrcode?data=${encodeURIComponent(text)}&width=500`,
        `https://qrcode.tec-it.com/API/QRCode?data=${encodeURIComponent(text)}&size=Large`,
        `https://zxing.org/w/chart?cht=qr&chs=500x500&chl=${encodeURIComponent(text)}`,
        `https://goqr.me/api/qr?data=${encodeURIComponent(text)}&size=500`,
        `https://www.kuaishou.com/qr?text=${encodeURIComponent(text)}`,
        `https://qr-code-generator.online/api/qr?text=${encodeURIComponent(text)}`,
        `https://qrapi.io/qr?data=${encodeURIComponent(text)}&size=500`,
        `https://api.qr-code-generator.com/v1/create?data=${encodeURIComponent(text)}`,
        `https://qr.kitsunelab.com/api/qr?data=${encodeURIComponent(text)}`,
        `https://tools.learningcontainer.com/qrcode-api/?text=${encodeURIComponent(text)}`,
        `https://qrcode.ch/api/qr?text=${encodeURIComponent(text)}&size=500`,
        `https://qrcodescan.in/api/qr?data=${encodeURIComponent(text)}`
      ]

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      let qrBuffer = null

      for (let i = 0; i < qrApis.length; i++) {
        try {
          const response = await axios.get(qrApis[i], {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          if (response.status === 200 && response.data) {
            qrBuffer = response.data
            break
          }
        } catch (e) {
          // Silent fail - try next API
          continue
        }
      }

      // ─── IF ALL FAILED - SEND ERROR ───────────────────────
      if (!qrBuffer) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to generate QR
│ ◦➛ Try again later
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── SEND QR CODE ─────────────────────────────────────
      await sock.sendMessage(from, {
        image: qrBuffer,
        caption: `╭─────〔 QR CODE 〕─────┈⊷\n│ ◦➛ Content: ${text.slice(0, 50)}${text.length > 50? '...' : ''}\n╰─────────────────────────⊷`,
        contextInfo
      }, { quoted: m })

      logger.success('QR', `QR generated for ${m.key.participant || from}`)

    } catch (e) {
      logger.error('QR', 'QR generation failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to generate QR
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}