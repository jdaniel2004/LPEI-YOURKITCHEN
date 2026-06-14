// Funções puras de faturação do YourKitchen.
// Extraídas do POS (components/pos.jsx) para poderem ser testadas isoladamente.
// Toda a lógica de preço é VAT-inclusive: `price`/`extraPrice` já incluem IVA.

export type BillLine = {
  price: number; // preço base unitário (com IVA)
  extraPrice?: number; // soma dos extras dos modificadores selecionados (por unidade)
  qty: number; // quantidade
  vat: number; // taxa de IVA em % (ex.: 23, 13, 6)
  cancelled?: boolean; // linhas anuladas não contam para o total
};

/** Formata um valor em euros com 2 casas decimais. Ex.: 1.5 → "€1.50". */
export function fmtEur(v: number): string {
  return `€${Number(v).toFixed(2)}`;
}

/** Preço (com IVA) de uma unidade da linha, incluindo extras de modificadores. */
export function unitGross(line: BillLine): number {
  return line.price + (line.extraPrice || 0);
}

/** Total bruto (com IVA) de um pedido, ignorando as linhas anuladas. */
export function orderTotal(items: BillLine[]): number {
  return items.filter((i) => !i.cancelled).reduce((s, i) => s + unitGross(i) * i.qty, 0);
}

/**
 * Decomposição do IVA por taxa: devolve um mapa { taxa% → valor de IVA }.
 * O IVA de cada linha é `bruto − bruto / (1 + taxa/100)`. Linhas anuladas são ignoradas.
 */
export function orderVAT(items: BillLine[]): Record<number, number> {
  const map: Record<number, number> = {};
  items
    .filter((i) => !i.cancelled)
    .forEach((i) => {
      const base = unitGross(i) * i.qty;
      const vat = base - base / (1 + i.vat / 100);
      map[i.vat] = (map[i.vat] || 0) + vat;
    });
  return map;
}
