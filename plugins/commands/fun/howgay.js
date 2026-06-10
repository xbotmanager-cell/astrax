/**
 * AstraX - plugins/commands/fun/howgay.js
 * HowGay Command - Fun gay percentage meter
 * Category: fun
 */

export default {
  name: 'howgay',
  alias: ['gay', 'gaymeter', 'gayrate'],
  desc: 'Check how gay someone is - just for fun!',
  category: 'fun',
  usage: 'howgay @user | howgay me',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from, isGroup, sender }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── GET TARGET USER ──────────────────────────────────
      let target
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

      if (mentioned.length > 0) {
        target = mentioned[0]
      } else if (args[0]?.toLowerCase() === 'me') {
        target = sender
      } else if (isGroup) {
        target = sender
      } else {
        const errorText = `
╭─────〔 HOWGAY 〕─────┈⊷
│ ◦➛ Usage: ${prefix}howgay @user
│ ◦➛ Usage: ${prefix}howgay me
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      const name = target.split('@')[0]
      let displayName = name

      // ─── GET DISPLAY NAME ─────────────────────────────────
      try {
        const contact = await sock.onWhatsApp(target)
        if (contact[0]?.notify) displayName = contact[0].notify
      } catch (e) {}

      // ─── CALCULATE GAY PERCENTAGE ─────────────────────────
      const seed = displayName.charCodeAt(0) + displayName.length + displayName.charCodeAt(displayName.length - 1)
      const percentage = seed % 101 // 0-100

      // ─── GET COMMENT BASED ON PERCENTAGE ──────────────────
      let comment = ''
      let emoji = ''

      if (percentage === 0) {
        comment = 'Certified straight as a ruler 📏'
        emoji = '😎'
      } else if (percentage <= 10) {
        comment = 'Barely even pinky toe gay 🦶'
        emoji = '😏'
      } else if (percentage <= 20) {
        comment = 'Just a little sus 🤨'
        emoji = '🤔'
      } else if (percentage <= 30) {
        comment = 'Rainbow adjacent 🌈'
        emoji = '😜'
      } else if (percentage <= 40) {
        comment = 'Getting colorful 🎨'
        emoji = '😋'
      } else if (percentage <= 50) {
        comment = 'Halfway to fabulous ✨'
        emoji = '😘'
      } else if (percentage <= 60) {
        comment = 'Definitely serving looks 💅'
        emoji = '💁'
      } else if (percentage <= 70) {
        comment = 'Yassified energy 💃'
        emoji = '🕺'
      } else if (percentage <= 80) {
        comment = 'Full rainbow mode activated 🌈'
        emoji = '🏳️‍🌈'
      } else if (percentage <= 90) {
        comment = 'Slaying harder than ever 👑'
        emoji = '💖'
      } else if (percentage < 100) {
        comment = 'Certified queen/king behavior 👸'
        emoji = '✨'
      } else {
        comment = 'GOD TIER GAY - LEGENDARY STATUS 🌈👑'
        emoji = '🔥'
      }

      // ─── CREATE PROGRESS BAR ──────────────────────────────
      const filled = Math.floor(percentage / 10)
      const empty = 10 - filled
      const bar = '🟪'.repeat(filled) + '⬜'.repeat(empty)

      // ─── SEND RESULT ──────────────────────────────────────
      const resultText = `
╭─────〔 GAY METER 〕─────┈⊷
│ ◦➛ User: @${name}
├─────────────────────────⊷
│ ◦➛ ${bar}
│ ◦➛ ${percentage}% Gay ${emoji}
├─────────────────────────⊷
│ ◦➛ ${comment}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        mentions: [target],
        contextInfo
      }, { quoted: m })

      logger.success('HOWGAY', `${displayName} = ${percentage}% gay`)

    } catch (e) {
      logger.error('HOWGAY', 'Howgay command failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to check gay meter
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}
