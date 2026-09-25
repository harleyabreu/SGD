// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — MODELO CENTRAL DE DADOS
// ============================================================

export type PerfilUsuario = 'Gestor/Administrador' | 'Analista'
export type StatusUsuario = 'Ativo' | 'Inativo'

export type Comentario = {
  id: number
  texto: string
  usuario: string
  data: string
}

export type Arquivo = {
  id: number
  nome: string
  tamanho: number
  data: string
  usuario: string
  url: string
}

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

export type PeriodoPendencia = {
  inicio: string
  fim?: string
  motivo: string
}

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

export type Cliente = {
  id: number
  nome: string
  sigla?: string
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

export type Sistema = {
  id: number
  nome: string
  clienteId?: number
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

export type TipoDemanda = {
  id: number
  nome: string
  ativo: boolean
  criadoEm: string
  atualizadoEm?: string
}

export type Notificacao = {
  id: string
  tipo: 'alerta' | 'informativo' | 'critico' | 'preventivo'
  titulo: string
  descricao: string
  data: string
  demandaId?: number
  prioridade?: string
  lida: boolean
}

export type RegistroAuditoria = {
  id: number
  entidade: 'demanda' | 'usuario' | 'cliente' | 'sistema' | 'tipo' | 'feriado' | 'sessao' | 'configuracao'
  entidadeId?: number
  acao: string
  descricao: string
  usuario: string
  data: string
  valorAnterior?: string
  valorNovo?: string
  motivo?: string
}

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

export const STATUS_DEMANDA = [
  'Nova',
  'Aguardando',
  'Em Atendimento',
  'Com Pendências',
  'Concluída',
  'Cancelada',
] as const

export const PRIORIDADES_DEMANDA = [
  'Crítica',
  'Alta',
  'Média',
  'Baixa',
] as const

export const TIPOS_DEMANDA = [
  'Erro/Incidente',
  'Correção',
  'Solicitação',
  'Melhoria',
  'Nova Funcionalidade',
  'Dúvida/Orientação',
  'Manutenção',
] as const
