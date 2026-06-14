export type CountryDial = {
  code: string;
  dial: string;
  flag: string;
  label: string;
  digitCount: number;
  groups?: number[];
};

function defaultGroups(digitCount: number): number[] {
  switch (digitCount) {
    case 5: return [2, 3];
    case 6: return [3, 3];
    case 7: return [3, 4];
    case 8: return [4, 4];
    case 9: return [3, 3, 3];
    case 10: return [3, 3, 4];
    case 11: return [3, 4, 4];
    case 12: return [4, 4, 4];
    default: return [digitCount];
  }
}

function c(
  code: string,
  dial: string,
  flag: string,
  label: string,
  digitCount: number,
  groups?: number[],
): CountryDial {
  return { code, dial, flag, label, digitCount, groups: groups ?? defaultGroups(digitCount) };
}

/** Bangladesh first, then neighbors, South Asia, SE Asia, MENA, popular global. */
export const PHONE_COUNTRIES: CountryDial[] = [
  // Bangladesh & immediate neighbors
  c('BD', '+880', '🇧🇩', 'Bangladesh', 10, [4, 3, 3]),
  c('IN', '+91', '🇮🇳', 'India', 10, [5, 5]),
  c('PK', '+92', '🇵🇰', 'Pakistan', 10),
  c('NP', '+977', '🇳🇵', 'Nepal', 10),
  c('BT', '+975', '🇧🇹', 'Bhutan', 8),
  c('LK', '+94', '🇱🇰', 'Sri Lanka', 9),
  c('MV', '+960', '🇲🇻', 'Maldives', 7),
  c('MM', '+95', '🇲🇲', 'Myanmar', 10),
  c('AF', '+93', '🇦🇫', 'Afghanistan', 9),

  // South & East Asia
  c('CN', '+86', '🇨🇳', 'China', 11),
  c('JP', '+81', '🇯🇵', 'Japan', 10),
  c('KR', '+82', '🇰🇷', 'South Korea', 10),
  c('TH', '+66', '🇹🇭', 'Thailand', 9),
  c('MY', '+60', '🇲🇾', 'Malaysia', 10),
  c('SG', '+65', '🇸🇬', 'Singapore', 8),
  c('ID', '+62', '🇮🇩', 'Indonesia', 11),
  c('PH', '+63', '🇵🇭', 'Philippines', 10),
  c('VN', '+84', '🇻🇳', 'Vietnam', 9),
  c('KH', '+855', '🇰🇭', 'Cambodia', 9),
  c('LA', '+856', '🇱🇦', 'Laos', 10),
  c('BN', '+673', '🇧🇳', 'Brunei', 7),
  c('HK', '+852', '🇭🇰', 'Hong Kong', 8),
  c('TW', '+886', '🇹🇼', 'Taiwan', 9),
  c('MO', '+853', '🇲🇴', 'Macau', 8),
  c('MN', '+976', '🇲🇳', 'Mongolia', 8),

  // Middle East & North Africa
  c('AE', '+971', '🇦🇪', 'United Arab Emirates', 9, [2, 3, 4]),
  c('SA', '+966', '🇸🇦', 'Saudi Arabia', 9),
  c('QA', '+974', '🇶🇦', 'Qatar', 8),
  c('KW', '+965', '🇰🇼', 'Kuwait', 8),
  c('BH', '+973', '🇧🇭', 'Bahrain', 8),
  c('OM', '+968', '🇴🇲', 'Oman', 8),
  c('IR', '+98', '🇮🇷', 'Iran', 10),
  c('IQ', '+964', '🇮🇶', 'Iraq', 10),
  c('IL', '+972', '🇮🇱', 'Israel', 9),
  c('JO', '+962', '🇯🇴', 'Jordan', 9),
  c('LB', '+961', '🇱🇧', 'Lebanon', 8),
  c('TR', '+90', '🇹🇷', 'Turkey', 10),
  c('EG', '+20', '🇪🇬', 'Egypt', 10),
  c('MA', '+212', '🇲🇦', 'Morocco', 9),
  c('DZ', '+213', '🇩🇿', 'Algeria', 9),
  c('TN', '+216', '🇹🇳', 'Tunisia', 8),
  c('LY', '+218', '🇱🇾', 'Libya', 9),
  c('YE', '+967', '🇾🇪', 'Yemen', 9),

  // Europe (popular)
  c('GB', '+44', '🇬🇧', 'United Kingdom', 10, [4, 6]),
  c('DE', '+49', '🇩🇪', 'Germany', 11),
  c('FR', '+33', '🇫🇷', 'France', 9),
  c('IT', '+39', '🇮🇹', 'Italy', 10),
  c('ES', '+34', '🇪🇸', 'Spain', 9),
  c('NL', '+31', '🇳🇱', 'Netherlands', 9),
  c('BE', '+32', '🇧🇪', 'Belgium', 9),
  c('CH', '+41', '🇨🇭', 'Switzerland', 9),
  c('SE', '+46', '🇸🇪', 'Sweden', 9),
  c('NO', '+47', '🇳🇴', 'Norway', 8),
  c('DK', '+45', '🇩🇰', 'Denmark', 8),
  c('PL', '+48', '🇵🇱', 'Poland', 9),
  c('RU', '+7', '🇷🇺', 'Russia', 10),
  c('UA', '+380', '🇺🇦', 'Ukraine', 9),
  c('PT', '+351', '🇵🇹', 'Portugal', 9),
  c('IE', '+353', '🇮🇪', 'Ireland', 9),
  c('AT', '+43', '🇦🇹', 'Austria', 10),
  c('GR', '+30', '🇬🇷', 'Greece', 10),

  // Americas
  c('US', '+1', '🇺🇸', 'United States', 10, [3, 3, 4]),
  c('CA', '+1', '🇨🇦', 'Canada', 10, [3, 3, 4]),
  c('MX', '+52', '🇲🇽', 'Mexico', 10),
  c('BR', '+55', '🇧🇷', 'Brazil', 11),
  c('AR', '+54', '🇦🇷', 'Argentina', 10),
  c('CO', '+57', '🇨🇴', 'Colombia', 10),
  c('CL', '+56', '🇨🇱', 'Chile', 9),

  // Africa
  c('ZA', '+27', '🇿🇦', 'South Africa', 9),
  c('NG', '+234', '🇳🇬', 'Nigeria', 10),
  c('KE', '+254', '🇰🇪', 'Kenya', 9),
  c('GH', '+233', '🇬🇭', 'Ghana', 9),
  c('ET', '+251', '🇪🇹', 'Ethiopia', 9),
  c('TZ', '+255', '🇹🇿', 'Tanzania', 9),
  c('UG', '+256', '🇺🇬', 'Uganda', 9),
  c('SN', '+221', '🇸🇳', 'Senegal', 9),

  // Oceania
  c('AU', '+61', '🇦🇺', 'Australia', 9),
  c('NZ', '+64', '🇳🇿', 'New Zealand', 9),
  c('FJ', '+679', '🇫🇯', 'Fiji', 7),
];

