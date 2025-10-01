import React, { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
// import { apiUpdateProfile } from '../api/profile'

export default function Profile() {
  const { user, token, logout } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')

  const onSave = async (e) => {
    e.preventDefault()
    // await apiUpdateProfile(token, { name, email })
    setMessage('Profile updated (placeholder).')
  }

  return (
    <div className="page">
      <Header />
      <main className="container">
        <div className="panel" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2>Profile</h2>
          <form className="form" onSubmit={onSave}>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" type="submit">Save</button>
              <button className="btn secondary" type="button" onClick={logout}>Logout</button>
            </div>
            {message && <div className="label">{message}</div>}
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
