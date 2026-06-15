'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/providers/ToastProvider';
import { useApp } from '@/components/providers/AppProvider';
import { MEMBER_PHOTO_ACCEPT, readMemberPhotoFile } from '@/lib/member-photo';
import { isValidEmail, isValidNid, isValidPhone, sanitizeText } from '@/lib/sanitize';

export type ProfileContact = {
  name: string;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  nid?: string | null;
};

function ProfileField({
  label,
  name,
  type = 'text',
  required,
  optional,
  fullWidth,
  placeholder,
  pattern,
  error,
  children,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  optional?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  pattern?: string;
  error?: string;
  children?: React.ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={`auth-field${fullWidth ? ' auth-field--full' : ''}`}>
      <label className="form-label" htmlFor={name}>
        {label}
        {optional ? <span className="form-label-optional"> optional</span> : null}
      </label>
      {children || (
        <input
          className={`form-input${error ? ' form-input--error' : ''}`}
          id={name}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          pattern={pattern}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      )}
      {error ? <span className="form-error">{error}</span> : <span className="auth-field__spacer" />}
    </div>
  );
}

function validateField(name: string, value: string, all: Record<string, string>): string | undefined {
  switch (name) {
    case 'name':
      if (sanitizeText(value, 80).length < 2) return 'Name must be at least 2 characters';
      return undefined;
    case 'nid':
      if (!isValidNid(value)) return 'NID must be 10 or 17 digits';
      return undefined;
    case 'phone':
      if (!value || !isValidPhone(value)) return 'Enter a valid mobile number';
      return undefined;
    case 'email':
      if (!value || !isValidEmail(value)) return 'Enter a valid email address';
      return undefined;
    default:
      return undefined;
  }
}

export function ProfileEditModal({
  open,
  onClose,
  onSaved,
  initial,
  memberIndex,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: ProfileContact;
  memberIndex: number;
}) {
  const { toast } = useToast();
  const { currentMember, setCurrentMember, refreshMembers } = useApp();
  const photoRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial.name || '');
    setEmail(initial.email || '');
    setNid(initial.nid && initial.nid !== '****' ? initial.nid : '');
    setPhone(initial.phone || '');
    setPhotoUrl(initial.photoUrl ?? null);
    setErrors({});
  }, [open, initial]);

  const setFieldError = useCallback((field: string, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }, []);

  const handlePhoneChange = (fullPhone: string, isValid: boolean) => {
    setPhone(fullPhone);
    if (errors.phone || fullPhone) {
      setFieldError('phone', isValid ? undefined : 'Enter a valid mobile number');
    }
  };

  const handlePhoto = async (file: File) => {
    const result = await readMemberPhotoFile(file);
    if ('error' in result) {
      toast(result.error, 'error');
      if (photoRef.current) photoRef.current.value = '';
      return;
    }
    setPhotoUrl(result.dataUrl);
  };

  const handleSave = async () => {
    const values = { name, email, phone, nid };
    const nextErrors: Record<string, string> = {};
    (['name', 'email', 'phone', 'nid'] as const).forEach((f) => {
      const err = validateField(f, values[f], values);
      if (err) nextErrors[f] = err;
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast('Please fix the highlighted fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sanitizeText(name, 80),
          email,
          phone,
          nid: nid || '',
          photoUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields || {});
        toast(data.error || 'Could not save profile', 'error');
        return;
      }

      setCurrentMember({
        ...currentMember!,
        id: data.id,
        name: data.name,
        photoUrl: data.photoUrl,
        email: data.email,
        phone: data.phone,
      });
      await refreshMembers();
      toast('Profile updated');
      onSaved();
      onClose();
    } catch {
      toast('Could not connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop open={open} onClose={loading ? undefined : onClose}>
      <div className="modal modal--form modal--profile-edit" role="dialog" aria-labelledby="profile-edit-title">
        <h2 id="profile-edit-title" className="modal__title">Edit profile</h2>
        <p className="modal__sub">Same details as apartment registration — used for bills and password reset.</p>

        <div className="profile-edit-photo">
          <label className="profile-edit-photo__label" style={{ cursor: 'pointer' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="" className="profile-edit-photo__img" />
            ) : (
              <Avatar name={name || '?'} index={memberIndex} size="lg" />
            )}
            <span className="profile-edit-photo__badge" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            <input
              ref={photoRef}
              type="file"
              accept={MEMBER_PHOTO_ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePhoto(file);
                e.target.value = '';
              }}
            />
          </label>
          <div className="profile-edit-photo__hint">
            <span className="profile-edit-photo__title">Profile photo</span>
            <span className="profile-edit-photo__meta">Optional · JPG, PNG or WebP · max 200KB</span>
          </div>
        </div>

        <section className="auth-section profile-edit-section">
          <h3 className="auth-section__title">Your details</h3>
          <div className="auth-grid auth-grid--2">
            <ProfileField
              label="Full Name"
              name="profile_name"
              required
              value={name}
              error={errors.name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setFieldError('name', validateField('name', e.target.value, { name: e.target.value }));
              }}
              onBlur={(e) => setFieldError('name', validateField('name', e.target.value, { name: e.target.value }))}
            />
            <ProfileField
              label="NID Number"
              name="profile_nid"
              optional
              placeholder="10 or 17 digits"
              pattern="(\d{10}|\d{17})"
              value={nid}
              error={errors.nid}
              onChange={(e) => {
                setNid(e.target.value);
                if (errors.nid) setFieldError('nid', validateField('nid', e.target.value, {}));
              }}
              onBlur={(e) => setFieldError('nid', validateField('nid', e.target.value, {}))}
            />
            <ProfileField
              label="Phone"
              name="profile_phone"
              required
              fullWidth
              error={errors.phone}
            >
              <PhoneInput
                key={`phone-${open}-${initial.phone || ''}`}
                name="profile_phone"
                required
                defaultValue={phone || initial.phone || ''}
                error={errors.phone}
                onChange={handlePhoneChange}
              />
            </ProfileField>
            <ProfileField
              label="Email"
              name="profile_email"
              type="email"
              required
              fullWidth
              value={email}
              error={errors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setFieldError('email', validateField('email', e.target.value, {}));
              }}
              onBlur={(e) => setFieldError('email', validateField('email', e.target.value, {}))}
            />
          </div>
        </section>

        <div className="modal__actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
