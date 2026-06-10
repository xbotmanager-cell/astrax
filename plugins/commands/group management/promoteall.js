/**
 * AstraX - plugins/commands/group management/promoteall.js
 * Group Promote All Command - Promote all non-admin members
 * No admin check from router - handles 403/401 errors directly
 * Category: group management
 */

export default {
  name: 'promoteall',
  alias: ['adminall', 'upall'],
  desc: 'Promote all members to group admin',
  category: 'group management',
  usage: 'promoteall',
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

      // ─── GET NON-ADMIN PARTICIPANTS ───────────────────────
      const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
      const groupAdmins = groupMetadata.participants
    .filter(p => p.admin!== null)
    .map(p => p.id)

      const targets = groupMetadata.participants
    .filter(p => p.admin === null && p.id!== botNumber)
    .map(p => p.id)

      // ─── VALIDATE TARGETS ─────────────────────────────────
      if (targets.length === 0) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ All members already admins
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── EXECUTE PROMOTE WITH ERROR HANDLING ──────────────
      let promoted = []
      let errors = {
        notAdmin: false,
        notInGroup: false,
        botNotAdmin: false,
        unknown: false
      }

      await sock.sendMessage(from, {
        text: `╭─────〔 PROCESSING 〕─────┈⊷\n│ ◦➛ Promoting ${targets.length} members...\n╰─────────────────────────⊷`,
        contextInfo
      }, { quoted: m })

      for (const target of targets) {
        try {
          await sock.groupParticipantsUpdate(from, [target], 'promote')
          promoted.push(target)
          await new Promise(resolve => setTimeout(resolve, 800))
        } catch (e) {
          const errMsg = e.message || e.toString()

          // 403 - Bot not admin or sender not admin
          if (errMsg.includes('403') || errMsg.includes('forbidden')) {
            errors.botNotAdmin = true
            break
          }
          // 404 - User not in group
          else if (errMsg.includes('404') || errMsg.includes('not-found')) {
            errors.notInGroup = true
          }
          // 401 - Not admin
          else if (errMsg.includes('401') || errMsg.includes('not-authorized')) {
            errors.notAdmin = true
            break
          }
          else {
            errors.unknown = true
          }

          logger.error('PROMOTEALL', `Failed to promote ${target}`, errMsg)
        }
      }

      // ─── HANDLE SPECIFIC ERRORS ───────────────────────────
      if (promoted.length === 0) {
        let errorText = ''

        if (errors.botNotAdmin) {
          errorText = `
╭─────〔 ERROR 403 〕─────┈⊷
│ ◦➛ Bot needs admin rights
╰─────────────────────────⊷
`
        } else if (errors.notAdmin) {
          errorText = `
╭─────〔 ERROR 401 〕─────┈⊷
│ ◦➛ You need admin rights
╰─────────────────────────⊷
`
        } else {
          errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to execute
╰─────────────────────────⊷
`
        }

        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 PROMOTEALL DONE 〕─────┈⊷
│ ◦➛ Promoted: ${promoted.length}/${targets.length}
│ ◦➛ Total Admins: ${groupAdmins.length + promoted.length}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('PROMOTEALL', `Promoted ${promoted.length} members in ${from}`)

    } catch (e) {
      logger.error('PROMOTEALL', 'Promoteall command failed', e.message)

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