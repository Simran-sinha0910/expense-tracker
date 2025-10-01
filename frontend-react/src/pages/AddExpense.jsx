import React, { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { apiAddExpense } from '../api/expenses'

// Lightweight toast hook via window alert fallback if ToastProvider not present
function useToast() {
  return {
    show: (msg) => {
      const ev = new CustomEvent('app:toast', { detail: { message: msg } })
      window.dispatchEvent(ev)
      if (!window.__hasToastUI) alert(msg)
    }
  }
}

export default function AddExpense() {
  const { token } = useAuth()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('General')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const toast = useToast()

  const onSubmit = async (e) => {
    e.preventDefault()
    const payload = { description, amount: Number(amount), category, date, details }
    try {
      await apiAddExpense(token, {
        description,
        amount: Number(amount),
        type: category,
        date,
        details,
      })
      setMessage('Expense added.')
      toast.show('Expense added successfully')
      setDescription('')
      setAmount('')
      setCategory('General')
      setDate(new Date().toISOString().slice(0,10))
      setDetails('')
    } catch (err) {
      setMessage(err.message)
      toast.show(`Failed to add expense: ${err.message}`)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="container">
        <div className="panel" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2>Add Expense</h2>
          <form className="form" onSubmit={onSubmit}>
            <label className="label" htmlFor="description">Description</label>
            <input id="description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Petrol at HP pump" />
            <label className="label" htmlFor="amount">Amount</label>
            <input id="amount" className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <label className="label" htmlFor="category">Category</label>
            {/* Free-text category with suggestions so user can add independent categories */}
            <input id="category" className="input" list="categoryOptions" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Groceries, Fuel, Dining Out" />
            <datalist id="categoryOptions">
              <option value="General" />
              <option value="Food" />
              <option value="Travel" />
              <option value="Shopping" />
              <option value="Rent" />
              <option value="Groceries" />
              <option value="Dining Out" />
              <option value="Entertainment" />
              <option value="Utilities" />
              <option value="Health" />
              <option value="Transport" />
            </datalist>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label className="label" htmlFor="details">Details (optional)</label>
            <textarea id="details" className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Notes, bill number, place, etc." />
            <button className="btn" type="submit">Add</button>
            {message && <div className="label">{message}</div>}
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
