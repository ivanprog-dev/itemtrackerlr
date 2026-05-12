import './globals.css'

export const metadata = {
  title: 'Lost Relics Drop Tracker',
  description: 'Tracks item supply changes on lostrelics.io',
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
