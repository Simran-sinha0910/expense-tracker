import client from './client'

export const apiLogin = (email, password) => client.request('/auth/login', { method: 'POST', body: { email, password } })
export const apiRegister = (name, email, password) => client.request('/auth/register', { method: 'POST', body: { name, email, password } })
export const apiProfile = (token) => client.request('/users/me', { token })
