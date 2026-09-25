import { type FormEvent } from 'react'
import './NovaDemanda.css'

type NovaDemanda = {
  titulo: string
  descricao: string
  cliente: string
  responsavel: string
  prioridade: string
  prazo: string
  observacao: string
}

type NovaDemandaProps = {
  onVoltar: () => void
  onSalvar: (demanda: NovaDemanda) => void
}

function NovaDemanda({
  onVoltar,
  onSalvar,
}: NovaDemandaProps) {

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)

    const demanda: NovaDemanda = {
      titulo: String(formData.get('titulo') || ''),
      descricao: String(formData.get('descricao') || ''),
      cliente: String(formData.get('cliente') || ''),
      responsavel: String(formData.get('responsavel') || ''),
      prioridade: String(formData.get('prioridade') || ''),
      prazo: String(formData.get('prazo') || ''),
      observacao: String(formData.get('observacao') || ''),
    }

    if (
      !demanda.titulo ||
      !demanda.descricao ||
      !demanda.cliente ||
      !demanda.responsavel ||
      !demanda.prioridade ||
      !demanda.prazo
    ) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }

    onSalvar(demanda)
  }

  return (
    <div className="nova-demanda-page">

      <button
        className="btn-voltar"
        onClick={onVoltar}
        type="button"
      >
        ← Voltar para Todas as Demandas
      </button>

      <div className="nova-demanda-header">
        <div>
          <h1>Nova Demanda</h1>
          <p>Cadastre uma nova demanda de TI.</p>
        </div>
      </div>

      <div className="formulario-demanda">

        <form onSubmit={handleSubmit}>

          <div className="formulario-titulo">
            <h2>Dados da Demanda</h2>
            <p>
              Preencha as informações abaixo para cadastrar a demanda.
            </p>
          </div>

          <div className="campo">
            <label htmlFor="titulo">
              Título da demanda *
            </label>

            <input
              id="titulo"
              name="titulo"
              type="text"
              placeholder="Digite o título da demanda"
            />
          </div>

          <div className="campo">
            <label htmlFor="descricao">
              Descrição *
            </label>

            <textarea
              id="descricao"
              name="descricao"
              rows={5}
              placeholder="Descreva detalhadamente a demanda..."
            />
          </div>

          <div className="formulario-grid">

            <div className="campo">
              <label htmlFor="cliente">
                Cliente *
              </label>

              <select
                id="cliente"
                name="cliente"
                defaultValue=""
              >
                <option value="">
                  Selecione o cliente
                </option>

                <option value="Cliente 1">
                  Cliente 1
                </option>

                <option value="Cliente 2">
                  Cliente 2
                </option>

                <option value="Cliente 3">
                  Cliente 3
                </option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="responsavel">
                Responsável *
              </label>

              <select
                id="responsavel"
                name="responsavel"
                defaultValue=""
              >
                <option value="">
                  Selecione o responsável
                </option>

                <option value="Responsável 1">
                  Responsável 1
                </option>

                <option value="Responsável 2">
                  Responsável 2
                </option>

                <option value="Responsável 3">
                  Responsável 3
                </option>
              </select>
            </div>

          </div>

          <div className="formulario-grid">

            <div className="campo">
              <label htmlFor="prioridade">
                Prioridade *
              </label>

              <select
                id="prioridade"
                name="prioridade"
                defaultValue=""
              >
                <option value="">
                  Selecione a prioridade
                </option>

                <option value="Baixa">
                  Baixa
                </option>

                <option value="Média">
                  Média
                </option>

                <option value="Alta">
                  Alta
                </option>

                <option value="Urgente">
                  Urgente
                </option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="prazo">
                Prazo *
              </label>

              <input
                id="prazo"
                name="prazo"
                type="date"
              />
            </div>

          </div>

          <div className="campo">
            <label htmlFor="observacao">
              Observações
            </label>

            <textarea
              id="observacao"
              name="observacao"
              rows={3}
              placeholder="Digite alguma observação, se necessário..."
            />
          </div>

          <div className="formulario-acoes">

            <button
              type="button"
              className="btn-cancelar"
              onClick={onVoltar}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-salvar"
            >
              + Cadastrar Demanda
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}

export default NovaDemanda