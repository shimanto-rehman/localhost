'use client';

import { memo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Ambient } from '@/components/layout/Ambient';
import { useToast } from '@/components/providers/ToastProvider';
import { LOGO_SRC } from '@/lib/constants';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import {
  isValidEmail,
  isValidNid,
  isValidPhone,
  sanitizeText,
  validateApartmentPassword,
} from '@/lib/sanitize';

const StableAmbient = memo(Ambient);

function AuthField({
  label,
  name,
  type = 'text',
  required,
  optional,
  fullWidth,
  placeholder,
  pattern,
  minLength,
  min,
  max,
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
  minLength?: number;
  min?: number;
  max?: number;
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
          minLength={minLength}
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      )}
      {error ? <span className="form-error">{error}</span> : <span className="auth-field__spacer" />}
    </div>
  );
}

function validateRegisterField(name: string, value: string, allValues: Record<string, string>): string | undefined {
  switch (name) {
    case 'apt_name': {
      const v = sanitizeText(value, 80);
      if (v.length < 2) return 'Apartment name must be at least 2 characters';
      return undefined;
    }
    case 'apt_password': {
      return validateApartmentPassword(value) || undefined;
    }
    case 'apt_password_confirm': {
      if (value !== allValues.apt_password) return 'Passwords do not match';
      return undefined;
    }
    case 'address_road':
    case 'address_city': {
      if (sanitizeText(value).length < 2) return 'Must be at least 2 characters';
      return undefined;
    }
    case 'address_postal': {
      const v = sanitizeText(value, 10);
      if (v.length < 4 || v.length > 10) return 'Postal code must be 4–10 characters';
      return undefined;
    }
    case 'registrant_name': {
      if (sanitizeText(value, 80).length < 2) return 'Name must be at least 2 characters';
      return undefined;
    }
    case 'registrant_nid': {
      if (!isValidNid(value)) return 'NID must be 10 or 17 digits';
      return undefined;
    }
    case 'registrant_phone': {
      if (!value || !isValidPhone(value)) return 'Enter a valid mobile number';
      return undefined;
    }
    case 'registrant_email': {
      if (!value || !isValidEmail(value)) return 'Enter a valid email address';
      return undefined;
    }
    default:
      return undefined;
  }
}

function validateSignInField(name: string, value: string): string | undefined {
  if (name === 'identifier' && !sanitizeText(value)) return 'Apartment name or ID is required';
  if (name === 'password') {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
  }
  if (name === 'email' && value && !isValidEmail(value)) return 'Enter a valid email address';
  return undefined;
}

