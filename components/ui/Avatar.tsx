import { initials, memberColor } from '@/lib/utils';
import Image from 'next/image';

export function Avatar({
  name,
  photoUrl,
  index = 0,
  size = '',
}: {
  name: string;
  photoUrl?: string | null;
  index?: number;
  size?: string;
}) {
  const cls = `avatar${size ? ` avatar--${size}` : ''}`;
  if (photoUrl) {
    return (
      <div className={cls}>
        <Image src={photoUrl} alt={name} width={40} height={40} unoptimized />
      </div>
    );
  }
  return (
    <div className={cls} style={{ background: `linear-gradient(135deg, ${memberColor(index)}, ${memberColor(index)}99)` }}>
      {initials(name)}
    </div>
  );
}
