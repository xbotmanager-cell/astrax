/**
 * AstraX - plugins/commands/owner/stats.js
 * Display full bot statistics
 * Host, DB, Commands, Memory, Uptime
 */

import os from 'os'
import { performance } from 'perf_hooks'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─── GET PACKAGE VERSION ──────────────────────────────────
let PACKAGE_VERSION = '1.0.0'
try {
  const pkgPath = join(__dirname, '..', '..', '..', 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  PACKAGE_VERSION = pkg.version || '1.0.0'
} catch (e) {
  // Fallback if package.json not found
}

export default {
  name: 'stats',
  alias: ['status', 'botinfo', 'sysinfo', 'info'],
  desc: 'Show complete bot statistics',
  category: 'owner',
  usage: '.stats',
  permission: 'owner',

  async execute(sock, m, args, { db, logger, contextInfo, from, botname, prefix, commands, loadedPlugins }) {
    try {
      const startTime = performance.now()

      // ─── GET DB STATS ─────────────────────────────────────
      const [
        currentBotName,
        currentPrefix,
        dbVersion,
        totalUsers,
        totalGroups,
        totalCommands,
        totalPlugins
      ] = await Promise.all([
        db.get('botname'),
        db.get('prefix'),
        db.get('version'), // Check DB for version first
        db.get('userCount'),
        db.get('groupCount'),
        db.get('commandCount'),
        db.get('pluginCount')
      ])

      const actualVersion = dbVersion || PACKAGE_VERSION

      // ─── GET SYSTEM STATS ─────────────────────────────────
      const memUsage = process.memoryUsage()
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const cpuModel = os.cpus()[0].model
      const cpuCores = os.cpus().length
      const platform = os.platform()
      const nodeVersion = process.version
      const uptime = process.uptime()

      // ─── FORMAT UPTIME ────────────────────────────────────
      const formatUptime = (seconds) => {
        const d = Math.floor(seconds / 86400)
        const h = Math.floor((seconds % 86400) / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        return `${d}d ${h}h ${m}m ${s}s`
      }

      // ─── FORMAT BYTES ─────────────────────────────────────
      const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
      }

      // ─── COMMAND COUNTS ───────────────────────────────────
      const cmdCount = commands?.size || totalCommands || 0
      const pluginCount = loadedPlugins?.length || totalPlugins || 0
      const categoryCount = new Set([...commands?.values() || []].map(cmd => cmd.category)).size

      const endTime = performance.now()
      const responseTime = (endTime - startTime).toFixed(2)

      // ─── BUILD STATS MESSAGE ──────────────────────────────
      const statsText = `
╭─────〔 ${currentBotName || botname || 'Bot'} STATS 〕─────┈⊷
│ ◦➛ Prefix: ${currentPrefix || prefix || '.'}
│ ◦➛ Version: ${actualVersion}
│ ◦➛ Uptime: ${formatUptime(uptime)}
│ ◦➛ Response: ${responseTime}ms
╰─────────────────────────⊷

╭─────〔 DATABASE 〕─────┈⊷
│ ◦➛ Users: ${totalUsers || 0}
│ ◦➛ Groups: ${totalGroups || 0}
│ ◦➛ Commands: ${cmdCount}
│ ◦➛ Plugins: ${pluginCount}
│ ◦➛ Categories: ${categoryCount}
╰─────────────────────────⊷

╭─────〔 SYSTEM 〕─────┈⊷
│ ◦➛ Platform: ${platform}
│ ◦➛ Node: ${nodeVersion}
│ ◦➛ CPU: ${cpuCores}x Core
│ ◦➛ RAM: ${formatBytes(usedMem)} / ${formatBytes(totalMem)}
╰─────────────────────────⊷

╭─────〔 MEMORY 〕─────┈⊷
│ ◦➛ RSS: ${formatBytes(memUsage.rss)}
│ ◦➛ Heap: ${formatBytes(memUsage.heapUsed)} / ${formatBytes(memUsage.heapTotal)}
│ ◦➛ External: ${formatBytes(memUsage.external)}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: statsText.trim(),
        contextInfo
      }, { quoted: m })

      logger.info('STATS', `Stats viewed by ${m.key.participant || from}`)

    } catch (e) {
      logger.error('STATS', 'Failed to get stats', e.message)

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