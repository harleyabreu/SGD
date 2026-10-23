-- ============================================================
-- SGD - LIMPEZA SEGURA DOS REGISTROS DE TESTE DA INTEGRACAO
-- Remove somente os registros temporarios criados nos testes.
-- Registros referenciados por demandas ou outros cadastros nao
-- serao removidos, para preservar a integridade referencial.
-- ============================================================

BEGIN;

-- 1. Remover o sistema de teste, se nao estiver associado a demandas.
DELETE FROM sistemas AS s
WHERE UPPER(s.nome) LIKE 'TESTE INTEGRACAO SGD%'
  AND NOT EXISTS (
    SELECT 1
    FROM demandas AS d
    WHERE d.sistema_id = s.id
  )
RETURNING id, nome, ativo;

-- 2. Remover o cliente de teste, se nao estiver associado a demandas
--    nem usado por algum sistema.
DELETE FROM clientes AS c
WHERE (
    UPPER(c.nome) LIKE 'TESTE INTEGRACAO CLIENTES%'
    OR UPPER(COALESCE(c.sigla, '')) = 'TICSGD'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM demandas AS d
    WHERE d.cliente_id = c.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM sistemas AS s
    WHERE s.cliente_id = c.id
  )
RETURNING id, nome, sigla, ativo;

-- 3. Remover o tipo de demanda de teste, se nao estiver sendo usado.
DELETE FROM tipos_demanda AS t
WHERE UPPER(t.nome) LIKE 'TESTE INTEGRACAO TIPO SGD%'
  AND NOT EXISTS (
    SELECT 1
    FROM demandas AS d
    WHERE d.tipo_demanda_id = t.id
  )
RETURNING id, nome, ativo;

COMMIT;
