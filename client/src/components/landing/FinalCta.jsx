import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { finalCta } from '../../content/landingContent';

export default function FinalCta() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const cleaned = roomId.trim().replace(/\s+/g, '-');
    if (cleaned) {
      navigate(`/room/${encodeURIComponent(cleaned)}`);
    } else {
      navigate('/signup');
    }
  };

  return (
    <section className="lp-noise" style={{ position: 'relative', padding: '120px 24px', textAlign: 'center', overflow: 'hidden' }}>
      <div className="lp-orange-glow" aria-hidden="true" style={{ position: 'absolute', width: 640, height: 340, top: '12%', left: '50%', marginLeft: -320 }} />
      <div className="lp-aurora lp-aurora-a" style={{ width: 380, height: 380, top: -60, left: '20%' }} />
      <div className="lp-aurora lp-aurora-b" style={{ width: 360, height: 360, bottom: -80, right: '16%' }} />

      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
        <h2 className="lp-text-gradient lp-text-balance" style={{ fontSize: 'clamp(36px,6vw,60px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05 }}>
          {finalCta.headline}
        </h2>
        <p style={{ color: 'var(--lp-muted)', fontSize: 17, margin: '18px auto 0', maxWidth: 480, lineHeight: 1.6 }}>{finalCta.copy}</p>

        <form onSubmit={submit} style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <div className="lp-depth lp-surface-2 lp-sq" style={{ display: 'flex', maxWidth: 360, width: '100%' }}>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder={finalCta.inputPlaceholder}
              className="lp-input"
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            />
          </div>
          <button type="submit" className="lp-btn lp-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }}>
            {finalCta.submit}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}
