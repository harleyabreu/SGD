// ============================================================
// GESTÃO DE DEMANDAS DE TI
// TYPES — MODELO CENTRAL DE DADOS
// ============================================================

export type PerfilUsuario =
  | 'Gestor/Administrador'
  | 'Analista'

export type StatusUsuario =
  | 'Ativo'
  | 'Inativo'

// ============================================================
// COMENTÁRIOS
// ============================================================

export type Comentario = {
  id: number
  texto: string
  usuario: string
  data: string
}

// ============================================================
// ARQUIVOS / ANEXOS
// ============================================================

export type Arquivo = {
  id: number
  nome: string
  tamanho: number
  data: string
  usuario: string
  url: string
}

// ============================================================
// HISTÓRICO DA DEMANDA
// ============================================================

export type Historico = {
  id: number
  tipo: string
  titulo: string
  descricao: string
  data: string
  usuario: string
  referenciaId?: number
  valorAnterior?: string
  valorNovo?: string
  motivo?: string
}

// ============================================================
// PERÍODO DE PENDÊNCIA
// ============================================================

export type PeriodoPendencia = {
  inicio: string
  fim?: string
  motivo: string
}

// ============================================================
// USUÁRIO
// ============================================================

export type Usuario = {
  id: number
  nome: string
  login: string
  email: string
  telefone?: string
  perfil: PerfilUsuario
  status: StatusUsuario
  criadoEm: string
  atualizadoEm?: string
  ultimoAcesso?: string
}

// ============================================================
// CLIENTE / ÓRGÃO
// ============================================================

export type Cliente = {
  id: number
  nome: string
  sigla?: string
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

// ============================================================
// SISTEMA
// ============================================================

export type Sistema = {
  id: number
  nome: string
  clienteId?: number
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

// ============================================================
// TIPO DE DEMANDA
// ============================================================

export type TipoDemanda = {
  id: number
  nome: string
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

// ============================================================
// NOTIFICAÇÃO
// ============================================================

export type Notificacao = {
  id: string
  tipo:
    | 'alerta'
    | 'informativo'
    | 'critico'
    | 'preventivo'
  titulo: string
  descricao: string
  data: string
  demandaId?: number
  prioridade?: string
  lida: boolean
}

// ============================================================
// ENTIDADES DA AUDITORIA
// ============================================================
//
// Este tipo é utilizado pelo serviço central de auditoria
// para garantir que todas as entidades auditáveis utilizem
// os mesmos valores oficiais.
//

export type EntidadeAuditoria =
  | 'demanda'
  | 'usuario'
  | 'cliente'
  | 'sistema'
  | 'tipo'
  | 'feriado'
  | 'sessao'

// ============================================================
// REGISTRO DE AUDITORIA
// ============================================================

export type RegistroAuditoria = {
  id: number

  entidade: EntidadeAuditoria

  entidadeId?: number

  acao: string

  descricao: string

  usuario: string

  data: string

  valorAnterior?: string

  valorNovo?: string

  motivo?: string
}

// ============================================================
// DEMANDA
// ============================================================

export type Demanda = {
  id: number

  titulo: string

  descricao: string

  cliente: string

  sistema?: string

  tipo?: string

  responsavel: string

  prioridade: string

  prazo: string

  observacao: string

  status: string

  dataAbertura?: string

  dataConclusao?: string

  usuarioCriacao?: string

  usuarioConclusao?: string

  dataReabertura?: string

  usuarioReabertura?: string

  prazoDiasUteis?: number

  prazoManual?: boolean

  periodosPendencia?: PeriodoPendencia[]

  comentarios?: Comentario[]

  arquivos?: Arquivo[]

  historico?: Historico[]
}

// ============================================================
// STATUS OFICIAIS DA DEMANDA
// ============================================================

export const STATUS_DEMANDA = [
  'Nova',
  'Aguardando',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
  'Cancelada',
] as const

// ============================================================
// PRIORIDADES OFICIAIS
// ============================================================

export const PRIORIDADES_DEMANDA = [
  'Crítica',
  'Alta',
  'Média',
  'Baixa',
] as const

// ============================================================
// TIPOS OFICIAIS DE DEMANDA
// ============================================================

export const TIPOS_DEMANDA = [
  'Erro/Incidente',
  'Correção',
  'Solicitação',
  'Melhoria',
  'Nova Funcionalidade',
  'Dúvida/Orientação',
  'Manutenção',
] as const