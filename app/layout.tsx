import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bone Density Assessment',
  description: 'Patient assessment form for bone density consultation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
            {/* Logo placeholder — replace src with actual logo */}
            <div className="w-10 h-10 rounded-lg bg-navy-600 flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: '#1e3a5f' }}>
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-none">Subspecialist in Osteoporosis &amp; Bone Health</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">Bone Density Assessment</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-2xl mx-auto px-6 py-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="max-w-2xl mx-auto px-6 pb-10 text-center">
          <p className="text-xs text-slate-400">
            Your information is encrypted and stored securely in accordance with UK GDPR.
          </p>
        </footer>
      </body>
    </html>
  )
}
