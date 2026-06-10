/**
 * AstraX - plugins/commands/games/gameshop.js
 * Game Shop - Buy backgrounds with XP
 * Category: games
 */

import assets from '../economy/assets.js'
import { getGameUser, getInventory } from '../../utils/gameXP.js'

export default {
  name: 'gameshop',
  alias: ['gshop', 'bgshop'],
  desc: 'View and buy game backgrounds with XP',
  category: 'games',
  usage: 'gameshop',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from, sender, isGroup, prefix }) {
    try {
      if (!isGroup) {
        return await sock.sendMessage(from, {
          text: 'This command only works in groups',
          contextInfo
        }, { quoted: m })
      }

      const user = await getGameUser(db, from, sender)
      const inventory = await getInventory(db, sender)
      const backgrounds = Object.values(assets)

      let shopText = `
╭─────〔 GAME SHOP 〕─────┈⊷
│ ◦➛ Your XP: ${user.xp.toLocaleString()}
│ ◦➛ Owned: ${inventory.length}/${backgrounds.length}
├─────────────────────────⊷
`

      backgrounds
      .sort((a, b) => a.price - b.price)
      .forEach(bg => {
          const owned = inventory.includes(bg.id)
          const status = owned? '✅ OWNED' : `${bg.price.toLocaleString()} XP`
          const tierIcon = bg.tier === 'legendary'? '💎' : bg.tier === 'epic'? '🔥' : bg.tier === 'rare'? '⭐' : '⚪'

          shopText += `│ ${tierIcon} [${bg.name}] ${status}\n`
        })

      shopText += `├─────────────────────────⊷
│ ◦➛ Buy: ${prefix}gamebuy <name>
│ ◦➛ Equip: ${prefix}gameset <name>
╰─────────────────────────⊷`

      await sock.sendMessage(from, {
        text: shopText.trim(),
        contextInfo
      }, { quoted: m })

    } catch (e) {
      logger.error('GAMESHOP', 'Shop failed', e.message)
      await sock.sendMessage(from, {
        text: 'Failed to load shop',
        contextInfo
      }, { quoted: m })
    }
  }
}