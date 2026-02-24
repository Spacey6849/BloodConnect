import './globals.css'
import 'leaflet/dist/leaflet.css'
import FAQBot from '@/components/faq/FAQBot.client'

export const metadata = {
  title: 'BloodConnect Dashboard',
  description: 'Operational intelligence for regional blood supply networks'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-slate-100">
      <body>
        {children}
        <FAQBot />
      </body>
    </html>
  )
}
