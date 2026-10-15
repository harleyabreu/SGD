// ============================================================







// GESTÃO DE DEMANDAS DE TI







// V2.9 — NOVA DEMANDA / MENU PRINCIPAL







// ============================================================















import { useMemo, useState, type FormEvent } from 'react'







import type { Demanda, Usuario } from '../types'







import { diasPrazoPorCriticidade, diasPrazoPorPrioridadeAtendimento, diasSLACombinado, PRIORIDADES_ATENDIMENTO } from '../sla'







import './NovaDemanda.css'







import MenuPrincipal from '../components/MenuPrincipal'



import { mostrarToast } from '../services/toast'















type CadastroItem = {







  id?: number







  nome?: string







  sigla?: string







  descricao?: string







  status?: string







  ativo?: boolean







  clienteId?: number







}















type NovaDemandaProps = {







  clientes: CadastroItem[]







  sistemas: CadastroItem[]







  tipos: CadastroItem[]







  analistas: Usuario[]







  onVoltar: () => void







  onSalvar: (demanda: Omit<Demanda, 'id' | 'status'>) => void















  nomeUsuario: string







  perfilUsuario: string







  onDashboard: () => void







  onTodasDemandas: () => void







  onNovaDemanda: () => void







  onClientes: () => void







  onResponsaveis: () => void







  onFeriados: () => void







  onRelatorios: () => void







  onConfiguracoes?: () => void







  onLogout: () => void







}















const CRITICIDADES = ['Crítica', 'Alta', 'Média', 'Baixa']















function textoItem(item: CadastroItem): string {







  return String(item.nome || item.descricao || '')







}


function classePrioridadeAtendimento(prioridade: string): string {
  if (prioridade.startsWith('P1')) return 'prioridade-p1'
  if (prioridade.startsWith('P2')) return 'prioridade-p2'
  if (prioridade.startsWith('P3')) return 'prioridade-p3'
  if (prioridade.startsWith('P4')) return 'prioridade-p4'
  return ''
}

function corPrioridadeAtendimento(prioridade: string): string {
  if (prioridade.startsWith('P1')) return '#7f1d1d'
  if (prioridade.startsWith('P2')) return '#dc2626'
  if (prioridade.startsWith('P3')) return '#1d4ed8'
  if (prioridade.startsWith('P4')) return '#15803d'
  return '#0f172a'
}















