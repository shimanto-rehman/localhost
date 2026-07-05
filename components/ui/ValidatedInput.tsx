'use client';

import { forwardRef } from 'react';
import type { ValidationStatus } from '@/lib/hooks/useFieldValidation';

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="validated-input__spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

type ValidatedInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'status'> & {
  validationStatus?: ValidationStatus;
};

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  function ValidatedInput({ validationStatus = 'idle', className, ...props }, ref) {
    const showIcon = validationStatus === 'valid' || validationStatus === 'invalid' || validationStatus === 'checking';

    return (
      <div className="validated-input">
        <input
          ref={ref}
          className={`form-input validated-input__field${validationStatus === 'invalid' ? ' form-input--error' : ''}${className ? ` ${className}` : ''}`}
          {...props}
        />
        {showIcon && (
          <span className={`validated-input__icon validated-input__icon--${validationStatus}`} aria-live="polite">
            {validationStatus === 'valid' && <CheckIcon />}
            {validationStatus === 'invalid' && <XIcon />}
            {validationStatus === 'checking' && <SpinnerIcon />}
          </span>
        )}
      </div>
    );
  },
);
