'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp, type MemberInfo } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import { initials, memberColor } from '@/lib/utils';

// ── Bubble layout engine (ported from backup JS) ────────────────────────────

interface BubbleSlot { x: number; y: number; petalAngle: string; radius: number }
interface BubbleItem {
  member: MemberInfo; idx: number;
  x: number; y: number; scale: number;
  isSelected: boolean; petalAngle: string; radius: number; z: number;
}

function seededRandom(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function hashMemberId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i);
  return h;
}

function placeLoginPetalSlot(
  m: MemberInfo, idxOnSide: number, sideSign: number,
  bubbleSize: number, placed: { x: number; y: number }[],
): BubbleSlot {
  const rng = seededRandom(hashMemberId(m.id));
  const petalSize = bubbleSize * 0.9;
  const gap = 20;
  const minDist = petalSize + gap;
  const baseY = (bubbleSize * 1.55) / 2 + petalSize / 2 + gap + 32;

  for (let attempt = 0; attempt < 32; attempt++) {
    const xBase = 66 + idxOnSide * (petalSize + gap * 0.75);
    const yBase = baseY + idxOnSide * (petalSize * 0.55 + gap * 0.4);
    const x = sideSign * (xBase + (rng() - 0.5) * 10);
    const y = yBase + (rng() - 0.5) * 12 + attempt * 5;
    if (!placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist)) {
      const pos = { x, y, petalAngle: '0', radius: Math.hypot(x, y) };
      placed.push(pos);
      return pos;
    }
  }
  const fallback = { x: sideSign * (78 + idxOnSide * 56), y: baseY + idxOnSide * (petalSize + 14), petalAngle: '0', radius: 0 };
  placed.push(fallback);
  return fallback;
}

function buildLoginBubbleLayout(members: MemberInfo[], selectedId: string | null): {
  items: BubbleItem[]; bubbleSize: number;
} {
  const n = members.length;
  const bubbleSize = n <= 2 ? 60 : n <= 4 ? 54 : n <= 7 ? 48 : n <= 10 ? 44 : 40;
  const selected = members.find(m => m.id === selectedId) || members[0];

  const others = members.filter(m => m.id !== selected.id);
  const placed: { x: number; y: number }[] = [];
  const slots: Record<string, BubbleSlot> = {};
  const mid = Math.ceil(others.length / 2);
  others.slice(0, mid).forEach((m, i) => { slots[m.id] = placeLoginPetalSlot(m, i, -1, bubbleSize, placed); });
  others.slice(mid).forEach((m, i) => { slots[m.id] = placeLoginPetalSlot(m, i, 1, bubbleSize, placed); });

  const items: BubbleItem[] = members.map((member, idx) => {
    if (member.id === selected.id) {
      return { member, idx, x: 0, y: -18, scale: 1.55, isSelected: true, petalAngle: '0', radius: 0, z: 10 };
    }
    const slot = slots[member.id];
    if (!slot) return { member, idx, x: 0, y: 80, scale: 0.85, isSelected: false, petalAngle: '0', radius: 80, z: 2 + idx };
    return {
      member, idx, x: slot.x, y: slot.y,
      scale: Math.max(0.78, 0.92 - (slot.radius / 320) * 0.12),
      isSelected: false, petalAngle: slot.petalAngle, radius: slot.radius, z: 2 + idx,
    };
  });

  return { items, bubbleSize };
}

function computeLoginFieldBounds(items: BubbleItem[], bubbleSize: number) {
  let extentX = 0, extentTop = 0, extentBottom = 0;
  const tooltipPad = 46;
  items.forEach(item => {
    const half = (bubbleSize * item.scale) / 2 + 14;
    extentX = Math.max(extentX, Math.abs(item.x) + half);
    if (item.y < 0) extentTop = Math.max(extentTop, -item.y + half + 12);
    else extentBottom = Math.max(extentBottom, item.y + half + 12);
    if (!item.isSelected) extentTop = Math.max(extentTop, tooltipPad);
  });
  return {
    width: Math.ceil(Math.max(bubbleSize * 2.8, extentX * 2 + 40)),
    height: Math.ceil(Math.max(bubbleSize * 2.4, extentTop + extentBottom + 36)),
  };
}

// ── Bubble button component ──────────────────────────────────────────────────

