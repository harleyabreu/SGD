// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.9 — NOVA DEMANDA / MENU PRINCIPAL
// ============================================================

import { type FormEvent } from 'react'
import type { Demanda, Usuario } from '../types'
import './NovaDemanda.css'
import MenuPrincipal from '../components/MenuPrincipal'

type CadastroItem = {
  id?: number
  nome?: string
  sigla?: string
  descricao?: string
  status?: string
  ativo?: boolean
}

type NovaDemandaProps = {
  clientes: CadastroItem[]
  sistemas: CadastroItem[]
  tipos: CadastroItem[]
  analistas: Usuario[]
  onVoltar: () => void
  onSalvar: (demanda: Omit<Demanda, 'id' | 'status'>) => void

  nomeUsuario: string
  perfilUsuario: string
  onDashboard: () => void
  onTodasDemandas: () => void
  onNovaDemanda: () => void
  onClientes: () => void
  onResponsaveis: () => void
  onFeriados: () => void
  onRelatorios: () => void
  onConfiguracoes?: () => void
  onLogout: () => void
}

const PRIORIDADES = ['Crítica', 'Alta', 'Média', 'Baixa']

function textoItem(item: CadastroItem): string {
  return String(item.nome || item.descricao || '')
}

export default function NovaDemanda({
  clientes,
  sistemas,
  tipos,
  analistas,
  onVoltar,
  onSalvar,
  nomeUsuario,
  perfilUsuario,
  onDashboard,
  onTodasDemandas,
  onNovaDemanda,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onConfiguracoes,
  onLogout,
}: NovaDemandaProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    const demanda: Omit<Demanda, 'id' | 'status'> = {
      titulo: String(formData.get('titulo') || '').trim(),
      descricao: String(formData.get('descricao') || '').trim(),
      cliente: String(formData.get('cliente') || '').trim(),
      sistema: String(formData.get('sistema') || '').trim(),
      tipo: String(formData.get('tipo') || '').trim(),
      responsavel: String(formData.get('responsavel') || '').trim(),
      prioridade: String(formData.get('prioridade') || '').trim(),
      prazo: '',
      observacao: String(formData.get('observacao') || '').trim(),
      comentarios: [],
      arquivos: [],
      historico: [],
    }

    if (
      !demanda.titulo ||
      !demanda.descricao ||
      !demanda.cliente ||
      !demanda.sistema ||
      !demanda.tipo ||
      !demanda.prioridade
    ) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }

    onSalvar(demanda)
  }

  return (
    <MenuPrincipal
      ativo="nova-demanda"
      nomeUsuario={nomeUsuario}
      perfilUsuario={perfilUsuario}
      onDashboard={onDashboard}
      onTodasDemandas={onTodasDemandas}
      onNovaDemanda={onNovaDemanda}
      onClientes={onClientes}
      onResponsaveis={onResponsaveis}
      onFeriados={onFeriados}
      onRelatorios={onRelatorios}
      onConfiguracoes={onConfiguracoes}
      onSair={onLogout}
      subtitulo="Nova Demanda"
      rodapeAcoes={
        <>
          <button
            type="button"
            className="btn-secundario"
            onClick={onVoltar}
          >
            ← Voltar para Todas as Demandas
          </button>

          <div className="nova-demanda-acoes-direita">
            <button
              type="button"
              className="btn-secundario"
              onClick={onVoltar}
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="nova-demanda-form"
              className="btn-principal"
            >
              + Cadastrar Demanda
            </button>
          </div>
        </>
      }
    >
      <div className="nova-demanda-page">
        <div className="nova-demanda-header">
          <div>
            <h1>Nova Demanda</h1>
            <p>
              Cadastre uma nova demanda de TI.
              O prazo será calculado automaticamente em dias úteis.
            </p>
          </div>
        </div>

        <div className="formulario-demanda">
          <form id="nova-demanda-form" onSubmit={handleSubmit}>
            <div className="formulario-titulo">
              <h2>Dados da Demanda</h2>
              <p>
                Informe os dados necessários para registrar e classificar a demanda.
              </p>
            </div>

            <div className="campo">
              <label htmlFor="cliente">Cliente / Órgão *</label>
              <select id="cliente" name="cliente" defaultValue="">
                <option value="">Selecione o cliente / órgão</option>
                {clientes
                  .filter((item) => item.status !== 'Inativo' && item.ativo !== false)
                  .map((cliente, index) => {
                    const valor = textoItem(cliente)
                    return (
                      <option key={cliente.id ?? `${valor}-${index}`} value={valor}>
                        {cliente.sigla ? `${cliente.sigla} — ${valor}` : valor}
                      </option>
                    )
                  })}
              </select>
            </div>

            <div className="formulario-grid">
              <div className="campo">
                <label htmlFor="sistema">Sistema *</label>
                <select id="sistema" name="sistema" defaultValue="">
                  <option value="">Selecione o sistema</option>
                  {sistemas
                    .filter((item) => item.status !== 'Inativo' && item.ativo !== false)
                    .map((sistema, index) => {
                      const valor = textoItem(sistema)
                      return (
                        <option key={sistema.id ?? `${valor}-${index}`} value={valor}>
                          {valor}
                        </option>
                      )
                    })}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="tipo">Tipo da demanda *</label>
                <select id="tipo" name="tipo" defaultValue="">
                  <option value="">Selecione o tipo</option>
                  {tipos
                    .filter((item) => item.status !== 'Inativo' && item.ativo !== false)
                    .map((tipo, index) => {
                      const valor = textoItem(tipo)
                      return (
                        <option key={tipo.id ?? `${valor}-${index}`} value={valor}>
                          {valor}
                        </option>
                      )
                    })}
                </select>
              </div>
            </div>

            <div className="campo">
              <label htmlFor="titulo">Título da demanda *</label>
              <input
                id="titulo"
                name="titulo"
                type="text"
                placeholder="Digite um título curto e objetivo"
                maxLength={150}
              />
            </div>

            <div className="campo">
              <label htmlFor="descricao">Descrição *</label>
              <textarea
                id="descricao"
                name="descricao"
                rows={6}
                placeholder="Descreva detalhadamente a demanda..."
              />
            </div>

            <div className="formulario-grid">
              <div className="campo">
                <label htmlFor="prioridade">Prioridade *</label>
                <select id="prioridade" name="prioridade" defaultValue="">
                  <option value="">Selecione a prioridade</option>
                  {PRIORIDADES.map((prioridade) => (
                    <option key={prioridade} value={prioridade}>
                      {prioridade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="responsavel">Analista / Responsável</label>
                <select id="responsavel" name="responsavel" defaultValue="">
                  <option value="">
                    Não atribuir agora — ficará Aguardando
                  </option>
                  {analistas
                    .filter((usuario) => usuario.status === 'Ativo')
                    .map((usuario) => (
                      <option key={usuario.id} value={usuario.nome}>
                        {usuario.nome}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div
              className="campo"
              style={{
                padding: '12px 14px',
                border: '1px solid #dce5ef',
                borderRadius: '8px',
                background: '#f7f9fc',
              }}
            >
              <label style={{ marginBottom: '4px' }}>
                Prazo / SLA
              </label>
              <strong style={{ color: '#174f86', fontSize: '13px' }}>
                Calculado automaticamente após o cadastro
              </strong>
              <small style={{ marginTop: '4px', color: '#6b7c93' }}>
                Crítica: 2 dias úteis • Alta: 6 • Média: 10 • Baixa: 20.
                Finais de semana e feriados cadastrados não são contabilizados.
              </small>
            </div>

            <div className="campo">
              <label htmlFor="observacao">Observações</label>
              <textarea
                id="observacao"
                name="observacao"
                rows={3}
                placeholder="Digite alguma observação, se necessário..."
              />
            </div>

            <div className="formulario-acoes">
              <button type="submit" className="btn-salvar">
                + Cadastrar Demanda
              </button>
            </div>
          </form>
        </div>
      </div>
    </MenuPrincipal>
  )

}

