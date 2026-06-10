/**
 * AstraX - plugins/commands/fun/couple.js
 * Couple Command - Match random couples in group
 * Category: fun
 */

export default {
  name: 'couple',
  alias: ['ship', 'pair', 'match'],
  desc: 'Match random couples in the group',
  category: 'fun',
  usage: 'couple',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from, isGroup, sender }) {
    try {
      // ─── CHECK IF GROUP ───────────────────────────────────
      if (!isGroup) {
        const errorText = `
╭─────〔 COUPLE 〕─────┈⊷
│ ◦➛ This command only works in groups
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── GET GROUP MEMBERS ────────────────────────────────
      const groupMetadata = await sock.groupMetadata(from)
      const participants = groupMetadata.participants.map(p => p.id)

      if (participants.length < 2) {
        const errorText = `
╭─────〔 COUPLE 〕─────┈⊷
│ ◦➛ Need at least 2 members
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── PICK RANDOM COUPLE ───────────────────────────────
      const shuffled = participants.sort(() => 0.5 - Math.random())
      const user1 = shuffled[0]
      const user2 = shuffled[1]

      const name1 = user1.split('@')[0]
      const name2 = user2.split('@')[0]

      let displayName1 = name1
      let displayName2 = name2

      // ─── GET DISPLAY NAMES ────────────────────────────────
      try {
        const contact1 = await sock.onWhatsApp(user1)
        const contact2 = await sock.onWhatsApp(user2)
        if (contact1[0]?.notify) displayName1 = contact1[0].notify
        if (contact2[0]?.notify) displayName2 = contact2[0].notify
      } catch (e) {}

      // ─── CALCULATE COMPATIBILITY ──────────────────────────
      const seed = displayName1.charCodeAt(0) + displayName2.charCodeAt(0) + displayName1.length + displayName2.length
      const compatibility = (seed % 101) // 0-100

      // ─── GET LOVE COMMENT ─────────────────────────────────
      let loveComment = ''
      let emoji = ''
      let heartBar = ''

      if (compatibility === 0) {
        loveComment = 'Enemies to lovers? Not even close 💀'
        emoji = '💔'
        heartBar = '💔⬜⬜⬜⬜'
      } else if (compatibility <= 20) {
        loveComment = 'Friendzone energy 🫂'
        emoji = '😅'
        heartBar = '💜⬜⬜⬜⬜'
      } else if (compatibility <= 40) {
        loveComment = 'Could be something... maybe 🤔'
        emoji = '💛'
        heartBar = '💛💛⬜⬜⬜'
      } else if (compatibility <= 60) {
        loveComment = 'Definitely some chemistry ✨'
        emoji = '💚'
        heartBar = '💚💚💚💚⬜⬜⬜'
      } else if (compatibility <= 80) {
        loveComment = 'Match made in heaven 💫'
        emoji = '💙'
        heartBar = '💙💙💙💙⬜⬜⬜'
      } else if (compatibility < 100) {
        loveComment = 'Soulmates detected 💍'
        emoji = '💕'
        heartBar = '💕💕💕💕💕💕💕⬜⬜'
      } else {
        loveComment = 'PERFECT COUPLE - MARRY NOW 👑💒'
        emoji = '💖'
        heartBar = '💖💖💖'
      }

      // ─── SEND RESULT ──────────────────────────────────────
      const resultText = `
╭─────〔 COUPLE 〕─────┈⊷
│ ◦➛ Couple: @${name1} 💕 @${name2}
├─────────────────────────⊷
│ ◦➛ ${heartBar}
│ ◦➛ ${compatibility}% Compatible ${emoji}
├─────────────────────────⊷
│ ◦➛ ${loveComment}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        mentions: [user1, user2],
        contextInfo
      }, { quoted: m })

      logger.success('COUPLE', `Matched ${displayName1} + ${displayName2} = ${compatibility}%`)

    } catch (e) {
      logger.error('COUPLE', 'Couple command failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to match couple
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}
