import test from "node:test";
import assert from "node:assert/strict";
import {
  CRITICIDADES_OFICIAIS,
  PRIORIDADES_ATENDIMENTO_OFICIAIS,
  dataISOValida,
  obterDecisaoPrazoManual,
} from "./regrasDemanda.js";

test("aceita somente as quatro Criticidades oficiais", () => {
  assert.deepEqual(
    [...CRITICIDADES_OFICIAIS],
    ["Crítica", "Alta", "Média", "Baixa"],
  );
  assert.equal(CRITICIDADES_OFICIAIS.has("Urgente"), false);
});

test("aceita somente as quatro Prioridades de Atendimento oficiais", () => {
  assert.deepEqual(
    [...PRIORIDADES_ATENDIMENTO_OFICIAIS],
    ["P1 — Imediata", "P2 — Urgente", "P3 — Normal", "P4 — Planejada"],
  );
  assert.equal(PRIORIDADES_ATENDIMENTO_OFICIAIS.has("P0 — Emergencial"), false);
});

test("valida datas reais no formato AAAA-MM-DD", () => {
  assert.equal(dataISOValida("2026-11-19"), true);
  assert.equal(dataISOValida("2026-02-29"), false);
  assert.equal(dataISOValida("19/11/2026"), false);
  assert.equal(dataISOValida("2026-13-01"), false);
});

test("reconhece a decisão de preservar o prazo manual", () => {
  const decisao = obterDecisaoPrazoManual(
    [{
      tipo: "prioridade",
      valorAnterior: "Média",
      valorNovo: "Alta",
      motivo: "Alteração solicitada. Prazo manual preservado: 2026-12-10.",
    }],
    "prioridade",
    "Média",
    "Alta",
  );

  assert.equal(decisao, "preservar");
});

test("reconhece a decisão de recalcular o prazo", () => {
  const decisao = obterDecisaoPrazoManual(
    [{
      tipo: "prioridade_atendimento",
      valorAnterior: "P3 — Normal",
      valorNovo: "P2 — Urgente",
      motivo: "Alteração solicitada. Prazo recalculado conforme SLA: 2026-11-27.",
    }],
    "prioridade_atendimento",
    "P3 — Normal",
    "P2 — Urgente",
  );

  assert.equal(decisao, "recalcular");
});

test("não aceita histórico sem correspondência exata ou sem decisão de prazo", () => {
  assert.equal(
    obterDecisaoPrazoManual(
      [{ tipo: "prioridade", valorAnterior: "Baixa", valorNovo: "Alta", motivo: "Alteração realizada." }],
      "prioridade",
      "Média",
      "Alta",
    ),
    null,
  );
});

test("não aceita motivo com decisões conflitantes", () => {
  assert.equal(
    obterDecisaoPrazoManual(
      [{
        tipo: "prioridade",
        valorAnterior: "Média",
        valorNovo: "Alta",
        motivo: "Prazo manual preservado: 2026-12-10. Prazo recalculado conforme SLA: 2026-11-27.",
      }],
      "prioridade",
      "Média",
      "Alta",
    ),
    null,
  );
});
