import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiAiInsights } from '../api/ai'
import { apiGetBudget } from '../api/budget'

function getPeriodStart(period = 'monthly') {
  const now = new Date()
  if (period === 'weekly') {
    const day = now.getDay()
    const diff = (day + 6) % 7
    const start = new Date(now)
    start.setDate(now.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return start
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function daysInfoForPeriod(period = 'monthly') {
  const now = new Date()
  if (period === 'weekly') {
    const start = getPeriodStart('weekly')
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const elapsed = Math.max(1, Math.ceil((Math.min(now, end) - start) / (24 * 3600 * 1000)))
    const totalDays = 7
    const daysRemaining = Math.max(0, totalDays - elapsed)
    return { totalDays, daysElapsed: elapsed, daysRemaining }
  }
  const start = getPeriodStart('monthly')
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const elapsed = Math.max(1, Math.ceil((Math.min(now, end) - start) / (24 * 3600 * 1000)))
  const totalDays = Math.ceil((end - start) / (24 * 3600 * 1000))
  const daysRemaining = Math.max(0, totalDays - elapsed)
  return { totalDays, daysElapsed: elapsed, daysRemaining }
}

function computePeriodSpending(expenses, period) {
  const start = getPeriodStart(period)
  const totals = { total: 0, byCategory: {} }
  for (const e of expenses || []) {
    const d = new Date(e.date)
    if (isNaN(d) || d < start) continue
    const amt = Number(e.amount || 0)
    const cat = e.type || 'Other'
    totals.total += amt
    totals.byCategory[cat] = (totals.byCategory[cat] || 0) + amt
  }
  return totals
}

function averageDailySpend(expenses, period) {
  const { total } = computePeriodSpending(expenses, period)
  const { daysElapsed } = daysInfoForPeriod(period)
  return total / Math.max(1, daysElapsed)
}

function requiredDailyCapToStayWithinBudget(expenses, budget, period) {
  if (!budget || budget <= 0) return null
  const { total } = computePeriodSpending(expenses, period)
  const { daysRemaining } = daysInfoForPeriod(period)
  if (daysRemaining <= 0) return null
  const remaining = Math.max(0, budget - total)
  return remaining / daysRemaining
}

function uniqueMerge(ruleTips, aiTips, maxAi = 3) {
  const seen = new Set()
  const out = []
  for (const t of ruleTips || []) {
    const s = String(t).trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  let count = 0
  for (const t of aiTips || []) {
    if (count >= maxAi) break
    const s = String(t).trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    count++
  }
  return out
}

export default function Recommendations({ expenses = [], period = 'monthly' }) {
  const { token } = useAuth()
  const [budget, setBudget] = useState(0)
  const [aiTips, setAiTips] = useState([])
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadBudget() {
      try {
        if (!token) return
        const data = await apiGetBudget(token, period)
        if (mounted) setBudget(Number(data?.budget || 0))
      } catch {}
    }
    loadBudget()
    return () => { mounted = false }
  }, [token, period])

  useEffect(() => {
    let mounted = true
    async function loadAi() {
      if (!token) return
      setLoadingAi(true)
      try {
        const res = await apiAiInsights(token, period)
        if (mounted) setAiTips(Array.isArray(res?.tips) ? res.tips : [])
      } catch {
        if (mounted) setAiTips([])
      } finally {
        if (mounted) setLoadingAi(false)
      }
    }
    loadAi()
    const id = setInterval(loadAi, 60_000) // refresh every minute to respect backend throttle
    return () => { mounted = false; clearInterval(id) }
  }, [token, period])

  const ruleTips = useMemo(() => {
    const tips = []
    const { total, byCategory } = computePeriodSpending(expenses, period)
    const percent = budget > 0 ? (total / budget) * 100 : 0
    if (budget > 0) {
      if (percent >= 100) tips.push(`You have reached/exceeded your ${period} budget. Pause non‑essential spending and review subscriptions.`)
      else if (percent >= 90) tips.push(`You're at ${percent.toFixed(0)}% of your ${period} budget. Consider delaying discretionary purchases.`)
      else if (percent >= 80) tips.push(`You're over 80% of your ${period} budget. Tighten variable costs like dining out or entertainment.`)
      else if (percent <= 30 && total > 0) tips.push(`Good pace so far: only ${percent.toFixed(0)}% of your ${period} budget used. Keep it steady!`)
    } else if (total > 0) {
      tips.push(`No main budget set for ${period}. Set one to track progress and get better alerts.`)
    }

    if (budget > 0) {
      const avg = averageDailySpend(expenses, period)
      const { totalDays, daysRemaining } = daysInfoForPeriod(period)
      const projected = avg * totalDays
      if (projected > budget) {
        tips.push(`At your current pace (avg ₹${avg.toFixed(0)}/day), projected spend is ₹${projected.toFixed(0)}, which exceeds your budget ₹${budget}. Aim to cut daily spend by ₹${Math.max(0, (projected - budget) / Math.max(1, daysRemaining)).toFixed(0)} for the remaining ${daysRemaining} day(s).`)
      } else {
        tips.push(`Current pace: ₹${avg.toFixed(0)}/day. Projected spend ₹${projected.toFixed(0)} vs budget ₹${budget}. You're on track—maintain this pace for the remaining ${daysRemaining} day(s).`)
      }
      const cap = requiredDailyCapToStayWithinBudget(expenses, budget, period)
      if (cap !== null) tips.push(`To stay within budget, keep daily spend under ₹${cap.toFixed(0)} for the rest of this ${period}.`)

      const remaining = Math.max(0, budget - total)
      if (percent > 0 && percent < 70) {
        const basis = (cap !== null && !isNaN(cap)) ? cap : avg
        const softCap = Math.round(Math.max(1, Math.min(basis, basis * 0.9)))
        if (softCap > 0) tips.push(`Stay on track by setting a soft daily cap at ₹${softCap}. Skip one impulse buy and log every purchase for the next 7 days.`)
      }
      if (percent <= 50 && remaining > 0) {
        tips.push(`Great pace: consider moving ₹${Math.round(remaining * 0.2)} (20% of remaining) to savings now to lock in progress.`)
        tips.push(`Try two no‑spend days this week and plan 3 home‑cooked meals to keep momentum.`)
      }
      try {
        const entriesTmp = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
        const topCat = entriesTmp.length ? entriesTmp[0][0] : null
        if (topCat && (topCat === 'Dining Out' || topCat === 'Entertainment' || topCat === 'Shopping')) {
          const weeklyCap = Math.max(300, Math.round(budget * 0.05))
          tips.push(`${topCat}: set a weekly spending limit of ₹${weeklyCap} and track it with a simple envelope or note.`)
        }
      } catch {}
    }

    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    const totalSafe = Math.max(1, total)
    entries.slice(0, 3).forEach(([cat, amt]) => {
      const share = (amt / totalSafe) * 100
      if (share >= 20) tips.push(`High spend in ${cat}: ₹${amt.toFixed(0)} (${share.toFixed(0)}% of period spend). Try setting a cap or cheaper alternatives.`)
    })

    // General nudges
    if (entries.length >= 2) {
      const [c1, a1] = entries[0]
      const [c2, a2] = entries[1]
      if (a2 > 0) tips.push(`After ${c1}, ${c2} is the next biggest area (₹${Math.round(a2)}). Set a target to reduce it this period.`)
    }
    return tips
  }, [expenses, period, budget])

  const merged = useMemo(() => uniqueMerge(ruleTips, aiTips, 3), [ruleTips, aiTips])

  return (
    <section className="panel">
      <h3>Recommendations {loadingAi && <span className="label">(updating…)</span>}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
        {merged.map((t, i) => (
          <li key={i} className="label" style={{ color: '#e5e7eb' }}>{t}</li>
        ))}
        {merged.length === 0 && <li className="label">No tips yet. Add some expenses to get insights.</li>}
      </ul>
    </section>
  )
}
