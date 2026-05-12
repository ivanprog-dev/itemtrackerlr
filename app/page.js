'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const RARITY_ORDER = ['Transcendent','Mythical','Legendary','Epic','Rare','Uncommon','Common','Special','Titanforged','Unknown']
const RARITY_COLORS = {
  Transcendent: { bg: '#2a1f4a', border: '#7f77dd', text: '#afa9ec' },
  Mythical:     { bg: '#3a2a10', border: '#ba7517', text: '#ef9f27' },
  Legendary:    { bg: '#0e2240', border: '#378add', text: '#85b7eb' },
  Epic:         { bg: '#1a2e10', border: '#639922', text: '#97c459' },
  Rare:         { bg: '#3a0e0e', border: '#a32d2d', text: '#f09595' },
  Uncommon:     { bg: '#1e1e1e', border: '#5f5e5a', text: '#b4b2a9' },
  Common:       { bg: '#181818', border: '#444', text: '#888' },
  Special:      { bg: '#2e1a2a', border: '#993556', text: '#ed93b1' },
  Titanforged:  { bg: '#1a2a2a', border: '#1D9E75', text: '#5DCAA5' },
  Unknown:      { bg: '#1e1e1e', border: '#444', text: '#666' },
}

function RarityBadge({ rarity }) {
  const c = RARITY_COLORS[rarity] || RARITY_COLORS.Unknown
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 10,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      whiteSpace: 'nowrap', fontWeight: 500
    }}>{rarity}</span>
  )
}

