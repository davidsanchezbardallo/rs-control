/**
 * Construye un filtro "OR ilike" seguro para PostgREST a partir de texto del usuario.
 * Elimina caracteres con significado especial en la sintaxis de filtros.
 */
export function ilikeAny(fields: string[], query: string): string {
  const term = query.replace(/[%,()*\\:."']/g, " ").trim().slice(0, 80);
  return fields.map((f) => `${f}.ilike.%${term}%`).join(",");
}
