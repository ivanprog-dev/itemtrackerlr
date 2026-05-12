export const runtime = 'edge'
export const maxDuration = 30

export async function GET() {
  try {
    const url = encodeURIComponent('https://lostrelics.io/items')
    const res = await fetch(`https://api.allorigins.win/get?url=${url}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`)
    const json = await res.json()
    const html = json.contents

    if (!html) throw new Error('Proxy returned empty content')

    const items = parseItems(html)

    return Response.json({
      items,
      fetchedAt: new Date().toISOString(),
      debug: `Parsed ${items.length} items from ${html.length} chars`
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

function parseItems(html) {
  const items = []
  const rarities = ['Transcendent','Mythical','Legendary','Epic','Rare','Uncommon','Common','Special','Titanforged']
  const seen = new Set()

  const parts = html.split(/href="https?:\/\/lostrelics\.io\/items\//)

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]

    const slugMatch = chunk.match(/^([a-zA-Z0-9_-]+)["']/)
    if (!slugMatch) continue
    const slug = slugMatch[1].toLowerCase()
    if (seen.has(slug)) continue

    const supplyMatch = chunk.match(/(\d[\d,]*)\s+of\s+(\d[\d,]*)\s+remaining/)
    if (!supplyMatch) continue

    const remaining = parseInt(supplyMatch[1].replace(/,/g, ''))
    const total = parseInt(supplyMatch[2].replace(/,/g, ''))
    if (isNaN(remaining) || isNaN(total) || total === 0) continue

    let name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const nameMatch = chunk.match(/^\s*[^>]*>\s*([^<\n]{2,80}?)\s+Image\b/)
    if (nameMatch) name = nameMatch[1].trim()

    let rarity = 'Unknown'
    for (const r of rarities) {
      if (chunk.includes(r)) { rarity = r; break }
    }

    seen.add(slug)
    items.push({ slug, name, remaining, total, rarity })
  }

  return items
}
