export type ToastTipo = 'sucesso' | 'erro' | 'aviso' | 'informacao'

export type ToastMensagem = {
  id: number
  tipo: ToastTipo
  mensagem: string
  duracao: number
}

type Listener = (toast: ToastMensagem | null) => void

let contadorId = 0
let toastAtual: ToastMensagem | null = null
let temporizador: number | null = null
const listeners = new Set<Listener>()

function notificarListeners() {
  listeners.forEach((listener) => listener(toastAtual))
}

export function mostrarToast(
  mensagem: string,
  tipo: ToastTipo = 'sucesso',
  duracao = 3200,
) {
  const texto = mensagem.trim()

  if (!texto) return

  if (temporizador !== null && typeof window !== 'undefined') {
    window.clearTimeout(temporizador)
    temporizador = null
  }

  toastAtual = {
    id: ++contadorId,
    tipo,
    mensagem: texto,
    duracao,
  }

  notificarListeners()

  if (typeof window !== 'undefined' && duracao > 0) {
    const id = toastAtual.id

    temporizador = window.setTimeout(() => {
      if (toastAtual?.id === id) {
        toastAtual = null
        notificarListeners()
      }

      temporizador = null
    }, duracao)
  }
}

export function fecharToast() {
  if (temporizador !== null && typeof window !== 'undefined') {
    window.clearTimeout(temporizador)
    temporizador = null
  }

  toastAtual = null
  notificarListeners()
}

export function obterToastAtual() {
  return toastAtual
}

export function assinarToast(listener: Listener) {
  listeners.add(listener)
  listener(toastAtual)

  return () => {
    listeners.delete(listener)
  }
}

export const toastSucesso = (mensagem: string, duracao?: number) =>
  mostrarToast(mensagem, 'sucesso', duracao)

export const toastErro = (mensagem: string, duracao?: number) =>
  mostrarToast(mensagem, 'erro', duracao)

export const toastAviso = (mensagem: string, duracao?: number) =>
  mostrarToast(mensagem, 'aviso', duracao)

export const toastInformacao = (mensagem: string, duracao?: number) =>
  mostrarToast(mensagem, 'informacao', duracao)
