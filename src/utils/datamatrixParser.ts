/**
 * Парсер GS1 DataMatrix-кодов "Честный знак" с банок HQD Energy.
 * Чистая логика без side-effect'ов: нормализация сырой строки со сканера,
 * структурная валидация (GTIN 01 + серийник 21) и защита от повторного
 * обналичивания одной и той же банки.
 */

import type { ParsedDatamatrix } from '@/api/types';

/** Универсальный GS1-префикс: идентификатор применения 01 = GTIN-14. */
const GTIN_PREFIX_RE = /^01(\d{14})21(.+)$/;
/** Серийный номер: 1..20 алфанумерических символов. */
const SERIAL_RE = /^[A-Za-z0-9]{1,20}$/;
/** GTIN демо-партии, которую гоняет Самокат. */
const SAMOKAT_GTIN = '04670033010015';

export interface ScanCodeInfo {
  /** Нормализованная строка кода (без GS/FNC1, без пробелов). */
  code: string;
  /** GTIN-14, 14 цифр. */
  gtin: string;
  /** Серийная часть кода. */
  serial: string;
  /** Признак демонстрационной партии Самоката. */
  isSamokatBatch: boolean;
}

/** Убирает GS-разделитель \x1d, литеральный FNC1 и обрезает пробелы. */
export function cleanGs1String(raw: string): string {
  return raw
    .replace(/\x1d/g, '')
    .replace(/FNC1/g, '')
    .trim();
}

/**
 * Разбирает и валидирует сырой код DataMatrix.
 * Порядок проверок: формат -> повторное использование.
 */
export function parseDatamatrix(rawCode: string, usedCodes: string[]): ParsedDatamatrix {
  const code = cleanGs1String(rawCode);

  const match = GTIN_PREFIX_RE.exec(code);
  if (!match) {
    return {
      valid: false,
      reason: 'BAD_FORMAT',
      message: 'Это не код Честного знака. Нужен квадратный DataMatrix с банки HQD Energy',
    };
  }

  const gtin = match[1];
  const serial = match[2];
  if (!SERIAL_RE.test(serial)) {
    return {
      valid: false,
      reason: 'BAD_FORMAT',
      message: 'Это не код Честного знака. Нужен квадратный DataMatrix с банки HQD Energy',
    };
  }

  if (usedCodes.includes(code)) {
    return {
      valid: false,
      reason: 'ALREADY_USED',
      message: 'Эта банка уже обналичена! Возьми свежую в Самокате',
    };
  }

  return {
    valid: true,
    gtin,
    serial,
    isSamokatBatch: serial.startsWith('HQD') || gtin === SAMOKAT_GTIN,
  };
}

/** Генерирует валидный демо-код Честного знака (партия Самоката). */
export function generateDemoCode(): string {
  return `0104670033010015215HQD${Date.now()}`;
}
