/** Extract country code from locale string (e.g. en-BD → BD). */
export function localeToCountryCode(locale: string): string {
  const part = locale.split('-')[1];
  return part ? part.toUpperCase() : '';
}

/** Flag CDN image URL — works on Windows (unlike emoji flags). */
export function flagImageUrl(countryCode: string, width: 'w20' | 'w40' | 'w80' = 'w40'): string {
  const code = countryCode.toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return '';
  return `https://flagcdn.com/${width}/${code}.png`;
}

export function localeToFlagImageUrl(locale: string, width: 'w20' | 'w40' | 'w80' = 'w40'): string {
  const cc = localeToCountryCode(locale);
  return cc ? flagImageUrl(cc, width) : '';
}
