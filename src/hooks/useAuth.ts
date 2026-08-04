import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type User = {
  id: string
  email: string
  role: 'admin' | 'user' | 'guest'
  user_metadata?: {
    role?: 'admin' | 'user' | 'guest'
  }
  app_metadata?: {
    role?: string
    user_role?: string
    is_admin?: boolean
    claims?: {
      role?: string
      user_role?: string
      app_role?: string
      is_admin?: boolean
    }
  }
}

function resolveUserRole(rawUser: any): 'admin' | 'user' | 'guest' {
  const normalizedEmail = String(rawUser?.email ?? '').trim().toLowerCase()

  if (
    rawUser?.user_metadata?.is_admin === true ||
    rawUser?.app_metadata?.is_admin === true ||
    rawUser?.app_metadata?.claims?.is_admin === true
  ) {
    return 'admin'
  }

  const roleCandidates = [
    rawUser?.user_metadata?.role,
    rawUser?.user_metadata?.user_role,
    rawUser?.app_metadata?.role,
    rawUser?.app_metadata?.user_role,
    rawUser?.app_metadata?.claims?.role,
    rawUser?.app_metadata?.claims?.user_role,
    rawUser?.app_metadata?.claims?.app_role,
  ]

  for (const candidate of roleCandidates) {
    const normalizedRole = String(candidate ?? '').trim().toLowerCase()
    if (!normalizedRole) {
      continue
    }

    if (normalizedRole === 'admin' || normalizedRole.includes('admin')) {
      return 'admin'
    }

    if (normalizedRole === 'guest' || normalizedRole === 'visitante') {
      return 'guest'
    }
  }

  // Fallback para o usuário admin criado pelo script do projeto.
  if (normalizedEmail === 'admin@cozidos.com') {
    return 'admin'
  }

  return 'user'
}

function mapAuthUser(rawUser: any): User {
  const role = resolveUserRole(rawUser)

  return {
    id: rawUser.id,
    email: rawUser.email || '',
    role,
    user_metadata: {
      ...rawUser.user_metadata,
      role,
    },
    app_metadata: rawUser.app_metadata,
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar sessão ao montar
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Verificar se há sessão ativa
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(mapAuthUser(session.user))
        }

        // Listener para mudanças de autenticação
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser(mapAuthUser(session.user))
          } else {
            setUser(null)
          }
        })

        setError(null)
      } catch (err) {
        console.error('Erro ao carregar sessão:', err)
        setError('Erro ao carregar autenticação')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  const signUp = async (email: string, password: string, role: 'admin' | 'user' = 'user') => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        setUser(mapAuthUser({
          ...data.user,
          user_metadata: {
            ...data.user.user_metadata,
            role,
          },
        }))
      }

      setError(null)
      return data
    } catch (err: any) {
      const message = err?.message || 'Erro ao criar conta'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setUser(mapAuthUser(data.user))
      }

      setError(null)
      return data
    } catch (err: any) {
      const message = err?.message || 'Erro ao fazer login'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (user?.role === 'guest') {
      setUser(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      setUser(null)
      setError(null)
    } catch (err: any) {
      const message = err?.message || 'Erro ao fazer logout'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signInAsGuest = async () => {
    setUser({
      id: `guest-${Date.now()}`,
      email: 'visitante@cozidospay.local',
      role: 'guest',
      user_metadata: {
        role: 'guest',
      },
      app_metadata: {
        role: 'guest',
      },
    })
    setError(null)
  }

  const isAdmin = user?.role === 'admin'
  const isGuest = user?.role === 'guest'

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin,
    isGuest,
    signUp,
    signIn,
    signInAsGuest,
    signOut,
  }
}
