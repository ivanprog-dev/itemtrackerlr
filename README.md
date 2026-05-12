# Lost Relics Drop Tracker

Erkennt automatisch, welche Items auf lostrelics.io gedroppt wurden – mit persistenter Historie.

## Setup

### 1. Dependencies installieren
```bash
npm install
```

### 2. Lokal testen
```bash
npm run dev
```
Öffne http://localhost:3000

### 3. Auf Vercel deployen

**Option A – Vercel CLI:**
```bash
npm install -g vercel
vercel
```

**Option B – GitHub:**
1. Repo auf GitHub pushen
2. vercel.com → "New Project" → Repo auswählen
3. Deploy klicken (keine Env-Variablen nötig)

## Verwendung

1. Deinen **Anthropic API Key** (sk-ant-...) in der Sidebar eintragen und auf ✓ klicken
2. Intervall wählen (30 Sek. bis 5 Min.)
3. **"Tracking starten"** klicken

Der Key wird nur in deinem Browser (localStorage) gespeichert – nicht auf dem Server.
Die Drop-Historie bleibt ebenfalls im Browser gespeichert (bis zu 500 Einträge).

## Hinweise

- Benötigt einen Anthropic API Key mit Zugriff auf `claude-sonnet-4-20250514` und Web Search
- Kosten: ca. $0.01–0.05 pro Prüfung (Web Search + Claude)
- Die App erkennt nur Items mit "X of Y remaining" – nicht "circulating" oder "Unlimited supply"
