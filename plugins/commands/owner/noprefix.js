/**
 * AstraX - plugins/commands/owner/noprefix.js
 * Toggle noPrefix mode: only | both | off
 * Detailed help system for each mode
 */

export default {
  name: 'noprefix',
  alias: ['np', 'setnoprefix', 'npset'],
  desc: 'View or change noPrefix mode with detailed help',
  category: 'owner',
  usage: '.noprefix [only/both/off/help/status]',
  permission: 'owner',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      const [currentNp, prefix, botname, mode, channelEnabled] = await Promise.all([
        db.get('noPrefix'),
        db.get('prefix'),
        db.get('botname'),
        db.get('mode'),
        db.get('channelEnabled')
      ])

      const input = args[0]?.toLowerCase()
      const subArg = args[1]?.toLowerCase()

      // ─── HELP COMMAND WITH SUB-ARGUMENTS ─────────────────────
      if (input === 'help') {

        // ─── HELP BOTH - DETAILED GUIDE ────────────────────
        if (subArg === 'both') {
          const helpBoth = `
╭─────〔 NOPREFIX BOTH MODE 〕─────┈⊷
│ ◦➛ Understanding BOTH Mode:
│ ◦➛ This is the most flexible mode
╰─────────────────────────⊷

╭─────〔 HOW IT WORKS 〕─────┈⊷
│ ◦➛ All commands work WITH prefix
│ ◦➛ All commands work WITHOUT prefix
│ ◦➛ No restrictions on any command
│ ◦➛ Users can choose their style
╰─────────────────────────⊷

╭─────〔 PRACTICAL EXAMPLES 〕─────┈⊷
│ ◦➛ ${prefix}menu → Works ✅
│ ◦➛ menu → Works ✅
│ ◦➛ ${prefix}ping → Works ✅
│ ◦➛ ping → Works ✅
│ ◦➛ ${prefix}alive → Works ✅
│ ◦➛ alive → Works ✅
╰─────────────────────────⊷

╭─────〔 BENEFITS 〕─────┈⊷
│ ◦➛ New users don't get confused
│ ◦➛ Old users keep using prefix
│ ◦➛ Best for public groups
│ ◦➛ Zero learning curve
│ ◦➛ Maximum compatibility
╰─────────────────────────⊷

╭─────〔 HOW TO ACTIVATE 〕─────┈⊷
│ ◦➛ Type: ${prefix}noprefix both
│ ◦➛ Changes apply instantly
│ ◦➛ No restart required
╰─────────────────────────⊷

BOTH mode is recommended for public bots ✅
`
          return await sock.sendMessage(from, {
            text: helpBoth.trim(),
            contextInfo
          }, { quoted: m })
        }

        // ─── HELP ONLY - DETAILED GUIDE ────────────────────
        if (subArg === 'only') {
          const helpOnly = `
╭─────〔 NOPREFIX ONLY MODE 〕─────┈⊷
│ ◦➛ Understanding ONLY Mode:
│ ◦➛ Prefix is completely disabled
╰─────────────────────────⊷

╭─────〔 HOW IT WORKS 〕─────┈⊷
│ ◦➛ Commands work WITHOUT prefix only
│ ◦➛ ${prefix}menu → Does NOT work ❌
│ ◦➛ menu → Works ✅
│ ◦➛ All prefix usage blocked
╰─────────────────────────⊷

╭─────〔 PRACTICAL EXAMPLES 〕─────┈⊷
│ ◦➛ menu → Works ✅
│ ◦➛ ${prefix}menu → Fails ❌
│ ◦➛ ping → Works ✅
│ ◦➛ ${prefix}ping → Fails ❌
╰─────────────────────────⊷

╭─────〔 BENEFITS 〕─────┈⊷
│ ◦➛ Feels like normal chat
│ ◦➛ Faster to type commands
│ ◦➛ Modern chatbot style
│ ◦➛ User-friendly
╰─────────────────────────⊷

╭─────〔 HOW TO ACTIVATE 〕─────┈⊷
│ ◦➛ Type: ${prefix}noprefix only
│ ◦➛ Prefix will be disabled
│ ◦➛ No restart required
╰─────────────────────────⊷

ONLY mode is best for private bots ✅
`
          return await sock.sendMessage(from, {
            text: helpOnly.trim(),
            contextInfo
          }, { quoted: m })
        }

        // ─── HELP OFF - DETAILED GUIDE ────────────────────
        if (subArg === 'off') {
          const helpOff = `
╭─────〔 NOPREFIX OFF MODE 〕─────┈⊷
│ ◦➛ Understanding OFF Mode:
│ ◦➛ Prefix is always required
╰─────────────────────────⊷

╭─────〔 HOW IT WORKS 〕─────┈⊷
│ ◦➛ Commands need prefix always
│ ◦➛ menu → Does NOT work ❌
│ ◦➛ ${prefix}menu → Works ✅
│ ◦➛ Traditional bot behavior
╰─────────────────────────⊷

╭─────〔 PRACTICAL EXAMPLES 〕─────┈⊷
│ ◦➛ ${prefix}menu → Works ✅
│ ◦➛ menu → Fails ❌
│ ◦➛ ${prefix}ping → Works ✅
│ ◦➛ ping → Fails ❌
╰─────────────────────────⊷

╭─────〔 BENEFITS 〕─────┈⊷
│ ◦➛ Prevents accidental triggers
│ ◦➛ Clear command structure
│ ◦➛ Classic WhatsApp bot style
│ ◦➛ Full control
╰─────────────────────────⊷

╭─────〔 HOW TO ACTIVATE 〕─────┈⊷
│ ◦➛ Type: ${prefix}noprefix off
│ ◦➛ Prefix becomes mandatory
│ ◦➛ No restart required
╰─────────────────────────⊷

OFF mode is best for group bots ✅
`
          return await sock.sendMessage(from, {
            text: helpOff.trim(),
            contextInfo
          }, { quoted: m })
        }

        // ─── GENERAL HELP ────────────────────
        const helpText = `
╭─────〔 NOPREFIX SYSTEM 〕─────┈⊷
│ ◦➛ OFF: Prefix required
│ ◦➛ BOTH: Prefix optional
│ ◦➛ ONLY: No prefix allowed
╰─────────────────────────⊷

╭─────〔 DETAILED GUIDES 〕─────┈⊷
│ ◦➛ ${prefix}noprefix help off
│ ◦➛ ${prefix}noprefix help both
│ ◦➛ ${prefix}noprefix help only
╰─────────────────────────⊷

╭─────〔 COMMANDS 〕─────┈⊷
│ ◦➛ ${prefix}noprefix only
│ ◦➛ ${prefix}noprefix both
│ ◦➛ ${prefix}noprefix off
│ ◦➛ ${prefix}noprefix status
╰─────────────────────────⊷

Use help + mode for detailed guide ✅
`
        return await sock.sendMessage(from, {
          text: helpText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── STATUS COMMAND ────────────────
      if (input === 'status') {
        let modeText = 'OFF'
        let example = `${prefix}menu`

        if (currentNp === true || currentNp === 'only') {
          modeText = 'ONLY'
          example = `menu`
        }
        if (currentNp === 'both') {
          modeText = 'BOTH'
          example = `${prefix}menu OR menu`
        }

        const statusText = `
╭─────〔 ${botname} NOPREFIX 〕─────┈⊷
│ ◦➛ Current Mode: ${modeText}
│ ◦➛ Bot Prefix: ${prefix}
│ ◦➛ Bot Mode: ${mode?.toUpperCase() || 'PUBLIC'}
│ ◦➛ Channel Fwd: ${channelEnabled!== false? 'ON' : 'OFF'}
│ ◦➛ Example: ${example}
╰─────────────────────────⊷

╭─────〔 SYSTEM STATUS 〕─────┈⊷
│ ◦➛ Router: Active ✅
│ ◦➛ DB: ${db.mode?.toUpperCase() || 'RAM'}
│ ◦➛ Anti-Spam: Enabled
│ ◦➛ Hot-Reload: Ready
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: statusText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── IF NO ARGS: SHOW CURRENT MODE ───────────────────
      if (!input) {
        let modeText = 'OFF'
        let example = `${prefix}menu`

        if (currentNp === true || currentNp === 'only') {
          modeText = 'ONLY'
          example = `menu`
        }
        if (currentNp === 'both') {
          modeText = 'BOTH'
          example = `${prefix}menu OR menu`
        }

        const modeInfo = `
╭─────〔 ${botname} NOPREFIX 〕─────┈⊷
│ ◦➛ Current Mode: ${modeText}
│ ◦➛ Prefix: ${prefix}
│ ◦➛ Example: ${example}
╰─────────────────────────⊷

╭─────〔 CHANGE MODE 〕─────┈⊷
│ ◦➛ ${prefix}noprefix only
│ ◦➛ ${prefix}noprefix both
│ ◦➛ ${prefix}noprefix off
╰─────────────────────────⊷

╭─────〔 GET HELP 〕─────┈⊷
│ ◦➛ ${prefix}noprefix help both
│ ◦➛ ${prefix}noprefix status
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: modeInfo.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── VALIDATE INPUT ──────────────────────────────────
      const validInputs = ['only', 'both', 'off']

      if (!validInputs.includes(input)) {
        return await sock.sendMessage(from, {
          text: `❌ Invalid mode\n\nValid modes: only, both, off\n\nExample: ${prefix}noprefix both\n\nFor help: ${prefix}noprefix help both`,
          contextInfo
        }, { quoted: m })
      }

      // ─── CONVERT INPUT TO DB VALUE ───────────────────────
      let newValue = false
      let newExample = `${prefix}menu`

      if (input === 'only') {
        newValue = 'only'
        newExample = `menu`
      }
      if (input === 'both') {
        newValue = 'both'
        newExample = `${prefix}menu OR menu`
      }
      if (input === 'off') {
        newValue = false
        newExample = `${prefix}menu`
      }

      // ─── CHECK IF ALREADY SET ────────────────────────────
      if (currentNp === newValue) {
        return await sock.sendMessage(from, {
          text: `ℹ️ NoPrefix is already ${input.toUpperCase()}`,
          contextInfo
        }, { quoted: m })
      }

      // ─── SET NEW MODE ────────────────────────────────────
      await db.set('noPrefix', newValue)

      let currentText = 'OFF'
      if (currentNp === true || currentNp === 'only') currentText = 'ONLY'
      if (currentNp === 'both') currentText = 'BOTH'

      const successText = `
╭─────〔 NOPREFIX CHANGED 〕─────┈⊷
│ ◦➛ Previous: ${currentText}
│ ◦➛ Current: ${input.toUpperCase()}
│ ◦➛ Example: ${newExample}
╰─────────────────────────⊷

╭─────〔 AFFECTED 〕─────┈⊷
│ ◦➛ All commands
│ ◦➛ Real-time active
│ ◦➛ No restart needed
╰─────────────────────────⊷

NoPrefix ${input.toUpperCase()} mode activated ✅
`
      await sock.sendMessage(from, {
        text: successText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('NOPREFIX', `NoPrefix changed from ${currentText} to ${input} by ${m.key.participant || from}`)

    } catch (e) {
      logger.error('NOPREFIX', 'Failed to set noprefix', e.message)

      await sock.sendMessage(from, {
        text: `❌ Error\nFailed to change noprefix: ${e.message}`,
        contextInfo
      }, { quoted: m })
    }
  }
}