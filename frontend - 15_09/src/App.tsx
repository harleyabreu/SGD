// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.8 — APLICAÇÃO PRINCIPAL — ESTÁVEL
// ============================================================
// ARQUIVO: src/App.tsx
//
// RESPONSABILIDADES:
// - Controle central da aplicação
// - Login e sessão
// - Navegação
// - Persistência das demandas
// - Criação de demandas
// - Alteração de status
// - Distribuição / redistribuição para Analistas
// - Alteração de prioridade
// - Alteração manual de prazo
// - Reabertura
// - Cancelamento com motivo obrigatório
// - Comentários
// - Anexos
// - Auditoria
// - Notificações
// - Compatibilidade com dados antigos
// - Controle de SLA
// ============================================================

import { useState } from 'react'

import Dashboard from './pages/Dashboard'
import TodasDemandas from './pages/TodasDemandas'
import NovaDemanda from './pages/NovaDemanda'
import DetalheDemandaPage from './pages/DetalheDemanda'
import Feriados from './pages/Feriados'
import Login from './pages/Login'
import MinhasDemandas from './pages/MinhasDemandas'
import Administracao from './pages/Administracao'
import Clientes from './pages/Clientes'
import Responsaveis from './pages/Responsaveis'
import Relatorios from './pages/Relatorios'
import TrocarSenha from './pages/TrocarSenha'

import type {
  Arquivo,
  Comentario,
  Demanda,
  Historico,
  Usuario,
} from './types'

import {
  carregarClientes,
  carregarSistemas,
  carregarTipos,
  carregarUsuarios,
  salvarUsuarios,
  carregarSessao,
  limparSessao,
  salvarSessao,
  type SessaoUsuario,
} from './services/storage'

import { registrarAlteracao } from './services/auditoria'
import { criarNotificacao } from './services/notificacoes'

// ============================================================
// USUÁRIO PADRÃO
// ============================================================

const USUARIO_ATUAL = 'Usuário atual'

// ============================================================
// STATUS OFICIAIS
// ============================================================

