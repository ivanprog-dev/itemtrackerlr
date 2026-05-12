'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const RARITY_COLORS = {
  Transcendent: { bg: '#2a1f4a', border: '#7f77dd', text: '#afa9ec' },
  Mythical:     { bg: '#3a2a10', border: '#ba7517', text: '#ef9f27' },
  Legendary:    { bg: '#0e2240', border: '#378add', text: '#85b7eb' },
  Epic:         { bg: '#1a2e10', border: '#639922', text: '#97c459' },
  Rare:         { bg: '#3a0e0e', border: '#a32d2d', text: '#f09595' },
  Uncommon:     { bg: '#1e1e1e', border: '#5f5e5a', text: '#b4b2a9' },
  Special:      { bg: '#2e1a2a', border: '#993556', text: '#ed93b1' },
}

function RarityBadge({ rarity }) {
  const c = RARITY_COLORS[rarity] || RARITY_COLORS.Uncommon
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 10,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      whiteSpace: 'nowrap', fontWeight: 500
    }}>{rarity}</span>
  )
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE') + ' ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Home() {
  const [snapshot, setSnapshot] = useState({})
  const [drops, setDrops] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState(null)
  const [itemCount, setItemCount] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [newDropsCount, setNewDropsCount] = useState(0)

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('lr_snapshot') || '{}')
      const d = JSON.parse(localStorage.getItem('lr_drops') || '[]')
      const l = localStorage.getItem('lr_lastfetch') || null
      const c = localStorage.getItem('lr_itemcount') || null
      setSnapshot(s)
      setDrops(d)
      setLastFetch(l)
      setItemCount(c ? parseInt(c) : null)
    } catch {}
  }, [])

  async function doFetch() {
    setLoading(true)
    setError('')
    setNewDropsCount(0)
    try {
      const res = await fetch('/api/check')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const newDrops = []
      const newSnapshot = {}

      for (const item of data.items) {
        newSnapshot[item.slug] = item.remaining
        const prev = snapshot[item.slug]
        if (prev !== undefined && item.remaining < prev) {
          newDrops.push({
            ...item,
            prev,
            diff: prev - item.remaining,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const allDrops = [...newDrops, ...drops].slice(0, 500)
      setSnapshot(newSnapshot)
      setDrops(allDrops)
      setLastFetch(data.fetchedAt)
      setItemCount(data.items.length)
      setNewDropsCount(newDrops.length)

      localStorage.setItem('lr_snapshot', JSON.stringify(newSnapshot))
      localStorage.setItem('lr_drops', JSON.stringify(allDrops))
      localStorage.setItem('lr_lastfetch', data.fetchedAt)
      localStorage.setItem('lr_itemcount', data.items.length)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const isFirstFetch = Object.keys(snapshot).length === 0

  const filtered = drops.filter(d => {
    if (rarityFilter && d.rarity !== rarityFilter) return false
    if (filter && !d.name.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  return (
    <div className={styles.page}>
      <div className={styles.sidebar}>
        <div className={styles.logo}>
          <span style={{ color: '#e85d2f' }}>◈</span> Drop Tracker
        </div>

        <div className={styles.section}>
          <button className={styles.btnFetch} onClick={doFetch} disabled={loading}>
            {loading ? '⏳ Lädt…' : isFirstFetch ? '▶ Ersten Snapshot laden' : '🔄 Jetzt prüfen'}
          </button>
          {isFirstFetch && (
            <p className={styles.hint}>Beim ersten Klick wird der aktuelle Supply gespeichert. Beim nächsten Klick siehst du alle Drops die seitdem passiert sind.</p>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Status</div>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>Letzter Abruf</span>
            <span className={styles.infoVal}>{lastFetch ? formatTime(lastFetch) : '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>Items getrackt</span>
            <span className={styles.infoVal}>{itemCount ?? '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>Drops gesamt</span>
            <span className={styles.infoVal} style={{ color: drops.length > 0 ? '#e85d2f' : undefined }}>{drops.length}</span>
          </div>
        </div>

        {error && (
          <div className={styles.section}>
            <div className={styles.errorBox}>{error}</div>
          </div>
        )}

        <div className={styles.section} style={{ marginTop: 'auto' }}>
          <button className={styles.btnClear} onClick={() => {
            if (confirm('Alle Drops und den Snapshot löschen?')) {
              setDrops([]); setSnapshot({}); setLastFetch(null); setItemCount(null)
              localStorage.removeItem('lr_drops')
              localStorage.removeItem('lr_snapshot')
              localStorage.removeItem('lr_lastfetch')
              localStorage.removeItem('lr_itemcount')
            }
          }}>Historie & Snapshot leeren</button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.mainHeader}>
          <div>
            <h1 className={styles.mainTitle}>Drop-Historie</h1>
            <p className={styles.mainSub}>
              {newDropsCount > 0
                ? `✅ ${newDropsCount} neuer Drop${newDropsCount > 1 ? 's' : ''} seit dem letzten Abruf!`
                : lastFetch && !isFirstFetch ? '✓ Keine neuen Drops seit dem letzten Abruf.'
                : 'Noch kein Vergleich möglich – lade zweimal um Drops zu sehen.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className={styles.searchInput}
              placeholder="Item suchen…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <select className={styles.selectInput} value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}>
              <option value="">Alle Raritäten</option>
              {Object.keys(RARITY_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontSize: 36, color: '#333' }}>◈</div>
            <div className={styles.emptyTitle}>
              {isFirstFetch ? 'Noch kein Snapshot vorhanden' : 'Keine Drops aufgezeichnet'}
            </div>
            <div className={styles.emptySub}>
              {isFirstFetch
                ? 'Klicke auf „Ersten Snapshot laden" um zu starten.'
                : 'Beim nächsten Abruf werden Drops hier angezeigt.'}
            </div>
          </div>
        ) : (
          <div className={styles.dropList}>
            <div className={styles.dropCount}>{filtered.length} Drop{filtered.length !== 1 ? 's' : ''}</div>
            {filtered.map((d, i) => (
              <div key={i} className={styles.dropRow}>
                <div className={styles.dropLeft}>
                  <div className={styles.dropTime}>{formatTime(d.timestamp)}</div>
                  <div className={styles.dropName}>{d.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <RarityBadge rarity={d.rarity} />
                    <span className={styles.dropSupply}>{d.remaining} / {d.total} verbleibend</span>
                  </div>
                </div>
                <div className={styles.dropRight}>
                  <div className={styles.dropDiff}>-{d.diff}</div>
                  <div className={styles.dropPrev}>{d.prev} → {d.remaining}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
