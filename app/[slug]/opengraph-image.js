import { ImageResponse } from 'next/og';
import { getPerson } from '../../lib/sheet.js';
import { LOGO, LATO_400, LATO_900 } from './og-assets.js';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AIBP contact card';
export const runtime = 'nodejs';

const GOLD = '#A8A583';
const INK = '#3C3838';
const RED = '#B42024';

const FONTS = [
  { name: 'Lato', data: LATO_400, weight: 400, style: 'normal' },
  { name: 'Lato', data: LATO_900, weight: 900, style: 'normal' },
];

// Satori cannot fetch a remote image itself, so the headshot is inlined. It
// gets a hard timeout and a null return on any failure: Google Photos share
// links often refuse a server-side fetch, and a host that hangs rather than
// refusing would otherwise hold the whole render open. A missing photo drops
// the card to the lockup and the name, which is a worse preview but a real one.
async function headshot(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    return `data:${type};base64,${b64}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }) {
  const { slug } = await params;
  const p = await getPerson(slug);

  const photo = await headshot(p?.photo);
  const name = p?.displayName || 'AIBP';
  const role = p?.jobTitle || '';

  const card = (
    <div
      style={{
        width: '100%', height: '100%', background: '#FFFFFF', display: 'flex',
        alignItems: 'center', justifyContent: 'center', position: 'relative',
        fontFamily: 'Lato',
      }}
    >
      {photo ? (
        <img
          src={photo}
          width={300}
          height={300}
          style={{
            width: 300, height: 300, borderRadius: 300, objectFit: 'cover',
            objectPosition: `center ${p.photoPosition || '25%'}`,
            border: `6px solid ${GOLD}`,
          }}
        />
      ) : null}
      {photo ? (
        <div style={{ width: 2, height: 300, background: 'rgba(60,56,56,.18)', margin: '0 62px' }} />
      ) : null}

      <img src={LOGO} style={{ height: 118 }} />

      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        }}
      >
        <div style={{ fontSize: 31, fontWeight: 900, color: INK }}>{name}</div>
        {role ? <div style={{ fontSize: 23, fontWeight: 700, color: '#8C8A6E' }}>{role}</div> : null}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: RED }} />
    </div>
  );

  try {
    return new ImageResponse(card, { ...size, fonts: FONTS });
  } catch {
    // A plain card beats a broken preview, and the platforms cache whatever
    // they are given the first time they ask.
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', background: '#FFFFFF', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 52, color: INK,
        }}>{name}</div>
      ),
      size
    );
  }
}
