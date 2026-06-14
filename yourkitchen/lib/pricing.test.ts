import { describe, it, expect } from "vitest";
import { fmtEur, unitGross, orderTotal, orderVAT, type BillLine } from "./pricing";

const line = (p: Partial<BillLine>): BillLine => ({ price: 0, qty: 1, vat: 23, ...p });

describe("fmtEur", () => {
  it("formata com símbolo do euro e 2 casas decimais", () => {
    expect(fmtEur(1.5)).toBe("€1.50");
    expect(fmtEur(8)).toBe("€8.00");
    expect(fmtEur(0)).toBe("€0.00");
    expect(fmtEur(10.1)).toBe("€10.10");
  });
  it("arredonda às 2 casas", () => {
    expect(fmtEur(2.999)).toBe("€3.00");
    expect(fmtEur(1.239)).toBe("€1.24");
  });
});

describe("unitGross", () => {
  it("soma o preço base com o extra do modificador", () => {
    expect(unitGross(line({ price: 8, extraPrice: 1.5 }))).toBe(9.5);
  });
  it("trata extraPrice em falta como 0", () => {
    expect(unitGross(line({ price: 8 }))).toBe(8);
  });
});

describe("orderTotal", () => {
  it("devolve 0 para um pedido vazio", () => {
    expect(orderTotal([])).toBe(0);
  });
  it("soma preço × quantidade", () => {
    expect(orderTotal([line({ price: 8, qty: 2 })])).toBe(16);
  });
  it("inclui os extras dos modificadores", () => {
    expect(orderTotal([line({ price: 8, extraPrice: 1.5, qty: 2 })])).toBe(19);
  });
  it("ignora as linhas anuladas", () => {
    const items = [line({ price: 8, qty: 1 }), line({ price: 5, qty: 2, cancelled: true })];
    expect(orderTotal(items)).toBe(8);
  });
  it("soma várias linhas", () => {
    const items = [line({ price: 8, qty: 1 }), line({ price: 1.5, qty: 3 }), line({ price: 2, qty: 2 })];
    expect(orderTotal(items)).toBe(8 + 4.5 + 4);
  });
});

describe("orderVAT", () => {
  it("calcula o IVA de uma linha a 23%", () => {
    const map = orderVAT([line({ price: 8, qty: 1, vat: 23 })]);
    expect(map[23]).toBeCloseTo(8 - 8 / 1.23, 6); // ≈ 1.4959
  });
  it("agrega o IVA de várias linhas com a mesma taxa", () => {
    const map = orderVAT([line({ price: 8, vat: 23 }), line({ price: 2, vat: 23 })]);
    expect(map[23]).toBeCloseTo(10 - 10 / 1.23, 6);
  });
  it("separa o IVA por taxa", () => {
    const map = orderVAT([line({ price: 8, vat: 23 }), line({ price: 3.5, vat: 6 })]);
    expect(Object.keys(map).sort()).toEqual(["23", "6"]);
    expect(map[6]).toBeCloseTo(3.5 - 3.5 / 1.06, 6);
  });
  it("ignora linhas anuladas no cálculo do IVA", () => {
    const map = orderVAT([line({ price: 8, vat: 23 }), line({ price: 100, vat: 23, cancelled: true })]);
    expect(map[23]).toBeCloseTo(8 - 8 / 1.23, 6);
  });
  it("invariante: total bruto = líquido + soma do IVA", () => {
    const items = [line({ price: 8, qty: 2, vat: 23 }), line({ price: 3.5, qty: 1, vat: 6 }), line({ price: 2, qty: 3, vat: 13 })];
    const total = orderTotal(items);
    const vatSum = Object.values(orderVAT(items)).reduce((s, v) => s + v, 0);
    const net = items.reduce((s, i) => s + (unitGross(i) * i.qty) / (1 + i.vat / 100), 0);
    expect(net + vatSum).toBeCloseTo(total, 6);
  });
});
