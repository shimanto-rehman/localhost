import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/constants';

export const runtime = 'edge';
export const alt = `${SITE_NAME} — Fair Apartment Bill Splitting for Flatmates in Bangladesh`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TEAL = '#2dd4bf';
const TEAL_DIM = 'rgba(45,212,191,0.15)';
const TEAL_BORDER = 'rgba(45,212,191,0.35)';
const DARK = '#0a0e17';
const CARD = '#0d1220';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#e8edf5';
const MUTED = '#8b97b0';
const DIM = '#64748b';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${DARK} 0%, #0d1f2e 50%, #0a1f1c 100%)`,
          display: 'flex',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -80,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          display: 'flex',
        }} />

        {/* Left panel — branding + headline */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '56px 48px',
          width: 500,
          flexShrink: 0,
          gap: 0,
        }}>
          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: TEAL,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 900,
              color: '#042f2e',
              letterSpacing: -1,
            }}>LH</div>
            <span style={{ fontSize: 32, fontWeight: 800, color: TEXT, letterSpacing: -1 }}>
              {SITE_NAME}
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontSize: 52,
            fontWeight: 900,
            color: TEXT,
            lineHeight: 1.1,
            letterSpacing: -2,
            marginBottom: 20,
          }}>
            One app.<br />Every flatmate.<br />
            <span style={{ color: TEAL }}>Zero disputes.</span>
          </div>

          {/* Subline */}
          <div style={{ fontSize: 18, color: MUTED, lineHeight: 1.5, marginBottom: 32 }}>
            Split rent, meals &amp; expenses<br />fairly — built for Bangladesh.
          </div>

          {/* Pill tags */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Free Forever', 'মেস বিল হিসাব', 'Transparent Math'].map((label) => (
              <div key={label} style={{
                padding: '8px 18px',
                borderRadius: 999,
                border: `1.5px solid ${TEAL_BORDER}`,
                background: TEAL_DIM,
                color: TEAL,
                fontSize: 15,
                fontWeight: 700,
              }}>{label}</div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 1,
          background: BORDER,
          alignSelf: 'stretch',
          marginTop: 48,
          marginBottom: 48,
          display: 'flex',
        }} />

        {/* Right panel — mini dashboard mockup */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 48px',
        }}>
          <div style={{
            width: '100%',
            background: CARD,
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Mock topbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: `1px solid ${BORDER}`,
              background: '#131b2e',
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>Dashboard</span>
              <span style={{ fontSize: 13, color: DIM }}>June 2026</span>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 10, padding: '14px 14px 0' }}>
              {[
                { val: '৳12,450', lbl: 'Total Bill' },
                { val: '৳3,113', lbl: 'Your Share', accent: true },
                { val: '45', lbl: 'Meals' },
              ].map((s) => (
                <div key={s.lbl} style={{
                  flex: 1,
                  background: s.accent ? TEAL_DIM : '#0a0e17',
                  border: `1px solid ${s.accent ? TEAL_BORDER : BORDER}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: s.accent ? TEAL : TEXT }}>{s.val}</span>
                  <span style={{ fontSize: 12, color: DIM }}>{s.lbl}</span>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{
                background: '#0a0e17',
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <span style={{ fontSize: 11, color: DIM }}>Monthly bills — 2026</span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 54 }}>
                  {[55,68,62,38,88,60].map((h, i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: `${h}%`,
                      background: i === 4 ? TEAL : 'rgba(45,212,191,0.2)',
                      borderRadius: '3px 3px 0 0',
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Members */}
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { init: 'SR', col: TEAL, name: 'Shimanto', amt: '৳7,913', paid: true },
                { init: 'TR', col: '#a78bfa', name: 'Tauqir', amt: '৳7,913', paid: false },
              ].map((m) => (
                <div key={m.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#0a0e17',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: m.col,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900, color: '#042f2e', flexShrink: 0,
                  }}>{m.init}</div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TEXT }}>{m.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{m.amt}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 999,
                    background: m.paid ? 'rgba(34,211,165,0.15)' : 'rgba(251,191,36,0.15)',
                    color: m.paid ? '#22d3a5' : '#fbbf24',
                  }}>{m.paid ? 'Paid ✓' : 'Due'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
