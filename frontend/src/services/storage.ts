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

import { apiRequest } from './api'

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

function lerLista<T>(chave: string): T[] {
  const valor = ler<unknown>(chave, [])
  return Array.isArray(valor) ? (valor as T[]) : []
}

function salvar<T>(chave: string, valor: T) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    console.warn(`Não foi possível salvar ${chave}.`)
  }
}

function ordenarPorNome<T extends { nome: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )
}

export function carregarDemandas(): Demanda[] {
  return lerLista<Demanda>(STORAGE_KEYS.demandas)
}

export function salvarDemandas(demandas: Demanda[]) {
  salvar(STORAGE_KEYS.demandas, demandas)
}


// ============================================================
// NORMALIZAÇÃO DA ESTRUTURA ORGANIZACIONAL
// ============================================================

function normalizarEstruturaOrganizacional(usuario: Usuario): Usuario {
  const estrutura = usuario.estruturaOrganizacional

  // Diretor(a) representa toda a DDS, mesmo quando o registro recebido
  // ainda não possui o objeto de estrutura organizacional preenchido.
  // Não deve possuir Gerência ou Divisão específica.
  if (usuario.perfil === 'Diretor (a)') {
    return {
      ...usuario,
      estruturaOrganizacional: {
        diretoriaSigla: 'DDS',
        diretoriaNome: 'Diretoria de Desenvolvimento de Sistemas',
      },
    }
  }

  if (!estrutura) {
    return usuario
  }

  const divisaoAnterior = String(
    estrutura.divisaoNome || ''
  ).trim()

  const mapaDivisoes: Record<
    string,
    {
      gerenciaSigla: 'GNS' | 'GES' | 'GTI'
      gerenciaNome: string
      divisaoNome: DivisaoOrganizacional
    }
  > = {
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

  if (!atualizada) {
    return usuario
  }

  const estruturaNova = {
    ...estrutura,

    diretoriaSigla: 'DDS' as const,

    diretoriaNome:
      'Diretoria de Desenvolvimento de Sistemas' as const,

    gerenciaSigla: atualizada.gerenciaSigla,

    gerenciaNome: atualizada.gerenciaNome,

    divisaoNome: atualizada.divisaoNome,
  }

  return {
    ...usuario,
    estruturaOrganizacional:
      estruturaNova as Usuario['estruturaOrganizacional'],
  }
}


// ============================================================
// USUÁRIOS
// ============================================================

export function carregarUsuarios(): Usuario[] {
  // O PostgreSQL é a fonte oficial dos usuários.
  // O localStorage é somente um cache, sem criação automática de contas.
  const usuarios = lerLista<Usuario>(STORAGE_KEYS.usuarios)
  const normalizados = usuarios.map(normalizarEstruturaOrganizacional)

  const houveMudanca = normalizados.some(
    (item, index) =>
      JSON.stringify(item.estruturaOrganizacional) !==
      JSON.stringify(usuarios[index]?.estruturaOrganizacional)
  )

  if (houveMudanca) {
    salvar(STORAGE_KEYS.usuarios, normalizados)
  }

  return ordenarPorNome(normalizados)
}

export function salvarUsuarios(
  usuarios: Usuario[]
) {
  salvar(
    STORAGE_KEYS.usuarios,
    ordenarPorNome(usuarios)
  )
}


// ============================================================
// CLIENTES
// ============================================================

export function carregarClientes(): Cliente[] {
  // Não cria clientes fictícios no navegador. Os registros vêm do PostgreSQL.
  return ordenarPorNome(lerLista<Cliente>(STORAGE_KEYS.clientes))
}

export function salvarClientes(
  clientes: Cliente[]
) {
  salvar(
    STORAGE_KEYS.clientes,
    ordenarPorNome(clientes)
  )
}


// ============================================================
// SISTEMAS
// ============================================================

export function carregarSistemas(): Sistema[] {
  // Não cria sistemas fictícios no navegador. Os registros vêm do PostgreSQL.
  return ordenarPorNome(lerLista<Sistema>(STORAGE_KEYS.sistemas))
}

export function salvarSistemas(
  sistemas: Sistema[]
) {
  salvar(
    STORAGE_KEYS.sistemas,
    ordenarPorNome(sistemas)
  )
}


// ============================================================
// TIPOS DE DEMANDA
// ============================================================

export function carregarTipos(): TipoDemanda[] {
  // Não cria tipos fictícios no navegador. Os registros vêm do PostgreSQL.
  return ordenarPorNome(lerLista<TipoDemanda>(STORAGE_KEYS.tipos))
}

export function salvarTipos(
  tipos: TipoDemanda[]
) {
  salvar(
    STORAGE_KEYS.tipos,
    ordenarPorNome(tipos)
  )
}


// ============================================================
// NOTIFICAÇÕES
// ============================================================

export function carregarNotificacoes(): Notificacao[] {
  return lerLista<Notificacao>(STORAGE_KEYS.notificacoes)
}

export function salvarNotificacoes(
  notificacoes: Notificacao[]
) {
  salvar(
    STORAGE_KEYS.notificacoes,
    notificacoes
  )

  /*
   * O cache local mantém compatibilidade com
   * as telas atuais.
   *
   * O PostgreSQL mantém a lista compartilhada
   * por usuário.
   */
  void apiRequest<Notificacao[]>(
    '/notificacoes',
    {
      method: 'PUT',
      body: JSON.stringify(
        notificacoes
      ),
    }
  ).catch((erro) => {
    console.error(
      'Não foi possível sincronizar as notificações com o PostgreSQL:',
      erro
    )
  })
}


// ============================================================
// AUDITORIA
// ============================================================

export function carregarAuditoria(): RegistroAuditoria[] {
  return lerLista<RegistroAuditoria>(STORAGE_KEYS.auditoria)
}

export function salvarAuditoria(
  registros: RegistroAuditoria[]
) {
  salvar(
    STORAGE_KEYS.auditoria,
    registros
  )
}


// ============================================================
// SESSÃO
// ============================================================

export type SessaoUsuario = {
  usuarioId: number
  nome: string
  perfil: PerfilUsuario
  login: string
}

export function carregarSessao(): SessaoUsuario | null {
  return ler<SessaoUsuario | null>(
    STORAGE_KEYS.sessao,
    null
  )
}

export function salvarSessao(
  sessao: SessaoUsuario
) {
  salvar(
    STORAGE_KEYS.sessao,
    sessao
  )
}

export function limparSessao() {
  localStorage.removeItem(
    STORAGE_KEYS.sessao
  )
}