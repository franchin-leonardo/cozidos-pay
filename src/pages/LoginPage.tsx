import type { FormEvent } from 'react'
import { useState } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'
import { useAuthContext } from '../contexts/useAuthContext'
import logo from '../assets/logo.png'
import './LoginPage.css'

export function LoginPage() {
  const { signIn, signInAsGuest, loading, error } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoginError(null)

    try {
      await signIn(email, password)
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao fazer login')
    }
  }

  const handleGuestAccess = async () => {
    setLoginError(null)

    try {
      await signInAsGuest()
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao entrar como visitante')
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <img
              className="logo-image"
              src={logo}
              alt="Logo Cozidos F.C"
            />
          </div>
          <h1>Cozidos Pay</h1>
          <p>Gerenciador Financeiro</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {(loginError || error) && <div className="error-message">{loginError || error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>

          <button
            type="button"
            className="login-button guest-button"
            disabled={loading}
            onClick={handleGuestAccess}
          >
            Entrar como visitante
          </button>
        </form>   
      </div>
    </div>
  )
}
