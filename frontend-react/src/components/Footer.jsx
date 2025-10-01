import React from 'react'

export default function Footer() {
  return (
    <footer className="app-footer">
      <p>© {new Date().getFullYear()} Expense Tracker</p>
    </footer>
  )
}
