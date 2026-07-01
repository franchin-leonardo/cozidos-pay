import type { ReactNode } from 'react'
import { useAuthContext } from '../contexts/useAuthContext'
import { LoginPage } from '../pages/LoginPage'

type ProtectedRouteProps = {
  children: ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuthContext()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100svh',
          background: 'linear-gradient(135deg, var(--green-soft) 0%, #ffffff 100%)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
          >
            💰
          </div>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            Carregando...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100svh',
          background: 'linear-gradient(135deg, var(--green-soft) 0%, #ffffff 100%)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-soft)',
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}
          >
            🔒
          </div>
          <h2
            style={{
              color: 'var(--text-strong)',
              margin: '0 0 8px',
            }}
          >
            Acesso Restrito
          </h2>
          <p
            style={{
              color: 'var(--text-muted)',
              margin: '0',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          >
            Você precisa de permissões de administrador para acessar esta página.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
