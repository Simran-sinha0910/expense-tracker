import client from './client'

export const apiGetDashboard = (token) => client.request('/dashboard', { token })
export const apiListExpenses = (token) => client.request('/expenses', { token })
export const apiAddExpense = (token, payload) => client.request('/expenses', { method: 'POST', token, body: payload })
export const apiDeleteExpense = (token, id) => client.request(`/expenses/${id}`, { method: 'DELETE', token })
