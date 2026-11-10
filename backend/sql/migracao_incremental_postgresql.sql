-- ============================================================
-- GESTÃO DE DEMANDAS DE TI (SGD)
-- PARTE 3 — MIGRAÇÃO INCREMENTAL DO POSTGRESQL EXISTENTE
-- ============================================================
--
-- FINALIDADE
--   Atualizar um banco SGD já existente para o modelo utilizado
--   pelo backend atual, sem apagar registros e sem recriar tabelas.
--
-- O QUE ESTA MIGRAÇÃO FAZ
--   1. Prepara os campos do perfil Diretor (a).
--   2. Garante no máximo um Diretor em todo o sistema.
--   3. Mantém o Diretor vinculado somente à DDS, sem Gerência/Divisão.
--   4. Adiciona campos de apoio à persistência de demandas, quando faltarem.
--   5. Permite demanda sem responsável inicial.
--   6. Adiciona o indicador de troca de senha no primeiro acesso.
--   7. Preenche nomes auxiliares a partir dos vínculos existentes.
--
-- SEGURANÇA DOS DADOS
--   - Não exclui usuários, demandas ou outros registros.
--   - Não cria usuários iniciais.
--   - Não importa dados do localStorage.
--   - Pode ser executada novamente: as alterações estruturais usam
--     IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.
--
-- IMPORTANTE
--   Faça um BACKUP do banco antes de executar qualquer migração.
--   Execute no banco utilizado pelo SGD (normalmente: sgd), pelo pgAdmin.
--   Este script é para banco EXISTENTE. Para banco novo, use schema.sql.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. CONFERIR SE AS TABELAS PRINCIPAIS EXISTEM
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.usuarios não existe. Para uma instalação nova, execute primeiro schema.sql.';
  END IF;

  IF to_regclass('public.demandas') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.demandas não existe. Para uma instalação nova, execute primeiro schema.sql.';
  END IF;
END $$;

-- ============================================================
-- 1. USUÁRIOS — CAMPOS ORGANIZACIONAIS E SENHA
-- ============================================================

ALTER TABLE public.usuarios
  ALTER COLUMN gerencia_sigla DROP NOT NULL,
  ALTER COLUMN gerencia_nome DROP NOT NULL,
  ALTER COLUMN divisao_nome DROP NOT NULL;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS exigir_troca_senha BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. USUÁRIOS — LISTA OFICIAL DE PERFIS
-- ============================================================

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_perfil_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_perfil_check
  CHECK (
    perfil IN (
      'Gestor/Administrador',
      'Diretor (a)',
      'Analista',
      'Desenvolvedor',
      'Estagiário'
    )
  );

-- ============================================================
-- 3. DIRETOR — VALIDAR UNICIDADE ANTES DE CRIAR O ÍNDICE
-- ============================================================

DO $$
DECLARE
  total_diretores INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
    INTO total_diretores
    FROM public.usuarios
   WHERE perfil = 'Diretor (a)';

  IF total_diretores > 1 THEN
    RAISE EXCEPTION
      'Foram encontrados % usuários com perfil Diretor (a). Mantenha somente um Diretor e execute novamente a migração.',
      total_diretores;
  END IF;
END $$;

-- O Diretor tem abrangência da DDS inteira e não pertence a uma gerência
-- ou divisão específica. Normaliza eventual registro existente.
UPDATE public.usuarios
   SET diretoria_sigla = 'DDS',
       diretoria_nome = 'Diretoria de Desenvolvimento de Sistemas',
       gerencia_sigla = NULL,
       gerencia_nome = NULL,
       divisao_nome = NULL
 WHERE perfil = 'Diretor (a)';

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_diretor_sem_gerencia_divisao;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_diretor_sem_gerencia_divisao
  CHECK (
    perfil <> 'Diretor (a)'
    OR (
      diretoria_sigla = 'DDS'
      AND diretoria_nome = 'Diretoria de Desenvolvimento de Sistemas'
      AND gerencia_sigla IS NULL
      AND gerencia_nome IS NULL
      AND divisao_nome IS NULL
    )
  );

