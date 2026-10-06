// ============================================================
// GESTÃO DE DEMANDAS DE TI
// V2.1 — PERSISTÊNCIA CENTRAL
// ============================================================

import type {
  Cliente,
  Demanda,
  DivisaoOrganizacional,
  Notificacao,
  PerfilUsuario,
  RegistroAuditoria,
  Sistema,
  TipoDemanda,
  Usuario,
} from '../types'

export const STORAGE_KEYS = {
  demandas: 'demandas',
  usuarios: 'usuarios',
  clientes: 'clientes',
  sistemas: 'sistemas',
  tipos: 'tiposDemanda',
  notificacoes: 'notificacoes',
  auditoria: 'auditoria',
  sessao: 'sessao',
  feriados: 'feriados',
} as const

function ler<T>(chave: string, padrao: T): T {
  try {
    const valor = localStorage.getItem(chave)
    return valor ? (JSON.parse(valor) as T) : padrao
  } catch {
    return padrao
  }
}

function salvar<T>(chave: string, valor: T) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    console.warn(`Não foi possível salvar ${chave}.`)
  }
}

export function carregarDemandas(): Demanda[] {
  return ler<Demanda[]>(STORAGE_KEYS.demandas, [])
}

export function salvarDemandas(demandas: Demanda[]) {
  salvar(STORAGE_KEYS.demandas, demandas)
}

function normalizarEstruturaOrganizacional(usuario: Usuario): Usuario {
  const estrutura = usuario.estruturaOrganizacional
  if (!estrutura) return usuario

  const divisaoAnterior = String(estrutura.divisaoNome || '').trim()

  const mapaDivisoes: Record<string, { gerenciaSigla: 'GNS' | 'GES' | 'GTI'; gerenciaNome: string; divisaoNome: DivisaoOrganizacional }> = {
    'Divisão de Sistemas Corporativos': {
      gerenciaSigla: 'GNS',
      gerenciaNome: 'Gerência de Negócios de Sistemas',
      divisaoNome: 'Divisão de Sistemas Corporativos (DSC)',
    },
    'Divisão de Sistemas Corporativos (DSC)': {
      gerenciaSigla: 'GNS',
      gerenciaNome: 'Gerência de Negócios de Sistemas',
      divisaoNome: 'Divisão de Sistemas Corporativos (DSC)',
    },
    'Divisão de Sistemas Específicos': {
      gerenciaSigla: 'GNS',
      gerenciaNome: 'Gerência de Negócios de Sistemas',
      divisaoNome: 'Divisão de Sistemas Específicos (DSE)',
    },
    'Divisão de Sistemas Específicos (DSE)': {
      gerenciaSigla: 'GNS',
      gerenciaNome: 'Gerência de Negócios de Sistemas',
      divisaoNome: 'Divisão de Sistemas Específicos (DSE)',
    },
    'Divisão de Controle e Qualidade': {
      gerenciaSigla: 'GNS',
      gerenciaNome: 'Gerência de Negócios de Sistemas',
      divisaoNome: 'Divisão de Controle e Qualidade (DCQ)',
    },
    'Divisão de Controle e Qualidade (DCQ)': {
      gerenciaSigla: 'GNS',
      gerenciaNome: 'Gerência de Negócios de Sistemas',
      divisaoNome: 'Divisão de Controle e Qualidade (DCQ)',
    },
    'Divisão de Projeto e Configuração': {
      gerenciaSigla: 'GES',
      gerenciaNome: 'Gerência de Engenharia de Sistemas',
      divisaoNome: 'Divisão de Projeto e Configuração (DPC)',
    },
    'Divisão de Projeto e Configuração (DPC)': {
      gerenciaSigla: 'GES',
      gerenciaNome: 'Gerência de Engenharia de Sistemas',
      divisaoNome: 'Divisão de Projeto e Configuração (DPC)',
    },
    'Divisão de Construção e Sistemas': {
      gerenciaSigla: 'GES',
      gerenciaNome: 'Gerência de Engenharia de Sistemas',
      divisaoNome: 'Divisão de Construção e Sistemas (DCS)',
    },
    'Divisão de Construção e Sistemas (DCS)': {
      gerenciaSigla: 'GES',
      gerenciaNome: 'Gerência de Engenharia de Sistemas',
      divisaoNome: 'Divisão de Construção e Sistemas (DCS)',
    },
    'Divisão de Projetos e Inovação': {
      gerenciaSigla: 'GTI',
      gerenciaNome: 'Gerência de Tecnologia da Informação',
      divisaoNome: 'Divisão de Projetos e Inovação (DPI)',
    },
    'Divisão de Projetos e Inovação (DPI)': {
      gerenciaSigla: 'GTI',
      gerenciaNome: 'Gerência de Tecnologia da Informação',
      divisaoNome: 'Divisão de Projetos e Inovação (DPI)',
    },
    'Divisão de Ferramentas de Apoio': {
      gerenciaSigla: 'GTI',
      gerenciaNome: 'Gerência de Tecnologia da Informação',
      divisaoNome: 'Divisão de Ferramentas de Apoio (DFA)',
    },
    'Divisão de Ferramentas de Apoio (DFA)': {
      gerenciaSigla: 'GTI',
      gerenciaNome: 'Gerência de Tecnologia da Informação',
      divisaoNome: 'Divisão de Ferramentas de Apoio (DFA)',
    },
  }

  const atualizada = mapaDivisoes[divisaoAnterior]
  if (!atualizada) return usuario

  const estruturaNova = {
    ...estrutura,
    diretoriaSigla: 'DDS' as const,
    diretoriaNome: 'Diretoria de Desenvolvimento de Sistemas' as const,
    gerenciaSigla: atualizada.gerenciaSigla,
    gerenciaNome: atualizada.gerenciaNome,
    divisaoNome: atualizada.divisaoNome,
  }

  return { ...usuario, estruturaOrganizacional: estruturaNova as Usuario['estruturaOrganizacional'] }
}

