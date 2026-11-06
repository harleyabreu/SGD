-- ============================================================
-- GESTÃO DE DEMANDAS DE TI
-- MIGRAÇÃO — PERFIL DIRETOR (A)
-- ============================================================
--
-- OBJETIVO:
--   1. Permitir o perfil Diretor (a)
--   2. Permitir Gerência e Divisão nulas
--   3. Garantir apenas um Diretor
--   4. Preparar a estrutura para abrangência global da DDS
--
-- IMPORTANTE:
--   Este script NÃO cria usuários.
--   Este script NÃO recupera dados antigos do localStorage.
-- ============================================================


BEGIN;


-- ============================================================
-- 1. GARANTIR QUE GERÊNCIA E DIVISÃO POSSAM SER NULAS
-- ============================================================

ALTER TABLE usuarios
  ALTER COLUMN gerencia_sigla DROP NOT NULL;

ALTER TABLE usuarios
  ALTER COLUMN gerencia_nome DROP NOT NULL;

ALTER TABLE usuarios
  ALTER COLUMN divisao_nome DROP NOT NULL;


-- ============================================================
-- 2. ATUALIZAR RESTRIÇÃO DO PERFIL
-- ============================================================

DO $$
DECLARE
  registro RECORD;
BEGIN
  FOR registro IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'usuarios'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%perfil%'
  LOOP
    EXECUTE format(
      'ALTER TABLE usuarios DROP CONSTRAINT %I',
      registro.conname
    );
  END LOOP;
END $$;


ALTER TABLE usuarios
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
-- 3. GARANTIR APENAS UM DIRETOR
-- ============================================================
--
-- O índice é parcial.
--
-- Portanto:
--
-- Diretor (a) = somente um registro.
--
-- Outros perfis podem existir normalmente.
--
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
  ux_usuarios_unico_diretor
ON usuarios (perfil)
WHERE perfil = 'Diretor (a)';


-- ============================================================
-- 4. GARANTIR QUE DIRETOR NÃO TENHA GERÊNCIA OU DIVISÃO
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuarios_diretor_sem_gerencia_divisao'
      AND conrelid = 'usuarios'::regclass
  ) THEN

    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_diretor_sem_gerencia_divisao
      CHECK (
        perfil <> 'Diretor (a)'
        OR (
          gerencia_sigla IS NULL
          AND gerencia_nome IS NULL
          AND divisao_nome IS NULL
        )
      );

  END IF;
END $$;


COMMIT;


-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

SELECT
  id,
  nome,
  login,
  email,
  perfil,
  status,
  diretoria_sigla,
  diretoria_nome,
  gerencia_sigla,
  gerencia_nome,
  divisao_nome
FROM usuarios
ORDER BY id;