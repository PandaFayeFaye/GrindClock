export interface CurrencyDef {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "CNY", symbol: "¥", label: "人民币" },
  { code: "USD", symbol: "$", label: "美元" },
  { code: "EUR", symbol: "€", label: "欧元" },
  { code: "GBP", symbol: "£", label: "英镑" },
  { code: "AUD", symbol: "A$", label: "澳元" },
  { code: "CAD", symbol: "C$", label: "加元" },
  { code: "JPY", symbol: "¥", label: "日元" },
  { code: "KRW", symbol: "₩", label: "韩元" },
  { code: "HKD", symbol: "HK$", label: "港币" },
  { code: "SGD", symbol: "S$", label: "新加坡元" },
];

export const DEFAULT_CURRENCY = "CNY";

export function currencySymbol(code?: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? CURRENCIES[0].symbol;
}

/**
 * Sums pay per currency (never adds different currencies together -- that
 * would silently produce a meaningless number) and formats the result as
 * e.g. "¥120" when everything shares one currency, or "¥120 + $30" when an
 * employer list mixes currencies.
 */
export function formatGroupedPay(byCurrency: Map<string, number>, decimals = 0): string {
  const parts = [...byCurrency.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([code, amount]) => `${currencySymbol(code)}${amount.toFixed(decimals)}`);
  if (parts.length === 0) return `${currencySymbol(DEFAULT_CURRENCY)}0`;
  return parts.join(" + ");
}
