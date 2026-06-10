/**
 * AstraX - plugins/commands/games/ttt.js
 * TicTacToe - 3x3 board with pic mode support
 * Category: games
 */

import { renderTTT } from '../../utils/gameRenderer.js'
import { getGameUser, addWin, addLoss, addDraw, getGameSettings } from '../../utils/gameXP.js'

const activeGames = new Map()

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
]

function renderBoardText(board, showNumbers = false) {
  const symbols = board.map((cell, i) => {
    if (cell === 'X') return '❌'
    if (cell === 'O') return '⭕'
    return showNumbers? `${i + 1}️⃣` : '⬜'
  })

  return `╭─────〔 TICTACTOE 〕─────┈⊷
│ ${symbols[0]} ${symbols[1]} ${symbols[2]}
│ ${symbols[3]} ${symbols[4]} ${symbols[5]}
│ ${symbols[6]} ${symbols[7]} ${symbols[8]}
╰─────────────────────────⊷`
}

function checkWinner(board) {
  for (const combo of winningCombos) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo }
    }
  }
  if (!board.includes(null)) return { winner: 'draw', combo: null }
  return { winner: null, combo: null }
}

function botMove(board) {
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O'
      if (checkWinner(board).winner === 'O') {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'X'
      if (checkWinner(board).winner === 'X') {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  if (board[4] === null) return 4

  const corners = [0, 2, 6, 8].filter(i => board[i] === null)
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)]

  const available = board.map((cell, i) => cell === null? i : null).filter(i => i!== null)
  return available[Math.floor(Math.random() * available.length)]
}

