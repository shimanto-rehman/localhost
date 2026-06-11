'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fmt } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { MONTH_NAMES } from '@/lib/constants';

type Tab = 'members' | 'costs' | 'rent' | 'backup' | 'danger';

type TempMember = {
  id: string; name: string; photoUrl?: string | null;
  isAdmin?: boolean; isBillManager?: boolean;
};

export default function SettingsPage() {
  const { members, currentMember, refresh, apartment } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('members');
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [tempMembers, setTempMembers] = useState<TempMember[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState('');
  const newMemberPhotoRef = useRef<HTMLInputElement>(null);
  const [unlockMonth, setUnlockMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [unlockYear, setUnlockYear] = useState(String(new Date().getFullYear()));
  const [fixedDraft, setFixedDraft] = useState<Record<string, number>>({});
  const [aptAddress, setAptAddress] = useState('');
  const [aptFloor, setAptFloor] = useState('');

  const isAdmin = !!(currentMember?.isAdmin);
  const billManagerId = apartment?.billManagerId;

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      // Init fixed cost draft
      const fc = (data.fixedCosts as { id: string; amount: number }[]) || [];
      const draft: Record<string, number> = {};
      fc.forEach((c) => { draft[c.id] = c.amount; });
      setFixedDraft(draft);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  useEffect(() => {
    setTempMembers(members.map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl, isAdmin: m.isAdmin, isBillManager: m.isBillManager })));
  }, [members]);

  useEffect(() => {
    if (apartment) {
      setAptAddress(apartment.address || '');
      setAptFloor(apartment.aptFloor || '');
    }
  }, [apartment]);

  const fixedCosts = (config?.fixedCosts as { id: string; name: string; amount: number; inFixedBucket: boolean }[]) || [];
  const optionalCosts = (config?.optionalCosts as { id: string; name: string; amount: number }[]) || [];
  const rentSplits = (config?.rentSplits as { memberId: string; fixedAmount: number | null }[]) || [];
  const fixedBucketTotal = (config?.fixedBucketTotal as number) || 0;
  const mealConfig = config?.mealConfig as { mealsPerDay: number; mealNames: string[]; weekStartDay: number } | undefined;

  // Members tab handlers
  const handlePhotoChange = (memberId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setTempMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, photoUrl: dataUrl } : m));
    };
    reader.readAsDataURL(file);
  };

  const saveMembers = async () => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    let savedCount = 0;
    for (const m of tempMembers) {
      const original = members.find((o) => o.id === m.id);
      const nameChanged = original?.name !== m.name;
      const photoChanged = original?.photoUrl !== m.photoUrl;
      if (nameChanged || photoChanged) {
        const res = await fetch(`/api/members/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: m.name, photoUrl: m.photoUrl }),
        });
        if (res.ok) savedCount++;
      }
    }
    toast(savedCount > 0 ? 'Members saved' : 'No changes to save');
    await refresh();
  };

  const removeMember = async (id: string) => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    if (!confirm('Remove this member? They will be marked inactive.')) return;
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast('Could not remove member', 'error'); return; }
    toast('Member removed — save to apply');
    await refresh();
  };

  const setRole = async (type: 'admin' | 'billManager', memberId: string) => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    const body = type === 'admin' ? { adminMemberId: memberId } : { billManagerId: memberId };
    const res = await fetch('/api/config/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast('Could not update role', 'error'); return; }
    toast(`${type === 'admin' ? 'Admin' : 'Bill Manager'} role assigned`);
    await refresh();
  };

  const resetPassword = async (memberId: string) => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    const pwd = passwords[memberId];
    if (!pwd || pwd.length < 4) { toast('Enter a password with at least 4 characters', 'error'); return; }
    const res = await fetch(`/api/members/${memberId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    if (!res.ok) { const d = await res.json(); toast(d.error || 'Could not update password', 'error'); return; }
    toast('Password updated');
    setPasswords((p) => ({ ...p, [memberId]: '' }));
  };

  const addMember = async () => {
    if (!isAdmin) return;
    if (!newMemberName.trim()) { toast('Enter a name', 'error'); return; }
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), photoUrl: newMemberPhoto || null }),
    });
    if (!res.ok) { toast('Could not add member', 'error'); return; }
    toast('Member added (default password: 1234)');
    setNewMemberName('');
    setNewMemberPhoto('');
    setShowAddModal(false);
    await refresh();
  };

  const saveFixedCosts = async () => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    const allCosts = [...fixedCosts, ...optionalCosts];
    for (const c of allCosts) {
      if (fixedDraft[c.id] !== undefined && fixedDraft[c.id] !== c.amount) {
        await fetch(`/api/config/fixed-costs/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: fixedDraft[c.id] }),
        });
      }
    }
    toast('Fixed costs saved');
    await loadConfig();
  };

  const saveAptDetails = async () => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    const parts = aptAddress.split(',').map((s) => s.trim());
    const res = await fetch('/api/config/apartment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addressRoad: parts[0] || aptAddress,
        addressCity: parts[1] || '',
        addressPostal: parts[2] || '',
        addressCountry: 'Bangladesh',
        aptFloor,
      }),
    });
    if (!res.ok) { toast('Could not save apartment details', 'error'); return; }
    toast('Apartment details saved');
    await refresh();
  };

  const [rentToggles, setRentToggles] = useState<Record<string, boolean>>({});
  const [rentValues, setRentValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const toggles: Record<string, boolean> = {};
    const vals: Record<string, string> = {};
    rentSplits.forEach((r) => {
      toggles[r.memberId] = r.fixedAmount != null;
      vals[r.memberId] = r.fixedAmount != null ? String(r.fixedAmount) : '';
    });
    setRentToggles(toggles);
    setRentValues(vals);
  }, [rentSplits]);

  const saveRentSplits = async () => {
    if (!isAdmin) { toast('Admin access required', 'error'); return; }
    const splits = members.map((m) => ({
      memberId: m.id,
      fixedAmount: rentToggles[m.id] ? (parseFloat(rentValues[m.id]) || null) : null,
    }));
    const res = await fetch('/api/config/rent-split', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ splits }),
    });
    if (!res.ok) { toast('Could not save rent split', 'error'); return; }
    toast('Rent split saved');
    await loadConfig();
  };

  const exportBackup = () => { window.location.href = '/api/backup/export'; };

  const restoreBackup = async (file: File) => {
    if (!confirm('Replace ALL current data with this backup? This cannot be undone.')) return;
    const text = await file.text();
    const backup = JSON.parse(text);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup }),
    });
    if (!res.ok) { toast('Restore failed', 'error'); return; }
    toast('Backup restored');
    await refresh();
    loadConfig();
  };

  const fixedContributions = rentSplits.reduce((s, r) => s + (r.fixedAmount || 0), 0);
  const nowYear = new Date().getFullYear();

  return (
    <section className="page active">
      {/* Readonly banner */}
      {!isAdmin && (
        <div className="readonly-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>View only — sign in as <strong>Admin</strong> to edit configuration.</span>
        </div>
      )}

      <div className="tabs">
        {(['members', 'costs', 'rent', 'backup', 'danger'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'costs' ? 'Fixed Costs' : t === 'rent' ? 'Rent Split' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Members tab ── */}
      {tab === 'members' && (
        <div>
          <div className="panel-head">
            <div>
              <div className="panel-head__title">Apartment Members</div>
              <div className="form-hint panel-head__hint">Add photos and names — shown across dashboard &amp; bills</div>
            </div>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" type="button" onClick={() => setShowAddModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Member
              </button>
            )}
          </div>

          <div className="members-grid">
            {tempMembers.map((m, i) => (
              <div key={m.id} className="member-config">
                {isAdmin && (
                  <button
                    className="member-config__remove"
                    type="button"
                    title="Remove"
                    onClick={() => removeMember(m.id)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                <div className="member-config__body">
                  <label className="photo-upload" style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                    {m.photoUrl
                      ? <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                      : (
                        <div className="avatar" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-2))`, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit' }}>
                          <Avatar name={m.name} index={i} />
                        </div>
                      )
                    }
                    {isAdmin && <div className="photo-upload__badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>}
                    {isAdmin && (
                      <input
                        type="file"
                        accept="image/*"
                        className="photo-input"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoChange(m.id, file);
                        }}
                      />
                    )}
                  </label>
                  <div className="member-config__fields">
                    <label className="form-label" htmlFor={`name-${m.id}`}>Member Name</label>
                    <input
                      className="form-input"
                      id={`name-${m.id}`}
                      value={m.name}
                      disabled={!isAdmin}
                      style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}
                      onChange={(e) => setTempMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))}
                    />
                  </div>
                </div>

                {/* Bill Manager toggle */}
                <div className="member-config__manager">
                  <button
                    type="button"
                    className={`toggle-switch mgr-toggle${billManagerId === m.id ? ' on' : ''}`}
                    role="switch"
                    aria-checked={billManagerId === m.id}
                    disabled={!isAdmin}
                    onClick={() => isAdmin && setRole('billManager', m.id)}
                  />
                  <div className="member-config__manager-text">
                    <span className="member-config__manager-title">Bill Manager</span>
                    <span className="member-config__manager-hint">Receives payments from other members</span>
                  </div>
                </div>

                {/* Admin toggle */}
                <div className="member-config__admin">
                  <button
                    type="button"
                    className={`toggle-switch admin-toggle${m.isAdmin ? ' on' : ''}`}
                    role="switch"
                    aria-checked={!!m.isAdmin}
                    disabled={!isAdmin}
                    onClick={() => isAdmin && setRole('admin', m.id)}
                  />
                  <div className="member-config__admin-text">
                    <span className="member-config__admin-title">Admin</span>
                    <span className="member-config__admin-hint">Can edit configuration &amp; reset passwords</span>
                  </div>
                </div>

                {/* Inline password reset */}
                {isAdmin && (
                  <div className="member-password-row">
                    <label className="form-label" htmlFor={`pwd-${m.id}`}>Password</label>
                    <div className="member-password-actions">
                      <input
                        className="form-input"
                        type="password"
                        id={`pwd-${m.id}`}
                        placeholder="New password"
                        minLength={4}
                        value={passwords[m.id] || ''}
                        onChange={(e) => setPasswords((p) => ({ ...p, [m.id]: e.target.value }))}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => resetPassword(m.id)}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="actions-row">
              <button className="btn btn-primary" type="button" onClick={saveMembers}>
                Save Members
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Fixed Costs tab ── */}
      {tab === 'costs' && (
        <>
          <div className="config-block">
            <div className="config-block__head">Apartment Details</div>
            <div className="config-block__body">
              <div className="form-grid form-grid--2">
                <div>
                  <label className="form-label">Apartment Address</label>
                  <input
                    className="form-input"
                    value={aptAddress}
                    disabled={!isAdmin}
                    placeholder="H-38, R-13, Nikunja-2"
                    onChange={(e) => setAptAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Floor / Unit Badge</label>
                  <input
                    className="form-input"
                    value={aptFloor}
                    disabled={!isAdmin}
                    placeholder="7TH FLOOR"
                    onChange={(e) => setAptFloor(e.target.value)}
                  />
                </div>
              </div>
              {isAdmin && (
                <div className="actions-row" style={{ marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm" type="button" onClick={saveAptDetails}>
                    Save Details
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="config-block">
            <div className="config-block__head">Monthly Fixed Costs</div>
            <div className="config-block__body">
              <p className="form-hint">
                Rent, Gas, Water &amp; Service form one bucket (split via Rent Split tab).
                Optional costs (Maid, WiFi, etc.) are split equally per head using ceiling rounding.
              </p>
              <div className="form-grid">
                {fixedCosts.map((c) => (
                  <div key={c.id}>
                    <label className="form-label">{c.name} (৳)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={fixedDraft[c.id] ?? c.amount}
                      disabled={!isAdmin}
                      onChange={(e) => setFixedDraft((p) => ({ ...p, [c.id]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
                {optionalCosts.map((c) => (
                  <div key={c.id}>
                    <label className="form-label">{c.name} (৳)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={fixedDraft[c.id] ?? c.amount}
                      disabled={!isAdmin}
                      onChange={(e) => setFixedDraft((p) => ({ ...p, [c.id]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div className="actions-row">
                  <button className="btn btn-primary" type="button" onClick={saveFixedCosts}>
                    Save Fixed Costs
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Rent Split tab ── */}
      {tab === 'rent' && (
        <div className="config-block">
          <div className="config-block__head">Rent Contribution Split</div>
          <div className="config-block__body">
            <div className="info-box">
              <strong>How it works:</strong> A fixed amount covers <em>Rent + Gas + Water + Service</em> combined.
              The remainder is divided equally among members without a fixed amount.
              Optional costs are split equally among <em>all</em> members (ceiling rounded).
            </div>
            <div className="form-hint" style={{ marginBottom: 16 }}>
              Fixed bucket: {fmt(fixedBucketTotal)} · Contributions: {fmt(fixedContributions)} · Remaining: {fmt(Math.max(0, fixedBucketTotal - fixedContributions))}
            </div>
            <div className="rent-grid">
              {members.map((m, i) => {
                const isOn = !!rentToggles[m.id];
                return (
                  <div key={m.id} className="rent-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <Avatar name={m.name} photoUrl={m.photoUrl} index={i} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fixed share (Rent+Gas+Water+Service)</div>
                      </div>
                    </div>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-switch rent-toggle${isOn ? ' on' : ''}`}
                        role="switch"
                        aria-checked={isOn}
                        disabled={!isAdmin}
                        onClick={() => isAdmin && setRentToggles((p) => ({ ...p, [m.id]: !isOn }))}
                      />
                      <span className="toggle-label">Fixed bucket amount</span>
                    </div>
                    {isOn ? (
                      <input
                        className="form-input"
                        type="number"
                        value={rentValues[m.id] || ''}
                        disabled={!isAdmin}
                        placeholder="e.g. 6500"
                        style={{ marginTop: 10 }}
                        onChange={(e) => setRentValues((p) => ({ ...p, [m.id]: e.target.value }))}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                        Shares remaining bucket equally with others
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isAdmin && (
              <div className="actions-row">
                <button className="btn btn-primary" type="button" onClick={saveRentSplits}>
                  Save Rent Split
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Backup tab ── */}
      {tab === 'backup' && (
        <div className="config-block backup-block">
          <div className="config-block__head">Data Backup</div>
          <div className="config-block__body">
            <div className="backup-row">
              <div>
                <div className="backup-row__title">Export Backup</div>
                <div className="backup-row__desc">Download a full snapshot — members, bills, config, and sessions.</div>
              </div>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" type="button" onClick={exportBackup}>Export</button>
              )}
            </div>
            <div className="backup-row">
              <div>
                <div className="backup-row__title">Restore from File</div>
                <div className="backup-row__desc">Replace all current data with a backup JSON file. This cannot be undone.</div>
              </div>
              {isAdmin && (
                <div className="backup-restore-actions">
                  <label className="btn btn-danger btn-sm" style={{ cursor: 'pointer' }}>
                    Restore
                    <input
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={(e) => e.target.files?.[0] && restoreBackup(e.target.files[0])}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Zone tab ── */}
      {tab === 'danger' && isAdmin && (
        <div className="config-block danger-block">
          <div className="config-block__head">⚠ Danger Zone</div>
          <div className="config-block__body">
            <div className="danger-row danger-row--stack">
              <div>
                <div className="danger-row__title">Unlock Single Month</div>
                <div className="danger-row__desc">Remove a locked electricity bill so you can enter it again.</div>
                <div className="reset-month-row">
                  <select className="form-input" value={unlockMonth} onChange={(e) => setUnlockMonth(e.target.value)} aria-label="Month to unlock">
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
                    ))}
                  </select>
                  <select className="form-input" value={unlockYear} onChange={(e) => setUnlockYear(e.target.value)} aria-label="Year to unlock">
                    {Array.from({ length: 5 }, (_, i) => nowYear - 2 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" type="button" onClick={async () => {
                const mk = `${unlockYear}-${unlockMonth.padStart(2, '0')}`;
                await fetch(`/api/bills/${mk}/lock`, { method: 'DELETE' });
                toast('Month unlocked');
              }}>Unlock Month</button>
            </div>

            <div className="danger-row">
              <div>
                <div className="danger-row__title">Reset All Bill Data</div>
                <div className="danger-row__desc">Clears all monthly electricity entries. Configuration is kept.</div>
              </div>
              <button className="btn btn-danger btn-sm" type="button" onClick={async () => {
                if (!confirm('This will clear ALL bill data. Cannot be undone.')) return;
                await fetch('/api/danger/reset-bills', { method: 'POST' });
                toast('All bills cleared');
              }}>Reset Bills</button>
            </div>

            <div className="danger-row">
              <div>
                <div className="danger-row__title">Reset All Meals</div>
                <div className="danger-row__desc">Clears all meal records for all months.</div>
              </div>
              <button className="btn btn-danger btn-sm" type="button" onClick={async () => {
                if (!confirm('This will clear ALL meal data. Cannot be undone.')) return;
                await fetch('/api/danger/reset-meals', { method: 'POST' });
                toast('All meal data cleared');
              }}>Reset Meals</button>
            </div>

            <div className="danger-row">
              <div>
                <div className="danger-row__title danger-row__title--alert">Reset Everything</div>
                <div className="danger-row__desc">Wipes all data including members, config, and bills. Cannot be undone.</div>
              </div>
              <button className="btn btn-danger btn-sm" type="button" onClick={async () => {
                if (!confirm('This will WIPE EVERYTHING. Type RESET to confirm.') ) return;
                const input = prompt('Type RESET to confirm:');
                if (input !== 'RESET') return;
                await fetch('/api/danger/reset-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'RESET' }) });
                toast('Everything reset');
                await refresh();
              }}>Reset All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ── */}
      {showAddModal && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal">
            <div className="modal__title">Add New Member</div>
            <div className="modal__sub">They&apos;ll appear in all bill calculations once saved.</div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                placeholder="e.g. Shimanto"
                value={newMemberName}
                autoFocus
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addMember(); }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label className="form-label">Profile Photo (optional)</label>
              <div className="photo-row">
                <label className="photo-upload photo-upload--sm" style={{ cursor: 'pointer' }}>
                  {newMemberPhoto
                    ? <img src={newMemberPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )
                  }
                  <input
                    ref={newMemberPhotoRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setNewMemberPhoto(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <span className="photo-row__hint">JPG, PNG or WebP</span>
              </div>
            </div>
            <div className="modal__actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setShowAddModal(false); setNewMemberName(''); setNewMemberPhoto(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" type="button" onClick={addMember}>
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
