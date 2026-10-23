-- ============================================================
-- SGD - MIGRAÇÃO PARA PERSISTÊNCIA COMPLETA DAS DEMANDAS
-- Execute uma única vez no banco sgd.
-- Preserva as demandas existentes e os vínculos já cadastrados.
-- ============================================================

BEGIN;

-- O sistema atual mantém a lista de usuários no navegador.
-- Os nomes ficam gravados mesmo quando ainda não há usuário correspondente no PostgreSQL.
ALTER TABLE demandas
    ALTER COLUMN responsavel_id DROP NOT NULL;

ALTER TABLE demandas
    ADD COLUMN IF NOT EXISTS sistema_nome TEXT,
    ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
    ADD COLUMN IF NOT EXISTS usuario_criacao_nome TEXT,
    ADD COLUMN IF NOT EXISTS usuario_conclusao_nome TEXT,
    ADD COLUMN IF NOT EXISTS usuario_reabertura_nome TEXT;

-- Recupera os nomes dos registros antigos ligados por FK.
UPDATE demandas d
SET sistema_nome = s.nome
FROM sistemas s
WHERE d.sistema_id = s.id
  AND COALESCE(BTRIM(d.sistema_nome), '') = '';

UPDATE demandas d
SET responsavel_nome = u.nome
FROM usuarios u
WHERE d.responsavel_id = u.id
  AND COALESCE(BTRIM(d.responsavel_nome), '') = '';

UPDATE demandas d
SET usuario_criacao_nome = u.nome
FROM usuarios u
WHERE d.usuario_criacao_id = u.id
  AND COALESCE(BTRIM(d.usuario_criacao_nome), '') = '';

UPDATE demandas d
SET usuario_conclusao_nome = u.nome
FROM usuarios u
WHERE d.usuario_conclusao_id = u.id
  AND COALESCE(BTRIM(d.usuario_conclusao_nome), '') = '';

UPDATE demandas d
SET usuario_reabertura_nome = u.nome
FROM usuarios u
WHERE d.usuario_reabertura_id = u.id
  AND COALESCE(BTRIM(d.usuario_reabertura_nome), '') = '';

CREATE INDEX IF NOT EXISTS idx_demandas_responsavel_nome
    ON demandas (responsavel_nome);

COMMIT;
