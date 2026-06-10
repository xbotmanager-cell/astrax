/**
 * AstraX - plugins/commands/group management/link.js
 * Group Link Command - Get group invite link
 * No admin check from router - handles 403/401 errors directly
 * Category: group management
 */

export default {
  name: 'link',
  alias: ['grouplink', 'invite', 'getlink'],
  desc: 'Get group invite link',
  category: 'group management',
  usage: 'link',
  permission: 'isOwner',

  async execute(sock, m, args, { db, logger, contextInfo, from, isGroup }) {
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

      // ─── GET INVITE CODE ──────────────────────────────────
      let inviteCode
      try {
        inviteCode = await sock.groupInviteCode(from)
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
        // 401 - Not admin
        else if (errMsg.includes('401') || errMsg.includes('not-authorized')) {
          errorText = `
╭─────〔 ERROR 401 〕─────┈⊷
│ ◦➛ You need admin rights
╰─────────────────────────⊷
`
        }
        else {
          errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to get link
╰─────────────────────────⊷
`
        }

        logger.error('LINK', 'Failed to get invite code', errMsg)
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const groupLink = `https://chat.whatsapp.com/${inviteCode}`
      const resultText = `
╭─────〔 GROUP LINK 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Link: ${groupLink}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('LINK', `Sent group link for ${groupMetadata.subject}`)

    } catch (e) {
      logger.error('LINK', 'Link command failed', e.message)

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