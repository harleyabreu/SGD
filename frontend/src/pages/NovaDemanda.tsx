// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.9 — NOVA DEMANDA / MENU PRINCIPAL
// ============================================================

import { useMemo, useState, type FormEvent } from 'react'
import type { Demanda, Usuario } from '../types'
import { diasPrazoPorPrioridade } from '../sla'
import './NovaDemanda.css'
import MenuPrincipal from '../components/MenuPrincipal'

type CadastroItem = {
  id?: number
  nome?: string
  sigla?: string
  descricao?: string
  status?: string
  ativo?: boolean
  clienteId?: number
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
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [sistemaSelecionado, setSistemaSelecionado] = useState('')

  const clienteObjetoSelecionado = useMemo(
    () =>
      clientes.find(
        (item) =>
          textoItem(item) === clienteSelecionado
      ),
    [clientes, clienteSelecionado]
  )

  const sistemasAtivos = useMemo(
    () =>
      sistemas.filter(
        (item) =>
          item.status !== 'Inativo' &&
          item.ativo !== false
      ),
    [sistemas]
  )

  const sistemasFiltrados = useMemo(() => {
    if (!clienteObjetoSelecionado?.id) {
      return sistemasAtivos
    }

    const vinculados = sistemasAtivos.filter(
      (item) =>
        item.clienteId === clienteObjetoSelecionado.id
    )

    return vinculados.length > 0
      ? vinculados
      : sistemasAtivos
  }, [sistemasAtivos, clienteObjetoSelecionado])

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
      alert('Preencha Todos Os Campos Obrigatórios.')
      return
    }

    if (
      clienteObjetoSelecionado?.id
    ) {
      const sistemasVinculados =
        sistemasAtivos.filter(
          (item) =>
            item.clienteId === clienteObjetoSelecionado.id
        )

      if (
        sistemasVinculados.length > 0 &&
        !sistemasVinculados.some(
          (item) =>
            textoItem(item) === demanda.sistema
        )
      ) {
        alert(
          'Selecione Um Sistema Vinculado Ao Cliente / Órgão Informado.'
        )
        return
      }
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
            ← Voltar Para Todas As Demandas
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
              Cadastre Uma Nova Demanda De TI.
              O Prazo Será Calculado Automaticamente Em Dias Úteis.
            </p>
          </div>
        </div>

        <div className="formulario-demanda">
          <form id="nova-demanda-form" onSubmit={handleSubmit}>
            <div className="formulario-titulo">
              <h2>Dados Da Demanda</h2>
              <p>
                Informe Os Dados Necessários Para Registrar E Classificar A Demanda.
              </p>
            </div>

            <div className="campo">
              <label htmlFor="cliente">Cliente / Órgão *</label>
              <select
                id="cliente"
                name="cliente"
                value={clienteSelecionado}
                onChange={(event) => {
                  setClienteSelecionado(event.target.value)
                  setSistemaSelecionado('')
                }}
              >
                <option value="">Selecione O Cliente / Órgão</option>
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
                <select
                  id="sistema"
                  name="sistema"
                  value={sistemaSelecionado}
                  onChange={(event) =>
                    setSistemaSelecionado(event.target.value)
                  }
                  disabled={!clienteSelecionado}
                >
                  <option value="">
                    {clienteSelecionado
                      ? 'Selecione o sistema'
                      : 'Selecione primeiro o cliente / órgão'}
                  </option>
                  {sistemasFiltrados.map((sistema, index) => {
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
                <label htmlFor="tipo">Tipo Da Demanda *</label>
                <select id="tipo" name="tipo" defaultValue="">
                  <option value="">Selecione O Tipo</option>
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
              <label htmlFor="titulo">Título Da Demanda *</label>
              <input
                id="titulo"
                name="titulo"
                type="text"
                placeholder="Digite Um Título Curto E Objetivo"
                maxLength={150}
              />
            </div>

            <div className="campo">
              <label htmlFor="descricao">Descrição *</label>
              <textarea
                id="descricao"
                name="descricao"
                rows={6}
                placeholder="Descreva Detalhadamente A Demanda..."
              />
            </div>

            <div className="formulario-grid">
              <div className="campo">
                <label htmlFor="prioridade">Prioridade *</label>
                <select id="prioridade" name="prioridade" defaultValue="">
                  <option value="">Selecione A Prioridade</option>
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
                    Não Atribuir Agora — Ficará Aguardando
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
                Calculado Automaticamente Após O Cadastro
              </strong>
              <small style={{ marginTop: '4px', color: '#6b7c93' }}>
                Crítica: {diasPrazoPorPrioridade('Crítica')} dias úteis •
                Alta: {diasPrazoPorPrioridade('Alta')} •
                Média: {diasPrazoPorPrioridade('Média')} •
                Baixa: {diasPrazoPorPrioridade('Baixa')}.
                Finais De Semana E Feriados Cadastrados Não São Contabilizados.
              </small>
            </div>

            <div className="campo">
              <label htmlFor="observacao">Observações</label>
              <textarea
                id="observacao"
                name="observacao"
                rows={3}
                placeholder="Digite Alguma Observação, Se Necessário..."
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

