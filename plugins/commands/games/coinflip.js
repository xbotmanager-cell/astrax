/**
 * AstraX - plugins/commands/games/coinflip.js
 * Coin Flip - Bet heads or tails vs bot
 * Category: games
 */

import sharp from 'sharp'
import fs from 'fs'
import axios from 'axios'
import { getGameUser, addWin, addLoss, getGameSettings } from '../../utils/gameXP.js'

const ASSETS_DIR = 'plugins/commands/economy/assets'

async function downloadPFP(jid, sock) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image')
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 })
    return Buffer.from(res.data)
  } catch {
    return await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 4,
        background: { r: 50, g: 50, b: 50, alpha: 1 }
      }
    }).png().toBuffer()
  }
}

async function renderCoinflip({ playerChoice, result, playerData, sock, rolling = false }) {
  try {
    const assets = (await import('../economy/assets.js')).default
    const bgData = assets[playerData.background] || assets['black']
    const glowColor = bgData?.glow || '#ffffff'

    const bgPath = `${ASSETS_DIR}/${playerData.background}.png`
    const bgExists = fs.existsSync(bgPath)
    const finalBgPath = bgExists? bgPath : `${ASSETS_DIR}/black.png`

    const pfpBuf = await downloadPFP(playerData.jid, sock)
    const pfpRounded = await sharp(pfpBuf)
    .resize(120, 120)
    .composite([{
        input: Buffer.from(`<svg><circle cx="60" cy="60" r="60"/></svg>`),
        blend: 'dest-in'
      }])
    .png()
    .toBuffer()

    const coinColor = result === 'heads'? '#FFD700' : '#C0C0C0'
    const coinText = rolling? '?' : result.toUpperCase()
    const coinEmoji = result === 'heads'? '🪙' : '⚪'

    const coinSVG = `
      <svg width="600" height="400">
        <rect x="0" y="0" width="600" height="400" fill="rgba(0,0,0,0.7)" rx="20"/>
        <text x="300" y="50" font-size="35" fill="white" text-anchor="middle" font-weight="bold">COIN FLIP</text>
        <circle cx="300" cy="200" r="80" fill="${coinColor}" stroke="white" stroke-width="5"/>
        <text x="300" y="220" font-size="25" fill="black" text-anchor="middle" font-weight="bold">${coinText}</text>
        <text x="300" y="180" font-size="60" text-anchor="middle">${coinEmoji}</text>
        ${rolling? '<text x="300" y="350" font-size="25" fill="yellow" text-anchor="middle" font-weight="bold">FLIPPING...</text>' : ''}
        <text x="150" y="350" font-size="20" fill="white" text-anchor="middle">You: ${playerChoice.toUpperCase()}</text>
        <text x="450" y="350" font-size="20" fill="white" text-anchor="middle">Result: ${rolling? '?' : result.toUpperCase()}</text>
      </svg>
    `

    const finalImage = await sharp(finalBgPath)
    .resize(1200, 630)
    .composite([
        { input: pfpRounded, top: 30, left: 30 },
        { input: Buffer.from(coinSVG), top: 150, left: 300 },
        { input: Buffer.from(`<svg><rect x="5" y="5" width="1190" height="620" fill="none" stroke="${glowColor}" stroke-width="8" rx="15"/></svg>`), top: 0, left: 0 }
      ])
    .png()
    .toBuffer()

    return finalImage
  } catch (e) {
    console.error('[COINFLIP RENDER ERROR]', e.message)
    return null
  }
}

function renderTextFlipping(phase, choice) {
  const frames = ['🪙', '⚪', '🪙', '⚪']
  const frame = frames[phase % 4]

  return `
╭─────〔 COIN FLIP 〕─────┈⊷
│ ◦➛ Your bet: ${choice.toUpperCase()}
│ ◦➛ Flipping: ${frame}
╰─────────────────────────⊷
`
}

