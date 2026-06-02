// Arredondamentos monetários/horas usados em vários serviços (financeiro,
// relatórios, dashboard). Centralizado para evitar redefinições duplicadas.
export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const round2 = (n: number): number => Math.round(n * 100) / 100;
