import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const onLogout = () => {
    logout()
    navigate('/')
  }
  return (
    <header className="app-header">
      <Link to="/dashboard" className="brand">Expense Tracker</Link>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/add-expense">Add Expense</Link>
        <Link to="/profile">Profile</Link>
      </nav>
      <div className="account">
        {user ? (
          <>
            <span>Hello, {user.name}</span>
            <button onClick={onLogout}>Logout</button>
          </>
        ) : (
          <Link to="/">Login</Link>
        )}
      </div>
    </header>
  )
}
