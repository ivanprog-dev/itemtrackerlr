'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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
      whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '0.02em'
    }}>
      {rarity}
    </span>
  )
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTimeShort(iso) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [running, setRunning] = useState(false)
  const [interval, setIntervalSecs] = useState(60)
  const [snapshot, setSnapshot] = useState({})
  const [drops, setDrops] = useState([])
  const [checks, setChecks] = useState(0)
  const [itemCount, setItemCount] = useState(null)
  const [lastCheck, setLastCheck] = useState(null)
  const [nextIn, setNextIn] = useState(null)
  const [status, setStatus] = useState('idle') // idle | checking | ok | error
  const [errorMsg, setErrorMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const snapshotRef = useRef({})
  const runningRef = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lr_drops') || '[]')
      const savedSnap = JSON.parse(localStorage.getItem('lr_snapshot') || '{}')
      const savedKey = localStorage.getItem('lr_apikey') || ''
      setDrops(saved)
      setSnapshot(savedSnap)
      snapshotRef.current = savedSnap
      setApiKey(savedKey)
      setApiKeyInput(savedKey)
    } catch {}
  }, [])

  const saveDrops = (d) => {
    try { localStorage.setItem('lr_drops', JSON.stringify(d.slice(0, 500))) } catch {}
  }

  const saveSnapshot = (s) => {
    try { localStorage.setItem('lr_snapshot', JSON.stringify(s)) } catch {}
  }

  const saveApiKey = (k) => {
    try { localStorage.setItem('lr_apikey', k) } catch {}
  }

  const doCheck = useCallback(async (currentApiKey, currentSnapshot) => {
    setStatus('checking')
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: currentApiKey, snapshot: currentSnapshot })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')

      setChecks(c => c + 1)
      setItemCount(data.items.length)
      setLastCheck(data.checkedAt)
      setSnapshot(data.snapshot)
      snapshotRef.current = data.snapshot
      saveSnapshot(data.snapshot)

      if (data.drops.length > 0) {
        setDrops(prev => {
          const updated = [...data.drops, ...prev]
          saveDrops(updated)
          return updated
        })
      }
      setStatus('ok')
      setErrorMsg('')
    } catch (e) {
      setStatus('error')
      setErrorMsg(e.message)
    }
  }, [])

  const startCountdown = useCallback((secs) => {
    clearInterval(countdownRef.current)
    let s = secs
    setNextIn(s)
    countdownRef.current = setInterval(() => {
      s--
      if (s <= 0) s = secs
      setNextIn(s)
    }, 1000)
  }, [])

  const start = useCallback(() => {
    if (!apiKey) return
    runningRef.current = true
    setRunning(true)
    doCheck(apiKey, snapshotRef.current)
    timerRef.current = setInterval(() => {
      doCheck(apiKey, snapshotRef.current)
      startCountdown(interval)
    }, interval * 1000)
    startCountdown(interval)
  }, [apiKey, interval, doCheck, startCountdown])

  const stop = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
    setNextIn(null)
    setStatus('idle')
  }, [])

  useEffect(() => { return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current) } }, [])

  const filteredDrops = drops.filter(d => {
    if (rarityFilter && d.rarity !== rarityFilter) return false
    if (filter && !d.name.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  const statusColor = { idle: '#555', checking: '#f0c040', ok: '#2ecc71', error: '#e74c3c' }[status]
  const statusLabel = {
    idle: 'Nicht aktiv',
    checking: 'Prüfe gerade…',
    ok: `Letzte Prüfung: ${lastCheck ? formatTimeShort(lastCheck) : '—'}`,
    error: `Fehler: ${errorMsg}`
  }[status]

  return (
    <div className={styles.page}>
      <div className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span>Drop Tracker</span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Status</div>
          <div className={styles.statusRow}>
            <span className={styles.dot} style={{ background: statusColor, boxShadow: status === 'checking' ? `0 0 6px ${statusColor}` : 'none' }} />
            <span style={{ color: status === 'error' ? '#e74c3c' : '#888', fontSize: 12 }}>{statusLabel}</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Statistiken</div>
          <div className={styles.statGrid}>
            <div className={styles.stat}>
              <div className={styles.statVal}>{checks}</div>
              <div className={styles.statLbl}>Prüfungen</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal}>{itemCount ?? '—'}</div>
              <div className={styles.statLbl}>Items</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal} style={{ color: drops.length > 0 ? '#e85d2f' : undefined }}>{drops.length}</div>
              <div className={styles.statLbl}>Drops total</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal}>{running ? (nextIn ?? '—') + 's' : '—'}</div>
              <div className={styles.statLbl}>Nächste</div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>Einstellungen</div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Anthropic API Key</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="password"
                className={styles.input}
                placeholder="sk-ant-..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className={styles.btnSmall} onClick={() => { setApiKey(apiKeyInput); saveApiKey(apiKeyInput) }}>
                ✓
              </button>
            </div>
            {apiKey && <div style={{ fontSize: 11, color: '#2ecc71', marginTop: 4 }}>✓ Key gespeichert</div>}
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Intervall</label>
            <select
              className={styles.input}
              value={interval}
              onChange={e => { setIntervalSecs(Number(e.target.value)); if (running) { stop(); } }}
            >
              <option value={30}>30 Sekunden</option>
              <option value={60}>1 Minute</option>
              <option value={120}>2 Minuten</option>
              <option value={300}>5 Minuten</option>
            </select>
          </div>
        </div>

        <div className={styles.section}>
          {running ? (
            <button className={styles.btnStop} onClick={stop}>
              ⏹ Stoppen
            </button>
          ) : (
            <button className={styles.btnStart} onClick={start} disabled={!apiKey}>
              ▶ Tracking starten
            </button>
          )}
        </div>

        <div className={styles.section} style={{ marginTop: 'auto' }}>
          <button
            className={styles.btnDanger}
            onClick={() => {
              if (confirm('Alle gespeicherten Drops löschen?')) {
                setDrops([])
                localStorage.removeItem('lr_drops')
              }
            }}
          >
            Historie leeren
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.mainHeader}>
          <div>
            <h1 className={styles.mainTitle}>Drop-Historie</h1>
            <p className={styles.mainSub}>Wird automatisch gespeichert – bleibt auch nach dem Schließen erhalten.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

        {filteredDrops.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◈</div>
            <div className={styles.emptyTitle}>Noch keine Drops aufgezeichnet</div>
            <div className={styles.emptySub}>
              {!apiKey ? 'Trage zuerst deinen Anthropic API Key ein und starte das Tracking.' : 'Starte das Tracking – sobald ein Item gedroppt wird, erscheint es hier.'}
            </div>
          </div>
        ) : (
          <div className={styles.dropList}>
            <div className={styles.dropCount}>{filteredDrops.length} Drop{filteredDrops.length !== 1 ? 's' : ''} gefunden</div>
            {filteredDrops.map((d, i) => (
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
