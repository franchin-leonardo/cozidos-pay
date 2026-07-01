import { useContext } from 'react'
import AuthContext, { type AuthContextType } from './AuthContext'

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de AuthProvider')
  }

  return context
}
