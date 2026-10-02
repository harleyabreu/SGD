import { useEffect, useState } from 'react'
import {
  assinarToast,
  fecharToast,
  type ToastMensagem,
  type ToastTipo,
} from '../services/toast'
import './ToastGlobal.css'

const CONFIGURACOES: Record<
  ToastTipo,
  { icone: string; titulo: string; classe: string }
> = {
  sucesso: {
    icone: '✓',
    titulo: 'Sucesso',
    classe: 'toast-global-sucesso',
  },
  erro: {
    icone: '×',
    titulo: 'Erro',
    classe: 'toast-global-erro',
  },
  aviso: {
    icone: '!',
    titulo: 'Atenção',
    classe: 'toast-global-aviso',
  },
  informacao: {
    icone: 'i',
    titulo: 'Informação',
    classe: 'toast-global-informacao',
  },
}

export default function ToastGlobal() {
  const [toast, setToast] = useState<ToastMensagem | null>(null)

  useEffect(() => assinarToast(setToast), [])

  if (!toast) return null

  const config = CONFIGURACOES[toast.tipo]

  return (
    <div
      className={`toast-global ${config.classe}`}
      role={toast.tipo === 'erro' ? 'alert' : 'status'}
      aria-live={toast.tipo === 'erro' ? 'assertive' : 'polite'}
    >
      <span
        className="toast-global-icone"
        aria-hidden="true"
      >
        {config.icone}
      </span>

      <div className="toast-global-conteudo">
        <strong>{config.titulo}</strong>
        <span>{toast.mensagem}</span>
      </div>

      <button
        type="button"
        className="toast-global-fechar"
        onClick={fecharToast}
        aria-label="Fechar mensagem"
      >
        ×
      </button>
    </div>
  )
}
