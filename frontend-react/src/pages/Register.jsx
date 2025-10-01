import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { register } = useAuth()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await register({ name, email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="container grid" style={{ maxWidth: 420 }}>
        <div className="panel">
          <h2>Register</h2>
          <form className="form" onSubmit={onSubmit}>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <div style={{ color: 'salmon' }}>{error}</div>}
            <button className="btn" type="submit">Create Account</button>
          </form>
          <p className="label">Have an account? <Link to="/">Login</Link></p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
