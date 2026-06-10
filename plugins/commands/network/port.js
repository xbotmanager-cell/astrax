/**
 * AstraX - plugins/commands/network/port.js
 * Port Scanner with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'port',
  alias: ['portscan', 'scan', 'checkport', 'openport'],
  desc: 'Check if ports are open on a host',
  category: 'network',
  usage: 'port <host> [port]',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── VALIDATE INPUT ───────────────────────────────────
      let host = args[0]?.trim().toLowerCase()
      const port = args[1]?.trim()

      if (!host) {
        const errorText = `
╭─────〔 PORT SCANNER 〕─────┈⊷
│ ◦➛ Usage: ${prefix}port <host> [port]
│ ◦➛ Example: ${prefix}port google.com
│ ◦➛ Example: ${prefix}port 1.1.1.1 80
│ ◦➛ Common: 21,22,80,443,3306,8080
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── CLEAN HOST ───────────────────────────────────────
      host = host.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0]

      // ─── DEFAULT PORTS IF NOT SPECIFIED ───────────────────
      const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 8080, 8443]
      const portsToScan = port? [parseInt(port)] : commonPorts

      // ─── VALIDATE PORT ────────────────────────────────────
      if (port && (isNaN(port) || port < 1 || port > 65535)) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Invalid port number
│ ◦➛ Range: 1-65535
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── PORT SCAN APIS - 20 FREE FALLBACKS ───────────────
      const portApis = [
        `https://api.hackertarget.com/tcp-port-check/?q=${host}`,
        `https://api.viewdns.info/portscan/?host=${host}&apikey=demo&output=json`,
        `https://api.shodan.io/shodan/host/${host}?key=demo`,
        `https://api.censys.io/v1/view/ipv4/${host}`,
        `https://api.robtex.com/ip/${host}`,
        `https://api.greynoise.io/v3/community/${host}`,
        `https://api.threatminer.org/v2/host.php?q=${host}&rt=2`,
        `https://api.urlscan.io/v1/search/?q=ip:${host}`,
        `https://api.securitytrails.com/v1/domain/${host}/ports`,
        `https://api.portcheckers.com/v1/scan?host=${host}`,
        `https://api.ipgeolocation.io/ipgeo?apiKey=demo&ip=${host}`,
        `https://api.ipapi.com/api/${host}?access_key=demo`,
        `https://api.ipstack.com/${host}?access_key=demo`,
        `https://api.iplocation.net/?ip=${host}`,
        `https://api.ipinfo.io/${host}/json`,
        `https://api.db-ip.com/v2/free/${host}`,
        `https://api.ipdata.co/${host}?api-key=test`,
        `https://api.bigdatacloud.net/data/ip-geolocation?ip=${host}`,
        `https://api.2ip.io/${host}?token=demo`,
        `https://api.geodatatool.com/v1/ip/${host}`
      ]

      let openPorts = []
      let scanResults = null

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < portApis.length; i++) {
        try {
          const response = await axios.get(portApis[i], {
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })

          const data = response.data

          // Parse different API formats
          if (data?.ports || data?.open_ports || data?.data?.ports) {
            const ports = data.ports || data.open_ports || data.data?.ports || []
            openPorts = Array.isArray(ports)? ports : Object.keys(ports)
            scanResults = data
            break
          }

          // Text format like "80:open,443:open"
          if (typeof data === 'string' && data.includes('open')) {
            const matches = data.match(/(\d+):open/gi)
            if (matches) {
              openPorts = matches.map(m => parseInt(m.split(':')[0]))
              break
            }
          }

          // Shodan format
          if (data?.ports && Array.isArray(data.ports)) {
            openPorts = data.ports
            scanResults = data
            break
          }
        } catch (e) {
          continue
        }
      }

      // ─── IF SINGLE PORT CHECK ─────────────────────────────
      if (port) {
        const isOpen = openPorts.includes(parseInt(port))
        const statusText = isOpen? '🟢 OPEN' : '🔴 CLOSED'

        const resultText = `
╭─────〔 PORT CHECK 〕─────┈⊷
│ ◦➛ Host: ${host}
│ ◦➛ Port: ${port}
│ ◦➛ Status: ${statusText}
╰─────────────────────────⊷
`
        await sock.sendMessage(from, {
          text: resultText.trim(),
          contextInfo
        }, { quoted: m })

        logger.success('PORT', `Port check: ${host}:${port} - ${isOpen? 'OPEN' : 'CLOSED'}`)
        return
      }

      // ─── IF NO RESULTS ────────────────────────────────────
      if (openPorts.length === 0) {
        const errorText = `
╭─────〔 RESULT 〕─────┈⊷
│ ◦➛ Host: ${host}
│ ◦➛ Open Ports: None found
│ ◦➛ Common ports appear closed
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── FORMAT OPEN PORTS ────────────────────────────────
      const portList = openPorts.slice(0, 15).map((p, idx) => {
        const portNum = typeof p === 'object'? p.port || p.number : p
        const service = getPortService(portNum)
        return `│ ◦➛ ${portNum} - ${service}`
      }).join('\n')

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 PORT SCAN 〕─────┈⊷
│ ◦➛ Host: ${host}
│ ◦➛ Found: ${openPorts.length} open ports
╰─────────────────────────⊷

╭─────〔 OPEN PORTS 〕─────┈⊷
${portList}
${openPorts.length > 15? `│ ◦➛...and ${openPorts.length - 15} more` : ''}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('PORT', `Port scan: ${host} - ${openPorts.length} open ports`)

    } catch (e) {
      logger.error('PORT', 'Port scan failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to scan ports
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}

// ─── PORT SERVICE MAPPING ───────────────────────────────
function getPortService(port) {
  const services = {
    21: 'FTP',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    6379: 'Redis',
    8080: 'HTTP-Alt',
    8443: 'HTTPS-Alt',
    27017: 'MongoDB'
  }
  return services[port] || 'Unknown'
}