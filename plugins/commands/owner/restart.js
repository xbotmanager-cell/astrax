/**
 * AstraX - plugins/commands/owner/restart.js
 * Restart bot process
 * Owner only - real-time restart
 */

export default {
  name: 'restart',
  alias: ['reboot', 'rst', 'restartbot'],
  desc: 'Restart bot process',
  category: 'owner',
  usage: '.restart',
  permission: 'owner',

  async execute(sock, m, args, { db, logger, contextInfo, from, botname }) {
    try {
      const currentBot = await db.get('botname') || botname || 'Bot'

      const restartText = `
╭─────〔 RESTARTING 〕─────┈⊷
│ ◦➛ Bot: ${currentBot}
│ ◦➛ Status: Restarting...
│ ◦➛ Wait: 3-5 seconds
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: restartText.trim(),
        contextInfo
      }, { quoted: m })

      logger.info('RESTART', `Bot restart initiated by ${m.key.participant || from}`)

      // ─── DELAY THEN RESTART ─────────────────────────────────
      setTimeout(() => {
        process.exit(0)
      }, 2000)

    } catch (e) {
      logger.error('RESTART', 'Failed to restart bot', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ ${e.message}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}