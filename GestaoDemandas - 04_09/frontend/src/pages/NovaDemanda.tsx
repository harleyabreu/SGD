// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — NOVA DEMANDA
// ============================================================
// Cadastro mantido no padrão visual anterior, agora alimentado
// pelos cadastros administrativos de Órgãos, Sistemas, Tipos e Analistas.
// ============================================================

import { type FormEvent } from 'react'
import type { Cliente, Demanda, Sistema, TipoDemanda, Usuario } from '../types'
import './NovaDemanda.css'

type NovaDemandaProps = {
  onVoltar: () => void
  onSalvar: (demanda: Omit<Demanda, 'id' | 'status'>) => void
  clientes: Cliente[]
  sistemas: Sistema[]
  tipos: TipoDemanda[]
  analistas: Usuario[]
}

const PRIORIDADES = ['Crítica', 'Alta', 'Média', 'Baixa']

function NovaDemanda({ onVoltar, onSalvar, clientes, sistemas, tipos, analistas }: NovaDemandaProps) {
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

    if (!demanda.titulo || !demanda.descricao || !demanda.cliente || !demanda.sistema || !demanda.tipo || !demanda.prioridade) {
      window.alert('Preencha todos os campos obrigatórios.')
      return
    }

    onSalvar(demanda)
  }

  const clientesAtivos = clientes.filter((item) => item.ativo)
  const sistemasAtivos = sistemas.filter((item) => item.ativo)
  const tiposAtivos = tipos.filter((item) => item.ativo)
  const analistasAtivos = analistas.filter((item) => item.status === 'Ativo' && item.perfil === 'Analista')

  return (
    <div className="nova-demanda-page">
      <button className="btn-voltar" onClick={onVoltar} type="button">← Voltar para Todas as Demandas</button>
      <div className="nova-demanda-header">
        <div>
          <h1>Nova Demanda</h1>
          <p>Cadastre uma nova demanda de TI. O prazo será calculado automaticamente em dias úteis.</p>
        </div>
      </div>

      <div className="formulario-demanda">
        <form onSubmit={handleSubmit}>
          <div className="formulario-titulo">
            <h2>Dados da Demanda</h2>
            <p>Informe os dados necessários para registrar e classificar a demanda.</p>
          </div>

          <div className="campo">
            <label htmlFor="cliente">Órgão / Cliente *</label>
            <select id="cliente" name="cliente" defaultValue="">
              <option value="">Selecione o órgão</option>
              {clientesAtivos.map((cliente) => <option key={cliente.id} value={cliente.nome}>{cliente.sigla ? `${cliente.sigla} — ${cliente.nome}` : cliente.nome}</option>)}
            </select>
            {clientesAtivos.length === 0 && <small>Nenhum órgão ativo cadastrado.</small>}
          </div>

          <div className="formulario-grid">
            <div className="campo">
              <label htmlFor="sistema">Sistema *</label>
              <select id="sistema" name="sistema" defaultValue="">
                <option value="">Selecione o sistema</option>
                {sistemasAtivos.map((sistema) => <option key={sistema.id} value={sistema.nome}>{sistema.nome}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="tipo">Tipo da demanda *</label>
              <select id="tipo" name="tipo" defaultValue="">
                <option value="">Selecione o tipo</option>
                {tiposAtivos.map((tipo) => <option key={tipo.id} value={tipo.nome}>{tipo.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="titulo">Título da demanda *</label>
            <input id="titulo" name="titulo" type="text" placeholder="Digite um título curto e objetivo" maxLength={150} />
          </div>

          <div className="campo">
            <label htmlFor="descricao">Descrição *</label>
            <textarea id="descricao" name="descricao" rows={6} placeholder="Descreva detalhadamente a demanda..." />
          </div>

          <div className="formulario-grid">
            <div className="campo">
              <label htmlFor="prioridade">Prioridade *</label>
              <select id="prioridade" name="prioridade" defaultValue="">
                <option value="">Selecione a prioridade</option>
                {PRIORIDADES.map((prioridade) => <option key={prioridade}>{prioridade}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="responsavel">Analista</label>
              <select id="responsavel" name="responsavel" defaultValue="">
                <option value="">Não atribuir agora — ficará Aguardando</option>
                {analistasAtivos.map((analista) => <option key={analista.id} value={analista.nome}>{analista.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="campo" style={{ padding: '12px 14px', border: '1px solid #dce5ef', borderRadius: '8px', background: '#f7f9fc' }}>
            <label style={{ marginBottom: '4px' }}>Prazo de atendimento</label>
            <strong style={{ color: '#174f86', fontSize: '13px' }}>Calculado automaticamente após o cadastro</strong>
            <small style={{ marginTop: '4px', color: '#6b7c93' }}>Crítica: 2 dias úteis • Alta: 6 • Média: 10 • Baixa: 20. Finais de semana e feriados cadastrados não são contabilizados.</small>
          </div>

          <div className="campo">
            <label htmlFor="observacao">Observações</label>
            <textarea id="observacao" name="observacao" rows={3} placeholder="Digite alguma observação, se necessário..." />
          </div>

          <div className="formulario-acoes">
            <button type="button" className="btn-cancelar" onClick={onVoltar}>Cancelar</button>
            <button type="submit" className="btn-salvar">+ Cadastrar Demanda</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NovaDemanda
