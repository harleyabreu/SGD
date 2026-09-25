// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.4 — DETALHE DA DEMANDA
// ============================================================
// ARQUIVO: src/pages/DetalheDemanda.tsx
//
// FUNCIONALIDADES:
// - Visualização completa da demanda
// - Alteração de status
// - Com Pendências com motivo obrigatório
// - Conclusão com comentário obrigatório
// - Distribuição / redistribuição para Analista
// - Alteração de prioridade
// - Alteração manual de prazo
// - Reabertura com motivo obrigatório
// - Cancelamento com motivo obrigatório
// - Comentários
// - Anexos
// - Histórico
// - Validação de arquivos
// - Compatibilidade com a estrutura atual da V2.3
// ============================================================

import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import type {
  Demanda,
  Comentario,
  Arquivo,
  Historico,
  Usuario,
} from '../types'

import './DetalheDemanda.css'

// ============================================================
// PROPS
// ============================================================

type Props = {
  demanda: Demanda

  onVoltar: () => void

  onAlterarStatus: (
    id: number,
    novoStatus: string,
    motivo?: string
  ) => void

  onAlterarResponsavel?: (
    id: number,
    novoResponsavel: string
  ) => void

  onAdicionarComentario?: (
    id: number,
    texto: string
  ) => void

  onAdicionarArquivo?: (
    id: number,
    arquivo: Arquivo
  ) => void

  perfilUsuario?: Usuario['perfil']

  analistas?: Usuario[]

  onAlterarPrioridade?: (
    id: number,
    novaPrioridade: string,
    motivo?: string
  ) => void

  onAlterarPrazoManual?: (
    id: number,
    novoPrazo: string,
    motivo: string
  ) => void

  onReabrirDemanda?: (
    id: number,
    motivo: string
  ) => void

  onCancelarDemanda?: (
    id: number,
    motivo: string
  ) => void
}

// ============================================================
// STATUS
// ============================================================

const STATUS = [
  'Nova',
  'Aguardando',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
]

// ============================================================
// PRIORIDADES
// ============================================================

const PRIORIDADES = [
  'Crítica',
  'Alta',
  'Média',
  'Baixa',
]

// ============================================================
// FORMATAÇÕES
// ============================================================

function formatarData(data: string) {
  if (!data) {
    return '-'
  }

  const partes = data.split('-')

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  return data
}

// ============================================================

