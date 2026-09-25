import { useState } from 'react'

import Dashboard from './pages/Dashboard'
import TodasDemandas from './pages/TodasDemandas'
import NovaDemanda from './pages/NovaDemanda'
import DetalheDemanda from './pages/DetalheDemanda'

import type {
  Demanda,
  Comentario,
  Arquivo,
} from './types'


function App() {

  const [pagina, setPagina] =
    useState('dashboard')

  const [demandaSelecionada, setDemandaSelecionada] =
    useState<Demanda | null>(null)


  const [demandas, setDemandas] =
    useState<Demanda[]>(() => {

      const salvas =
        localStorage.getItem('demandas')

      if (salvas) {
        try {
          return JSON.parse(salvas)
        } catch {
          return []
        }
      }

      return []
    })


  /*
   * =========================================================
   * SALVAR TODAS AS DEMANDAS
   * =========================================================
   */

  function salvarDemandas(
    demandasAtualizadas: Demanda[]
  ) {

    setDemandas(
      demandasAtualizadas
    )

    localStorage.setItem(
      'demandas',
      JSON.stringify(
        demandasAtualizadas
      )
    )
  }


  /*
   * =========================================================
   * CADASTRAR NOVA DEMANDA
   * =========================================================
   */

  function salvarDemanda(
    demanda: Omit<
      Demanda,
      'id' | 'status'
    >
  ) {

    const agora =
      Date.now()


    const novaDemanda: Demanda = {

      ...demanda,

      id: agora,

      status: 'Nova',

      comentarios: [],

      arquivos: [],

      historico: [
        {
          id: agora,

          tipo: 'cadastro',

          titulo:
            'Demanda cadastrada',

          descricao:
            'Registro inicial da demanda.',

          data:
            new Date().toISOString(),

          usuario:
            'Usuário atual',
        },
      ],
    }


    salvarDemandas([
      ...demandas,
      novaDemanda,
    ])


    setPagina(
      'todas-demandas'
    )
  }


  /*
   * =========================================================
   * ALTERAR STATUS
   * =========================================================
   */

  function alterarStatus(
    id: number,
    novoStatus: string
  ) {

    const demandasAtualizadas =
      demandas.map(
        (demanda) => {

          if (
            demanda.id !== id
          ) {
            return demanda
          }

          return {
            ...demanda,
            status: novoStatus,
          }
        }
      )


    salvarDemandas(
      demandasAtualizadas
    )


    if (
      demandaSelecionada &&
      demandaSelecionada.id === id
    ) {

      setDemandaSelecionada({
        ...demandaSelecionada,
        status: novoStatus,
      })
    }
  }


  /*
   * =========================================================
   * ALTERAR RESPONSÁVEL
   * =========================================================
   */

  function alterarResponsavel(
    id: number,
    novoResponsavel: string
  ) {

    const demandasAtualizadas =
      demandas.map(
        (demanda) => {

          if (
            demanda.id !== id
          ) {
            return demanda
          }

          return {
            ...demanda,
            responsavel:
              novoResponsavel,
          }
        }
      )


    salvarDemandas(
      demandasAtualizadas
    )


    if (
      demandaSelecionada &&
      demandaSelecionada.id === id
    ) {

      setDemandaSelecionada({
        ...demandaSelecionada,
        responsavel:
          novoResponsavel,
      })
    }
  }


  /*
   * =========================================================
   * ADICIONAR COMENTÁRIO
   * =========================================================
   */

  function adicionarComentario(
    id: number,
    texto: string
  ) {

    const novoComentario:
      Comentario = {

      id: Date.now(),

      texto,

      usuario:
        'Usuário atual',

      data:
        new Date().toISOString(),
    }


    setDemandas(
      (atuais) => {

        const atualizadas =
          atuais.map(
            (demanda) => {

              if (
                demanda.id !== id
              ) {
                return demanda
              }

              return {

                ...demanda,

                comentarios: [
                  ...(demanda.comentarios || []),
                  novoComentario,
                ],

              }
            }
          )


        localStorage.setItem(
          'demandas',
          JSON.stringify(
            atualizadas
          )
        )


        return atualizadas
      }
    )


    setDemandaSelecionada(
      (atual) => {

        if (
          !atual ||
          atual.id !== id
        ) {
          return atual
        }


        return {

          ...atual,

          comentarios: [
            ...(atual.comentarios || []),
            novoComentario,
          ],

        }
      }
    )
  }


  /*
   * =========================================================
   * ADICIONAR ARQUIVO
   * =========================================================
   */

  function adicionarArquivo(
    id: number,
    arquivo: Arquivo
  ) {

    setDemandas(
      (atuais) => {

        const atualizadas =
          atuais.map(
            (demanda) => {

              if (
                demanda.id !== id
              ) {
                return demanda
              }

              return {

                ...demanda,

                arquivos: [
                  ...(demanda.arquivos || []),
                  arquivo,
                ],

              }
            }
          )


        localStorage.setItem(
          'demandas',
          JSON.stringify(
            atualizadas
          )
        )


        return atualizadas
      }
    )


    setDemandaSelecionada(
      (atual) => {

        if (
          !atual ||
          atual.id !== id
        ) {
          return atual
        }


        return {

          ...atual,

          arquivos: [
            ...(atual.arquivos || []),
            arquivo,
          ],

        }
      }
    )
  }


  /*
   * =========================================================
   * ABRIR DETALHE
   * =========================================================
   */

  function abrirDetalhe(
    demanda: Demanda
  ) {

    setDemandaSelecionada(
      demanda
    )

    setPagina(
      'detalhe-demanda'
    )
  }


  /*
   * =========================================================
   * VOLTAR PARA TODAS AS DEMANDAS
   * =========================================================
   */

  function voltarParaDemandas() {

    setDemandaSelecionada(
      null
    )

    setPagina(
      'todas-demandas'
    )
  }


  /*
   * =========================================================
   * TODAS AS DEMANDAS
   * =========================================================
   */

  if (
    pagina === 'todas-demandas'
  ) {

    return (

      <TodasDemandas

        demandas={
          demandas
        }

        onVoltar={() =>
          setPagina(
            'dashboard'
          )
        }

        onNovaDemanda={() =>
          setPagina(
            'nova-demanda'
          )
        }

        onAlterarStatus={
          alterarStatus
        }

        onAbrirDetalhe={
          abrirDetalhe
        }

      />

    )
  }


  /*
   * =========================================================
   * NOVA DEMANDA
   * =========================================================
   */

  if (
    pagina === 'nova-demanda'
  ) {

    return (

      <NovaDemanda

        onVoltar={() =>
          setPagina(
            'todas-demandas'
          )
        }

        onSalvar={
          salvarDemanda
        }

      />

    )
  }


  /*
   * =========================================================
   * DETALHE DA DEMANDA
   * =========================================================
   */

  if (
    pagina === 'detalhe-demanda' &&
    demandaSelecionada
  ) {

    return (

      <DetalheDemanda

        demanda={
          demandaSelecionada
        }

        onVoltar={
          voltarParaDemandas
        }

        onAlterarStatus={
          alterarStatus
        }

        onAlterarResponsavel={
          alterarResponsavel
        }

        onAdicionarComentario={
          adicionarComentario
        }

        onAdicionarArquivo={
          adicionarArquivo
        }

      />

    )
  }


  /*
   * =========================================================
   * DASHBOARD
   * =========================================================
   */

  return (

    <Dashboard

      onLogout={() => {
        console.log(
          'Logout'
        )
      }}

      onTodasDemandas={() =>
        setPagina(
          'todas-demandas'
        )
      }

    />

  )
}


export default App