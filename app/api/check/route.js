export const runtime = 'edge'
export const maxDuration = 30

export async function GET() {
  try {
    // The lostrelics site renders items server-side with data from their API
    // We fetch the full rendered HTML with a proper browser-like request
    const res = await fetch('https://lostrelics.io/items', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const items = []
    const rarities = ['Transcendent', 'Mythical', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Special', 'Common', 'Titanforged']

    // Split on item links
    const chunks = html.split(/href="https?:\/\/lostrelics\.io\/items\//)

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i]

      // Extract slug
      const slugMatch = chunk.match(/^([a-zA-Z0-9_-]+)["']/)
      if (!slugMatch) continue
      const slug = slugMatch[1].toLowerCase()

      // Only "X of Y remaining" items
      const supplyMatch = chunk.match(/(\d[\d,]*)\s+of\s+(\d[\d,]*)\s+remaining/)
      if (!supplyMatch) continue

      const remaining = parseInt(supplyMatch[1].replace(/,/g, ''))
      const total = parseInt(supplyMatch[2].replace(/,/g, ''))
      if (isNaN(remaining) || isNaN(total) || total === 0) continue

      // Extract name - text before "Image" keyword in the chunk
      let name = slug
      const nameMatch = chunk.match(/^\s*[^>]*>\s*([^<\n]{2,60}?)\s+Image\b/)
      if (nameMatch) {
        name = nameMatch[1].trim()
      } else {
        // Fallback: capitalize slug
        name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      }

      // Extract rarity
      let rarity = 'Unknown'
      for (const r of rarities) {
        if (chunk.includes(r)) { rarity = r; break }
      }

      items.push({ slug, name, remaining, total, rarity })
    }

    // Deduplicate by slug
    const seen = new Set()
    const unique = items.filter(i => {
      if (seen.has(i.slug)) return false
      seen.add(i.slug)
      return true
    })

    return Response.json({
      items: unique,
      fetchedAt: new Date().toISOString(),
      htmlLength: html.length,
      debug: `Found ${unique.length} items with X/Y supply in ${html.length} chars`
    })
  } catch (e) {
    return Response.json({ error: e.message, stack: e.stack }, { status: 500 })
  }
}