export default function NovaDemanda({







  clientes,







  sistemas,







  tipos,







  analistas,







  onVoltar,







  onSalvar,







  nomeUsuario,







  perfilUsuario,







  onDashboard,







  onTodasDemandas,







  onNovaDemanda,







  onClientes,







  onResponsaveis,







  onFeriados,







  onRelatorios,







  onConfiguracoes,







  onLogout,







}: NovaDemandaProps) {







  const [clienteSelecionado, setClienteSelecionado] = useState('')







  const [sistemaSelecionado, setSistemaSelecionado] = useState('')

  const [criticidadeSelecionada, setCriticidadeSelecionada] = useState('')

  const [prioridadeSelecionada, setPrioridadeSelecionada] = useState('')















  const clienteObjetoSelecionado = useMemo(







    () =>







      clientes.find(







        (item) =>







          textoItem(item) === clienteSelecionado







      ),







    [clientes, clienteSelecionado]







  )















  const sistemasAtivos = useMemo(







    () =>







      sistemas.filter(







        (item) =>







          item.status !== 'Inativo' &&







          item.ativo !== false







      ),







    [sistemas]







  )















  const sistemasFiltrados = useMemo(() => {







    if (!clienteObjetoSelecionado?.id) {







      return sistemasAtivos







    }















    const vinculados = sistemasAtivos.filter(







      (item) =>







        item.clienteId === clienteObjetoSelecionado.id







    )















    return vinculados.length > 0







      ? vinculados







      : sistemasAtivos







  }, [sistemasAtivos, clienteObjetoSelecionado])















  function handleSubmit(event: FormEvent<HTMLFormElement>) {















    event.preventDefault()















    const formData = new FormData(event.currentTarget)















    const demanda: Omit<Demanda, 'id' | 'status'> = {







      titulo: String(formData.get('titulo') || '').trim(),







      descricao: String(formData.get('descricao') || '').trim(),







      cliente: String(formData.get('cliente') || '').trim(),







      sistema: String(formData.get('sistema') || '').trim(),







      tipo: String(formData.get('tipo') || '').trim(),







      responsavel: String(formData.get('responsavel') || '').trim(),







      criticidade: String(formData.get('criticidade') || '').trim(),

      prioridade: String(formData.get('criticidade') || '').trim(), // Compatibilidade com telas e demandas antigas.

      prioridadeAtendimento: String(formData.get('prioridadeAtendimento') || '').trim(),







      prazo: '',







      observacao: String(formData.get('observacao') || '').trim(),







      comentarios: [],







      arquivos: [],







      historico: [],







    }















    if (







      !demanda.titulo ||







      !demanda.descricao ||







      !demanda.cliente ||







      !demanda.sistema ||







      !demanda.tipo ||







      !demanda.criticidade ||

      !demanda.prioridadeAtendimento







    ) {







      alert('Preencha Todos Os Campos Obrigatórios.')







      return







    }















    if (







      clienteObjetoSelecionado?.id







    ) {







      const sistemasVinculados =







        sistemasAtivos.filter(







          (item) =>







            item.clienteId === clienteObjetoSelecionado.id







        )















      if (







        sistemasVinculados.length > 0 &&







        !sistemasVinculados.some(







          (item) =>







            textoItem(item) === demanda.sistema







        )







      ) {







        alert(







          'Selecione Um Sistema Vinculado Ao Cliente / Órgão Informado.'







        )







        return







      }







    }















    onSalvar(demanda)



    mostrarToast('Demanda Cadastrada com Sucesso.')







  }















  return (







    <MenuPrincipal







      ativo="nova-demanda"







      nomeUsuario={nomeUsuario}







      perfilUsuario={perfilUsuario}







      onDashboard={onDashboard}







      onTodasDemandas={onTodasDemandas}







      onNovaDemanda={onNovaDemanda}







      onClientes={onClientes}







      onResponsaveis={onResponsaveis}







      onFeriados={onFeriados}







      onRelatorios={onRelatorios}







      onConfiguracoes={onConfiguracoes}







      onSair={onLogout}







      subtitulo="Nova Demanda"







      rodapeAcoes={







        <>







          <button







            type="button"







            className="btn-secundario"







            onClick={onVoltar}







          >







            ← Voltar Para Todas As Demandas







          </button>















          <div className="nova-demanda-acoes-direita">







            <button







              type="button"







              className="btn-secundario"







              onClick={onVoltar}







            >







              Cancelar







            </button>















            <button







              type="submit"







              form="nova-demanda-form"







              className="btn-principal"







            >







              + Cadastrar Demanda







            </button>







          </div>







        </>







      }







    >







      <div className="nova-demanda-page">







        <div className="nova-demanda-header">







          <div>







            <h1>Nova Demanda</h1>







            <p>







              Cadastre Uma Nova Demanda De TI.







              O Prazo Será Calculado Automaticamente Em Dias Úteis.







            </p>







          </div>







        </div>















        <div className="formulario-demanda">







          <form id="nova-demanda-form" onSubmit={handleSubmit}>







            <div className="formulario-titulo">







              <h2>Dados Da Demanda</h2>







              <p>







                Informe Os Dados Necessários Para Registrar E Classificar A Demanda.







              </p>







            </div>















            <div className="campo">







              <label htmlFor="cliente">Cliente / Órgão *</label>







              <select







                id="cliente"







                name="cliente"







                value={clienteSelecionado}







                onChange={(event) => {







                  setClienteSelecionado(event.target.value)







                  setSistemaSelecionado('')







                }}







              >







                <option value="">Selecione...</option>







                {clientes







                  .filter((item) => item.status !== 'Inativo' && item.ativo !== false)







                  .map((cliente, index) => {







                    const valor = textoItem(cliente)







                    return (







                      <option key={cliente.id ?? `${valor}-${index}`} value={valor}>







                        {cliente.sigla ? `${cliente.sigla} — ${valor}` : valor}







                      </option>







                    )







                  })}







              </select>







            </div>















            <div className="formulario-grid">







              <div className="campo">







                <label htmlFor="sistema">Sistema *</label>







                <select







                  id="sistema"







                  name="sistema"







                  value={sistemaSelecionado}







                  onChange={(event) =>







                    setSistemaSelecionado(event.target.value)







                  }







                  disabled={!clienteSelecionado}







                >







                  <option value="">







                    {clienteSelecionado







                      ? 'Selecione...'







                      : 'Selecione...'}







                  </option>







                  {sistemasFiltrados.map((sistema, index) => {







                    const valor = textoItem(sistema)







                    return (







                      <option key={sistema.id ?? `${valor}-${index}`} value={valor}>







                        {valor}







                      </option>







                    )







                  })}







                </select>







              </div>















              <div className="campo">







                <label htmlFor="tipo">Tipo Da Demanda *</label>







                <select id="tipo" name="tipo" defaultValue="">







                  <option value="">Selecione...</option>







                  {tipos







                    .filter((item) => item.status !== 'Inativo' && item.ativo !== false)







                    .map((tipo, index) => {







                      const valor = textoItem(tipo)







                      return (







                        <option key={tipo.id ?? `${valor}-${index}`} value={valor}>







                          {valor}







                        </option>







                      )







                    })}







                </select>







              </div>







            </div>















            <div className="campo">







              <label htmlFor="titulo">Título Da Demanda *</label>







              <input







                id="titulo"







                name="titulo"







                type="text"







                placeholder="Digite Um Título Curto E Objetivo"







                maxLength={150}







              />







            </div>















            <div className="campo">







              <label htmlFor="descricao">Descrição *</label>







              <textarea







                id="descricao"







                name="descricao"







                rows={6}







                placeholder="Descreva Detalhadamente A Demanda..."







              />







            </div>















            <section className="classificacao-demanda-card">

              <div className="classificacao-demanda-heading">

                <div className="classificacao-demanda-icon" aria-hidden="true">◆</div>

                <div>

                  <h3>Classificação da Demanda</h3>

                  <p>Informe o impacto e a urgência para definir o prazo de atendimento.</p>

                </div>

              </div>

              <div className="classificacao-demanda-grid">







                            <div className="campo">

                <label htmlFor="criticidade">Criticidade *</label>

                <select

                  id="criticidade"

                  name="criticidade"

                  value={criticidadeSelecionada}

                  onChange={(event) => setCriticidadeSelecionada(event.target.value)}

                  required

                >

                  <option value="">Selecione...</option>

                  {CRITICIDADES.map((criticidade) => (

                    <option key={criticidade} value={criticidade}>{criticidade}</option>

                  ))}

                </select>

                <small className="classificacao-ajuda">Impacto caso a demanda não seja resolvida.</small>

              </div>



              <div className="campo">

                <label htmlFor="prioridadeAtendimento">Prioridade de Atendimento *</label>

                <select

                  id="prioridadeAtendimento"

                  name="prioridadeAtendimento"

                  className={`prioridade-atendimento-select ${classePrioridadeAtendimento(prioridadeSelecionada)}`}

                  style={{ color: corPrioridadeAtendimento(prioridadeSelecionada) }}

                  value={prioridadeSelecionada}

                  onChange={(event) => setPrioridadeSelecionada(event.target.value)}

                  required

                >

                  <option value="" style={{ color: '#0f172a' }}>Selecione...</option>

                  {PRIORIDADES_ATENDIMENTO.map((prioridade) => (

                    <option

                      key={prioridade}

                      value={prioridade}

                      className={classePrioridadeAtendimento(prioridade)}

                      style={{ color: corPrioridadeAtendimento(prioridade) }}

                    >

                      {prioridade}

                    </option>

                  ))}

                </select>

                <small className="classificacao-ajuda">Urgência com que a equipe deve iniciar o atendimento.</small>

              </div>

              </div>

            </section>



            <div className="formulario-grid">















              <div className="campo">







                <label htmlFor="responsavel">Responsável</label>







                <select id="responsavel" name="responsavel" defaultValue="">







                  <option value="">







                    Selecione...







                  </option>







                  {analistas







                    .filter((usuario) => usuario.status === 'Ativo')







                    .map((usuario) => (







                      <option key={usuario.id} value={usuario.nome}>







                        {usuario.nome}







                      </option>







                    ))}







                </select>







              </div>







            </div>















            <div







              className="campo sla-resumo-card"







              style={{







                padding: '12px 14px',







                border: '1px solid #dce5ef',







                borderRadius: '8px',







                background: '#f7f9fc',







              }}







            >







              <label style={{ marginBottom: '4px' }}>







                Prazo / SLA







              </label>







              <strong style={{ color: '#174f86', fontSize: '13px' }}>







                Calculado Automaticamente Após O Cadastro







              </strong>







              <small className="sla-resumo-texto">

                {criticidadeSelecionada && prioridadeSelecionada ? (

                  <>

                    Prazo estimado: <strong>{diasSLACombinado(criticidadeSelecionada, prioridadeSelecionada)} dias úteis</strong>.

                    O sistema utiliza o menor prazo entre a Criticidade ({diasPrazoPorCriticidade(criticidadeSelecionada)} dias) e a Prioridade ({diasPrazoPorPrioridadeAtendimento(prioridadeSelecionada)} dias).

                  </>

                ) : (

                  'Selecione a Criticidade e a Prioridade de Atendimento para visualizar o prazo estimado.'

                )}

                {' '}Finais de semana e feriados cadastrados não são contabilizados.

              </small>







            </div>















            <div className="campo">







              <label htmlFor="observacao">Observações</label>







              <textarea







                id="observacao"







                name="observacao"







                rows={3}







                placeholder="Digite Alguma Observação, Se Necessário..."







              />







            </div>















            <div className="formulario-acoes">







              <button type="submit" className="btn-salvar">







                + Cadastrar Demanda







              </button>







            </div>







          </form>







        </div>







      </div>







    </MenuPrincipal>







  )















}