export function carregarUsuarios(): Usuario[] {
  const usuarios = ler<Usuario[]>(STORAGE_KEYS.usuarios, [])

  if (usuarios.length > 0) {
    const normalizados = usuarios.map(normalizarEstruturaOrganizacional)
    const houveMudanca = normalizados.some((item, index) =>
      JSON.stringify(item.estruturaOrganizacional) !== JSON.stringify(usuarios[index]?.estruturaOrganizacional)
    )
    if (houveMudanca) salvar(STORAGE_KEYS.usuarios, normalizados)
    return normalizados
  }

  const agora = new Date().toISOString()
  const inicial: Usuario = {
    id: 1,
    nome: 'Lorenna Góes',
    login: 'lorenna.goes',
    email: 'lorenna.goes@prodepa.pa.gov.br',
    telefone: '',
    perfil: 'Gestor/Administrador',
    status: 'Ativo',
    criadoEm: agora,
  }

  salvar(STORAGE_KEYS.usuarios, [inicial])
  return [inicial]
}

export function salvarUsuarios(usuarios: Usuario[]) {
  salvar(STORAGE_KEYS.usuarios, usuarios)
}

export function carregarClientes(): Cliente[] {
  const clientes = ler<Cliente[]>(STORAGE_KEYS.clientes, [])
  if (clientes.length > 0) return clientes

  const agora = new Date().toISOString()
  const iniciais: Cliente[] = [
    ['SEFA', 'SEFA'],
    ['PRODEPA', 'PRODEPA'],
    ['CGE', 'CGE'],
    ['SEDUC', 'SEDUC'],
    ['SEPLAD', 'SEPLAD'],
    ['SESPA', 'SESPA'],
  ].map(([nome, sigla], index) => ({
    id: index + 1,
    nome,
    sigla,
    ativo: true,
    criadoEm: agora,
  }))

  salvar(STORAGE_KEYS.clientes, iniciais)
  return iniciais
}

export function salvarClientes(clientes: Cliente[]) {
  salvar(STORAGE_KEYS.clientes, clientes)
}

export function carregarSistemas(): Sistema[] {
  const sistemas = ler<Sistema[]>(STORAGE_KEYS.sistemas, [])
  if (sistemas.length > 0) return sistemas

  const agora = new Date().toISOString()
  const iniciais: Sistema[] = [
    'Sistema de Contratos',
    'Portal da Transparência',
    'SIAFE',
    'Sistema de Demandas de TI',
  ].map((nome, index) => ({
    id: index + 1,
    nome,
    ativo: true,
    criadoEm: agora,
  }))

  salvar(STORAGE_KEYS.sistemas, iniciais)
  return iniciais
}

export function salvarSistemas(sistemas: Sistema[]) {
  salvar(STORAGE_KEYS.sistemas, sistemas)
}

export function carregarTipos(): TipoDemanda[] {
  const tipos = ler<TipoDemanda[]>(STORAGE_KEYS.tipos, [])
  if (tipos.length > 0) return tipos

  const agora = new Date().toISOString()
  const iniciais: TipoDemanda[] = [
    'Erro/Incidente',
    'Correção',
    'Solicitação',
    'Melhoria',
    'Nova Funcionalidade',
    'Dúvida/Orientação',
    'Manutenção',
  ].map((nome, index) => ({
    id: index + 1,
    nome,
    ativo: true,
    criadoEm: agora,
  }))

  salvar(STORAGE_KEYS.tipos, iniciais)
  return iniciais
}

export function salvarTipos(tipos: TipoDemanda[]) {
  salvar(STORAGE_KEYS.tipos, tipos)
}

export function carregarNotificacoes(): Notificacao[] {
  return ler<Notificacao[]>(STORAGE_KEYS.notificacoes, [])
}

export function salvarNotificacoes(notificacoes: Notificacao[]) {
  salvar(STORAGE_KEYS.notificacoes, notificacoes)
}

export function carregarAuditoria(): RegistroAuditoria[] {
  return ler<RegistroAuditoria[]>(STORAGE_KEYS.auditoria, [])
}

export function salvarAuditoria(registros: RegistroAuditoria[]) {
  salvar(STORAGE_KEYS.auditoria, registros)
}

export type SessaoUsuario = {
  usuarioId: number
  nome: string
  perfil: PerfilUsuario
  login: string
}

export function carregarSessao(): SessaoUsuario | null {
  return ler<SessaoUsuario | null>(STORAGE_KEYS.sessao, null)
}

export function salvarSessao(sessao: SessaoUsuario) {
  salvar(STORAGE_KEYS.sessao, sessao)
}

export function limparSessao() {
  localStorage.removeItem(STORAGE_KEYS.sessao)
}