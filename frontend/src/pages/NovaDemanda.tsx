// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.9 — NOVA DEMANDA / MENU PRINCIPAL
// ============================================================
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Arquivo, Demanda, Historico, Usuario } from '../types'
import { diasPrazoPorCriticidade, diasPrazoPorPrioridadeAtendimento, diasSLACombinado, PRIORIDADES_ATENDIMENTO } from '../sla'
import './NovaDemanda.css'
import MenuPrincipal from '../components/MenuPrincipal'
import { mostrarToast } from '../services/toast'
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
const CRITICIDADES = ['Crítica', 'Alta', 'Média', 'Baixa']
function textoItem(item: CadastroItem): string {
  return String(item.nome || item.descricao || '')
}
function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function formatarDataHoraArquivo(data: string): string {
  const dataFormatada = new Date(data)
  if (Number.isNaN(dataFormatada.getTime())) return data
  return dataFormatada.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function classePrioridadeAtendimento(prioridade: string): string {
  if (prioridade.startsWith('P1')) return 'prioridade-p1'
  if (prioridade.startsWith('P2')) return 'prioridade-p2'
  if (prioridade.startsWith('P3')) return 'prioridade-p3'
  if (prioridade.startsWith('P4')) return 'prioridade-p4'
  return ''
}
function corPrioridadeAtendimento(prioridade: string): string {
  if (prioridade.startsWith('P1')) return '#7f1d1d'
  if (prioridade.startsWith('P2')) return '#dc2626'
  if (prioridade.startsWith('P3')) return '#1d4ed8'
  if (prioridade.startsWith('P4')) return '#15803d'
  return '#0f172a'
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
  const [criticidadeSelecionada, setCriticidadeSelecionada] = useState('')
  const [prioridadeSelecionada, setPrioridadeSelecionada] = useState('')
  const [arquivosSelecionados, setArquivosSelecionados] = useState<Arquivo[]>([])
  const [arquivosEmProcessamento, setArquivosEmProcessamento] = useState(0)
  const arquivoInputRef = useRef<HTMLInputElement>(null)
  const proximoArquivoId = useRef(Date.now())
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
  function selecionarArquivos(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(event.currentTarget.files || [])
    event.currentTarget.value = ''
    if (arquivos.length === 0) return
    const extensoesPermitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg']
    const arquivosValidos: File[] = []
    for (const arquivo of arquivos) {
      const extensao = arquivo.name.split('.').pop()?.toLowerCase()
      if (!extensao || !extensoesPermitidas.includes(extensao)) {
        alert(`O arquivo "${arquivo.name}" tem um formato não permitido. Utilize PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG ou JPEG.`)
        continue
      }
      if (arquivo.size > 20 * 1024 * 1024) {
        alert(`O arquivo "${arquivo.name}" ultrapassa o limite de 20 MB.`)
        continue
      }
      arquivosValidos.push(arquivo)
    }
    if (arquivosValidos.length === 0) return
    setArquivosEmProcessamento((atual) => atual + arquivosValidos.length)
    for (const arquivo of arquivosValidos) {
      const idArquivo = proximoArquivoId.current++
      const leitor = new FileReader()
      leitor.onload = () => {
        if (typeof leitor.result !== 'string') {
          alert(`Não foi possível ler o arquivo "${arquivo.name}".`)
          setArquivosEmProcessamento((atual) => Math.max(0, atual - 1))
          return
        }
        const novoArquivo: Arquivo = {
          id: idArquivo,
          nome: arquivo.name,
          tamanho: arquivo.size,
          data: new Date().toISOString(),
          usuario: nomeUsuario,
          url: leitor.result,
        }
        setArquivosSelecionados((atuais) => [...atuais, novoArquivo])
        setArquivosEmProcessamento((atual) => Math.max(0, atual - 1))
      }
      leitor.onerror = () => {
        alert(`Não foi possível ler o arquivo "${arquivo.name}".`)
        setArquivosEmProcessamento((atual) => Math.max(0, atual - 1))
      }
      leitor.readAsDataURL(arquivo)
    }
  }
  function removerArquivoSelecionado(id: number) {
    setArquivosSelecionados((atuais) => atuais.filter((arquivo) => arquivo.id !== id))
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (arquivosEmProcessamento > 0) {
      alert('Aguarde o processamento dos arquivos antes de cadastrar a demanda.')
      return
    }
    const formData = new FormData(event.currentTarget)
    const demanda: Omit<Demanda, 'id' | 'status'> = {
      titulo: String(formData.get('titulo') || '').trim(),
      descricao: String(formData.get('descricao') || '').trim(),
      cliente: String(formData.get('cliente') || '').trim(),
      sistema: String(formData.get('sistema') || '').trim(),
      tipo: String(formData.get('tipo') || '').trim(),
      responsavel: String(formData.get('responsavel') || '').trim(),
      criticidade: String(formData.get('criticidade') || '').trim(),
      prioridade: String(formData.get('criticidade') || '').trim(), // Compatibilidade com telas e demandas antigas.
      prioridadeAtendimento: String(formData.get('prioridadeAtendimento') || '').trim(),
      prazo: '',
      observacao: String(formData.get('observacao') || '').trim(),
      comentarios: [],
      arquivos: arquivosSelecionados,
      historico: arquivosSelecionados.map((arquivo, index): Historico => ({
        id: proximoArquivoId.current + index + 1000,
        tipo: 'arquivo',
        titulo: 'Arquivo anexado',
        descricao: `O arquivo "${arquivo.nome}" foi anexado à demanda.`,
        data: arquivo.data,
        usuario: arquivo.usuario,
        referenciaId: arquivo.id,
      })),
    }
    if (
      !demanda.titulo ||
      !demanda.descricao ||
      !demanda.cliente ||
      !demanda.sistema ||
      !demanda.tipo ||
      !demanda.criticidade ||
      !demanda.prioridadeAtendimento
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
    mostrarToast('Demanda enviada. Aguardando confirmação da gravação no PostgreSQL.')
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
              disabled={arquivosEmProcessamento > 0}
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
                <option value="">Selecione...</option>
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
                      ? 'Selecione...'
                      : 'Selecione...'}
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
                  <option value="">Selecione...</option>
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
            <section className="classificacao-demanda-card">
              <div className="classificacao-demanda-heading">
                <div className="classificacao-demanda-icon" aria-hidden="true">◆</div>
                <div>
                  <h3>Classificação da Demanda</h3>
                  <p>Informe o impacto e a urgência para definir o prazo de atendimento.</p>
                </div>
              </div>
              <div className="classificacao-demanda-grid">
                            <div className="campo">
                <label htmlFor="criticidade">Criticidade *</label>
                <select
                  id="criticidade"
                  name="criticidade"
                  value={criticidadeSelecionada}
                  onChange={(event) => setCriticidadeSelecionada(event.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {CRITICIDADES.map((criticidade) => (
                    <option key={criticidade} value={criticidade}>{criticidade}</option>
                  ))}
                </select>
                <small className="classificacao-ajuda">Impacto caso a demanda não seja resolvida.</small>
              </div>
              <div className="campo">
                <label htmlFor="prioridadeAtendimento">Prioridade de Atendimento *</label>
                <select
                  id="prioridadeAtendimento"
                  name="prioridadeAtendimento"
                  className={`prioridade-atendimento-select ${classePrioridadeAtendimento(prioridadeSelecionada)}`}
                  style={{ color: corPrioridadeAtendimento(prioridadeSelecionada) }}
                  value={prioridadeSelecionada}
                  onChange={(event) => setPrioridadeSelecionada(event.target.value)}
                  required
                >
                  <option value="" style={{ color: '#0f172a' }}>Selecione...</option>
                  {PRIORIDADES_ATENDIMENTO.map((prioridade) => (
                    <option
                      key={prioridade}
                      value={prioridade}
                      className={classePrioridadeAtendimento(prioridade)}
                      style={{ color: corPrioridadeAtendimento(prioridade) }}
                    >
                      {prioridade}
                    </option>
                  ))}
                </select>
                <small className="classificacao-ajuda">Urgência com que a equipe deve iniciar o atendimento.</small>
              </div>
              </div>
            </section>
            <div className="formulario-grid">
              <div className="campo">
                <label htmlFor="responsavel">Responsável</label>
                <select id="responsavel" name="responsavel" defaultValue="">
                  <option value="">
                    Selecione...
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
              className="campo sla-resumo-card"
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
              <small className="sla-resumo-texto">
                {criticidadeSelecionada && prioridadeSelecionada ? (
                  <>
                    Prazo estimado: <strong>{diasSLACombinado(criticidadeSelecionada, prioridadeSelecionada)} dias úteis</strong>.
                    O sistema utiliza o menor prazo entre a Criticidade ({diasPrazoPorCriticidade(criticidadeSelecionada)} dias) e a Prioridade ({diasPrazoPorPrioridadeAtendimento(prioridadeSelecionada)} dias).
                  </>
                ) : (
                  'Selecione a Criticidade e a Prioridade de Atendimento para visualizar o prazo estimado.'
                )}
                {' '}Finais de semana e feriados cadastrados não são contabilizados.
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
            <section className="nova-demanda-arquivos-card" aria-labelledby="nova-demanda-arquivos-titulo">
              <div className="nova-demanda-arquivos-heading">
                <h3 id="nova-demanda-arquivos-titulo">Evidências e Arquivos</h3>
              </div>
              <div className="nova-demanda-arquivos-content">
                <div className="nova-demanda-arquivos-instrucoes">
                  <div className="nova-demanda-arquivos-instrucoes-texto">
                    <strong>Anexe evidências e arquivos relacionados à demanda.</strong>
                    <span>Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG e JPEG.</span>
                    <span>Limite máximo: 20 MB por arquivo. Você pode anexar mais de um arquivo.</span>
                  </div>
                  <button
                    type="button"
                    className="nova-demanda-btn-anexar"
                    onClick={() => arquivoInputRef.current?.click()}
                    disabled={arquivosEmProcessamento > 0}
                  >
                    <span aria-hidden="true">📎</span> Anexar arquivo
                  </button>
                  <input
                    ref={arquivoInputRef}
                    className="nova-demanda-input-arquivos"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    multiple
                    onChange={selecionarArquivos}
                    aria-label="Selecionar evidências e arquivos para a demanda"
                  />
                </div>
                {arquivosEmProcessamento > 0 && (
                  <p className="nova-demanda-arquivos-processando" role="status">
                    Processando {arquivosEmProcessamento} arquivo(s). Aguarde a conclusão antes de cadastrar a demanda.
                  </p>
                )}
                {arquivosSelecionados.length > 0 ? (
                  <div className="nova-demanda-lista-arquivos">
                    {arquivosSelecionados.map((arquivo) => (
                      <div className="nova-demanda-arquivo-item" key={arquivo.id}>
                        <div className="nova-demanda-arquivo-info">
                          <span className="nova-demanda-arquivo-icone" aria-hidden="true">▤</span>
                          <div className="nova-demanda-arquivo-dados">
                            <strong title={arquivo.nome}>{arquivo.nome}</strong>
                            <span>{formatarTamanhoArquivo(arquivo.tamanho)} · Anexado por {arquivo.usuario} · {formatarDataHoraArquivo(arquivo.data)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="nova-demanda-btn-remover-arquivo"
                          onClick={() => removerArquivoSelecionado(arquivo.id)}
                          aria-label={`Remover arquivo ${arquivo.nome}`}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="nova-demanda-arquivos-vazio">Nenhum arquivo anexado.</div>
                )}
              </div>
            </section>
            <div className="formulario-acoes">
              <button type="submit" className="btn-salvar" disabled={arquivosEmProcessamento > 0}>
                + Cadastrar Demanda
              </button>
            </div>
          </form>
        </div>
      </div>
    </MenuPrincipal>
  )
}
