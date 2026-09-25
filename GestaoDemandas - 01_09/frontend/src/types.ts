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
}

export type Demanda = {
  id: number
  titulo: string
  descricao: string
  cliente: string
  responsavel: string
  prioridade: string
  prazo: string
  observacao: string
  status: string

  comentarios?: Comentario[]
  arquivos?: Arquivo[]
  historico?: Historico[]
}