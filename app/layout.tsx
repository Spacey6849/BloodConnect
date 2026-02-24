import './globals.css'
import 'leaflet/dist/leaflet.css'
import FAQBot from '@/components/faq/FAQBot.client'

export const metadata = {
  title: 'BloodConnect — Smart Blood Availability & Donor Coordination',
  description: 'Real-time blood supply coordination for hospitals, blood banks, and donors'
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
