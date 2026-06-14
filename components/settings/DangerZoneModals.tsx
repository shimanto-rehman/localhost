'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';

export type DangerActionId =
  | 'unlock-month'
  | 'reset-bills'
  | 'reset-meals'
  | 'reset-all'
  | 'delete-apartment';

type DangerActionConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  passwordTitle: string;
  passwordDescription: string;
  submitLabel: string;
};

const ACTION_CONFIG: Record<DangerActionId, DangerActionConfig> = {
  'unlock-month': {
    title: 'Unlock bill month?',
    description: 'This removes the lock on the selected month so the electricity bill can be edited again.',
    confirmLabel: 'Continue',
    passwordTitle: 'Confirm with apartment password',
    passwordDescription: 'Enter your apartment password to unlock this month.',
    submitLabel: 'Unlock Month',
  },
  'reset-bills': {
    title: 'Reset all bill data?',
    description: 'This clears all monthly electricity entries. Your apartment configuration will be kept. This cannot be undone.',
    confirmLabel: 'Continue',
    passwordTitle: 'Confirm reset all bill data',
    passwordDescription: 'Enter your apartment password to clear all bill data.',
    submitLabel: 'Reset All Bill Data',
  },
  'reset-meals': {
    title: 'Reset all meals?',
    description: 'This clears all meal records and shopping entries for every month. This cannot be undone.',
    confirmLabel: 'Continue',
    passwordTitle: 'Confirm reset all meals',
    passwordDescription: 'Enter your apartment password to clear all meal data.',
    submitLabel: 'Reset All Meals',
  },
  'reset-all': {
    title: 'Reset everything?',
    description: 'This wipes all members, bills, meals, expenses, and configuration. Only your admin account will be recreated.',
    confirmLabel: 'Continue',
    passwordTitle: 'Confirm with apartment password',
    passwordDescription: 'Enter your apartment password to reset everything.',
    submitLabel: 'Reset All',
  },
  'delete-apartment': {
    title: 'Delete apartment permanently?',
    description: 'This removes the apartment, all members, and every record. You will need to register again.',
    confirmLabel: 'Continue',
    passwordTitle: 'Confirm with apartment password',
    passwordDescription: 'Enter your apartment password to permanently delete this apartment.',
    submitLabel: 'Delete Apartment',
  },
};

export function DangerZoneModals({
  action,
  apartmentName,
  loading,
  onClose,
  onConfirmPassword,
}: {
  action: DangerActionId | null;
  apartmentName?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirmPassword: (password: string) => void | Promise<void>;
}) {
  const [step, setStep] = useState<'confirm' | 'password'>('confirm');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (action) {
      setStep('confirm');
      setPassword('');
    }
  }, [action]);

  const reset = () => {
    setStep('confirm');
    setPassword('');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  if (!action) return null;

  const config = ACTION_CONFIG[action];
  const description = action === 'delete-apartment' && apartmentName
    ? config.description.replace('the apartment', `"${apartmentName}"`)
    : config.description;

  if (step === 'confirm') {
    return (
      <ConfirmDialog
        open
        onClose={handleClose}
        onConfirm={() => setStep('password')}
        title={config.title}
        description={description}
        confirmLabel={config.confirmLabel}
        cancelLabel="Cancel"
        variant="danger"
      />
    );
  }

  return (
    <ModalBackdrop open onClose={handleClose}>
      <div className="modal modal--form" role="alertdialog" aria-labelledby="danger-password-title">
        <h2 id="danger-password-title" className="modal__title">{config.passwordTitle}</h2>
        <p className="modal__sub">{config.passwordDescription}</p>
        <div className="modal__form">
          <div className="modal__field">
            <label className="form-label" htmlFor="dangerZonePassword">Apartment Password</label>
            <input
              className="form-input"
              id="dangerZonePassword"
              type="password"
              placeholder="Enter apartment password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password.trim() && !loading) {
                  void onConfirmPassword(password);
                }
              }}
            />
          </div>
        </div>
        <div className="modal__actions">
          <button className="btn btn-ghost btn-sm" type="button" disabled={loading} onClick={() => { setStep('confirm'); setPassword(''); }}>
            Back
          </button>
          <button
            className="btn btn-danger btn-sm"
            type="button"
            disabled={loading || !password.trim()}
            onClick={() => onConfirmPassword(password)}
          >
            {loading ? 'Please wait…' : config.submitLabel}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
