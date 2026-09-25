import { useEffect, useState, type FormEvent } from 'react'
import type { Usuario } from '../types'
import MenuPrincipal from '../components/MenuPrincipal'
import { carregarUsuarios, salvarUsuarios } from '../services/storage'
import { registrarAlteracao } from '../services/auditoria'
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
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    setEmail(usuario.email || '')
    setTelefone(usuario.telefone || '')
  }, [usuario])

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setMensagem('')

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

    let atualizado: UsuarioSeguranca = {
      ...atual,
      email: emailLimpo,
      telefone: telefoneLimpo,
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

    if ((atual.telefone || '') !== telefoneLimpo) {
      registrarAlteracao(
        'usuario',
        usuario.id,
        'alteracao_telefone',
        `O usuário ${usuario.nome} alterou o próprio telefone.`,
        usuario.nome,
        { valorAnterior: atual.telefone || '', valorNovo: telefoneLimpo }
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
    setMensagem('Configurações atualizadas com sucesso.')
    window.setTimeout(() => setMensagem(''), 2800)
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
        <section className="analista-config-header">
          <div>
            <h2>Configurações</h2>
            <span>Atualize seus dados de contato e sua senha.</span>
          </div>
        </section>

        <form className="analista-config-card" onSubmit={salvar}>
          <div className="analista-config-section">
            <h3>Dados pessoais e contato</h3>
            <p>Essas informações são utilizadas para identificar e contatar você.</p>

            <div className="analista-config-grid">
              <label>
                Nome
                <input value={usuario.nome} readOnly />
              </label>

              <label>
                Login
                <input value={usuario.login} readOnly />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>

              <label>
                Telefone / Contato
                <input
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                  placeholder="(91) 99999-9999"
                  autoComplete="tel"
                />
              </label>
            </div>
          </div>

          <div className="analista-config-section">
            <h3>Segurança</h3>
            <p>Deixe os campos vazios se não quiser alterar sua senha.</p>

            <div className="analista-config-grid">
              <label>
                Nova senha
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  minLength={MINIMO_SENHA}
                  placeholder={`Mínimo ${MINIMO_SENHA} caracteres`}
                  autoComplete="new-password"
                />
              </label>

              <label>
                Confirmar nova senha
                <input
                  type="password"
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                  minLength={MINIMO_SENHA}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="analista-password-note">
              Sua senha deve possuir pelo menos {MINIMO_SENHA} caracteres.
            </div>
          </div>

          {erro && <div className="analista-config-error">{erro}</div>}
          {mensagem && <div className="analista-config-success">{mensagem}</div>}

          <div className="analista-config-actions">
            <button type="button" className="analista-config-secondary" onClick={onMinhasDemandas}>
              Cancelar
            </button>
            <button type="submit" className="analista-config-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </MenuPrincipal>
  )
}
