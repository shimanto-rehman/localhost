import { localeToCountryCode, localeToFlagImageUrl } from '@/lib/flag-emoji';

export function FlagEmoji({
  locale,
  className = '',
  width = 22,
}: {
  locale: string;
  className?: string;
  width?: number;
}) {
  const src = localeToFlagImageUrl(locale, 'w40');
  const src2x = localeToFlagImageUrl(locale, 'w80');
  const cc = localeToCountryCode(locale);
  const height = Math.round(width * 0.72);

  if (!src) {
    return <span className={`country-flag country-flag--empty${className ? ` ${className}` : ''}`} aria-hidden />;
  }

  return (
    <img
      src={src}
      srcSet={src2x ? `${src2x} 2x` : undefined}
      width={width}
      height={height}
      alt=""
      className={`country-flag${className ? ` ${className}` : ''}`}
      loading="lazy"
      decoding="async"
      data-country={cc}
    />
  );
}
