-- ============================================================
-- SGD — MIGRAÇÃO DE INTEGRIDADE DOS SISTEMAS E PENDÊNCIAS
-- ============================================================
-- Objetivo:
--   1. Criar índice para localizar sistemas pelo nome e cliente.
--   2. Impedir mais de um período de pendência aberto por demanda.
--
-- Segurança:
--   - Não apaga nem altera demandas, usuários, anexos ou históricos.
--   - Se encontrar períodos abertos duplicados, interrompe a migração
--     informando quais demandas precisam ser corrigidas primeiro.
--   - Pode ser executada novamente após a primeira aplicação.
--
-- Execute somente depois de fazer backup do banco SGD.
-- ============================================================

BEGIN;

DO $$
DECLARE
  demandas_com_duplicidade TEXT;
BEGIN
  IF to_regclass('public.sistemas') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.sistemas não existe.';
  END IF;

  IF to_regclass('public.periodos_pendencia') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.periodos_pendencia não existe. Execute antes a migração de demandas.';
  END IF;

  SELECT string_agg(demanda_id::TEXT, ', ' ORDER BY demanda_id)
    INTO demandas_com_duplicidade
    FROM (
      SELECT demanda_id
        FROM public.periodos_pendencia
       WHERE fim IS NULL
       GROUP BY demanda_id
      HAVING COUNT(*) > 1
    ) AS duplicadas;

  IF demandas_com_duplicidade IS NOT NULL THEN
    RAISE EXCEPTION
      'Existem demandas com mais de um período de pendência aberto: %. Corrija esses casos e execute novamente a migração.',
      demandas_com_duplicidade;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.periodos_pendencia
     WHERE fim IS NOT NULL AND fim < inicio
  ) THEN
    RAISE EXCEPTION
      'Existem períodos de pendência com encerramento anterior ao início. Corrija esses registros antes de executar a migração.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sistemas_nome_cliente_busca
  ON public.sistemas (LOWER(BTRIM(nome)), cliente_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pendencias_uma_aberta_por_demanda
  ON public.periodos_pendencia (demanda_id)
  WHERE fim IS NULL;

COMMIT;
