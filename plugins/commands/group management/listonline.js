/**
 * AstraX - plugins/commands/group management/listonline.js
 * List Online Command - Show all online group members
 * Category: group management
 */

export default {
  name: 'listonline',
  alias: ['online', 'onlineusers', 'onlineuserslist'],
  desc: 'Show list of online group members',
  category: 'group management',
  usage: 'listonline',
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

      // ─── GET PRESENCE UPDATES ─────────────────────────────
      await sock.presenceSubscribe(from)

      // Wait briefly for presence data
      await new Promise(resolve => setTimeout(resolve, 2000))

      const presence = sock.presence?.[from] || {}
      const onlineMembers = []
      const allParticipants = groupMetadata.participants.map(p => p.id)

      // Check each participant presence
      for (const jid of allParticipants) {
        const userPresence = presence[jid]
        if (userPresence?.lastKnownPresence === 'available' ||
            userPresence?.lastKnownPresence === 'composing' ||
            userPresence?.lastKnownPresence === 'recording') {
          onlineMembers.push(jid)
        }
      }

      if (onlineMembers.length === 0) {
        const errorText = `
╭─────〔 ONLINE 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Online: 0/${allParticipants.length}
├─────────────────────────⊷
│ ◦➛ No members online
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── BUILD ONLINE LIST ────────────────────────────────
      let onlineList = ''
      let count = 1

      for (const jid of onlineMembers) {
        const number = jid.split('@')[0]
        const userPresence = presence[jid]
        let status = 'Online'

        if (userPresence?.lastKnownPresence === 'composing') status = 'Typing...'
        if (userPresence?.lastKnownPresence === 'recording') status = 'Recording...'

        onlineList += `│ ${count}. @${number} - ${status}\n`
        count++
      }

      // ─── SEND RESULT ──────────────────────────────────────
      const successText = `
╭─────〔 ONLINE 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Online: ${onlineMembers.length}/${allParticipants.length}
├─────────────────────────⊷
${onlineList.trim()}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: successText.trim(),
        mentions: onlineMembers,
        contextInfo
      }, { quoted: m })

      logger.success('LISTONLINE', `Listed ${onlineMembers.length} online members`)

    } catch (e) {
      logger.error('LISTONLINE', 'Listonline command failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to fetch online
│ ◦➛ Try again later
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}