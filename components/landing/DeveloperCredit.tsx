'use client';

import { useState } from 'react';
import Image from 'next/image';
import { DEVELOPER } from '@/lib/constants';
import { initials } from '@/lib/utils';

export function DeveloperCredit() {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <section className="lp-dev-credit" aria-label="Developer">
      <div className="lp-container lp-dev-credit__inner">
        <div className="lp-dev-credit__card">
          <div className="lp-dev-credit__photo">
            {photoFailed ? (
              <span className="lp-dev-credit__initials">{initials(DEVELOPER.name)}</span>
            ) : (
              <Image
                src={DEVELOPER.photoSrc}
                alt={DEVELOPER.name}
                width={72}
                height={72}
                unoptimized
                onError={() => setPhotoFailed(true)}
              />
            )}
          </div>
          <div className="lp-dev-credit__text">
            <p className="lp-dev-credit__label">Built by</p>
            <p className="lp-dev-credit__name">{DEVELOPER.name}</p>
            <p className="lp-dev-credit__role">{DEVELOPER.role}</p>
            <p className="lp-dev-credit__bio">{DEVELOPER.bio}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
