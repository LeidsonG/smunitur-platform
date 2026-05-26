/**
 * Gera um slug seguro a partir de um texto livre (ex.: nome de linha).
 *
 * Regras:
 *   - tudo em minúsculas
 *   - remove acentos (NFD + strip de combining marks)
 *   - troca qualquer caractere não alfanumérico por hífen
 *   - tira hífens nas pontas
 *
 * Exemplos:
 *   gerarSlug('Camisetas Polo')   → 'camisetas-polo'
 *   gerarSlug('Jaleco — Médico')  → 'jaleco-medico'
 *   gerarSlug('  --Avental--  ')  → 'avental'
 */
export function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
