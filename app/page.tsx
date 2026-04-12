import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(160deg, #0f2240 0%, #1e3a5f 50%, #16304f 100%)',
      fontFamily: "'Georgia', serif",
    }}>

      {/* Subtle grid texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Header */}
        <header className="px-8 pt-10 pb-6">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
                  fill="rgba(255,255,255,0.6)"/>
              </svg>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 600, letterSpacing: '0.02em' }}>
                Jellicoe
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
                Bone Density Reporting
              </p>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-xl w-full text-center">

            {/* Icon */}
            <div className="mx-auto mb-10" style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1 style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              marginBottom: 16,
            }}>
              Bone Density Assessment
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 16,
              lineHeight: 1.7,
              marginBottom: 48,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 400,
            }}>
              A secure platform for bone density reporting and clinical assessment.
            </p>

            {/* Two cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Patient card */}
              <Link href="/form" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '28px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'rgba(255,255,255,0.1)'
                  el.style.borderColor = 'rgba(255,255,255,0.25)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'rgba(255,255,255,0.06)'
                  el.style.borderColor = 'rgba(255,255,255,0.12)'
                  el.style.transform = 'translateY(0)'
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, marginBottom: 16,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 600, marginBottom: 6, fontFamily: 'system-ui, sans-serif' }}>
                    Patient form
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
                    Complete your pre-assessment questionnaire before your appointment.
                  </p>
                  <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>Start here</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Staff card */}
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '28px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'rgba(255,255,255,0.1)'
                  el.style.borderColor = 'rgba(255,255,255,0.25)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'rgba(255,255,255,0.06)'
                  el.style.borderColor = 'rgba(255,255,255,0.12)'
                  el.style.transform = 'translateY(0)'
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, marginBottom: 16,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 600, marginBottom: 6, fontFamily: 'system-ui, sans-serif' }}>
                    Staff login
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
                    Radiographers and doctors sign in here to access reports.
                  </p>
                  <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>Sign in</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-8 py-6 text-center">
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.04em' }}>
            Secure · Private · POPIA compliant
          </p>
        </footer>

      </div>
    </div>
  )
}