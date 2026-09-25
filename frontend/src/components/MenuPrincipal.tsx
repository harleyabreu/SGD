import { useMemo, useState, type ReactNode } from 'react'
import type { Usuario } from '../types'

/**
 * ============================================================
 * GESTÃO DE DEMANDAS DE TI
 * MENU PRINCIPAL — V1.0
 * ============================================================
 *
 * Componente único responsável por:
 * - Barra lateral
 * - Cabeçalho superior
 * - Identificação do sistema
 * - Usuário logado / perfil
 * - Notificações
 * - Botão Sair
 * - Navegação principal
 * - Dimensões, espaçamentos, fontes e cores do shell
 *
 * As telas devem apenas fornecer o conteúdo em {children}.
 * Assim, alterações futuras no Menu Principal refletem em todo
 * o sistema sem precisar editar cada tela individualmente.
 * ============================================================
 */

export type MenuItem =
  | 'dashboard'
  | 'minhas-demandas'
  | 'nova-demanda'
  | 'todas-demandas'
  | 'clientes'
  | 'responsaveis'
  | 'feriados'
  | 'relatorios'
  | 'configuracoes'

type Props = {
  usuarioAtual?: Usuario
  nomeUsuario?: string
  perfilUsuario?: string

  /** Conteúdo específico da tela. */
  children: ReactNode

  /** Item que ficará destacado na barra lateral. */
  ativo?: MenuItem

  /** Navegação dos itens do menu. */
  onDashboard?: () => void
  onMinhasDemandas?: () => void
  onNovaDemanda?: () => void
  onTodasDemandas?: () => void
  onClientes?: () => void
  onResponsaveis?: () => void
  onFeriados?: () => void
  onRelatorios?: () => void
  onConfiguracoes?: () => void
  onMinhaConta?: () => void

  /** Ação do botão Sair. */
  onSair: () => void

  /** Texto secundário exibido no cabeçalho. */
  subtitulo?: string

  /** Opcional: quantidade exibida no sino. */
  notificacoes?: number
  notificacoesConteudo?: ReactNode

  /** Ações opcionais exibidas na barra fixa inferior do shell. */
  rodapeAcoes?: ReactNode
}

