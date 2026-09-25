import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import type {
  Demanda,
  Comentario,
  Arquivo,
  Historico
} from '../types'

import './DetalheDemanda.css'

type Props = {
  demanda: Demanda

  onVoltar: () => void

  onAlterarStatus: (
    id: number,
    novoStatus: string
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
}

const RESPONSAVEIS = [
  'Responsável 1',
  'Responsável 2',
  'Responsável 3',
  'Responsável 4',
  'Responsável 5',
]

const STATUS = [
  'Nova',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
]

function formatarData(
  data: string
) {
  if (!data) {
    return '-'
  }

  const partes =
    data.split('-')

  if (
    partes.length === 3
  ) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  return data
}

function formatarDataHora(
  data: string
) {
  const objeto =
    new Date(data)

  if (
    Number.isNaN(
      objeto.getTime()
    )
  ) {
    return data
  }

  return objeto.toLocaleString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function formatarTamanho(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

function classeStatus(
  status: string
) {
  switch (status) {
    case 'Nova':
      return 'status-nova'

    case 'Em Atendimento':
      return 'status-em-atendimento'

    case 'Com Pendências':
      return 'status-com-pendencias'

    case 'Concluída':
      return 'status-concluida'

    default:
      return 'status-nova'
  }
}

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

export default function DetalheDemanda({
  demanda,
  onVoltar,
  onAlterarStatus,
  onAlterarResponsavel,
  onAdicionarComentario,
  onAdicionarArquivo,
}: Props) {
  const [
    statusSelecionado,
    setStatusSelecionado,
  ] = useState(
    demanda.status
  )

  const [
    responsavelSelecionado,
    setResponsavelSelecionado,
  ] = useState(
    demanda.responsavel
  )

  const [
    comentario,
    setComentario,
  ] = useState('')

  const [
    comentariosLocais,
    setComentariosLocais,
  ] = useState<Comentario[]>(
    demanda.comentarios || []
  )

  const [
    arquivosLocais,
    setArquivosLocais,
  ] = useState<Arquivo[]>(
    demanda.arquivos || []
  )

  const [
    historicoLocal,
    setHistoricoLocal,
  ] = useState<Historico[]>(
    demanda.historico || []
  )

  const [
    comentariosPendentes,
    setComentariosPendentes,
  ] = useState<number[]>(
    []
  )

  const [
    arquivosPendentes,
    setArquivosPendentes,
  ] = useState<number[]>(
    []
  )

  const [
    salvando,
    setSalvando,
  ] = useState(false)

  const [
    mostrarPendencia,
    setMostrarPendencia,
  ] = useState(false)

  const [
    motivoPendencia,
    setMotivoPendencia,
  ] = useState('')

  const [
    mostrarConclusao,
    setMostrarConclusao,
  ] = useState(false)

  const [
    comentarioConclusao,
    setComentarioConclusao,
  ] = useState('')

  useEffect(() => {
    setStatusSelecionado(
      demanda.status
    )

    setResponsavelSelecionado(
      demanda.responsavel
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

    setComentariosPendentes(
      []
    )

    setArquivosPendentes(
      []
    )

    setComentario('')

    setMostrarPendencia(
      false
    )

    setMotivoPendencia(
      ''
    )

    setMostrarConclusao(
      false
    )

    setComentarioConclusao(
      ''
    )
  }, [demanda])

  function adicionarComentarioLocal() {
    const texto =
      comentario.trim()

    if (!texto) {
      return
    }

    const id =
      Date.now()

    const novoComentario: Comentario = {
      id,
      texto,
      usuario: 'Usuário atual',
      data: new Date().toISOString(),
    }

    const novoHistorico: Historico = {
      id: id + 1,
      tipo: 'comentario',
      titulo:
        'Comentário adicionado',
      descricao: texto,
      data: new Date().toISOString(),
      usuario: 'Usuário atual',
      referenciaId: id,
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

  function selecionarArquivo(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const arquivo =
      event.target.files?.[0]

    if (!arquivo) {
      return
    }

    if (
      arquivo.size >
      20 * 1024 * 1024
    ) {
      alert(
        'O arquivo não pode ultrapassar 20 MB.'
      )

      event.target.value = ''

      return
    }

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

      event.target.value = ''

      return
    }

    const leitor =
      new FileReader()

    leitor.onload = () => {
      const id =
        Date.now()

      const novoArquivo: Arquivo = {
        id,
        nome: arquivo.name,
        tamanho: arquivo.size,
        data: new Date().toISOString(),
        usuario: 'Usuário atual',
        url:
          typeof leitor.result ===
          'string'
            ? leitor.result
            : '',
      }

      const novoHistorico: Historico = {
        id: id + 1,
        tipo: 'arquivo',
        titulo:
          'Arquivo anexado',
        descricao:
          `O arquivo "${arquivo.name}" foi anexado à demanda.`,
        data: new Date().toISOString(),
        usuario: 'Usuário atual',
        referenciaId: id,
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

    event.target.value = ''
  }

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

  function selecionarStatus(
    novoStatus: string
  ) {
    if (
      novoStatus ===
      statusSelecionado
    ) {
      return
    }

    if (
      novoStatus ===
      'Com Pendências'
    ) {
      setMostrarPendencia(
        true
      )

      return
    }

    if (
      novoStatus ===
      'Concluída'
    ) {
      setMostrarConclusao(
        true
      )

      return
    }

    setStatusSelecionado(
      novoStatus
    )
  }

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

    setStatusSelecionado(
      'Com Pendências'
    )

    const historicoStatus: Historico = {
      id,
      tipo: 'status',
      titulo:
        'Demanda colocada em Com Pendências',
      descricao:
        'A demanda foi colocada em "Com Pendências".',
      data: new Date().toISOString(),
      usuario: 'Usuário atual',
    }

    const historicoMotivo: Historico = {
      id: id + 1,
      tipo: 'pendencia',
      titulo:
        'Motivo da pendência',
      descricao: motivo,
      data: new Date().toISOString(),
      usuario: 'Usuário atual',
    }

    setHistoricoLocal(
      (atual) => [
        historicoMotivo,
        historicoStatus,
        ...atual,
      ]
    )

    setMotivoPendencia('')

    setMostrarPendencia(
      false
    )
  }

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

    const novoComentario: Comentario = {
      id,
      texto,
      usuario: 'Usuário atual',
      data: new Date().toISOString(),
    }

    const novoHistorico: Historico = {
      id: id + 1,
      tipo: 'conclusao',
      titulo:
        'Demanda concluída',
      descricao:
        'A demanda foi concluída.',
      data: new Date().toISOString(),
      usuario: 'Usuário atual',
      referenciaId: id,
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

  function cancelarPendencia() {
    setMotivoPendencia('')

    setMostrarPendencia(
      false
    )

    setStatusSelecionado(
      demanda.status
    )
  }

  function cancelarConclusao() {
    setComentarioConclusao('')

    setMostrarConclusao(
      false
    )

    setStatusSelecionado(
      demanda.status
    )
  }

  const alteracoesPendentes =
    statusSelecionado !==
      demanda.status ||
    responsavelSelecionado !==
      demanda.responsavel ||
    comentariosPendentes.length >
      0 ||
    arquivosPendentes.length >
      0

  function salvarAlteracoes() {
    if (
      !alteracoesPendentes
    ) {
      return
    }

    setSalvando(true)

    if (
      statusSelecionado !==
      demanda.status
    ) {
      onAlterarStatus(
        demanda.id,
        statusSelecionado
      )
    }

    if (
      responsavelSelecionado !==
        demanda.responsavel &&
      onAlterarResponsavel
    ) {
      onAlterarResponsavel(
        demanda.id,
        responsavelSelecionado
      )
    }

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

    setComentariosPendentes(
      []
    )

    setArquivosPendentes(
      []
    )

    setSalvando(false)
  }

  return (
    <div className="detalhe-page">

      <div className="detalhe-container">

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

        <section className="detalhe-card">

          <div className="card-title">
            Dados da Demanda
          </div>

          <div className="dados-grid">

            <div>
              <span>CLIENTE</span>
              <strong>
                {demanda.cliente}
              </strong>
            </div>

            <div>
              <span>RESPONSÁVEL</span>
              <strong>
                {responsavelSelecionado}
              </strong>
            </div>

            <div>
              <span>PRIORIDADE</span>
              <strong
                className={classePrioridade(
                  demanda.prioridade
                )}
              >
                {demanda.prioridade}
              </strong>
            </div>

            <div>
              <span>PRAZO</span>
              <strong>
                {formatarData(
                  demanda.prazo
                )}
              </strong>
            </div>

          </div>

          <div className="descricao-area">

            <span>DESCRIÇÃO</span>

            <p>
              {demanda.descricao}
            </p>

          </div>

          <div className="observacao-box">

            <span>OBSERVAÇÕES</span>

            <p>
              {demanda.observacao ||
                'Nenhuma observação registrada.'}
            </p>

          </div>

        </section>

        <section className="detalhe-card">

          <div className="card-title">
            Ações
          </div>

          <div className="acoes-content">

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

            <div className="campo-acao">

              <label>
                Responsável
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
              >
                <option value="">
                  Não atribuído
                </option>

                {RESPONSAVEIS.map(
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
                : 'Salvar alterações'}
            </button>

          </div>

        </section>

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
                placeholder="Informe o comentário de conclusão..."
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

        <section className="detalhe-card">

          <div className="card-title">
            Comentários
          </div>

          <div className="comentarios-content">

            <textarea
              value={comentario}
              onChange={(event) =>
                setComentario(
                  event.target.value
                )
              }
              placeholder="Digite um comentário..."
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
                Adicionar comentário
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

        <section className="detalhe-card">

          <div className="card-title">
            Anexos
          </div>

          <div className="arquivos-content">

            <div className="arquivos-instrucoes">

              <div>

                <strong>
                  Anexe arquivos relacionados à demanda
                </strong>

                <span>
                  PDF, Word, Excel, CSV, TXT e imagens — máximo 20 MB.
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
                  Os arquivos anexados aparecerão aqui.
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
                              )}{' '}
                              •{' '}
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
                            Baixar
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

        <section className="detalhe-card">

          <div className="card-title">
            Histórico
          </div>

          <div className="historico-content">

            {historicoLocal.length ===
            0 ? (
              <div className="sem-registros">
                Nenhum histórico registrado.
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

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </section>

        <div className="detalhe-footer">

          <button
            className="btn-voltar"
            type="button"
            onClick={onVoltar}
          >
            ← Voltar para demandas
          </button>

        </div>

      </div>

    </div>
  )
}