const BY_DIAL_LONGEST = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export function findCountryByCode(code: string): CountryDial {
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? PHONE_COUNTRIES[0];
}

export function emptyPhoneDigits(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

export function isValidPhoneForCountry(fullPhone: string, country: CountryDial): boolean {
  if (!fullPhone.startsWith(country.dial)) return false;
  const local = fullPhone.slice(country.dial.length);
  if (local.length !== country.digitCount || !/^\d+$/.test(local)) return false;
  if (country.code === 'BD') return /^1\d{9}$/.test(local);
  return true;
}

export function isValidInternationalPhone(fullPhone: string): boolean {
  if (!/^\+\d{8,15}$/.test(fullPhone)) return false;
  for (const country of BY_DIAL_LONGEST) {
    if (fullPhone.startsWith(country.dial)) {
      return isValidPhoneForCountry(fullPhone, country);
    }
  }
  return false;
}

export function parseStoredPhone(value: string): { country: CountryDial; digits: string[] } {
  const digitsOnly = value.replace(/\D/g, '');

  for (const country of BY_DIAL_LONGEST) {
    const dialDigits = country.dial.replace(/\D/g, '');
    if (digitsOnly.startsWith(dialDigits)) {
      const local = digitsOnly.slice(dialDigits.length, dialDigits.length + country.digitCount);
      const digits = emptyPhoneDigits(country.digitCount);
      for (let i = 0; i < local.length && i < country.digitCount; i++) {
        digits[i] = local[i];
      }
      return { country, digits };
    }
  }

  const bd = PHONE_COUNTRIES[0];
  let local = digitsOnly;
  if (local.startsWith('880')) local = local.slice(3);
  if (local.startsWith('0') && local.length === 11) local = local.slice(1);
  const digits = emptyPhoneDigits(bd.digitCount);
  for (let i = 0; i < local.length && i < bd.digitCount; i++) {
    digits[i] = local[i];
  }
  return { country: bd, digits };
}

export function groupDigitIndices(country: CountryDial): number[][] {
  const groups = country.groups ?? defaultGroups(country.digitCount);
  const result: number[][] = [];
  let offset = 0;
  for (const size of groups) {
    result.push(Array.from({ length: size }, (_, i) => offset + i));
    offset += size;
  }
  return result;
}
