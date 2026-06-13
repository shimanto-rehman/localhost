'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Ambient } from '@/components/layout/Ambient';
import { useToast } from '@/components/providers/ToastProvider';
import { LOGO_SRC } from '@/lib/constants';

function AuthField({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  pattern,
  minLength,
  min,
  max,
  error,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
  min?: number;
  max?: number;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="auth-field">
      <label className="form-label" htmlFor={name}>{label}</label>
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
        />
      )}
      {error ? <span className="form-error">{error}</span> : <span className="auth-field__spacer" />}
    </div>
  );
}

export function AuthLanding() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [signinView, setSigninView] = useState<'login' | 'forgot'>('login');
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth/apartment/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: fd.get('identifier'),
          password: fd.get('password'),
        }),
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
    try {
      const res = await fetch('/api/auth/apartment/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: fd.get('identifier'),
          email: fd.get('email'),
        }),
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
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((v, k) => { payload[k] = String(v); });

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
      toast(`Registered! ID: ${data.registrationId}`);
      router.replace(data.redirect || '/settings');
    } catch {
      toast('Could not connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Ambient />
      <div className="auth-page">
            <div className={`auth-shell${tab === 'register' ? ' auth-shell--wide' : ''}`}>
              {/* Brand panel — always visible, balances the layout */}
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

              {/* Form panel */}
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
                        />
                        <AuthField
                          label="Registrant Email"
                          name="email"
                          type="email"
                          required
                          placeholder="Email used at registration"
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
                      />
                      <AuthField
                        label="Apartment Password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Enter your password"
                      />
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
                          <AuthField label="Apartment / Mess Name *" name="apt_name" required error={errors.apt_name} />
                          <AuthField label="Floor / Unit Badge" name="apt_floor" placeholder="7TH FLOOR" />
                          <AuthField label="Password *" name="apt_password" type="password" required minLength={8} />
                          <AuthField
                            label="Confirm Password *"
                            name="apt_password_confirm"
                            type="password"
                            required
                            error={errors.apt_password_confirm}
                          />
                        </div>
                      </section>

                      <section className="auth-section">
                        <h2 className="auth-section__title">Address</h2>
                        <div className="auth-grid auth-grid--2">
                          <AuthField label="Road / Street *" name="address_road" required />
                          <AuthField label="Postal Code *" name="address_postal" required />
                          <AuthField label="City *" name="address_city" required />
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
                          <AuthField label="Full Name *" name="registrant_name" required />
                          <AuthField
                            label="NID Number *"
                            name="registrant_nid"
                            required
                            pattern="(\d{10}|\d{17})"
                            placeholder="10 or 17 digits"
                          />
                          <AuthField
                            label="Phone *"
                            name="registrant_phone"
                            required
                            placeholder="+880XXXXXXXXXX"
                            pattern="\+880\d{10}"
                          />
                          <AuthField
                            label="Email *"
                            name="registrant_email"
                            type="email"
                            required
                            error={errors.registrant_email}
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
