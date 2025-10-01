import client from './client'

export const apiGetBudget = (token, period = 'monthly') =>
  client.request(`/budget?period=${encodeURIComponent(period)}`, { token })

export const apiSetBudget = (token, { budget, period = 'monthly' }) =>
  client.request('/budget', { method: 'POST', token, body: { budget, period } })

export const apiCheckBudget = (token, period = 'monthly') =>
  client.request(`/budget/check?period=${encodeURIComponent(period)}`, { token })
