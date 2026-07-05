'use client';

import { useApp } from '@/components/providers/AppProvider';
import { getCurrencyByCode, type CurrencyInfo } from './currencies';
import { fmt } from './utils';

/** Hook that provides currency-aware formatting functions based on apartment settings. */
export function useCurrency() {
  const { apartment } = useApp();
  const currencyCode = apartment?.currency;

  const currency: CurrencyInfo = getCurrencyByCode(currencyCode);

  /** Format number with the apartment's currency symbol. */
  const format = (n: number): string => fmt(n, currencyCode);

  return {
    currency,
    currencyCode: currency.code,
    symbol: currency.symbol,
    format,
  };
}
