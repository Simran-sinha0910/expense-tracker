import client from './client'

export const apiUpdateProfile = (token, payload) => client.request('/users/me', { method: 'PUT', token, body: payload })