const ESTILOS = `
  .gd-menu-shell,
  .gd-menu-shell * {
    box-sizing: border-box;
  }

  .gd-menu-shell {
    --gd-sidebar-width: 240px;
    --gd-header: 72px;

    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    background: var(--gd-background);
    color: var(--gd-text);
    font-family: var(--gd-font-family);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .gd-menu-shell button {
    font: inherit;
  }

  /* ============================================================
     SIDEBAR
     ============================================================ */

  .gd-sidebar {
    position: fixed;
    z-index: 1100;
    top: 0;
    left: 0;
    bottom: 0;

    width: var(--gd-sidebar-width);
    height: 100vh;

    display: flex;
    flex-direction: column;

    padding: var(--gd-header) 12px 18px;

    overflow-y: auto;
    overflow-x: hidden;

    background: var(--gd-sidebar);
    color: var(--gd-text-white);

    box-shadow: 4px 0 18px rgba(15, 23, 42, 0.08);
  }

  .gd-sidebar-brand {
    position: absolute;
    top: 0;
    left: 0;

    width: 100%;
    height: var(--gd-header);

    display: flex;
    align-items: center;

    padding: 0 18px;
    gap: 10px;

    background: var(--gd-sidebar-dark);
    color: var(--gd-text-white);
  }

  .gd-sidebar-brand-icon {
    width: 28px;
    height: 28px;
    flex: 0 0 auto;

    display: flex;
    align-items: center;
    justify-content: center;

    color: var(--gd-text-white);
    font-size: 16px;
  }

  .gd-sidebar-brand strong {
    display: block;
    max-width: 170px;

    color: var(--gd-text-white);
    font-size: 14px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .gd-sidebar-nav {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
  }

  .gd-nav-section {
    margin: 14px 10px 5px;

    color: #8fa6bd;
    font-size: 9px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .gd-nav-button {
    position: relative;

    width: 100%;
    min-height: 36px;

    display: flex;
    align-items: center;
    gap: 10px;

    padding: 0 11px;

    border: 0;
    border-radius: 8px;

    background: transparent;
    color: #d9e5f0;

    font-family: inherit;
    font-size: 11px;
    line-height: 1;
    font-weight: 600;

    text-align: left;
    cursor: pointer;

    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .gd-nav-button:hover {
    background: rgba(255, 255, 255, 0.07);
    color: var(--gd-text-white);
  }

  .gd-nav-button.active {
    background: var(--gd-primary);
    color: var(--gd-text-white);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
  }

  .gd-nav-icon {
    width: 22px;
    min-width: 22px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    color: inherit;
    font-size: 20px;
    line-height: 1;
    font-weight: 700;
  }

  .gd-sidebar-footer {
    margin-top: auto;
    padding: 16px 8px 2px;

    display: flex;
    flex-direction: column;
    gap: 2px;

    color: #7f98b1;
    font-size: 8px;
    line-height: 1.2;
  }

  .gd-sidebar-footer strong {
    margin-bottom: 2px;
    color: var(--gd-text-white);
    font-size: 10px;
    font-weight: 700;
  }

  /* ============================================================
     ÁREA PRINCIPAL / HEADER
     ============================================================ */

  .gd-main {
    width: calc(100% - var(--gd-sidebar-width));
    min-height: 100vh;
    margin-left: var(--gd-sidebar-width);
    background: var(--gd-background);
  }

  .gd-topbar {
    position: sticky;
    top: 0;
    z-index: 900;

    width: 100%;
    height: var(--gd-header);

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;

    padding: 0 24px;

    background: var(--gd-surface);
    border-bottom: 1px solid var(--gd-border);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  }

  .gd-topbar-left {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 12px;
  }

  .gd-menu-toggle {
    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;
    border: 0;
    border-radius: 7px;

    background: transparent;
    color: var(--gd-text-muted);

    font-size: 16px;
    cursor: pointer;
  }

  .gd-menu-toggle:hover {
    background: #f1f5f9;
    color: var(--gd-primary);
  }

  .gd-system-title {
    margin: 0;
    color: var(--gd-text);

    font-size: 16px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .gd-system-subtitle {
    margin: 3px 0 0;
    color: var(--gd-text-muted);
    font-size: 10px;
    line-height: 1.2;
  }

  .gd-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .gd-notification {
    position: relative;

    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: 1px solid var(--gd-border);
    border-radius: 50%;

    background: var(--gd-surface);
    color: var(--gd-text-secondary);

    font-size: 15px;
    cursor: pointer;
  }

  .gd-notification:hover {
    background: var(--gd-background);
    color: var(--gd-primary);
  }

  .gd-notification-badge {
    position: absolute;
    top: -3px;
    right: -2px;

    min-width: 15px;
    height: 15px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0 3px;

    border: 2px solid #ffffff;
    border-radius: 999px;

    background: var(--gd-danger);
    color: var(--gd-text-white);

    font-size: 8px;
    line-height: 1;
    font-weight: 700;
  }

  .gd-notification-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 390px;
    max-width: calc(100vw - 28px);
    max-height: 520px;
    overflow: auto;
    background: var(--gd-surface);
    border: 1px solid var(--gd-border);
    border-radius: 12px;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14);
    z-index: 1300;
  }

  .gd-notification-panel .notificacoes-cabecalho {
    padding: 15px 16px;
    border-bottom: 1px solid var(--gd-border);
  }

  .gd-notification-panel .notificacoes-lista {
    max-height: 470px;
    overflow-y: auto;
  }


  /* ============================================================
     CENTRAL DE NOTIFICAÇÕES GLOBAL — TODAS AS TELAS
     ============================================================ */

  .gd-global-notification-content {
    width: 100%;
    overflow: hidden;
    background: var(--gd-surface);
    color: var(--gd-text);
  }

  .gd-global-notification-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 15px 16px;
    border-bottom: 1px solid var(--gd-border);
  }

  .gd-global-notification-header > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .gd-global-notification-header strong {
    color: var(--gd-text);
    font-size: 14px;
    line-height: 1.2;
    font-weight: 700;
  }

  .gd-global-notification-header small {
    color: var(--gd-text-muted);
    font-size: 10px;
    line-height: 1.2;
  }

  .gd-global-notification-mark-all {
    border: 0;
    background: transparent;
    color: var(--gd-primary);
    padding: 4px 0;
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .gd-global-notification-mark-all:hover {
    color: var(--gd-primary-dark);
    text-decoration: underline;
  }

  .gd-global-notification-list {
    max-height: 470px;
    overflow-y: auto;
  }

  .gd-global-notification-empty {
    min-height: 180px;
    padding: 25px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 7px;
    color: var(--gd-text-muted);
  }

  .gd-global-notification-empty > span {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--gd-success-light);
    color: var(--gd-success);
    font-size: 16px;
    font-weight: 800;
  }

  .gd-global-notification-empty strong {
    color: var(--gd-text-secondary);
    font-size: 12px;
  }

  .gd-global-notification-empty small {
    max-width: 250px;
    color: var(--gd-text-muted);
    line-height: 1.45;
    font-size: 10px;
  }

  .gd-global-notification-item {
    width: 100%;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 8px;
    align-items: start;
    gap: 10px;
    padding: 13px 15px;

    border: 0;
    border-bottom: 1px solid #eef2f6;

    background: var(--gd-surface);
    color: var(--gd-text);

    font-family: inherit;
    text-align: left;
    cursor: pointer;

    transition:
      background 0.15s ease,
      opacity 0.15s ease;
  }

  .gd-global-notification-item:hover {
    background: var(--gd-background);
  }

  .gd-global-notification-item.nao-lida {
    background: #f5f9fd;
  }

  .gd-global-notification-item.nao-lida:hover {
    background: #edf5fc;
  }

  .gd-global-notification-icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #eef3f8;
    font-size: 15px;
    line-height: 1;
  }

  .gd-global-notification-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .gd-global-notification-body strong {
    color: #243b53;
    font-size: 11px;
    line-height: 1.25;
    font-weight: 700;
  }

  .gd-global-notification-body > span {
    color: var(--gd-text-secondary);
    font-size: 10px;
    line-height: 1.4;
  }

  .gd-global-notification-body small {
    color: #94a3b8;
    font-size: 9px;
    line-height: 1.25;
  }

  .gd-global-notification-dot {
    width: 7px;
    height: 7px;
    margin-top: 4px;
    border-radius: 50%;
    background: var(--gd-primary);
  }

  .gd-global-notification-atrasada .gd-global-notification-icon {
    background: var(--gd-danger-light);
  }

  .gd-global-notification-prazo .gd-global-notification-icon {
    background: var(--gd-warning-light);
  }

  .gd-global-notification-responsavel .gd-global-notification-icon {
    background: var(--gd-primary-light);
  }

  .gd-global-notification-concluida .gd-global-notification-icon {
    background: var(--gd-success-light);
  }

  .gd-global-notification-cancelada .gd-global-notification-icon {
    background: var(--gd-danger-light);
  }

  .gd-global-notification-reaberta .gd-global-notification-icon {
    background: var(--gd-primary-light);
  }

  .gd-global-notification-footer {
    padding: 9px 16px;
    border-top: 1px solid #e2e8f0;
    color: var(--gd-text-muted);
    font-size: 9px;
    line-height: 1.3;
  }

  .gd-global-notification-channel {
    padding: 8px 16px;
    border-top: 1px solid #f1f5f9;
    color: #94a3b8;
    font-size: 8px;
    line-height: 1.2;
  }

  .gd-user {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .gd-user-avatar {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;

    background: var(--gd-primary);
    color: var(--gd-text-white);

    font-size: 11px;
    font-weight: 700;
  }

  .gd-user-data {
    display: flex;
    flex-direction: column;
    min-width: 100px;
  }

  .gd-user-data strong {
    color: var(--gd-text);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 700;
  }

  .gd-user-data small {
    margin-top: 2px;
    color: var(--gd-text-muted);
    font-size: 9px;
    line-height: 1.2;
  }

  .gd-logout {
    height: 34px;
    padding: 0 12px;

    border: 1px solid #cbd5e1;
    border-radius: 8px;

    background: var(--gd-surface);
    color: var(--gd-text-secondary);

    font-family: inherit;
    font-size: 10px;
    font-weight: 700;

    cursor: pointer;
  }

  .gd-logout:hover {
    background: var(--gd-background);
    border-color: #94a3b8;
  }

  /* ============================================================
     ÁREA DE CONTEÚDO
     ============================================================ */

  .gd-page-content {
    width: 100%;
    min-height: calc(100vh - var(--gd-header));
    padding: 22px 20px 42px;
  }

  /* ============================================================
     RODAPÉ FIXO DO SHELL
     O rodapé pertence ao Menu Principal e acompanha o eixo
     estrutural da área principal, assim como o cabeçalho.
     ============================================================ */

  .gd-shell-footer {
    position: fixed;
    left: var(--gd-sidebar-width);
    right: 0;
    bottom: 0;
    z-index: 1000;

    min-height: 68px;
    width: auto;
    padding: 12px 28px;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    box-sizing: border-box;
    background: var(--gd-surface);
    border-top: 1px solid var(--gd-border);
    box-shadow: 0 -2px 8px rgba(15, 23, 42, 0.05);
  }

  .gd-shell-footer button {
    height: 40px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    box-sizing: border-box;
  }

  .gd-shell-footer .btn-secundario {
    border: 1px solid #cbd5e1;
    background: var(--gd-surface);
    color: var(--gd-text-secondary);
  }

  .gd-shell-footer .btn-secundario:hover {
    background: var(--gd-background);
    border-color: #94a3b8;
  }

  .gd-shell-footer .btn-principal {
    border: 1px solid #2563eb;
    background: var(--gd-primary);
    color: var(--gd-text-white);
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.16);
  }

  .gd-shell-footer .btn-principal:hover {
    background: #1d4ed8;
  }

  @media (max-width: 900px) {
    .gd-shell-footer {
      padding: 12px 24px;
    }
  }

  @media (max-width: 700px) {
    .gd-shell-footer {
      min-height: 62px;
      padding: 10px 16px;
    }

    .gd-shell-footer button {
      height: 38px;
      min-height: 38px;
      padding: 0 12px;
    }
  }

  @media (max-width: 480px) {
    .gd-shell-footer {
      gap: 8px;
      padding: 9px 10px;
    }

    .gd-shell-footer button {
      flex: 1 1 0;
      min-width: 0;
      padding: 0 8px;
    }
  }

  /* ============================================================
     RESPONSIVIDADE
     ============================================================ */

  @media (max-width: 1100px) {
    .gd-user-data {
      display: none;
    }
  }

  .gd-menu-shell.menu-fechado {
    --gd-sidebar-width: 68px;
  }

  .gd-menu-shell.menu-fechado .gd-sidebar {
    padding-left: 8px;
    padding-right: 8px;
  }

  .gd-menu-shell.menu-fechado .gd-sidebar-brand {
    justify-content: center;
    padding: 0;
  }

  .gd-menu-shell.menu-fechado .gd-sidebar-brand > div:last-child,
  .gd-menu-shell.menu-fechado .gd-nav-button > span:last-child,
  .gd-menu-shell.menu-fechado .gd-nav-section,
  .gd-menu-shell.menu-fechado .gd-sidebar-footer span {
    display: none;
  }

  .gd-menu-shell.menu-fechado .gd-nav-button {
    justify-content: center;
    padding: 0;
  }

  .gd-menu-shell.menu-fechado .gd-sidebar-footer {
    align-items: center;
    padding-left: 0;
    padding-right: 0;
  }

  .gd-menu-overlay { display: none; }

  @media (max-width: 900px) {
    .gd-menu-shell { --gd-sidebar-width: 0px; }

    .gd-sidebar {
      width: 240px;
      padding-left: 12px;
      padding-right: 12px;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      box-shadow: 8px 0 24px rgba(15, 23, 42, 0.16);
    }

    .gd-menu-shell.menu-aberto .gd-sidebar { transform: translateX(0); }

    .gd-menu-shell.menu-aberto .gd-sidebar-brand {
      justify-content: flex-start;
      padding: 0 18px;
    }

    .gd-menu-shell.menu-aberto .gd-sidebar-brand > div:last-child,
    .gd-menu-shell.menu-aberto .gd-nav-button > span:last-child,
    .gd-menu-shell.menu-aberto .gd-nav-section,
    .gd-menu-shell.menu-aberto .gd-sidebar-footer span { display: block; }

    .gd-menu-shell.menu-aberto .gd-nav-button {
      justify-content: flex-start;
      padding: 0 11px;
    }

    .gd-menu-shell.menu-aberto .gd-sidebar-footer {
      align-items: flex-start;
      padding-left: 8px;
      padding-right: 8px;
    }

    .gd-menu-overlay {
      position: fixed;
      inset: 0;
      z-index: 1050;
      display: block;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: rgba(15, 23, 42, 0.35);
      cursor: pointer;
    }

    .gd-menu-shell.menu-fechado .gd-menu-overlay { display: none; }

    .gd-main { width: 100%; margin-left: 0; }
    .gd-shell-footer { left: 0; }

    .gd-topbar { padding: 0 14px; }
    .gd-system-subtitle { display: none; }
    .gd-page-content { padding-left: 14px; padding-right: 14px; }
  }

  @media (max-width: 620px) {
    .gd-topbar {
      gap: 8px;
    }

    .gd-topbar-left {
      gap: 6px;
    }

    .gd-system-title {
      font-size: 14px;
    }

    .gd-topbar-right {
      gap: 6px;
    }

    .gd-notification {
      display: none;
    }

    .gd-logout {
      padding: 0 9px;
    }
  }
`

