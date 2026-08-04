import { createContext, type ReactNode } from 'react'
import { useAuth, type User } from '../hooks/useAuth'

export type AuthContextType = {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isGuest: boolean
  signUp: (email: string, password: string, role?: 'admin' | 'user') => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInAsGuest: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export default AuthContext