-- Índice parcial: outros perfis podem existir em quantidade normal,
-- mas só pode existir um registro com perfil Diretor (a).
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_unico_diretor
  ON public.usuarios (perfil)
  WHERE perfil = 'Diretor (a)';

-- ============================================================
-- 4. DEMANDAS — CAMPOS UTILIZADOS PELO BACKEND ATUAL
-- ============================================================

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS criticidade TEXT,
  ADD COLUMN IF NOT EXISTS prioridade_atendimento TEXT,
  ADD COLUMN IF NOT EXISTS prazo_dias_uteis INTEGER,
  ADD COLUMN IF NOT EXISTS prazo_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_reabertura TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sistema_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
  ADD COLUMN IF NOT EXISTS usuario_criacao_nome TEXT,
  ADD COLUMN IF NOT EXISTS usuario_conclusao_nome TEXT,
  ADD COLUMN IF NOT EXISTS usuario_reabertura_nome TEXT;

-- A criação de demanda pode ocorrer sem responsável inicial.
ALTER TABLE public.demandas
  ALTER COLUMN responsavel_id DROP NOT NULL;

-- Reforça a validação do campo, inclusive em bancos que ainda não tinham
-- essa restrição. O nome distinto evita remover regras existentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.demandas'::regclass
       AND conname = 'demandas_prazo_dias_uteis_check'
  ) THEN
    ALTER TABLE public.demandas
      ADD CONSTRAINT demandas_prazo_dias_uteis_check
      CHECK (prazo_dias_uteis IS NULL OR prazo_dias_uteis >= 0);
  END IF;
END $$;

-- ============================================================
-- 5. DEMANDAS — COMPLETAR NOMES DOS VÍNCULOS JÁ EXISTENTES
-- ============================================================
-- Não altera os IDs nem remove vínculos. Apenas preenche campos de nome
-- vazios quando há registro relacionado no PostgreSQL.

UPDATE public.demandas d
   SET sistema_nome = s.nome
  FROM public.sistemas s
 WHERE d.sistema_id = s.id
   AND COALESCE(BTRIM(d.sistema_nome), '') = '';

UPDATE public.demandas d
   SET responsavel_nome = u.nome
  FROM public.usuarios u
 WHERE d.responsavel_id = u.id
   AND COALESCE(BTRIM(d.responsavel_nome), '') = '';

UPDATE public.demandas d
   SET usuario_criacao_nome = u.nome
  FROM public.usuarios u
 WHERE d.usuario_criacao_id = u.id
   AND COALESCE(BTRIM(d.usuario_criacao_nome), '') = '';

UPDATE public.demandas d
   SET usuario_conclusao_nome = u.nome
  FROM public.usuarios u
 WHERE d.usuario_conclusao_id = u.id
   AND COALESCE(BTRIM(d.usuario_conclusao_nome), '') = '';

UPDATE public.demandas d
   SET usuario_reabertura_nome = u.nome
  FROM public.usuarios u
 WHERE d.usuario_reabertura_id = u.id
   AND COALESCE(BTRIM(d.usuario_reabertura_nome), '') = '';

-- ============================================================
-- 6. ÍNDICES DE APOIO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_demandas_responsavel_nome
  ON public.demandas (responsavel_nome);

CREATE INDEX IF NOT EXISTS idx_demandas_status
  ON public.demandas (status);

CREATE INDEX IF NOT EXISTS idx_demandas_prazo
  ON public.demandas (prazo);

COMMIT;

-- ============================================================
-- 7. CONFERÊNCIA FINAL
-- ============================================================

SELECT
  id,
  nome,
  login,
  perfil,
  status,
  diretoria_sigla,
  diretoria_nome,
  gerencia_sigla,
  gerencia_nome,
  divisao_nome,
  exigir_troca_senha
FROM public.usuarios
ORDER BY id;

SELECT
  COUNT(*) AS total_demandas,
  COUNT(*) FILTER (WHERE responsavel_id IS NULL) AS demandas_sem_responsavel,
  COUNT(*) FILTER (WHERE COALESCE(BTRIM(responsavel_nome), '') <> '') AS demandas_com_nome_responsavel
FROM public.demandas;

SELECT
  COUNT(*) AS total_diretores
FROM public.usuarios
WHERE perfil = 'Diretor (a)';
