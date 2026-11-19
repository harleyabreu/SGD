export const CRITICIDADES_OFICIAIS = new Set<string>([
  "Crítica",
  "Alta",
  "Média",
  "Baixa",
]);

export const PRIORIDADES_ATENDIMENTO_OFICIAIS = new Set<string>([
  "P1 — Imediata",
  "P2 — Urgente",
  "P3 — Normal",
  "P4 — Planejada",
]);

export type DecisaoPrazoManual = "preservar" | "recalcular";

export type EventoHistoricoDemanda = Record<string, unknown>;

export function dataISOValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

/**
 * Confirma que o histórico registra a decisão explícita do Gestor para um
 * campo alterado em uma demanda cujo prazo foi definido manualmente.
 */
export function obterDecisaoPrazoManual(
  historico: EventoHistoricoDemanda[],
  tipoEsperado: string,
  valorAnteriorEsperado: string,
  valorNovoEsperado: string,
): DecisaoPrazoManual | null {
  const evento = historico.find((registro) => {
    const motivo = texto(registro.motivo);
    return (
      texto(registro.tipo) === tipoEsperado &&
      texto(registro.valorAnterior) === valorAnteriorEsperado &&
      texto(registro.valorNovo) === valorNovoEsperado &&
      (motivo.includes("Prazo manual preservado:") ||
        motivo.includes("Prazo recalculado conforme SLA:"))
    );
  });

  if (!evento) return null;

  const motivo = texto(evento.motivo);
  const preservou = motivo.includes("Prazo manual preservado:");
  const recalculou = motivo.includes("Prazo recalculado conforme SLA:");

  if (preservou === recalculou) return null;
  return preservou ? "preservar" : "recalcular";
}