export default {
  name: 'coinflip',
  alias: ['cf', 'flip', 'coin'],
  desc: 'Flip a coin vs bot. Bet heads or tails',
  category: 'games',
  usage: 'coinflip heads|tails',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from, sender, isGroup, prefix }) {
    try {
      if (!isGroup) {
        return await sock.sendMessage(from, {
          text: 'This command only works in groups',
          contextInfo
        }, { quoted: m })
      }

      const choice = args[0]?.toLowerCase()
      const validChoices = ['heads', 'tails', 'h', 't']

      if (!choice ||!validChoices.includes(choice)) {
        return await sock.sendMessage(from, {
          text: `╭─────〔 COIN FLIP 〕─────┈⊷
│ ◦➛ Usage: ${prefix}coinflip <choice>
│ ◦➛ Options: heads | tails
├─────────────────────────⊷
│ ◦➛ Example: ${prefix}coinflip heads
╰─────────────────────────⊷`,
          contextInfo
        }, { quoted: m })
      }

      const playerChoice = choice === 'h'? 'heads' : choice === 't'? 'tails' : choice

      await sock.sendMessage(from, { react: { text: '🪙', key: m.key } })

      const settings = await getGameSettings(db, from)
      const playerData = await getGameUser(db, from, sender)

      const result = Math.random() < 0.5? 'heads' : 'tails'
      const won = playerChoice === result

      let xpGain = 0
      let emoji = ''
      let resultText = ''

      if (won) {
        resultText = 'YOU WIN'
        xpGain = 50
        emoji = '🎉'
      } else {
        resultText = 'YOU LOSE'
        xpGain = 10
        emoji = '😢'
      }

      if (settings.picMode) {
        const rollingBuffer = await renderCoinflip({
          playerChoice,
          result,
          playerData: { jid: sender, background: playerData.background },
          sock,
          rolling: true
        })

        if (rollingBuffer) {
          const sent = await sock.sendMessage(from, {
            image: rollingBuffer,
            caption: 'Flipping coin...'
          }, { quoted: m })

          await new Promise(r => setTimeout(r, 1500))

          const finalBuffer = await renderCoinflip({
            playerChoice,
            result,
            playerData: { jid: sender, background: playerData.background },
            sock,
            rolling: false
          })

          if (finalBuffer) {
            try {
              await sock.sendMessage(from, { delete: sent.key })
            } catch {}

            await sock.sendMessage(from, {
              image: finalBuffer,
              caption: `
╭─────〔 COIN FLIP RESULT 〕─────┈⊷
│ ◦➛ Your bet: ${playerChoice.toUpperCase()}
│ ◦➛ Result: ${result.toUpperCase()}
│ ◦➛ ${resultText} ${emoji}
│ ◦➛ +${xpGain} XP
╰─────────────────────────⊷
`.trim()
            }, { quoted: m })
          }
        }
      } else {
        const sent = await sock.sendMessage(from, {
          text: renderTextFlipping(0, playerChoice).trim(),
          contextInfo
        }, { quoted: m })

        for (let i = 1; i < 4; i++) {
          await new Promise(r => setTimeout(r, 500))
          try {
            await sock.sendMessage(from, {
              edit: sent.key,
              text: renderTextFlipping(i, playerChoice).trim()
            })
          } catch {}
        }

        await new Promise(r => setTimeout(r, 500))

        const textResult = `
╭─────〔 COIN FLIP 〕─────┈⊷
│ ◦➛ Your bet: ${playerChoice.toUpperCase()}
│ ◦➛ Result: ${result.toUpperCase()}
├─────────────────────────⊷
│ ◦➛ ${resultText} ${emoji}
│ ◦➛ +${xpGain} XP
╰─────────────────────────⊷
`
        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: textResult.trim()
          })
        } catch {
          await sock.sendMessage(from, {
            text: textResult.trim(),
            contextInfo
          }, { quoted: m })
        }
      }

      if (won) {
        await addWin(db, from, sender)
      } else {
        await addLoss(db, from, sender)
      }

    } catch (e) {
      logger.error('COINFLIP', 'Coinflip failed', e.message)
      await sock.sendMessage(from, {
        text: 'Failed to flip coin',
        contextInfo
      }, { quoted: m })
    }
  }
}