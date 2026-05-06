/**
 * Helpers monetários.
 * Regra central: NUNCA float. Banco armazena em centavos (int).
 */

/** Formata centavos como moeda BRL. Ex.: 28000 → "R$ 280,00" */
export function formatCurrency(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100)
}
