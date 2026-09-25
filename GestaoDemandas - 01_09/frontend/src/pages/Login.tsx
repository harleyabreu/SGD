import { useState } from 'react'
import './Login.css'

type LoginProps = {
  onLogin: () => void
}

function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (usuario.trim() !== '' && senha.trim() !== '') {
      onLogin()
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <div className="login-icon">TI</div>

          <h1>Gestão de Demandas</h1>
          <p>Sistema de Gestão de Demandas de TI</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="usuario">Usuário</label>

            <input
              id="usuario"
              type="text"
              placeholder="Digite seu usuário"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit">
            Entrar
          </button>

        </form>

        <div className="login-footer">
          Gestão de Demandas de TI
        </div>

      </div>
    </div>
  )
}

export default Login