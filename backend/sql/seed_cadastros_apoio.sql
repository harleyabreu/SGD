
-- Dados iniciais dos cadastros de apoio do SGD.
-- Seguro para reexecutar: evita duplicar os cadastros padrão.

BEGIN;

-- Clientes
INSERT INTO clientes (nome, sigla, ativo)
VALUES
  ('SEFA', 'SEFA', TRUE),
  ('PRODEPA', 'PRODEPA', TRUE),
  ('CGE', 'CGE', TRUE),
  ('SEDUC', 'SEDUC', TRUE),
  ('SEPLAD', 'SEPLAD', TRUE),
  ('SESPA', 'SESPA', TRUE)
ON CONFLICT (sigla) DO NOTHING;

-- Sistemas padrão já definidos no frontend
INSERT INTO sistemas (nome, cliente_id, ativo)
SELECT iniciais.nome, NULL, TRUE
FROM (VALUES
  ('Sistema de Contratos'),
  ('Portal da Transparência'),
  ('SIAFE'),
  ('Sistema de Demandas de TI')
) AS iniciais(nome)
WHERE NOT EXISTS (
  SELECT 1
  FROM sistemas existentes
  WHERE LOWER(existentes.nome) = LOWER(iniciais.nome)
    AND existentes.cliente_id IS NULL
);

-- Tipos de demanda padrão já definidos no frontend
INSERT INTO tipos_demanda (nome, ativo)
VALUES
  ('Erro/Incidente', TRUE),
  ('Correção', TRUE),
  ('Solicitação', TRUE),
  ('Melhoria', TRUE),
  ('Nova Funcionalidade', TRUE),
  ('Dúvida/Orientação', TRUE),
  ('Manutenção', TRUE)
ON CONFLICT (nome) DO NOTHING;

COMMIT;