function iniciaisDoUsuario(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase()
}

function perfilExibicao(usuario: Usuario) {
  return usuario.perfil === 'Gestor/Administrador'
    ? 'Gestor'
    : usuario.perfil
}


// ============================================================
// CENTRAL DE NOTIFICAÇÕES GLOBAL
// ------------------------------------------------------------
// Quando uma tela não fornece notificacoesConteudo,
// o próprio MenuPrincipal monta a mesma central visual/funcional
// a partir das demandas persistidas no storage.
// Isso faz o sino funcionar em todas as telas do sistema,
// sem obrigar cada página a duplicar a implementação.
// ============================================================

type DemandaNotificacaoGlobal = {
  id: number
  titulo: string
  prioridade: string
  prazo: string
  status: string
  historico?: Array<{
    id: number
    tipo: string
    titulo: string
    descricao: string
    data: string
    usuario: string
    referenciaId?: number
  }>
}

type NotificacaoGlobal = {
  id: string
  tipo: string
  titulo: string
  descricao: string
  data: string
  demandaId: number
  prioridade?: string
  lida: boolean
}

type CampoNotificacaoGlobal =
  | 'atrasadas'
  | 'proximoVencimento'
  | 'atribuicao'
  | 'conclusao'
  | 'reabertura'
  | 'cancelamento'

