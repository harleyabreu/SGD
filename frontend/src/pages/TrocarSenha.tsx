import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Usuario } from '../types'
import './TrocarSenha.css'

type Props = {
  usuario: Usuario
  onSalvar: (novaSenha: string) => void | Promise<void>
  onSair: () => void
}

const MINIMO_SENHA = 8

export default function TrocarSenha({ usuario, onSalvar, onSair }: Props) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')

    if (novaSenha.length < MINIMO_SENHA) {
      setErro(`A nova senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`)
      return
    }

    if (novaSenha !== confirmacao) {
      setErro('A confirmação da nova senha não confere.')
      return
    }

    setSalvando(true)

    try {
      await onSalvar(novaSenha)
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a nova senha. Tente novamente.',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="troca-senha-page">
      <div className="troca-senha-card">
        <div className="troca-senha-icon">🔐</div>

        <h1>Primeiro Acesso</h1>
        <p className="troca-senha-intro">
          Olá, <strong>{usuario.nome}</strong>! Por segurança, sua senha temporária precisa ser alterada antes de continuar.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Nova Senha
            <input
              type="password"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              placeholder={`Mínimo ${MINIMO_SENHA} caracteres`}
              autoComplete="new-password"
              minLength={MINIMO_SENHA}
              required
              autoFocus
              disabled={salvando}
            />
          </label>

          <label>
            Confirmar Nova Senha
            <input
              type="password"
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              minLength={MINIMO_SENHA}
              required
              disabled={salvando}
            />
          </label>

          {erro && (
            <div className="troca-senha-erro" role="alert" aria-live="polite">
              {erro}
            </div>
          )}

          <div className="troca-senha-politica">
            A nova senha deve ter no mínimo {MINIMO_SENHA} caracteres. Não reutilize a senha temporária recebida por e-mail.
          </div>

          <button
            type="submit"
            className="troca-senha-primary"
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>

          <button
            type="button"
            className="troca-senha-secondary"
            onClick={onSair}
            disabled={salvando}
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}