/**
 * AstraX - plugins/observers/autoreact.js
 * Auto React - React to messages in groups/DMs/channels with custom emojis
 * Category: observer
 */

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💯', '✨', '🎉', '👏', '🤔', '👀', '💪', '🌟', '⚡', '🎯', '💎', '🚀', '🌈', '🎨', '🎭', '🎪', '🎬', '🎮', '🎲', '🎸', '🎺', '🎻', '🎹', '🥁', '🎤', '🎧', '🎵', '🎶', '📱', '💻', '⌚', '📷', '🎥', '📹', '📺', '🔊', '🔔', '📢', '📣', '💬', '💭', '🗨️', '💡']

async function getAutoReactSettings(db) {
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

const reactCooldown = new Map()

function canReact(jid) {
  const now = Date.now()
  const last = reactCooldown.get(jid) || 0
  return now - last > 2000
}

function setReactCooldown(jid, cooldown) {
  reactCooldown.set(jid, Date.now() + cooldown)
}

function shouldReactByChance(chance) {
  return Math.random() * 100 < chance
}

function getRandomEmoji(emojis) {
  return emojis[Math.floor(Math.random() * emojis.length)]
}

export default {
  name: 'autoreact',
  event: 'messages.upsert',
  enabled: true,
  desc: 'Auto react to messages with customizable settings',

  async execute(sock, m, { db, logger }) {
    try {
      if (!m.messages ||!m.messages[0]) return
      const msg = m.messages[0]
      if (msg.key.fromMe) return
      if (!msg.message) return

      const from = msg.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const isChannel = from.endsWith('@newsletter')
      const isDm =!isGroup &&!isChannel

      const settings = await getAutoReactSettings(db)
      if (!settings.enabled) return

      if (!canReact(from)) return
      if (!shouldReactByChance(settings.chance)) return

      let shouldReact = false

      switch (settings.mode) {
        case 'all':
          shouldReact = true
          break
        case 'groups':
          shouldReact = isGroup
          break
        case 'dms':
          shouldReact = isDm
          break
        case 'channels':
          shouldReact = isChannel
          break
        case 'special':
          if (isGroup && settings.specialGroups.includes(from)) shouldReact = true
          if (isDm && settings.specialDms.includes(from)) shouldReact = true
          if (isChannel && settings.specialChannels.includes(from)) shouldReact = true
          break
        default:
          shouldReact = true
      }

      if (!shouldReact) return

      let emoji = settings.specificEmoji
      if (!emoji || settings.random) {
        emoji = getRandomEmoji(settings.emojis.length > 0? settings.emojis : DEFAULT_EMOJIS)
      }

      await sock.sendMessage(from, {
        react: {
          text: emoji,
          key: msg.key
        }
      })

      setReactCooldown(from, settings.cooldown)
      logger.info('AUTOREACT', `Reacted ${emoji} in ${from.split('@')[0]}`)

    } catch (e) {
      logger.error('AUTOREACT', 'Failed to react', e.message)
    }
  }
}