function SupplyBar({ remaining, total }) {
  const pct = total > 0 ? Math.round(remaining / total * 100) : 0
  const color = pct < 10 ? '#e74c3c' : pct < 30 ? '#e85d2f' : pct < 60 ? '#f0c040' : '#2ecc71'
  return (
    <div style={{ marginTop: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 3 }}>
        <span>{remaining.toLocaleString()} / {total.toLocaleString()}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: '#222', borderRadius: 2 }}>
        <div style={{ height: 3, width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE') + ' ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const TABS = ['items', 'drops', 'favorites']

export default function Home() {
  const [tab, setTab] = useState('items')
  const [snapshot, setSnapshot] = useState({})
  const [currentItems, setCurrentItems] = useState([])
  const [drops, setDrops] = useState([])
  const [favorites, setFavorites] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [sortBy, setSortBy] = useState('rarity')
  const [newDropsCount, setNewDropsCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    try {
      setSnapshot(JSON.parse(localStorage.getItem('lr_snapshot') || '{}'))
      setDrops(JSON.parse(localStorage.getItem('lr_drops') || '[]'))
      setCurrentItems(JSON.parse(localStorage.getItem('lr_items') || '[]'))
      setFavorites(new Set(JSON.parse(localStorage.getItem('lr_favs') || '[]')))
      setLastFetch(localStorage.getItem('lr_lastfetch') || null)
    } catch {}
  }, [])

  async function doFetch() {
    setLoading(true)
    setError('')
    setNewDropsCount(0)
    try {
      const res = await fetch('/api/check')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.debug) setDebugInfo(data.debug)

      const newDrops = []
      const newSnapshot = {}

      for (const item of data.items) {
        newSnapshot[item.slug] = item.remaining
        const prev = snapshot[item.slug]
        if (prev !== undefined && item.remaining < prev) {
          newDrops.push({ ...item, prev, diff: prev - item.remaining, timestamp: new Date().toISOString() })
        }
      }

      const allDrops = [...newDrops, ...drops].slice(0, 500)
      setSnapshot(newSnapshot)
      setDrops(allDrops)
      setCurrentItems(data.items)
      setLastFetch(data.fetchedAt)
      setNewDropsCount(newDrops.length)

      localStorage.setItem('lr_snapshot', JSON.stringify(newSnapshot))
      localStorage.setItem('lr_drops', JSON.stringify(allDrops))
      localStorage.setItem('lr_items', JSON.stringify(data.items))
      localStorage.setItem('lr_lastfetch', data.fetchedAt)

      if (newDrops.length > 0) setTab('drops')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function toggleFav(slug) {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      localStorage.setItem('lr_favs', JSON.stringify([...next]))
      return next
    })
  }

  function applyFilters(list) {
    return list
      .filter(i => !rarityFilter || i.rarity === rarityFilter)
      .filter(i => !filter || i.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'rarity') return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
        if (sortBy === 'pct') return (a.remaining / a.total) - (b.remaining / b.total)
        if (sortBy === 'remaining') return a.remaining - b.remaining
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return 0
      })
  }

  const displayItems = applyFilters(tab === 'favorites'
    ? currentItems.filter(i => favorites.has(i.slug))
    : tab === 'items' ? currentItems : [])

  const filteredDrops = drops
    .filter(d => !rarityFilter || d.rarity === rarityFilter)
    .filter(d => !filter || d.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className={styles.page}>
      <div className={styles.sidebar}>
        <div className={styles.logo}>
          <span style={{ color: '#e85d2f' }}>◈</span> Drop Tracker
        </div>

        <div className={styles.section}>
          <button className={styles.btnFetch} onClick={doFetch} disabled={loading}>
            {loading ? '⏳ Lädt…' : Object.keys(snapshot).length === 0 ? '▶ Ersten Snapshot laden' : '🔄 Jetzt prüfen'}
          </button>
          {Object.keys(snapshot).length === 0 && (
            <p className={styles.hint}>Beim ersten Klick wird der aktuelle Supply gespeichert. Beim nächsten Klick siehst du alle Drops die seitdem passiert sind.</p>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Status</div>
          <div className={styles.infoRow}><span className={styles.infoLbl}>Letzter Abruf</span><span className={styles.infoVal}>{lastFetch ? formatTime(lastFetch) : '—'}</span></div>
          <div className={styles.infoRow}><span className={styles.infoLbl}>Items getrackt</span><span className={styles.infoVal}>{currentItems.length || '—'}</span></div>
          <div className={styles.infoRow}><span className={styles.infoLbl}>Drops gesamt</span><span className={styles.infoVal} style={{ color: drops.length > 0 ? '#e85d2f' : undefined }}>{drops.length}</span></div>
          <div className={styles.infoRow}><span className={styles.infoLbl}>Favoriten</span><span className={styles.infoVal}>⭐ {favorites.size}</span></div>
        </div>

        {error && <div className={styles.section}><div className={styles.errorBox}>{error}</div></div>}
        {debugInfo && <div className={styles.section}><div className={styles.debugBox}>{debugInfo}</div></div>}

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Filter & Sortierung</div>
          <input className={styles.input} placeholder="Item suchen…" value={filter} onChange={e => setFilter(e.target.value)} style={{ marginBottom: 6 }} />
          <select className={styles.input} value={rarityFilter} onChange={e => setRarityFilter(e.target.value)} style={{ marginBottom: 6 }}>
            <option value="">Alle Raritäten</option>
            {RARITY_ORDER.slice(0, -1).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {(tab === 'items' || tab === 'favorites') && (
            <select className={styles.input} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="rarity">Sortierung: Rarität</option>
              <option value="pct">Sortierung: % verbleibend ↑</option>
              <option value="remaining">Sortierung: Anzahl ↑</option>
              <option value="name">Sortierung: Name A–Z</option>
            </select>
          )}
        </div>

        <div className={styles.section} style={{ marginTop: 'auto' }}>
          <button className={styles.btnClear} onClick={() => {
            if (confirm('Alle Daten löschen?')) {
              setDrops([]); setSnapshot({}); setCurrentItems([]); setLastFetch(null)
              ;['lr_drops','lr_snapshot','lr_items','lr_lastfetch'].forEach(k => localStorage.removeItem(k))
            }
          }}>Alles zurücksetzen</button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'items' ? styles.tabActive : ''}`} onClick={() => setTab('items')}>
            Alle Items {currentItems.length > 0 && <span className={styles.tabCount}>{currentItems.length}</span>}
          </button>
          <button className={`${styles.tab} ${tab === 'favorites' ? styles.tabActive : ''}`} onClick={() => setTab('favorites')}>
            Favoriten {favorites.size > 0 && <span className={styles.tabCount}>{favorites.size}</span>}
          </button>
          <button className={`${styles.tab} ${tab === 'drops' ? styles.tabActive : ''}`} onClick={() => setTab('drops')}>
            Drop-Historie {drops.length > 0 && <span className={styles.tabCount} style={{ background: '#e85d2f' }}>{drops.length}</span>}
          </button>
        </div>

        {newDropsCount > 0 && (
          <div className={styles.dropBanner}>
            🔔 {newDropsCount} neuer Drop{newDropsCount > 1 ? 's' : ''} erkannt!
          </div>
        )}

        {(tab === 'items' || tab === 'favorites') && (
          <div className={styles.itemGrid}>
            {displayItems.length === 0 ? (
              <div className={styles.empty}>
                <div style={{ fontSize: 32, color: '#333' }}>◈</div>
                <div className={styles.emptyTitle}>{tab === 'favorites' ? 'Noch keine Favoriten' : 'Noch keine Items geladen'}</div>
                <div className={styles.emptySub}>{tab === 'favorites' ? 'Klicke auf ⭐ um Items zu favorisieren.' : 'Klicke auf „Ersten Snapshot laden".'}</div>
              </div>
            ) : displayItems.map(item => {
              const isFav = favorites.has(item.slug)
              const c = RARITY_COLORS[item.rarity] || RARITY_COLORS.Unknown
              const pct = Math.round(item.remaining / item.total * 100)
              return (
                <div key={item.slug} className={styles.itemCard} style={{ borderColor: isFav ? '#f0c040' : undefined }}>
                  <div className={styles.itemCardTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.itemName}>{item.name}</div>
                      <RarityBadge rarity={item.rarity} />
                    </div>
                    <button
                      className={styles.favBtn}
                      onClick={() => toggleFav(item.slug)}
                      title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                    >
                      {isFav ? '⭐' : '☆'}
                    </button>
                  </div>
                  <SupplyBar remaining={item.remaining} total={item.total} />
                </div>
              )
            })}
          </div>
        )}

        {tab === 'drops' && (
          <div className={styles.dropList}>
            {filteredDrops.length === 0 ? (
              <div className={styles.empty}>
                <div style={{ fontSize: 32, color: '#333' }}>◈</div>
                <div className={styles.emptyTitle}>Keine Drops aufgezeichnet</div>
                <div className={styles.emptySub}>Beim nächsten Abruf erscheinen Drops hier.</div>
              </div>
            ) : (
              <>
                <div className={styles.dropCount}>{filteredDrops.length} Drop{filteredDrops.length !== 1 ? 's' : ''}</div>
                {filteredDrops.map((d, i) => (
                  <div key={i} className={styles.dropRow}>
                    <div className={styles.dropLeft}>
                      <div className={styles.dropTime}>{formatTime(d.timestamp)}</div>
                      <div className={styles.dropName}>{d.name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        <RarityBadge rarity={d.rarity} />
                        <span className={styles.dropSupply}>{d.remaining.toLocaleString()} / {d.total.toLocaleString()} verbleibend</span>
                      </div>
                    </div>
                    <div className={styles.dropRight}>
                      <div className={styles.dropDiff}>-{d.diff}</div>
                      <div className={styles.dropPrev}>{d.prev} → {d.remaining}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
