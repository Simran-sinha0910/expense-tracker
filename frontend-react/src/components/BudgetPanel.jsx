import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiGetBudget, apiSetBudget } from '../api/budget'

export default function BudgetPanel({ period, onPeriodChange, onBudgetSaved }) {
  const { token } = useAuth()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!token || !period) return
      setLoading(true)
      setMessage('')
      try {
        const res = await apiGetBudget(token, period)
        if (mounted) setAmount(String(res?.budget ?? ''))
      } catch (e) {
        if (mounted) setMessage('Failed to load budget')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [token, period])

  const save = async (e) => {
    e.preventDefault()
    const val = Number(amount)
    if (isNaN(val) || val < 0) {
      setMessage('Enter a valid non-negative amount')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const res = await apiSetBudget(token, { budget: val, period })
      setAmount(String(res?.budget ?? val))
      localStorage.setItem('budgetPeriod', res?.period || period)
      if (onBudgetSaved) onBudgetSaved(res)
      setMessage('Budget saved')
    } catch (e) {
      setMessage('Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  const handlePeriodChange = (e) => {
    const p = e.target.value
    localStorage.setItem('budgetPeriod', p)
    if (onPeriodChange) onPeriodChange(p)
  }

  return (
    <section className="panel" style={{ display: 'grid', gap: 12 }}>
      <h3>Budget</h3>
      <form className="form" onSubmit={save}>
        <label className="label" htmlFor="budgetPeriod">Period</label>
        <select id="budgetPeriod" className="input" value={period} onChange={handlePeriodChange}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>

        <label className="label" htmlFor="budgetAmount">Amount (₹)</label>
        <input id="budgetAmount" className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save Budget'}</button>
          {loading && <span className="label">Loading…</span>}
        </div>
        {message && <div className="label">{message}</div>}
      </form>
    </section>
  )
}
