/**
 * AstraX - plugins/commands/settings/autoreact.js
 * Auto React Settings - Clean control panel
 * Category: settings
 */

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💯', '✨', '🎉', '👏', '🤔', '👀', '💪', '🌟', '⚡', '🎯', '💎', '🚀', '🌈', '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', '🎸', '🎺', '🎻', '🎹', '🥁', '🎤', '🎧', '🎵', '🎶', '📱', '💻', '⌚', '📷', '🎥', '📹', '📺', '🔊', '🔔', '📢', '📣', '💬', '💭', '🗨️', '💡']

async function getSettings(db) {
  return await db.get('autoReact') || {
    enabled: false,
    mode: 'all',
    specialGroups: [],
    specialDms: [],
    specialChannels: [],
    emojis: DEFAULT_EMOJIS,
    random: true,
    specificEmoji: null,
    cooldown: 3000,
    chance: 100
  }
}

export default {
  name: 'autoreact',
  alias: ['ar', 'autoreaction'],
  desc: 'Configure auto react settings',
  category: 'automation',
  usage: 'autoreact <option> <value>',
  permission: 'owner',

  async execute(sock, m, args, { db, logger, contextInfo, from, sender, isGroup, prefix, isOwner }) {
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
        text: `╭─────〔 AUTO REACT 〕─────┈⊷
│ ◦➛ Status: ${settings.enabled? '✅ ON' : '❌ OFF'}
╰─────────────────────────⊷

╭─────〔 USAGE 〕─────┈⊷
│ ◦➛ ${prefix}autoreact on/off
│ ◦➛ ${prefix}autoreact status
╰─────────────────────────⊷`,
        contextInfo
      }, { quoted: m })
    }

    switch (option) {
      case 'status':
        return await sock.sendMessage(from, {
          text: `╭─────〔 AUTO REACT 〕─────┈⊷
│ ◦➛ Status: ${settings.enabled? '✅ ON' : '❌ OFF'}
│ ◦➛ Mode: ${settings.mode.toUpperCase()}
│ ◦➛ Chance: ${settings.chance}%
│ ◦➛ Cooldown: ${settings.cooldown}ms
│ ◦➛ Random: ${settings.random? '✅' : '❌'}
│ ◦➛ Emoji: ${settings.specificEmoji || 'Random'}
│ ◦➛ Emojis: ${settings.emojis.length}
├─────────────────────────⊷
│ ◦➛ ${prefix}autoreact mode all/groups/dms/channels/special
│ ◦➛ ${prefix}autoreact chance 1-100
│ ◦➛ ${prefix}autoreact cooldown <ms>
│ ◦➛ ${prefix}autoreact random on/off
│ ◦➛ ${prefix}autoreact emoji <emoji>
│ ◦➛ ${prefix}autoreact addemoji <emoji>
│ ◦➛ ${prefix}autoreact delemoji <emoji>
│ ◦➛ ${prefix}autoreact resetemojis
│ ◦➛ ${prefix}autoreact addgroup
│ ◦➛ ${prefix}autoreact adddm
│ ◦➛ ${prefix}autoreact addchannel
╰─────────────────────────⊷`,
          contextInfo
        }, { quoted: m })

      case 'on':
      case 'enable':
        settings.enabled = true
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: '✅ Auto react enabled',
          contextInfo
        }, { quoted: m })

      case 'off':
      case 'disable':
        settings.enabled = false
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: '❌ Auto react disabled',
          contextInfo
        }, { quoted: m })

      case 'mode':
        const modes = ['all', 'groups', 'dms', 'channels', 'special']
        if (!modes.includes(value)) {
          return await sock.sendMessage(from, {
            text: `❌ Invalid mode. Use: ${modes.join(', ')}`,
            contextInfo
          }, { quoted: m })
        }
        settings.mode = value
        await db.set('autoReact', settings)
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
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ React chance set to: ${chance}%`,
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
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ Cooldown set to: ${cd}ms`,
          contextInfo
        }, { quoted: m })

      case 'random':
        settings.random = value === 'on'
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ Random emoji: ${settings.random? 'ON' : 'OFF'}`,
          contextInfo
        }, { quoted: m })

      case 'emoji':
        if (!value) {
          settings.specificEmoji = null
          settings.random = true
          await db.set('autoReact', settings)
          return await sock.sendMessage(from, {
            text: '✅ Specific emoji cleared. Using random.',
            contextInfo
          }, { quoted: m })
        }
        settings.specificEmoji = value
        settings.random = false
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ Specific emoji set: ${value}`,
          contextInfo
        }, { quoted: m })

      case 'addemoji':
        if (!value) return await sock.sendMessage(from, { text: '❌ Provide emoji', contextInfo }, { quoted: m })
        if (!settings.emojis.includes(value)) settings.emojis.push(value)
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ Added emoji: ${value}\nTotal: ${settings.emojis.length}`,
          contextInfo
        }, { quoted: m })

      case 'delemoji':
        if (!value) return await sock.sendMessage(from, { text: '❌ Provide emoji', contextInfo }, { quoted: m })
        settings.emojis = settings.emojis.filter(e => e!== value)
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ Removed emoji: ${value}\nTotal: ${settings.emojis.length}`,
          contextInfo
        }, { quoted: m })

      case 'resetemojis':
        settings.emojis = DEFAULT_EMOJIS
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: `✅ Emojis reset to default: ${DEFAULT_EMOJIS.length}`,
          contextInfo
        }, { quoted: m })

      case 'addgroup':
        if (!isGroup) return await sock.sendMessage(from, { text: '❌ Use in group', contextInfo }, { quoted: m })
        if (!settings.specialGroups.includes(from)) settings.specialGroups.push(from)
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: '✅ Added this group to special react list',
          contextInfo
        }, { quoted: m })

      case 'adddm':
        if (isGroup) return await sock.sendMessage(from, { text: '❌ Use in DM', contextInfo }, { quoted: m })
        if (!settings.specialDms.includes(from)) settings.specialDms.push(from)
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: '✅ Added this DM to special react list',
          contextInfo
        }, { quoted: m })

      case 'addchannel':
        if (!from.endsWith('@newsletter')) return await sock.sendMessage(from, { text: '❌ Use in channel', contextInfo }, { quoted: m })
        if (!settings.specialChannels.includes(from)) settings.specialChannels.push(from)
        await db.set('autoReact', settings)
        return await sock.sendMessage(from, {
          text: '✅ Added this channel to special react list',
          contextInfo
        }, { quoted: m })

      default:
        return await sock.sendMessage(from, {
          text: '❌ Unknown option. Use: ' + prefix + 'autoreact status',
          contextInfo
        }, { quoted: m })
    }
  }
}