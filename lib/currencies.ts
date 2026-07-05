/** Country → Currency mapping for the currency selector. */
export interface CurrencyInfo {
  code: string;       // ISO 4217 currency code
  symbol: string;     // Display symbol
  name: string;       // Currency name
  country: string;    // Country name
  flag: string;       // Emoji flag
  locale: string;     // Locale for number formatting
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh', flag: '🇧🇩', locale: 'en-BD' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', flag: '🇮🇳', locale: 'en-IN' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan', flag: '🇵🇰', locale: 'en-PK' },
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee', country: 'Nepal', flag: '🇳🇵', locale: 'ne-NP' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', country: 'Sri Lanka', flag: '🇱🇰', locale: 'si-LK' },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', country: 'Myanmar', flag: '🇲🇲', locale: 'my-MM' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea', flag: '🇰🇷', locale: 'ko-KR' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'Thailand', flag: '🇹🇭', locale: 'th-TH' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾', locale: 'ms-MY' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬', locale: 'en-SG' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia', flag: '🇮🇩', locale: 'id-ID' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', country: 'Philippines', flag: '🇵🇭', locale: 'fil-PH' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', country: 'Vietnam', flag: '🇻🇳', locale: 'vi-VN' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', country: 'United Arab Emirates', flag: '🇦🇪', locale: 'ar-AE' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', country: 'Saudi Arabia', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', country: 'Qatar', flag: '🇶🇦', locale: 'ar-QA' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', country: 'Kuwait', flag: '🇰🇼', locale: 'ar-KW' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', country: 'Bahrain', flag: '🇧🇭', locale: 'ar-BH' },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial', country: 'Oman', flag: '🇴🇲', locale: 'ar-OM' },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', country: 'Iran', flag: '🇮🇷', locale: 'fa-IR' },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', country: 'Iraq', flag: '🇮🇶', locale: 'ar-IQ' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', country: 'Israel', flag: '🇮🇱', locale: 'he-IL' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Turkey', flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound', country: 'Egypt', flag: '🇪🇬', locale: 'ar-EG' },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'Germany', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', country: 'Switzerland', flag: '🇨🇭', locale: 'de-CH' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'Sweden', flag: '🇸🇪', locale: 'sv-SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'Norway', flag: '🇳🇴', locale: 'nb-NO' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'Denmark', flag: '🇩🇰', locale: 'da-DK' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', country: 'Poland', flag: '🇵🇱', locale: 'pl-PL' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', country: 'Russia', flag: '🇷🇺', locale: 'ru-RU' },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸', locale: 'en-US' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦', locale: 'en-CA' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', country: 'Mexico', flag: '🇲🇽', locale: 'es-MX' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil', flag: '🇧🇷', locale: 'pt-BR' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', country: 'Argentina', flag: '🇦🇷', locale: 'es-AR' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', locale: 'en-AU' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'New Zealand', flag: '🇳🇿', locale: 'en-NZ' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa', flag: '🇿🇦', locale: 'en-ZA' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria', flag: '🇳🇬', locale: 'en-NG' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', country: 'Kenya', flag: '🇰🇪', locale: 'en-KE' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', country: 'Ghana', flag: '🇬🇭', locale: 'en-GH' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', country: 'Ethiopia', flag: '🇪🇹', locale: 'am-ET' },
];

/** Get currency info by code, defaults to BDT */
export function getCurrencyByCode(code: string | null | undefined): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]; // BDT default
}

/** Format number with currency symbol */
export function formatCurrency(n: number, currencyCode: string | null | undefined): string {
  const currency = getCurrencyByCode(currencyCode);
  return currency.symbol + Number(n).toLocaleString(currency.locale);
}