function formatarDataHora(data: string) {
  const objeto = new Date(data)

  if (Number.isNaN(objeto.getTime())) {
    return data
  }

  return objeto.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================

function formatarTamanho(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================
// CLASSE STATUS
// ============================================================

function classeStatus(status: string) {
  switch (status) {
    case 'Nova':
      return 'status-nova'

    case 'Aguardando':
      return 'status-nova'

    case 'Em Atendimento':
      return 'status-em-atendimento'

    case 'Com Pendências':
      return 'status-com-pendencias'

    case 'Concluída':
      return 'status-concluida'

    case 'Cancelada':
      return 'status-cancelada'

    default:
      return 'status-nova'
  }
}

// ============================================================
// CLASSE PRIORIDADE
// ============================================================

function classePrioridade(
  prioridade: string
) {
  switch (prioridade) {
    case 'Crítica':
      return 'prioridade-alta'

    case 'Alta':
      return 'prioridade-alta'

    case 'Média':
      return 'prioridade-media'

    default:
      return 'prioridade-baixa'
  }
}

// ============================================================
// COMPONENTE
// ============================================================

export function DetalheDemandaPage({
  demanda,
  onVoltar,
  onAlterarStatus,
  onAlterarResponsavel,
  onAdicionarComentario,
  onAdicionarArquivo,
  perfilUsuario,
  analistas = [],
  onAlterarPrioridade,
  onAlterarPrazoManual,
  onReabrirDemanda,
  onCancelarDemanda,
}: Props) {
  // ==========================================================
  // STATUS
  // ==========================================================

  const [
    statusSelecionado,
    setStatusSelecionado,
  ] = useState(
    demanda.status
  )

  // ==========================================================
  // ANALISTA
  // ==========================================================

  const [
    responsavelSelecionado,
    setResponsavelSelecionado,
  ] = useState(
    demanda.responsavel || ''
  )

  // ==========================================================
  // COMENTÁRIO
  // ==========================================================

  const [
    comentario,
    setComentario,
  ] = useState('')

  // ==========================================================
  // COMENTÁRIOS LOCAIS
  // ==========================================================

  const [
    comentariosLocais,
    setComentariosLocais,
  ] = useState<Comentario[]>(
    demanda.comentarios || []
  )

  // ==========================================================
  // ARQUIVOS
  // ==========================================================

  const [
    arquivosLocais,
    setArquivosLocais,
  ] = useState<Arquivo[]>(
    demanda.arquivos || []
  )

  // ==========================================================
  // HISTÓRICO
  // ==========================================================

  const [
    historicoLocal,
    setHistoricoLocal,
  ] = useState<Historico[]>(
    demanda.historico || []
  )

  // ==========================================================
  // COMENTÁRIOS PENDENTES
  // ==========================================================

  const [
    comentariosPendentes,
    setComentariosPendentes,
  ] = useState<number[]>([])

  // ==========================================================
  // ARQUIVOS PENDENTES
  // ==========================================================

  const [
    arquivosPendentes,
    setArquivosPendentes,
  ] = useState<number[]>([])

  // ==========================================================
  // SALVANDO
  // ==========================================================

  const [
    salvando,
    setSalvando,
  ] = useState(false)

  // ==========================================================
  // PENDÊNCIA
  // ==========================================================

  const [
    mostrarPendencia,
    setMostrarPendencia,
  ] = useState(false)

  const [
    motivoPendencia,
    setMotivoPendencia,
  ] = useState('')

  // ==========================================================
  // CONCLUSÃO
  // ==========================================================

  const [
    mostrarConclusao,
    setMostrarConclusao,
  ] = useState(false)

  const [
    comentarioConclusao,
    setComentarioConclusao,
  ] = useState('')

  // ==========================================================
  // PRIORIDADE
  // ==========================================================

  const [
    prioridadeSelecionada,
    setPrioridadeSelecionada,
  ] = useState(
    demanda.prioridade
  )

  // ==========================================================
  // PRAZO
  // ==========================================================

  const [
    novoPrazo,
    setNovoPrazo,
  ] = useState(
    demanda.prazo || ''
  )

  // ==========================================================
  // MOTIVO ALTERAÇÃO
  // ==========================================================

  const [
    motivoAlteracao,
    setMotivoAlteracao,
  ] = useState('')

  // ==========================================================
  // MOTIVO REABERTURA
  // ==========================================================

  const [
    motivoReabertura,
    setMotivoReabertura,
  ] = useState('')

  // ==========================================================
  // MOTIVO CANCELAMENTO
  // ==========================================================

  const [
    motivoCancelamento,
    setMotivoCancelamento,
  ] = useState('')

  // ==========================================================
  // EXIBIR CANCELAMENTO
  // ==========================================================

  const [
    mostrarCancelamento,
    setMostrarCancelamento,
  ] = useState(false)

  // ==========================================================
  // SINCRONIZAR COM A DEMANDA
  // ==========================================================

  useEffect(() => {
    setStatusSelecionado(
      demanda.status
    )

    setPrioridadeSelecionada(
      demanda.prioridade
    )

    setNovoPrazo(
      demanda.prazo || ''
    )

    setMotivoAlteracao('')

    setMotivoReabertura('')

    setMotivoCancelamento('')

    setMostrarCancelamento(
      false
    )

    setResponsavelSelecionado(
      demanda.responsavel || ''
    )

    setComentariosLocais(
      demanda.comentarios || []
    )

    setArquivosLocais(
      demanda.arquivos || []
    )

    setHistoricoLocal(
      demanda.historico || []
    )

    setComentariosPendentes([])

    setArquivosPendentes([])

    setComentario('')

    setMostrarPendencia(false)

    setMotivoPendencia('')

    setMostrarConclusao(false)

    setComentarioConclusao('')
  }, [demanda])

  // ==========================================================
  // ADICIONAR COMENTÁRIO LOCAL
  // ==========================================================

  function adicionarComentarioLocal() {
    const texto =
      comentario.trim()

    if (!texto) {
      return
    }

    const id =
      Date.now()

    const data =
      new Date().toISOString()

    const novoComentario:
      Comentario = {
      id,

      texto,

      usuario:
        'Usuário atual',

      data,
    }

    const novoHistorico:
      Historico = {
      id:
        id + 1,

      tipo:
        'comentario',

      titulo:
        'Comentário adicionado',

      descricao:
        texto,

      data,

      usuario:
        'Usuário atual',

      referenciaId:
        id,
    }

    setComentariosLocais(
      (atual) => [
        ...atual,
        novoComentario,
      ]
    )

    setComentariosPendentes(
      (atual) => [
        ...atual,
        id,
      ]
    )

    setHistoricoLocal(
      (atual) => [
        novoHistorico,
        ...atual,
      ]
    )

    setComentario('')
  }

  // ==========================================================
  // EXCLUIR COMENTÁRIO PENDENTE
  // ==========================================================

  function excluirComentario(
    id: number
  ) {
    if (
      !comentariosPendentes.includes(
        id
      )
    ) {
      return
    }

    setComentariosLocais(
      (atual) =>
        atual.filter(
          (item) =>
            item.id !== id
        )
    )

    setComentariosPendentes(
      (atual) =>
        atual.filter(
          (item) =>
            item !== id
        )
    )

    setHistoricoLocal(
      (atual) =>
        atual.filter(
          (item) =>
            item.referenciaId !==
            id
        )
    )
  }

  // ==========================================================
  // SELECIONAR ARQUIVO
  // ==========================================================

  function selecionarArquivo(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo =
      event.target.files?.[0]

    if (!arquivo) {
      return
    }

    // --------------------------------------------------------
    // LIMITE 20 MB
    // --------------------------------------------------------

    if (
      arquivo.size >
      20 * 1024 * 1024
    ) {
      alert(
        'O arquivo não pode ultrapassar 20 MB.'
      )

      event.target.value =
        ''

      return
    }

    // --------------------------------------------------------
    // EXTENSÃO
    // --------------------------------------------------------

    const extensao =
      arquivo.name
        .split('.')
        .pop()
        ?.toLowerCase()

    const permitidos = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'csv',
      'txt',
      'png',
      'jpg',
      'jpeg',
    ]

    if (
      !extensao ||
      !permitidos.includes(
        extensao
      )
    ) {
      alert(
        'Formato de arquivo não permitido.'
      )

      event.target.value =
        ''

      return
    }

    // --------------------------------------------------------
    // LEITURA
    // --------------------------------------------------------

    const leitor =
      new FileReader()

    leitor.onload = () => {
      const id =
        Date.now()

      const data =
        new Date().toISOString()

      const novoArquivo:
        Arquivo = {
        id,

        nome:
          arquivo.name,

        tamanho:
          arquivo.size,

        data,

        usuario:
          'Usuário atual',

        url:
          typeof leitor.result ===
          'string'
            ? leitor.result
            : '',
      }

      const novoHistorico:
        Historico = {
        id:
          id + 1,

        tipo:
          'arquivo',

        titulo:
          'Arquivo anexado',

        descricao:
          `O arquivo "${arquivo.name}" foi anexado à demanda.`,

        data,

        usuario:
          'Usuário atual',

        referenciaId:
          id,
      }

      setArquivosLocais(
        (atual) => [
          ...atual,
          novoArquivo,
        ]
      )

      setArquivosPendentes(
        (atual) => [
          ...atual,
          id,
        ]
      )

      setHistoricoLocal(
        (atual) => [
          novoHistorico,
          ...atual,
        ]
      )
    }

    leitor.readAsDataURL(
      arquivo
    )

    event.target.value =
      ''
  }

  // ==========================================================
  // EXCLUIR ARQUIVO PENDENTE
  // ==========================================================

  function excluirArquivo(
    id: number
  ) {
    if (
      !arquivosPendentes.includes(
        id
      )
    ) {
      return
    }

    setArquivosLocais(
      (atual) =>
        atual.filter(
          (arquivo) =>
            arquivo.id !== id
        )
    )

    setArquivosPendentes(
      (atual) =>
        atual.filter(
          (item) =>
            item !== id
        )
    )

    setHistoricoLocal(
      (atual) =>
        atual.filter(
          (item) =>
            item.referenciaId !==
            id
        )
    )
  }

  // ==========================================================
  // BAIXAR ARQUIVO
  // ==========================================================

  function baixarArquivo(
    arquivo: Arquivo
  ) {
    if (!arquivo.url) {
      return
    }

    const link =
      document.createElement(
        'a'
      )

    link.href =
      arquivo.url

    link.download =
      arquivo.nome

    document.body.appendChild(
      link
    )

    link.click()

    document.body.removeChild(
      link
    )
  }

  // ==========================================================
  // SELECIONAR STATUS
  // ==========================================================

  function selecionarStatus(
    novoStatus: string
  ) {
    if (
      novoStatus ===
      statusSelecionado
    ) {
      return
    }

    // --------------------------------------------------------
    // PENDÊNCIA
    // --------------------------------------------------------

    if (
      novoStatus ===
      'Com Pendências'
    ) {
      setMotivoPendencia(
        ''
      )

      setMostrarPendencia(
        true
      )

      return
    }

    // --------------------------------------------------------
    // CONCLUSÃO
    // --------------------------------------------------------

    if (
      novoStatus ===
      'Concluída'
    ) {
      setComentarioConclusao(
        ''
      )

      setMostrarConclusao(
        true
      )

      return
    }

    // --------------------------------------------------------
    // ATENDIMENTO
    // --------------------------------------------------------

    if (
      novoStatus ===
        'Em Atendimento' &&
      !responsavelSelecionado.trim()
    ) {
      alert(
        'A demanda precisa ter um Analista definido para entrar em atendimento.'
      )

      return
    }

    setStatusSelecionado(
      novoStatus
    )
  }

  // ==========================================================
  // CONFIRMAR PENDÊNCIA
  // ==========================================================

  function confirmarPendencia() {
    const motivo =
      motivoPendencia.trim()

    if (!motivo) {
      alert(
        'Informe obrigatoriamente o motivo da pendência.'
      )

      return
    }

    const id =
      Date.now()

    const data =
      new Date().toISOString()

    setStatusSelecionado(
      'Com Pendências'
    )

    const historicoStatus:
      Historico = {
      id,

      tipo:
        'status',

      titulo:
        'Demanda colocada em Com Pendências',

      descricao:
        'A demanda foi colocada em "Com Pendências".',

      data,

      usuario:
        'Usuário atual',

      referenciaId:
        demanda.id,

      valorAnterior:
        demanda.status,

      valorNovo:
        'Com Pendências',

      motivo,
    }

    const historicoMotivo:
      Historico = {
      id:
        id + 1,

      tipo:
        'pendencia',

      titulo:
        'Motivo da pendência',

      descricao:
        motivo,

      data,

      usuario:
        'Usuário atual',

      referenciaId:
        demanda.id,

      motivo,
    }

    setHistoricoLocal(
      (atual) => [
        historicoMotivo,
        historicoStatus,
        ...atual,
      ]
    )

    setMotivoPendencia(
      ''
    )

    setMostrarPendencia(
      false
    )
  }

  // ==========================================================
  // CONFIRMAR CONCLUSÃO
  // ==========================================================

  function confirmarConclusao() {
    const texto =
      comentarioConclusao.trim()

    if (!texto) {
      alert(
        'Informe obrigatoriamente um comentário para concluir a demanda.'
      )

      return
    }

    const id =
      Date.now()

    const data =
      new Date().toISOString()

    const novoComentario:
      Comentario = {
      id,

      texto,

      usuario:
        'Usuário atual',

      data,
    }

    const novoHistorico:
      Historico = {
      id:
        id + 1,

      tipo:
        'conclusao',

      titulo:
        'Demanda concluída',

      descricao:
        `A demanda foi concluída. Comentário: ${texto}`,

      data,

      usuario:
        'Usuário atual',

      referenciaId:
        id,

      valorAnterior:
        demanda.status,

      valorNovo:
        'Concluída',

      motivo:
        texto,
    }

    setStatusSelecionado(
      'Concluída'
    )

    setComentariosLocais(
      (atual) => [
        ...atual,
        novoComentario,
      ]
    )

    setComentariosPendentes(
      (atual) => [
        ...atual,
        id,
      ]
    )

    setHistoricoLocal(
      (atual) => [
        novoHistorico,
        ...atual,
      ]
    )

    setComentarioConclusao(
      ''
    )

    setMostrarConclusao(
      false
    )
  }

  // ==========================================================
  // CANCELAR PENDÊNCIA
  // ==========================================================

  function cancelarPendencia() {
    setMotivoPendencia(
      ''
    )

    setMostrarPendencia(
      false
    )

    setStatusSelecionado(
      demanda.status
    )
  }

  // ==========================================================
  // CANCELAR CONCLUSÃO
  // ==========================================================

  function cancelarConclusao() {
    setComentarioConclusao(
      ''
    )

    setMostrarConclusao(
      false
    )

    setStatusSelecionado(
      demanda.status
    )
  }

  // ==========================================================
  // CONFIRMAR CANCELAMENTO
  // ==========================================================

  function confirmarCancelamento() {
    const motivo =
      motivoCancelamento.trim()

    if (!motivo) {
      alert(
        'Informe obrigatoriamente o motivo do cancelamento.'
      )

      return
    }

    if (
      !onCancelarDemanda
    ) {
      alert(
        'A operação de cancelamento não está disponível.'
      )

      return
    }

    onCancelarDemanda(
      demanda.id,
      motivo
    )

    setMotivoCancelamento(
      ''
    )

    setMostrarCancelamento(
      false
    )
  }

  // ==========================================================
  // ALTERAÇÕES PENDENTES
  // ==========================================================

  const alteracoesPendentes =
    statusSelecionado !==
      demanda.status ||
    responsavelSelecionado !==
      (demanda.responsavel ||
        '') ||
    comentariosPendentes.length >
      0 ||
    arquivosPendentes.length >
      0

  // ==========================================================
  // SALVAR ALTERAÇÕES
  // ==========================================================

  function salvarAlteracoes() {
    if (
      !alteracoesPendentes
    ) {
      return
    }

    setSalvando(
      true
    )

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (
      statusSelecionado !==
      demanda.status
    ) {
      let motivoStatus:
        string | undefined

      if (
        statusSelecionado ===
        'Com Pendências'
      ) {
        motivoStatus =
          motivoPendencia.trim()
      }

      onAlterarStatus(
        demanda.id,
        statusSelecionado,
        motivoStatus
      )
    }

    // --------------------------------------------------------
    // ANALISTA
    // --------------------------------------------------------

    if (
      responsavelSelecionado !==
        (demanda.responsavel ||
          '') &&
      onAlterarResponsavel
    ) {
      onAlterarResponsavel(
        demanda.id,
        responsavelSelecionado
      )
    }

    // --------------------------------------------------------
    // COMENTÁRIOS
    // --------------------------------------------------------

    if (
      onAdicionarComentario
    ) {
      const pendentes =
        comentariosLocais.filter(
          (item) =>
            comentariosPendentes.includes(
              item.id
            )
        )

      pendentes.forEach(
        (item) => {
          onAdicionarComentario(
            demanda.id,
            item.texto
          )
        }
      )
    }

    // --------------------------------------------------------
    // ARQUIVOS
    // --------------------------------------------------------

    if (
      onAdicionarArquivo
    ) {
      const pendentes =
        arquivosLocais.filter(
          (item) =>
            arquivosPendentes.includes(
              item.id
            )
        )

      pendentes.forEach(
        (arquivo) => {
          onAdicionarArquivo(
            demanda.id,
            arquivo
          )
        }
      )
    }

    // --------------------------------------------------------
    // LIMPAR PENDÊNCIAS
    // --------------------------------------------------------

    setComentariosPendentes(
      []
    )

    setArquivosPendentes(
      []
    )

    setSalvando(
      false
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="detalhe-page">

      <div className="detalhe-container">

        {/* ==================================================
            CABEÇALHO
            ================================================== */}

        <div className="detalhe-header">

          <div>

            <div className="detalhe-codigo">
              DEMANDA #{demanda.id}
            </div>

            <h1>
              {demanda.titulo}
            </h1>

            <p>
              Detalhamento da demanda de TI
            </p>

          </div>

          <span
            className={`status-badge ${classeStatus(
              statusSelecionado
            )}`}
          >
            {statusSelecionado}
          </span>

        </div>


        {/* ==================================================
            DADOS DA DEMANDA
            ================================================== */}

        <section className="detalhe-card">

          <div className="card-title">
            Dados da Demanda
          </div>

          <div className="dados-grid">

            <div>

              <span>
                CLIENTE / ÓRGÃO
              </span>

              <strong>
                {demanda.cliente ||
                  '-'}
              </strong>

            </div>

            <div>

              <span>
                SISTEMA
              </span>

              <strong>
                {demanda.sistema ||
                  'Não informado'}
              </strong>

            </div>

            <div>

              <span>
                TIPO DA DEMANDA
              </span>

              <strong>
                {demanda.tipo ||
                  'Não informado'}
              </strong>

            </div>

            <div>

              <span>
                ANALISTA
              </span>

              <strong>
                {responsavelSelecionado ||
                  'Não atribuído'}
              </strong>

            </div>

            <div>

              <span>
                PRIORIDADE
              </span>

              <strong
                className={classePrioridade(
                  demanda.prioridade
                )}
              >
                {demanda.prioridade}
              </strong>

            </div>

            <div>

              <span>
                PRAZO
              </span>

              <strong>
                {formatarData(
                  demanda.prazo
                )}
              </strong>

            </div>

          </div>


          {/* =================================================
              CONTROLES DO GESTOR
              ================================================= */}

          {perfilUsuario ===
            'Gestor/Administrador' && (

            <div
              className="gestor-controles"
              style={{
                marginTop:
                  '18px',

                padding:
                  '16px',

                border:
                  '1px solid #dce5ef',

                borderRadius:
                  '10px',

                background:
                  '#f8fbff',
              }}
            >

              <strong
                style={{
                  display:
                    'block',

                  marginBottom:
                    '12px',
                }}
              >
                Controles do Gestor
              </strong>


              <div className="dados-grid">

                {/* PRIORIDADE */}

                <div className="campo-acao">

                  <label>
                    Prioridade
                  </label>

                  <select
                    value={
                      prioridadeSelecionada
                    }
                    onChange={(event) =>
                      setPrioridadeSelecionada(
                        event.target.value
                      )
                    }
                  >

                    {PRIORIDADES.map(
                      (item) => (

                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* PRAZO */}

                <div className="campo-acao">

                  <label>
                    Novo prazo
                  </label>

                  <input
                    type="date"
                    value={
                      novoPrazo
                    }
                    onChange={(event) =>
                      setNovoPrazo(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>


              {/* MOTIVO */}

              <textarea
                value={
                  motivoAlteracao
                }
                onChange={(event) =>
                  setMotivoAlteracao(
                    event.target.value
                  )
                }
                placeholder="Motivo obrigatório para alteração de prazo ou prioridade."
                style={{
                  width:
                    '100%',

                  minHeight:
                    '70px',

                  marginTop:
                    '10px',
                }}
              />


              {/* BOTÕES */}

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '10px',

                  marginTop:
                    '10px',

                  flexWrap:
                    'wrap',
                }}
              >

                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    prioridadeSelecionada ===
                    demanda.prioridade
                  }
                  onClick={() => {

                    if (
                      !motivoAlteracao.trim()
                    ) {
                      alert(
                        'Informe o motivo da alteração de prioridade.'
                      )

                      return
                    }

                    onAlterarPrioridade?.(
                      demanda.id,
                      prioridadeSelecionada,
                      motivoAlteracao.trim()
                    )

                    setMotivoAlteracao(
                      ''
                    )
                  }}
                >
                  Alterar prioridade
                </button>


                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {

                    if (
                      !novoPrazo
                    ) {
                      alert(
                        'Informe o novo prazo.'
                      )

                      return
                    }

                    if (
                      !motivoAlteracao.trim()
                    ) {
                      alert(
                        'Informe o motivo da alteração do prazo.'
                      )

                      return
                    }

                    onAlterarPrazoManual?.(
                      demanda.id,
                      novoPrazo,
                      motivoAlteracao.trim()
                    )

                    setMotivoAlteracao(
                      ''
                    )
                  }}
                >
                  Alterar prazo
                </button>

              </div>


              {/* =================================================
                  REABERTURA
                  ================================================= */}

              {demanda.status ===
                'Concluída' && (

                <div
                  style={{
                    marginTop:
                      '16px',

                    paddingTop:
                      '14px',

                    borderTop:
                      '1px solid #dce5ef',
                  }}
                >

                  <strong
                    style={{
                      display:
                        'block',

                      marginBottom:
                        '8px',
                    }}
                  >
                    Reabertura da demanda
                  </strong>

                  <textarea
                    value={
                      motivoReabertura
                    }
                    onChange={(event) =>
                      setMotivoReabertura(
                        event.target.value
                      )
                    }
                    placeholder="Informe obrigatoriamente o motivo da reabertura."
                    style={{
                      width:
                        '100%',

                      minHeight:
                        '70px',
                    }}
                  />

                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      marginTop:
                        '10px',
                    }}
                    onClick={() => {

                      if (
                        !motivoReabertura.trim()
                      ) {
                        alert(
                          'Informe o motivo da reabertura.'
                        )

                        return
                      }

                      onReabrirDemanda?.(
                        demanda.id,
                        motivoReabertura.trim()
                      )

                      setMotivoReabertura(
                        ''
                      )
                    }}
                  >
                    ↻ Reabrir demanda
                  </button>

                </div>

              )}


              {/* =================================================
                  CANCELAMENTO
                  ================================================= */}

              {demanda.status !==
                'Concluída' &&
                demanda.status !==
                  'Cancelada' && (

                <div
                  style={{
                    marginTop:
                      '16px',

                    paddingTop:
                      '14px',

                    borderTop:
                      '1px solid #dce5ef',
                  }}
                >

                  {!mostrarCancelamento ? (

                    <button
                      type="button"
                      className="btn-voltar"
                      onClick={() =>
                        setMostrarCancelamento(
                          true
                        )
                      }
                    >
                      ✕ Cancelar demanda
                    </button>

                  ) : (

                    <>

                      <strong
                        style={{
                          display:
                            'block',

                          marginBottom:
                            '8px',
                        }}
                      >
                        Motivo do cancelamento
                      </strong>

                      <textarea
                        value={
                          motivoCancelamento
                        }
                        onChange={(event) =>
                          setMotivoCancelamento(
                            event.target.value
                          )
                        }
                        placeholder="Informe obrigatoriamente o motivo do cancelamento."
                        style={{
                          width:
                            '100%',

                          minHeight:
                            '80px',
                        }}
                      />

                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '10px',

                          marginTop:
                            '10px',

                          flexWrap:
                            'wrap',
                        }}
                      >

                        <button
                          type="button"
                          className="btn-voltar"
                          onClick={() => {

                            setMotivoCancelamento(
                              ''
                            )

                            setMostrarCancelamento(
                              false
                            )
                          }}
                        >
                          Voltar
                        </button>


                        <button
                          type="button"
                          className="btn-primary"
                          onClick={
                            confirmarCancelamento
                          }
                        >
                          Confirmar cancelamento
                        </button>

                      </div>

                    </>

                  )}

                </div>

              )}

            </div>

          )}


          {/* =================================================
              DESCRIÇÃO
              ================================================= */}

          <div className="descricao-area">

            <span>
              DESCRIÇÃO
            </span>

            <p>
              {demanda.descricao ||
                'Nenhuma descrição registrada.'}
            </p>

          </div>


          {/* =================================================
              OBSERVAÇÕES
              ================================================= */}

          <div className="observacao-box">

            <span>
              OBSERVAÇÕES
            </span>

            <p>
              {demanda.observacao ||
                'Nenhuma observação registrada.'}
            </p>

          </div>

        </section>


        {/* ==================================================
            AÇÕES
            ================================================== */}

        <section className="detalhe-card">

          <div className="card-title">
            Ações
          </div>


          {/* RETOMAR */}

          {demanda.status ===
            'Com Pendências' && (

            <div
              style={{
                marginBottom:
                  '14px',
              }}
            >

              <button
                type="button"
                className="btn-primary"
                onClick={() => {

                  if (
                    !responsavelSelecionado.trim()
                  ) {
                    alert(
                      'Defina um Analista antes de retomar o atendimento.'
                    )

                    return
                  }

                  setStatusSelecionado(
                    'Em Atendimento'
                  )
                }}
              >
                ▶ Retomar atendimento
              </button>

            </div>

          )}


          <div className="acoes-content">

            {/* STATUS */}

            <div className="campo-acao">

              <label>
                Status
              </label>

              <select
                value={
                  statusSelecionado
                }
                onChange={(event) =>
                  selecionarStatus(
                    event.target.value
                  )
                }
                disabled={
                  demanda.status ===
                    'Concluída' ||
                  demanda.status ===
                    'Cancelada'
                }
              >

                {STATUS.map(
                  (item) => (

                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* ANALISTA */}

            <div className="campo-acao">

              <label>
                Analista
              </label>

              <select
                value={
                  responsavelSelecionado
                }
                onChange={(event) =>
                  setResponsavelSelecionado(
                    event.target.value
                  )
                }
                disabled={
                  demanda.status ===
                    'Concluída' ||
                  demanda.status ===
                    'Cancelada'
                }
              >

                <option value="">
                  Não atribuído
                </option>

                {analistas.map(
                  (item) => (

                    <option
                      key={item.id}
                      value={item.nome}
                    >
                      {item.nome}
                    </option>

                  )
                )}

              </select>

            </div>

          </div>

        </section>


        {/* ==================================================
            PENDÊNCIA
            ================================================== */}

        {mostrarPendencia && (

          <section className="detalhe-card">

            <div className="card-title">
              Motivo da pendência
            </div>

            <div className="comentarios-content">

              <textarea
                value={
                  motivoPendencia
                }
                onChange={(event) =>
                  setMotivoPendencia(
                    event.target.value
                  )
                }
                placeholder="Informe o motivo da pendência..."
              />

              <div className="comentario-actions">

                <button
                  className="btn-voltar"
                  type="button"
                  onClick={
                    cancelarPendencia
                  }
                >
                  Cancelar
                </button>

                <button
                  className="btn-primary"
                  type="button"
                  onClick={
                    confirmarPendencia
                  }
                >
                  Confirmar pendência
                </button>

              </div>

            </div>

          </section>

        )}


        {/* ==================================================
            CONCLUSÃO
            ================================================== */}

        {mostrarConclusao && (

          <section className="detalhe-card">

            <div className="card-title">
              Concluir demanda
            </div>

            <div className="comentarios-content">

              <textarea
                value={
                  comentarioConclusao
                }
                onChange={(event) =>
                  setComentarioConclusao(
                    event.target.value
                  )
                }
                placeholder="Informe obrigatoriamente o comentário de conclusão..."
              />

              <div className="comentario-actions">

                <button
                  className="btn-voltar"
                  type="button"
                  onClick={
                    cancelarConclusao
                  }
                >
                  Cancelar
                </button>

                <button
                  className="btn-primary"
                  type="button"
                  onClick={
                    confirmarConclusao
                  }
                >
                  Concluir demanda
                </button>

              </div>

            </div>

          </section>

        )}


        {/* ==================================================
            COMENTÁRIOS
            ================================================== */}

        <section className="detalhe-card">

          <div className="card-title">
            Comentários
          </div>

          <div className="comentarios-content">

            <textarea
              value={
                comentario
              }
              onChange={(event) =>
                setComentario(
                  event.target.value
                )
              }
              placeholder="Digite um comentário sobre esta demanda..."
            />

            <div className="comentario-actions">

              <button
                className="btn-primary"
                type="button"
                disabled={
                  !comentario.trim()
                }
                onClick={
                  adicionarComentarioLocal
                }
              >
                + Adicionar comentário
              </button>

            </div>


            {comentariosLocais.length ===
            0 ? (

              <div className="sem-registros">
                Nenhum comentário registrado.
              </div>

            ) : (

              <div className="lista-comentarios">

                {comentariosLocais.map(
                  (item) => {

                    const pendente =
                      comentariosPendentes.includes(
                        item.id
                      )

                    return (

                      <div
                        className="comentario-item"
                        key={item.id}
                      >

                        <div className="comentario-topo">

                          <strong>
                            {item.usuario}
                          </strong>

                          <span>
                            {formatarDataHora(
                              item.data
                            )}
                          </span>

                        </div>


                        <div className="comentario-texto">
                          {item.texto}
                        </div>


                        {pendente && (

                          <div className="comentario-rodape">

                            <span className="aviso-pendente">
                              Ainda não salvo
                            </span>

                            <button
                              type="button"
                              className="btn-excluir-pendente"
                              onClick={() =>
                                excluirComentario(
                                  item.id
                                )
                              }
                            >
                              Excluir
                            </button>

                          </div>

                        )}

                      </div>

                    )
                  }
                )}

              </div>

            )}

          </div>

        </section>


        {/* ==================================================
            ANEXOS
            ================================================== */}

        <section className="detalhe-card">

          <div className="card-title">
            Evidências e Arquivos
          </div>

          <div className="arquivos-content">

            <div className="arquivos-instrucoes">

              <div>

                <strong>
                  Anexe evidências e arquivos relacionados à demanda.
                </strong>

                <span>
                  Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG e JPEG.
                </span>

                <span>
                  Limite máximo: 20 MB por arquivo.
                </span>

              </div>


              <label className="btn-anexar">

                📎 Anexar arquivo

                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                  onChange={
                    selecionarArquivo
                  }
                />

              </label>

            </div>


            {arquivosLocais.length ===
            0 ? (

              <div className="arquivos-vazio">

                <div className="clip-icon">
                  📎
                </div>

                <strong>
                  Nenhum arquivo anexado
                </strong>

                <span>
                  As evidências e arquivos relacionados à demanda aparecerão aqui.
                </span>

              </div>

            ) : (

              <div className="lista-arquivos">

                {arquivosLocais.map(
                  (arquivo) => {

                    const pendente =
                      arquivosPendentes.includes(
                        arquivo.id
                      )

                    return (

                      <div
                        className="arquivo-item"
                        key={arquivo.id}
                      >

                        <div className="arquivo-info">

                          <div className="arquivo-icone">
                            📄
                          </div>

                          <div>

                            <strong>
                              {arquivo.nome}
                            </strong>

                            <span>

                              {formatarTamanho(
                                arquivo.tamanho
                              )}

                              {' • Anexado por '}

                              {arquivo.usuario}

                              {' • '}

                              {formatarDataHora(
                                arquivo.data
                              )}

                            </span>

                          </div>

                        </div>


                        <div className="arquivo-acoes">

                          {pendente && (

                            <button
                              type="button"
                              className="btn-excluir-pendente"
                              onClick={() =>
                                excluirArquivo(
                                  arquivo.id
                                )
                              }
                            >
                              Excluir
                            </button>

                          )}


                          <button
                            type="button"
                            className="btn-baixar"
                            onClick={() =>
                              baixarArquivo(
                                arquivo
                              )
                            }
                          >
                            ↓ Baixar
                          </button>

                        </div>

                      </div>

                    )
                  }
                )}

              </div>

            )}

          </div>

        </section>


        {/* ==================================================
            HISTÓRICO
            ================================================== */}

        <section className="detalhe-card">

          <div className="card-title">
            Histórico da Demanda
          </div>

          <div className="historico-content">

            {historicoLocal.length ===
            0 ? (

              <div className="historico-item">

                <div className="historico-bolinha" />

                <div>

                  <div className="historico-data">

                    {formatarDataHora(
                      demanda.dataAbertura ||
                        new Date().toISOString()
                    )}

                  </div>

                  <strong>
                    Demanda cadastrada
                  </strong>

                  <p>
                    Registro inicial da demanda.
                  </p>

                </div>

              </div>

            ) : (

              historicoLocal.map(
                (item) => (

                  <div
                    className="historico-item"
                    key={item.id}
                  >

                    <div className="historico-bolinha" />

                    <div className="historico-detalhes">

                      <div className="historico-data">

                        {formatarDataHora(
                          item.data
                        )}

                      </div>

                      <strong>
                        {item.titulo}
                      </strong>

                      <p>
                        {item.descricao}
                      </p>

                      <div className="historico-comentario">

                        {item.usuario}

                      </div>

                      {item.motivo && (

                        <div
                          style={{
                            marginTop:
                              '6px',

                            fontSize:
                              '12px',

                            color:
                              '#526579',
                          }}
                        >
                          <strong>
                            Motivo:
                          </strong>{' '}
                          {item.motivo}
                        </div>

                      )}

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </section>


        {/* ==================================================
            RODAPÉ
            ================================================== */}

        <div className="detalhe-footer">

          <button
            className="btn-voltar"
            type="button"
            onClick={
              onVoltar
            }
          >
            ← Voltar para demandas
          </button>


          <button
            className="btn-salvar"
            type="button"
            disabled={
              !alteracoesPendentes ||
              salvando
            }
            onClick={
              salvarAlteracoes
            }
          >
            {salvando
              ? 'Salvando...'
              : '✓ Salvar alterações'}
          </button>

        </div>

      </div>

    </div>
  )
}

export default DetalheDemandaPage