import { useState } from 'react'
import type { Usuario } from '../types'
import './TrocarSenha.css'

type Props = {
  usuario: Usuario
  onSalvar: (novaSenha: string) => void
  onSair: () => void
}

const MINIMO_SENHA = 6

export default function TrocarSenha({ usuario, onSalvar, onSair }: Props) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

    onSalvar(novaSenha)
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
              autoFocus
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
            />
          </label>

          {erro && <div className="troca-senha-erro">{erro}</div>}

          <div className="troca-senha-politica">
            A nova senha deve ter no mínimo 6 caracteres. Não reutilize a senha temporária recebida por e-mail.
          </div>

          <button type="submit" className="troca-senha-primary">
            Salvar Nova Senha
          </button>

          <button type="button" className="troca-senha-secondary" onClick={onSair}>
            Sair
          </button>
        </form>
      </div>
    </div>
  )//
}