function BubbleBtn({ item, i, onSelect }: { item: BubbleItem; i: number; onSelect: (id: string) => void }) {
  const { member } = item;
  const grad = `linear-gradient(135deg, ${memberColor(item.idx)}, ${memberColor(item.idx)}99)`;
  return (
    <button
      type="button"
      className={`login-bubble${item.isSelected ? ' selected' : ''}`}
      style={{
        '--bx': `${item.x}px`,
        '--by': `${item.y}px`,
        '--scale': item.scale,
        '--i': i,
        '--z': item.z,
        '--clr': memberColor(item.idx),
        '--petal-angle': `${item.petalAngle}deg`,
        '--radius': `${item.radius}px`,
      } as React.CSSProperties}
      role="option"
      aria-selected={item.isSelected}
      aria-label={`Sign in as ${member.name}`}
      onClick={() => onSelect(member.id)}
    >
      <span className="login-bubble__tooltip" role="tooltip">{member.name}</span>
      <span className="login-bubble__inner">
        <span className="login-bubble__ring">
          {member.photoUrl
            ? <img src={member.photoUrl} alt="" className="login-bubble__photo" />
            : <span className="login-bubble__initials" style={{ background: grad }}>{initials(member.name)}</span>
          }
        </span>
      </span>
    </button>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function MemberLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { members, refresh, setCurrentMember } = useApp();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [animClass, setAnimClass] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  const activeMembers = members.filter(m => m.isActive !== false);

  // Entrance animation when modal opens
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setPassword('');
      setAnimClass('');
      return;
    }
    // Default to first member
    setSelectedId(prev => prev || activeMembers[0]?.id || null);
    // Double-rAF to let DOM render before adding animation class
    setAnimClass('');
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimClass('login-bubble-field--animate');
        const t = setTimeout(() => setAnimClass(''), 1500);
        const ft = setTimeout(() => passwordRef.current?.focus(), 420);
        return () => { clearTimeout(t); clearTimeout(ft); };
      });
    });
    return () => cancelAnimationFrame(raf1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelectMember = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    // Nudge animation
    setAnimClass('login-bubble-field--shift');
    setTimeout(() => setAnimClass(''), 900);
  };

  const handleSubmit = async () => {
    if (!selectedId || !password) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedId, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || 'Login failed', 'error'); return; }
      setCurrentMember(data.member);
      await refresh();
      toast('Signed in successfully');
      onClose();
      setPassword('');
    } catch {
      toast('Could not sign in', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const layout = buildLoginBubbleLayout(activeMembers, selectedId);
  const bounds = computeLoginFieldBounds(layout.items, layout.bubbleSize);
  const petals = layout.items.filter(item => !item.isSelected);
  const selectedItem = layout.items.find(item => item.isSelected);

  return (
    <ModalBackdrop open={open} onClose={onClose}>
      <div className="modal modal--login">
        <div className="modal__title">Sign in</div>
        <div className="modal__sub">Tap your profile, then enter your password.</div>

        <div className="login-bubble-stage" aria-label="Select member">
          <div
            className={`login-bubble-field${animClass ? ` ${animClass}` : ''}`}
            style={{
              width: bounds.width,
              height: bounds.height,
              '--bubble-size': `${layout.bubbleSize}px`,
            } as React.CSSProperties}
          >
            {/* Petal bubbles inside the fan wrapper */}
            <div className="login-bubble-fan">
              {petals.map((item, i) => (
                <BubbleBtn key={item.member.id} item={item} i={i} onSelect={handleSelectMember} />
              ))}
            </div>
            {/* Selected bubble sits outside the fan (direct child of field) */}
            {selectedItem && (
              <BubbleBtn
                key={selectedItem.member.id}
                item={selectedItem}
                i={petals.length}
                onSelect={handleSelectMember}
              />
            )}
          </div>
        </div>

        <div className="login-password-wrap">
          <label className="form-label" htmlFor="loginPassword">Password</label>
          <input
            ref={passwordRef}
            className="form-input"
            type="password"
            id="loginPassword"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="e.g. 1234"
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <p className="form-hint" style={{ marginTop: 0 }}>
            Use the password set by your admin (default is 1234).
          </p>
        </div>

        <div className="modal__actions">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedId || !password}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
