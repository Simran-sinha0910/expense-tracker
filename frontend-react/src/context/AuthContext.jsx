import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiLogin, apiRegister, apiProfile } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load persisted auth
    const saved = localStorage.getItem('auth')
    if (saved) {
      const parsed = JSON.parse(saved)
      setUser(parsed.user)
      setToken(parsed.token)
    }
    setLoading(false)
  }, [])

  const login = async ({ email, password }) => {
    const res = await apiLogin(email, password)
    const tok = res?.token || res?.accessToken || res?.jwt
    const usr = res?.user || { id: res?.id || res?._id, name: res?.name, email: res?.email }
    if (!tok) throw new Error('Missing token from login response')
    const profile = await safeProfile(tok, usr)
    setUser(profile || usr)
    setToken(tok)
    localStorage.setItem('auth', JSON.stringify({ user: profile || usr, token: tok }))
    return { user: profile || usr, token: tok }
  }

  const register = async ({ name, email, password }) => {
    const res = await apiRegister(name, email, password)
    // Some backends auto-login; if not, fallback to login
    if (res?.token || res?.accessToken || res?.jwt) {
      const tok = res.token || res.accessToken || res.jwt
      const usr = res?.user || { id: res?.id || res?._id, name: res?.name || name, email: res?.email || email }
      const profile = await safeProfile(tok, usr)
      setUser(profile || usr)
      setToken(tok)
      localStorage.setItem('auth', JSON.stringify({ user: profile || usr, token: tok }))
      return { user: profile || usr, token: tok }
    }
    return login({ email, password })
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth')
  }

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

async function safeProfile(token, fallbackUser) {
  try {
    const data = await apiProfile(token)
    if (!data) return fallbackUser
    // Normalize common shapes
    if (data.user) return data.user
    return { id: data.id || data._id || fallbackUser?.id, name: data.name || fallbackUser?.name, email: data.email || fallbackUser?.email }
  } catch {
    return fallbackUser
  }
}
