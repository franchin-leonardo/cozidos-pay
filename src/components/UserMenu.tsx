import { LogOut, User } from 'lucide-react'
import { useAuthContext } from '../contexts/useAuthContext'
import './UserMenu.css'

export function UserMenu() {
  const { user, signOut, isAdmin, isGuest } = useAuthContext()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    }
  }

  return (
    <div className="user-menu">
      <div className="user-info">
        <div className="user-avatar">
          <User size={20} />
        </div>
        <div className="user-details">
          <span className="user-email">{user?.email}</span>
          {isAdmin && <span className="user-badge">Admin</span>}
          {isGuest && <span className="user-badge">Visitante</span>}
        </div>
      </div>
      <button className="logout-button" onClick={handleLogout} title="Sair">
        <LogOut size={18} />
      </button>
    </div>
  )
}
