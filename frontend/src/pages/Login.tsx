import { useState } from 'react'
import type { Usuario } from '../types'
import { carregarUsuarios } from '../services/storage'
import './Login.css'

type UsuarioSeguranca = Usuario & {
  senhaHash?: string
  exigirTrocaSenha?: boolean
}

type LoginProps = {
  onLogin: (usuario: Usuario, exigirTrocaSenha?: boolean) => void
}

const MINIMO_SENHA = 6

async function hashSenha(senha: string): Promise<string> {
  const bytes = new TextEncoder().encode(senha)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')

    const login = usuario.trim()
    const senhaDigitada = senha

    if (!login) {
      setErro('Informe o usuário.')
      return
    }

    if (!senhaDigitada) {
      setErro('Informe a senha.')
      return
    }

    // VALIDAÇÃO OBRIGATÓRIA:
    // menos de 6 caracteres nunca pode prosseguir para o login.
    if (senhaDigitada.length < MINIMO_SENHA) {
      setErro(`A senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`)
      return
    }

    const usuarios = carregarUsuarios() as UsuarioSeguranca[]
    const usuarioEncontrado = usuarios.find(
      (item) => item.login.toLowerCase() === login.toLowerCase()
    )

    if (!usuarioEncontrado || usuarioEncontrado.status !== 'Ativo') {
      setErro('Usuário ou senha inválidos.')
      return
    }

    if (!usuarioEncontrado.senhaHash) {
      // Compatibilidade com usuários antigos criados antes da política de senha.
      onLogin(usuarioEncontrado, false)
      return
    }

    const senhaHash = await hashSenha(senhaDigitada)

    if (senhaHash !== usuarioEncontrado.senhaHash) {
      setErro('Usuário ou senha inválidos.')
      return
    }

    onLogin(
      usuarioEncontrado,
      Boolean(usuarioEncontrado.exigirTrocaSenha)
    )
  }

  const senhaValida = senha.length >= MINIMO_SENHA

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <div
            className="login-icon"
            style={{
              width: 120,
              minWidth: 120,
              height: 58,
              fontSize: 17,
              letterSpacing: 0.5,
            }}
          >
            PRODEPA
          </div>

          <h1>Gestão de Demandas</h1>
          <p><em>Eficiência, Transparência e Controle.</em></p>
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
              minLength={MINIMO_SENHA}
            />
          </div>

          {erro && (
            <div
              role="alert"
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                border: '1px solid #fecaca',
                borderRadius: 8,
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={!usuario.trim() || !senhaValida}
            title={
              !senhaValida
                ? `A senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`
                : undefined
            }
          >
            Entrar
          </button>

        </form>

        <div
          style={{
            marginTop: 10,
            color: '#64748b',
            fontSize: 11,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Senha: mínimo de {MINIMO_SENHA} caracteres.
        </div>

        <div className="login-footer">
          <strong>Gestão de Demandas de TI</strong>
        </div>

      </div>
    </div>
  )
}

export default Login