export default {
  name: 'tictactoe',
  alias: ['ttt', 'tic', 'xo'],
  desc: 'TicTacToe game: 3x3 board. Play vs bot or friend',
  category: 'games',
  usage: 'ttt start | ttt move 1-9 | ttt stop | ttt board',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from, sender, isGroup, prefix }) {
    try {
      if (!isGroup) {
        return await sock.sendMessage(from, {
          text: 'This command only works in groups',
          contextInfo
        }, { quoted: m })
      }

      const body = m.message?.conversation || m.message?.extendedTextMessage?.text || ''
      const cmdArgs = body.trim().split(' ').slice(1)
      const action = cmdArgs[0]?.toLowerCase()
      const settings = await getGameSettings(db, from)

      if (!action) {
        await sock.sendMessage(from, { react: { text: '🎯', key: m.key } })
        return await sock.sendMessage(from, {
          text: `╭─────〔 TICTACTOE 〕─────┈⊷
│ Classic 3x3 game
│ Get 3 in a row to win
├─────────────────────────⊷
│ Commands:
│ ${prefix}ttt start - Play vs Bot
│ ${prefix}ttt start @user - Play vs Friend
│ ${prefix}ttt move <1-9> - Make move
│ ${prefix}ttt stop - End game
│ ${prefix}ttt board - Show board
├─────────────────────────⊷
│ Board positions:
│ 1️⃣ 2️⃣ 3️⃣
│ 4️⃣ 5️⃣ 6️⃣
│ 7️⃣ 8️⃣ 9️⃣
│ Picture Mode: ${settings.picMode? 'ON ✅' : 'OFF ❌'}
╰─────────────────────────⊷`
        }, { quoted: m })
      }

      if (action === 'board') {
        const game = activeGames.get(from)
        if (!game) return await sock.sendMessage(from, { text: `No active game. Start with ${prefix}ttt start` }, { quoted: m })

        if (settings.picMode) {
          const playerXData = await getGameUser(db, from, game.playerX)
          const playerOData = await getGameUser(db, from, game.playerO)

          const imageBuffer = await renderTTT({
            board: game.board,
            playerX: { jid: game.playerX, background: playerXData.background },
            playerO: { jid: game.playerO, background: playerOData.background },
            currentTurn: game.turn,
            sock
          })

          if (imageBuffer) {
            return await sock.sendMessage(from, {
              image: imageBuffer,
              caption: `Turn: ${game.turn === 'X'? '❌' : '⭕'} @${game.currentPlayer.split('@')[0]}`,
              mentions: [game.currentPlayer]
            }, { quoted: m })
          }
        }

        return await sock.sendMessage(from, {
          text: renderBoardText(game.board, true) + `\nTurn: ${game.turn === 'X'? '❌' : '⭕'} @${game.currentPlayer.split('@')[0]}`,
          mentions: [game.currentPlayer]
        }, { quoted: m })
      }

      if (action === 'stop' || action === 'end') {
        const game = activeGames.get(from)
        if (!game) return await sock.sendMessage(from, { text: 'No active game' }, { quoted: m })

        activeGames.delete(from)
        await sock.sendMessage(from, { react: { text: '🛑', key: m.key } })
        return await sock.sendMessage(from, { text: 'Game stopped' }, { quoted: m })
      }

      if (action === 'start') {
        if (activeGames.has(from)) return await sock.sendMessage(from, { text: `Game already running! Use ${prefix}ttt move <1-9>` }, { quoted: m })

        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
        const opponent = mentioned[0] || 'bot'
        const isBot = opponent === 'bot'

        const gameData = {
          board: Array(9).fill(null),
          turn: 'X',
          playerX: sender,
          playerO: opponent,
          currentPlayer: sender,
          vsBot: isBot,
          msgKey: null
        }

        activeGames.set(from, gameData)
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

        if (settings.picMode) {
          const playerXData = await getGameUser(db, from, sender)
          const playerOData = isBot? { background: 'black' } : await getGameUser(db, from, opponent)

          const imageBuffer = await renderTTT({
            board: gameData.board,
            playerX: { jid: sender, background: playerXData.background },
            playerO: { jid: opponent, background: playerOData.background },
            currentTurn: 'X',
            sock
          })

          if (imageBuffer) {
            const sent = await sock.sendMessage(from, {
              image: imageBuffer,
              caption: `You: ❌ | ${isBot? 'Bot: ⭕' : `Opponent: ⭕ @${opponent.split('@')[0]}`}\nTurn: ❌ @${sender.split('@')[0]}\nUse: ${prefix}ttt move <1-9>`,
              mentions: isBot? [sender] : [sender, opponent]
            }, { quoted: m })
            gameData.msgKey = sent.key
            return
          }
        }

        const sent = await sock.sendMessage(from, {
          text: renderBoardText(gameData.board, true) + `\nYou: ❌ | ${isBot? 'Bot: ⭕' : `Opponent: ⭕ @${opponent.split('@')[0]}`}\nTurn: ❌ @${sender.split('@')[0]}\nUse: ${prefix}ttt move <1-9>`,
          mentions: isBot? [sender] : [sender, opponent]
        }, { quoted: m })

        gameData.msgKey = sent.key
        return
      }

      if (action === 'move' || action === 'm') {
        const pos = parseInt(cmdArgs[1]) - 1
        if (isNaN(pos) || pos < 0 || pos > 8) {
          return await sock.sendMessage(from, { text: 'Invalid position. Use 1-9' }, { quoted: m })
        }

        const game = activeGames.get(from)
        if (!game) return await sock.sendMessage(from, { text: `No game running. Start with ${prefix}ttt start` }, { quoted: m })

        if (game.currentPlayer!== sender) {
          return await sock.sendMessage(from, { text: `Not your turn! Wait for @${game.currentPlayer.split('@')[0]}`, mentions: [game.currentPlayer] }, { quoted: m })
        }

        if (game.board[pos]!== null) {
          await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
          return await sock.sendMessage(from, { text: `Position ${pos + 1} already taken` }, { quoted: m })
        }

        game.board[pos] = game.turn
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

        let { winner } = checkWinner(game.board)

        if (settings.picMode) {
          const playerXData = await getGameUser(db, from, game.playerX)
          const playerOData = game.vsBot? { background: 'black' } : await getGameUser(db, from, game.playerO)

          const imageBuffer = await renderTTT({
            board: game.board,
            playerX: { jid: game.playerX, background: playerXData.background },
            playerO: { jid: game.playerO, background: playerOData.background },
            currentTurn: game.turn,
            sock
          })

          if (imageBuffer && game.msgKey) {
            try {
              await sock.sendMessage(from, { delete: game.msgKey })
            } catch {}

            const sent = await sock.sendMessage(from, {
              image: imageBuffer,
              caption: `Move: ${game.turn === 'X'? '❌' : '⭕'} → ${pos + 1}`
            }, { quoted: m })
            game.msgKey = sent.key
          }
        } else if (game.msgKey) {
          try {
            await sock.sendMessage(from, {
              edit: game.msgKey,
              text: renderBoardText(game.board) + `\nMove: ${game.turn === 'X'? '❌' : '⭕'} → ${pos + 1}`
            })
          } catch {}
        }

        if (winner) {
          activeGames.delete(from)

          if (winner === 'draw') {
            await addDraw(db, from, game.playerX)
            if (!game.vsBot) await addDraw(db, from, game.playerO)

            const winText = `╭─────〔 DRAW 〕─────┈⊷
│ No winner this time
│ +20 XP each
╰─────────────────────────⊷`
            await sock.sendMessage(from, { react: { text: '🤝', key: m.key } })
            return await sock.sendMessage(from, { text: winText }, { quoted: m })
          } else {
            const winnerId = winner === 'X'? game.playerX : game.playerO
            const loserId = winner === 'X'? game.playerO : game.playerX

            await addWin(db, from, winnerId)
            if (!game.vsBot) await addLoss(db, from, loserId)

            const winText = `╭─────〔 WINNER 〕─────┈⊷
│ Winner: ${winner === 'X'? '❌' : '⭕'} @${winnerId.split('@')[0]}
│ +50 XP
╰─────────────────────────⊷`
            await sock.sendMessage(from, { react: { text: '🎉', key: m.key } })
            return await sock.sendMessage(from, { text: winText, mentions: [winnerId] }, { quoted: m })
          }
        }

        game.turn = game.turn === 'X'? 'O' : 'X'
        game.currentPlayer = game.turn === 'X'? game.playerX : game.playerO

        if (game.vsBot && game.turn === 'O') {
          await new Promise(r => setTimeout(r, 800))

          const botPos = botMove(game.board)
          game.board[botPos] = 'O'

          winner = checkWinner(game.board).winner

          if (settings.picMode) {
            const playerXData = await getGameUser(db, from, game.playerX)
            const imageBuffer = await renderTTT({
              board: game.board,
              playerX: { jid: game.playerX, background: playerXData.background },
              playerO: { jid: game.playerO, background: 'black' },
              currentTurn: 'O',
              sock
            })

            if (imageBuffer && game.msgKey) {
              try {
                await sock.sendMessage(from, { delete: game.msgKey })
              } catch {}

              const sent = await sock.sendMessage(from, {
                image: imageBuffer,
                caption: `Bot: ⭕ → ${botPos + 1}`
              }, { quoted: m })
              game.msgKey = sent.key
            }
          } else if (game.msgKey) {
            try {
              await sock.sendMessage(from, {
                edit: game.msgKey,
                text: renderBoardText(game.board) + `\nBot: ⭕ → ${botPos + 1}`
              })
            } catch {}
          }

          if (winner) {
            activeGames.delete(from)

            if (winner === 'draw') {
              await addDraw(db, from, game.playerX)
              const winText = `╭─────〔 DRAW 〕─────┈⊷
│ Good game
│ +20 XP
╰─────────────────────────⊷`
              return await sock.sendMessage(from, { text: winText }, { quoted: m })
            } else {
              await addLoss(db, from, game.playerX)
              const winText = `╭─────〔 BOT WINS 〕─────┈⊷
│ Better luck next time
│ +10 XP
╰─────────────────────────⊷`
              return await sock.sendMessage(from, { text: winText }, { quoted: m })
            }
          }

          game.turn = 'X'
          game.currentPlayer = game.playerX
        }

        return
      }

      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, { text: `Invalid. Use: start, move, board, stop` }, { quoted: m })

    } catch (err) {
      logger.error('TTT ERROR', err.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, { text: 'Game error' }, { quoted: m })
    }
  }
}