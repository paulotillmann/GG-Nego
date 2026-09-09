/**
 * Cache local (localStorage) para sugestões do campo "Alterado por".
 * Armazena os últimos nomes digitados nesta máquina/browser.
 */

const STORAGE_KEY = 'gg_nego_alterado_por_cache';
const MAX_ITEMS = 20;

/**
 * Retorna a lista de nomes cacheados (mais recente primeiro).
 */
export function getAlteradoPorCache(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/**
 * Adiciona um nome ao cache.
 * - Remove duplicatas (case-insensitive)
 * - Coloca o novo nome no topo
 * - Limita a MAX_ITEMS itens
 */
export function addToAlteradoPorCache(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const current = getAlteradoPorCache();
    const filtered = current.filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase()
    );
    const updated = [trimmed, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage indisponível ou cheio — silencia
  }
}
