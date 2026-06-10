/**
 * AstraX - plugins/commands/group management/setgcpp.js
 * Set Group Profile Picture - Reply image, Link, Tag, Number
 * No admin check from router - handles all errors directly
 * Category: group management
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import axios from 'axios'

export default {
  name: 'setgcpp',
  alias: ['setgcpic', 'setgrouppic', 'grouppic'],
  desc: 'Set group profile picture from image',
  category: 'group management',
  usage: 'setgcpp | reply to image | setgcpp <url> | setgcpp @user | setgcpp 255xxx',
  permission: 'isOwner',

  async execute(sock, m, args, { db, logger, contextInfo, from, isGroup, sender }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── CHECK IF GROUP ───────────────────────────────────
      if (!isGroup) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Group command only
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── GET GROUP METADATA ───────────────────────────────
      let groupMetadata
      try {
        groupMetadata = await sock.groupMetadata(from)
      } catch (e) {
        const errorText = `
╭─────〔 ERROR 403 〕─────┈⊷
│ ◦➛ Bot needs to be in group
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── GET IMAGE BUFFER FROM MULTIPLE SOURCES ───────────
      let imageBuffer = null
      let source = ''

      // 1. From reply image
      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
      if (quoted?.imageMessage) {
        try {
          const stream = await downloadContentFromMessage(quoted.imageMessage, 'image')
          let buffer = Buffer.from([])
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
          }
          imageBuffer = buffer
          source = 'reply'
        } catch (e) {
          logger.error('SETGCPP', 'Failed to download replied image', e.message)
        }
      }

      // 2. From URL in args
      if (!imageBuffer && args[0] && /^https?:\/\//.test(args[0])) {
        try {
          const response = await axios.get(args[0], {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })
          imageBuffer = Buffer.from(response.data)
          source = 'url'
        } catch (e) {
          const errorText = `
╭─────〔 ERROR 400 〕─────┈⊷
│ ◦➛ Invalid image URL
│ ◦➛ Or download failed
╰─────────────────────────⊷
`
          return await sock.sendMessage(from, {
            text: errorText.trim(),
            contextInfo
          }, { quoted: m })
        }
      }

      // 3. From tagged user profile pic
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      if (!imageBuffer && mentioned.length > 0) {
        try {
          const ppUrl = await sock.profilePictureUrl(mentioned[0], 'image')
          const response = await axios.get(ppUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
          })
          imageBuffer = Buffer.from(response.data)
          source = 'user_tag'
        } catch (e) {
          const errorText = `
╭─────〔 ERROR 404 〕─────┈⊷
│ ◦➛ User has no profile pic
╰─────────────────────────⊷
`
          return await sock.sendMessage(from, {
            text: errorText.trim(),
            contextInfo
          }, { quoted: m })
        }
      }

      // 4. From phone number
      if (!imageBuffer && args[0] && /^[\d+]+$/.test(args[0])) {
        try {
          let number = args[0].replace(/[^0-9]/g, '')
          if (!number.includes('@')) {
            number = number + '@s.whatsapp.net'
          }
          const ppUrl = await sock.profilePictureUrl(number, 'image')
          const response = await axios.get(ppUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
          })
          imageBuffer = Buffer.from(response.data)
          source = 'number'
        } catch (e) {
          const errorText = `
╭─────〔 ERROR 404 〕─────┈⊷
│ ◦➛ Number has no profile pic
╰─────────────────────────⊷
`
          return await sock.sendMessage(from, {
            text: errorText.trim(),
            contextInfo
          }, { quoted: m })
        }
      }

      // 5. From reply text containing image URL
      if (!imageBuffer && quoted) {
        const quotedText = quoted.conversation ||
                          quoted.extendedTextMessage?.text ||
                          quoted.imageMessage?.caption ||
                          quoted.videoMessage?.caption || ''

        const urlMatch = quotedText.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|webp))/i)
        if (urlMatch) {
          try {
            const response = await axios.get(urlMatch[0], {
              responseType: 'arraybuffer',
              timeout: 15000
            })
            imageBuffer = Buffer.from(response.data)
            source = 'reply_url'
          } catch (e) {
            logger.error('SETGCPP', 'Failed to download image from reply URL', e.message)
          }
        }
      }

      // ─── VALIDATE IMAGE BUFFER ────────────────────────────
      if (!imageBuffer) {
        const errorText = `
╭─────〔 SETGCPP 〕─────┈⊷
│ ◦➛ Reply to an image
│ ◦➛ Or ${prefix}setgcpp <url>
│ ◦➛ Or ${prefix}setgcpp @user
│ ◦➛ Or ${prefix}setgcpp 255xxx
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── EXECUTE SET GROUP PP ─────────────────────────────
      try {
        await sock.updateProfilePicture(from, imageBuffer)

        const successText = `
╭─────〔 SUCCESS 200 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Profile pic updated
│ ◦➛ Source: ${source}
╰─────────────────────────⊷
`
        await sock.sendMessage(from, {
          text: successText.trim(),
          contextInfo
        }, { quoted: m })

        logger.success('SETGCPP', `Updated group pic for ${groupMetadata.subject} from ${source}`)

      } catch (e) {
        const errMsg = e.message || e.toString()
        let errorText = ''

        // 403 - Bot not admin
        if (errMsg.includes('403') || errMsg.includes('forbidden')) {
          errorText = `
╭─────〔 ERROR 403 〕─────┈⊷
│ ◦➛ Bot needs admin rights
╰─────────────────────────⊷
`
        }
        // 401 - Not admin / Not authorized
        else if (errMsg.includes('401') || errMsg.includes('not-authorized')) {
          errorText = `
╭─────〔 ERROR 401 〕─────┈⊷
│ ◦➛ You need admin rights
╰─────────────────────────⊷
`
        }
        // 400 - Bad request / Invalid image
        else if (errMsg.includes('400') || errMsg.includes('bad-request')) {
          errorText = `
╭─────〔 ERROR 400 〕─────┈⊷
│ ◦➛ Invalid image format
│ ◦➛ Use JPG/PNG/WEBP
╰─────────────────────────⊷
`
        }
        // 413 - Image too large
        else if (errMsg.includes('413') || errMsg.includes('too-large')) {
          errorText = `
╭─────〔 ERROR 413 〕─────┈⊷
│ ◦➛ Image too large
│ ◦➛ Max size: 5MB
╰─────────────────────────⊷
`
        }
        // 429 - Rate limited
        else if (errMsg.includes('429') || errMsg.includes('rate')) {
          errorText = `
╭─────〔 ERROR 429 〕─────┈⊷
│ ◦➛ Too many requests
│ ◦➛ Try again later
╰─────────────────────────⊷
`
        }
        // 500 - Server error
        else if (errMsg.includes('500') || errMsg.includes('server')) {
          errorText = `
╭─────〔 ERROR 500 〕─────┈⊷
│ ◦➛ WhatsApp server error
╰─────────────────────────⊷
`
        }
        else {
          errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to set pic
╰─────────────────────────⊷
`
        }

        logger.error('SETGCPP', 'Failed to update group pic', errMsg)
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

    } catch (e) {
      logger.error('SETGCPP', 'Setgcpp command failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to execute
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}