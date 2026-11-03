
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Usuario } from '../types'
import { apiRequest } from '../services/api'
import './Login.css'

type LoginResponse = {
  usuario: Usuario
  exigirTrocaSenha?: boolean
}

type LoginProps = {
  onLogin: (usuario: Usuario, exigirTrocaSenha?: boolean) => void
}

const MINIMO_SENHA = 8

function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (senhaDigitada.length < MINIMO_SENHA) {
      setErro(
        `A senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`,
      )
      return
    }

    setCarregando(true)

    try {
      const resposta = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login,
          senha: senhaDigitada,
        }),
      })

      if (!resposta || !resposta.usuario) {
        throw new Error(
          'O servidor não retornou os dados do usuário.',
        )
      }

      onLogin(
        resposta.usuario,
        Boolean(resposta.exigirTrocaSenha),
      )
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível realizar o login.',
      )
    } finally {
      setCarregando(false)
    }
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

          <p>
            <em>Eficiência, Transparência e Controle.</em>
          </p>
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
              required
              disabled={carregando}
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
              required
              disabled={carregando}
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
                whiteSpace: 'pre-line',
              }}
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !usuario.trim() ||
              !senhaValida ||
              carregando
            }
            title={
              !senhaValida
                ? `A senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`
                : undefined
            }
          >
            {carregando ? 'Entrando...' : 'Entrar'}
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
