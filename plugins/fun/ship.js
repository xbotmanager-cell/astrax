/**
 * AstraX - plugins/commands/fun/ship.js
 * Ship Command - Calculate love compatibility between 2 users
 * Category: fun
 */

export default {
  name: 'ship',
  alias: ['love', 'couple', 'compatibility'],
  desc: 'Calculate love compatibility between two users',
  category: 'fun',
  usage: 'ship @user1 @user2',
  permission: 'all', // Changed from isOwner

  async execute(sock, m, args, { db, logger, contextInfo, from, isGroup, sender }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── GET MENTIONED USERS ──────────────────────────────
      let user1, user2
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

      if (mentioned.length >= 2) {
        user1 = mentioned[0]
        user2 = mentioned[1]
      } else if (mentioned.length === 1 && isGroup) {
        user1 = sender
        user2 = mentioned[0]
      } else {
        const errorText = `
╭─────〔 SHIP 〕─────┈⊷
│ ◦➛ Usage: ${prefix}ship @user1 @user2
│ ◦➛ Example: ${prefix}ship @john @jane
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── SAME USER CHECK ──────────────────────────────────
      if (user1 === user2) {
        const errorText = `
╭─────〔 SHIP 〕─────┈⊷
│ ◦➛ Can't ship same person
│ ◦➛ Try 2 different users
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      const name1 = user1.split('@')[0]
      const name2 = user2.split('@')[0]

      // ─── GET DISPLAY NAMES ────────────────────────────────
      let displayName1 = name1
      let displayName2 = name2

      try {
        const contact1 = await sock.onWhatsApp(user1)
        const contact2 = await sock.onWhatsApp(user2)
        if (contact1[0]?.notify) displayName1 = contact1[0].notify
        if (contact2[0]?.notify) displayName2 = contact2[0].notify
      } catch (e) {
        // Use numbers if name fetch fails
      }

      // ─── CALCULATE COMPATIBILITY ──────────────────────────
      const seed = name1.charCodeAt(0) + name2.charCodeAt(0) + name1.length + name2.length
      const percentage = (seed * 7) % 101

      // ─── GET SHIP NAME - BETTER DESIGN ────────────────────
      const cleanName1 = displayName1.replace(/[^a-zA-Z]/g, '').toLowerCase()
      const cleanName2 = displayName2.replace(/[^a-zA-Z]/g, '').toLowerCase()

      let shipName = ''
      if (cleanName1 && cleanName2) {
        const part1 = cleanName1.slice(0, Math.ceil(cleanName1.length / 2))
        const part2 = cleanName2.slice(Math.floor(cleanName2.length / 2))
        shipName = part1.charAt(0).toUpperCase() + part1.slice(1) + part2
      } else {
        // Fallback to numbers if no letters
        shipName = name1.slice(-3) + name2.slice(-3)
      }

      // ─── GET COMPATIBILITY MESSAGE ────────────────────────
      let message = ''
      let emoji = ''

      if (percentage >= 90) {
        message = 'Perfect match made in heaven'
        emoji = '💍💖'
      } else if (percentage >= 75) {
        message = 'Strong love connection'
        emoji = '💘❤️'
      } else if (percentage >= 60) {
        message = 'Good compatibility'
        emoji = '💕😊'
      } else if (percentage >= 45) {
        message = 'Maybe friends first'
        emoji = '🤝😅'
      } else if (percentage >= 30) {
        message = 'Needs some work'
        emoji = '💔😬'
      } else if (percentage >= 15) {
        message = 'Better as friends'
        emoji = '👫😂'
      } else {
        message = 'No chemistry at all'
        emoji = '🚫💔'
      }

      // ─── CREATE PROGRESS BAR ──────────────────────────────
      const filled = Math.floor(percentage / 10)
      const empty = 10 - filled
      const bar = '█'.repeat(filled) + '░'.repeat(empty)

      // ─── SEND RESULT ──────────────────────────────────────
      const resultText = `
╭─────〔 SHIP 〕─────┈⊷
│ ◦➛ Couple: ${displayName1} + ${displayName2}
│ ◦➛ Ship Name: ${shipName} ✨
├─────────────────────────⊷
│ ◦➛ Love: ${percentage}% ${emoji}
│ ◦➛ [${bar}]
├─────────────────────────⊷
│ ◦➛ ${message}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        mentions: [user1, user2],
        contextInfo
      }, { quoted: m })

      logger.success('SHIP', `Shipped ${displayName1} + ${displayName2} = ${percentage}%`)

    } catch (e) {
      logger.error('SHIP', 'Ship command failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to calculate
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}