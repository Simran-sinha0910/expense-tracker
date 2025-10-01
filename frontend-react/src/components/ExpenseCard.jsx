import React from 'react'

export default function ExpenseCard({ expense, onDelete }) {
  return (
    <div className="expense-card">
      <div className="expense-row">
        <div>
          <div className="expense-title">{expense.title}</div>
          <div className="expense-meta">{expense.category} • {new Date(expense.date).toLocaleDateString()}</div>
        </div>
        <div className="expense-amount">₹{Number(expense.amount).toFixed(2)}</div>
      </div>
      {onDelete && (
        <button className="danger" onClick={() => onDelete(expense.id)}>Delete</button>
      )}
    </div>
  )
}
