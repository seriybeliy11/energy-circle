// Парсер кода «Честный знак» (GS1 DataMatrix): 01 + GTIN(14) + 21 + серийник.

/** Убирает управляющие символы GS1 (FNC1 / GS \x1d) и пробелы. */
export function cleanGs1String(raw: string): string {
  return raw
    .replace(/[\u001d\u001e\u0004]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export interface ParsedCode {
  gtin: string;
  serial: string;
}

/**
 * Валидирует структуру кода: 01 + 14 цифр GTIN + 21 + серийный номер (1–13 симв.).
 * Возвращает null, если код не похож на честный знак.
 */
export function parseChestnyZnak(raw: string): ParsedCode | null {
  const cleaned = cleanGs1String(raw);
  const match = /^01(\d{14})21([0-9A-Z]{1,13})/.exec(cleaned);
  if (!match) return null;
  return { gtin: match[1], serial: match[2] };
}

/** Короткая «маска» кода для отображения: 0104670033010019215HQD… */
export function maskCode(raw: string): string {
  const cleaned = cleanGs1String(raw);
  return cleaned.length > 18 ? `${cleaned.slice(0, 16)}…` : cleaned;
}

/**
 * Демо-код: валидный честный знак с GTIN выбранного вкуса
 * и уникальным серийником (каждый демо-скан — новая «банка»).
 */
export function buildDemoCode(gtin: string): string {
  const serial = `HQD${Date.now().toString().slice(-10)}`;
  return `01${gtin}21${serial}`;
}
