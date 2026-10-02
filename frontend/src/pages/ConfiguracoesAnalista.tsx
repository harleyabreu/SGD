import { useEffect, useState, type FormEvent } from 'react'
import type { Usuario } from '../types'
import MenuPrincipal from '../components/MenuPrincipal'
import { carregarUsuarios, salvarUsuarios } from '../services/storage'
import { registrarAlteracao } from '../services/auditoria'
import { mostrarToast } from '../services/toast'
import './ConfiguracoesAnalista.css'

type Props = {
  usuario: Usuario
  onDashboard: () => void
  onMinhasDemandas: () => void
  onConfiguracoes: () => void
  onSair: () => void
}

type UsuarioSeguranca = Usuario & {
  senhaHash?: string
  exigirTrocaSenha?: boolean
}

const MINIMO_SENHA = 6

async function hashSenha(senha: string): Promise<string> {
  const bytes = new TextEncoder().encode(senha)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function aplicarMascaraTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)

  if (numeros.length <= 2) {
    return numeros.length ? `(${numeros}` : ''
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
}

export default function ConfiguracoesAnalista({
  usuario,
  onDashboard,
  onMinhasDemandas,
  onConfiguracoes,
  onSair,
}: Props) {
  const [email, setEmail] = useState(usuario.email || '')
  const [telefone, setTelefone] = useState(usuario.telefone || '')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)

  useEffect(() => {
    setEmail(usuario.email || '')
    setTelefone(aplicarMascaraTelefone(usuario.telefone || ''))
  }, [usuario])

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    const emailLimpo = email.trim()
    const telefoneLimpo = telefone.trim()

    if (!emailLimpo) {
      setErro('Informe um e-mail válido.')
      return
    }

    if (novaSenha && novaSenha.length < MINIMO_SENHA) {
      setErro(`A nova senha deve possuir no mínimo ${MINIMO_SENHA} caracteres.`)
      return
    }

    if (novaSenha !== confirmacao) {
      setErro('A confirmação da senha não confere.')
      return
    }

    const usuarios = carregarUsuarios() as UsuarioSeguranca[]
    const atual = usuarios.find((item) => item.id === usuario.id)

    if (!atual) {
      setErro('Usuário não encontrado.')
      return
    }

    const emailDuplicado = usuarios.some(
      (item) =>
        item.id !== usuario.id &&
        item.email.trim().toLowerCase() === emailLimpo.toLowerCase()
    )

    if (emailDuplicado) {
      setErro('Este e-mail já está sendo utilizado por outro usuário.')
      return
    }

    const telefonePersistido = telefoneLimpo.replace(/\D/g, '')

    let atualizado: UsuarioSeguranca = {
      ...atual,
      email: emailLimpo,
      telefone: telefonePersistido,
      atualizadoEm: new Date().toISOString(),
    }

    if (novaSenha) {
      atualizado = {
        ...atualizado,
        senhaHash: await hashSenha(novaSenha),
        exigirTrocaSenha: false,
      }
    }

    salvarUsuarios(
      usuarios.map((item) =>
        item.id === usuario.id ? atualizado : item
      )
    )

    if (atual.email !== emailLimpo) {
      registrarAlteracao(
        'usuario',
        usuario.id,
        'alteracao_email',
        `O usuário ${usuario.nome} alterou o próprio e-mail.`,
        usuario.nome,
        { valorAnterior: atual.email, valorNovo: emailLimpo }
      )
    }

    if ((atual.telefone || '').replace(/\D/g, '') !== telefonePersistido) {
      registrarAlteracao(
        'usuario',
        usuario.id,
        'alteracao_telefone',
        `O usuário ${usuario.nome} alterou o próprio telefone.`,
        usuario.nome,
        { valorAnterior: atual.telefone || '', valorNovo: telefonePersistido }
      )
    }

    if (novaSenha) {
      registrarAlteracao(
        'usuario',
        usuario.id,
        'troca_senha',
        `O usuário ${usuario.nome} alterou a própria senha.`,
        usuario.nome
      )
    }

    setNovaSenha('')
    setConfirmacao('')
    mostrarToast('Configurações Atualizadas Com Sucesso.')
  }

  return (
    <MenuPrincipal
      usuarioAtual={usuario}
      ativo="configuracoes"
      subtitulo="Configurações"
      onDashboard={onDashboard}
      onMinhasDemandas={onMinhasDemandas}
      onMinhaConta={onConfiguracoes}
      onSair={onSair}
    >
      <div className="analista-config-page">
        <div className="analista-config-heading">
          <h2>Configurações</h2>
          <p>Atualize Seus Dados De Contato E Sua Senha.</p>
        </div>

        <form className="analista-config-card" onSubmit={salvar}>
          <section className="analista-config-section">
            <div className="analista-config-section-header">
              <div className="analista-config-section-title">
                <span className="analista-config-section-marker" />
                <div>
                  <h3>Dados Pessoais E Contato</h3>
                  <p>Essas informações são utilizadas para identificar e contatar você.</p>
                </div>
              </div>
            </div>

            <div className="analista-config-grid">
              <label>
                <span>Nome</span>
                <input value={usuario.nome} readOnly />
              </label>

              <label>
                <span>Login</span>
                <input value={usuario.login} readOnly />
              </label>

              <label>
                <span>E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>

              <label>
                <span>Contato</span>
                <input
                  value={telefone}
                  onChange={(event) => setTelefone(aplicarMascaraTelefone(event.target.value))}
                  placeholder="(91) 99999-9999"
                  autoComplete="tel"
                />
              </label>
            </div>
          </section>

          <section className="analista-config-section">
            <div className="analista-config-section-header">
              <div className="analista-config-section-title">
                <span className="analista-config-section-marker security" />
                <div>
                  <h3>Segurança</h3>
                  <p>Deixe os campos vazios se não quiser alterar sua senha.</p>
                </div>
              </div>
            </div>

            <div className="analista-config-grid">
              <label>
                <span>Nova Senha</span>
                <div className="analista-password-field">
                  <input
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(event) => setNovaSenha(event.target.value)}
                    minLength={MINIMO_SENHA}
                    placeholder={`Mínimo ${MINIMO_SENHA} Caracteres`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="analista-password-toggle"
                    onClick={() => setMostrarNovaSenha((valor) => !valor)}
                    aria-label={mostrarNovaSenha ? 'Ocultar Nova Senha' : 'Mostrar Nova Senha'}
                    title={mostrarNovaSenha ? 'Ocultar Senha' : 'Mostrar Senha'}
                  >
                    {mostrarNovaSenha ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18" />
                        <path d="M9.7 5.2A10.9 10.9 0 0 1 12 5c6 0 9.5 7 9.5 7a16.9 16.9 0 0 1-3.2 3.9" />
                        <path d="M6.3 6.3C3.9 7.8 2.5 12 2.5 12s3.5 7 9.5 7a10.4 10.4 0 0 0 4.4-1" />
                        <path d="M10.2 10.2a2.8 2.8 0 0 0 3.6 3.6" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <label>
                <span>Confirmar Nova Senha</span>
                <div className="analista-password-field">
                  <input
                    type={mostrarConfirmacao ? 'text' : 'password'}
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                    minLength={MINIMO_SENHA}
                    placeholder="Repita A Nova Senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="analista-password-toggle"
                    onClick={() => setMostrarConfirmacao((valor) => !valor)}
                    aria-label={mostrarConfirmacao ? 'Ocultar Confirmação Da Senha' : 'Mostrar Confirmação Da Senha'}
                    title={mostrarConfirmacao ? 'Ocultar Senha' : 'Mostrar Senha'}
                  >
                    {mostrarConfirmacao ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18" />
                        <path d="M9.7 5.2A10.9 10.9 0 0 1 12 5c6 0 9.5 7 9.5 7a16.9 16.9 0 0 1-3.2 3.9" />
                        <path d="M6.3 6.3C3.9 7.8 2.5 12 2.5 12s3.5 7 9.5 7a10.4 10.4 0 0 0 4.4-1" />
                        <path d="M10.2 10.2a2.8 2.8 0 0 0 3.6 3.6" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
            </div>

            <div className="analista-password-note">
              Sua senha deve possuir pelo menos {MINIMO_SENHA} caracteres.
            </div>
          </section>

          {erro && (
            <div className="analista-config-message analista-config-error" role="alert">
              {erro}
            </div>
          )}

    
          <div className="analista-config-actions">
            <button
              type="button"
              className="analista-config-secondary"
              onClick={onMinhasDemandas}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="analista-config-primary"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </MenuPrincipal>
  )
}
