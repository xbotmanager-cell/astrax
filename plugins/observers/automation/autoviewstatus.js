/**
 * AstraX - plugins/observers/autoviewstatus.js
 * Auto View Status - Auto view WhatsApp statuses with filters
 * Category: observer
 */

async function getAutoViewSettings(db) {
  return await db.get('autoViewStatus') || {
    enabled: false,
    mode: 'all', // all | contacts | special | exclude
    specialContacts: [], // jid array
    excludeContacts: [], // jid array
    cooldown: 5000,
    chance: 100
  }
}

const viewCooldown = new Map()

function canView(jid) {
  const now = Date.now()
  const last = viewCooldown.get(jid) || 0
  return now - last > 2000
}

function setViewCooldown(jid, cooldown) {
  viewCooldown.set(jid, Date.now() + cooldown)
}

function shouldViewByChance(chance) {
  return Math.random() * 100 < chance
}

export default {
  name: 'autoviewstatus',
  event: 'messages.upsert',
  enabled: true,
  desc: 'Auto view WhatsApp statuses with filters',

  async execute(sock, m, { db, logger }) {
    try {
      if (!m.messages ||!m.messages[0]) return
      const msg = m.messages[0]

      // Only status messages
      if (msg.key.remoteJid!== 'status@broadcast') return
      if (msg.key.fromMe) return

      const from = msg.key.participant
      if (!from) return

      const settings = await getAutoViewSettings(db)
      if (!settings.enabled) return

      if (!canView(from)) return
      if (!shouldViewByChance(settings.chance)) return

      let shouldView = false

      switch (settings.mode) {
        case 'all':
          shouldView = true
          break
        case 'contacts':
          const contacts = await sock.onWhatsApp(from.split('@')[0])
          shouldView = contacts.length > 0 && contacts[0].exists
          break
        case 'special':
          shouldView = settings.specialContacts.includes(from)
          break
        case 'exclude':
          shouldView =!settings.excludeContacts.includes(from)
          break
        default:
          shouldView = true
      }

      if (!shouldView) return

      await sock.readMessages([msg.key])
      setViewCooldown(from, settings.cooldown)
      logger.info('AUTOVIEW', `Viewed status from ${from.split('@')[0]}`)

    } catch (e) {
      logger.error('AUTOVIEW', 'Failed to view status', e.message)
    }
  }
}