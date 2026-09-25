// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.4 — SERVIÇO CENTRAL DE AUDITORIA
// ============================================================
//
// Regras:
// - Registros não devem ser apagados pela interface.
// - Registros não devem ser editados pelo usuário.
// - Toda ação relevante deve possuir usuário e data/hora.
// - Alterações importantes devem guardar valor anterior,
//   valor novo e motivo quando aplicável.
// ============================================================

import type {
  EntidadeAuditoria,
  RegistroAuditoria,
} from '../types'

import {
  carregarAuditoria,
  salvarAuditoria,
} from './storage'

// ============================================================
// GERAR ID
// ============================================================

function gerarId(): number {
  return (
    Date.now() +
    Math.floor(
      Math.random() * 100000
    )
  )
}

// ============================================================
// DATA/HORA
// ============================================================

function agoraISO(): string {
  return new Date().toISOString()
}

// ============================================================
// REGISTRAR AUDITORIA
// ============================================================

export function registrarAuditoria(
  registro: Omit<
    RegistroAuditoria,
    'id' | 'data'
  >
): RegistroAuditoria {
  const novaAuditoria: RegistroAuditoria =
    {
      ...registro,

      id: gerarId(),

      data: agoraISO(),
    }

  const registros =
    carregarAuditoria()

  salvarAuditoria([
    novaAuditoria,
    ...registros,
  ])

  return novaAuditoria
}

// ============================================================
// REGISTRAR ALTERAÇÃO
// ============================================================

export function registrarAlteracao(
  entidade: EntidadeAuditoria,
  entidadeId: number | undefined,
  acao: string,
  descricao: string,
  usuario: string,
  opcoes?: {
    valorAnterior?: string
    valorNovo?: string
    motivo?: string
  }
): RegistroAuditoria {
  return registrarAuditoria({
    entidade,

    entidadeId,

    acao,

    descricao,

    usuario,

    valorAnterior:
      opcoes?.valorAnterior,

    valorNovo:
      opcoes?.valorNovo,

    motivo:
      opcoes?.motivo,
  })
}

// ============================================================
// REGISTRAR CRIAÇÃO
// ============================================================

export function registrarCriacao(
  entidade: EntidadeAuditoria,
  entidadeId: number | undefined,
  descricao: string,
  usuario: string
): RegistroAuditoria {
  return registrarAuditoria({
    entidade,

    entidadeId,

    acao: 'criacao',

    descricao,

    usuario,
  })
}

// ============================================================
// REGISTRAR EXCLUSIVAMENTE STATUS
// ============================================================

export function registrarAlteracaoStatus(
  entidadeId: number,
  statusAnterior: string,
  statusNovo: string,
  usuario: string,
  motivo?: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'status',
    `Status alterado de "${statusAnterior}" para "${statusNovo}".`,
    usuario,
    {
      valorAnterior:
        statusAnterior,

      valorNovo:
        statusNovo,

      motivo,
    }
  )
}

// ============================================================
// REGISTRAR DISTRIBUIÇÃO
// ============================================================

export function registrarDistribuicao(
  entidadeId: number,
  analistaAnterior: string,
  analistaNovo: string,
  usuario: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'redistribuicao',
    `Demanda redistribuída de "${analistaAnterior || 'Sem Analista'}" para "${analistaNovo || 'Sem Analista'}".`,
    usuario,
    {
      valorAnterior:
        analistaAnterior ||
        'Sem Analista',

      valorNovo:
        analistaNovo ||
        'Sem Analista',
    }
  )
}

// ============================================================
// REGISTRAR PRIORIDADE
// ============================================================

export function registrarAlteracaoPrioridade(
  entidadeId: number,
  prioridadeAnterior: string,
  prioridadeNova: string,
  usuario: string,
  motivo?: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'prioridade',
    `Prioridade alterada de "${prioridadeAnterior}" para "${prioridadeNova}".`,
    usuario,
    {
      valorAnterior:
        prioridadeAnterior,

      valorNovo:
        prioridadeNova,

      motivo,
    }
  )
}

// ============================================================
// REGISTRAR PRAZO MANUAL
// ============================================================

export function registrarAlteracaoPrazo(
  entidadeId: number,
  prazoAnterior: string,
  prazoNovo: string,
  usuario: string,
  motivo: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'prazo_manual',
    `Prazo alterado de "${prazoAnterior}" para "${prazoNovo}".`,
    usuario,
    {
      valorAnterior:
        prazoAnterior,

      valorNovo:
        prazoNovo,

      motivo,
    }
  )
}

// ============================================================
// REGISTRAR PENDÊNCIA
// ============================================================

export function registrarEntradaPendencia(
  entidadeId: number,
  motivo: string,
  usuario: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'pendencia_entrada',
    'Demanda colocada em Com Pendências.',
    usuario,
    {
      motivo,
    }
  )
}

// ============================================================
// REGISTRAR RETOMADA
// ============================================================

export function registrarSaidaPendencia(
  entidadeId: number,
  usuario: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'pendencia_saida',
    'Demanda retomou o atendimento após período de pendência.',
    usuario
  )
}

// ============================================================
// REGISTRAR CONCLUSÃO
// ============================================================

export function registrarConclusao(
  entidadeId: number,
  usuario: string,
  comentario?: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'conclusao',
    'Demanda concluída.',
    usuario,
    {
      motivo:
        comentario,
    }
  )
}

// ============================================================
// REGISTRAR REABERTURA
// ============================================================

export function registrarReabertura(
  entidadeId: number,
  usuario: string,
  motivo: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'reabertura',
    'Demanda reaberta pelo Gestor.',
    usuario,
    {
      motivo,
    }
  )
}

// ============================================================
// REGISTRAR CANCELAMENTO
// ============================================================

export function registrarCancelamento(
  entidadeId: number,
  usuario: string,
  motivo: string
): RegistroAuditoria {
  return registrarAlteracao(
    'demanda',
    entidadeId,
    'cancelamento',
    'Demanda cancelada.',
    usuario,
    {
      motivo,
    }
  )
}

// ============================================================
// CONSULTAR AUDITORIA
// ============================================================

export function listarAuditoria(): RegistroAuditoria[] {
  return carregarAuditoria()
}

// ============================================================
// CONSULTAR AUDITORIA DE UMA ENTIDADE
// ============================================================

export function listarAuditoriaDaEntidade(
  entidade: EntidadeAuditoria,
  entidadeId: number
): RegistroAuditoria[] {
  return carregarAuditoria().filter(
    (item) =>
      item.entidade === entidade &&
      item.entidadeId === entidadeId
  )
}