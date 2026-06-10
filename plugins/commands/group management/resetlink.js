/**
 * AstraX - plugins/commands/group management/resetlink.js
 * Group Reset Link Command - Revoke old link and generate new
 * No admin check from router - handles 403/401 errors directly
 * Category: group management
 */

export default {
  name: 'resetlink',
  alias: ['revoke', 'newlink', 'resetinvite'],
  desc: 'Revoke old group link and generate new one',
  category: 'group management',
  usage: 'resetlink',
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

      // ─── REVOKE AND GENERATE NEW LINK ─────────────────────
      let newInviteCode
      try {
        newInviteCode = await sock.groupRevokeInvite(from)
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
│ ◦➛ Failed to reset link
╰─────────────────────────⊷
`
        }

        logger.error('RESETLINK', 'Failed to revoke invite', errMsg)
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const newGroupLink = `https://chat.whatsapp.com/${newInviteCode}`
      const resultText = `
╭─────〔 LINK RESET 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Old link revoked
│ ◦➛ New Link: ${newGroupLink}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('RESETLINK', `Reset link for ${groupMetadata.subject}`)

    } catch (e) {
      logger.error('RESETLINK', 'Resetlink command failed', e.message)

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