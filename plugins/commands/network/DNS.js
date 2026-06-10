/**
 * AstraX - plugins/commands/network/dns.js
 * DNS Lookup with 20 free API fallbacks
 * Silent fallback - user never sees errors
 */

import axios from 'axios'

export default {
  name: 'dns',
  alias: ['dnslookup', 'dig', 'nslookup', 'resolve'],
  desc: 'Get DNS records for any domain',
  category: 'network',
  usage: 'dns <domain> [type]',
  permission: 'all',

  async execute(sock, m, args, { db, logger, contextInfo, from }) {
    try {
      // ─── GET PREFIX FROM DB ───────────────────────────────
      const prefix = await db.get('prefix') || '.'

      // ─── VALIDATE INPUT ───────────────────────────────────
      let domain = args[0]?.trim().toLowerCase()
      const recordType = args[1]?.toUpperCase() || 'A'

      if (!domain) {
        const errorText = `
╭─────〔 DNS LOOKUP 〕─────┈⊷
│ ◦➛ Usage: ${prefix}dns <domain> [type]
│ ◦➛ Types: A, AAAA, MX, TXT, NS, CNAME
│ ◦➛ Example: ${prefix}dns google.com
│ ◦➛ Example: ${prefix}dns google.com MX
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── CLEAN DOMAIN ─────────────────────────────────────
      domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]

      // ─── VALID RECORD TYPES ───────────────────────────────
      const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR', 'SRV']
      const dnsType = validTypes.includes(recordType)? recordType : 'A'

      // ─── DNS APIS - 20 FREE FALLBACKS ─────────────────────
      const dnsApis = [
        `https://dns.google/resolve?name=${domain}&type=${dnsType}`,
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=${dnsType}`,
        `https://api.hackertarget.com/dnslookup/?q=${domain}`,
        `https://api.viewdns.info/dnsrecord/?domain=${domain}&recordtype=${dnsType}&apikey=demo&output=json`,
        `https://dns-api.org/${dnsType}/${domain}`,
        `https://api.dnslookup.org/${domain}/${dnsType}`,
        `https://networkcalc.com/api/dns/lookup/${domain}?type=${dnsType}`,
        `https://api.bgpview.io/dns/${domain}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://dns.google/resolve?name=${domain}&type=${dnsType}`)}`,
        `https://api.codetabs.com/v1/proxy?quest=https://dns.google/resolve?name=${domain}&type=${dnsType}`,
        `https://api.cors.lol/?url=https://dns.google/resolve?name=${domain}&type=${dnsType}`,
        `https://api.securitytrails.com/v1/domain/${domain}/dns/${dnsType}`,
        `https://api.dnscheck.tools/lookup/${domain}/${dnsType}`,
        `https://api.mxtoolbox.com/api/v1/lookup/dns/${domain}`,
        `https://api.nslookup.io/${domain}/${dnsType}`,
        `https://api.dnschecker.org/dns-query?name=${domain}&type=${dnsType}`,
        `https://api.whoisxmlapi.com/dnslookup?apiKey=demo&domainName=${domain}&type=${dnsType}`,
        `https://api.dnslytics.com/v1/dns/${domain}/${dnsType}`,
        `https://api.dnswatch.info/dns/${domain}?type=${dnsType}`,
        `https://api.robtex.com/dns/${domain}`
      ]

      let dnsRecords = []

      // ─── TRY ALL APIS SILENTLY ────────────────────────────
      for (let i = 0; i < dnsApis.length; i++) {
        try {
          const response = await axios.get(dnsApis[i], {
            timeout: 7000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/dns-json'
            }
          })

          const data = response.data

          // Google DNS format
          if (data?.Answer) {
            dnsRecords = data.Answer.map(ans => ({
              type: dnsType,
              name: ans.name,
              value: ans.data,
              ttl: ans.TTL
            }))
            break
          }

          // Cloudflare format
          if (data?.Answer) {
            dnsRecords = data.Answer.map(ans => ({
              type: dnsType,
              name: ans.name,
              value: ans.data,
              ttl: ans.TTL
            }))
            break
          }

          // Generic array format
          if (Array.isArray(data)) {
            dnsRecords = data.map(rec => ({
              type: rec.type || dnsType,
              name: rec.name || domain,
              value: rec.value || rec.data || rec.rdata || rec.address,
              ttl: rec.ttl || rec.TTL || 0
            }))
            break
          }

          // Text format
          if (typeof data === 'string' && data.includes(domain)) {
            dnsRecords = data.split('\n').filter(line => line.trim()).map(line => ({
              type: dnsType,
              name: domain,
              value: line.trim(),
              ttl: 0
            }))
            break
          }
        } catch (e) {
          continue
        }
      }

      // ─── IF ALL FAILED ────────────────────────────────────
      if (!dnsRecords || dnsRecords.length === 0) {
        const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ No DNS records found
│ ◦➛ Try different type
╰─────────────────────────⊷
`
        return await sock.sendMessage(from, {
          text: errorText.trim(),
          contextInfo
        }, { quoted: m })
      }

      // ─── FORMAT RECORDS ───────────────────────────────────
      const recordList = dnsRecords.slice(0, 10).map((rec, idx) => {
        let value = rec.value
        if (typeof value === 'string' && value.length > 50) {
          value = value.slice(0, 50) + '...'
        }
        return `│ ◦➛ ${idx + 1}. ${value}${rec.ttl? ` [TTL: ${rec.ttl}]` : ''}`
      }).join('\n')

      // ─── BUILD RESULT MESSAGE ─────────────────────────────
      const resultText = `
╭─────〔 DNS RECORDS 〕─────┈⊷
│ ◦➛ Domain: ${domain}
│ ◦➛ Type: ${dnsType}
│ ◦➛ Found: ${dnsRecords.length} records
╰─────────────────────────⊷

╭─────〔 RESULTS 〕─────┈⊷
${recordList}
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: resultText.trim(),
        contextInfo
      }, { quoted: m })

      logger.success('DNS', `DNS lookup: ${domain} ${dnsType} - ${dnsRecords.length} records`)

    } catch (e) {
      logger.error('DNS', 'DNS lookup failed', e.message)

      const errorText = `
╭─────〔 ERROR 〕─────┈⊷
│ ◦➛ Failed to lookup DNS
╰─────────────────────────⊷
`
      await sock.sendMessage(from, {
        text: errorText.trim(),
        contextInfo
      }, { quoted: m })
    }
  }
}