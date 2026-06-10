/**
 * AstraX - plugins/commands/group management/setgcname.js
 * Set Group Name Command - Change group subject
 * No admin check from router - handles all errors directly
 * Category: group management
 */

export default {
  name: 'setgcname',
  alias: ['setgroupname', 'changename', 'gcname'],
  desc: 'Change group name/subject',
  category: 'group management',
  usage: 'setgcname <new name>',
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

      // ─── VALIDATE NEW NAME ────────────────────────────────
      if (!args[0]) {
        const errorText = `
╭─────〔 SETGCNAME 〕─────┈⊷
│ ◦➛ Usage: ${prefix}setgcname <name>
│ ◦➛ Example: ${prefix}setgcname AstraX Devs
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      const newName = args.join(' ').trim()

      // ─── VALIDATE NAME LENGTH ─────────────────────────────
      if (newName.length > 100) {
        const errorText = `
╭─────〔 ERROR 400 〕─────┈⊷
│ ◦➛ Name too long
│ ◦➛ Max: 100 characters
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      if (newName.length < 1) {
        const errorText = `
╭─────〔 ERROR 400 〕─────┈⊷
│ ◦➛ Name cannot be empty
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

      const oldName = groupMetadata.subject

      // ─── CHECK IF SAME NAME ───────────────────────────────
      if (oldName === newName) {
        const errorText = `
╭─────〔 ERROR 409 〕─────┈⊷
│ ◦➛ Same as current name
│ ◦➛ No changes made
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── EXECUTE NAME CHANGE ──────────────────────────────
      try {
        await sock.groupUpdateSubject(from, newName)

        const successText = `
╭─────〔 SUCCESS 200 〕─────┈⊷
│ ◦➛ Old Name: ${oldName}
│ ◦➛ New Name: ${newName}
│ ◦➛ Status: Updated ✅
╰─────────────────────────⊷
`
        await sock.sendMessage(from, {
          text: successText.trim(),
          contextInfo
        }, { quoted: m })

        logger.success('SETGCNAME', `Changed group name from "${oldName}" to "${newName}"`)

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
        // 400 - Bad request / Invalid name
        else if (errMsg.includes('400') || errMsg.includes('bad-request')) {
          errorText = `
╭─────〔 ERROR 400 〕─────┈⊷
│ ◦➛ Invalid group name
│ ◦➛ Contains bad characters
╰─────────────────────────⊷
`
        }
        // 429 - Rate limited
        else if (errMsg.includes('429') || errMsg.includes('rate')) {
          errorText = `
╭─────〔 ERROR 429 〕─────┈⊷
│ ◦➛ Too many name changes
│ ◦➛ Wait 24 hours
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
│ ◦➛ Failed to change name
╰─────────────────────────⊷
`
        }

        logger.error('SETGCNAME', 'Failed to update group name', errMsg)
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

    } catch (e) {
      logger.error('SETGCNAME', 'Setgcname command failed', e.message)

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