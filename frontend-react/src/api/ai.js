import client from './client'

export const apiAiInsights = (token, period = 'monthly') =>
  client.request('/ai/insights', { method: 'POST', token, body: { period } })
