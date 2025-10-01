import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ExpenseCard from '../components/ExpenseCard'
import { useAuth } from '../context/AuthContext'
import { apiListExpenses, apiDeleteExpense } from '../api/expenses'
import Recommendations from '../components/Recommendations'

export default function Dashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, count: 0 })
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const list = await apiListExpenses(token)
        setExpenses(list)
        const total = list.reduce((s, e) => s + Number(e.amount || 0), 0)
        setStats({ total: Math.round(total), thisMonth: Math.round(total), count: list.length })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const onDelete = async (id) => {
    try {
      await apiDeleteExpense(token, id)
      setExpenses((prev) => prev.filter((e) => (e.id || e._id) !== id))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="center">Loading...</div>

  return (
    <div className="page">
      <Header />
      <main className="container grid">
        <section className="grid grid-2">
          <div className="panel">
            <h3>Total Spent</h3>
            <h1>₹{stats.total}</h1>
          </div>
          <div className="panel">
            <h3>This Month</h3>
            <h1>₹{stats.thisMonth}</h1>
          </div>
        </section>

        <section className="panel">
          <h3>Recent Expenses ({stats.count})</h3>
          <div className="grid">
            {expenses.map((e) => (
              <ExpenseCard key={e.id || e._id} expense={{
                id: e.id || e._id,
                title: e.description || e.title,
                category: e.type || e.category || 'Other',
                amount: e.amount,
                date: e.date || e.createdAt,
              }} onDelete={onDelete} />
            ))}
          </div>
        </section>

        <Recommendations expenses={expenses} period={'monthly'} />
      </main>
      <Footer />
    </div>
  )
}
