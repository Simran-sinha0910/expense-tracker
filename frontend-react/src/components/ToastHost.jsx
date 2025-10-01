import React, { useEffect, useState } from 'react'

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    window.__hasToastUI = true
    const handler = (e) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2,7)}`
      const detail = e?.detail || {}
      const message = detail.message || String(detail)
      const variant = detail.variant || 'info'
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter(t => t.id !== id))
      }, detail.delay || 4000)
    }
    window.addEventListener('app:toast', handler)
    return () => {
      window.removeEventListener('app:toast', handler)
      delete window.__hasToastUI
    }
  }, [])

  if (!toasts.length) return null

  const stylesByVariant = (v) => {
    if (v === 'warning') {
      return { bg:'#FEF3C7', text:'#7C5E00', border:'#F59E0B' } // yellow background
    }
    if (v === 'success') {
      return { bg:'#ECFDF5', text:'#065F46', border:'#10B981' }
    }
    if (v === 'danger' || v === 'error') {
      return { bg:'#FEE2E2', text:'#7F1D1D', border:'#EF4444' }
    }
    return { bg:'#111827', text:'#E5E7EB', border:'#374151' }
  }

  return (
    <div style={{ position:'fixed', top: 16, right: 16, zIndex: 9999, display:'grid', gap: 8 }}>
      {toasts.map(t => {
        const s = stylesByVariant(t.variant)
        return (
          <div key={t.id} style={{ background: s.bg, color: s.text, padding:'10px 12px', borderRadius:8, border:`1px solid ${s.border}`, maxWidth: 360, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
