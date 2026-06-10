/**
 * AstraX - plugins/commands/owner/sudo.js
 * List all sudo users
 * Shows numbers with owner-level access
 */

export default {
  name: 'sudo',
  alias: ['sudolist', 'listsudo'],
  desc: 'List all sudo users',
  category: 'owner',
  usage: 'sudo',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from, isOwner }) {
    try {
      const sudoList = await db.get('sudoUsers')
      const ownerNumber = await db.get('owner')
      const ownerName = await db.get('ownerName')
      const prefix = await db.get('prefix')

      if (!sudoList || sudoList.length === 0) {
        const emptyText = `
╭─────〔 SUDO USERS 〕─────┈⊷
│ 𐂂 Owner: ${ownerName}
│ 𐂂 Number: +${ownerNumber}
╰─────────────────────────⊷

╭─────〔 SUDO LIST 〕─────┈⊷
│ 𐂂 No sudo users added
│ 𐂂 Use: ${prefix}addsudo 255xxx
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: emptyText.trim(),
          contextInfo
        }, { quoted: m })
      }

      let sudoText = `
╭─────〔 SUDO USERS 〕─────┈⊷
│ 𐂂 Owner: ${ownerName}
│ 𐂂 Number: +${ownerNumber}
╰─────────────────────────⊷

╭─────〔 SUDO LIST 〕─────┈⊷
`

      sudoList.forEach((num, i) => {
        sudoText += `│ 𐂂 ${i + 1}. +${num}\n`
      })

      sudoText += `╰─────────────────────────⊷\n\nTotal: ${sudoList.length} sudo user(s)`

      await sock.sendMessage(from, {
        text: sudoText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('SUDO', `Sudo list sent to ${m.key.participant || from}`)

    } catch (e) {
      logger.error('SUDO', 'Failed to list sudo', e.message)

      await sock.sendMessage(from, {
        text: `❌ Error\nFailed to get sudo list: ${e.message}`,
        contextInfo
      }, { quoted: m })
    }
  }
}