function carregarDemandasParaNotificacoes(): DemandaNotificacaoGlobal[] {
  try {
    const salvo = localStorage.getItem('demandas')

    if (!salvo) {
      return []
    }

    const dados = JSON.parse(salvo)

    if (!Array.isArray(dados)) {
      return []
    }

    return dados.map((item) => ({
      ...item,
      status:
        item?.status === 'Em Processo'
          ? 'Em Atendimento'
          : String(item?.status || ''),
      prioridade:
        item?.prioridade === 'Urgente'
          ? 'Crítica'
          : String(item?.prioridade || ''),
      historico: Array.isArray(item?.historico)
        ? item.historico
        : [],
    }))
  } catch {
    return []
  }
}

function converterDataNotificacaoGlobal(
  valor: string
): Date | null {
  if (!valor) {
    return null
  }

  const texto = String(valor).trim()

  const brasileiro =
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)

  if (brasileiro) {
    const [, dia, mes, ano] = brasileiro

    const resultado = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia)
    )

    resultado.setHours(0, 0, 0, 0)

    return resultado
  }

  const resultado = new Date(texto)

  if (Number.isNaN(resultado.getTime())) {
    return null
  }

  resultado.setHours(0, 0, 0, 0)

  return resultado
}

function formatarDataHoraNotificacaoGlobal(
  valor: string
): string {
  if (!valor) {
    return ''
  }

  const data = new Date(valor)

  if (!Number.isNaN(data.getTime())) {
    return data.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const dataBrasileira =
    converterDataNotificacaoGlobal(valor)

  if (dataBrasileira) {
    return dataBrasileira.toLocaleDateString('pt-BR')
  }

  return valor
}

function notificacaoGlobalHabilitada(
  campo: CampoNotificacaoGlobal
): boolean {
  const padrao: Record<
    CampoNotificacaoGlobal,
    boolean
  > = {
    atrasadas: true,
    proximoVencimento: true,
    atribuicao: true,
    conclusao: true,
    reabertura: true,
    cancelamento: true,
  }

  try {
    const salvo =
      localStorage.getItem(
        'configuracoes_sistema'
      )

    if (!salvo) {
      return padrao[campo]
    }

    const dados = JSON.parse(salvo) as {
      notificacoes?: Partial<
        Record<CampoNotificacaoGlobal, boolean>
      >
    }

    return (
      dados.notificacoes?.[campo] ??
      padrao[campo]
    )
  } catch {
    return padrao[campo]
  }
}

function criarIdNotificacaoGlobal(
  tipo: string,
  demandaId: number,
  referencia: string
): string {
  return `${tipo}-${demandaId}-${referencia}`
}

function estaAtrasadaNotificacaoGlobal(
  demanda: DemandaNotificacaoGlobal
): boolean {
  if (
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  if (!demanda.prazo) {
    return false
  }

  const prazo =
    converterDataNotificacaoGlobal(
      demanda.prazo
    )

  if (!prazo) {
    return false
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return prazo < hoje
}

function estaProximaDoVencimentoNotificacaoGlobal(
  demanda: DemandaNotificacaoGlobal
): boolean {
  if (
    demanda.status === 'Concluída' ||
    demanda.status === 'Cancelada'
  ) {
    return false
  }

  if (!demanda.prazo) {
    return false
  }

  const prazo =
    converterDataNotificacaoGlobal(
      demanda.prazo
    )

  if (!prazo) {
    return false
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite = new Date(hoje)
  limite.setDate(
    limite.getDate() + 7
  )

  return (
    prazo >= hoje &&
    prazo <= limite
  )
}

function gerarNotificacoesGlobais(
  demandas: DemandaNotificacaoGlobal[]
): NotificacaoGlobal[] {
  const notificacoes: NotificacaoGlobal[] = []

  demandas.forEach((demanda) => {
    if (
      notificacaoGlobalHabilitada('atrasadas') &&
      estaAtrasadaNotificacaoGlobal(demanda)
    ) {
      notificacoes.push({
        id: criarIdNotificacaoGlobal(
          'atrasada',
          demanda.id,
          demanda.prazo
        ),
        tipo: 'atrasada',
        titulo: 'Demanda atrasada',
        descricao:
          `A demanda "${demanda.titulo}" ultrapassou o prazo de atendimento.`,
        data: demanda.prazo,
        demandaId: demanda.id,
        prioridade: demanda.prioridade,
        lida: false,
      })
    }

    if (
      notificacaoGlobalHabilitada(
        'proximoVencimento'
      ) &&
      estaProximaDoVencimentoNotificacaoGlobal(
        demanda
      )
    ) {
      notificacoes.push({
        id: criarIdNotificacaoGlobal(
          'prazo',
          demanda.id,
          demanda.prazo
        ),
        tipo: 'prazo',
        titulo:
          'Prazo próximo do vencimento',
        descricao:
          `A demanda "${demanda.titulo}" está próxima do vencimento do prazo.`,
        data: demanda.prazo,
        demandaId: demanda.id,
        prioridade: demanda.prioridade,
        lida: false,
      })
    }

    const historico =
      Array.isArray(demanda.historico)
        ? demanda.historico
        : []

    historico.forEach((item) => {
      if (!item || !item.id) {
        return
      }

      if (
        item.tipo === 'responsavel' &&
        notificacaoGlobalHabilitada(
          'atribuicao'
        )
      ) {
        notificacoes.push({
          id: criarIdNotificacaoGlobal(
            'responsavel',
            demanda.id,
            String(item.id)
          ),
          tipo: 'responsavel',
          titulo:
            item.titulo ===
            'Responsável alterado'
              ? 'Responsável alterado'
              : 'Demanda atribuída',
          descricao:
            item.descricao ||
            `O responsável da demanda "${demanda.titulo}" foi alterado.`,
          data: item.data,
          demandaId: demanda.id,
          prioridade: demanda.prioridade,
          lida: false,
        })
      }

      if (item.tipo !== 'status') {
        return
      }

      const descricao = String(
        item.descricao || ''
      ).toLowerCase()

      const titulo = String(
        item.titulo || ''
      ).toLowerCase()

      if (
        notificacaoGlobalHabilitada(
          'conclusao'
        ) &&
        (
          titulo.includes('conclu') ||
          descricao.includes('conclu')
        )
      ) {
        notificacoes.push({
          id: criarIdNotificacaoGlobal(
            'concluida',
            demanda.id,
            String(item.id)
          ),
          tipo: 'concluida',
          titulo:
            'Demanda concluída',
          descricao:
            item.descricao ||
            `A demanda "${demanda.titulo}" foi concluída.`,
          data: item.data,
          demandaId: demanda.id,
          prioridade: demanda.prioridade,
          lida: false,
        })
      }

      if (
        notificacaoGlobalHabilitada(
          'cancelamento'
        ) &&
        (
          descricao.includes('cancelad') ||
          titulo.includes('cancelad')
        )
      ) {
        notificacoes.push({
          id: criarIdNotificacaoGlobal(
            'cancelada',
            demanda.id,
            String(item.id)
          ),
          tipo: 'cancelada',
          titulo:
            'Demanda cancelada',
          descricao:
            item.descricao ||
            `A demanda "${demanda.titulo}" foi cancelada.`,
          data: item.data,
          demandaId: demanda.id,
          prioridade: demanda.prioridade,
          lida: false,
        })
      }

      const houveConclusaoAnterior =
        historico.some(
          (anterior) =>
            anterior.id !== item.id &&
            anterior.tipo === 'status' &&
            (
              String(
                anterior.titulo || ''
              )
                .toLowerCase()
                .includes('conclu') ||
              String(
                anterior.descricao || ''
              )
                .toLowerCase()
                .includes('conclu')
            ) &&
            new Date(
              anterior.data
            ).getTime() <=
              new Date(
                item.data
              ).getTime()
        )

      if (
        notificacaoGlobalHabilitada(
          'reabertura'
        ) &&
        houveConclusaoAnterior &&
        !descricao.includes('conclu')
      ) {
        notificacoes.push({
          id: criarIdNotificacaoGlobal(
            'reaberta',
            demanda.id,
            String(item.id)
          ),
          tipo: 'reaberta',
          titulo:
            'Demanda reaberta',
          descricao:
            item.descricao ||
            `A demanda "${demanda.titulo}" foi reaberta.`,
          data: item.data,
          demandaId: demanda.id,
          prioridade: demanda.prioridade,
          lida: false,
        })
      }
    })
  })

  return notificacoes.sort(
    (a, b) =>
      new Date(b.data).getTime() -
      new Date(a.data).getTime()
  )
}

function obterIconeNotificacaoGlobal(
  tipo: string
): string {
  switch (tipo) {
    case 'atrasada':
      return '🔴'
    case 'prazo':
      return '🕐'
    case 'responsavel':
      return '👤'
    case 'concluida':
      return '🟢'
    case 'cancelada':
      return '⚫'
    case 'reaberta':
      return '🔄'
    default:
      return '🔔'
  }
}

function obterClasseNotificacaoGlobal(
  tipo: string
): string {
  switch (tipo) {
    case 'atrasada':
      return 'atrasada'
    case 'prazo':
      return 'prazo'
    case 'responsavel':
      return 'responsavel'
    case 'concluida':
      return 'concluida'
    case 'cancelada':
      return 'cancelada'
    case 'reaberta':
      return 'reaberta'
    default:
      return 'normal'
  }
}

function marcarLeituraNotificacaoGlobal(
  id: string
) {
  if (!id) {
    return
  }

  try {
    const salvo =
      localStorage.getItem(
        'notificacoes_lidas'
      )

    const atuais =
      salvo
        ? JSON.parse(salvo)
        : []

    const leituras =
      Array.isArray(atuais)
        ? atuais
        : []

    if (leituras.includes(id)) {
      return
    }

    localStorage.setItem(
      'notificacoes_lidas',
      JSON.stringify([
        ...leituras,
        id,
      ])
    )
  } catch {
    // A central continua disponível mesmo sem persistência.
  }
}

function salvarTodasLeiturasNotificacoesGlobais(
  ids: string[]
) {
  try {
    const salvo =
      localStorage.getItem(
        'notificacoes_lidas'
      )

    const atuais =
      salvo
        ? JSON.parse(salvo)
        : []

    const leiturasAtuais =
      Array.isArray(atuais)
        ? atuais
        : []

    localStorage.setItem(
      'notificacoes_lidas',
      JSON.stringify([
        ...new Set([
          ...leiturasAtuais,
          ...ids,
        ]),
      ])
    )
  } catch {
    // Sem interrupção da interface.
  }
}

function GlobalNotificationPanel({
  notificacoes,
  onLer,
  onLerTodas,
}: {
  notificacoes: NotificacaoGlobal[]
  onLer: (id: string) => void
  onLerTodas: () => void
}) {
  const naoLidas = notificacoes.filter(
    (item) => !item.lida
  )

  return (
    <div className="gd-global-notification-content">
      <div className="gd-global-notification-header">
        <div>
          <strong>Notificações</strong>
          <small>
            {naoLidas.length}{' '}
            {naoLidas.length === 1
              ? 'não lida'
              : 'não lidas'}
          </small>
        </div>

        {naoLidas.length > 0 && (
          <button
            type="button"
            className="gd-global-notification-mark-all"
            onClick={onLerTodas}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="gd-global-notification-list">
        {notificacoes.length === 0 ? (
          <div className="gd-global-notification-empty">
            <span>✓</span>
            <strong>
              Nenhuma notificação.
            </strong>
            <small>
              Não existem alertas ou ocorrências
              pendentes no momento.
            </small>
          </div>
        ) : (
          notificacoes
            .slice(0, 12)
            .map((notificacao) => (
              <button
                type="button"
                key={notificacao.id}
                className={`gd-global-notification-item ${
                  notificacao.lida
                    ? ''
                    : 'nao-lida'
                } gd-global-notification-${obterClasseNotificacaoGlobal(
                  notificacao.tipo
                )}`}
                onClick={() =>
                  onLer(notificacao.id)
                }
              >
                <span className="gd-global-notification-icon">
                  {obterIconeNotificacaoGlobal(
                    notificacao.tipo
                  )}
                </span>

                <span className="gd-global-notification-body">
                  <strong>
                    {notificacao.titulo}
                  </strong>

                  <span>
                    {notificacao.descricao}
                  </span>

                  <small>
                    Demanda #
                    {notificacao.demandaId}
                    {' • '}
                    {formatarDataHoraNotificacaoGlobal(
                      notificacao.data
                    )}
                  </small>
                </span>

                {!notificacao.lida && (
                  <span
                    className="gd-global-notification-dot"
                    aria-label="Não lida"
                  />
                )}
              </button>
            ))
        )}
      </div>

      {notificacoes.length > 12 && (
        <div className="gd-global-notification-footer">
          Exibindo as 12 notificações mais recentes.
        </div>
      )}

      <div className="gd-global-notification-channel">
        <span>
          Canal do sistema: dentro da aplicação
        </span>
      </div>
    </div>
  )
}

type BotaoMenuProps = {
  id: MenuItem
  icone: string
  children: ReactNode
  ativo?: MenuItem
  onClick?: () => void
}

function BotaoMenu({
  id,
  icone,
  children,
  ativo,
  onClick,
}: BotaoMenuProps) {
  return (
    <button
      type="button"
      className={`gd-nav-button ${ativo === id ? 'active' : ''}`}
      onClick={onClick}
      aria-current={ativo === id ? 'page' : undefined}
    >
      <span className="gd-nav-icon" aria-hidden="true">
        {icone}
      </span>
      <span>{children}</span>
    </button>
  )
}

export default function MenuPrincipal({
  usuarioAtual,
  nomeUsuario,
  perfilUsuario,
  children,
  ativo = 'dashboard',
  onDashboard,
  onMinhasDemandas,
  onNovaDemanda,
  onTodasDemandas,
  onClientes,
  onResponsaveis,
  onFeriados,
  onRelatorios,
  onConfiguracoes,
  onMinhaConta,
  onSair,
  subtitulo = 'Sistema de Gestão de Demandas',
  notificacoes = 0,
  notificacoesConteudo,
  rodapeAcoes,
}: Props) {
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)
  const [notificacoesAtualizacao, setNotificacoesAtualizacao] = useState(0)
  const [menuAberto, setMenuAberto] = useState(
    () => typeof window === 'undefined' ? true : window.innerWidth > 900
  )

  const demandasParaNotificacoes = useMemo(
    () => carregarDemandasParaNotificacoes(),
    [notificacoesAtualizacao]
  )

  const notificacoesGlobaisBase = useMemo(
    () => gerarNotificacoesGlobais(
      demandasParaNotificacoes
    ),
    [demandasParaNotificacoes]
  )

  const [leiturasGlobais, setLeiturasGlobais] = useState<string[]>(
    () => {
      try {
        const salvo =
          localStorage.getItem(
            'notificacoes_lidas'
          )

        const dados =
          salvo
            ? JSON.parse(salvo)
            : []

        return Array.isArray(dados)
          ? dados
          : []
      } catch {
        return []
      }
    }
  )

  const notificacoesGlobais = useMemo(
    () =>
      notificacoesGlobaisBase.map(
        (item) => ({
          ...item,
          lida:
            leiturasGlobais.includes(
              item.id
            ),
        })
      ),
    [notificacoesGlobaisBase, leiturasGlobais]
  )

  const notificacoesGlobaisNaoLidas =
    notificacoesGlobais.filter(
      (item) => !item.lida
    )

  function atualizarNotificacoesGlobais() {
    try {
      const salvo =
        localStorage.getItem(
          'notificacoes_lidas'
        )

      const dados =
        salvo
          ? JSON.parse(salvo)
          : []

      setLeiturasGlobais(
        Array.isArray(dados)
          ? dados
          : []
      )
    } catch {
      setLeiturasGlobais([])
    }

    setNotificacoesAtualizacao(
      (valor) => valor + 1
    )
  }

  function marcarNotificacaoGlobalComoLida(
    id: string
  ) {
    if (
      !id ||
      leiturasGlobais.includes(id)
    ) {
      return
    }

    const novasLeituras = [
      ...leiturasGlobais,
      id,
    ]

    setLeiturasGlobais(
      novasLeituras
    )

    marcarLeituraNotificacaoGlobal(id)
  }

  function marcarTodasNotificacoesGlobaisComoLidas() {
    const ids =
      notificacoesGlobais.map(
        (item) => item.id
      )

    const novasLeituras = [
      ...new Set([
        ...leiturasGlobais,
        ...ids,
      ]),
    ]

    setLeiturasGlobais(
      novasLeituras
    )

    salvarTodasLeiturasNotificacoesGlobais(
      ids
    )
  }

  const nomeExibicao = usuarioAtual?.nome || nomeUsuario || 'Usuário'
  const perfil = usuarioAtual ? perfilExibicao(usuarioAtual) : (perfilUsuario || 'Usuário')
  const iniciais = iniciaisDoUsuario(nomeExibicao)

  return (
    <div className={`gd-menu-shell ${menuAberto ? 'menu-aberto' : 'menu-fechado'}`}>
      <style>{ESTILOS}</style>

      <aside className="gd-sidebar">
        <div className="gd-sidebar-brand">
          <div className="gd-sidebar-brand-icon" aria-hidden="true">
            ⚙
          </div>

          <div>
            <strong>Gestão de Demandas</strong>
          </div>
        </div>

        <nav
          className="gd-sidebar-nav"
          aria-label="Menu principal"
        >
          {usuarioAtual?.perfil === 'Analista' || perfilUsuario === 'Analista' ? (
            <>
              <div className="gd-nav-section">MINHAS DEMANDAS</div>

              <BotaoMenu
                id="dashboard"
                icone="⌂"
                ativo={ativo}
                onClick={onDashboard}
              >
                Dashboard
              </BotaoMenu>

              <BotaoMenu
                id="minhas-demandas"
                icone="☷"
                ativo={ativo}
                onClick={onMinhasDemandas}
              >
                Minhas Demandas
              </BotaoMenu>

              <div className="gd-nav-section">USUÁRIO</div>

              <BotaoMenu
                id="configuracoes"
                icone="⚙"
                ativo={ativo}
                onClick={onConfiguracoes}
              >
                Configurações
              </BotaoMenu>
            </>
          ) : (
            <>
              <BotaoMenu
                id="dashboard"
                icone="⌂"
                ativo={ativo}
                onClick={onDashboard}
              >
                Dashboard
              </BotaoMenu>

              {onMinhasDemandas && (
                <BotaoMenu
                  id="minhas-demandas"
                  icone="☷"
                  ativo={ativo}
                  onClick={onMinhasDemandas}
                >
                  Minhas Demandas
                </BotaoMenu>
              )}

              <div className="gd-nav-section">DEMANDAS</div>

              <BotaoMenu
                id="nova-demanda"
                icone="+"
                ativo={ativo}
                onClick={onNovaDemanda}
              >
                Nova Demanda
              </BotaoMenu>

              <BotaoMenu
                id="todas-demandas"
                icone="☷"
                ativo={ativo}
                onClick={onTodasDemandas}
              >
                Todas as Demandas
              </BotaoMenu>

              <div className="gd-nav-section">GESTÃO</div>

              <BotaoMenu
                id="clientes"
                icone="▦"
                ativo={ativo}
                onClick={onClientes}
              >
                Clientes
              </BotaoMenu>

              <BotaoMenu
                id="responsaveis"
                icone="♟"
                ativo={ativo}
                onClick={onResponsaveis}
              >
                Responsáveis
              </BotaoMenu>

              <BotaoMenu
                id="feriados"
                icone="□"
                ativo={ativo}
                onClick={onFeriados}
              >
                Feriados
              </BotaoMenu>

              <div className="gd-nav-section">RELATÓRIOS</div>

              <BotaoMenu
                id="relatorios"
                icone="▥"
                ativo={ativo}
                onClick={onRelatorios}
              >
                Relatórios
              </BotaoMenu>

              <div className="gd-nav-section">ADMINISTRAÇÃO</div>

              <BotaoMenu
                id="configuracoes"
                icone="⚙"
                ativo={ativo}
                onClick={onConfiguracoes}
              >
                Configurações
              </BotaoMenu>
            </>
          )}
        </nav>

        <div className="gd-sidebar-footer">
          <strong>PRODEPA</strong>
          <span>Tecnologia que aproxima</span>
          <span>o Pará do futuro</span>
        </div>
      </aside>

      {menuAberto && (
        <button
          type="button"
          className="gd-menu-overlay"
          aria-label="Fechar menu principal"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <div className="gd-main">
        <header className="gd-topbar">
          <div className="gd-topbar-left">
            <button
              type="button"
              className="gd-menu-toggle"
              aria-label={menuAberto ? 'Fechar menu principal' : 'Abrir menu principal'}
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((aberto) => !aberto)}
            >
              ☰
            </button>

            <div>
              <h1 className="gd-system-title">
                Gestão de Demandas de TI
              </h1>

              <p className="gd-system-subtitle">
                {subtitulo}
              </p>
            </div>
          </div>

          <div className="gd-topbar-right">
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="gd-notification"
                aria-label="Notificações"
                aria-expanded={notificacoesAbertas}
                onClick={() => {
                  atualizarNotificacoesGlobais()

                  setNotificacoesAbertas(
                    (aberta) => !aberta
                  )
                }}
              >
                🔔

                {(notificacoesConteudo
                  ? notificacoes
                  : notificacoesGlobaisNaoLidas.length) > 0 && (
                  <span className="gd-notification-badge">
                    {
                      (
                        notificacoesConteudo
                          ? notificacoes
                          : notificacoesGlobaisNaoLidas.length
                      ) > 99
                        ? '99+'
                        : (
                            notificacoesConteudo
                              ? notificacoes
                              : notificacoesGlobaisNaoLidas.length
                          )
                    }
                  </span>
                )}
              </button>

              {notificacoesAbertas && (
                <div
                  className="gd-notification-panel"
                  role="dialog"
                  aria-label="Central de notificações"
                >
                  {notificacoesConteudo ? (
                    notificacoesConteudo
                  ) : (
                    <GlobalNotificationPanel
                      notificacoes={
                        notificacoesGlobais
                      }
                      onLer={
                        marcarNotificacaoGlobalComoLida
                      }
                      onLerTodas={
                        marcarTodasNotificacoesGlobaisComoLidas
                      }
                    />
                  )}
                </div>
              )}
            </div>

            {onMinhaConta ? (
              <button
                type="button"
                className="gd-user"
                onClick={onMinhaConta}
                aria-label="Abrir Minha Conta"
                style={{
                  border: 0,
                  margin: 0,
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  className="gd-user-avatar"
                  aria-hidden="true"
                >
                  {iniciais || 'US'}
                </span>

                <div className="gd-user-data">
                  <strong>{nomeExibicao}</strong>
                  <small>{perfil}</small>
                </div>
              </button>
            ) : (
              <div className="gd-user">
                <span
                  className="gd-user-avatar"
                  aria-hidden="true"
                >
                  {iniciais || 'US'}
                </span>

                <div className="gd-user-data">
                  <strong>{nomeExibicao}</strong>
                  <small>{perfil}</small>
                </div>
              </div>
            )}

            <button
              type="button"
              className="gd-logout"
              onClick={onSair}
            >
              Sair
            </button>
          </div>
        </header>

        <main className="gd-page-content">
          {children}
        </main>
      </div>

      {rodapeAcoes && (
        <div className="gd-shell-footer">
          {rodapeAcoes}
        </div>
      )}
    </div>
  )
}
