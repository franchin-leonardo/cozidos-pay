import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type User = {
  id: string
  email: string
  user_metadata?: {
    role?: 'admin' | 'user'
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
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: {
              role: session.user.user_metadata?.role || 'user',
            },
          })
        }

        // Listener para mudanças de autenticação
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              user_metadata: {
                role: session.user.user_metadata?.role || 'user',
              },
            })
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
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          user_metadata: {
            role,
          },
        })
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
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          user_metadata: {
            role: data.user.user_metadata?.role || 'user',
          },
        })
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

  const isAdmin = user?.user_metadata?.role === 'admin'

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin,
    signUp,
    signIn,
    signOut,
  }
}
