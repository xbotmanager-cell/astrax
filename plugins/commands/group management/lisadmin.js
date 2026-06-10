/**
 * AstraX - plugins/commands/group management/listadmin.js
 * List Admins Command - Show all group admins with details
 * Category: group management
 */

export default {
  name: 'listadmin',
  alias: ['admins', 'adminlist', 'listadmins'],
  desc: 'Show list of all group admins',
  category: 'group management',
  usage: 'listadmin',
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
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Bot needs to be in group
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── FILTER ADMINS ────────────────────────────────────
      const admins = groupMetadata.participants.filter(p => p.admin)
      const owner = groupMetadata.owner || admins.find(p => p.admin === 'superadmin')?.id
      const totalMembers = groupMetadata.participants.length

      if (admins.length === 0) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ No admins found
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── BUILD ADMIN LIST ─────────────────────────────────
      let adminList = ''
      let count = 1
      const adminIds = []

      for (const admin of admins) {
        const jid = admin.id
        const number = jid.split('@')[0]
        adminIds.push(jid)

        let role = 'Admin'
        if (admin.admin === 'superadmin' || jid === owner) {
          role = 'Owner 👑'
        }

        adminList += `│ ${count}. @${number} - ${role}\n`
        count++
      }

      // ─── SEND RESULT ──────────────────────────────────────
      const successText = `
╭─────〔 ADMINS 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Total: ${admins.length}/${totalMembers}
├─────────────────────────⊷
${adminList.trim()}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: successText.trim(),
        mentions: adminIds,
        contextInfo
      }, { quoted: m })

      logger.success('LISTADMIN', `Listed ${admins.length} admins for ${groupMetadata.subject}`)

    } catch (e) {
      logger.error('LISTADMIN', 'Listadmin command failed', e.message)

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