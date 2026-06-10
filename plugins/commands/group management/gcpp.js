/**
 * AstraX - plugins/commands/group management/getgcpp.js
 * Get Group Profile Picture Command
 * Works in Group and DM - handles all errors directly
 * Category: group management
 */

export default {
  name: 'getgcpp',
  alias: ['getgcpic', 'grouppic', 'gcpp'],
  desc: 'Get current group profile picture',
  category: 'group management',
  usage: 'getgcpp | getgcpp <group_link> (in DM)',
  permission: 'isOwner',

  async execute(sock, m, args, { db, logger, contextInfo, from, isGroup }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── DETERMINE TARGET GROUP ───────────────────────────
      let targetGroup = from
      let groupMetadata = null

      // If in DM and link provided
      if (!isGroup && args[0]) {
        let inviteCode = args[0]

        // Extract from URL
        if (inviteCode.includes('chat.whatsapp.com/')) {
          inviteCode = inviteCode.split('chat.whatsapp.com/')[1]
        }
        inviteCode = inviteCode.split('?')[0].split('/')[0].trim()

        // Validate
        if (!inviteCode || inviteCode.length < 20) {
          const errorText = `
╭─────〔 ERROR 400 〕─────┈⊷
│ ◦➛ Invalid group link
│ ◦➛ Usage: ${prefix}getgcpp <link>
╰─────────────────────────⊷
`
          return await sock.sendMessage(from, {
            text: errorText.trim(),
            contextInfo
          }, { quoted: m })
        }

        // Get group ID from invite
        try {
          const inviteInfo = await sock.groupGetInviteInfo(inviteCode)
          targetGroup = inviteInfo.id
        } catch (e) {
          const errorText = `
╭─────〔 ERROR 404 〕─────┈⊷
│ ◦➛ Invalid or expired link
╰─────────────────────────⊷
`
          return await sock.sendMessage(from, {
            text: errorText.trim(),
            contextInfo
          }, { quoted: m })
        }
      }

      // If in group, use current group
      if (isGroup) {
        targetGroup = from
      }

      // If in DM without link
      if (!isGroup &&!args[0]) {
        const errorText = `
╭─────〔 GETGCPP 〕─────┈⊷
│ ◦➛ Usage: ${prefix}getgcpp <link>
│ ◦➛ Example: ${prefix}getgcpp https://chat.whatsapp.com/ABC
│ ◦➛ Or use in group
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── GET GROUP METADATA ───────────────────────────────
      try {
        groupMetadata = await sock.groupMetadata(targetGroup)
      } catch (e) {
        const errorText = `
╭─────〔 ERROR 403 〕─────┈⊷
│ ◦➛ Bot not in that group
│ ◦➛ Or group doesn't exist
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── GET PROFILE PICTURE ──────────────────────────────
      let ppUrl
      try {
        ppUrl = await sock.profilePictureUrl(targetGroup, 'image')
      } catch (e) {
        const errMsg = e.message || e.toString()
        let errorText = ''

        // 404 - No profile pic set
        if (errMsg.includes('404') || errMsg.includes('not-found')) {
          errorText = `
╭─────〔 ERROR 404 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ No profile picture set
╰─────────────────────────⊷
`
        }
        // 403 - Forbidden
        else if (errMsg.includes('403') || errMsg.includes('forbidden')) {
          errorText = `
╭─────〔 ERROR 403 〕─────┈⊷
│ ◦➛ Cannot access group pic
│ ◦➛ Bot may not be member
╰─────────────────────────⊷
`
        }
        // 401 - Not authorized
        else if (errMsg.includes('401') || errMsg.includes('not-authorized')) {
          errorText = `
╭─────〔 ERROR 401 〕─────┈⊷
│ ◦➛ Not authorized to view
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
│ ◦➛ Failed to get pic
╰─────────────────────────⊷
`
        }

        logger.error('GETGCPP', 'Failed to get group pic', errMsg)
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── SEND PROFILE PICTURE ─────────────────────────────
      const captionText = `
╭─────〔 SUCCESS 200 〕─────┈⊷
│ ◦➛ Group: ${groupMetadata.subject}
│ ◦➛ Members: ${groupMetadata.participants.length}
│ ◦➛ Status: Found ✅
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        image: { url: ppUrl },
        caption: captionText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('GETGCPP', `Sent group pic for ${groupMetadata.subject}`)

    } catch (e) {
      logger.error('GETGCPP', 'Getgcpp command failed', e.message)

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