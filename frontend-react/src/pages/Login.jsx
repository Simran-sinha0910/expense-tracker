import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await login({ email, password })
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="container grid" style={{ maxWidth: 420 }}>
        <div className="panel">
          <h2>Login</h2>
          <form className="form" onSubmit={onSubmit}>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <div style={{ color: 'salmon' }}>{error}</div>}
            <button className="btn" type="submit">Sign In</button>
          </form>
          <p className="label">No account? <Link to="/register">Register</Link></p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
