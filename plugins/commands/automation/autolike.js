/**
 * AstraX - plugins/commands/automation/autolikestatus.js
 * Auto Like Status Settings - Control panel
 * Category: automation
 */

const DEFAULT_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏', '💯']

async function getSettings(db) {
  return await db.get('autoLikeStatus') || {
    enabled: false,
    mode: 'all',
    specialContacts: [],
    excludeContacts: [],
    emojis: DEFAULT_EMOJIS,
    random: true,
    specificEmoji: null,
    cooldown: 3000,
    chance: 100
  }
}

export default {
  name: 'autolikestatus',
  alias: ['als', 'likestatus', 'statuslike'],
  desc: 'Configure auto like status settings',
  category: 'automation',
  usage: 'autolikestatus <option> <value>',
  permission: 'owner',

  async execute(sock, m, args, { db, logger, contextInfo, from, sender, prefix, isOwner }) {
    if (!isOwner) {
      return await sock.sendMessage(from, {
        text: '🚫 Owner only command',
        contextInfo
      }, { quoted: m })
    }

    const settings = await getSettings(db)
    const option = args[0]?.toLowerCase()
    const value = args.slice(1).join(' ')

    // ─── DEFAULT: SHOW ON/OFF ONLY ─────────────────────
    if (!option) {
      return await sock.sendMessage(from, {
        text: `╭─────〔 AUTO LIKE STATUS 〕─────┈⊷
│ ◦➛ Status: ${settings.enabled? '✅ ON' : '❌ OFF'}
╰─────────────────────────⊷

╭─────〔 USAGE 〕─────┈⊷
│ ◦➛ ${prefix}autolikestatus on/off
│ ◦➛ ${prefix}autolikestatus status
╰─────────────────────────⊷`,
        contextInfo
      }, { quoted: m })
    }

    switch (option) {
      case 'status':
        return await sock.sendMessage(from, {
          text: `╭─────〔 AUTO LIKE STATUS 〕─────┈⊷
│ ◦➛ Status: ${settings.enabled? '✅ ON' : '❌ OFF'}
│ ◦➛ Mode: ${settings.mode.toUpperCase()}
│ ◦➛ Chance: ${settings.chance}%
│ ◦➛ Cooldown: ${settings.cooldown}ms
│ ◦➛ Random: ${settings.random? '✅' : '❌'}
│ ◦➛ Emoji: ${settings.specificEmoji || 'Random'}
│ ◦➛ Emojis: ${settings.emojis.length}
│ ◦➛ Special: ${settings.specialContacts.length}
│ ◦➛ Excluded: ${settings.excludeContacts.length}
├─────────────────────────⊷
│ ◦➛ ${prefix}autolikestatus on/off
│ ◦➛ ${prefix}autolikestatus mode all/contacts/special/exclude
│ ◦➛ ${prefix}autolikestatus chance 1-100
│ ◦➛ ${prefix}autolikestatus cooldown <ms>
│ ◦➛ ${prefix}autolikestatus random on/off
│ ◦➛ ${prefix}autolikestatus emoji <emoji>
│ ◦➛ ${prefix}autolikestatus addemoji <emoji>
│ ◦➛ ${prefix}autolikestatus delemoji <emoji>
│ ◦➛ ${prefix}autolikestatus addcontact @user
│ ◦➛ ${prefix}autolikestatus exclude @user
╰─────────────────────────⊷`,
          contextInfo
        }, { quoted: m })

      case 'on':
      case 'enable':
        settings.enabled = true
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: '✅ Auto like status enabled',
          contextInfo
        }, { quoted: m })

      case 'off':
      case 'disable':
        settings.enabled = false
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: '❌ Auto like status disabled',
          contextInfo
        }, { quoted: m })

      case 'mode':
        const modes = ['all', 'contacts', 'special', 'exclude']
        if (!modes.includes(value)) {
          return await sock.sendMessage(from, {
            text: `❌ Invalid mode. Use: ${modes.join(', ')}`,
            contextInfo
          }, { quoted: m })
        }
        settings.mode = value
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Mode set to: ${value.toUpperCase()}`,
          contextInfo
        }, { quoted: m })

      case 'chance':
        const chance = parseInt(value)
        if (isNaN(chance) || chance < 1 || chance > 100) {
          return await sock.sendMessage(from, {
            text: '❌ Chance must be 1-100',
            contextInfo
          }, { quoted: m })
        }
        settings.chance = chance
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Like chance set to: ${chance}%`,
          contextInfo
        }, { quoted: m })

      case 'cooldown':
        const cd = parseInt(value)
        if (isNaN(cd) || cd < 1000) {
          return await sock.sendMessage(from, {
            text: '❌ Cooldown must be >= 1000ms',
            contextInfo
          }, { quoted: m })
        }
        settings.cooldown = cd
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Cooldown set to: ${cd}ms`,
          contextInfo
        }, { quoted: m })

      case 'random':
        settings.random = value === 'on'
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Random emoji: ${settings.random? 'ON' : 'OFF'}`,
          contextInfo
        }, { quoted: m })

      case 'emoji':
        if (!value) {
          settings.specificEmoji = null
          settings.random = true
          await db.set('autoLikeStatus', settings)
          return await sock.sendMessage(from, {
            text: '✅ Specific emoji cleared. Using random.',
            contextInfo
          }, { quoted: m })
        }
        settings.specificEmoji = value
        settings.random = false
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Specific emoji set: ${value}`,
          contextInfo
        }, { quoted: m })

      case 'addemoji':
        if (!value) return await sock.sendMessage(from, { text: '❌ Provide emoji', contextInfo }, { quoted: m })
        if (!settings.emojis.includes(value)) settings.emojis.push(value)
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Added emoji: ${value}\nTotal: ${settings.emojis.length}`,
          contextInfo
        }, { quoted: m })

      case 'delemoji':
        if (!value) return await sock.sendMessage(from, { text: '❌ Provide emoji', contextInfo }, { quoted: m })
        settings.emojis = settings.emojis.filter(e => e!== value)
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Removed emoji: ${value}\nTotal: ${settings.emojis.length}`,
          contextInfo
        }, { quoted: m })

      case 'addcontact':
        const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quoted = m.message.extendedTextMessage?.contextInfo?.participant
        const target = mentioned[0] || quoted || (value.includes('@')? value.replace('@', '') + '@s.whatsapp.net' : null)

        if (!target) return await sock.sendMessage(from, { text: '❌ Tag or reply to user', contextInfo }, { quoted: m })
        if (!settings.specialContacts.includes(target)) settings.specialContacts.push(target)
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Added to special: @${target.split('@')[0]}`,
          contextInfo,
          mentions: [target]
        }, { quoted: m })

      case 'exclude':
        const mentioned2 = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quoted2 = m.message.extendedTextMessage?.contextInfo?.participant
        const target2 = mentioned2[0] || quoted2 || (value.includes('@')? value.replace('@', '') + '@s.whatsapp.net' : null)

        if (!target2) return await sock.sendMessage(from, { text: '❌ Tag or reply to user', contextInfo }, { quoted: m })
        if (!settings.excludeContacts.includes(target2)) settings.excludeContacts.push(target2)
        await db.set('autoLikeStatus', settings)
        return await sock.sendMessage(from, {
          text: `✅ Added to exclude: @${target2.split('@')[0]}`,
          contextInfo,
          mentions: [target2]
        }, { quoted: m })

      default:
        return await sock.sendMessage(from, {
          text: '❌ Unknown option. Use: ' + prefix + 'autolikestatus status',
          contextInfo
        }, { quoted: m })
    }
  }
}