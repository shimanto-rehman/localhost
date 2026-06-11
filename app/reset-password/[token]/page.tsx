'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Ambient } from '@/components/layout/Ambient';
import { useToast } from '@/components/providers/ToastProvider';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/member/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Reset failed', 'error');
        return;
      }
      toast('Password updated. Please sign in.');
      router.replace('/');
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Ambient />
      <div className="auth-page">
        <div className="auth-card">
          <h1 style={{ fontFamily: 'var(--font-head)', marginBottom: 8 }}>Reset Password</h1>
          <p className="form-hint" style={{ marginBottom: 24 }}>Enter your new password below.</p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
