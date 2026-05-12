export const runtime = 'edge'
export const maxDuration = 15

export async function GET() {
  try {
    const res = await fetch('https://lostrelics.io/items', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const items = []
    const rarities = ['Transcendent', 'Mythical', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Special']
    const chunks = html.split('href="https://lostrelics.io/items/')

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i]
      const slugMatch = chunk.match(/^([a-z0-9-]+)"/)
      if (!slugMatch) continue
      const slug = slugMatch[1]

      const supplyMatch = chunk.match(/(\d+)\s+of\s+(\d+)\s+remaining/)
      if (!supplyMatch) continue

      const remaining = parseInt(supplyMatch[1])
      const total = parseInt(supplyMatch[2])

      const nameMatch = chunk.match(/^[^>]*>([^<\n]+?)\s+Image/)
      const name = nameMatch ? nameMatch[1].trim() : slug

      let rarity = 'Unknown'
      for (const r of rarities) {
        if (chunk.includes(r)) { rarity = r; break }
      }

      items.push({ slug, name, remaining, total, rarity })
    }

    return Response.json({ items, fetchedAt: new Date().toISOString() })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
