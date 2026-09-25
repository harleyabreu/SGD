import { useState } from 'react'
import './Login.css'

import {
  carregarUsuarios,
} from '../services/storage'

import type {
  Usuario,
} from '../types'

type LoginProps = {
  onLogin: (
    usuario: Usuario
  ) => void
}

function Login({
  onLogin,
}: LoginProps) {

  const [usuario, setUsuario] =
    useState('')

  const [senha, setSenha] =
    useState('')

  const [erro, setErro] =
    useState('')

  const [carregando, setCarregando] =
    useState(false)

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault()

    setErro('')

    const login =
      usuario.trim()

    const senhaInformada =
      senha.trim()

    if (!login) {

      setErro(
        'Informe o usuário.'
      )

      return
    }

    if (!senhaInformada) {

      setErro(
        'Informe a senha.'
      )

      return
    }

    setCarregando(true)

    const usuarios =
      carregarUsuarios()

    const encontrado =
      usuarios.find(
        (item) =>
          item.login.toLowerCase() ===
            login.toLowerCase() ||
          item.email.toLowerCase() ===
            login.toLowerCase()
      )

    setTimeout(() => {

      setCarregando(false)

      if (!encontrado) {

        setErro(
          'Usuário não encontrado.'
        )

        return
      }

      if (
        encontrado.status !==
        'Ativo'
      ) {

        setErro(
          `O usuário está ${encontrado.status.toLowerCase()} e não pode acessar o sistema.`
        )

        return
      }

      // ======================================================
      // PROTÓTIPO
      // Qualquer senha preenchida é aceita.
      // A autenticação real será ligada ao backend posteriormente.
      // ======================================================

      onLogin(
        encontrado
      )

    }, 250)
  }

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <div className="login-icon">
            TI
          </div>

          <h1>
            Gestão de Demandas
          </h1>

          <p>
            Sistema de Gestão de Demandas de TI
          </p>

        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="form-group">

            <label htmlFor="usuario">
              Usuário
            </label>

            <input
              id="usuario"
              type="text"
              placeholder="Digite seu usuário ou e-mail"
              value={usuario}
              onChange={(event) =>
                setUsuario(
                  event.target.value
                )
              }
              autoComplete="username"
            />

          </div>

          <div className="form-group">

            <label htmlFor="senha">
              Senha
            </label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) =>
                setSenha(
                  event.target.value
                )
              }
              autoComplete="current-password"
            />

          </div>

          {erro && (

            <div
              style={{
                background:
                  '#fee2e2',
                color:
                  '#b91c1c',
                border:
                  '1px solid #fecaca',
                borderRadius:
                  7,
                padding:
                  '10px 12px',
                marginBottom:
                  15,
                fontSize:
                  13,
              }}
            >
              {erro}
            </div>

          )}

          <button
            type="submit"
            disabled={
              carregando
            }
          >
            {carregando
              ? 'Entrando...'
              : 'Entrar'}
          </button>

        </form>

        <div
          style={{
            marginTop:
              18,
            padding:
              '10px 12px',
            background:
              '#f8fafc',
            borderRadius:
              7,
            fontSize:
              12,
            color:
              '#64748b',
          }}
        >
          <strong>
            Ambiente de protótipo
          </strong>

          <br />

          Usuário inicial:
          {' '}
          <strong>
            lorenna.goes
          </strong>

        </div>

        <div className="login-footer">
          Gestão de Demandas de TI
        </div>

      </div>

    </div>
  )
}

export default Login