const STATUS_OFICIAIS = [
  'Nova',
  'Aguardando',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
  'Cancelada',
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
// SLA
// ============================================================

const SLA_POR_PRIORIDADE: Record<string, number> = {
  'Crítica': 2,
  'Alta': 6,
  'Média': 10,
  'Baixa': 20,
}

// ============================================================
// DATA / HORA
// ============================================================

function agoraISO(): string {
  return new Date().toISOString()
}

// ============================================================
// DATA LOCAL NO PADRÃO YYYY-MM-DD
// ============================================================

function dataLocalISO(data = new Date()): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

// ============================================================
// FERIADOS CADASTRADOS
// ============================================================

function feriadosCadastrados(): string[] {
  try {
    const dados = JSON.parse(
      localStorage.getItem('feriados') || '[]'
    )

    if (!Array.isArray(dados)) {
      return []
    }

    return dados
      .filter((item) => {
        if (typeof item === 'string') {
          return true
        }

        return item?.ativo !== false
      })
      .map((item) => {
        const valor =
          typeof item === 'string'
            ? item
            : item &&
                typeof item.data === 'string'
              ? item.data
              : ''

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
          const [
            dia,
            mes,
            ano,
          ] = valor.split('/')

          return `${ano}-${mes}-${dia}`
        }

        return valor
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

// ============================================================
// DIA ÚTIL
// ============================================================

function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getDay()

  if (
    diaSemana === 0 ||
    diaSemana === 6
  ) {
    return false
  }

  const chave = dataLocalISO(data)

  return !feriadosCadastrados().includes(chave)
}

// ============================================================
// ADICIONAR DIAS ÚTEIS
// ============================================================

function adicionarDiasUteis(
  dataInicial: Date,
  quantidade: number
): Date {
  const resultado = new Date(dataInicial)

  resultado.setHours(
    0,
    0,
    0,
    0
  )

  let adicionados = 0

  while (
    adicionados < quantidade
  ) {
    resultado.setDate(
      resultado.getDate() + 1
    )

    if (
      ehDiaUtil(resultado)
    ) {
      adicionados += 1
    }
  }

  return resultado
}

// ============================================================
// PRAZO POR PRIORIDADE
// ============================================================

function diasPrazoPorPrioridade(
  prioridade: string
): number {
  return (
    SLA_POR_PRIORIDADE[prioridade] ??
    SLA_POR_PRIORIDADE['Média']
  )
}

// ============================================================
// CALCULAR PRAZO
// ============================================================

function calcularPrazo(
  prioridade: string,
  dataAbertura = new Date()
): string {
  return dataLocalISO(
    adicionarDiasUteis(
      dataAbertura,
      diasPrazoPorPrioridade(
        prioridade
      )
    )
  )
}

// ============================================================
// HISTÓRICO
// ============================================================

function criarHistorico(
  tipo: string,
  titulo: string,
  descricao: string,
  referenciaId?: number,
  extras?: {
    valorAnterior?: string
    valorNovo?: string
    motivo?: string
  }
): Historico {
  return {
    id:
      Date.now() +
      Math.floor(
        Math.random() * 1000
      ),

    tipo,

    titulo,

    descricao,

    data: agoraISO(),

    usuario:
      nomeUsuarioAtualGlobal,

    referenciaId,

    ...extras,
  }
}

// ============================================================
// REFERÊNCIA DO USUÁRIO ATUAL
//
// Mantida fora do componente apenas para permitir que a função
// de histórico continue simples.
// Ela é atualizada dentro do App a cada render.
// ============================================================

let nomeUsuarioAtualGlobal =
  USUARIO_ATUAL

// ============================================================
// NORMALIZAÇÃO DAS DEMANDAS
// ============================================================

function normalizarDemanda(
  demanda: Demanda
): Demanda {
  const prioridadeOriginal =
    demanda.prioridade

  const prioridade =
    prioridadeOriginal === 'Urgente'
      ? 'Crítica'
      : PRIORIDADES.includes(
          prioridadeOriginal
        )
        ? prioridadeOriginal
        : 'Média'

  const dataAbertura =
    demanda.dataAbertura ||
    agoraISO()

  let status =
    demanda.status || 'Nova'

  // Compatibilidade com versões antigas.
  if (
    status === 'Em Processo' ||
    status === 'Em análise'
  ) {
    status = 'Em Atendimento'
  }

  if (
    status === 'Pendente'
  ) {
    status = 'Com Pendências'
  }

  if (
    !STATUS_OFICIAIS.includes(status)
  ) {
    status = demanda.responsavel
      ? 'Em Atendimento'
      : 'Aguardando'
  }

  return {
    ...demanda,

    status,

    prioridade,

    responsavel:
      demanda.responsavel || '',

    cliente:
      demanda.cliente || '',

    sistema:
      demanda.sistema || '',

    tipo:
      demanda.tipo || '',

    dataAbertura,

    prazo:
      demanda.prazo ||
      calcularPrazo(
        prioridade,
        new Date(dataAbertura)
      ),

    prazoDiasUteis:
      demanda.prazoDiasUteis ||
      diasPrazoPorPrioridade(
        prioridade
      ),

    prazoManual:
      Boolean(
        demanda.prazoManual
      ),

    comentarios:
      Array.isArray(
        demanda.comentarios
      )
        ? demanda.comentarios
        : [],

    arquivos:
      Array.isArray(
        demanda.arquivos
      )
        ? demanda.arquivos
        : [],

    historico:
      Array.isArray(
        demanda.historico
      )
        ? demanda.historico
        : [],

    periodosPendencia:
      Array.isArray(
        demanda.periodosPendencia
      )
        ? demanda.periodosPendencia
        : [],
  }
}

// ============================================================
// CARREGAR DEMANDAS
// ============================================================

function carregarDemandas(): Demanda[] {
  const salvas =
    localStorage.getItem(
      'demandas'
    )

  if (!salvas) {
    return []
  }

  try {
    const dados =
      JSON.parse(salvas)

    if (!Array.isArray(dados)) {
      return []
    }

    const normalizadas =
      dados.map(
        normalizarDemanda
      )

    try {
      localStorage.setItem(
        'demandas',
        JSON.stringify(
          normalizadas
        )
      )
    } catch {
      // O sistema continua funcionando.
    }

    return normalizadas
  } catch {
    return []
  }
}

// ============================================================
// DIAS ÚTEIS CONSUMIDOS
//
// Não conta o dia de abertura.
// Desconsidera períodos de pendência.
// ============================================================

function diasUteisConsumidosSemPendencia(
  demanda: Demanda,
  agora = new Date()
): number {
  if (
    !demanda.dataAbertura
  ) {
    return 0
  }

  const inicio =
    new Date(
      demanda.dataAbertura
    )

  const fim =
    demanda.status === 'Concluída' &&
    demanda.dataConclusao
      ? new Date(
          demanda.dataConclusao
        )
      : agora

  if (
    Number.isNaN(
      inicio.getTime()
    ) ||
    Number.isNaN(
      fim.getTime()
    ) ||
    fim <= inicio
  ) {
    return 0
  }

  const periodos =
    demanda.periodosPendencia ||
    []

  const inicioDia =
    new Date(inicio)

  inicioDia.setHours(
    0,
    0,
    0,
    0
  )

  const fimDia =
    new Date(fim)

  fimDia.setHours(
    0,
    0,
    0,
    0
  )

  let cursor =
    new Date(
      inicioDia
    )

  let dias = 0

  while (
    cursor < fimDia
  ) {
    cursor.setDate(
      cursor.getDate() + 1
    )

    if (
      cursor > fimDia
    ) {
      break
    }

    if (
      !ehDiaUtil(cursor)
    ) {
      continue
    }

    const diaAtual =
      new Date(cursor)

    diaAtual.setHours(
      0,
      0,
      0,
      0
    )

    const emPendencia =
      periodos.some(
        (periodo) => {
          const inicioPendencia =
            new Date(
              periodo.inicio
            )

          const fimPendencia =
            periodo.fim
              ? new Date(
                  periodo.fim
                )
              : agora

          if (
            Number.isNaN(
              inicioPendencia.getTime()
            ) ||
            Number.isNaN(
              fimPendencia.getTime()
            )
          ) {
            return false
          }

          inicioPendencia.setHours(
            0,
            0,
            0,
            0
          )

          fimPendencia.setHours(
            0,
            0,
            0,
            0
          )

          return (
            diaAtual >=
              inicioPendencia &&
            diaAtual <=
              fimPendencia
          )
        }
      )

    if (
      !emPendencia
    ) {
      dias += 1
    }
  }

  return dias
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

function App() {

  const [
    pagina,
    setPagina,
  ] = useState('dashboard')

  const [
    demandaSelecionada,
    setDemandaSelecionada,
  ] =
    useState<Demanda | null>(
      null
    )

  const [
    usuarioTrocaSenha,
    setUsuarioTrocaSenha,
  ] = useState<Usuario | null>(null)

  const [
    demandas,
    setDemandas,
  ] = useState<Demanda[]>(
    carregarDemandas
  )

  // ==========================================================
  // SESSÃO
  // ==========================================================

  const [
    sessao,
    setSessao,
  ] = useState<SessaoUsuario | null>(
    carregarSessao
  )

  const nomeUsuarioAtual =
    sessao?.nome ||
    USUARIO_ATUAL

  nomeUsuarioAtualGlobal =
    nomeUsuarioAtual

  const usuarioAtual =
    sessao
      ? carregarUsuarios().find(
          (usuario) =>
            usuario.id ===
            sessao.usuarioId
        ) || {
          id: sessao.usuarioId,

          nome: sessao.nome,

          login: sessao.login,

          email: '',

          perfil: sessao.perfil,

          status:
            'Ativo' as const,

          criadoEm: '',
        }
      : null

  const usuariosCadastrados =
    carregarUsuarios()

  const clientesCadastrados =
    carregarClientes()

  const sistemasCadastrados =
    carregarSistemas()

  const tiposCadastrados =
    carregarTipos()

  const analistasAtivos =
    usuariosCadastrados.filter(
      (usuario) =>
        usuario.perfil ===
          'Analista' &&
        usuario.status ===
          'Ativo'
    )

  // ==========================================================
  // LOGIN
  // ==========================================================

  function realizarLogin(
    usuario: Usuario,
    exigirTrocaSenha = false
  ) {
    if (exigirTrocaSenha) {
      setUsuarioTrocaSenha(usuario)

      return
    }

    const novaSessao:
      SessaoUsuario = {
      usuarioId:
        usuario.id,

      nome:
        usuario.nome,

      perfil:
        usuario.perfil,

      login:
        usuario.login,
    }

    salvarSessao(
      novaSessao
    )

    setSessao(
      novaSessao
    )

    setPagina(
      usuario.perfil ===
        'Analista'
        ? 'minhas-demandas'
        : 'dashboard'
    )
  }

  async function salvarNovaSenha(
    novaSenha: string
  ) {
    if (!usuarioTrocaSenha) {
      return
    }

    const bytes = new TextEncoder().encode(novaSenha)
    const digest = await window.crypto.subtle.digest(
      'SHA-256',
      bytes
    )

    const senhaHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    const usuarios = carregarUsuarios() as Array<
      Usuario & {
        senhaHash?: string
        exigirTrocaSenha?: boolean
      }
    >

    const atualizados = usuarios.map((item) =>
      item.id === usuarioTrocaSenha.id
        ? {
            ...item,
            senhaHash,
            exigirTrocaSenha: false,
            atualizadoEm: agoraISO(),
          }
        : item
    )

    salvarUsuarios(atualizados)

    registrarAlteracao(
      'usuario',
      usuarioTrocaSenha.id,
      'troca_senha_primeiro_acesso',
      `O usuário ${usuarioTrocaSenha.nome} concluiu a troca da senha no primeiro acesso.`,
      usuarioTrocaSenha.nome
    )

    const usuarioAtualizado = atualizados.find(
      (item) => item.id === usuarioTrocaSenha.id
    ) || usuarioTrocaSenha

    setUsuarioTrocaSenha(null)

    const novaSessao: SessaoUsuario = {
      usuarioId: usuarioAtualizado.id,
      nome: usuarioAtualizado.nome,
      perfil: usuarioAtualizado.perfil,
      login: usuarioAtualizado.login,
    }

    salvarSessao(novaSessao)
    setSessao(novaSessao)
    setPagina(
      usuarioAtualizado.perfil === 'Analista'
        ? 'minhas-demandas'
        : 'dashboard'
    )
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  function realizarLogout() {
    limparSessao()

    setSessao(
      null
    )

    setDemandaSelecionada(
      null
    )

    setUsuarioTrocaSenha(null)

    setPagina(
      'login'
    )
  }

  // ==========================================================
  // SALVAR TODAS AS DEMANDAS
  // ==========================================================

  function salvarDemandas(
    demandasAtualizadas: Demanda[]
  ) {
    const normalizadas =
      demandasAtualizadas.map(
        normalizarDemanda
      )

    setDemandas(
      normalizadas
    )

    try {
      localStorage.setItem(
        'demandas',
        JSON.stringify(
          normalizadas
        )
      )
    } catch {
      // Mantém funcionamento da interface.
    }

    if (
      demandaSelecionada
    ) {
      const selecionada =
        normalizadas.find(
          (item) =>
            item.id ===
            demandaSelecionada.id
        )

      if (
        selecionada
      ) {
        setDemandaSelecionada(
          selecionada
        )
      }
    }
  }

  // ==========================================================
  // ATUALIZAR UMA DEMANDA
  // ==========================================================

  function atualizarDemanda(
    id: number,
    atualizador: (
      demanda: Demanda
    ) => Demanda
  ) {
    setDemandas(
      (atuais) => {
        const demandasAtualizadas =
          atuais.map(
            (demanda) =>
              demanda.id === id
                ? normalizarDemanda(
                    atualizador(
                      normalizarDemanda(
                        demanda
                      )
                    )
                  )
                : demanda
          )

        try {
          localStorage.setItem(
            'demandas',
            JSON.stringify(
              demandasAtualizadas
            )
          )
        } catch {
          // Mantém interface funcionando.
        }

        const selecionada =
          demandasAtualizadas.find(
            (item) =>
              item.id === id
          )

        if (
          selecionada
        ) {
          setDemandaSelecionada(
            selecionada
          )
        }

        return demandasAtualizadas
      }
    )
  }

  // ==========================================================
  // NOVA DEMANDA
  // ==========================================================

  function salvarDemanda(
    demanda: Omit<
      Demanda,
      'id' | 'status'
    >
  ) {
    const agora =
      new Date()

    const agoraTexto =
      agora.toISOString()

    const id =
      Date.now()

    const prioridade =
      PRIORIDADES.includes(
        demanda.prioridade
      )
        ? demanda.prioridade
        : 'Média'

    const prazo =
      demanda.prazo ||
      calcularPrazo(
        prioridade,
        agora
      )

    const responsavel =
      demanda.responsavel?.trim() ||
      ''

    const novaDemanda =
      normalizarDemanda({
        ...demanda,

        id,

        prioridade,

        prazo,

        dataAbertura:
          demanda.dataAbertura ||
          agoraTexto,

        usuarioCriacao:
          demanda.usuarioCriacao ||
          nomeUsuarioAtual,

        prazoDiasUteis:
          diasPrazoPorPrioridade(
            prioridade
          ),

        prazoManual: false,

        status:
          responsavel
            ? 'Em Atendimento'
            : 'Aguardando',

        comentarios: [],

        arquivos: [],

        historico: [
          {
            id:
              id + 1,

            tipo:
              'criacao',

            titulo:
              'Demanda cadastrada',

            descricao:
              responsavel
                ? 'A demanda foi cadastrada e atribuída para atendimento.'
                : 'A demanda foi cadastrada e permanece aguardando atribuição de Analista.',

            data:
              agoraTexto,

            usuario:
              nomeUsuarioAtual,

            referenciaId:
              id,
          },
        ],
      })

    const atualizadas = [
      ...demandas,
      novaDemanda,
    ]

    salvarDemandas(
      atualizadas
    )

    registrarAlteracao(
      'demanda',
      id,
      'criacao',
      `Demanda DEM-${String(id).padStart(5, '0')} cadastrada.`,
      nomeUsuarioAtual
    )

    if (
      responsavel
    ) {
      criarNotificacao({
        tipo:
          'informativo',

        titulo:
          'Nova demanda atribuída',

        descricao:
          `A demanda DEM-${String(id).padStart(5, '0')} foi atribuída para ${responsavel}.`,

        demandaId:
          id,

        prioridade,
      })
    }

    setPagina(
      'todas-demandas'
    )
  }

  // ==========================================================
  // ALTERAR PRIORIDADE
  //
  // REGRA:
  // - O tempo já consumido não é zerado.
  // - O novo SLA é aplicado somente sobre o saldo.
  // ==========================================================

  function alterarPrioridade(
    id: number,
    novaPrioridade: string,
    motivo?: string
  ) {
    if (
      sessao?.perfil !==
      'Gestor/Administrador'
    ) {
      return
    }

    if (
      !PRIORIDADES.includes(
        novaPrioridade
      )
    ) {
      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        if (
          demanda.prioridade ===
          novaPrioridade
        ) {
          return demanda
        }

        const consumidos =
          diasUteisConsumidosSemPendencia(
            demanda
          )

        const novoSla =
          diasPrazoPorPrioridade(
            novaPrioridade
          )

        const saldo =
          Math.max(
            novoSla -
              consumidos,
            0
          )

        const novoPrazo =
          dataLocalISO(
            adicionarDiasUteis(
              new Date(),
              saldo
            )
          )

        const agora =
          agoraISO()

        const motivoFinal =
          motivo?.trim() ||
          'Alteração de prioridade realizada pelo Gestor.'

        const descricao =
          `Prioridade alterada de "${demanda.prioridade}" para "${novaPrioridade}". Tempo já consumido: ${consumidos} dia(s) útil(eis). Novo SLA: ${novoSla} dia(s) útil(eis). Saldo considerado: ${saldo} dia(s) útil(eis).`

        registrarAlteracao(
          'demanda',
          id,
          'alteracao_prioridade',
          descricao,
          nomeUsuarioAtual,
          {
            valorAnterior:
              demanda.prioridade,

            valorNovo:
              novaPrioridade,

            motivo:
              motivoFinal,
          }
        )

        return {
          ...demanda,

          prioridade:
            novaPrioridade,

          prazo:
            novoPrazo,

          prazoDiasUteis:
            novoSla,

          prazoManual:
            false,

          motivoAlteracaoPrioridade:
            motivoFinal,

          historico: [
            {
              id:
                Date.now(),

              tipo:
                'prioridade',

              titulo:
                'Prioridade alterada',

              descricao,

              data:
                agora,

              usuario:
                nomeUsuarioAtual,

              referenciaId:
                id,

              valorAnterior:
                demanda.prioridade,

              valorNovo:
                novaPrioridade,

              motivo:
                motivoFinal,
            },

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // ALTERAR PRAZO MANUALMENTE
  // ==========================================================

  function alterarPrazoManual(
    id: number,
    novoPrazo: string,
    motivo: string
  ) {
    if (
      sessao?.perfil !==
      'Gestor/Administrador'
    ) {
      return
    }

    if (
      !novoPrazo ||
      !motivo.trim()
    ) {
      window.alert(
        'Informe o novo prazo e o motivo da alteração.'
      )

      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        if (
          demanda.prazo ===
          novoPrazo
        ) {
          return demanda
        }

        const motivoFinal =
          motivo.trim()

        const agora =
          agoraISO()

        const descricao =
          `Prazo alterado de "${demanda.prazo}" para "${novoPrazo}". Motivo: ${motivoFinal}.`

        registrarAlteracao(
          'demanda',
          id,
          'alteracao_prazo',
          descricao,
          nomeUsuarioAtual,
          {
            valorAnterior:
              demanda.prazo,

            valorNovo:
              novoPrazo,

            motivo:
              motivoFinal,
          }
        )

        return {
          ...demanda,

          prazo:
            novoPrazo,

          prazoManual:
            true,

          motivoPrazoManual:
            motivoFinal,

          historico: [
            {
              id:
                Date.now(),

              tipo:
                'prazo',

              titulo:
                'Prazo alterado manualmente',

              descricao,

              data:
                agora,

              usuario:
                nomeUsuarioAtual,

              referenciaId:
                id,

              valorAnterior:
                demanda.prazo,

              valorNovo:
                novoPrazo,

              motivo:
                motivoFinal,
            },

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // REABRIR DEMANDA
  // ==========================================================

  function reabrirDemanda(
    id: number,
    motivo: string
  ) {
    if (
      sessao?.perfil !==
      'Gestor/Administrador'
    ) {
      return
    }

    if (
      !motivo.trim()
    ) {
      window.alert(
        'Informe obrigatoriamente o motivo da reabertura.'
      )

      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        if (
          demanda.status !==
          'Concluída'
        ) {
          return demanda
        }

        const agora =
          agoraISO()

        const motivoFinal =
          motivo.trim()

        const historico:
          Historico = {
          id:
            Date.now(),

          tipo:
            'reabertura',

          titulo:
            'Demanda reaberta',

          descricao:
            `A demanda foi reaberta. Motivo: ${motivoFinal}.`,

          data:
            agora,

          usuario:
            nomeUsuarioAtual,

          referenciaId:
            id,

          valorAnterior:
            'Concluída',

          valorNovo:
            'Em Atendimento',

          motivo:
            motivoFinal,
        }

        registrarAlteracao(
          'demanda',
          id,
          'reabertura',
          historico.descricao,
          nomeUsuarioAtual,
          {
            valorAnterior:
              'Concluída',

            valorNovo:
              'Em Atendimento',

            motivo:
              motivoFinal,
          }
        )

        criarNotificacao({
          tipo:
            'alerta',

          titulo:
            'Demanda reaberta',

          descricao:
            `DEM-${String(id).padStart(5, '0')} foi reaberta por ${nomeUsuarioAtual}.`,

          demandaId:
            id,

          prioridade:
            demanda.prioridade,
        })

        return {
          ...demanda,

          status:
            'Em Atendimento',

          dataReabertura:
            agora,

          usuarioReabertura:
            nomeUsuarioAtual,

          dataConclusao:
            undefined,

          usuarioConclusao:
            undefined,

          motivoReabertura:
            motivoFinal,

          historico: [
            historico,

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // CANCELAR DEMANDA
  //
  // SOMENTE GESTOR.
  // MOTIVO OBRIGATÓRIO.
  // ==========================================================

  function cancelarDemanda(
    id: number,
    motivo: string
  ) {
    if (
      sessao?.perfil !==
      'Gestor/Administrador'
    ) {
      return
    }

    const motivoFinal =
      motivo.trim()

    if (!motivoFinal) {
      window.alert(
        'Informe obrigatoriamente o motivo do cancelamento.'
      )

      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        if (
          demanda.status ===
            'Concluída' ||
          demanda.status ===
            'Cancelada'
        ) {
          return demanda
        }

        const agora =
          agoraISO()

        const statusAnterior =
          demanda.status

        const descricao =
          `Demanda cancelada. Status anterior: "${statusAnterior}". Motivo: ${motivoFinal}.`

        const historico:
          Historico = {
          id:
            Date.now(),

          tipo:
            'cancelamento',

          titulo:
            'Demanda cancelada',

          descricao,

          data:
            agora,

          usuario:
            nomeUsuarioAtual,

          referenciaId:
            id,

          valorAnterior:
            statusAnterior,

          valorNovo:
            'Cancelada',

          motivo:
            motivoFinal,
        }

        registrarAlteracao(
          'demanda',
          id,
          'cancelamento',
          descricao,
          nomeUsuarioAtual,
          {
            valorAnterior:
              statusAnterior,

            valorNovo:
              'Cancelada',

            motivo:
              motivoFinal,
          }
        )

        criarNotificacao({
          tipo:
            'alerta',

          titulo:
            'Demanda cancelada',

          descricao:
            `DEM-${String(id).padStart(5, '0')} foi cancelada por ${nomeUsuarioAtual}.`,

          demandaId:
            id,

          prioridade:
            demanda.prioridade,
        })

        return {
          ...demanda,

          status:
            'Cancelada',

          motivoCancelamento:
            motivoFinal,

          historico: [
            historico,

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // ALTERAR STATUS
  // ==========================================================

  function alterarStatus(
    id: number,
    novoStatus: string,
    motivo?: string
  ) {
    if (
      !STATUS_OFICIAIS.includes(
        novoStatus
      )
    ) {
      return
    }

    if (
      novoStatus ===
        'Com Pendências' &&
      !motivo?.trim()
    ) {
      window.alert(
        'O motivo da pendência é obrigatório.'
      )

      return
    }

    if (
      novoStatus ===
        'Concluída' &&
      !motivo?.trim()
    ) {
      window.alert(
        'O comentário de conclusão é obrigatório.'
      )

      return
    }

    if (
      novoStatus ===
        'Cancelada'
    ) {
      cancelarDemanda(
        id,
        motivo || ''
      )

      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        if (
          demanda.status ===
          novoStatus
        ) {
          return demanda
        }

        const agora =
          agoraISO()

        const statusAnterior =
          demanda.status

        let periodosPendencia =
          [
            ...(demanda.periodosPendencia ||
              []),
          ]

        // ======================================================
        // ENTRADA EM PENDÊNCIA
        // ======================================================

        if (
          novoStatus ===
          'Com Pendências'
        ) {
          periodosPendencia = [
            ...periodosPendencia,

            {
              inicio:
                agora,

              motivo:
                motivo?.trim() ||
                'Pendência registrada.',
            },
          ]
        }

        // ======================================================
        // SAÍDA DA PENDÊNCIA
        // ======================================================

        if (
          novoStatus ===
            'Em Atendimento' &&
          statusAnterior ===
            'Com Pendências'
        ) {
          const ultimo =
            periodosPendencia[
              periodosPendencia.length -
                1
            ]

          if (
            ultimo &&
            !ultimo.fim
          ) {
            periodosPendencia[
              periodosPendencia.length -
                1
            ] = {
              ...ultimo,

              fim:
                agora,
            }
          }
        }

        // ======================================================
        // TÍTULO DO HISTÓRICO
        // ======================================================

        let titulo =
          'Status alterado'

        if (
          novoStatus ===
          'Concluída'
        ) {
          titulo =
            'Demanda concluída'
        } else if (
          novoStatus ===
          'Com Pendências'
        ) {
          titulo =
            'Demanda colocada em Com Pendências'
        } else if (
          novoStatus ===
            'Em Atendimento' &&
          statusAnterior ===
            'Com Pendências'
        ) {
          titulo =
            'Atendimento retomado'
        }

        // ======================================================
        // DESCRIÇÃO
        // ======================================================

        let descricao =
          `Status alterado de "${statusAnterior}" para "${novoStatus}".`

        if (
          novoStatus ===
          'Com Pendências'
        ) {
          descricao =
            `A demanda foi colocada em "Com Pendências". Motivo: ${motivo?.trim() || 'Não informado'}.`
        }

        if (
          novoStatus ===
          'Concluída'
        ) {
          descricao =
            `A demanda foi concluída. Comentário de conclusão: ${motivo?.trim()}.`
        }

        const historico:
          Historico = {
          id:
            Date.now() +
            Math.floor(
              Math.random() *
                1000
            ),

          tipo:
            'status',

          titulo,

          descricao,

          data:
            agora,

          usuario:
            nomeUsuarioAtual,

          referenciaId:
            id,

          valorAnterior:
            statusAnterior,

          valorNovo:
            novoStatus,

          motivo:
            motivo?.trim(),
        }

        // ======================================================
        // AUDITORIA
        // ======================================================

        registrarAlteracao(
          'demanda',
          id,
          'alteracao_status',
          descricao,
          nomeUsuarioAtual,
          {
            valorAnterior:
              statusAnterior,

            valorNovo:
              novoStatus,

            motivo:
              motivo?.trim(),
          }
        )

        // ======================================================
        // NOTIFICAÇÃO — PENDÊNCIA
        // ======================================================

        if (
          novoStatus ===
          'Com Pendências'
        ) {
          criarNotificacao({
            tipo:
              'alerta',

            titulo:
              'Demanda com pendência',

            descricao:
              `DEM-${String(id).padStart(5, '0')} foi colocada em Com Pendências.`,

            demandaId:
              id,

            prioridade:
              demanda.prioridade,
          })
        }

        // ======================================================
        // NOTIFICAÇÃO — CONCLUSÃO
        // ======================================================

        if (
          novoStatus ===
          'Concluída'
        ) {
          criarNotificacao({
            tipo:
              'informativo',

            titulo:
              'Demanda concluída',

            descricao:
              `DEM-${String(id).padStart(5, '0')} foi concluída por ${nomeUsuarioAtual}.`,

            demandaId:
              id,

            prioridade:
              demanda.prioridade,
          })
        }

        return {
          ...demanda,

          status:
            novoStatus,

          dataConclusao:
            novoStatus ===
            'Concluída'
              ? agora
              : demanda.dataConclusao,

          usuarioConclusao:
            novoStatus ===
            'Concluída'
              ? nomeUsuarioAtual
              : demanda.usuarioConclusao,

          periodosPendencia,

          historico: [
            historico,

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // ALTERAÇÃO DE STATUS EM MASSA
  //
  // NÃO PERMITE:
  // - Conclusão
  // - Cancelamento
  //
  // Porque ambos exigem dados obrigatórios.
  // ==========================================================

  function alterarStatusEmMassa(
    ids: number[],
    novoStatus: string
  ) {
    if (
      !ids.length ||
      !novoStatus
    ) {
      return
    }

    if (
      novoStatus ===
        'Concluída' ||
      novoStatus ===
        'Cancelada'
    ) {
      window.alert(
        'Conclusão e cancelamento devem ser realizados pela tela de detalhe, com os registros obrigatórios.'
      )

      return
    }

    if (
      !STATUS_OFICIAIS.includes(
        novoStatus
      )
    ) {
      return
    }

    const idsValidos =
      new Set(ids)

    const agora =
      agoraISO()

    const demandasAtualizadas =
      demandas.map(
        (demanda) => {
          if (
            !idsValidos.has(
              demanda.id
            )
          ) {
            return demanda
          }

          const demandaNormalizada =
            normalizarDemanda(
              demanda
            )

          if (
            demandaNormalizada.status ===
            novoStatus
          ) {
            return demandaNormalizada
          }

          const historico:
            Historico = {
            id:
              Date.now() +
              Math.floor(
                Math.random() *
                  100000
              ),

            tipo:
              'status',

            titulo:
              'Status alterado em massa',

            descricao:
              `Status alterado de "${demandaNormalizada.status}" para "${novoStatus}" por ação em massa.`,

            data:
              agora,

            usuario:
              nomeUsuarioAtual,

            referenciaId:
              demandaNormalizada.id,

            valorAnterior:
              demandaNormalizada.status,

            valorNovo:
              novoStatus,
          }

          registrarAlteracao(
            'demanda',
            demandaNormalizada.id,
            'alteracao_status_massa',
            historico.descricao,
            nomeUsuarioAtual,
            {
              valorAnterior:
                demandaNormalizada.status,

              valorNovo:
                novoStatus,
            }
          )

          return {
            ...demandaNormalizada,

            status:
              novoStatus,

            historico: [
              historico,

              ...(demandaNormalizada.historico ||
                []),
            ],
          }
        }
      )

    salvarDemandas(
      demandasAtualizadas
    )
  }

  // ==========================================================
  // ALTERAR ANALISTA
  // ==========================================================

  function alterarResponsavel(
    id: number,
    novoResponsavel: string
  ) {
    const nomeNovo =
      novoResponsavel.trim()

    const analistaValido =
      !nomeNovo ||
      analistasAtivos.some(
        (usuario) =>
          usuario.nome ===
          nomeNovo
      )

    if (
      !analistaValido
    ) {
      window.alert(
        'Selecione um Analista ativo cadastrado no sistema.'
      )

      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        if (
          demanda.responsavel ===
          nomeNovo
        ) {
          return demanda
        }

        const anterior =
          demanda.responsavel ||
          'Sem Analista'

        const novo =
          nomeNovo ||
          'Sem Analista'

        const statusNovo =
          nomeNovo
            ? 'Em Atendimento'
            : 'Aguardando'

        const historico =
          criarHistorico(
            'redistribuicao',
            'Analista alterado',
            `Analista alterado de "${anterior}" para "${novo}".`,
            id,
            {
              valorAnterior:
                anterior,

              valorNovo:
                novo,
            }
          )

        registrarAlteracao(
          'demanda',
          id,
          'redistribuicao',
          `Demanda redistribuída de "${anterior}" para "${novo}".`,
          nomeUsuarioAtual,
          {
            valorAnterior:
              anterior,

            valorNovo:
              novo,
          }
        )

        if (
          nomeNovo
        ) {
          criarNotificacao({
            tipo:
              'informativo',

            titulo:
              'Demanda atribuída',

            descricao:
              `A demanda DEM-${String(id).padStart(5, '0')} foi atribuída para ${nomeNovo}.`,

            demandaId:
              id,

            prioridade:
              demanda.prioridade,
          })
        }

        return {
          ...demanda,

          responsavel:
            nomeNovo,

          status:
            statusNovo,

          historico: [
            historico,

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // ADICIONAR COMENTÁRIO
  // ==========================================================

  function adicionarComentario(
    id: number,
    texto: string
  ) {
    const textoLimpo =
      texto.trim()

    if (
      !textoLimpo
    ) {
      return
    }

    atualizarDemanda(
      id,
      (demanda) => {
        const novoComentario:
          Comentario = {
          id:
            Date.now() +
            Math.floor(
              Math.random() *
                1000
            ),

          texto:
            textoLimpo,

          usuario:
            nomeUsuarioAtual,

          data:
            agoraISO(),
        }

        const novoHistorico =
          criarHistorico(
            'comentario',
            'Comentário adicionado',
            'Foi adicionado um novo comentário à demanda.',
            novoComentario.id
          )

        registrarAlteracao(
          'demanda',
          id,
          'comentario',
          'Novo comentário adicionado à demanda.',
          nomeUsuarioAtual
        )

        return {
          ...demanda,

          comentarios: [
            ...(demanda.comentarios ||
              []),

            novoComentario,
          ],

          historico: [
            novoHistorico,

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // ADICIONAR ARQUIVO
  // ==========================================================

  function adicionarArquivo(
    id: number,
    arquivo: Arquivo
  ) {
    atualizarDemanda(
      id,
      (demanda) => {
        const novoHistorico =
          criarHistorico(
            'arquivo',
            'Arquivo anexado',
            `O arquivo "${arquivo.nome}" foi anexado à demanda.`,
            arquivo.id
          )

        registrarAlteracao(
          'demanda',
          id,
          'anexo',
          `Arquivo "${arquivo.nome}" anexado à demanda.`,
          nomeUsuarioAtual
        )

        return {
          ...demanda,

          arquivos: [
            ...(demanda.arquivos ||
              []),

            arquivo,
          ],

          historico: [
            novoHistorico,

            ...(demanda.historico ||
              []),
          ],
        }
      }
    )
  }

  // ==========================================================
  // ABRIR DETALHE
  // ==========================================================

  function abrirDetalhe(
    demanda: Demanda
  ) {
    setDemandaSelecionada(
      normalizarDemanda(
        demanda
      )
    )

    setPagina(
      'detalhe-demanda'
    )
  }

  // ==========================================================
  // VOLTAR PARA TODAS AS DEMANDAS
  // ==========================================================

  function voltarParaDemandas() {
    setDemandaSelecionada(
      null
    )

    setPagina(
      'todas-demandas'
    )
  }

  // ==========================================================
  // ABRIR FERIADOS
  // ==========================================================

  function abrirFeriados() {
    setPagina(
      'feriados'
    )
  }

  // ==========================================================
  // NAVEGAÇÃO DO MENU PRINCIPAL
  // ==========================================================

  function abrirNovaDemanda() {
    setPagina('nova-demanda')
  }

  function abrirClientes() {
    setPagina('clientes')
  }

  function abrirResponsaveis() {
    setPagina('responsaveis')
  }

  function abrirRelatorios() {
    setPagina('relatorios')
  }

  // ==========================================================
  // PRIMEIRO ACESSO / TROCA OBRIGATÓRIA DE SENHA
  // ==========================================================

  if (usuarioTrocaSenha) {
    return (
      <TrocarSenha
        usuario={usuarioTrocaSenha}
        onSalvar={salvarNovaSenha}
        onSair={realizarLogout}
      />
    )
  }

  // ==========================================================
  // AUTENTICAÇÃO
  // ==========================================================

  if (
    !sessao ||
    pagina === 'login'
  ) {
    return (
      <Login
        onLogin={
          realizarLogin
        }
      />
    )
  }

  // ==========================================================
  // ANALISTA
  // ==========================================================

  if (
    sessao.perfil ===
      'Analista' &&
    pagina !==
      'minhas-demandas' &&
    pagina !==
      'detalhe-demanda'
  ) {
    return (
      <MinhasDemandas
        usuario={
          usuarioAtual!
        }

        demandas={
          demandas
        }

        onVoltar={
          realizarLogout
        }

        onAbrirDetalhe={
          abrirDetalhe
        }

        onAlterarStatus={
          alterarStatus
        }

        onAdicionarComentario={
          adicionarComentario
        }
      />
    )
  }

  // ==========================================================
  // MINHAS DEMANDAS
  // ==========================================================

  if (
    pagina ===
    'minhas-demandas'
  ) {
    return (
      <MinhasDemandas
        usuario={
          usuarioAtual!
        }

        demandas={
          demandas
        }

        onVoltar={
          realizarLogout
        }

        onAbrirDetalhe={
          abrirDetalhe
        }

        onAlterarStatus={
          alterarStatus
        }

        onAdicionarComentario={
          adicionarComentario
        }
      />
    )
  }

  // ==========================================================
  // ADMINISTRAÇÃO
  // ==========================================================

  if (
    pagina ===
      'administracao' &&
    (
      sessao.perfil ===
        'Gestor/Administrador' ||
      sessao.perfil ===
        'Gestor'
    )
  ) {
    return (
      <Administracao
        usuarioAtual={usuarioAtual!}

        onVoltar={() =>
          setPagina('dashboard')
        }

        onFeriados={() =>
          setPagina('feriados')
        }

        onDashboard={() =>
          setPagina('dashboard')
        }

        onTodasDemandas={() =>
          setPagina('todas-demandas')
        }

        onNovaDemanda={abrirNovaDemanda}

        onClientes={abrirClientes}

        onResponsaveis={abrirResponsaveis}

        onRelatorios={abrirRelatorios}

        onConfiguracoes={() =>
          setPagina('administracao')
        }

        onSair={realizarLogout}
      />
    )
  }

  // ==========================================================
  // FERIADOS
  // ==========================================================

  if (
    pagina ===
    'feriados'
  ) {
    return (
      <Feriados
        onVoltar={() =>
          setPagina(
            'dashboard'
          )
        }

        nomeUsuario={nomeUsuarioAtual}
        perfilUsuario={sessao.perfil || 'Gestor/Administrador'}
        onDashboard={() => setPagina('dashboard')}
        onTodasDemandas={() => setPagina('todas-demandas')}
        onNovaDemanda={abrirNovaDemanda}
        onClientes={abrirClientes}
        onResponsaveis={abrirResponsaveis}
        onFeriados={abrirFeriados}
        onRelatorios={abrirRelatorios}
        onConfiguracoes={() => setPagina('administracao')}
        onLogout={realizarLogout}
      />
    )
  }

  // ==========================================================
  // TODAS AS DEMANDAS
  // ==========================================================

  if (
    pagina ===
    'todas-demandas'
  ) {
    return (
      <TodasDemandas
        demandas={
          demandas
        }

        onVoltar={() =>
          setPagina(
            'dashboard'
          )
        }

        onNovaDemanda={() =>
          setPagina(
            'nova-demanda'
          )
        }

        onAlterarStatus={
          alterarStatus
        }

        onAlterarStatusEmMassa={
          alterarStatusEmMassa
        }

        onAbrirDetalhe={
          abrirDetalhe
        }

        nomeUsuario={nomeUsuarioAtual}
        perfilUsuario={sessao.perfil || 'Gestor/Administrador'}
        onDashboard={() => setPagina('dashboard')}
        onTodasDemandas={() => setPagina('todas-demandas')}
        onClientes={abrirClientes}
        onResponsaveis={abrirResponsaveis}
        onFeriados={abrirFeriados}
        onRelatorios={abrirRelatorios}
        onConfiguracoes={() => setPagina('administracao')}
        onLogout={realizarLogout}
      />
    )
  }

  // ==========================================================
  // NOVA DEMANDA
  // ==========================================================

  if (
    pagina ===
    'nova-demanda'
  ) {
    return (
      <NovaDemanda
        clientes={
          clientesCadastrados
        }

        sistemas={
          sistemasCadastrados
        }

        tipos={
          tiposCadastrados
        }

        analistas={
          analistasAtivos
        }

        onVoltar={() =>
          setPagina(
            'todas-demandas'
          )
        }

        onSalvar={
          salvarDemanda
        }

        nomeUsuario={nomeUsuarioAtual}
        perfilUsuario={sessao.perfil || 'Gestor/Administrador'}
        onDashboard={() => setPagina('dashboard')}
        onTodasDemandas={() => setPagina('todas-demandas')}
        onNovaDemanda={abrirNovaDemanda}
        onClientes={abrirClientes}
        onResponsaveis={abrirResponsaveis}
        onFeriados={abrirFeriados}
        onRelatorios={abrirRelatorios}
        onConfiguracoes={() => setPagina('administracao')}
        onLogout={realizarLogout}
      />
    )
  }

  // ==========================================================
  // DETALHE DA DEMANDA
  // ==========================================================

  if (
    pagina ===
      'detalhe-demanda' &&
    demandaSelecionada
  ) {
    return (
      <DetalheDemandaPage
        demanda={
          demandaSelecionada
        }

        onVoltar={
          voltarParaDemandas
        }

        onAlterarStatus={
          alterarStatus
        }

        onAlterarResponsavel={
          alterarResponsavel
        }

        onAdicionarComentario={
          adicionarComentario
        }

        onAdicionarArquivo={
          adicionarArquivo
        }

        nomeUsuario={nomeUsuarioAtual}
        perfilUsuarioGlobal={sessao.perfil || 'Gestor/Administrador'}

        onDashboard={() =>
          setPagina(
            'dashboard'
          )
        }

        onTodasDemandas={() =>
          setPagina(
            'todas-demandas'
          )
        }

        onNovaDemanda={
          abrirNovaDemanda
        }

        onClientes={
          abrirClientes
        }

        onResponsaveis={
          abrirResponsaveis
        }

        onFeriados={
          abrirFeriados
        }

        onRelatorios={
          abrirRelatorios
        }

        onConfiguracoes={() =>
          setPagina(
            'administracao'
          )
        }

        onLogout={
          realizarLogout
        }

        perfilUsuario={
          sessao.perfil
        }

        analistas={
          analistasAtivos
        }

        onAlterarPrioridade={
          alterarPrioridade
        }

        onAlterarPrazoManual={
          alterarPrazoManual
        }

        onReabrirDemanda={
          reabrirDemanda
        }

        onCancelarDemanda={
          cancelarDemanda
        }
      />
    )
  }

  // ==========================================================
  // CLIENTES
  // ==========================================================

  if (pagina === 'clientes') {
    return (
      <Clientes
        onVoltar={() => setPagina('dashboard')}
        nomeUsuario={nomeUsuarioAtual}
        perfilUsuario={sessao.perfil || 'Gestor/Administrador'}
        onDashboard={() => setPagina('dashboard')}
        onTodasDemandas={() => setPagina('todas-demandas')}
        onNovaDemanda={() => setPagina('nova-demanda')}
        onClientes={abrirClientes}
        onResponsaveis={abrirResponsaveis}
        onFeriados={abrirFeriados}
        onRelatorios={abrirRelatorios}
        onConfiguracoes={() => setPagina('administracao')}
        onLogout={realizarLogout}
      />
    )
  }

  // ==========================================================
  // RESPONSÁVEIS / ANALISTAS
  // ==========================================================

  if (pagina === 'responsaveis') {
    return (
      <Responsaveis
        onVoltar={() => setPagina('dashboard')}
        nomeUsuario={nomeUsuarioAtual}
        perfilUsuario={sessao.perfil || 'Gestor/Administrador'}
        onDashboard={() => setPagina('dashboard')}
        onTodasDemandas={() => setPagina('todas-demandas')}
        onNovaDemanda={() => setPagina('nova-demanda')}
        onClientes={abrirClientes}
        onResponsaveis={abrirResponsaveis}
        onFeriados={abrirFeriados}
        onRelatorios={abrirRelatorios}
        onConfiguracoes={() => setPagina('administracao')}
        onLogout={realizarLogout}
      />
    )
  }

  // ==========================================================
  // RELATÓRIOS
  // ==========================================================

  if (pagina === 'relatorios') {
    return (
      <Relatorios
        onVoltar={() => setPagina('dashboard')}
        nomeUsuario={nomeUsuarioAtual}
        perfilUsuario={sessao.perfil || 'Gestor/Administrador'}
        onDashboard={() => setPagina('dashboard')}
        onTodasDemandas={() => setPagina('todas-demandas')}
        onNovaDemanda={() => setPagina('nova-demanda')}
        onClientes={abrirClientes}
        onResponsaveis={abrirResponsaveis}
        onFeriados={abrirFeriados}
        onRelatorios={abrirRelatorios}
        onConfiguracoes={() => setPagina('administracao')}
        onLogout={realizarLogout}
      />
    )
  }

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (
    <div
      style={{
        position:
          'relative',

        minHeight:
          '100vh',
      }}
    >
      <Dashboard
        usuarioAtual={usuarioAtual!}
        onLogout={
          realizarLogout
        }

        onTodasDemandas={() =>
          setPagina(
            'todas-demandas'
          )
        }

        onNovaDemanda={
          abrirNovaDemanda
        }

        onClientes={
          abrirClientes
        }

        onResponsaveis={
          abrirResponsaveis
        }

        onFeriados={
          abrirFeriados
        }

        onRelatorios={
          abrirRelatorios
        }

        onConfiguracoes={() =>
          setPagina(
            'administracao'
          )
        }
      />

    </div>
  )
}

export default App