export function AuthLanding() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [signinView, setSigninView] = useState<'login' | 'forgot'>('login');
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registerValues, setRegisterValues] = useState<Record<string, string>>({});
  const [signinValues, setSigninValues] = useState<Record<string, string>>({});
  const [phoneValue, setPhoneValue] = useState('');

  const setFieldError = useCallback((field: string, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }, []);

  const handleRegisterBlur = (name: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegisterValues((prev) => ({ ...prev, [name]: value }));
    const err = validateRegisterField(name, value, { ...registerValues, [name]: value });
    setFieldError(name, err);
  };

  const handleRegisterChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegisterValues((prev) => {
      const next = { ...prev, [name]: value };
      if (errors[name]) {
        const err = validateRegisterField(name, value, next);
        setFieldError(name, err);
      }
      if (name === 'apt_password' && (errors.apt_password_confirm || registerValues.apt_password_confirm)) {
        const confirmErr = validateRegisterField('apt_password_confirm', next.apt_password_confirm || '', next);
        setFieldError('apt_password_confirm', confirmErr);
      }
      return next;
    });
  };

  const handlePhoneChange = (fullPhone: string, isValid: boolean) => {
    setPhoneValue(fullPhone);
    setRegisterValues((prev) => ({ ...prev, registrant_phone: fullPhone }));
    if (errors.registrant_phone || fullPhone) {
      setFieldError('registrant_phone', isValid ? undefined : 'Enter a valid mobile number');
    }
  };

  const validateAllRegister = (values: Record<string, string>): Record<string, string> => {
    const fields = [
      'apt_name', 'apt_password', 'apt_password_confirm',
      'address_road', 'address_postal', 'address_city',
      'registrant_name', 'registrant_nid', 'registrant_phone', 'registrant_email',
    ];
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      const err = validateRegisterField(f, values[f] || '', values);
      if (err) next[f] = err;
    });
    return next;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const identifier = String(fd.get('identifier') || '');
    const password = String(fd.get('password') || '');
    const fieldErrors: Record<string, string> = {};
    const idErr = validateSignInField('identifier', identifier);
    const pwErr = validateSignInField('password', password);
    if (idErr) fieldErrors.identifier = idErr;
    if (pwErr) fieldErrors.password = pwErr;
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }
    setErrors({});
    try {
      const res = await fetch('/api/auth/apartment/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Invalid apartment credentials', 'error');
        return;
      }
      router.replace(data.redirect || '/dashboard');
    } catch {
      toast('Could not connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setDevResetUrl(null);
    const fd = new FormData(e.currentTarget);
    const identifier = String(fd.get('identifier') || '');
    const email = String(fd.get('email') || '');
    const fieldErrors: Record<string, string> = {};
    const idErr = validateSignInField('identifier', identifier);
    const emailErr = validateSignInField('email', email);
    if (idErr) fieldErrors.identifier = idErr;
    if (emailErr) fieldErrors.email = emailErr;
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/apartment/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Could not send reset link', 'error');
        return;
      }
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
        toast(data.message, 'error');
        return;
      }
      toast(data.message || 'Check your email for a reset link');
      setSigninView('login');
    } catch {
      toast('Could not connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => { payload[k] = String(v); });
    payload.registrant_phone = phoneValue || payload.registrant_phone;

    const clientErrors = validateAllRegister(payload);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      toast('Please fix the highlighted fields', 'error');
      setLoading(false);
      return;
    }
    setErrors({});

    try {
      const res = await fetch('/api/auth/apartment/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          member_count_hint: payload.member_count_hint ? Number(payload.member_count_hint) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields || {});
        toast(data.error || 'Registration failed', 'error');
        return;
      }
      toast(data.message || `Registered! ID: ${data.registrationId}`);
      router.replace(data.redirect || '/settings');
    } catch {
      toast('Could not connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StableAmbient />
      <div className="auth-page">
            <div className={`auth-shell${tab === 'register' ? ' auth-shell--wide' : ''}`}>
              <aside className="auth-shell__brand">
                <div className="auth-shell__brand-inner">
                  <div className="auth-shell__logo-wrap">
                    <Image
                      src={LOGO_SRC}
                      alt="LocalHost"
                      width={72}
                      height={72}
                      className="auth-shell__logo"
                      priority
                    />
                  </div>
                  <h1 className="auth-shell__title">LocalHost</h1>
                  <p className="auth-shell__tagline">Apartment bill sharing for flatmates</p>
                  <ul className="auth-shell__features">
                    <li>Split rent, utilities &amp; meals fairly</li>
                    <li>Track bills per member in real time</li>
                    <li>Built for mess &amp; shared apartments</li>
                  </ul>
                </div>
              </aside>

              <div className="auth-shell__form">
                <div className="auth-tabs" role="tablist" aria-label="Authentication">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'signin'}
                    className={`auth-tabs__btn${tab === 'signin' ? ' auth-tabs__btn--active' : ''}`}
                    onClick={() => { setTab('signin'); setSigninView('login'); setDevResetUrl(null); setErrors({}); }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'register'}
                    className={`auth-tabs__btn${tab === 'register' ? ' auth-tabs__btn--active' : ''}`}
                    onClick={() => { setTab('register'); setErrors({}); }}
                  >
                    Register
                  </button>
                </div>

                <div className="auth-shell__body">
                  {tab === 'signin' ? (
                    signinView === 'forgot' ? (
                      <form className="auth-form auth-form--signin" onSubmit={handleForgotPassword}>
                        <p className="auth-form__lead">
                          Enter your apartment identifier and the registrant email from registration.
                          We&apos;ll send a reset link if they match.
                        </p>
                        <AuthField
                          label="Apartment Name or Registration ID"
                          name="identifier"
                          required
                          placeholder="e.g. APT-2026-XXXXX"
                          error={errors.identifier}
                          onBlur={(e) => setFieldError('identifier', validateSignInField('identifier', e.target.value))}
                        />
                        <AuthField
                          label="Registrant Email"
                          name="email"
                          type="email"
                          required
                          placeholder="Email used at registration"
                          error={errors.email}
                          onBlur={(e) => setFieldError('email', validateSignInField('email', e.target.value))}
                          onChange={(e) => {
                            if (errors.email) {
                              setFieldError('email', validateSignInField('email', e.target.value));
                            }
                          }}
                        />
                        <button className="btn btn-primary auth-form__submit" type="submit" disabled={loading}>
                          {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                        {devResetUrl && (
                          <div className="auth-dev-reset">
                            <p className="auth-dev-reset__label">Development reset link (email not configured):</p>
                            <a className="auth-dev-reset__link" href={devResetUrl}>
                              Open reset page
                            </a>
                          </div>
                        )}
                        <p className="auth-form__footer-link">
                          <button
                            type="button"
                            className="auth-link"
                            onClick={() => { setSigninView('login'); setDevResetUrl(null); }}
                          >
                            Back to sign in
                          </button>
                        </p>
                      </form>
                    ) : (
                    <form className="auth-form auth-form--signin" onSubmit={handleLogin}>
                      <p className="auth-form__lead">Welcome back. Sign in with your apartment credentials.</p>
                      <AuthField
                        label="Apartment Name or Registration ID"
                        name="identifier"
                        required
                        placeholder="e.g. APT-2026-XXXXX"
                        error={errors.identifier}
                        value={signinValues.identifier}
                        onChange={(e) => {
                          setSigninValues((p) => ({ ...p, identifier: e.target.value }));
                          if (errors.identifier) setFieldError('identifier', validateSignInField('identifier', e.target.value));
                        }}
                        onBlur={(e) => setFieldError('identifier', validateSignInField('identifier', e.target.value))}
                      />
                      <AuthField
                        label="Apartment Password"
                        name="password"
                        required
                        error={errors.password}
                      >
                        <PasswordInput
                          id="password"
                          name="password"
                          required
                          minLength={8}
                          placeholder="Enter your password"
                          error={Boolean(errors.password)}
                          onBlur={(e) => setFieldError('password', validateSignInField('password', e.target.value))}
                          onChange={(e) => {
                            if (errors.password) setFieldError('password', validateSignInField('password', e.target.value));
                          }}
                        />
                      </AuthField>
                      <p className="auth-form__forgot">
                        <button
                          type="button"
                          className="auth-link"
                          onClick={() => setSigninView('forgot')}
                        >
                          Forgot password?
                        </button>
                      </p>
                      <button className="btn btn-primary auth-form__submit" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                      </button>
                    </form>
                    )
                  ) : (
                    <form className="auth-form auth-form--register" onSubmit={handleRegister}>
                      <div className="auth-form__scroll">
                      <section className="auth-section">
                        <h2 className="auth-section__title">Apartment</h2>
                        <div className="auth-grid auth-grid--2">
                          <AuthField label="Apartment / Mess Name *" name="apt_name" required error={errors.apt_name} onChange={handleRegisterChange('apt_name')} onBlur={handleRegisterBlur('apt_name')} />
                          <AuthField label="Floor / Unit Badge" name="apt_floor" placeholder="7TH FLOOR" onChange={handleRegisterChange('apt_floor')} />
                          <AuthField label="Password *" name="apt_password" required error={errors.apt_password}>
                            <PasswordInput
                              id="apt_password"
                              name="apt_password"
                              required
                              minLength={8}
                              error={Boolean(errors.apt_password)}
                              onBlur={handleRegisterBlur('apt_password')}
                              onChange={(e) => handleRegisterChange('apt_password')(e)}
                            />
                          </AuthField>
                          <AuthField
                            label="Confirm Password *"
                            name="apt_password_confirm"
                            required
                            error={errors.apt_password_confirm}
                          >
                            <PasswordInput
                              id="apt_password_confirm"
                              name="apt_password_confirm"
                              required
                              error={Boolean(errors.apt_password_confirm)}
                              onBlur={handleRegisterBlur('apt_password_confirm')}
                              onChange={(e) => handleRegisterChange('apt_password_confirm')(e)}
                            />
                          </AuthField>
                        </div>
                      </section>

                      <section className="auth-section">
                        <h2 className="auth-section__title">Address</h2>
                        <div className="auth-grid auth-grid--2">
                          <AuthField label="Road / Street *" name="address_road" required error={errors.address_road} onChange={handleRegisterChange('address_road')} onBlur={handleRegisterBlur('address_road')} />
                          <AuthField label="Postal Code *" name="address_postal" required error={errors.address_postal} onChange={handleRegisterChange('address_postal')} onBlur={handleRegisterBlur('address_postal')} />
                          <AuthField label="City *" name="address_city" required error={errors.address_city} onChange={handleRegisterChange('address_city')} onBlur={handleRegisterBlur('address_city')} />
                          <AuthField label="Country *" name="address_country">
                            <select className="form-input" id="address_country" name="address_country" defaultValue="Bangladesh">
                              <option>Bangladesh</option>
                            </select>
                          </AuthField>
                        </div>
                      </section>

                      <section className="auth-section">
                        <h2 className="auth-section__title">Registrant</h2>
                        <div className="auth-grid auth-grid--2">
                          <AuthField label="Full Name *" name="registrant_name" required error={errors.registrant_name} onChange={handleRegisterChange('registrant_name')} onBlur={handleRegisterBlur('registrant_name')} />
                          <AuthField
                            label="NID Number"
                            name="registrant_nid"
                            optional
                            pattern="(\d{10}|\d{17})"
                            placeholder="10 or 17 digits"
                            error={errors.registrant_nid}
                            onChange={handleRegisterChange('registrant_nid')}
                            onBlur={handleRegisterBlur('registrant_nid')}
                          />
                          <AuthField
                            label="Phone *"
                            name="registrant_phone"
                            required
                            fullWidth
                            error={errors.registrant_phone}
                          >
                            <PhoneInput
                              name="registrant_phone"
                              required
                              error={errors.registrant_phone}
                              onChange={handlePhoneChange}
                            />
                          </AuthField>
                          <AuthField
                            label="Email *"
                            name="registrant_email"
                            type="email"
                            required
                            fullWidth
                            error={errors.registrant_email}
                            onChange={handleRegisterChange('registrant_email')}
                            onBlur={handleRegisterBlur('registrant_email')}
                          />
                          <AuthField label="Accommodation Type" name="apt_type">
                            <select className="form-input" id="apt_type" name="apt_type" defaultValue="">
                              <option value="">Select type…</option>
                              <option>Mess</option>
                              <option>Bachelor Flat</option>
                              <option>Family Flat</option>
                              <option>Shared House</option>
                            </select>
                          </AuthField>
                          <AuthField
                            label="Approx. Members"
                            name="member_count_hint"
                            type="number"
                            min={1}
                            max={20}
                            placeholder="e.g. 5"
                          />
                        </div>
                      </section>
                      </div>

                      <div className="auth-form__footer">
                        <button className="btn btn-primary auth-form__submit" type="submit" disabled={loading}>
                          {loading ? 'Creating…' : 'Register Apartment'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
    </>
  );
}
