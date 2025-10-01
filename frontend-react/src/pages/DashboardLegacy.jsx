import React, { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Recommendations from '../components/Recommendations'
import { useAuth } from '../context/AuthContext'
import { apiListExpenses, apiDeleteExpense } from '../api/expenses'
import { apiGetBudget, apiSetBudget, apiCheckBudget } from '../api/budget'

function getExpenseDate(e) {
  const tryDate = (v) => { const d = new Date(v); return isNaN(d) ? null : d }
  return tryDate(e?.date) || tryDate(e?.createdAt) || (e?._id && e._id.length >= 8
    ? new Date(parseInt(e._id.substring(0,8), 16) * 1000) : null)
}

function getPeriodStart(period) {
  const now = new Date()
  if ((period || 'monthly') === 'weekly') {
    const day = now.getDay()
    const diff = (day + 6) % 7
    const start = new Date(now)
    start.setDate(now.getDate() - diff)
    start.setHours(0,0,0,0)
    return start
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default function DashboardLegacy() {
  const { token } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(() => localStorage.getItem('budgetPeriod') || 'monthly')
  const [budget, setBudget] = useState(0)
  const [amountInput, setAmountInput] = useState('')
  const [catBudgets, setCatBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('categoryBudgets') || '{"monthly":{},"weekly":{}}') } catch { return { monthly:{}, weekly:{} } }
  })
  // Filters & pagination
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Quick range helpers
  const formatDateISO = (d) => {
    if (!(d instanceof Date) || isNaN(d)) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const setQuickRange = (range) => {
    const now = new Date()
    let start, end
    if (range === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (range === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (range === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
    } else {
      return
    }
    setFilterFrom(formatDateISO(start))
    setFilterTo(formatDateISO(end))
    setCurrentPage(1)
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const list = await apiListExpenses(token)
        if (mounted) setExpenses(list)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [token])

  async function refreshBudget(p = period) {
    const res = await apiGetBudget(token, p)
    const b = Number(res?.budget || 0)
    setBudget(b)
    setAmountInput(String(b))
    const effPeriod = res?.period || p
    setPeriod(effPeriod)
    localStorage.setItem('budgetPeriod', effPeriod)
  }

  useEffect(() => { refreshBudget().catch(()=>{}) }, [token])
  useEffect(() => { refreshBudget(period).catch(()=>{}) }, [period])

  const start = useMemo(() => getPeriodStart(period), [period])
  const periodExpenses = useMemo(() => expenses.filter(e => {
    const d = getExpenseDate(e)
    return d && !isNaN(d) && d >= start
  }), [expenses, start])
  const used = useMemo(() => periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [periodExpenses])
  const percent = useMemo(() => budget > 0 ? Math.min(100, Math.max(0, (used / budget) * 100)) : 0, [used, budget])
  const remaining = useMemo(() => Math.max(0, Number(budget || 0) - Number(used || 0)), [budget, used])
  const over = useMemo(() => Math.max(0, Number(used || 0) - Number(budget || 0)), [budget, used])
  const levelColor = percent >= 100 ? '#ef4444' : percent >= 80 ? '#f59e0b' : '#10B981'
  const barClass = percent >= 100 ? 'bg-danger' : percent >= 80 ? 'bg-warning' : 'bg-success'

  // ---------------- Budget email alerts (80% / 100%) ----------------
  useEffect(() => {
    if (!token || !budget || budget <= 0) return
    const level = percent >= 100 ? '100' : (percent >= 80 ? '80' : null)
    if (!level) return
    // Scope by period and current month/week to avoid spamming across sessions
    const now = new Date()
    const scope = period === 'weekly'
      ? `${now.getUTCFullYear()}-W${Math.ceil((((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(),0,1)) / 86400000) + 1)/7)}`
      : `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const key = `budgetAlertSent:${period}:${level}:${scope}`
    try {
      const sent = localStorage.getItem(key)
      if (sent === '1') return
    } catch {}
    apiCheckBudget(token, period)
      .then(() => {
        try { localStorage.setItem(key, '1') } catch {}
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { variant: 'warning', message: level === '100' ? 'Budget fully used.' : 'You have used over 80% of your budget.' } }))
      })
      .catch(() => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { variant: 'warning', message: 'Failed to trigger budget alert. Will try again later.' } }))
      })
  }, [token, period, budget, percent])

  // ---------------- Category budget toasts (>=80%/100%) ----------------
  useEffect(() => {
    const budgetsForPeriodMap = catBudgets[period] || {}
    const now = new Date()
    const scope = period === 'weekly'
      ? `${now.getUTCFullYear()}-W${Math.ceil((((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(),0,1)) / 86400000) + 1)/7)}`
      : `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

    // Build a category spend map from current period expenses locally
    const catSpend = periodExpenses.reduce((acc, e) => {
      const k = e.type || 'Other'
      acc[k] = (acc[k] || 0) + Number(e.amount || 0)
      return acc
    }, {})

    Object.keys(budgetsForPeriodMap).forEach(cat => {
      const catBudget = Number(budgetsForPeriodMap[cat] || 0)
      if (!catBudget) return
      const usedCat = Number(catSpend[cat] || 0)
      const pct = (usedCat / catBudget) * 100
      const level = pct >= 100 ? '100' : (pct >= 80 ? '80' : null)
      if (!level) return
      const key = `catAlertSent:${period}:${cat}:${level}:${scope}`
      try {
        if (localStorage.getItem(key) === '1') return
      } catch {}
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: {
          variant: 'warning',
          message: level === '100'
            ? `${cat} budget fully used (₹${usedCat} / ₹${catBudget}).`
            : `${cat} budget over 80% used (₹${usedCat} / ₹${catBudget}).`
        }
      }))
      try { localStorage.setItem(key, '1') } catch {}
    })
  }, [periodExpenses, catBudgets, period])

  const spendByCat = useMemo(() => {
    const map = {}
    for (const e of periodExpenses) {
      const k = e.type || 'Other'
      map[k] = (map[k] || 0) + Number(e.amount || 0)
    }
    return map
  }, [periodExpenses])
  const budgetsForPeriod = useMemo(() => catBudgets[period] || {}, [catBudgets, period])
  const categoryOptions = useMemo(() => Array.from(new Set(expenses.map(e => e.type).filter(Boolean))).sort(), [expenses])

  // Apply filters
  const filteredExpenses = useMemo(() => {
    const from = filterFrom ? new Date(filterFrom) : null
    const to = filterTo ? new Date(filterTo) : null
    if (to) to.setHours(23,59,59,999)
    const q = search.trim().toLowerCase()
    // Use ALL expenses for filtering so previous months/years are visible
    return expenses.filter(e => {
      const dt = getExpenseDate(e)
      if (!dt) return false
      const inCat = filterCategory === 'all' ? true : (e.type === filterCategory)
      const inFrom = from ? dt >= from : true
      const inTo = to ? dt <= to : true
      const text = `${e.description||''} ${e.details||''}`.toLowerCase()
      const inSearch = q ? text.includes(q) : true
      return inCat && inFrom && inTo && inSearch
    })
  }, [expenses, filterCategory, filterFrom, filterTo, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize))
  const pageStart = (currentPage - 1) * pageSize
  const pageEnd = Math.min(filteredExpenses.length, pageStart + pageSize)
  const pageItems = useMemo(() => filteredExpenses.slice(pageStart, pageEnd), [filteredExpenses, pageStart, pageEnd])

  // Export CSV of the filtered list (not just current page)
  const exportCSV = () => {
    try {
      const header = ['Description','Type','Amount','Details','Date']
      const rows = filteredExpenses.map(e => {
        const d = getExpenseDate(e)
        const dateStr = d && !isNaN(d) ? d.toLocaleDateString() : ''
        return [
          e.description || '',
          e.type || e.category || '',
          String(e.amount ?? ''),
          e.details || '',
          dateStr,
        ]
      })
      if (rows.length === 0) {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'No expenses in the current view to export.' } }))
        return
      }
      const csv = [header, ...rows].map(r => r.map(field => {
        const s = String(field).replaceAll('"', '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      }).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expenses_${filterFrom || 'all'}_${filterTo || 'all'}.csv`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 0)
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: `Exported ${rows.length} rows to CSV.` } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Failed to export CSV' } }))
    }
  }

  const saveCategoryBudget = (cat, value) => {
    const amt = Math.max(0, Number(value) || 0)
    const next = { ...catBudgets, [period]: { ...(catBudgets[period] || {}), [cat]: amt } }
    setCatBudgets(next)
    localStorage.setItem('categoryBudgets', JSON.stringify(next))
  }

  const onSaveBudget = async (e) => {
    e.preventDefault()
    const val = Number(amountInput)
    if (isNaN(val) || val < 0) return
    await apiSetBudget(token, { budget: val, period })
    await refreshBudget(period)
  }

  const onPeriodChange = (e) => {
    const p = e.target.value
    localStorage.setItem('budgetPeriod', p)
    setPeriod(p)
  }

  const onDelete = async (id) => {
    try {
      await apiDeleteExpense(token, id)
      setExpenses(prev => prev.filter(e => (e._id || e.id) !== id))
    } catch {}
  }

  if (loading) return <div className="center">Loading...</div>

  return (
    <div className="page">
      <Header />
      <main className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="mb-0 fw-bold" style={{ color:'#1E293B' }}>Dashboard</h3>
            <div className="text-muted small">Overview of your spending and budgets</div>
          </div>
        </div>

        <div className="card p-3 section-gap">
          {/* Total Expenses header above Budget */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0 section-title"><i className="fa-solid fa-receipt"></i> Total Expenses</h5>
            <div className="badge bg-secondary-subtle text-dark" style={{ fontSize: '0.95rem' }}>₹{used.toFixed(0)}</div>
          </div>
          <div className="card-body budget-card">
            <div className="budget-circle" id="budgetCircle" style={{
              background: `conic-gradient(${levelColor} 0% ${percent}%, #e5e7eb ${percent}% 100%)`
            }}>
              <div className="budget-center">
                <div className="budget-amount" id="budgetPercent">{percent.toFixed(0)}%</div>
                <div className="budget-sub">used</div>
              </div>
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h5 className="mb-0 section-title"><i className="fa-solid fa-gauge"></i> Budget</h5>
                <div className="d-flex gap-2 align-items-center">
                  <select id="budgetPeriod" className="form-select form-select-sm" style={{ width:160 }} value={period} onChange={onPeriodChange}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <input type="number" id="budgetAmount" placeholder="Enter budget" className="form-control form-control-sm" style={{ width:180 }}
                         value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={onSaveBudget}>
                    <i className="fa-solid fa-floppy-disk me-1"></i>Save
                  </button>
                </div>
              </div>
              <div id="budgetAlert" className="alert py-2 px-3 mb-3 d-none" role="alert"></div>
              <div className="d-flex justify-content-between small text-muted mb-2">
                <span id="budgetStatus">
                  {budget > 0 ? (
                    over > 0 ? (
                      <>
                        Over by <strong style={{color:'#ef4444'}}>₹{over.toFixed(0)}</strong>
                      </>
                    ) : (
                      <>
                        Remaining <strong style={{color:'#0f172a'}}>₹{remaining.toFixed(0)}</strong>
                      </>
                    )
                  ) : 'No budget set.'}
                </span>
                <span>
                  <span id="budgetUsed">₹{used.toFixed(0)}</span>
                  {' / '}
                  <span id="budgetTotal">₹{budget.toFixed(0)}</span>
                </span>
              </div>
              <div className="progress mt-2">
                <div id="budgetProgress" className={`progress-bar ${barClass}`} style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0 section-title"><i className="fa-solid fa-layer-group"></i> Category Budgets</h5>
          </div>
          <div id="categoryBudgets" className="row g-3" style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
            {Array.from(new Set([
              ...Object.keys(spendByCat),
              ...Object.keys(budgetsForPeriod)
            ])).sort((a,b)=> (spendByCat[b]||0) - (spendByCat[a]||0)).map((cat) => {
              const usedCat = Number(spendByCat[cat] || 0)
              const budgetCat = Number(budgetsForPeriod[cat] || 0)
              const pct = budgetCat > 0 ? Math.min(100, (usedCat / budgetCat) * 100) : 0
              const barClass = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success'
              const indicator = pct >= 100 ? 'indicator-red' : pct >= 80 ? 'indicator-yellow' : 'indicator-green'
              const badge = pct >= 100 ? <span className="badge bg-danger">Over</span>
                          : pct >= 80 ? <span className="badge bg-warning text-dark">High</span>
                          : <span className="badge bg-success">OK</span>
              return (
                <div key={cat} className="cat-card">
                  <div className="header">
                    <div className="d-flex align-items-center gap-2">
                      <span className={`indicator-dot ${indicator}`}></span>
                      <strong>{cat}</strong>
                      {badge}
                    </div>
                    <div className="input-group input-group-sm" style={{ width: 180 }}>
                      <span className="input-group-text">₹</span>
                      <input type="number" className="form-control"
                        value={budgetCat}
                        onChange={(e) => saveCategoryBudget(cat, e.target.value)} />
                    </div>
                  </div>
                  <div className="meta">
                    <span>Used</span>
                    <span>{budgetCat > 0 ? `${usedCat} / ${budgetCat}` : `${usedCat}`}</span>
                  </div>
                  <div className="progress progress-thin">
                    <div className={`progress-bar ${barClass}`} style={{ width: `${pct.toFixed(0)}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-3 section-gap">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0 section-title"><i className="fa-solid fa-table"></i> Recent Expenses</h5>
          </div>
          {/* Filters row */}
          <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1" htmlFor="filterCategory">Category</label>
              <select id="filterCategory" className="form-select form-select-sm" value={filterCategory} onChange={(e)=>{ setFilterCategory(e.target.value); setCurrentPage(1) }}>
                <option value="all">All</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1" htmlFor="filterFrom">From</label>
              <input id="filterFrom" type="date" className="form-control form-control-sm" value={filterFrom} onChange={(e)=>{ setFilterFrom(e.target.value); setCurrentPage(1) }} />
            </div>
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1" htmlFor="filterTo">To</label>
              <input id="filterTo" type="date" className="form-control form-control-sm" value={filterTo} onChange={(e)=>{ setFilterTo(e.target.value); setCurrentPage(1) }} />
            </div>
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1" htmlFor="searchInput">Search</label>
              <input id="searchInput" type="text" className="form-control form-control-sm" placeholder="Find description/details" value={search} onChange={(e)=>{ setSearch(e.target.value); setCurrentPage(1) }} />
            </div>
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1" htmlFor="pageSize">Rows</label>
              <select id="pageSize" className="form-select form-select-sm" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)||10); setCurrentPage(1) }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1 d-block">Quick Range</label>
              <div className="btn-group" role="group" aria-label="Quick Ranges">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={()=>{ setQuickRange('this_month') }}>This Month</button>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={()=>{ setQuickRange('last_month') }}>Last Month</button>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={()=>{ setQuickRange('this_year') }}>This Year</button>
              </div>
            </div>
            <div className="filter-chip">
              <label className="form-label small text-muted mb-1 d-block">Actions</label>
              <div className="d-flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={()=>setCurrentPage(1)}>Apply</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); setSearch(''); setPageSize(10); setCurrentPage(1) }}>Clear</button>
                <button className="btn btn-success btn-sm" onClick={exportCSV}><i className="fa-solid fa-file-csv me-1"></i>Export CSV</button>
              </div>
            </div>
          </div>

          <div className="grid">
            {/* Header row for columns */}
            <div className="expense-card" style={{ background:'#f8fafc' }}>
              <div className="expense-row" style={{ fontWeight:600, color:'#374151' }}>
                <div className="exp-cell exp-desc">Description</div>
                <div className="exp-cell exp-cat">Category</div>
                <div className="exp-cell exp-date">Date</div>
                <div className="exp-cell exp-details">Details</div>
                <div className="exp-cell exp-amount" style={{ textAlign:'right' }}>Amount</div>
              </div>
            </div>
            {pageItems.map(e => {
              const id = e._id || e.id
              const date = getExpenseDate(e)
              const dateStr = date ? date.toLocaleDateString() : ''
              const cat = e.type || e.category || 'Other'
              return (
                <div key={id} className="expense-card">
                  <div className="expense-row">
                    <div className="exp-cell exp-desc"><strong>{e.description || e.title}</strong></div>
                    <div className="exp-cell exp-cat"><span className="expense-meta">{cat}</span></div>
                    <div className="exp-cell exp-date"><span className="expense-meta">{dateStr}</span></div>
                    {e.details && <div className="exp-cell exp-details"><span className="expense-meta">{e.details}</span></div>}
                    <div className="exp-cell exp-amount">₹{Number(e.amount).toFixed(2)}</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                    <button className="danger" onClick={() => onDelete(id)}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <div className="text-muted small">Showing {filteredExpenses.length ? pageStart + 1 : 0}–{pageEnd} of {filteredExpenses.length}</div>
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm" disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}>Prev</button>
              <span className="btn btn-light btn-sm disabled">Page {currentPage} / {totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm" disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}>Next</button>
            </div>
          </div>
        </div>

        <Recommendations expenses={periodExpenses} period={period} />
      </main>
      <Footer />
    </div>
  )
}
