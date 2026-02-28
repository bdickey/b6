'use client'

import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import BenjiOverlay from '@/components/benji/BenjiOverlay'
import Boombox from '@/components/benji/Boombox'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [benjiOpen, setBenjiOpen] = useState(false)
  const [boomboxVisible, setBoomboxVisible] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav
        onBenjiOpen={() => setBenjiOpen(true)}
        onBoomboxToggle={() => setBoomboxVisible(v => !v)}
        boomboxVisible={boomboxVisible}
      />
      <main style={{ padding: '24px 24px 48px' }}>
        {children}
      </main>
      {benjiOpen && <BenjiOverlay onClose={() => setBenjiOpen(false)} />}
      {boomboxVisible && <Boombox onClose={() => setBoomboxVisible(false)} />}
    </div>
  )
}
